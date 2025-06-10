/*
Meebook is a separate API from Aula.  Doesn't have to be as complicated as Aula, we basically only want one thing out of it
*/

import axios, { AxiosInstance, AxiosResponse } from "axios";

export class MeeBookClient {

    public Session: AxiosInstance | null = null;

    public MeeBookBaseUrl : string;

    private meeBookChildFilterCodes : string[];
    private meeBookInstitutionFilterIds : string[];
    private parentId : string;

    private weeklyBookAuthorizationToken : string;
    private weeklyPlanAuthorizationToken : string;

    //Constants from the Aula frontend.  Used to get the authorization token.
    public static readonly WeeklyBookWidgetId : string = "0003";
    public static readonly WeeklyPlanWidgetId : string = "0004";

    constructor(
        meeBookChildFilterCodes : string[], 
        meeBookInstitutionFilterIds : string[], 
        weeklyBookAuthorizationToken : string,
        weeklyPlanAuthorizationToken : string,
        parentId : string
    ) {
        this.MeeBookBaseUrl = `https://app.meebook.com/aulaapi/`;
        this.meeBookChildFilterCodes = meeBookChildFilterCodes;
        this.meeBookInstitutionFilterIds = meeBookInstitutionFilterIds;
        this.weeklyBookAuthorizationToken = weeklyBookAuthorizationToken;
        this.weeklyPlanAuthorizationToken = weeklyPlanAuthorizationToken;
        this.parentId = parentId;

        this.Session = axios.create();
        //this.Session.defaults.withCredentials = true;
        this.Session.defaults.headers.common["Accept"] = "application/json";
        this.Session.defaults.headers.common["User-Agent"] = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0";
        this.Session.defaults.maxRedirects = 0; //No automatic redirection, we will follow ourselves
        
        
        this.Session.interceptors.request.use(config => {
            config.headers["sessionUUID"] = this.parentId;
            return config;
        });

    }

    private getWeekNumberFromDate(targetDate : Date) : number {
        if (!targetDate) targetDate = new Date(Date.now());

        let januaryFirstOfThisYear = new Date(targetDate.getFullYear(), 0, 1);
        let daysPassedSinceJanuaryFirst = Math.floor((targetDate.getTime() - januaryFirstOfThisYear.getTime()) / 86400000);
        let januaryFirstDayOfTheWeek = januaryFirstOfThisYear.getDay();
        //Shift to Monday is 0, Sunday is 6
        let offsetDay = (januaryFirstDayOfTheWeek === 0) ? 6 : januaryFirstDayOfTheWeek - 1;
        let weekNumber = Math.floor((daysPassedSinceJanuaryFirst + offsetDay) / 7) + 1;

        return weekNumber;
    }


    public async getWorkPlanForWeeks(numberOfAdditionalFutureWeeks : number = 0) : Promise<WeekPlanOverviewList[]> {

        let currentWeekNumber = this.getWeekNumberFromDate(new Date());

        let meeBookWeekOverviewList : WeekPlanOverviewList[] = [];

        let year = new Date(Date.now()).getFullYear();

        for (let i = 0; i <= numberOfAdditionalFutureWeeks; i++) {
            let weekNumber = currentWeekNumber + i;
            let weeklyWorkPlan = await this.getRelatedWorkPlan(year, weekNumber);

            meeBookWeekOverviewList.push(weeklyWorkPlan);
        }
        return meeBookWeekOverviewList;
    }

    private async callMeeBookApi(url : string, authorizationToken : string) : Promise<AxiosResponse> {
        
        let response : AxiosResponse;

        let headers : any ={
            "Accept-Language" : "en-US,en;q=0.5",
            "Authorization" : "Bearer " + authorizationToken,
            "Connection" : "keep-alive",
            "Origin" : "https://www.aula.dk",
            "Referer" : "https://www.aula.dk/",
            "Sec-Fetch-Dest" : "empty",
            "Sec-Fetch-Mode" : "cors",
            "Sec-Fetch-Site" : "cross-site",
            "User-Agent" : "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/112.0",
            "TE" : "trailers",
            "X-Version" : "1.0"
        };

        try
        {
            response = await this.Session!.get(url,{headers: headers});
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

        return response.data;
    }

    
    public async getRelatedWorkPlan(year: number, weekNumber: number) : Promise<WeekPlanOverviewList>{

        let currentWeekNumber = `${year}-W${weekNumber}`;

        let childFilter = this.meeBookChildFilterCodes.map(c => `childFilter[]=${c}`).join("&");
        let institutionFilter = this.meeBookInstitutionFilterIds.map(i => `institutionFilter[]=${i}`).join("&");

        //https://app.meebook.com/aulaapi/relatedweekplan/all?currentWeekNumber=YY-WNN&userProfile=guardian&childFilter[]=xxxNNNN&institutionFilter[]=NNNNN
        let url = `${this.MeeBookBaseUrl}relatedweekplan/all?currentWeekNumber=${currentWeekNumber}&userProfile=guardian&${childFilter}&${institutionFilter}`;

        let response = await this.callMeeBookApi(url, this.weeklyPlanAuthorizationToken);

        let weekPlanOverviewList = MeeBookWeekPlansSerializer.fromJSON(JSON.stringify(response));

        return weekPlanOverviewList;

    }

    public async getBookListForWeeks(numberOfAdditionalFutureWeeks : number = 0) : Promise<MeeWeeklyBooks[]>{

        let currentWeekNumber = this.getWeekNumberFromDate(new Date());

        let bookList : MeeWeeklyBooks[] = [];

        let year = new Date(Date.now()).getFullYear();

        for (let i = 0; i <= numberOfAdditionalFutureWeeks; i++) {
            let weekNumber = currentWeekNumber + i;
            let weeklyBookList = await this.getRelatedWeeklyBook(year, weekNumber);

            bookList.push(weeklyBookList);
        }

        return bookList;


    }

    public async getRelatedWeeklyBook(year: number, weekNumber: number) : Promise<MeeWeeklyBooks>{

        let currentWeekNumber = `${year}-W${weekNumber}`;

        let childFilter = this.meeBookChildFilterCodes.map(c => `childFilter[]=${c}`).join("&");
        let institutionFilter = this.meeBookInstitutionFilterIds.map(i => `institutionFilter[]=${i}`).join("&");

        //https://app.meebook.com/aulaapi/relatedweekplan/all?currentWeekNumber=YY-WNN&userProfile=guardian&childFilter[]=xxxNNNN&institutionFilter[]=NNNNN
        let url = `${this.MeeBookBaseUrl}relatedweeklybook/all?currentWeekNumber=${currentWeekNumber}&userProfile=guardian&${childFilter}&${institutionFilter}`;

        let meeBookArray = await this.callMeeBookApi(url, this.weeklyBookAuthorizationToken);
        
        let weeklyBooks = MeeBookWeeklyBooksSerializer.fromJSON(JSON.stringify(meeBookArray));

        return weeklyBooks;

    }

 
}

export class MeeBookConsolidatedInformation {
    workPlan : WeekPlanOverviewList[];
    bookList : MeeWeeklyBooks[];
}

export class MeeBookWeeklyBooksSerializer {
    static fromJSON(json: string): MeeWeeklyBooks {
        const response = JSON.parse(json);
        let newObj = new MeeWeeklyBooks()
        Object.assign(newObj, response);
        return newObj;
    }

}

export class MeeWeeklyBooks {
    id: number;
    name: string;
    unilogin: string;
    books: MeeBook[] = [];
}

export class MeeBook {
    id: number;
    title: string;
    category: string;
}

export class WeekPlanTask {
    id: number;
    type: string;
    group: string;
    pill: string;
    content: string;

    public getPillTags() : string[] {
        return this.pill.split(", ");
    }

    public getContentStringFiltered() : string {
        return this.getContentLines().join("\n");
    }

    public getContentLines() : string[] {
        return this.content.split("\n").filter(line => line.trim().replace("-", "") !== "");
    }

    //Does any of the content explicitly mention a "tur" (trip)
    public relatedToATrip() : boolean {
        return this.getContentLines().some(line => line.toLowerCase().includes(" tur "));
    }
}

export class WeekPlanDay {
    date: string;
    tasks: WeekPlanTask[] = [];

    public hasTasks() : boolean {
        return this.tasks.length > 0;
    }

    public getFullDate() : Date {

        var danishMonthsIndex = [
            'jan', 
            'feb', 
            'mar', 
            'apr', 
            'maj', 
            'jun', 
            'jul', 
            'aug', 
            'sep', 
            'okt', 
            'nov', 
            'dec'
        ];
        let now = new Date(Date.now());
        let monthAbbreviation = this.monthAbbreviationString();
        let monthIndex = danishMonthsIndex.indexOf(monthAbbreviation) as number;
        let dayNumber = this.dayNumber();

        return new Date(now.getFullYear(), monthIndex, dayNumber);
    }


    private dayNumber() : number {
        if (this.date) {
            return parseInt(this.date.split(" ")[1].replace(".", ""));
        }
        return 1;
    }

    private monthAbbreviationString() : string {
        if (this.date) {
            return this.date.split(" ")[2].replace(".", "");
        }
        return "";
    }

}

export class WeekPlanOverview {
    id: number;
    name: string;
    unilogin: string;
    weekPlan: WeekPlanDay[] = [];

    //Is this week completely empty of tasks
    public isEmptyOfTasks() : boolean {
        return this.weekPlan.every(planDay => !planDay.hasTasks())
    }

    public getWeekStartDate() : Date {
        return this.weekPlan[0].getFullDate();
    }

    public getWeekEndDate() : Date {
        return this.weekPlan[this.weekPlan.length - 1].getFullDate();
    }
}

export class WeekPlanOverviewList  extends Array<WeekPlanOverview> {

}

// Serialization helper
export class MeeBookWeekPlansSerializer {
    static fromJSON(json: string): WeekPlanOverviewList {
        const response = JSON.parse(json);
        let newObj = new WeekPlanOverviewList()
        Object.assign(newObj, response);
        return newObj;
    }

}

