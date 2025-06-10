import axios, { AxiosError, AxiosResponse,AxiosInstance } from "axios";
import * as log from 'loglevel';

import { CookieManager } from "./CookieManager";
import { Dictionary } from "./Common";
import * as cheerio from "cheerio";
import { ClientRequest } from "http";

class UniloginSessionManager {

    public Session: AxiosInstance | null = null;

    public ActiveAPIVersion : number = -1;

    private username: string;
    private password: string;
    private cookieManager: CookieManager = new CookieManager();

    private params = new URLSearchParams({ type: 'unilogin' });
    private startingUrl = `https://login.aula.dk/auth/login.php?${this.params.toString()}`; //Where to start from
    private targetUrl = "https://www.aula.dk/portal/" //The url where we know we are done
    public baseApiUrl = "https://www.aula.dk/api/" //The base url of where the API should be found
    public versionedApiUrl = "https://www.aula.dk/api/v21" //The full versioned API url, set later


    private showLogging = false;

    public FinalAulaSessionId : string = "";
    
    constructor (username:string, password:string) {

        log.setLevel(log.levels.INFO);

        this.Session = axios.create();
        this.Session.defaults.withCredentials = true;
        this.Session.defaults.headers.common["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.";
        this.Session.defaults.headers.common["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0";
        this.Session.defaults.maxRedirects = 0; //No automatic redirection, we will follow ourselves
        //this.Session.defaults.httpAgent = new Agent({ keepAlive: false });

        //Intercept all requests made to inject the right cookies for the given host
        this.Session.interceptors.request.use(config => {
            
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

        this.username = username;
        this.password = password;
    }

    //Used to append our "known" values like username and password into the input fields we got from a form
    private postDataBuilder(foundPageInputs : Dictionary<string>, knownInputValues : Dictionary<string>) : URLSearchParams {
        let postData = new URLSearchParams();
        for (let key in foundPageInputs) {
            if (knownInputValues.hasOwnProperty(key)) {
                foundPageInputs[key] = knownInputValues[key];
            }
            postData.append(key, foundPageInputs[key]);
        }
        return postData;
    }

    //Display only helper for logging.  Trims the values down for more readability
    private postDataDisplayHelper(postData : URLSearchParams) : string {
        let result = "";
        postData.forEach((value, name) => {
            let v = value;
            if (v.length > 20) v = v.substring(0,20) + "[...]";
            result += `${name}=${v}\n`;
        })
        return result;
    }

    // Function passed in for the requests to check whether we have reached the end target url
    private checkFinalDestination(currentUrl :string, targetUrl: string) : boolean {
        //Normalize this (https vs 443, etc)
        let currentUrlObj = new URL(currentUrl);
        currentUrl = `${currentUrlObj.protocol}//${currentUrlObj.host}${currentUrlObj.pathname}`;
        let match = ( currentUrl == targetUrl);
        return match;
    }

    public Reset() {
        this.cookieManager.ClearAll();
    }

    // Execute the login.  This follows the chain of requests that normally occur when using a browser,
    // and mimics these GET and POST requests while assigning the right cookies and submitting the right post data
    
    public async ExecuteLogin(getKnownAulaSessionId? : () => Promise<string>, setKnownAulaSessionId? : (aulaSessionId: string) => Promise<void>) {

        log.info("Starting the login process");
        var startDate = new Date();

        //If we suspect we can shortcut this chain of login by supplying the final cookies
        if (getKnownAulaSessionId) {
            let sessionId = await getKnownAulaSessionId();
            if (sessionId && sessionId !== "") {

                //Add the cookies we were just handed
                let targetHost = new URL(this.targetUrl).host
                this.cookieManager.AddCookieValue("aula.dk", "PHPSESSID", sessionId);
                this.cookieManager.AddCookieValue("login.aula.dk", "PHPSESSID", sessionId);
                this.cookieManager.AddCookieValue("www.aula.dk", "PHPSESSID", sessionId);
               
                try {
                    //Try to initialize the API use with the cookies we just set and see if it works
                    await this.InitializeAPIUse(this.baseApiUrl);

                    this.FinalAulaSessionId = this.cookieManager.GetCookieValue(targetHost, "PHPSESSID")!;

                    this.cookieManager.AddCookieValue("aula.dk", "PHPSESSID", this.FinalAulaSessionId);
                    this.cookieManager.AddCookieValue("www.aula.dk", "PHPSESSID", this.FinalAulaSessionId);

                    //Setting the session Id again, mainly to update the TTL
                    if (setKnownAulaSessionId) {
                        await setKnownAulaSessionId(this.FinalAulaSessionId);
                    }

                    log.info("Successfully used pre-known cookies to log in.");
                    return;
                }
                catch (error) {
                    this.FinalAulaSessionId = "";

                    //Clear any cookies that may have been set by the above attempt
                    this.Reset();

                    //Purposefully clearing the session Id, as we failed to use it
                    if (setKnownAulaSessionId) {
                        await setKnownAulaSessionId(this.FinalAulaSessionId);
                    }

                    log.warn(`Unable to use pre-known Aula SessionId(${sessionId}) to log in.  This is fine.  Discarding sessionId and continuing with normal login process.`);
                }
            
            }
        }

        let result : FormParsedRequestResult;
        let postData : URLSearchParams;

        //Some known values so we can dynamically inject these when 
        let knownInputValues : Dictionary<string> = {
            "username": this.username,
            "password": this.password,
            "selected-aktoer": "KONTAKT",
            "selectedIdp" : "uni_idp"
        };

        //Start:  https://login.aula.dk
        //Entry, starting with the unilogin page, we first GET it
        log.debug(`GET :: ${this.startingUrl}\nCookies:\n${this.cookieManager.GetAllCookiesString(this.startingUrl, 25)}`);
        result = await this.ExecuteAndParseRequest("get", this.startingUrl, undefined, undefined, this.checkFinalDestination);

        let success = false;
        let counter = 0;

        let previousActionUrl = "";

        //Loop through the redirects and posts until we reach the final destination
        while (!success) {

            if (!result || !result.actionUrl) {
                log.error(`No result or action url found.  Result was:`);
                log.error(`Previous Action Url: ${previousActionUrl}`);
                log.error(`Current Action URL: ${result.actionUrl}`);
                throw new Error('No result or action url found');
            }

            if (result.nextAction === NextAction.POST ) {
                postData = this.postDataBuilder(result.inputsDictionary, knownInputValues);
                log.debug(`${result.nextAction} :: ${result.actionUrl}\nSending data:\n${this.postDataDisplayHelper(postData)}\nCookies:\n${this.cookieManager.GetAllCookiesString(result.actionUrl, 25)}`);
                result = await this.ExecuteAndParseRequest("post", result.actionUrl, {"Content-Type": "application/x-www-form-urlencoded"}, postData, this.checkFinalDestination);
            }
            //Special case, there was a form, but no inputs, so we think we should post
            else if (result.nextAction === NextAction.LIKELYPOST ) {
                postData = this.postDataBuilder(result.inputsDictionary, knownInputValues);
                log.debug(`${result.nextAction} :: ${result.actionUrl}\nSending data:\n${this.postDataDisplayHelper(postData)}\nCookies:\n${this.cookieManager.GetAllCookiesString(result.actionUrl, 25)}`);
                result = await this.ExecuteAndParseRequest("post", result.actionUrl, {"Content-Type": "application/x-www-form-urlencoded"}, postData, this.checkFinalDestination);
            }
            else if (result.nextAction === NextAction.GET ) {
                log.debug(`${result.nextAction} :: ${result.actionUrl}\nCookies:\n${this.cookieManager.GetAllCookiesString(result.actionUrl, 25)}`);
                result = await this.ExecuteAndParseRequest("get", result.actionUrl, undefined, undefined, this.checkFinalDestination);
            }

            //If we finally reached the final page, we are done.
            previousActionUrl = result.actionUrl;
            success = result.finalDestination
            counter++;
        }
        
        //We looped to the final destination, so we can now initialize the API use
        //Using the API Url swaps out the PHPSessionId, so we do this here.
        let versionedApiUrl = await this.InitializeAPIUse(this.baseApiUrl);
        
        this.FinalAulaSessionId = this.cookieManager.GetCookieValue("www.aula.dk", "PHPSESSID")!;

        var endDate   = new Date();
        var seconds = (endDate.getTime() - startDate.getTime()) / 1000;
        log.info(`Completed the login process.  Followed ${counter} redirects. Total time: ${seconds} seconds`);
    }

    
    //Do a request where we expect a form to be presented, where it will have an action URL
    //And we want to mimic the request and cookies
    private async ExecuteAndParseRequest(
        httpMethod:string, 
        url:string, 
        headers : any | undefined = undefined, 
        postData:URLSearchParams | undefined = undefined,
        checkFinalDestination : typeof this.checkFinalDestination) : Promise<FormParsedRequestResult> {

        let response : AxiosResponse;
        let actionUrl : string = "";

        try {
            log.debug("Testing Url");
            log.debug(`Original url : ${url}`);
            var u = new URL(url);
            url = u.toString();
            log.debug(`New url : ${url}`);
        } catch (error) {
            log.error(`Error with testing the  URL: ${error}`);
        }

        try {
            if (httpMethod.toLowerCase() === "get") { 
                //Get the page
                response = await this.Session!.get(url);
            } else if (httpMethod.toLowerCase() === "post") {
                response = await this.Session!.post(url, postData?.toString(),{headers: headers});
            } else {
                throw new Error('Invalid HTTP method');
            }
        }
        catch (error : any) {
            log.debug(`Recoverable error with GET/POST: ${error} . This is possibly a normal redirect.`);
            let redirected = error.response.status === 302 || error.response.status === 303;
            if (!redirected) {
                log.error('Error:', error);
                throw error;
            }
            log.debug(`Redirected after ${url}`)
            response = error.response;
        }

        if (!response.status) {
            log.debug(`No status found in response.  Response was:`);
            log.debug(response);
            throw new Error('No status found in response');
        }

        this.cookieManager.AddCookieHeaderArray(response.request.host, response.headers['set-cookie']);

        //We are assuming this will be a HTML form of some kind, at least until the final step
        if (response.status === 200) {

            //Check to see if we are done. If so, return the result
            if (checkFinalDestination(url, this.targetUrl)) {
                let result = new FormParsedRequestResult(url, undefined, response.status, response);
                result.finalDestination = true;
                return result;
            }

            //Parse the dom data
            const $ = cheerio.load(response.data);
            
            //We are expecting a form to be present, with an action url we want to submit to
            let form = $("form").first();
            if (!form) {
                log.error(`Looked for a form at ${url} but no form was present on the page.  We need a form to pull the next action from.`)
                throw new Error('Login form not found');
            }

            //Get the url that the form would normally submit to with user interaction
            actionUrl = form.attr("action")!;

            //Grab the inputs that the form contains.  We will populate these for the next request.
            let inputsDictionary : Dictionary<string> = {};
            let inputs = form.find('input');
            inputs.each((index, element) => {
                let input = $(element);
                if (input.attr("name")) {
                    inputsDictionary[input.attr("name")!] = input.attr("value")!;
                }  
            });

            //In at least one form page, there are no inputs, the value is on the button itself
            if (inputs.length == 0) {
                //We can't easily do this dynamically, so we just hardcode it
                //If there is a button with a name of "selectedIdp", we choose the specific uni_idp value
                //And add it to the inputs dictionary so it will be posted next
                var button = form.find('button[name=selectedIdp]');
                if (button) {
                    inputsDictionary["selectedIdp"] = "uni_idp";
                }
            }

            //Return the parsed result of this 200 Html form based page
            return new FormParsedRequestResult(actionUrl, inputsDictionary, response.status, response);
            
        }

        //This was a redirect to another page
        if (response.status === 302 || response.status === 303) {
            
            //Where do we need to go instead
            actionUrl = response.headers["location"];

            //Full url not specified, so redirecting to the root of this host
            if (actionUrl === "/") {
                var u = new URL(url);
                actionUrl = `${u.protocol}//${u.host}/`;
            }

            //Return the parsed result of this 302/303 redirect request
            return new FormParsedRequestResult(actionUrl, undefined, response.status,response);
        }
        
        //Something else that wasn't caught by the above error
        throw new Error('Invalid response status');

    }

    // Does an intitial check of the "API" and returns the version that should work.
    private async InitializeAPIUse(baseApiUrl : string) : Promise<string> {


        let apiVer = 21;
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

        this.versionedApiUrl = versionedApiUrl;
        this.ActiveAPIVersion = apiVer;
        log.info(`API Usage verified.  API endpoint: ${this.versionedApiUrl}`);

        return versionedApiUrl;
    }

    //Helper method to completely dump out the axios error details for logging and debugging
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


    public async CallAulaAPI(aulaMethod: string, httpMethod: string = "get", postData: any = null,  params: URLSearchParams | undefined = undefined): Promise<any> {

        let url = this.baseApiUrl + `?method=${aulaMethod}`;
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
}

class FormParsedRequestResult {
    public actionUrl : string;
    public inputsDictionary : Dictionary<string>;
    public responseStatus : number;
    public response: AxiosResponse;
    public nextAction : NextAction;
    public finalDestination : boolean;

    constructor (actionUrl:string, inputsDictionary: Dictionary<string> | undefined, responseStatus : number, response: AxiosResponse) {
        this.actionUrl = actionUrl;
        if (!inputsDictionary) inputsDictionary = {};
        this.inputsDictionary = inputsDictionary;
        this.responseStatus = responseStatus;
        this.response = response;
        this.nextAction = this.calculateNextAction();
        this.finalDestination = false;
    }

    //Convert the inputs dictionary into a form-encoded string (URLSearchParams)
    public inputsAsPostData() : URLSearchParams {
        let postData = new URLSearchParams();
        if (this.inputsDictionary) {
            for (let key in this.inputsDictionary) {
                postData.append(key, this.inputsDictionary[key]);
            }
        }
        return postData;
    }

    private calculateNextAction() : NextAction {
        //If it was a 200 response, and we found some inputs (or values), then we are POSTing next
        if (this.responseStatus === 200 && Object.keys(this.inputsDictionary).length > 0) {
            return NextAction.POST;
        }

        //If it was a 200 response, but there were no inputs (or values), we *think* we should post next
        if (this.responseStatus === 200) {
            return NextAction.LIKELYPOST;
        }

        //Otherwise, just GET 
        return NextAction.GET;
    }
}

enum NextAction {
    POST = "POST",
    GET = "GET",
    LIKELYPOST = "LIKELYPOST" //Special case, there was a form, but no inputs, so we think we should post next
}

export { UniloginSessionManager, FormParsedRequestResult, NextAction };