import axios, { AxiosError, AxiosResponse,AxiosInstance } from "axios";
import * as log from 'loglevel';

import { CookieManager } from "./CookieManager";
import { Dictionary } from "./Common";
import * as cheerio from "cheerio";
import { ClientRequest } from "http";
import { ISessionIdProvider } from "./ISessionIdProvider";

export class AulaAPIConnector {
    
    private Session: AxiosInstance | null = null;
    private cookieManager: CookieManager = new CookieManager();
    private sessionIdProvider : ISessionIdProvider;

    public ActiveAPIVersion : number = -1;
    public BaseApiUrl = "https://www.aula.dk/api/" //The base url of where the API should be found
    public VersionedApiUrl = "https://www.aula.dk/api/v21" //The full versioned API url, set later

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

    }

    public async InitializeAPIUse(baseApiUrl : string) : Promise<string> {
    
    
            let apiVer = 22;
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
                versionedApiUrl = `${baseApiUrl}v${apiVer}/`;
    
                try
                {
                    response = await this.Session!.get(versionedApiUrl + '?method=profiles.getProfilesByLogin');
                }
                catch (error : any)
                {
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
                        throw new Error('API connection failed');
                    }
                }
                
                //Wrong version of the API, will increment
                if (response!.status === 410 || response!.status === 403) {
                    apiVer++;
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
                    throw new Error('API connection failed');
                }
            }
    
            this.VersionedApiUrl = versionedApiUrl;
            this.ActiveAPIVersion = apiVer;
            log.info(`API Usage verified.  API endpoint: ${this.VersionedApiUrl}`);
    
            return versionedApiUrl;
        }

         public async CallAulaAPI(aulaMethod: string, httpMethod: string = "get", postData: any = null,  params: URLSearchParams | undefined = undefined): Promise<any> {
        
                let url = this.BaseApiUrl + `?method=${aulaMethod}`;
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