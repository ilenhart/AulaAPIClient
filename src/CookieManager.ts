import { Dictionary } from "./Common";

class CookieManager {

    public hostDictionary : Dictionary<Dictionary<string>> = {};
    //public cookieDictionary : Dictionary<string> = {};

    public AddCookieHeader(host:string, cookieHeader : string) {
        host = this.encodeHost(host);
        //let cookies = cookieHeader.split(';');
        //cookies.forEach(cookie => {
            let equalIndex = cookieHeader.indexOf('=');
            let key = cookieHeader.substring(0, equalIndex);
            let value = cookieHeader.substring(equalIndex + 1);
            if (value.indexOf(';') !== -1) {
                value = value.substring(0, value.indexOf(';'));
            }
            //let [key, value] = cookieHeader.split('=');
            this.hostDictionary[host][key.trim()] = value.trim();
        //});
    }

    public ClearAll() {
        this.hostDictionary = {};
    }

    public HasCookie(host:string, name:string) : boolean {
        host = this.encodeHost(host);
        if (this.hostDictionary.hasOwnProperty(host)) {
            return this.hostDictionary[host].hasOwnProperty(name);
        }
        return false;
    }
    
    public AddCookieValue(host:string, name:string, value:string) {
        host = this.encodeHost(host);
        if (!this.hostDictionary.hasOwnProperty(host)) {
            this.hostDictionary[host] = {};
        }
        this.hostDictionary[host][name] = value;
    }

    public GetCookieValue(host: string, name:string) : string | undefined {
        host = this.encodeHost(host);
        if (this.hostDictionary.hasOwnProperty(host)) {
            return this.hostDictionary[host][name];
        }
        return undefined;
    }

    public AddCookieHeaderArray(host: string, cookieHeader : string[] | undefined) {
        if (!cookieHeader) return;

        host = this.encodeHost(host);

        //Not seen this host?  Add a dictionary for it
        if (!this.hostDictionary.hasOwnProperty(host)) {
            this.hostDictionary[host] = {};
        }

        cookieHeader.forEach(cookie => {
            //Add for the targeted host
            this.AddCookieHeader(host, cookie);

            //domain=.aula.dk
            var cookieParts = cookie.split(";");
            var foundDomainPart = cookieParts.find(part => {
                if (part.trim().startsWith("domain=")) 
                    return part;
                return null;
            })
            if (foundDomainPart) {
                var domain = foundDomainPart.split("=")[1].trim().substring(1);
                domain = this.encodeHost(domain);
                if (!this.hostDictionary.hasOwnProperty(domain)) {
                    this.hostDictionary[domain] = {};
                }
                this.AddCookieHeader(domain, cookie);
            }
        });
    }

    private encodeHost(host: string) : string {
        //In case it's a full url
        if (host !== "/" && (host.indexOf(":") !== -1 || host.indexOf("/") !== -1)) {
            host = new URL(host).host;
        }
        return host.replaceAll(".", "_");
    }

    public HasEntries(host: string) : boolean {

        let domainOnlyHost = this.GetRootDomain(host);
        host = this.encodeHost(host);
        domainOnlyHost = this.encodeHost(domainOnlyHost);

        let someEntries = false;

        if (this.hostDictionary.hasOwnProperty(host)) {
            let keys = Object.keys(this.hostDictionary[host]);
            someEntries = keys.length > 0;
        }

        if (this.hostDictionary.hasOwnProperty(domainOnlyHost)) {
            let keys = Object.keys(this.hostDictionary[domainOnlyHost]);
            someEntries = someEntries || keys.length > 0;
        }

        return someEntries;
    }

    public GetAllCookiesString(host: string, maxValueLength : number | undefined = undefined) : string {
        return this.GetAllCookiesArray(host, maxValueLength).join('; ') + ";";
    }

    //Gets the 2 rightmost parts of the host domain
    private GetRootDomain(host:string) : string {
        host = host.replace("http://", "").replace("https://", "");
        host = host.split("/")[0];
        let hostSplits = host.split(".");
        return hostSplits[hostSplits.length -2] + "." + hostSplits[hostSplits.length -1];
    }

    public GetAllCookiesArray(host:string, maxValueLength : number | undefined = undefined) : string[] {

        let domainOnlyHost = this.GetRootDomain(host);
        host = this.encodeHost(host);
        
        domainOnlyHost = this.encodeHost(domainOnlyHost);

        let returnedCookies : string[] = [];
        let hosts = [host, domainOnlyHost];
        
        hosts.forEach(host => {

            if (!this.hostDictionary.hasOwnProperty(host)) {
                //return [];
            } else if (Object.entries(this.hostDictionary[host]).length === 0) {
                //return [];
            }
            else {

                let cookiesForHost = Object.entries(this.hostDictionary[host]).map(([key, value]) => {

                    let foundCookie = returnedCookies.find(c => c.startsWith(key));
                    if (foundCookie &&foundCookie !== "") return "";

                    let v = value;
                    if (maxValueLength && v.length > maxValueLength) {
                        v = v.substring(0, maxValueLength) + "[...]";
                    }
                    return `${key}=${v}`
                });

                cookiesForHost = cookiesForHost.filter(c => {
                    return (c.trim() !== "");
                })

                returnedCookies.push(...cookiesForHost);
            }

        });

        return returnedCookies;
    }
   
}

export { CookieManager };
