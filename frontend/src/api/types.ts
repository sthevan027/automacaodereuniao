export type ApiListResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
};

export type ActionItem = {
  description?: string;
  owner?: string | null;
  deadline?: string | null;
};

export type Participant = {
  name?: string;
  email?: string;
};

export type MeetingReviewPayload = {
  action: "approve" | "reject" | "update";
  reviewed_by?: string;
  company?: string | null;
  ai_summary?: string | null;
  topics?: string[];
  action_items?: ActionItem[];
};

export type MeetingListItem = {
  id: string;
  teams_meeting_id: string;
  subject: string | null;
  start_time: string | null;
  end_time: string | null;
  organizer_email: string | null;
  ai_summary: string | null;
  teams_summary?: string | null;
  action_items: ActionItem[] | null;
  topics: string[] | null;
  processed_at: string | null;
  notification_sent_at: string | null;
  status?: string | null;
  last_error?: string | null;
  failed_attempts?: number;
  created_at?: string;
  company?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
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
  status?: string | null;
  last_error?: string | null;
  failed_attempts?: number;
  company?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
};
