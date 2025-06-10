import { AulaJsonPagedDataWrapper, AulaJsonResponseDataWrapper, AulaJsonResponsePagedResults } from "./AulaCommon";


export class AulaRecipient {
    id : string;
    institutionName : string;
    institutionCode : string;
    name : string;
    description : string;
    municipalityName : string;
    municipalityCode : string;
    aulaEmail : string;
    portalRole : string;
    profileId : string;
    institutionRole : string;
    shortName : string;
    relatedProfiles : RelatedProfile[];
    isGroupMember : boolean;

    public GetPortalRole() : PortalRole {
        return PortalRole[this.portalRole as keyof typeof PortalRole];
    }

    public GetParents() : RelatedProfile[] {
        return this.relatedProfiles.filter(rp => rp.relationType === RelationType.Parent);
    }

    public GetChildren() : RelatedProfile[] {
        return this.relatedProfiles.filter(rp => rp.relationType === RelationType.Child);
    }

    public GetTeachers() : RelatedProfile[] {
        return this.relatedProfiles.filter(rp => rp.relationType === RelationType.Teacher);
    }
}

export class RelatedProfile {
    firstName : string;
    lastName : string;
    profileId : number;
    id : number;
    relationType : RelationType;
    aulaEmail : string;
    mainGroup : MainGroup;
    metadata : string;
}

export class MainGroup {
    id : number;
    name : string;
    institutionCode : string;
    institutionName : string;
}

export enum RelationType {
    Parent = "guardian",
    Teacher = "teacher",
    Child = "child",
}

export enum PortalRole {
    Parent = "guardian",
    Child = "child",
    Employee = "employee"
}

export enum InstitutionRole {
    Teacher = "teacher",
    Leader = "leader",
    PreschoolTeacher = "preschool-teacher",
}

class AulaRecipientsResponse extends AulaJsonResponsePagedResults<AulaRecipient> {

}

// Serialization helper
export class AulaRecipientsSerializer {

    static fromJSON(responseJson: string): AulaRecipient[] {
        const response = JSON.parse(responseJson);
        const responseObj =  Object.assign(new AulaRecipientsResponse(), response) as AulaRecipientsResponse;

        responseObj.data.results = responseObj.data.results.map(r => {
            let newR = Object.assign(new AulaRecipient(), r) as AulaRecipient;
            
            if (newR.relatedProfiles) {
                newR.relatedProfiles = r.relatedProfiles.map(rp => {
                    let newRP = Object.assign(new RelatedProfile(), rp) as RelatedProfile;
                    return newRP;
                });
            }
            

            return newR;
        });

        return responseObj.data.results;
    }

}