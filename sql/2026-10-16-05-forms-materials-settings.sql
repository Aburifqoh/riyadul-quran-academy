-- Ilmvers — assessments, contact, newsletter, library bucket, settings read.
-- Run after 2026-10-16-04-users-rls.sql.
-- The public assessment form still inserts from the browser, so anon INSERT
-- on assessments stays. Contact and newsletter do not: those writes belong
-- on server routes. Until those routes exist, browser inserts into
-- contact_messages and newsletter_subscribers are rejected.
--
-- Does not seed a Hifz setting.
--
-- ROLLBACK
--   DROP POLICY IF EXISTS assessments_insert_public ON public.assessments;
--   DROP POLICY IF EXISTS assessments_select_admin ON public.assessments;
--   DROP POLICY IF EXISTS assessments_update_admin ON public.assessments;
--   DROP POLICY IF EXISTS contact_messages_select_admin ON public.contact_messages;
--   DROP POLICY IF EXISTS contact_messages_update_admin ON public.contact_messages;
--   DROP POLICY IF EXISTS newsletter_select_admin ON public.newsletter_subscribers;
--   DROP TABLE IF EXISTS public.contact_messages;
--   DROP TABLE IF EXISTS public.newsletter_subscribers;
--   DROP POLICY IF EXISTS "Public read materials" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'materials' AND NOT EXISTS (
--     SELECT 1 FROM storage.objects WHERE bucket_id = 'materials'
--   );
--   DROP POLICY IF EXISTS system_settings_select_authenticated ON public.system_settings;
--   CREATE POLICY "Anyone can read system_settings" ON public.system_settings
--     FOR SELECT USING (true);
--   GRANT SELECT ON public.system_settings TO anon;

ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS nationality text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS referral text,
  ADD COLUMN IF NOT EXISTS timestamp timestamptz DEFAULT now();

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.assessments FROM anon;
REVOKE ALL ON public.assessments FROM authenticated;
GRANT INSERT ON public.assessments TO anon, authenticated;
GRANT SELECT, UPDATE ON public.assessments TO authenticated;

DROP POLICY IF EXISTS "Admins can do everything on assessments" ON public.assessments;
DROP POLICY IF EXISTS "Allow public insert to assessments" ON public.assessments;
DROP POLICY IF EXISTS "Users can read own assessments" ON public.assessments;
DROP POLICY IF EXISTS assessments_insert ON public.assessments;
DROP POLICY IF EXISTS assessments_select ON public.assessments;
DROP POLICY IF EXISTS assessments_update ON public.assessments;
DROP POLICY IF EXISTS assessments_insert_public ON public.assessments;
DROP POLICY IF EXISTS assessments_select_admin ON public.assessments;
DROP POLICY IF EXISTS assessments_update_admin ON public.assessments;

CREATE POLICY assessments_insert_public ON public.assessments
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY assessments_select_admin ON public.assessments
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY assessments_update_admin ON public.assessments
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'unread',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_messages FROM anon;
REVOKE ALL ON public.newsletter_subscribers FROM anon;
GRANT SELECT, UPDATE ON public.contact_messages TO authenticated;
GRANT SELECT ON public.newsletter_subscribers TO authenticated;

DROP POLICY IF EXISTS "Allow public insert to contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow admins to select contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Allow admins to update contact_messages" ON public.contact_messages;
DROP POLICY IF EXISTS contact_messages_select_admin ON public.contact_messages;
DROP POLICY IF EXISTS contact_messages_update_admin ON public.contact_messages;

CREATE POLICY contact_messages_select_admin ON public.contact_messages
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY contact_messages_update_admin ON public.contact_messages
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Allow public insert to newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Allow admins to select newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS newsletter_select_admin ON public.newsletter_subscribers;

CREATE POLICY newsletter_select_admin ON public.newsletter_subscribers
  FOR SELECT TO authenticated
  USING (private.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read materials" ON storage.objects;
CREATE POLICY "Public read materials"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'materials');

-- Uploads go through the service role in a later phase. Authenticated users
-- can read objects they need to replace only when that route exists.
-- SELECT is enough for public read of this bucket.

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS system_settings_select_authenticated ON public.system_settings;

REVOKE ALL ON public.system_settings FROM anon;
GRANT SELECT ON public.system_settings TO authenticated;

CREATE POLICY system_settings_select_authenticated ON public.system_settings
  FOR SELECT TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
