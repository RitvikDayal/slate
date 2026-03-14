CREATE TABLE daily_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  plan jsonb NOT NULL DEFAULT '[]',
  ai_summary text,
  status schedule_status NOT NULL DEFAULT 'draft',
  user_confirmed boolean NOT NULL DEFAULT false,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_daily_schedules_user_date ON daily_schedules(user_id, date);

ALTER TABLE daily_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules"
  ON daily_schedules FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON daily_schedules FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER daily_schedules_updated_at
  BEFORE UPDATE ON daily_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
