BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teams_meeting_id VARCHAR UNIQUE NOT NULL,
  subject VARCHAR,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  organizer_email VARCHAR,
  participants JSONB,
  transcript TEXT,
  teams_summary TEXT,
  ai_summary TEXT,
  action_items JSONB,
  topics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_meetings_start_time ON meetings (start_time DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_subject ON meetings (subject);

COMMIT;

