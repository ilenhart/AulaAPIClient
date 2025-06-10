
import { Attachment, FileAttachment, ImageAttachment } from './AulaAttachment';
import { AulaJsonResponseDataWrapper } from './AulaCommon';
import { Profile } from './AulaProfiles';

export class AulaPostContent {
    html: string;
}

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

export class OwnerProfile {
    id: number;
    profileId: number;
    uniPersonId: number;
    firstName: string;
    lastName: string;
    fullName: string;
    shortName: string;
    role: string;
    mailBoxId: number;
    institution: {
        institutionCode: string;
        institutionName: string;
        municipalityCode: string;
        municipalityName: string;
        type: string;
        administrativeAuthority: {
            id: number;
            name: string;
            institutionCodes: string[];
        };
    };
    gender: string;
    profilePicture: {
        id: number;
        key: string;
        bucket: string;
        isImageScalingPending: boolean;
        url: string;
    } | null;
    mainGroupName: string | null;
    metadata: string;
}

export class AulaPost {
    id: number;
    title: string;
    content: AulaPostContent;
    timestamp: string;
    ownerProfile: OwnerProfile;
    allowComments: boolean;
    sharedWithGroups: AulaGroup[];
    publishAt: string;
    isPublished: boolean;
    expireAt: string;
    isExpired: boolean;
    isImportant: boolean;
    importantFrom: string | null;
    importantTo: string | null;
    relatedProfiles: Profile[];
    attachments: Attachment[] = []; 
    pendingMedia: boolean;
    commentCount: number;
    canCurrentUserDelete: boolean;
    canCurrentUserReport: boolean;
    canCurrentUserComment: boolean;
    editedAt: string | null;

    public HasImageAttachments() : boolean {
        return this.GetImageAttachments().length > 0;
    }

    public HasFileAttachments() : boolean {
        return this.GetFileAttachments().length > 0;
    }

    public GetImageAttachments() : ImageAttachment[] {
        if (!this.attachments) return [];
        if (this.attachments.length === 0) return [];

        let attachments = this.attachments.filter(attachment => attachment.IsImage());
        let imageAttachments = attachments.map(attachment => attachment.AsImage());
        let filteredImageAttachments = imageAttachments.filter(attachment => attachment !== null);
        return filteredImageAttachments!;
    }

    public GetFileAttachments() : FileAttachment[] {
        if (!this.attachments) return [];
        if (this.attachments.length === 0) return [];

        let attachments = this.attachments.filter(attachment => attachment.IsFile());
        let fileAttachments = attachments.map(attachment => attachment.AsFile());
        let filteredFileAttachments = fileAttachments.filter(attachment => attachment !== null);
        return filteredFileAttachments!;
    }

    public GetImageAttachmentUrls() : string[] {
        let attachments = this.GetImageAttachments();
        return attachments.map(attachment => attachment.GetFullSizeUrl());
    }

    public GetFileAttachmentUrls() : string[] {
        let attachments = this.GetFileAttachments();
        return attachments.map(attachment => attachment.GetFileUrl());
    }
}

export class AulaPosts {
    posts: AulaPost[];
    profileLastSeenPostDate: string;
    hasMorePosts: boolean;
}

export class AulaPostsResponse extends AulaJsonResponseDataWrapper<AulaPosts> {
}

// Serialization helper
export class AulaPostsSerializer {

    static fromJSON(json: string): AulaPosts {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new AulaPostsResponse(), response) as AulaPostsResponse;

        responseObj.data.posts = responseObj.data.posts.map(p => {
            let newP = Object.assign(new AulaPost(), p) as AulaPost;
            if (newP.attachments) {
                newP.attachments = newP.attachments.map(a => {
                    let newA = Object.assign(new Attachment(), a) as Attachment;
                    if (newA.IsImage && newA.IsImage()) {
                        newA = Object.assign(new ImageAttachment(), newA) as ImageAttachment;
                    } else if (newA.IsFile && newA.IsFile()) {
                        newA = Object.assign(new FileAttachment(), newA) as FileAttachment;
                    }
                    return newA;
                });
            } else {
                newP.attachments = [];
            }
            
            return newP;
        });

        return responseObj.data;
    }

}
