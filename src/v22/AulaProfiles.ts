import { AulaJsonResponseDataWrapper} from "./AulaCommon";
import { ProfilePicture } from "./AulaProfilePicture";

// Status interface for the top-level status object
interface Status {
    code: number;
    message: string;

}

// Address interface for profile addresses
interface Address {
    id: number;
    street: string;
    postalCode: number;
    postalDistrict: string;
}

// InstitutionProfile class representing a profile at an institution
class InstitutionProfile {
    id: number;
    profileId: number;
    institutionCode: string;
    institutionName: string;
    municipalityCode: string;
    municipalityName: string;
    firstName: string;
    lastName: string;
    fullName: string;
    gender: string;
    role: string;
    institutionRole: string | null;
    institutionType: string | null;
    aulaEmail: string;
    address: Address;
    email: string | null;
    homePhoneNumber: string | null;
    mobilePhoneNumber: string | null;
    workPhoneNumber: string | null;
    mainGroup: string | null;
    shortName: string;
    profilePictureUrl: string | null;
    profilePicture: ProfilePicture | null;
    newInstitutionProfile: boolean;
    communicationBlocked: boolean | null;
    isPrimary: boolean;
    birthday: string | null;
    institutionProfileDescriptions: any | null;
    lastActivity: string | null;
    hasCustody: boolean | null;
    alias: boolean;
    groups: any | null;
    relation: any | null;
    isInternalProfilePicture: boolean | null;
    accessLevel: any | null;
    currentUserCanViewContactInformation: boolean;
    userHasGivenConsentToShowContactInformation: boolean;
    deactivated: boolean | null;
    profileStatus: string;
    currentUserCanSeeProfileDescription: boolean;
    currentUserCanEditProfileDescription: boolean;
    currentUserCanEditContactInformation: boolean;
    currentUserCanEditProfilePicture: boolean;
    currentUserCanDeleteProfilePicture: boolean;
    shouldShowDeclineConsentTwoWarning: boolean | null;
    contactType: string;
    hasBlockedCommunicationChannels: boolean;
    metadata: string;
}

// Child class representing a child profile
class Child {
    institutionProfile: InstitutionProfile;
    id: number;
    profileId: number;
    userId: string;
    name: string;
    profilePicture: ProfilePicture;
    shortName: string;
    institutionCode: string;
    hasCustodyOrExtendedAccess: boolean;
}

// Profile class representing a user profile
class Profile {
    institutionProfiles: InstitutionProfile[];
    children: Child[];
    age18AndOlder: boolean | null;
    overConsentAge: boolean | null;
    contactInfoEditable: boolean | null;
    portalRole: string;
    isLatestDataPolicyAccepted: boolean;
    supportRole: boolean;
    profileId: number;
    displayName: string;
    fullName: string;

    //Redundant, but helpful
    public GetChildren() : Child[] {
        return this.children;   
    }

    public GetChildByName(childNamePart : string) : Child | undefined {
        return this.children.find(child => child.name.indexOf(childNamePart) > -1);
    }

    public GetInstitutionByName(institutionNamePart : string) : InstitutionProfile | undefined {
        return this.institutionProfiles.find(institution => institution.institutionName.indexOf(institutionNamePart) > -1);
    }
}

// Top-level data structure
class AulaProfiles {
    profiles: Profile[];

    public GetProfileByDisplayName(displayNamePart : string) : Profile | undefined {
        return this.profiles.find(profile => profile.displayName.indexOf(displayNamePart) > -1);
    }
}

class ProfilesResponse extends AulaJsonResponseDataWrapper<AulaProfiles> {
}

// Serialization helper
export class AulaProfilesSerializer {
    
    static fromJSON(responseJson: string): AulaProfiles {
        const response = JSON.parse(responseJson);
        const responseObj = Object.assign(new ProfilesResponse(), response) as ProfilesResponse;

        responseObj.data = Object.assign(new AulaProfiles(), responseObj.data) as AulaProfiles;

        responseObj.data.profiles = responseObj.data.profiles.map(p => {
            let newP = Object.assign(new Profile(), p) as Profile;
            return newP;
        });

        return responseObj.data;
    }

}

export { AulaProfiles,  Profile, Child, InstitutionProfile};
