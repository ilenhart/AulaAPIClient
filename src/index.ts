import { URLSearchParams } from 'url';

import { AulaProfiles, AulaProfilesSerializer, Child, InstitutionProfile, Profile } from './v22/AulaProfiles';
import { AulaDailyOverviewSerializer, DailyOverview } from './v22/AulaDailyOverview';
import { AulaRecipient, AulaRecipientsSerializer, InstitutionRole, PortalRole } from './v22/AulaRecipients';
import { AulaFindMessageMailboxParticipant, AulaFindMessageMessage, AulaFindMessageRequest, AulaFindMessageResult, AulaFindMessagesSerializer } from './v22/AulaFindMessage';
import { AulaGetMessagesForThread, AulaThreadMessagesSerializer } from './v22/AulaThreadMessages';
import { AulaPost, AulaPosts, AulaPostsSerializer } from './v22/AulaPosts';
import { AulaCalendarEvent, AulaCalendarEventsSerializer} from './v22/AulaCalendarEvents';
import { AulaGalleryAlbumsSerializer, GalleryAlbum } from './v22/AulaGalleryAlbums';
import { AulaTokenSerializer } from './v22/AulaToken';
import { MeeBookClient, MeeBookConsolidatedInformation } from './MeeBookClient';
import { AulaCalendarEventTypes } from './v22/AulaCalendarEventTypes';
import { AulaAlbumMedia, AulaAlbumMediaSerializer } from './v22/AulaAlbumMedia';
import { ISessionIdProvider } from './ISessionIdProvider';
import { AulaAPIConnector } from './AulaAPIConnector';



/*
* AulaClientConfig is a class that contains the configuration for the AulaClient.
* @param aulaApiUrl - The URL of the Aula API, defaults to 'https://www.aula.dk/api/'
*/
export class AulaClientConfig {
  public aulaApiUrl: string | undefined = undefined;
  public sessionIdProvider : ISessionIdProvider;
}

/*
* AulaClient is the main connector to communicate with Aula and retrieve information
*/
export class AulaAPIClient {

  private AulaAPIConnector: AulaAPIConnector;  

  private readonly DEFAULT_AULA_API_URL = 'https://www.aula.dk/api/'; //https://www.aula.dk/api/v21

  //The API version we are expecting, for various serialized classes to have correct info
  //It could be higher (22, 23, etc) and could still work, just is a sanity check.
  private readonly EXPECTED_AULA_API_VERSION = 22; 

  private config : AulaClientConfig;

  private FinalAulaSessionId: string;
  public LoggedIn: boolean;
  public ActiveAPIVersion : number;

  public AllProfiles : AulaProfiles;
  public AllChildren : Child[] = [];
  public AllInstitutions : InstitutionProfile[] = [];

  public CurrentProfile : Profile;
  public CurrentChild : Child;
  public CurrentInstitution : InstitutionProfile;


  
  constructor(config : AulaClientConfig) {
    this.config = config;
    //Set 
    if (this.config.aulaApiUrl === undefined) {
      this.config.aulaApiUrl = this.DEFAULT_AULA_API_URL;
    }
    this.AulaAPIConnector = new AulaAPIConnector(this.config.sessionIdProvider);
  }

  /*
   Login logs the user in and sets up the session for further API calls.  
  */
  public async Login(
    ): Promise<void> {

    //Initialize against the AulaAPI, using the given AulaAPIManager
    await this.AulaAPIConnector.InitializeAPIUse(this.config.aulaApiUrl!);

    this.ActiveAPIVersion = this.AulaAPIConnector.ActiveAPIVersion;

    //Initialize the basic profile and children
    await this.setupInitialAulaData();

    this.LoggedIn = true;
  }

  //Wrapper function for JSON calls and serialization helper
  private async callJsonApi<T>(
    aulaApiMethod: string, 
    serializerFunction : (dataString: string) => T,
    httpMethod: string = "get", 
    postData: any = null, 
    params: URLSearchParams | undefined = undefined
  ) : Promise<T> {


    let response = await this.AulaAPIConnector!.CallAulaAPI(aulaApiMethod, httpMethod, postData, params);

    if (response.version !== this.AulaAPIConnector!.ActiveAPIVersion) {
      console.warn(`API version mismatch.  Expected ${this.AulaAPIConnector!.ActiveAPIVersion}, got ${response.version}.  This may cause issues or signify the API has changed.`);
    }

    let responseString = JSON.stringify(response);
    let payload = serializerFunction(responseString);

    return payload as T;
  }

  // Gets some useful and important starting information for the client so it's handy
  private async setupInitialAulaData() {

    // Get the profiles, and set the current profile
    let root = await this.getProfilesByLogin();
    this.AllProfiles = root;
    let guardianProfiles = root.profiles.filter(profile => profile.portalRole === "guardian");
    if (guardianProfiles.length === 0) {
        console.warn("No guardian profiles, just using the first profile");
        this.CurrentProfile = root.profiles[0];
    } else {
        this.CurrentProfile = guardianProfiles[0];
    }

    //Save out the children
    this.AllChildren = this.CurrentProfile.children;
    if (this.CurrentProfile.children.length > 0) {
        this.CurrentChild = this.CurrentProfile.children[0];
    }
    if (!this.CurrentChild){
        console.warn("No children in the profile.");
    }

    this.AllInstitutions = this.CurrentProfile.institutionProfiles;
    if (this.CurrentProfile.institutionProfiles.length > 0) {
        this.CurrentInstitution = this.CurrentProfile.institutionProfiles[0];
    }
    if (!this.CurrentInstitution) {
        console.warn("No institutions in the profile.");
    }

  }


  //Fetch basic profile data from Aula
  private async getProfilesByLogin(): Promise<AulaProfiles> {
    return await this.callJsonApi<AulaProfiles>(`profiles.getProfilesByLogin`, AulaProfilesSerializer.fromJSON);
  }

  /*
    Does the most lightweight thing we can to test the API is currently active and working
  */
  public async PingAula() {
    let root = await this.getProfilesByLogin();
  }

  /*
  * Gets the profile using the user's display name (i.e. the user's literal name)
  * @param displayNamePart  - Partial string of the user's name
  * @return The profile
  * */
  public GetMyProfile(displayNamePart : string) : Profile | undefined {
    return this.AllProfiles.GetProfileByDisplayName(displayNamePart);
  }

  /*
  * Can set the client to be using a different current profile, if needed
  */
  public SetMyCurrentProfile(profileId : number) {
    let foundProfile = this.AllProfiles.profiles.find(profile => profile.profileId === profileId);
    if (foundProfile) this.CurrentProfile = foundProfile;
  }

  /*
  * Gets a specific child, using a string partial of their name
  */
  public GetMyChild(childNamePart : string) : Child | undefined {
    return this.CurrentProfile.GetChildByName(childNamePart);
  }

   /*
  * Get all children
  */
   public GetMyChildren() : Child[]  {
    return this.CurrentProfile.GetChildren();
  }

  /*
  * Can set the client to be using a different current child, if needed
  */
  public SetMyCurrentChild(childId : number) {
    let foundChild = this.AllChildren.find(child => child.id === childId);
    if (foundChild) this.CurrentChild = foundChild;
  }

  /*
  * Gets the institution, using a string partial of the institution name
  */
  public GetMyInstitution(institutionNamePart : string) : InstitutionProfile | undefined {
    return this.CurrentProfile.GetInstitutionByName(institutionNamePart);
  }

  /*
  * Can set the client to be using a different current institution, if needed
  */
  public SetMyCurrentInstitution(institutionId : number) {
    let foundInstitution = this.AllInstitutions.find(institution => institution.id === institutionId);
    if (foundInstitution) this.CurrentInstitution = foundInstitution;
  }

  /*
  * Get the daily overview for a child.
  * @param childId - The id of the child to get the daily overview for.
  * @returns An array of daily overviews.
  */
  public async GetDailyOverview(childId : number) : Promise<DailyOverview[]> {
    const method = `presence.getDailyOverview&childIds[]=${childId}`;
    return await this.callJsonApi<DailyOverview[]>(method, AulaDailyOverviewSerializer.fromJSON);
  }

  private async findAulaMailboxRecipients(namePart : string) : Promise<AulaRecipient[]> {
    const method = `search.findRecipients&text=${namePart}&query=${namePart}&id=5091832&typeahead=true&limit=100&scopeEmployeesToInstitution=false&fromModule=messages&portalRoles[]=employee&portalRoles[]=child&portalRoles[]=guardian&docTypes[]=Profile&docTypes[]=CommonInbox`;
    return await this.callJsonApi<AulaRecipient[]>(method, AulaRecipientsSerializer.fromJSON);
  }

  /*
  * Find people by name.  Useful to get Id's, emails, names, etc.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyPeople(namePart : string) : Promise<AulaRecipient[]> {
    return await this.findAulaMailboxRecipients(namePart);
  }

  /*
  * Find parents by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyParents(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Parent);
  }

  /*
  * Find children by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyChildren(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Child);
  }

  /*
  * Find teachers by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyTeachers(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Employee && result.institutionRole === InstitutionRole.Teacher);
  }

  /*
  * Find preschool teachers (SFO) by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyPreschoolTeachers(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Employee && result.institutionRole === InstitutionRole.PreschoolTeacher);
  }

   /*
  * Find Leaders (SFO leader, principal, etc) by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
   public async FindAnyLeaders(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Employee && result.institutionRole === InstitutionRole.Leader);
  }

  /*
  * Find employees by name.
  * @param namePart - The name to search for. A partial string of the name to find.
  * @returns An array of recipients.
  */
  public async FindAnyEmployees(namePart : string) : Promise<AulaRecipient[]> {
    let results = await this.FindAnyPeople(namePart);
    return results.filter(result => result.portalRole === PortalRole.Employee);
  }

  /*
  * Find messages within the past N days, or a custom date range. More flexible than GetAulaMessages.
  * @param fromDate - The start date to retrieve messages for.
  * @param toDate - The end date to retrieve messages for.
  * @param participantIds - The ids of the participants to retrieve messages for.
  * @param resultsLimit - The number of messages to retrieve.
  * @returns An array of messages.
  */
  public async FindAulaMessages(
        fromDate? : Date, 
        toDate? : Date,
        participantIds? : number[],
        resultsLimit : number = 20
    ) : Promise<AulaFindMessageMessage[]> {

    const defaultDaysBack = 3;
    if (!fromDate) fromDate = new Date(Date.now() - (defaultDaysBack * 24 * 60 * 60 * 1000));
    if (!toDate) toDate = new Date(Date.now());

    let request = new AulaFindMessageRequest(
        this.AllChildren.map(child => child.institutionProfile.id),
        this.AllChildren.map(child => child.institutionCode)
    );

    request.setDateRange(fromDate, toDate);

    if (participantIds && participantIds.length > 0) {
        participantIds.forEach(id => {
            let participant = new AulaFindMessageMailboxParticipant();
            participant.id = id;
            participant.mailBoxOwnerType = "institutionProfile";
            request.participants.push(participant);
        });
    }

    request.limit = resultsLimit;

    const method = `search.findMessage`;
    let messageResults = await this.callJsonApi<AulaFindMessageResult[]>(method, AulaFindMessagesSerializer.fromJSON, "post", request);

    //Transpose the threadId and threadSubject to the searchMessage
    messageResults.forEach(result => {
        result.searchMessage.threadId = result.thread.id;
        result.searchMessage.threadSubject = result.thread.subject;
    });

    return messageResults.map(result => result.searchMessage);
  }

  /*
  * Get all messages within the past N days, just the messages, does not include the entire thread.
  * @param retrievePastDays - The number of days to retrieve messages for.
  * @param resultsLimit - The number of messages to retrieve.
  * @returns An array of messages.
  */
  public async GetAulaMessages(
        retrievePastDays : number = 3,
        resultsLimit : number = 20
    ) : Promise<AulaFindMessageMessage[]> {

    let toDate = new Date(Date.now());
    let fromDate = new Date(toDate.getTime() - (retrievePastDays * 24 * 60 * 60 * 1000));
    return await this.FindAulaMessages(fromDate, toDate, undefined, resultsLimit);
  }

  /*
  * Gets all threads updated within the past N days (default:3).  
  * Checks for messages within the last N days, and retrieves the full thread containing that message, i.e. thread may have messages older than N days, but will have at least one message within that N days.
  * @param retrievePastDays - The number of days to retrieve threads for.
  * @returns An array of threads, each containing at least one message within the last N days.
  */
  public async GetAulaThreads(retrievePastDays : number = 3) : Promise<AulaGetMessagesForThread[]> {

    //Get all messages within the past N days
    let messages = await this.GetAulaMessages(retrievePastDays);

    //Get all unique threads that these messages belong to
    let threadIds = messages.map(message => message.threadId);

    //Get the threads, with all messages (including messages that are older than the retrievePastDays)
    let threads : AulaGetMessagesForThread[] = [];
    for (let threadId of threadIds) {
        let threadMessagesWrapper = await this.GetAulaThreadSingle(threadId);
        threads.push(threadMessagesWrapper);
    };

    return threads;

  }

    /*
  * Gets the specific thread by Id
  * @param retrievePastDays - The thread Id
  * @returns An array of threads, each containing at least one message within the last N days.
  */
    public async GetAulaThreadSingle(threadId : string) : Promise<AulaGetMessagesForThread> {
        let getSingleThreadMethod = `messaging.getMessagesForThread&threadId=${threadId}&page=0`;
        let threadMessagesWrapper = await this.callJsonApi<AulaGetMessagesForThread>(getSingleThreadMethod, AulaThreadMessagesSerializer.fromJSON);
        return threadMessagesWrapper;
    }

 
  /*
  * Get the institution profile ids for the current profile and current child.  This is the "scope" of institutions for some of the queries.
  * @returns An array of institution profile ids.
  */
  private getContextualInstitutionProfileIds() : number[] {
    //Institution profile ids for the parent, plus the current child's institution profile id
    //This is used to get posts, calendar events, etc.
    let institutionProfileIds = this.CurrentProfile.institutionProfiles.map(institution => institution.id);
    let childInstitutionProfileId = this.CurrentChild.institutionProfile.id;
    institutionProfileIds.push(childInstitutionProfileId);
    return institutionProfileIds;
  }

  /*
  * Get general posts for the current profile and current child
  * @param retrievePastDays - The number of days to retrieve posts for.
  * @param postLimit - The number of posts to retrieve.
  * @returns An array of posts.
  */
  public async GetPosts( retrievePastDays : number = 3, postLimit: number = 10) : Promise<AulaPost[]>{

    
    let institutionQueryString = this.getContextualInstitutionProfileIds().map(id => `institutionProfileIds[]=${id}`).join("&");

    const method = `posts.getAllPosts&parent=profile&index=0&${institutionQueryString}&limit=${postLimit}`;
    let root = await this.callJsonApi<AulaPosts>(method, AulaPostsSerializer.fromJSON);

    //Doesn't seem to be a way to pre-filter the posts on a date range, so we will have to do it manually
    let end = new Date(Date.now());
    let start = new Date(end.getTime() - (retrievePastDays * 24 * 60 * 60 * 1000));


    root.posts = root.posts.filter(post => {
        let postCreatedTimestamp = new Date(post.timestamp);
        if (postCreatedTimestamp < start || postCreatedTimestamp > end) {
          //The post is outside of the date range, so we skip it
          return false;
        }
        return true;
    });

    return root.posts;

  }

  /*
  * Get calendar events for the current profile and current child, only excursions (i.e. trips).
  * @param daysInPast - The number of days in the past to retrieve events for (default: 3)
  * @param daysInFuture - The number of days in the future to retrieve events for (default: 7)
  * @returns An array of calendar events.
  */
  public async GetCalendarEventsOnlyExcursions(daysInPast : number = 3, daysInFuture : number = 7) : Promise<AulaCalendarEvent[]> {
    return await this.GetCalendarEvents(daysInPast, daysInFuture, AulaCalendarEventTypes.Excursion);
  }

  /*
  * Get calendar events for the current profile and current child, special events.
  * This includes holidays, birthdays, excursions, presence holidays, and other events.
  * @param daysInPast - The number of days in the past to retrieve events for (default: 3)
  * @param daysInFuture - The number of days in the future to retrieve events for (default: 7)
  * @returns An array of calendar events.
  */
  public async GetCalendarEventsSpecialEvents(daysInPast : number = 3, daysInFuture : number = 7) : Promise<AulaCalendarEvent[]> {
    let events = await this.GetCalendarEvents(daysInPast, daysInFuture);
    return events.filter(event => 
        event.type === AulaCalendarEventTypes.Holiday ||
        event.type === AulaCalendarEventTypes.Birthday ||
        event.type === AulaCalendarEventTypes.Excursion ||
        event.type === AulaCalendarEventTypes.PresenceHoliday ||
        event.type === AulaCalendarEventTypes.Other
    );
  }

  /*
  * Get calendar events for the current profile and current child, only lessons
  * @param daysInPast - The number of days in the past to retrieve events for (default: 3)
  * @param daysInFuture - The number of days in the future to retrieve events for (default: 7)
  * @returns An array of calendar events.
  */
  public async GetCalendarEventsOnlyLessons(daysInPast : number = 3, daysInFuture : number = 7) : Promise<AulaCalendarEvent[]> {
    return await this.GetCalendarEvents(daysInPast, daysInFuture, AulaCalendarEventTypes.Lesson);
  }

  /*
  * Get calendar events for the current profile and current child, except lessons
  * @param daysInPast - The number of days in the past to retrieve events for (default: 3)
  * @param daysInFuture - The number of days in the future to retrieve events for (default: 7)
  * @returns An array of calendar events.
  */
  public async GetCalendarEventsExceptLessons(daysInPast : number = 3, daysInFuture : number = 7) : Promise<AulaCalendarEvent[]> {
    let events = await this.GetCalendarEvents(daysInPast, daysInFuture);
    return events.filter(event => event.type !== AulaCalendarEventTypes.Lesson);
  }

  /*
  * Get calendar events for the current profile and current child
  * @param daysInPast - The number of days in the past to retrieve events for (default: 3)
  * @param daysInFuture - The number of days in the future to retrieve events for (default: 7)
  * @returns An array of calendar events.
  */
  public async GetCalendarEvents(daysInPast : number = 3, daysInFuture : number = 7, eventType? : AulaCalendarEventTypes) : Promise<AulaCalendarEvent[]> {

    let now = new Date(Date.now());
    let end = new Date(now.getTime() + (daysInFuture * 24 * 60 * 60 * 1000));
    let start = new Date(now.getTime() - (daysInPast * 24 * 60 * 60 * 1000));

    function makeDateString(date : Date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      const milliseconds = String(date.getMilliseconds()).padStart(4, '0');
      
      // Get timezone offset in minutes and convert to hours and minutes
      const offset = date.getTimezoneOffset();
      const offsetHours = Math.abs(Math.floor(offset / 60));
      const offsetMinutes = Math.abs(offset % 60);
      const sign = offset <= 0 ? '+' : '-';
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;
    }

    let postData = {
      end: makeDateString(end),
      start: makeDateString(start),
      instProfileIds: this.getContextualInstitutionProfileIds(),
      resourceIds: []
    };

    const aulaMethod = `calendar.getEventsByProfileIdsAndResourceIds`;
    let root = await this.callJsonApi<AulaCalendarEvent[]>(aulaMethod, AulaCalendarEventsSerializer.fromJSON, "post", postData);


    if (eventType) {
      root = root.filter(event => event.type === eventType);
    }

    return root;
  }

  /*
  * Get gallery album media for the current profile
  * @param retrievePastDays - The number of days in the past to retrieve media for (default: 3)
  * @param albumLimit - The number of albums to retrieve (default: 12)
  * @returns An array of gallery albums.
  */
  public async GetGalleryAlbumMedia( 
    albumLimit: number = 12,
    mediaLimit: number = 30,
    mostRecentAlbums? : number,
    retrievePastDays? : number, 
   
  ) : Promise<GalleryAlbum[]> {

    let institutionQueryString = this.getContextualInstitutionProfileIds().map(id => `institutionProfileIds[]=${id}`).join("&");

    const method = `gallery.getAlbums&index=0&limit=${albumLimit}&sortOn=mediaCreatedAt&orderDirection=desc&filterBy=all&${institutionQueryString}`;
    let albums = await this.callJsonApi<GalleryAlbum[]>(method, AulaGalleryAlbumsSerializer.fromJSON);

    //Sort
    albums = albums.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());

    let getByDate = false;
    if (retrievePastDays)  getByDate = true; 
    if (mostRecentAlbums) getByDate = false;

    let returnAlbums : GalleryAlbum[] = [];

    if (getByDate) {
        let end = new Date(Date.now());
        let start = new Date(end.getTime() - (retrievePastDays! * 24 * 60 * 60 * 1000));
    
        for (let album of albums) {
          //Check if we should process this album
          let albumDate = new Date(album.creationDate);
          if (albumDate < start || albumDate > end) {
            //The album is outside of the date range, so we skip it
            continue;
          }
          returnAlbums.push(album);
        }
    } else {
        
        //Not the my child album
        returnAlbums = albums.filter(album => album.IsDefaultMyChildAlbum === false);
        //Get the most recent
        returnAlbums = returnAlbums.slice(0, mostRecentAlbums!);
        //Add the default my child album back
        returnAlbums.push(...albums.filter(album => album.IsDefaultMyChildAlbum));

    }
    

    for (let album of returnAlbums) {


        let albumScopeSignifier = "";
        
        if (album.IsDefaultMyChildAlbum) {
            //Specific album generated dynamically by Aula
            albumScopeSignifier = "userSpecificAlbum=true";
            
        } else {
            //All other albums
            albumScopeSignifier = `albumId=${album.id}`;
            
        }

        const method = `gallery.getMedia&${albumScopeSignifier}&index=0&limit=${mediaLimit}&sortOn=uploadedAt&orderDirection=desc&filterBy=all&${institutionQueryString}`;
        let aulaAlbumMedia = await this.callJsonApi<AulaAlbumMedia>(method, AulaAlbumMediaSerializer.fromJSON);

        album.Media = aulaAlbumMedia.results;

    }

    return returnAlbums;
  }

  /*
  * Get MeeBook authorization token using the Aula information.  Token used to connect to Meebook API
  * @param widgetId - The id of the widget to get the authorization token for.
  * @returns The authorization token.
  */
  private async getMeebookAulaAuthorizationToken( widgetId : string) : Promise<string> {
    //aulaToken.getAulaToken&widgetId=0003
    const method = `aulaToken.getAulaToken&widgetId=${widgetId}`;
    let authorizationToken = await this.callJsonApi<string>(method, AulaTokenSerializer.fromJSON);
    return authorizationToken;
  }

  /*
  * Gets the meebook weekly book and plan information
  * @returns The book and plan info
  */
  public async getMeeBookInformation() : Promise<MeeBookConsolidatedInformation> {

    let childFilters : string[] = [this.CurrentChild.userId];
    let institutionFilters : string[] = [this.CurrentInstitution.institutionCode];
  

    let meebookWeeklyBookAuthorizationToken = await this.getMeebookAulaAuthorizationToken(MeeBookClient.WeeklyBookWidgetId);
    let meebookWeeklyPlanAuthorizationToken = await this.getMeebookAulaAuthorizationToken(MeeBookClient.WeeklyPlanWidgetId);

    let meeBookClient = new MeeBookClient(
      childFilters,
      institutionFilters,
      meebookWeeklyBookAuthorizationToken,
      meebookWeeklyPlanAuthorizationToken
    );

    let meeBookWeekOverviewList = await meeBookClient.getWorkPlanForWeeks();
    let meeBookBookList = await meeBookClient.getBookListForWeeks()

    let meebook = new MeeBookConsolidatedInformation();
    meebook.workPlan = meeBookWeekOverviewList;
    meebook.bookList = meeBookBookList;

    return meebook;

  }
}


export * from './v22';
export * from './ISessionIdProvider';

