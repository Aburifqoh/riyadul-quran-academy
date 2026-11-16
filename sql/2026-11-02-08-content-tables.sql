-- Ilmvers — remaining content tables the app reads and writes.
-- Run after 2026-10-16-07-push-subscriptions.sql, on the Ilmvers project only.
-- Additive and safe to re-run. No Hifz tables. No seed rows.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.gallery_photos;
--   DROP TABLE IF EXISTS public.testimonials;
--   DROP TABLE IF EXISTS public.certificates;
--   DROP TABLE IF EXISTS public.system_config;
--   DROP TABLE IF EXISTS public.attendance_logs;
--   ALTER TABLE public.community_posts ALTER COLUMN id DROP DEFAULT;
--   DELETE FROM storage.buckets WHERE id = 'gallery'
--     AND NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'gallery');

-- community_posts.id had no default, so inserts without an id failed.
ALTER TABLE public.community_posts
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS community_posts_public_read ON public.community_posts;
DROP POLICY IF EXISTS community_posts_owner_read ON public.community_posts;
DROP POLICY IF EXISTS community_posts_admin_read ON public.community_posts;
DROP POLICY IF EXISTS community_posts_insert ON public.community_posts;
DROP POLICY IF EXISTS community_posts_admin_write ON public.community_posts;

CREATE POLICY community_posts_public_read ON public.community_posts
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY community_posts_admin_read ON public.community_posts
  FOR SELECT TO authenticated
  USING (private.is_admin() OR author_id::text = auth.uid()::text);

CREATE POLICY community_posts_insert ON public.community_posts
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin() OR private.is_teacher());

CREATE POLICY community_posts_admin_write ON public.community_posts
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

GRANT SELECT ON public.community_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;

-- Gallery ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  caption text,
  event_tag text NOT NULL DEFAULT 'Other',
  uploaded_by text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by text,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gallery_photos_status_idx ON public.gallery_photos (status);
CREATE INDEX IF NOT EXISTS gallery_photos_created_idx ON public.gallery_photos (created_at DESC);

ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.gallery_photos FROM anon;
GRANT SELECT ON public.gallery_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;

DROP POLICY IF EXISTS gallery_public_read ON public.gallery_photos;
DROP POLICY IF EXISTS gallery_admin_read ON public.gallery_photos;
DROP POLICY IF EXISTS gallery_admin_write ON public.gallery_photos;

CREATE POLICY gallery_public_read ON public.gallery_photos
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY gallery_admin_read ON public.gallery_photos
  FOR SELECT TO authenticated
  USING (private.is_admin() OR uploaded_by = auth.uid()::text);

CREATE POLICY gallery_admin_write ON public.gallery_photos
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read gallery" ON storage.objects;
CREATE POLICY "Public read gallery"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'gallery');

-- Testimonials -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  location text,
  content text,
  rating integer,
  user_id text,
  type text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.testimonials FROM anon;
GRANT SELECT, INSERT ON public.testimonials TO anon, authenticated;
GRANT UPDATE, DELETE ON public.testimonials TO authenticated;

DROP POLICY IF EXISTS testimonials_public_read ON public.testimonials;
DROP POLICY IF EXISTS testimonials_insert ON public.testimonials;
DROP POLICY IF EXISTS testimonials_admin_write ON public.testimonials;

CREATE POLICY testimonials_public_read ON public.testimonials
  FOR SELECT TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY testimonials_insert ON public.testimonials
  FOR INSERT TO anon, authenticated
  WITH CHECK (status = 'pending' OR status IS NULL);

CREATE POLICY testimonials_admin_write ON public.testimonials
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Certificates -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.certificates (
  id text PRIMARY KEY,
  "studentName" text,
  subject text,
  "teacherName" text,
  "requestDate" timestamptz DEFAULT now(),
  status text DEFAULT 'issued',
  student_id text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.certificates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.certificates TO authenticated;

DROP POLICY IF EXISTS certificates_public_read ON public.certificates;
DROP POLICY IF EXISTS certificates_admin_write ON public.certificates;

-- Certificates are meant to be verifiable by anyone holding the credential ID.
CREATE POLICY certificates_public_read ON public.certificates
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY certificates_admin_write ON public.certificates
  FOR ALL TO authenticated
  USING (private.is_admin() OR private.is_teacher())
  WITH CHECK (private.is_admin() OR private.is_teacher());

-- Site metrics (optional; getSiteMetrics falls back when absent) ----------
CREATE TABLE IF NOT EXISTS public.system_config (
  id text PRIMARY KEY,
  "hoursTaught" integer,
  "countriesReached" integer,
  "numStudents" integer,
  "numInstructors" integer,
  "qiraaatStudents" integer,
  "yearsOperation" integer,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.system_config TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_config TO authenticated;

DROP POLICY IF EXISTS system_config_public_read ON public.system_config;
DROP POLICY IF EXISTS system_config_admin_write ON public.system_config;

CREATE POLICY system_config_public_read ON public.system_config
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY system_config_admin_write ON public.system_config
  FOR ALL TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- Attendance audit log ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id text PRIMARY KEY,
  name text,
  email text,
  role text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.attendance_logs FROM anon;
GRANT SELECT, INSERT ON public.attendance_logs TO authenticated;

DROP POLICY IF EXISTS attendance_logs_insert ON public.attendance_logs;
DROP POLICY IF EXISTS attendance_logs_admin_read ON public.attendance_logs;

CREATE POLICY attendance_logs_insert ON public.attendance_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY attendance_logs_admin_read ON public.attendance_logs
  FOR SELECT TO authenticated
  USING (private.is_admin());

NOTIFY pgrst, 'reload schema';
