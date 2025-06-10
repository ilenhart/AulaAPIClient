import { ProfilePicture } from "./AulaProfilePicture";

// Attachment class representing a post attachment
export class Attachment {
    id: number;
    name: string;
    status: string;
    creator: {
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
    };
    file: {
        id: number;
        bucket: string;
        key: string;
        url: string;
        created: string;
        name: string;
    } | null;
    link: any | null;
    media: {
        title: string | null;
        description: string | null;
        tags: string[];
        mediaType: string;
        album: any | null;
        duration: any | null;
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
        file: {
            id: number;
            bucket: string;
            key: string;
            url: string;
            created: string;
            name: string;
        };
        creator: {
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
        };
        thumbnailUrl: string;
        largeThumbnailUrl: string;
        mediumThumbnailUrl: string;
        smallThumbnailUrl: string;
        extraSmallThumbnailUrl: string;
    } | null;
    document: any | null;
    currentUserCanReport: boolean;

    public IsImage() : boolean {
        if (this.media && this.media.mediaType && this.media.mediaType.toLowerCase().indexOf("image") > -1) {
            return true;
        }
        return false;
    }

    public IsFile() : boolean {
        if (this.file) {
            return true;
        }
        return false;
    }

    public AsFile() : FileAttachment | null {
        if (this.IsFile()) {
            var fileObject = Object.assign(new FileAttachment(), this) as FileAttachment;
            return fileObject;
        }
        return null;
    }

    public AsImage() : ImageAttachment | null {
        if (this.IsImage()) {
            var imageObject = Object.assign(new ImageAttachment(), this) as ImageAttachment;
            return imageObject;
        }
        return null;
    }
    
}

export class ImageAttachment extends Attachment {

    /*
    * Get the url of the thumbnail image.  This is the smallest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the thumbnail image.
    */
    public GetThumbnailUrl() : string {
        if (this.media && this.media.thumbnailUrl) {
            return this.media.thumbnailUrl;
        }
        return "";
    }

    /*
    * Get the url of the large thumbnail image.  This is the second smallest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the large thumbnail image.
    */
    public GetLargeThumbnailUrl() : string {
        if (this.media && this.media.largeThumbnailUrl) {
            return this.media.largeThumbnailUrl;
        }
        return "";
    }

    /*
    * Get the url of the full size image.  This is the largest image available.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the full size image.
    */
    public GetFullSizeUrl() : string {
        if (this.media && this.media.file && this.media.file.url) {
            return this.media.file.url;
        }
        return "";
    }
}

export class FileAttachment extends Attachment {

    public GetFileName() : string {
        if (this.file && this.file.name) {
            return this.file.name;
        }
        return "";
    }

    /*
    * Get the url of the file.  This is the url of the file on S3.
    * The URL expires (it's from S3), so must be used quickly.
    * @returns The url of the file.
    */
    public GetFileUrl() : string {
        if (this.file && this.file.url) {
            return this.file.url;
        }
        return "";
    }
}