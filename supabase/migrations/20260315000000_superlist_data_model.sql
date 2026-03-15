-- Superlist-inspired data model: lists, items, labels
-- Does NOT delete any existing tables.

-- =============================================================
-- 1. lists
-- =============================================================
CREATE TABLE lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  icon text,
  color text,
  position real NOT NULL DEFAULT 0,
  parent_list_id uuid REFERENCES lists(id) ON DELETE CASCADE,
  is_inbox boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 2. items (unified task + note entity)
-- =============================================================
CREATE TABLE items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'task' CHECK (type IN ('task', 'note', 'heading')),
  title text NOT NULL DEFAULT '',
  content_json jsonb,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  due_date date,
  due_time text,
  reminder_at timestamptz,
  recurrence_rule text,
  priority text NOT NULL DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high')),
  effort text CHECK (effort IN ('xs', 's', 'm', 'l', 'xl')),
  estimated_minutes int,
  position real NOT NULL DEFAULT 0,
  is_movable boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'slack', 'ai_suggested')),
  source_ref jsonb,
  scheduled_date date,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  ai_notes text,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 3. labels
-- =============================================================
CREATE TABLE labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================================
-- 4. item_labels junction table
-- =============================================================
CREATE TABLE item_labels (
  item_id uuid NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, label_id)
);

-- =============================================================
-- 5. Indexes
-- =============================================================
CREATE INDEX idx_lists_user ON lists(user_id);
CREATE INDEX idx_items_list ON items(list_id);
CREATE INDEX idx_items_user_date ON items(user_id, scheduled_date);
CREATE INDEX idx_items_user_completed ON items(user_id, is_completed) WHERE is_completed = false;
CREATE INDEX idx_items_parent ON items(parent_item_id);
CREATE INDEX idx_labels_user ON labels(user_id);

-- =============================================================
-- 6. Row Level Security
-- =============================================================

-- lists
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lists_select" ON lists FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "lists_insert" ON lists FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "lists_update" ON lists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "lists_delete" ON lists FOR DELETE USING (user_id = auth.uid());

-- items
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "items_select" ON items FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "items_insert" ON items FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "items_update" ON items FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "items_delete" ON items FOR DELETE USING (user_id = auth.uid());

-- labels
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "labels_select" ON labels FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "labels_insert" ON labels FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "labels_update" ON labels FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "labels_delete" ON labels FOR DELETE USING (user_id = auth.uid());

-- item_labels (ownership checked via label ownership)
ALTER TABLE item_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_labels_select" ON item_labels FOR SELECT
  USING (EXISTS (SELECT 1 FROM labels WHERE labels.id = item_labels.label_id AND labels.user_id = auth.uid()));
CREATE POLICY "item_labels_insert" ON item_labels FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM labels WHERE labels.id = item_labels.label_id AND labels.user_id = auth.uid()));
CREATE POLICY "item_labels_update" ON item_labels FOR UPDATE
  USING (EXISTS (SELECT 1 FROM labels WHERE labels.id = item_labels.label_id AND labels.user_id = auth.uid()));
CREATE POLICY "item_labels_delete" ON item_labels FOR DELETE
  USING (EXISTS (SELECT 1 FROM labels WHERE labels.id = item_labels.label_id AND labels.user_id = auth.uid()));

-- =============================================================
-- 7. Auto-create Inbox list for existing users
-- =============================================================
INSERT INTO lists (user_id, title, icon, is_inbox, position)
SELECT id, 'Inbox', '📥', true, 0 FROM profiles;

-- =============================================================
-- 8. Migrate existing tasks to items
-- =============================================================
INSERT INTO items (user_id, list_id, title, type, is_completed, completed_at,
  due_date, priority, effort, estimated_minutes, is_movable, source, source_ref,
  scheduled_date, scheduled_start, scheduled_end, ai_notes, position, created_at)
SELECT t.user_id, l.id, t.title, 'task',
  t.status = 'done', t.completed_at, t.due_date,
  COALESCE(t.priority::text, 'none'),
  t.effort::text, t.estimated_minutes, t.is_movable, t.source::text, t.source_ref,
  t.scheduled_date, t.scheduled_start, t.scheduled_end, t.ai_notes,
  ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.created_at),
  t.created_at
FROM tasks t
JOIN lists l ON l.user_id = t.user_id AND l.is_inbox = true;

-- =============================================================
-- 9. Trigger: auto-create inbox on new user signup
-- =============================================================
CREATE OR REPLACE FUNCTION create_user_inbox()
RETURNS trigger AS $$
BEGIN
  INSERT INTO lists (user_id, title, icon, is_inbox, position)
  VALUES (NEW.id, 'Inbox', '📥', true, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_inbox
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_user_inbox();
