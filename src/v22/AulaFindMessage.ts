import { Attachment, FileAttachment, ImageAttachment } from "./AulaAttachment";
import {  AulaJsonResponsePagedResults } from "./AulaCommon";
import { AulaMailBoxOwner } from "./AulaThreadMessages";

export class AulaFindMessageRequest {

    activeChildrenInstitutionProfileIds: number[] = [];
    commonInboxId : string | null = null;
    exactTerm : boolean = true;
    filterBy : string = "all";
    fromDate : string;
    toDate : string;
    hasAttachments: boolean | null = null;
    institutionCodes : string[] = [];
    limit : number = 20;
    messageContent : string;
    offset: number = 0;
    participants: AulaFindMessageMailboxParticipant[];
    sortBy : string = "date";
    sortDirection: string = "desc";
    text : string = "";
    threadCreators : AulaMailBoxOwner[] = []; 
    threadSubject : string | null = null;
    
    constructor(
        activeChildrenInstitutionProfileIds : number[],
        institutionCodes : string[]
    ) {
        this.activeChildrenInstitutionProfileIds = activeChildrenInstitutionProfileIds;
        this.institutionCodes = institutionCodes;
    }

    public setDateRange(fromDate : Date, toDate : Date)  {
         this.fromDate  = fromDate.toISOString();
         this.toDate = toDate.toISOString();
    }

    
}

export class AulaFindMessageMailboxParticipant {
    id: number;
    mailBoxOwnerType: string;
}

export class AulaFindMessageResult {
    subscriptionId : number;
    institutionCode : string;
    deleted : boolean;
    marked : boolean;
    muted : boolean;
    thread : AulaFindMessageThread;
    searchMessage : AulaFindMessageMessage;
}

export class AulaFindMessageThread {
    id: string;
    subject : string;
    sensitivityLevel: number;
    isForwarded: boolean;
    threadType : string;
}

export class AulaFindMessageMessage {

    id : string;
    text: string;
    sendDateTime: string;
    threadId: string;
    threadSubject: string;

    attachments: Attachment[]  = [];

    public HasImageAttachments() : boolean {
        return this.GetImageAttachments().length > 0;
    }

    public HasFileAttachments() : boolean {
        return this.GetFileAttachments().length > 0;
    }

    public GetImageAttachments() : ImageAttachment[] {
        if (this.attachments.length === 0) return [];

        let attachments = this.attachments.filter(attachment => attachment.IsImage());
        let imageAttachments = attachments.map(attachment => attachment.AsImage());
        let filteredImageAttachments = imageAttachments.filter(attachment => attachment !== null);
        return filteredImageAttachments!;
    }

    public GetFileAttachments() : FileAttachment[] {
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

export class AulaFindMessageMessageCreator {
    fullName : string;
    metadata: string;
    answerDirectlyName: string;
    mailBoxOwner: AulaMailBoxOwner;
}

class AulaFindMessagesResponse extends AulaJsonResponsePagedResults<AulaFindMessageResult> {

}

// Serialization helper
export class AulaFindMessagesSerializer {

    static fromJSON(responseJson: string): AulaFindMessageResult[] {
        const response = JSON.parse(responseJson);
        const responseObj =  Object.assign(new AulaFindMessagesResponse(), response) as AulaFindMessagesResponse;

        responseObj.data.results = responseObj.data.results.map(r => {
            let newR = Object.assign(new AulaFindMessageResult(), r) as AulaFindMessageResult;
            newR.searchMessage = Object.assign(new AulaFindMessageMessage(), newR.searchMessage) as AulaFindMessageMessage;

            if (newR.searchMessage.attachments) {
                newR.searchMessage.attachments = newR.searchMessage.attachments.map(a => {
                    let newA = Object.assign(new Attachment(), a) as Attachment;
                    if (newA.IsImage && newA.IsImage()) {
                        newA = Object.assign(new ImageAttachment(), newA) as ImageAttachment;
                    } else if (newA.IsFile && newA.IsFile()) {
                        newA = Object.assign(new FileAttachment(), newA) as FileAttachment;
                    }
                    return newA;
                });
            } else {
                newR.searchMessage.attachments = [];
            }
            
            return newR;
        });

        return responseObj.data.results;
    }

}