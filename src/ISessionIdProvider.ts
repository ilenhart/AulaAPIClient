
/*
 This is an interface to generally define where we can get the known sessionID for Aula
 Specifically, this is a PHPSESSID value that is passed to Aula on various API requests, and can be pulled by logging into Aula and inspecting the API request cookie calls.
 It's expected that this would be persisted somewhere, and then reused.
*/

export interface ISessionIdProvider {

    getKnownAulaSessionId : () => Promise<string>,  
    setKnownAulaSessionId : (aulaSessionId: string) => Promise<void>
}