import { Attachment, FileAttachment, ImageAttachment } from "./AulaAttachment";
import {  AulaJsonResponseDataWrapper } from "./AulaCommon";
import { PortalRole } from "./AulaRecipients";
import { AulaThreadEntityLinkDto } from "./AulaThreads";


export class AulaMailBoxOwner {
    profileId?: number;
    portalRole?: string;
    isDeactivated?: boolean;
    mailBoxOwnerType?: string;
    id?: number;
    isDeleted?: boolean;
}

export class AulaSender {
    shortName: string;
    profilePicture: string;
    institutionCode: string;
    mailBoxOwner: AulaMailBoxOwner;
    fullName: string;
    metadata: string;
    answerDirectlyName: string;
}

export class AulaMessageText {
    html: string;
}

export class AulaMessage {
    id: string;
    sendDateTime: string;
    deletedAt: string | null;
    text: AulaMessageText;
    hasAttachments: boolean;
    pendingMedia: boolean;
    messageType: string;
    leaverNames: string | null;
    inviterName: string | null;
    sender: AulaSender;
    newRecipients: any | null;
    originalRecipients: any | null;
    attachments: Attachment[] = [];
    canReplyToMessage: boolean;

    threadId : number;
    threadSubject : string;
    threadCreator : AulaSender;
    threadStartedDateTime : string;

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

export class AulaGetMessagesForThread {
    messages: AulaMessage[];
    firstMessage: AulaMessage;
    threadCreator: AulaSender;
    threadStartedDateTime: string;
    isThreadForwarded: boolean;
    moreMessagesExist: boolean;
    hasSecureDocuments: boolean;
    page: number;
    totalMessageCount: number;
    threadEntityLinkDto: AulaThreadEntityLinkDto;
    id: number;
    subject: string;
    recipients: AulaSender[];
    extraRecipientsCount: number | null;
    muted: boolean;
    marked: boolean;
    sensitive: boolean;
    lastReadMessageId: string | null;
    isArchived: boolean;
    mailBoxOwner: AulaMailBoxOwner;
    institutionCode: string;

    //Judgement call here. Normal threads might be hundreds of receipients.
    //Arguably, if the thread only contains a few people, it is more relevant (i.e. not a "broadcast", but meant for specific persons);
    //We assume here "few people" = 10 or less people
    public IsSentToFewPeople() : boolean {
        return this.IsSentToFewerPeopleThan(10);
    }

    public IsSentToFewerPeopleThan(count: number) : boolean {
        return this.recipients.length < count;
    }

    public GetParentRecipients() : AulaSender[] {
        return this.recipients.filter(r => {
            let portalRole = r.mailBoxOwner.portalRole;
            return portalRole === PortalRole.Parent
        })
    }

    public GetChildRecipients() : AulaSender[] {
        return this.recipients.filter(r => {
            let portalRole = r.mailBoxOwner.portalRole;
            return portalRole === PortalRole.Child
        })
    }

    public GetEmployeeRecipients() : AulaSender[] {
        return this.recipients.filter(r => {
            let portalRole = r.mailBoxOwner.portalRole;
            return portalRole === PortalRole.Employee
        })
    }


    public AnyMessageHasAttachments() : boolean {
        return this.messages.some(m => m.hasAttachments);
    }

    public AnyMessageHasImageAttachments() : boolean {
        return this.messages.some(m => m.HasImageAttachments());
    }

    public AnyMessageHasFileAttachments() : boolean {
        return this.messages.some(m => m.HasFileAttachments());
    }

    public GetAllImageAttachments() : ImageAttachment[] {
        let imageAttachments : ImageAttachment[] = [];
        this.messages.forEach(m => {
            if (m.HasImageAttachments()) {
                imageAttachments.push(...m.GetImageAttachments());
            }
        });
        return imageAttachments;
    }

    public GetAllFileAttachments() : FileAttachment[] {
        let fileAttachments : FileAttachment[] = [];
        this.messages.forEach(m => {
            if (m.HasFileAttachments()) {
                fileAttachments.push(...m.GetFileAttachments());
            }
        });
        return fileAttachments;
    }

    public GetAllImageAttachmentUrls() : string[] {
        let attachments = this.GetAllImageAttachments();
        return attachments.map(attachment => attachment.GetFullSizeUrl());
    }

    public GetAllFileAttachmentUrls() : string[] {
        let attachments = this.GetAllFileAttachments();
        return attachments.map(attachment => attachment.GetFileUrl());
    }

}

class MessagesForThreadResponse extends AulaJsonResponseDataWrapper<AulaGetMessagesForThread> {
}

export class AulaThreadMessagesSerializer {
    
    //Serializing from Aula, but making sure we get to keep the methods we defined above
    static fromJSON(json: string): AulaGetMessagesForThread {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new MessagesForThreadResponse(), response) as MessagesForThreadResponse;
        responseObj.data = Object.assign(new AulaGetMessagesForThread(), responseObj.data) as AulaGetMessagesForThread;
        responseObj.data.messages = responseObj.data.messages.map(m => {
            let newM = Object.assign(new AulaMessage(), m) as AulaMessage;
            if (newM.attachments) {
                newM.attachments = newM.attachments.map(a => {
                    let newA = Object.assign(new Attachment(), a) as Attachment;
                    if (newA.IsImage && newA.IsImage()) {
                        newA = Object.assign(new ImageAttachment(), newA) as ImageAttachment;
                    } else if (newA.IsFile && newA.IsFile()) {
                        newA = Object.assign(new FileAttachment(), newA) as FileAttachment;
                    }
                    return newA;
                });
            } else {
                newM.attachments = [];
            }
            
            return newM;
        });

        //To make it easier to work with, we add the threadId (and other things) to each message (didn't come from Aula)
        let threadId = responseObj.data.id;
        responseObj.data.messages.forEach(m => {
            m.threadId = threadId;
            m.threadSubject = responseObj.data.subject;
            m.threadCreator = responseObj.data.threadCreator;
            m.threadStartedDateTime = responseObj.data.threadStartedDateTime;
        });

        return responseObj.data;
    }

}
