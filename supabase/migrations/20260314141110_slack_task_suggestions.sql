-- Slack task suggestion status enum
CREATE TYPE slack_suggestion_status AS ENUM ('pending', 'accepted', 'dismissed');

-- Slack task suggestions table
CREATE TABLE slack_task_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  message_ts TEXT NOT NULL,
  message_text TEXT NOT NULL,
  suggested_title TEXT NOT NULL,
  suggested_priority task_priority NOT NULL DEFAULT 'medium',
  suggested_effort task_effort,
  confidence REAL NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT NOT NULL DEFAULT '',
  status slack_suggestion_status NOT NULL DEFAULT 'pending',
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_slack_suggestions_user_status ON slack_task_suggestions(user_id, status);
CREATE INDEX idx_slack_suggestions_user_created ON slack_task_suggestions(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_slack_suggestions_unique_msg ON slack_task_suggestions(user_id, channel_id, message_ts);

-- RLS
ALTER TABLE slack_task_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own suggestions"
  ON slack_task_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own suggestions"
  ON slack_task_suggestions FOR UPDATE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_slack_suggestions_updated_at
  BEFORE UPDATE ON slack_task_suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
