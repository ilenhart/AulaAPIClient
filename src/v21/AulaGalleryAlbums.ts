import { AulaJsonResponseDataWrapper } from './AulaCommon';
import { ProfilePicture } from './AulaProfilePicture';

export class AulaGroup {
    portalRoles: string[];
    id: number;
    name: string;
    shortName: string;
    institutionCode: string;
    institutionName: string;
    mainGroup: boolean;
    isDeactivated: boolean;
    allowMembersToBeShown: boolean;
}



export class AlbumCreator {
    profileId: number;
    id: number;
    institutionCode: string;
    institutionName: string;
    role: string;
    name: string;
    profilePicture: ProfilePicture | null;
    mainGroup: string | null;
    shortName: string;
    institutionRole: string;
    metadata: string;
}

export class GalleryAlbum {
    id: number | null;
    title: string;
    description: string;
    creator: AlbumCreator | null;
    creationDate: string;
    sharedWithGroups: AulaGroup[];
    thumbnailsUrls: string[];
    regardingInstitutionProfileId: number | null;
    currentUserCanEdit: boolean;
    currentUserCanDelete: boolean;
    currentUserCanAddMedia: boolean;
}

class AulaGalleryAlbumsResponse extends AulaJsonResponseDataWrapper<GalleryAlbum[]> {

}

// Serialization helper
export class AulaGalleryAlbumsSerializer {

    static fromJSON(json: string): GalleryAlbum[] {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new AulaGalleryAlbumsResponse(), response);
        return responseObj.data;
    }

}
