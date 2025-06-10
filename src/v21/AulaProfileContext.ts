/*
import { AulaJsonResponseDataWrapper, ProfilePicture } from "../../../entities/AulaCommon";

// Address interface for profile addresses
interface Address {
    id: number;
    street: string;
    postalCode: number;
    postalDistrict: string;
}


// AdministrativeAuthority interface
interface AdministrativeAuthority {
    id: number;
    name: string;
    institutionCodes: string[];
}

// Institution interface
interface Institution {
    institutionCode: string;
    institutionName: string;
    municipalityCode: string;
    municipalityName: string;
    type: string;
    administrativeAuthority: AdministrativeAuthority;
}

// Relation interface for institution profile relations
interface Relation {
    id: number;
    profileId: number;
    uniPersonId: number;
    firstName: string;
    lastName: string;
    fullName: string;
    shortName: string;
    role: string;
    mailBoxId: number;
    institution: Institution;
    gender: string;
    profilePicture: ProfilePicture;
    mainGroupName: string;
    metadata: string;
}

// InstitutionProfile class
class InstitutionProfile {
    encryptionKey: string;
    communicationBlock: boolean;
    address: Address;
    email: string;
    birthday: string;
    phone: string;
    delegatedCalendarProfiles: any[];
    relations: Relation[];
    id: number;
    profileId: number;
    uniPersonId: number;
    firstName: string;
    lastName: string;
    fullName: string;
    shortName: string;
    role: string;
    mailBoxId: number;
    institution: Institution;
    gender: string;
    profilePicture: ProfilePicture | null;
    mainGroupName: string | null;
    metadata: string;
}

// Child interface
interface Child {
    id: number;
    profileId: number;
    userId: string;
    name: string;
    profilePicture: ProfilePicture;
    shortName: string;
    institutionCode: string;
    hasCustodyOrExtendedAccess: boolean;
}

// Group interface
class Group {
    id: number;
    uniGroupId: string | null;
    name: string;
    description: string;
    groupType: string;
    membershipType: string;
    role: string;
    dashboardEnabled: boolean;
    endTime: string | null;
    membershipId: number | null;
}

// Permission interface
interface Permission {
    permissionId: number;
    stepUp: boolean;
    groupScopes: number[];
    institutionScope: boolean;
}

// InstitutionDetails interface
interface InstitutionDetails {
    institutionProfileId: number;
    name: string;
    shortName: string;
    institutionCode: string;
    institutionType: string;
    municipalityCode: string;
    children: Child[];
    groups: Group[];
    institutionRole: string;
    permissions: Permission[];
    mailboxId: number;
    administrativeAuthority: AdministrativeAuthority;
    communicationBlock: boolean;
}

// Module interface
interface Module {
    canBePlacedOnGroup: boolean;
    id: number;
    name: string;
    icon: string;
    description: string;
    url: string;
    type: string;
}

// ModuleConfiguration interface
interface ModuleConfiguration {
    placement: string;
    module: Module;
    id: number;
    order: number;
    institutionRole: string;
    scope: string;
    centralDisplayMode: string;
    municipalityDisplayMode: string;
    institutionDisplayMode: string;
    aggregatedDisplayMode: string;
    restrictedGroups: any[];
}

// Widget interface
interface Widget {
    widgetId: string;
    isSecure: boolean;
    canAccessOnMobile: boolean;
    canBePlacedInsideModule: boolean;
    canBePlacedOnGroup: boolean;
    canBePlacedOnFullPage: boolean;
    supportsTestMode: boolean;
    widgetSupplier: string;
    isPilot: boolean;
    widgetVersion: string;
    iconEmployee: string;
    iconHover: string;
    id: number;
    name: string;
    icon: string;
    description: string;
    url: string;
    type: string;
}

// WidgetConfiguration interface
interface WidgetConfiguration {
    placement: string;
    widget: Widget;
    id: number;
    order: number;
    institutionRole: string;
    scope: string;
    centralDisplayMode: string;
    municipalityDisplayMode: string;
    institutionDisplayMode: string;
    aggregatedDisplayMode: string;
    restrictedGroups: any[];
}

// PageConfiguration interface
interface PageConfiguration {
    moduleConfigurations: ModuleConfiguration[];
    widgetConfigurations: WidgetConfiguration[];
    editorPluginDetails: any[];
}

// Main AulaProfileContext class
class AulaProfileContext {
    id: number;
    userId: string;
    portalRole: string;
    supportRole: boolean;
    municipalAdmin: boolean;
    isGroupHomeAdmin: boolean;
    institutionProfile: InstitutionProfile;
    institutions: InstitutionDetails[];
    municipalGroups: any[];
    mobilePhonenumber: string;
    homePhonenumber: string | null;
    workPhonenumber: string | null;
    pageConfiguration: PageConfiguration;
    isSteppedUp: boolean;
    loginPortalRole: string;
    groupHomes: any[];
}

class AulaProfileContextResponse extends AulaJsonResponseDataWrapper<AulaProfileContext> {
}


// Serialization helper
export class AulaProfileContextSerializer {

    static fromJSON(json: string): AulaProfileContext {
        const response = JSON.parse(json);
        const responseObj =  Object.assign(new AulaProfileContextResponse (), response);
        return responseObj.data;
    }

}

export { 
    AulaProfileContext,
    InstitutionProfile
};

export type { 
    Address,
    AdministrativeAuthority,
    Institution,
    Relation,
    Child,
    Group,
    Permission,
    InstitutionDetails,
    Module,
    ModuleConfiguration,
    Widget,
    WidgetConfiguration,
    PageConfiguration
};
*/