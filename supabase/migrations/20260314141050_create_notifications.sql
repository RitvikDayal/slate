CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  ref_type notification_ref_type NOT NULL,
  ref_id uuid,
  scheduled_for timestamptz NOT NULL,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for worker polling
CREATE INDEX idx_notifications_pending ON notifications(scheduled_for)
  WHERE sent_at IS NULL;

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);
