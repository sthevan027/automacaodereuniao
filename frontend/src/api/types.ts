export type ApiListResponse<T> = {
  page: number;
  limit: number;
  total: number;
  rows: T[];
};

export type ActionItem = {
  description?: string;
  owner?: string;
  deadline?: string;
};

export type Participant = {
  name?: string;
  email?: string;
};

export type MeetingListItem = {
  id: string;
  teams_meeting_id: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_email: string | null;
  ai_summary: string | null;
  action_items: ActionItem[] | null;
  topics: string[] | null;
  processed_at: string | null;
  notification_sent_at: string | null;
  created_at?: string;
};

export type MeetingDetail = {
  id: string;
  teams_meeting_id: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_email: string | null;
  participants: Participant[] | null;
  transcript: string | null;
  teams_summary: string | null;
  ai_summary: string | null;
  action_items: ActionItem[] | null;
  topics: string[] | null;
  created_at?: string;
  processed_at: string | null;
  notification_sent_at: string | null;
};

