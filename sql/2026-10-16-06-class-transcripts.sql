-- Ilmvers — live-class transcript lines.
-- Run after 2026-10-16-04-users-rls.sql (private.is_admin).
-- Replaces the unused attendance_logs idea. Does not drop attendance_logs
-- if that table already exists.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.class_transcripts;
-- Transcript lines stored after this migration are deleted.

CREATE TABLE IF NOT EXISTS public.class_transcripts (
  id text PRIMARY KEY,
  room_name text NOT NULL,
  user_id text NOT NULL,
  speaker_role text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT class_transcripts_body_len CHECK (char_length(body) BETWEEN 1 AND 4000),
  CONSTRAINT class_transcripts_role_len CHECK (char_length(speaker_role) BETWEEN 1 AND 32),
  CONSTRAINT class_transcripts_room_len CHECK (char_length(room_name) BETWEEN 1 AND 200)
);

CREATE INDEX IF NOT EXISTS class_transcripts_room_created_idx
  ON public.class_transcripts (room_name, created_at);

ALTER TABLE public.class_transcripts ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.class_transcripts FROM anon;
GRANT SELECT, INSERT ON public.class_transcripts TO authenticated;

DROP POLICY IF EXISTS class_transcripts_insert_own ON public.class_transcripts;
CREATE POLICY class_transcripts_insert_own ON public.class_transcripts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS class_transcripts_select_own ON public.class_transcripts;
CREATE POLICY class_transcripts_select_own ON public.class_transcripts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS class_transcripts_select_admin ON public.class_transcripts;
CREATE POLICY class_transcripts_select_admin ON public.class_transcripts
  FOR SELECT TO authenticated
  USING (private.is_admin());

NOTIFY pgrst, 'reload schema';
