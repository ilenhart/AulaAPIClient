
import { AulaGroup } from './AulaGalleryAlbums';
import { AulaJsonResponseDataWrapper} from './AulaCommon';
import { ProfilePicture } from './AulaProfilePicture';

export class MediaFile {
    id: number;
    bucket: string;
    key: string;
    url: string;
    created: string;
    name: string;
}

export class MediaCreator {
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

export class Tag {
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

export class AlbumMedia {
    title: string | null;
    description: string | null;
    tags: Tag[];
    mediaType: string;
    album: any | null;
    duration: number | null;
    currentUserCanReport: boolean;
    currentUserCanDelete: boolean;
    currentUserCanEditMetaData: boolean;
    isUploadPending: boolean | null;
    commentCount: number;
    allowsComments: boolean;
    canViewComments: boolean;
    isDeleted: boolean;
    currentUserCanEditTags: boolean;
    conversionStatus: string;
    id: number;
    file: MediaFile;
    creator: MediaCreator;
    thumbnailUrl: string;
    largeThumbnailUrl: string;
    mediumThumbnailUrl: string;
    smallThumbnailUrl: string;
    extraSmallThumbnailUrl: string;
}

export class GalleryAlbum {
    id: number;
    title: string;
    description: string;
    creator: MediaCreator;
    creationDate: string;
    sharedWithGroups: AulaGroup[];
    thumbnailsUrls: string[];
    regardingInstitutionProfileId: number | null;
    currentUserCanEdit: boolean;
    currentUserCanDelete: boolean;
    currentUserCanAddMedia: boolean;
}

export class AulaAlbumMedia {
    
    album: GalleryAlbum;
    mediaCount: number;
    results: AlbumMedia[];
    totalSize: number;
    limit: number;
    startIndex: number;
    
}

class AlbumMediaResponse extends AulaJsonResponseDataWrapper<AulaAlbumMedia> {
}

// Serialization helper

export class AulaAlbumMediaSerializer {

    static fromJSON(json: string): AulaAlbumMedia {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new AlbumMediaResponse(), response);
        return responseObj.data;
    }

}
