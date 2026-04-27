export type GraphOnlineMeeting = {
  id: string;
  subject?: string;
  startDateTime?: string;
  endDateTime?: string;
  participants?: {
    organizer?: { identity?: { user?: { displayName?: string; id?: string } } };
    attendees?: Array<{
      identity?: {
        user?: { displayName?: string; id?: string };
      };
      upn?: string;
      email?: string;
    }>;
  };
  organizer?: { emailAddress?: { address?: string; name?: string } };
};

export type GraphListResponse<T> = {
  value: T[];
  "@odata.nextLink"?: string;
};

export type GraphTranscript = {
  id: string;
  createdDateTime?: string;
  meetingId?: string;
};

