import { AulaJsonResponseDataWrapper } from "./AulaCommon";
import { InstitutionProfile } from "./AulaProfiles";

// ProfilePicture interface for profile pictures
interface ProfilePicture {
    id: number;
    key: string;
    bucket: string;
    isImageScalingPending: boolean;
    url: string;
}



// MainGroup interface
interface MainGroup {
    id: number;
    name: string;
    shortName: string;
    institutionCode: string;
    institutionName: string;
    mainGroup: boolean;
    uniGroupType: string;
    isDeactivated: boolean;
    allowMembersToBeShown: boolean;
}

// DailyOverview class representing a single daily overview entry
class DailyOverview {
    id: number;
    institutionProfile: InstitutionProfile;
    mainGroup: MainGroup;
    status: number;
    location: string | null;
    sleepIntervals: any[];
    checkInTime: string | null;
    checkOutTime: string | null;
    editablePresenceStates: any[];
    isDefaultEntryTime: boolean;
    isDefaultExitTime: boolean;
    isPlannedTimesOutsideOpeningHours: boolean;
    activityType: number;
    entryTime: string;
    exitTime: string;
    exitWith: string | null;
    comment: string | null;
    spareTimeActivity: any | null;
    selfDeciderStartTime: string | null;
    selfDeciderEndTime: string | null;
}

class DailyOverViewResponse extends AulaJsonResponseDataWrapper<DailyOverview[]> {
}

// Serialization helper
export class AulaDailyOverviewSerializer {

    static fromJSON(responseJson: string): DailyOverview[] {
        const response = JSON.parse(responseJson);
        const responseObj =  Object.assign(new DailyOverViewResponse (), response);
        return responseObj.data;
    }

}

export { DailyOverview };
export type { InstitutionProfile, MainGroup};
