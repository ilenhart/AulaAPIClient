import { AulaAPIClient, AulaClientConfig } from "../src";
import { AulaPost } from "../src/v22/AulaPosts";

require('dotenv').config();

test('Login Variations', async () => {

    //In normal use, we would be saving this to a local file, memory or a database
    //Sessions expire after 60(?) minutes, so also need a ttl or invalidation.
    let setKnownAulaSessionId = async (aulaSessionId: string): Promise<void> => {
        //We don't need this to do anything
    };

    const aulaConfig = new AulaClientConfig();

    /*
        Expects to pull these values from an .env file in the root.  See .env.default as a sample.  Copy it to .env and fill in the values.
    */
    aulaConfig.aulaUserName = process.env.AULA_USERNAME!;
    aulaConfig.aulaPassword = process.env.AULA_PASSWORD!;
    

    //Login with no sessionId
    let aulaClient = new AulaAPIClient(aulaConfig);
    await aulaClient.Login();
    expect(aulaClient.LoggedIn).toBe(true);
    let knownSessionId = aulaClient.SessionManager?.FinalAulaSessionId!;
    let validSessionId = knownSessionId;
    expect(knownSessionId).toBeDefined();


    //Login with a known and valid sessionId
    let getKnownAulaSessionId = async (): Promise<string> => {
        return knownSessionId;
    };
    aulaClient = new AulaAPIClient(aulaConfig);
    await aulaClient.Login(getKnownAulaSessionId, setKnownAulaSessionId);
    expect(aulaClient.LoggedIn).toBe(true);
    knownSessionId = aulaClient.SessionManager?.FinalAulaSessionId!;
    expect(knownSessionId).toBeDefined();


    //Login with an invalid sessionID (should recover and login anyway)
    let getInvalidAulaSessionId = async (): Promise<string> => {
        return "INVALID_SESSION_ID";
    };
    aulaClient = new AulaAPIClient(aulaConfig);
    await aulaClient.Login(getInvalidAulaSessionId, setKnownAulaSessionId);
    expect(aulaClient.LoggedIn).toBe(true);
    knownSessionId = aulaClient.SessionManager?.FinalAulaSessionId!;
    expect(knownSessionId).toBeDefined();


    //Login with a blank sessionId (should recover and login anyway)
    let getBlankAulaSessionId = async (): Promise<string> => {
        return "";
    };
    aulaClient = new AulaAPIClient(aulaConfig);
    await aulaClient.Login(getBlankAulaSessionId, setKnownAulaSessionId);
    expect(aulaClient.LoggedIn).toBe(true);
    knownSessionId = aulaClient.SessionManager?.FinalAulaSessionId!;
    expect(knownSessionId).toBeDefined();


    //Login with a known and valid sessionId, once more, as a double check
    let getValidAulaSessionId = async (): Promise<string> => {
        return validSessionId;
    };
    aulaClient = new AulaAPIClient(aulaConfig);
    await aulaClient.Login(getValidAulaSessionId, setKnownAulaSessionId);
    expect(aulaClient.LoggedIn).toBe(true);
    knownSessionId = aulaClient.SessionManager?.FinalAulaSessionId!;
    expect(knownSessionId).toBeDefined();


}, 600000);

test('Full Integration Test', async () => {
    
    const aulaConfig = new AulaClientConfig();

    /*
        Expects to pull these values from an .env file in the root.  See .env.default as a sample.  Copy it to .env and fill in the values.
    */
    aulaConfig.aulaUserName = process.env.AULA_USERNAME!;
    aulaConfig.aulaPassword = process.env.AULA_PASSWORD!;
    
    let aulaClient = new AulaAPIClient(aulaConfig);

    let usedGetSessionId = false;
    let usedSetSessionId = false;

    //In normal use, we might be pulling this from a local file, memory, or a database.
    //Sessions expire after 60(?) minutes, so also need a ttl or invalidation.
    //In the code, if a session doesn't work, it should recover and try anyway
    let getKnownAulaSessionId = async (): Promise<string> => {
        console.log("Get a valid session ID from a cache, if present.");
        usedGetSessionId = true;
        if (process.env.KNOWN_AULA_SESSION_ID && process.env.KNOWN_AULA_SESSION_ID !== "" ) {
            return process.env.KNOWN_AULA_SESSION_ID;
        }
        return ""; //Or return a valid sessionId if you have one.  Blank will be ignored and not used.

    };

    //In normal use, we would be saving this to a local file, memory or a database
    //Sessions expire after 60(?) minutes, so also need a ttl or invalidation.
    let setKnownAulaSessionId = async (aulaSessionId: string): Promise<void> => {
        console.log(`Save the supplied sessionId to a cache for later. \nIf needed, add this as KNOWN_AULA_SESSION_ID in your .env file:\n${aulaSessionId}`);
        usedSetSessionId = true;
    };

    await aulaClient.Login(getKnownAulaSessionId, setKnownAulaSessionId);

    expect(aulaClient.LoggedIn).toBe(true);
    
    //Code is written for API version 21, so this is a sanity check
    expect(aulaClient.ActiveAPIVersion).toBe(22);

    //Check the functions we supplied were used
    expect(usedGetSessionId).toBe(true);
    expect(usedSetSessionId).toBe(true);

    //Check the default profile, child and institution were set based on the login
    expect(aulaClient.CurrentProfile).toBeDefined();
    expect(aulaClient.CurrentChild).toBeDefined()
    expect(aulaClient.CurrentInstitution).toBeDefined();

    //Check the profile is valid and get an Id
    let profile = aulaClient.CurrentProfile;
    expect(profile.displayName.length).toBeGreaterThan(0);
    let profileId = profile.profileId;

    //Check that we can swap the profile and it is set correctly
    aulaClient.SetMyCurrentProfile(profile.profileId);
    expect(aulaClient.CurrentProfile.profileId).toBe(profileId);

    //Check that we have a valid child 
    let foundChild = profile.GetChildByName(process.env.TEST_CHILD_NAME!)!;
    expect(foundChild.name.indexOf(process.env.TEST_CHILD_NAME!)).toBeGreaterThan(-1);

    
    //Check that we can swap the child and is correct after being set
    aulaClient.SetMyCurrentChild(foundChild.id);
    expect(aulaClient.CurrentChild.id).toBe(foundChild.id);

    let foundInstitution = profile.GetInstitutionByName(process.env.TEST_INSTITUTION_NAME!)!;
    expect(foundInstitution.institutionName.indexOf(process.env.TEST_INSTITUTION_NAME!)).toBeGreaterThan(-1);

    aulaClient.SetMyCurrentInstitution(foundInstitution.id);
    expect(aulaClient.CurrentInstitution.id).toBe(foundInstitution.id);

    let child = aulaClient.CurrentChild;
    expect(child.name.length).toBeGreaterThan(0);

    let institution = aulaClient.CurrentInstitution;;
    expect(institution.institutionCode.length).toBeGreaterThan(0);

    //Overview for the current child
    let overview = await aulaClient.GetDailyOverview(child.id);

    //Post checking
    let POSTS_RETRIEVE_PAST_DAYS = 21;
    let posts = await aulaClient.GetPosts(POSTS_RETRIEVE_PAST_DAYS);

    if (posts.some(post => post.attachments.length > 0 )) {

        posts.forEach( (p) => {
            if (p.HasImageAttachments()) {
                let imageAttachments = p.GetImageAttachments();
                expect(imageAttachments.length).toBeGreaterThan(0);
            }
            if (p.HasFileAttachments()) {
                let fileAttachments = p.GetFileAttachments();
                expect(fileAttachments.length).toBeGreaterThan(0);
            }
        });
    }

    //Calendar event checking
    let EVENTS_RETRIEVE_PAST_DAYS = 7;
    let EVENTS_RETRIEVE_FUTURE_DAYS = 7;

    let calendarEvents = await aulaClient.GetCalendarEvents(EVENTS_RETRIEVE_PAST_DAYS, EVENTS_RETRIEVE_FUTURE_DAYS);
    let calendarEventsOnlyLessons = await aulaClient.GetCalendarEventsOnlyLessons(EVENTS_RETRIEVE_PAST_DAYS, EVENTS_RETRIEVE_FUTURE_DAYS);
    let calendarEventsExceptLessons = await aulaClient.GetCalendarEventsExceptLessons(EVENTS_RETRIEVE_PAST_DAYS, EVENTS_RETRIEVE_FUTURE_DAYS);

    //The next three methods deal with "special" kinds of events, which may or may not be in the calendar.  
    //Calling as a formality and to check errors, but no expect() is on these.
    let calendarEventsOnlyExcursions = await aulaClient.GetCalendarEventsOnlyExcursions(EVENTS_RETRIEVE_PAST_DAYS, EVENTS_RETRIEVE_FUTURE_DAYS);
    let calendarEventsSpecialEvents = await aulaClient.GetCalendarEventsSpecialEvents(EVENTS_RETRIEVE_PAST_DAYS, EVENTS_RETRIEVE_FUTURE_DAYS);
    

    //Expect some kind of event to be present
    expect(calendarEvents.length).toBeGreaterThan(0);

    //Expect that the sum of the lessons and the other non-lessons is the total number of events
    expect(calendarEventsOnlyLessons.length + calendarEventsExceptLessons.length).toBe(calendarEvents.length);
    
    
    //Threads and messages checking
    let MESSAGES_RETRIEVE_PAST_DAYS = 21;
    let threads = await aulaClient.GetAulaThreads(MESSAGES_RETRIEVE_PAST_DAYS);
    
    //Check we can pull a single thread in isolation if we had an Id
    let firstThread = await aulaClient.GetAulaThreadSingle(threads[0].id.toString());
    expect(firstThread.messages.length).toBeGreaterThan(0);

    //Different ways to get recipients of the threads
    let parentRecipients = firstThread.GetParentRecipients();
   //expect(parentRecipients.length).toBeGreaterThan(0);
    let childRecipients = firstThread.GetChildRecipients();
    //expect(childRecipients.length).toBeGreaterThan(0);
    let employeeRecipients = firstThread.GetEmployeeRecipients();
    //expect(employeeRecipients.length).toBeGreaterThan(0);

    //Deep examination of the attachment pulling logic, as getting pictures and files is a much needed feature
    threads.forEach(thread => {
        if (thread.AnyMessageHasAttachments()) {

            //Check each individual message for functionality
            thread.messages.forEach( (m) => {
                if (m.HasImageAttachments()) {
                    let imageAttachments = m.GetImageAttachments();
                    expect(imageAttachments.length).toBeGreaterThan(0);
                    expect(imageAttachments[0].GetFullSizeUrl().length).toBeGreaterThan(0);

                    let imageAttachmentUrls = m.GetImageAttachmentUrls();
                    expect(imageAttachmentUrls.length).toBeGreaterThan(0);
                    expect(imageAttachmentUrls[0].length).toBeGreaterThan(0);
                }
                if (m.HasFileAttachments()) {
                    let fileAttachments = m.GetFileAttachments();
                    expect(fileAttachments.length).toBeGreaterThan(0);
                    expect(fileAttachments[0].GetFileUrl().length).toBeGreaterThan(0);

                    let fileAttachmentUrls = m.GetFileAttachmentUrls();
                    expect(fileAttachmentUrls.length).toBeGreaterThan(0);
                    expect(fileAttachmentUrls[0].length).toBeGreaterThan(0);
                }
            });

            //Check the thread-wide ability to get all attachments
            if (thread.AnyMessageHasImageAttachments()) {
                let allImageAttachments = thread.GetAllImageAttachments();
                expect(allImageAttachments.length).toBeGreaterThan(0);
                expect(allImageAttachments[0].GetFullSizeUrl().length).toBeGreaterThan(0);

                let allImageAttachmentUrls = thread.GetAllImageAttachmentUrls();
                expect(allImageAttachmentUrls.length).toBeGreaterThan(0);
                expect(allImageAttachmentUrls[0].length).toBeGreaterThan(0);
            }

            if (thread.AnyMessageHasFileAttachments()) {
                let allFileAttachments = thread.GetAllFileAttachments();
                expect(allFileAttachments.length).toBeGreaterThan(0);
                expect(allFileAttachments[0].GetFileUrl().length).toBeGreaterThan(0);

                let allFileAttachmentUrls = thread.GetAllFileAttachmentUrls();
                expect(allFileAttachmentUrls.length).toBeGreaterThan(0);
                expect(allFileAttachmentUrls[0].length).toBeGreaterThan(0);
            }
        }
    });
    
    //Get the threads that are not "broadcast" threads, i.e. sent to fewer than 10 people
    //Arguably, these threads are more "for us", rather than everyone
    let nonBroadcastThreads = threads.filter(t => t.IsSentToFewPeople());
    //no expect, because we can't know how many threads are "broadcast" or not

    //Get the messages, without the context of the threads they appeared within
    let messages = await aulaClient.GetAulaMessages(MESSAGES_RETRIEVE_PAST_DAYS);
    
    if (messages.some(message => message.attachments.length > 0 )) {
        messages.forEach( (m) => {
            if (m.HasImageAttachments()) {
                let imageAttachments = m.GetImageAttachments();
                expect(imageAttachments.length).toBeGreaterThan(0);
                expect(imageAttachments[0].GetFullSizeUrl().length).toBeGreaterThan(0);

                let imageAttachmentUrls = m.GetImageAttachmentUrls();
                expect(imageAttachmentUrls.length).toBeGreaterThan(0);
                expect(imageAttachmentUrls[0].length).toBeGreaterThan(0);
            }
            if (m.HasFileAttachments()) {
                let fileAttachments = m.GetFileAttachments();
                expect(fileAttachments.length).toBeGreaterThan(0);
                expect(fileAttachments[0].GetFileUrl().length).toBeGreaterThan(0);

                let fileAttachmentUrls = m.GetFileAttachmentUrls();
                expect(fileAttachmentUrls.length).toBeGreaterThan(0);
                expect(fileAttachmentUrls[0].length).toBeGreaterThan(0);
            }
        });
    }
    

    //Pictures and gallery items
    let ALBUM_LIMIT = 10;
    let MEDIA_LIMIT = 30;
    let ALBUMS_RETRIEVE_PAST_DAYS = 7;
    let ALBUMS_RETRIEVE_MOST_RECENT_ALBUMS = 5;
    let albums = await aulaClient.GetGalleryAlbumMedia(ALBUM_LIMIT, MEDIA_LIMIT, 
            ALBUMS_RETRIEVE_MOST_RECENT_ALBUMS, ALBUMS_RETRIEVE_PAST_DAYS);

    albums.forEach(album => {
        if (album.HasImages()){
            let images = album.GetImages();
            expect(images[0].GetFullSizeUrl().length).toBeGreaterThan(0);
            expect(images[0].GetThumbnailUrl().length).toBeGreaterThan(0);
            expect(images[0].GetLargeThumbnailUrl().length).toBeGreaterThan(0);
        };
    });

    //There's always a default album for the current child.  Here we test to ensure we can get it, and it has images
    let myChildAlbum = albums.find(album => album.IsDefaultMyChildAlbum);
    expect(myChildAlbum).toBeDefined();
    expect(myChildAlbum!.HasImages()).toBe(true);
    expect(myChildAlbum!.GetImages().length).toBeGreaterThan(0);
    expect(myChildAlbum!.GetImages()[0].HasChildNameTag(process.env.TEST_CHILD_NAME!)).toBe(true);

    //Meebook, which has some additional educational information
    let meeBook = await aulaClient.getMeeBookInformation();

    //Below we have a set of "finding people" methods.  These are useful for finding people by name, and then getting their children, parents, teachers, etc.

    //Find people by name (children, parents, teachers, etc)
    let foundPeople = await aulaClient.FindAnyPeople(process.env.TEST_PARENT_NAME!);
    expect(foundPeople.length).toBeGreaterThan(0);
    expect(foundPeople[0].name.indexOf(process.env.TEST_PARENT_NAME!)).toBeGreaterThan(-1);

    //Find parents generally by name
    let foundParents = await aulaClient.FindAnyParents(process.env.TEST_PARENT_NAME!);
    expect(foundParents.length).toBeGreaterThan(0);
    expect(foundParents[0].name.indexOf(process.env.TEST_PARENT_NAME!)).toBeGreaterThan(-1);

    //Find the children of the first parent
    let foundChildrenOfParent = foundParents[0].GetChildren();
    expect(foundChildrenOfParent.length).toBeGreaterThan(0);

    //Find children generally by name
    let foundChildren = await aulaClient.FindAnyChildren(process.env.TEST_CHILD_NAME!);
    expect(foundChildren.length).toBeGreaterThan(0);
    expect(foundChildren[0].name.indexOf(process.env.TEST_CHILD_NAME!)).toBeGreaterThan(-1);

    //Find the parents of the first child
    let foundParentsOfChild = foundChildren[0].GetParents();
    expect(foundParentsOfChild.length).toBeGreaterThan(0);

    //Find the teachers of the first child
    let foundTeachersOfChild = foundChildren[0].GetTeachers();
    expect(foundTeachersOfChild.length).toBeGreaterThan(0);

    //Find teachers in general by name
    let foundTeachers = await aulaClient.FindAnyTeachers(process.env.TEST_TEACHER_NAME!);
    expect(foundTeachers.length).toBeGreaterThan(0);
    expect(foundTeachers[0].name.indexOf(process.env.TEST_TEACHER_NAME!)).toBeGreaterThan(-1);

    //Find preschool teachers (SFO) in general by name
    let foundPreschoolTeachers = await aulaClient.FindAnyPreschoolTeachers(process.env.TEST_PRESCHOOL_TEACHER_NAME!);
    expect(foundPreschoolTeachers.length).toBeGreaterThan(0);
    expect(foundPreschoolTeachers[0].name.indexOf(process.env.TEST_PRESCHOOL_TEACHER_NAME!)).toBeGreaterThan(-1);

    //Find leaders in general by name
    let foundLeaders = await aulaClient.FindAnyLeaders(process.env.TEST_LEADER_NAME!);
    expect(foundLeaders.length).toBeGreaterThan(0);
    expect(foundLeaders[0].name.indexOf(process.env.TEST_LEADER_NAME!)).toBeGreaterThan(-1);
    
    console.log("Integration test complete");
    
}, 600000);
