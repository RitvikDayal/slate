CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  tasks_completed int NOT NULL DEFAULT 0,
  tasks_pending int NOT NULL DEFAULT 0,
  tasks_cancelled int NOT NULL DEFAULT 0,
  total_focus_minutes int NOT NULL DEFAULT 0,
  ai_summary text,
  highlights jsonb DEFAULT '[]',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_daily_reports_user_date ON daily_reports(user_id, date);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON daily_reports FOR SELECT USING (auth.uid() = user_id);
