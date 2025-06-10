import { AulaJsonResponseDataWrapper} from './AulaCommon';
import { ProfilePicture } from './AulaProfilePicture';
import { AulaMessage } from './AulaThreadMessages';

export class AulaMailBoxOwner {
    profileId?: number;
    portalRole?: string;
    isDeactivated?: boolean;
    mailBoxOwnerType?: string;
    id?: number;
    isDeleted?: boolean;
}

export class AulaCreator {
    mailBoxOwner: AulaMailBoxOwner;
    fullName: string;
    metadata: string;
    answerDirectlyName: string;
}

export class AulaMessageText {
    html: string;
}

export class AulaLatestMessage {
    id: string;
    sendDateTime: string;
    text: AulaMessageText;
}

export class AulaRegardingChild {
    profilePicture?: ProfilePicture;
    shortName: string;
    profileId: number;
    displayName: string;
}

export class AulaRecipient {
    lastReadMessageId?: string;
    lastReadTimestamp?: string;
    leaveTime?: string | null;
    deletedAt?: string | null;
    shortName: string;
    profilePicture?: ProfilePicture | null;
    mailBoxOwner: AulaMailBoxOwner;
    fullName: string;
    metadata: string;
    answerDirectlyName: string;
}

export class AulaThreadEntityLinkDto {
    entityId: string | null;
    threadType: string;
}

export class AulaThread {
    leaveTime: string | null;
    latestMessage: AulaLatestMessage;
    regardingChildren: AulaRegardingChild[];
    creator: AulaCreator;
    startedTime: string;
    read: boolean;
    isThreadOrSubscriptionDeleted: boolean;
    subscriptionId: number;
    subscriptionType: string;
    numberOfBundleItems: number | null;
    primarySubscriptionId: number | null;
    threadEntityLinkDto: AulaThreadEntityLinkDto;
    id: number;
    subject: string;
    recipients: AulaRecipient[];
    extraRecipientsCount: number;
    muted: boolean;
    marked: boolean;
    sensitive: boolean;
    lastReadMessageId: string | null;
    isArchived: boolean;
    mailBoxOwner: AulaMailBoxOwner;
    institutionCode: string;

    messages: AulaMessage[];
}

export class AulaGetThreads {
    moreMessagesExist: boolean;
    page: number;
    threads: AulaThread[];
}

export class ThreadsResponse extends AulaJsonResponseDataWrapper<AulaGetThreads> {
}

export class AulaThreadsSerializer {

    static fromJSON(json: string): AulaGetThreads {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new ThreadsResponse(), response);
        return responseObj.data;
    }

}
