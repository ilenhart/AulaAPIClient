# AulaAPIClient

A wrapper around the Aula school portal, written in typescript. Written against the Danish version (Aula.dk).
En wrapper omkring Aula skoleportalen, skrevet i TypeScript. Skrevet til den danske version (Aula.dk).

The code itself is non-Danish specific, but if there are other non-Danish Aula versions, the login flow or APIs might be different.

Key features:
- Pull all major data elements, including:
    - Daily Overview
    - Threads and messages (within timeframe)
    - Posts (within timeframe)
    - Get attachments (images, files) on posts, messages, etc
    - Lookup of parents, children, teachers, etc
    - Pull latest galleries (photos, etc)
- Pulls almost 1:1 all data from Aula, allowing for your own filtering of important information
- Does not write to Aula, send messages or similar

See the sample [integration tests](/tests/defaultIntegration.test.ts) for a fuller example of the various methods and usage.

Note: The Aula API is currently on version 22 at the time of this writing and this client is written for that version.  If Aula updates (v23+), it is possible the methods will still work, but the data structures may change. Meaning, it probably would still work fine, but potentially could introduce errors if the data objects change.


![](./media/aula-logo.png)

## Login

In August 2025, the Danish IT strategy changed Unilogin so only students can use it, not parents.  This means that parents must log into Aula using their MitID credentials.  The previous way this project worked was to log on with UniLogin credentials, but since this is no longer an option, that route is no longer possible. 
https://viden.stil.dk/spaces/OFFSKOLELOGIN/pages/104333383/Roadmap%2Bfor%2BUnilogin

Instead, this library project relies on being supplied with a valid PHPSESSID value, which can be retrieved from Aula once you have logged in with MitID.  From a security standpoint, this is not circumventing any behavior, you must still log in to Aula with a MitID as currently intended.

## Related Projects

This extension is part of a suite of three interconnected projects designed to work with the Aula.dk platform. Each project can be used independently, but together they form a complete solution for Aula session management, API interaction, and automation.

### 🔐 AulaLoginBrowserExtension 

**Repository**: [github.com/ilenhart/AulaLoginBrowserExtension](https://github.com/ilenhart/AulaLoginBrowserExtension)

**Purpose**: Chrome browser extension for capturing and storing Aula session IDs

**What it does**:
- Automatically detects and extracts your PHPSESSID from www.aula.dk
- Provides a real-time view of your current session
- Synchronizes session IDs with a backend persistence layer via REST API
- Supports custom authentication for secure backend communication
- Can work with any REST backend, or specifically with **AulaNewsletterTS** as a backend

**Use this when**: You need to capture and persist your Aula session ID for use by other services or automation tools.

---

### 📡 AulaApiClient (This Project)

**Repository**: [github.com/ilenhart/AulaAPIClient](https://github.com/ilenhart/AulaApiClient)

**Purpose**: General-purpose API wrapper for the Aula platform

**What it does**:
- Provides a clean, typed interface for interacting with Aula.dk `/api` endpoints
- Handles authentication using the PHPSESSID session ID
- Wraps common Aula API operations (messages, calendars, profiles, etc.)
- Can be integrated into any Node.js or TypeScript project

**Use this when**: You need to programmatically interact with Aula's API from your own applications or scripts.

---

### 📰 AulaNewsletterTS 

**Repository**: [github.com/ilenhart/AulaNewsletterTS](https://github.com/ilenhart/AulaNewsletterTS)

**Purpose**: AWS-based automation platform for Aula with session persistence and AI-powered newsletters

**What it does**:
- Acts as a REST API backend for storing session IDs (compatible with this extension)
- Periodically pings Aula to keep sessions alive  (similar to if you keep Aula open in your browser and occasionally refresh)
- Pulls information from Aula using the **AulaApiClient** library
- Generates AI-powered newsletters from Aula data
- Sends automated email updates
- Deployed as a serverless solution on AWS (Lambda, DynamoDB, SES)

**Use this when**: You want a complete, turnkey solution for Aula automation, session management, and automated newsletters.

---

### How They Work Together

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (www.aula.dk)                                      │
│  ┌────────────────────────────────────┐                     │
│  │  AulaLoginBrowserExtension         │                     │
│  │  • Captures PHPSESSID              │                     │
│  │  • Shows current session           │                     │
│  └────────────────┬───────────────────┘                     │
└───────────────────┼─────────────────────────────────────────┘
                    │
                    │ REST API (POST /session)
                    ▼
┌─────────────────────────────────────────────────────────────┐
│  AWS (AulaNewsletterTS)                                     │
│  ┌────────────────────────────────────┐                     │
│  │  • Stores session ID in DynamoDB   │                     │
│  │  • Keeps session alive (pings)     │                     │
│  │  • Uses AulaApiClient ────────┐    │                     │
│  └────────────────────────────────┼────┘                    │
└───────────────────────────────────┼─────────────────────────┘
                                    │
                                    │ Uses library
                                    ▼
┌─────────────────────────────────────────────────────────────┐
│  AulaApiClient                                              │
│  ┌────────────────────────────────────┐                     │
│  │  • Makes API calls to Aula.dk      │                     │
│  │  • Fetches messages, calendar, etc │                     │
│  │  • Returns structured data         │                     │
│  └────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

### Usage Scenarios

**Scenario 1: Manual Session Management**
- Use **AulaLoginBrowserExtension** alone to view and manually save your session ID to a simple backend of your choice

**Scenario 2: Custom Integration**
- Use **AulaLoginBrowserExtension** to capture sessions
- Use **AulaApiClient** in your own application to interact with Aula
- Build your own backend for session storage

**Scenario 3: Complete Automation (Recommended)**
- Deploy **AulaNewsletterTS** to AWS
- Install **AulaLoginBrowserExtension** and configure it to use AulaNewsletterTS endpoints
- Extension automatically keeps the backend session updated
- **AulaNewsletterTS** uses **AulaApiClient** to pull data and generate newsletters
- Fully automated Aula monitoring and notifications

### Getting Started with the Full Stack

1. **Deploy AulaNewsletterTS** to AWS (follow its README for deployment instructions)
2. **Install this extension** (AulaLoginBrowserExtension) in Chrome
3. **Configure the extension** to use your AulaNewsletterTS API endpoints
4. **Log into Aula.dk** - the extension will automatically sync your session
5. **AulaNewsletterTS** will handle the rest (keeping session alive, generating newsletters)

Each project has its own detailed documentation in its respective repository.

### Example code

Here is an example of logging in, getting the last 21 days of Posts, and then getting an image attachment off the first post.

````javascript

    const aulaConfig = new AulaClientConfig();

   let sessionProvider : ISessionIdProvider = {
        getKnownAulaSessionId: async function (): Promise<string> {
            //GET THE SESSION ID FROM SOMEWHERE YOU ARE KEEPING IT ALIVE.  If the sessionID is expired on the aula side, this will fail
        }
    }
    aulaConfig.sessionIdProvider = sessionProvider;
    
    let aulaClient = new AulaAPIClient(aulaConfig);

    await aulaClient.Login();

    //Get the last 21 days of Posts
    let POSTS_RETRIEVE_PAST_DAYS = 21;
    let posts = await aulaClient.GetPosts(POSTS_RETRIEVE_PAST_DAYS);

    //Get the url of the image attachment for download.  Note: these urls have an expiration, so must be used quickly.
    let firstPost = posts[0];
    if (firstPost.HasImageAttachments()) {
        let imageAttachments = firstPost.GetImageAttachments();
        let urlToImage = imageAttachments[0].GetFullSizeUrl();
        //... Download the image.  URL is an S3 signed URL, so has a built-in time expiration
    }

````
### Aula Client and Methods

There is a sample integration test using Jest: [integration tests](/tests/defaultIntegration.test.ts) which demonstrates various possibilities and can be used as a reference.

When logging into Aula, you may have multiple profiles, multiple children, and multiple institutions (schools, etc).  Aula -and therefore this client- only acts in the context of a given profile/child/institution combination.  So, for example, if you have multiple children, you must switch the active child in the client.  There is no native "all children" or "all institutions" behavior in this client.

````javascript

    const aulaConfig = new AulaClientConfig();

   let sessionProvider : ISessionIdProvider = {
        getKnownAulaSessionId: async function (): Promise<string> {
            //GET THE SESSION ID FROM SOMEWHERE YOU ARE KEEPING IT ALIVE.  If the sessionID is expired on the aula side, this will fail
        }
    }
    aulaConfig.sessionIdProvider = sessionProvider;
    
    let aulaClient = new AulaAPIClient(aulaConfig);

    await aulaClient.Login();

    //The first/default child will be set automatically at login
    let currentChild = aulaClient.CurrentChild; //Assume this is "Johnny"

    //This will get the calendar events for the currently set child, Johnny
    let events = aulaClient.GetCalendarEvents();

    //Find my other child named Billy
    let allMyChildren = aulaClient.GetMyChildren();
    let foundChild = allMyChildren.filter(child => child.name.indexOf("Billy") > -1)[0];

    //Set the context of the client to Billy
    let foundChildId = foundChild.id;
    aulaClient.SetMyCurrentChild(foundChildId);

    //This will get the calendar events for the newly set child, Billy
    events = aulaClient.GetCalendarEvents();

    //Or say you wanted events for all children... (might be confusing to unpack, but maybe...)
    events : AulaCalendarEvent[] = [];
    allMyChildren.forEach(child => {
        aulaClient.SetMyCurrentChild(child.id);
        events.push(...aulaClient.GetCalendarEvents(););
    });


````

Note this is separate from a set of methods to find any child, teacher, parent, etc.  For example, to find *any* child:

````javascript

    const aulaConfig = new AulaClientConfig();

   let sessionProvider : ISessionIdProvider = {
        getKnownAulaSessionId: async function (): Promise<string> {
            //GET THE SESSION ID FROM SOMEWHERE YOU ARE KEEPING IT ALIVE.  If the sessionID is expired on the aula side, this will fail
        }
    }
    aulaConfig.sessionIdProvider = sessionProvider;
    
    let aulaClient = new AulaAPIClient(aulaConfig);

    await aulaClient.Login();

    //The first/default child will be set automatically
    //This is *your* default child, set at login
    let currentChild = aulaClient.CurrentChild; //Assume "Johnny"
    //These are all *your* children
    let allMyChildren = aulaClient.GetMyChildren();

    //Find any child named Lars (scoped to your institution and profile access)
    //Results would also include your own if there's a match, but it's any child in the institution
    let otherChildren = aulaClient.FindAnyChildren("Lars"); 

    //Write out these children
    otherChildren.forEach(child => {
        console.log(child.name);
        let parent = child.GetParents()[0]; //Parent or such
        console.log(parent.firstName);
    });

````




