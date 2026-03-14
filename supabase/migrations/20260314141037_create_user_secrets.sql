CREATE TABLE user_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  google_refresh_token text,
  google_access_token text,
  google_token_expires_at timestamptz,
  slack_bot_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS enabled but NO SELECT/UPDATE policies for anon/authenticated roles
-- Only accessible via service_role key (server-side)
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER user_secrets_updated_at
  BEFORE UPDATE ON user_secrets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
