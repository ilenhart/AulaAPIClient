// Types and classes for AulaCalendarEvents
import { AulaJsonResponseDataWrapper } from './AulaCommon';

class InvitedGroup {
    id: number;
    name: string;
    shortName: string;
    institutionCode: string;
    institutionName: string;
    mainGroup: boolean;
    uniGroupType: string;
    isDeactivated: boolean;
    allowMembersToBeShown: boolean;
}

class TimeSlotAnswer {
    id: number;
    instProfileId: number | null;
    concerningProfileId: number | null;
    selectedTimeSlotIndex: number;
}

class TimeSlotIndex {
    startTime: string;
    endTime: string;
}

class TimeSlotItem {
    id: number;
    startDate: string;
    endDate: string;
    answers: TimeSlotAnswer[];
    timeSlotIndexes: TimeSlotIndex[];
    belongsToResource: any | null;
}

class TimeSlot {
    timeSlots: TimeSlotItem[];
    childRequired: boolean;
}

class LessonParticipant {
    teacherId: number | null;
    teacherName: string;
    teacherInitials: string;
    participantRole: string;
}

class Lesson {
    lessonId: string;
    lessonStatus: string;
    participants: LessonParticipant[];
    hasRelevantNote: boolean;
}

class AulaCalendarEvent {
    creatorInstProfileId: number | null;
    creatorProfileId: number | null;
    creatorName: string | null;
    invitedGroups: InvitedGroup[];
    primaryResource: any | null;
    hasAttachments: boolean;
    createdDateTime: string;
    lesson: Lesson | null;
    timeSlot: TimeSlot | null;
    vacationChildrenCountByDates: any | null;
    belongsToProfiles: number[];
    belongsToResources: any[];
    requiresNewAnswer: boolean;
    directlyRelated: boolean;
    responseDeadline: string | null;
    responseStatus: string | null;
    id: number;
    title: string;
    allDay: boolean;
    startDateTime: string;
    endDateTime: string;
    oldEndDateTime: string | null;
    oldStartDateTime: string | null;
    oldAllDay: boolean | null;
    responseRequired: boolean;
    private: boolean;
    type: string;
    primaryResourceText: string | null;
    additionalResources: any[];
    additionalResourceText: string | null;
    repeating: any | null;
    institutionCode: string | null;
    institutionName: string | null;
    addedToInstitutionCalendar: boolean;
}

export class CalendarEventsResponse extends AulaJsonResponseDataWrapper<AulaCalendarEvent[]>{
}

export class AulaCalendarEventsSerializer {

    static fromJSON(json: string): AulaCalendarEvent[] {
        const response = JSON.parse(json);
        const responseObj = Object.assign(new CalendarEventsResponse(), response);
        return responseObj.data;
    }


}

export {
    AulaCalendarEvent,
    InvitedGroup,
    TimeSlot,
    TimeSlotItem,
    TimeSlotAnswer,
    TimeSlotIndex,
    Lesson,
    LessonParticipant
};
