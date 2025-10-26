import axios, { AxiosError, AxiosResponse,AxiosInstance } from "axios";
import * as log from 'loglevel';

import { CookieManager } from "./CookieManager";
import { Dictionary } from "./Common";
import * as cheerio from "cheerio";
import { ClientRequest } from "http";
import { ISessionIdProvider } from "./ISessionIdProvider";
import { AulaAPIError, AulaInvalidSessionError } from "./AulaAPIErrors";

export class AulaAPIConnector {

    private Session: AxiosInstance | null = null;
    private cookieManager: CookieManager = new CookieManager();
    private sessionIdProvider : ISessionIdProvider;

    public ActiveAPIVersion : number = 22;
    public BaseApiUrl = "https://www.aula.dk/api/" //The base url of where the API should be found
    public VersionedApiUrl = `https://www.aula.dk/api/v${this.ActiveAPIVersion}` //The full versioned API url, set later

    private lastUsedSessionId : string;

    constructor (sessionIdProvider : ISessionIdProvider) {

        this.sessionIdProvider = sessionIdProvider;

        log.setLevel(log.levels.INFO);

        this.Session = axios.create();
        this.Session.defaults.withCredentials = true;
        this.Session.defaults.headers.common["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.";
        this.Session.defaults.headers.common["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0";
        this.Session.defaults.maxRedirects = 0; //No automatic redirection, we will follow ourselves
        //this.Session.defaults.httpAgent = new Agent({ keepAlive: false });

        //Intercept all requests made to inject the right cookies for the given host
        this.Session.interceptors.request.use(async config => {


            let host = new URL(config.url!).host;

            //If we have a cookie for Csrfp, add it to the headers.
            let csfrpTokenName = "Csrfp-Token";
            if (this.cookieManager.HasCookie(host, csfrpTokenName)) {
                config.headers[csfrpTokenName] = this.cookieManager.GetCookieValue(host, csfrpTokenName);
            } else {
                var crfpTokenHeader = config.headers[csfrpTokenName];
                if (crfpTokenHeader) {
                    this.cookieManager.AddCookieHeader(config.url!, crfpTokenHeader);
                }
            }

            if (!this.cookieManager.HasCookie(host, "PHPSESSID")) {
                let sessionId = await this.sessionIdProvider.getKnownAulaSessionId();
                this.lastUsedSessionId  = sessionId;
                this.cookieManager.AddCookieValue(host, "PHPSESSID", sessionId);
            }

            if (this.cookieManager.HasEntries(host)) {


                if (host === "www.aula.dk") {

                    if (this.cookieManager.HasCookie(host, "profile_change")) {
                        let v = this.cookieManager.GetCookieValue(host, "profile_change");
                        if (v) {
                            this.cookieManager.AddCookieValue(host, "profile_change", (parseInt(v) + 1).toString());
                        } else {
                            this.cookieManager.AddCookieValue(host, "profile_change", "10");
                        }

                    } else {
                        this.cookieManager.AddCookieValue(host, "profile_change", "10");
                    }
                }

                let cookiesValue = this.cookieManager.GetAllCookiesString(host);
                config.headers['Cookie'] = cookiesValue;
            }


            return config;
        });

        //Intercept all responses to detect and persist PHPSESSID rotation
        this.Session.interceptors.response.use(
            async (response) => {
                await this.handlePHPSESSIDRotation(response);
                return response;
            },
            async (error) => {
                // Handle PHPSESSID rotation even on error responses
                if (error.response) {
                    await this.handlePHPSESSIDRotation(error.response);
                }
                throw error;
            }
        );

    }

    /**
     * Centralized error handler for Aula API responses
     * Inspects error responses and throws appropriate custom errors
     * @param error The axios error to handle
     * @param context Optional context string for better error messages
     * @throws AulaInvalidSessionError if the session is invalid (403/448)
     * @throws AulaAPIError for other known error patterns
     */
    private handleAulaErrorResponse(error: any, context?: string): void {
        const httpStatus = error.response?.status;
        const responseData = error.response?.data;

        // Check for the specific 403/448 combination indicating invalid session
        if (httpStatus === 403 && responseData?.status?.code === 448) {
            const errorMessage = context
                ? `Invalid or expired session while ${context}. ${responseData.status.message || ''}. [SessionId: ${this.lastUsedSessionId}] `.trim()
                : undefined;

            throw new AulaInvalidSessionError(errorMessage, {
                httpStatus: httpStatus,
                aulaStatusCode: responseData.status.code,
                aulaSubCode: responseData.status.subCode,
                aulaMessage: responseData.status.message,
                aulaErrorInformation: responseData.status.errorInformation
            });
        }

        // Check for the specific 403/XXX combination indicating invalid session
        if (httpStatus === 403 && responseData?.status?.code) {
            const errorMessage = context
                ? `Invalid or expired session while ${context}. ${responseData.status.message || ''}. [Inner status code: ${responseData?.status?.code}]. [SessionId: ${this.lastUsedSessionId}] `.trim()
                : undefined;

            throw new AulaInvalidSessionError(errorMessage, {
                httpStatus: httpStatus,
                aulaStatusCode: responseData.status.code,
                aulaSubCode: responseData.status.subCode,
                aulaMessage: responseData.status.message,
                aulaErrorInformation: responseData.status.errorInformation
            });
        }

        // Can add other error patterns here in the future
        // For now, we don't throw for other errors to preserve existing behavior
    }

    public async InitializeAPIUse(baseApiUrl : string) : Promise<string> {
    

            //We assume this.ActiveAPIVersion is the correct one, but may have been modified. 
            //So, just in case, we use it, then increment as needed, with a warning
            let tryApiVer = this.ActiveAPIVersion;
            let maxApiVersionTries = 5;
            let success = false;
    
            let profiles: any = null;
            let versionedApiUrl : string = "";
    
            let response : AxiosResponse;
    
            let versionTries = 0;
            while (!success) {
    
                versionTries++;
                if (versionTries > maxApiVersionTries) {
                    throw new Error('Failed to find a working API version');
                }
                
                // https://www.aula.dk/api/vXX
                versionedApiUrl = `${baseApiUrl}v${tryApiVer}/`;
    
                try
                {
                    response = await this.Session!.get(versionedApiUrl + '?method=profiles.getProfilesByLogin');
                }
                catch (error : any)
                {
                    // Check for invalid session error (403/448) and throw descriptive error
                    this.handleAulaErrorResponse(error, 'initializing API connection');

                    let responseStatus = error.response.status;
                    if (responseStatus === 410) {
                        //Do nothing. we have the wrong version
                        response = error.response;
                    }
                    else if (responseStatus === 403) {
                        //throw new Error('Invalid credentials or access denied'); //Can throw this on a bad version
                        response = error.response;
                    }
                    else {
                        //Something else happened, but we aren't sure what.
                        const responseData = error.response?.data;

                        throw new AulaInvalidSessionError(`Unexpected error in API Client calling the Aula API: ${error.message}`, {
                            httpStatus: responseStatus,
                            aulaStatusCode: responseData ? responseData?.status?.code : "No Aula Code.",
                            aulaSubCode: responseData ? responseData?.status?.subCode : "No Aula Subcode",
                            aulaMessage: responseData ? responseData?.status?.message : "No Aula Message",
                            aulaErrorInformation: responseData ? responseData?.status?.errorInformation : error.response
                        });
                    }
                }
                
                //Wrong version of the API, will increment
                if (response!.status === 410 || response!.status === 403) {
                    tryApiVer++;
                } 
                //Everything is fine, actually
                else if (response!.status === 200) {
    
                    this.cookieManager.AddCookieHeaderArray(response.request.host, response.headers['set-cookie']);
    
                    var data = response!.data;
                    profiles = data["data"]["profiles"];
                    success = true;
                } 
                //Something else is wrong
                else {
                    let responseStatus = response!.status;
                    let responseData = response!.data;
                    throw new AulaInvalidSessionError("Unexpected error in API Client calling the Aula API, on subsequent initial success", {
                        httpStatus: responseStatus,
                        aulaStatusCode: responseData ? responseData?.status?.code : "No Aula Code.",
                        aulaSubCode: responseData ? responseData?.status?.subCode : "No Aula Subcode",
                        aulaMessage: responseData ? responseData?.status?.message : "No Aula Message",
                        aulaErrorInformation: responseData ? responseData?.status?.errorInformation : "Error is unknown.  Response status was not 410 or 403, yet we did not receive an error."
                    });
                }
            }
    
            this.VersionedApiUrl = versionedApiUrl;
            this.ActiveAPIVersion = tryApiVer;
            log.info(`API Usage verified.  API endpoint: ${this.VersionedApiUrl}`);
    
            return versionedApiUrl;
        }

         public async CallAulaAPI(aulaMethod: string, httpMethod: string = "get", postData: any = null,  params: URLSearchParams | undefined = undefined): Promise<any> {

                let url = this.VersionedApiUrl + `?method=${aulaMethod}`;
                if (params &&params.entries.length > 0)
                    url += `&${params.toString()}`;

                let response : AxiosResponse;
        
                let headers : any ={"Accept": "application/json, text/plain, */*"};
                //let headers ={"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"};
        
                try {
                    if (httpMethod.toLowerCase() === "get") {
                        response = await this.Session!.get(url,{headers: headers});
                    } else {
                        headers = {...headers, "Content-Type" : "application/json"}
                        response = await this.Session!.post(url, postData,{headers: headers});
                    }
                }
                catch (error : any) {
                    // Check for invalid session error (403/448) and throw descriptive error
                    this.handleAulaErrorResponse(error, `calling API method '${aulaMethod}'`);

                    if (error.status === 403) {
                        //Denied
                        //Parse out all relevent details from this request (headers, cookies, etc)
                        let errorDetails = this.dumpRequestResponseErrorDetails(error);
                        log.error(errorDetails);

                        response = error.response;
                    } else if (error.status === 404) {
                        //Method not found

                        //Parse out all relevent details from this request (headers, cookies, etc)
                        let errorDetails = this.dumpRequestResponseErrorDetails(error);
                        log.error(errorDetails);

                        throw new Error(`Method not found: ${aulaMethod}.`);
                    } else {
                        throw new Error('API connection failed');
                    }

                }
        
                let responseData = response;
        
                return responseData.data;
            }

            /**
             * Handles PHPSESSID rotation by detecting when Aula returns a new PHPSESSID
             * in the set-cookie header and persisting it via the sessionIdProvider
             */
            private async handlePHPSESSIDRotation(response: AxiosResponse): Promise<void> {
                try {
                    // Check if response has set-cookie headers
                    const setCookieHeaders = response.headers['set-cookie'];
                    if (!setCookieHeaders || !Array.isArray(setCookieHeaders)) {
                        return;
                    }

                    // Extract PHPSESSID from set-cookie headers
                    const newPHPSESSID = this.extractPHPSESSIDFromSetCookie(setCookieHeaders);
                    if (!newPHPSESSID) {
                        return;
                    }

                    // Get the host from the response
                    const host = new URL(response.config.url!).host;

                    // Get the current PHPSESSID from cookie manager
                    const currentPHPSESSID = this.cookieManager.GetCookieValue(host, "PHPSESSID");

                    // If the PHPSESSID has changed, persist the new value
                    if (currentPHPSESSID && newPHPSESSID !== currentPHPSESSID) {
                        log.info(`PHPSESSID rotation detected. Updating from ${currentPHPSESSID.substring(0, 10)}... to ${newPHPSESSID.substring(0, 10)}...`);

                        // Update the session provider with the new PHPSESSID
                        await this.sessionIdProvider.setKnownAulaSessionId(newPHPSESSID);

                        // Update the cookie manager
                        this.cookieManager.AddCookieHeaderArray(host, setCookieHeaders);
                    } else if (!currentPHPSESSID) {
                        // If we didn't have a PHPSESSID before, just update the cookie manager
                        this.cookieManager.AddCookieHeaderArray(host, setCookieHeaders);
                    }
                } catch (error) {
                    log.error(`Error handling PHPSESSID rotation: ${error}`);
                }
            }

            /**
             * Extracts the PHPSESSID value from an array of set-cookie headers
             * @param setCookieHeaders Array of set-cookie header strings
             * @returns The PHPSESSID value if found, undefined otherwise
             */
            private extractPHPSESSIDFromSetCookie(setCookieHeaders: string[]): string | undefined {
                for (const cookieHeader of setCookieHeaders) {
                    // Check if this cookie is PHPSESSID
                    if (cookieHeader.startsWith('PHPSESSID=')) {
                        // Extract the value (everything between = and the first ;)
                        const equalIndex = cookieHeader.indexOf('=');
                        let value = cookieHeader.substring(equalIndex + 1);
                        const semicolonIndex = value.indexOf(';');
                        if (semicolonIndex !== -1) {
                            value = value.substring(0, semicolonIndex);
                        }
                        return value.trim();
                    }
                }
                return undefined;
            }

            private dumpRequestResponseErrorDetails(error: AxiosError) : string {
        let config = error.config;
        let response = error.response as AxiosResponse;
        let request = error.request as ClientRequest

        if (!config) return "";

        let m = "";

        m += `Axios HTTP Status: ${error.status}\n`;
        m += `Axios Error: ${error.message}\n`;
        m += `\n`;

        m += `REQUEST:\n`;
        m += `-------------------------------------:\n`;
        m += `${config?.method?.toUpperCase()} ${config.url}\n`;

        m += `\n`;
        let requestHeaders = request.getHeaders();
        m += `   Headers:\n`;
        for (let key in requestHeaders) {
            m += `    ${key} : ${requestHeaders[key]}\n`;
        }

        m += `\n`;

        m += `   Cookies:\n`;
        if (requestHeaders["cookie"]) {
            let cookieString = requestHeaders["cookie"]?.toString();
            let cookies = cookieString.split(";");
            cookies.forEach(entry => {
                if (entry && entry !== "") {
                    let vals = entry.split("=");
                    m += `    ${vals[0].trim()} =  ${vals[1].trim()}\n`;
                }
            });
        } else {
            m += `    No cookies were sent.\n`;
        }

        m += `\n`;

        m += `   Data Sent:\n`;
        if (config.method?.toUpperCase() === "GET") {
            m += `    GET request, no data sent.\n`;
        } else {
            m += `    Data:\n               ${config.data}\n`;
        }

        m += `\n`;

        //Response

        m += `RESPONSE: \n`;
        m += `-------------------------------------:\n`;
        m += `${error.status}  ${config?.method?.toUpperCase()} ${config.url}\n`;
        if (error.status === 200) {
            m += `SUCCESS: ${error.status}\n`;
        }
        else {
            m += `FAIL: ${error.status} : ${error.code}\n`;
        }

        m += `\n`;

        let responseHeaders = response.headers;
        m += `   Headers:\n`;
        for (let key in responseHeaders) {
            m += `    ${key} : ${responseHeaders[key]}\n`;
        }

        m += `\n`;

        m += `   Cookies:\n`;
       let cookiesExchanged = false;
        if (responseHeaders["cookie"]) {
            m += `   Returned:\n`;
            let cookieString = responseHeaders["cookie"]?.toString();
            let cookies = cookieString.split(";");
            for (let entry in cookies) {
                let vals = entry.split("=");
                m += `    ${vals[0]} =  ${vals[1]}\n`;
            }
            cookiesExchanged = true;
        }

        if (responseHeaders["set-cookie"]) {
            m += `   To be set:\n`;
            let cookieString = responseHeaders["set-cookie"]?.toString();
            let cookies = cookieString.split(";");
            for (let entry in cookies) {
                let vals = entry.split("=");
                m += `    ${vals[0]} =  ${vals[1]}\n`;
            }
            cookiesExchanged = true;
        }
        if (!cookiesExchanged) {
            m += `   No cookies were received back.\n`;
        }


        m += `\n`;

        let aulaResponseData = response.data;
        

        m += `   Data Received:\n`;
        if (aulaResponseData && aulaResponseData !== null) {
            if (aulaResponseData.status) {
                m += `    Aula Status Code: ${aulaResponseData.status.code}\n`;
                m += `    Aula Status Message: ${aulaResponseData.status.message === "" ? "(No message)" : aulaResponseData.status.message}\n`;
            }
            
            m += `\n`;
            let payloadData = aulaResponseData.data;
            m += `   Payload Data:\n`;
            if (payloadData && payloadData !== null) {
                m += `       Data:\n ${payloadData}\n`;
            } else {
                m += `       Data:\n           No payload data was received.\n`;
            }
        } else {
            m += `    Data:\n          No aula specific data was received back.\n`;
        }
        
        return m;
    
    }

}