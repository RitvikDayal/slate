CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority task_priority NOT NULL DEFAULT 'medium',
  effort task_effort,
  estimated_minutes int,
  status task_status NOT NULL DEFAULT 'pending',
  is_movable boolean NOT NULL DEFAULT true,
  source task_source NOT NULL DEFAULT 'manual',
  source_ref jsonb,
  scheduled_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  due_date date,
  completed_at timestamptz,
  ai_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_tasks_user_date ON tasks(user_id, scheduled_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status) WHERE status != 'done';

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
