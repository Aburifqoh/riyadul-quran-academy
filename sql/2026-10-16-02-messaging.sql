-- Ilmvers — messaging tables, assignment checks, and indexes.
-- Run after 2026-10-16-01-user-columns.sql.
-- Does not delete messages. Replaces the open insert policy with an
-- assignment check. Safe to re-run.
--
-- Hifz tables are intentionally absent.
--
-- ROLLBACK
-- Restores the open insert policy and drops the safeguarding tables.
-- Flag, block, and assignment rows created after this migration are deleted.
-- Message rows stay. student_context_id and filtered values are dropped.
--
--   DROP POLICY IF EXISTS "Users can insert allowed messages" ON public.messages;
--   CREATE POLICY "Users can insert messages" ON public.messages
--     FOR INSERT TO authenticated
--     WITH CHECK (auth.uid()::text = sender_id);
--   DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
--   CREATE POLICY "Users can mark messages as read" ON public.messages
--     FOR UPDATE TO authenticated
--     USING (auth.uid()::text = receiver_id)
--     WITH CHECK (auth.uid()::text = receiver_id);
--   DROP TABLE IF EXISTS public.message_flags;
--   DROP TABLE IF EXISTS public.message_blocks;
--   DROP TABLE IF EXISTS public.messaging_assignments;
--   ALTER TABLE public.messages DROP COLUMN IF EXISTS student_context_id;
--   ALTER TABLE public.messages DROP COLUMN IF EXISTS filtered;
--   DROP FUNCTION IF EXISTS public.purge_old_messages(int);
--   DROP FUNCTION IF EXISTS public.sync_messaging_assignments();
--   DROP FUNCTION IF EXISTS private.can_users_message(text, text, text);
--   DROP FUNCTION IF EXISTS private.is_parent_of(text, text);
--   DROP FUNCTION IF EXISTS private.has_active_assignment(text, text);
--   DROP FUNCTION IF EXISTS private.is_messaging_admin(text);

CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id text NOT NULL,
  receiver_id text NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS student_context_id text;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS filtered boolean DEFAULT false;

CREATE TABLE IF NOT EXISTS public.messaging_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id text NOT NULL,
  teacher_id text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  assigned_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  ended_at timestamptz,
  ended_reason text,
  UNIQUE (student_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_messaging_assignments_active
  ON public.messaging_assignments (student_id, teacher_id)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS public.message_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  reporter_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'reviewed', 'dismissed', 'action_taken')),
  reviewed_by text,
  reviewed_at timestamptz,
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_message_flags_status ON public.message_flags (status);

CREATE TABLE IF NOT EXISTS public.message_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  reason text,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending_review', 'active', 'lifted')),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_sender_created
  ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_created
  ON public.messages (receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_created_at
  ON public.messages (created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread
  ON public.messages (receiver_id) WHERE read = false;

CREATE OR REPLACE FUNCTION private.is_messaging_admin(uid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = uid
      AND (to_jsonb(role) #>> '{}') IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION private.has_active_assignment(p_student text, p_teacher text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messaging_assignments
    WHERE student_id = p_student
      AND teacher_id = p_teacher
      AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_parent_of(p_parent text, p_student text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users child
    WHERE child.id = p_student
      AND child."parentId" = p_parent
  );
$$;

CREATE OR REPLACE FUNCTION private.can_users_message(
  p_sender text,
  p_receiver text,
  p_student_context text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s_role text;
  r_role text;
BEGIN
  IF private.is_messaging_admin(p_sender) OR private.is_messaging_admin(p_receiver) THEN
    RETURN true;
  END IF;

  IF p_receiver = 'admin' OR p_sender = 'admin' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.message_blocks
    WHERE status = 'active'
      AND (
        (blocker_id = p_sender AND blocked_id = p_receiver)
        OR (blocker_id = p_receiver AND blocked_id = p_sender)
      )
  ) THEN
    RETURN false;
  END IF;

  SELECT to_jsonb(role) #>> '{}' INTO s_role FROM public.users WHERE id = p_sender;
  SELECT to_jsonb(role) #>> '{}' INTO r_role FROM public.users WHERE id = p_receiver;

  IF s_role = 'teacher' AND r_role IN ('student', 'parent') THEN
    IF r_role = 'student' THEN
      RETURN private.has_active_assignment(p_receiver, p_sender);
    END IF;
    IF p_student_context IS NOT NULL AND private.is_parent_of(p_sender, p_student_context) THEN
      RETURN private.has_active_assignment(p_student_context, p_receiver);
    END IF;
    RETURN false;
  END IF;

  IF s_role IN ('student', 'parent') AND r_role = 'teacher' THEN
    IF s_role = 'student' THEN
      RETURN private.has_active_assignment(p_sender, p_receiver);
    END IF;
    IF p_student_context IS NOT NULL AND private.is_parent_of(p_sender, p_student_context) THEN
      RETURN private.has_active_assignment(p_student_context, p_receiver);
    END IF;
    RETURN false;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION private.is_messaging_admin(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_active_assignment(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_parent_of(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_users_message(text, text, text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_messaging_admin(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_active_assignment(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_parent_of(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_users_message(text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.purge_old_messages(months int DEFAULT 12)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted int;
BEGIN
  IF months IS NULL OR months < 1 THEN
    RAISE EXCEPTION 'months must be >= 1 (got %)', months;
  END IF;

  DELETE FROM public.messages
  WHERE created_at < timezone('utc'::text, now()) - (months || ' months')::interval;

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_messaging_assignments()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  synced int;
BEGIN
  INSERT INTO public.messaging_assignments (student_id, teacher_id, active, assigned_at)
  SELECT DISTINCT u.id, (slot->>'teacherId'), true, timezone('utc'::text, now())
  FROM public.users u
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN u.schedule IS NULL THEN '[]'::jsonb
      WHEN jsonb_typeof(u.schedule::jsonb) = 'array' THEN u.schedule::jsonb
      ELSE '[]'::jsonb
    END
  ) AS slot
  WHERE (to_jsonb(u.role) #>> '{}') IN ('student', 'parent')
    AND COALESCE(slot->>'teacherId', '') <> ''
  ON CONFLICT (student_id, teacher_id) DO UPDATE
    SET active = true, ended_at = NULL, ended_reason = NULL;

  GET DIAGNOSTICS synced = ROW_COUNT;
  RETURN synced;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_old_messages(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.purge_old_messages(int) FROM anon;
REVOKE ALL ON FUNCTION public.purge_old_messages(int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.purge_old_messages(int) TO service_role;

REVOKE ALL ON FUNCTION public.sync_messaging_assignments() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_messaging_assignments() FROM anon;
REVOKE ALL ON FUNCTION public.sync_messaging_assignments() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_messaging_assignments() TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messaging_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_blocks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.messaging_assignments FROM anon;
REVOKE ALL ON public.message_flags FROM anon;
REVOKE ALL ON public.message_blocks FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messaging_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.message_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.message_blocks TO authenticated;

DROP POLICY IF EXISTS "Users can read their own messages or broadcasts" ON public.messages;
CREATE POLICY "Users can read their own messages or broadcasts"
  ON public.messages FOR SELECT TO authenticated
  USING (
    auth.uid()::text = sender_id
    OR auth.uid()::text = receiver_id
    OR receiver_id = 'all_users'
    OR (
      receiver_id = 'all_students'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()::text
          AND (to_jsonb(role) #>> '{}') = 'student'
      )
    )
    OR (
      receiver_id = 'all_teachers'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()::text
          AND (to_jsonb(role) #>> '{}') = 'teacher'
      )
    )
    OR private.is_messaging_admin(auth.uid()::text)
  );

DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert allowed messages" ON public.messages;
CREATE POLICY "Users can insert allowed messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid()::text = sender_id
    AND private.can_users_message(sender_id, receiver_id, student_context_id)
  );

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
CREATE POLICY "Users can mark messages as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    auth.uid()::text = receiver_id
    OR (
      receiver_id = 'admin'
      AND private.is_messaging_admin(auth.uid()::text)
    )
    OR receiver_id = 'all_users'
    OR (
      receiver_id = 'all_students'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()::text
          AND (to_jsonb(role) #>> '{}') = 'student'
      )
    )
    OR (
      receiver_id = 'all_teachers'
      AND EXISTS (
        SELECT 1 FROM public.users
        WHERE id = auth.uid()::text
          AND (to_jsonb(role) #>> '{}') = 'teacher'
      )
    )
  )
  WITH CHECK (
    auth.uid()::text = receiver_id
    OR receiver_id IN ('admin', 'all_users', 'all_students', 'all_teachers')
    OR private.is_messaging_admin(auth.uid()::text)
  );

DROP POLICY IF EXISTS "Admins manage assignments" ON public.messaging_assignments;
CREATE POLICY "Admins manage assignments"
  ON public.messaging_assignments FOR ALL TO authenticated
  USING (private.is_messaging_admin(auth.uid()::text))
  WITH CHECK (private.is_messaging_admin(auth.uid()::text));

DROP POLICY IF EXISTS "Users read own assignments" ON public.messaging_assignments;
CREATE POLICY "Users read own assignments"
  ON public.messaging_assignments FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()::text
    OR teacher_id = auth.uid()::text
    OR private.is_messaging_admin(auth.uid()::text)
    OR EXISTS (
      SELECT 1 FROM public.users child
      WHERE child."parentId" = auth.uid()::text
        AND child.id = messaging_assignments.student_id
    )
  );

DROP POLICY IF EXISTS "Users can flag messages they can see" ON public.message_flags;
CREATE POLICY "Users can flag messages they can see"
  ON public.message_flags FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own flags, admins read all" ON public.message_flags;
CREATE POLICY "Users read own flags, admins read all"
  ON public.message_flags FOR SELECT TO authenticated
  USING (
    reporter_id = auth.uid()::text
    OR private.is_messaging_admin(auth.uid()::text)
  );

DROP POLICY IF EXISTS "Admins update flags" ON public.message_flags;
CREATE POLICY "Admins update flags"
  ON public.message_flags FOR UPDATE TO authenticated
  USING (private.is_messaging_admin(auth.uid()::text))
  WITH CHECK (private.is_messaging_admin(auth.uid()::text));

DROP POLICY IF EXISTS "Users can block others" ON public.message_blocks;
CREATE POLICY "Users can block others"
  ON public.message_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid()::text);

DROP POLICY IF EXISTS "Users read own blocks, admins read all" ON public.message_blocks;
CREATE POLICY "Users read own blocks, admins read all"
  ON public.message_blocks FOR SELECT TO authenticated
  USING (
    blocker_id = auth.uid()::text
    OR blocked_id = auth.uid()::text
    OR private.is_messaging_admin(auth.uid()::text)
  );

DROP POLICY IF EXISTS "Admins update blocks" ON public.message_blocks;
CREATE POLICY "Admins update blocks"
  ON public.message_blocks FOR UPDATE TO authenticated
  USING (private.is_messaging_admin(auth.uid()::text))
  WITH CHECK (private.is_messaging_admin(auth.uid()::text));

-- One-time fill from schedules already stored on users. A bad schedule value
-- is reported and skipped so the policies above still apply.
DO $$
BEGIN
  PERFORM public.sync_messaging_assignments();
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'assignment backfill skipped: %', SQLERRM;
END $$;
