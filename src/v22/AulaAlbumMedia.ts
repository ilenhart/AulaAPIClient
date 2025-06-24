
import { GalleryAlbum } from './AulaGalleryAlbums';
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

    /*
    * Check if the media has a tag with the name part and role child.
    * @param namePart - The part of the name to check for.
    * @returns True if the media has a tag with the name part and role child, false otherwise.
    */
    public HasChildNameTag(namePart : string) : boolean {
        if (!this.tags) return false;
        let childNameTag = this.tags.find(tag => tag.name.toLowerCase().includes(namePart.toLowerCase()) && tag.role === "child");
        return childNameTag !== undefined;
    }

    /*
    * Get the url of the thumbnail image.  This is the smallest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the thumbnail image.
    */
    public GetThumbnailUrl() : string {
        if (this.thumbnailUrl) {
            return this.thumbnailUrl;
        }
        return "";
    }

    /*
    * Get the url of the large thumbnail image.  This is the second smallest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the large thumbnail image.
    */
    public GetLargeThumbnailUrl() : string {
        if (this.largeThumbnailUrl) {
            return this.largeThumbnailUrl;
        }
        return "";
    }

    /*
    * Get the url of the full size image.  This is the largest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the full size image.
    */
    public GetFullSizeUrl() : string {
        if (this.file && this.file.url) {
            return this.file.url;
        }
        return "";
    }
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
        const responseObj = Object.assign(new AlbumMediaResponse(), response) as AlbumMediaResponse;

        responseObj.data.results = responseObj.data.results.map((media : AlbumMedia) => {
            media = Object.assign(new AlbumMedia(), media) as AlbumMedia;
       
            media.tags = media.tags.map((tag : Tag) => {
                tag = Object.assign(new Tag(), tag) as Tag;
                return tag;
            });

            media.creator = Object.assign(new MediaCreator(), media.creator) as MediaCreator;
            media.file = Object.assign(new MediaFile(), media.file) as MediaFile;

            return media
        });


        return responseObj.data;
    }

}
