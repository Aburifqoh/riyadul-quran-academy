-- Ilmvers — empty base tables required before 2026-10-16-01 through 07.
-- Apply on the Ilmvers Supabase project only. Creates no rows and no Hifz tables.
-- permissions defaults to {} so a new account is not granted admin rights.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.system_settings;
--   DROP TABLE IF EXISTS public.assessments;
--   DROP TABLE IF EXISTS public.feedback;
--   DROP TABLE IF EXISTS public.public_teachers;
--   DROP TABLE IF EXISTS public.community_posts;
--   DROP TABLE IF EXISTS public.resources;
--   DROP TABLE IF EXISTS public.users;

CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY,
  name text,
  email text,
  phone text,
  date text,
  role text,
  schedule jsonb,
  feedback jsonb,
  progress jsonb,
  "attendanceLog" jsonb,
  "homeworkInbox" jsonb,
  badges jsonb,
  "sharedFiles" jsonb,
  stats jsonb,
  "tuitionPlan" text,
  "updatedAt" timestamptz,
  type text,
  "assignedStudents" jsonb,
  "meetingLink" text,
  "roomID" text,
  "createdAt" timestamptz DEFAULT now(),
  inbox jsonb,
  nationality text,
  country text,
  city text,
  referral text,
  "discountAmount" numeric,
  "scheduleStatus" text,
  "pendingProfileUpdate" jsonb,
  "studentProfile" jsonb,
  "assignedResources" jsonb DEFAULT '[]'::jsonb,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL,
  url text NOT NULL,
  category text,
  description text,
  uploaded_by text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_posts (
  id text PRIMARY KEY,
  title text,
  date text,
  status text DEFAULT 'pending_approval',
  author_id uuid,
  "coverImage" text,
  "coverImageUrl" text
);

CREATE TABLE IF NOT EXISTS public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  student_name text,
  instructor_name text,
  instructor_rating integer,
  institution_rating integer,
  instructor_comments text,
  institution_comments text,
  created_at timestamptz DEFAULT now(),
  anonymous boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.public_teachers (
  id text PRIMARY KEY,
  name text,
  title text,
  specialties jsonb,
  rating numeric,
  students jsonb,
  image text,
  bio text,
  email text,
  "publicProfile" jsonb
);

CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  age text,
  goal text,
  phone text,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  scheduled_at timestamptz,
  student_timezone text,
  calendly_event_uri text,
  user_id text,
  admin_alerted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(255) UNIQUE NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

GRANT ALL ON public.users, public.resources, public.community_posts, public.feedback, public.public_teachers, public.assessments, public.system_settings TO service_role;
