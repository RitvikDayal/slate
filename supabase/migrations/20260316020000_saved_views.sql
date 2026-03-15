CREATE TABLE saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  filters JSONB NOT NULL DEFAULT '[]',
  sort_by TEXT NOT NULL DEFAULT 'due_date:asc',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  position REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_views_user_id ON saved_views(user_id);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own views"
  ON saved_views FOR ALL USING (user_id = auth.uid());

CREATE TRIGGER set_saved_views_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
