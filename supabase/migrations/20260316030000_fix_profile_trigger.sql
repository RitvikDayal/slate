-- Fix: Recreate handle_new_user with explicit RLS bypass
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Also fix create_user_inbox
CREATE OR REPLACE FUNCTION create_user_inbox()
RETURNS trigger AS $$
BEGIN
  INSERT INTO lists (user_id, title, icon, is_inbox, position)
  VALUES (NEW.id, 'Inbox', '📥', true, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure the function owner (postgres/supabase_admin) can bypass RLS
-- This is the real fix — grant the trigger function role ability to insert
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

ALTER TABLE lists FORCE ROW LEVEL SECURITY;
CREATE POLICY "Service role can insert lists"
  ON lists FOR INSERT
  TO service_role
  WITH CHECK (true);
