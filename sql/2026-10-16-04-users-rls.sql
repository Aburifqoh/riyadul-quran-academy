-- Ilmvers — replace the open users policies.
-- Run after 2026-10-16-03-permissions-activity-payments.sql.
--
-- What changes for a signed-in user:
--   * They can still read and update their own row.
--   * They can no longer change role, permissions, or billing fields.
--     The service role and admins still can. This blocks the browser
--     payment page from marking an account paid, and blocks
--     /admin-override from promoting a user while these policies are live.
--   * A parent can read rows whose "parentId" is their own id.
--   * Anonymous visitors can read id, name, role, and "publicProfile"
--     for live teachers only. Email and phone are not granted.
--
-- Safe to re-run.
--
-- ROLLBACK
-- Drops the new policies and the identity trigger, then restores the
-- previous open policies from supabase_rls.sql. Those old policies let
-- any signed-in user update their own role and payment fields.
--
--   DROP TRIGGER IF EXISTS protect_user_identity ON public.users;
--   DROP FUNCTION IF EXISTS private.protect_user_identity();
--   DROP FUNCTION IF EXISTS private.is_admin();
--   DROP FUNCTION IF EXISTS private.is_teacher();
--   DROP POLICY IF EXISTS users_select_own ON public.users;
--   DROP POLICY IF EXISTS users_select_admin ON public.users;
--   DROP POLICY IF EXISTS users_select_teacher ON public.users;
--   DROP POLICY IF EXISTS users_select_children ON public.users;
--   DROP POLICY IF EXISTS users_select_live_teachers ON public.users;
--   DROP POLICY IF EXISTS users_insert_own ON public.users;
--   DROP POLICY IF EXISTS users_insert_admin ON public.users;
--   DROP POLICY IF EXISTS users_update_own ON public.users;
--   DROP POLICY IF EXISTS users_update_admin ON public.users;
--   DROP POLICY IF EXISTS users_update_teacher_students ON public.users;
--   DROP POLICY IF EXISTS users_delete_admin ON public.users;
--   CREATE POLICY "Allow public insert to users" ON public.users FOR INSERT WITH CHECK (true);
--   CREATE POLICY "Users can read own data" ON public.users FOR SELECT USING (auth.uid()::text = id);
--   CREATE POLICY "Users can update own data" ON public.users FOR UPDATE USING (auth.uid()::text = id);
--   CREATE POLICY "Admins can do everything on users" ON public.users FOR ALL USING (
--     EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()::text AND role = 'admin')
--   );
--   GRANT SELECT ON public.users TO anon;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_teacher()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'teacher'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()::text
        AND (to_jsonb(role) #>> '{}') = 'teacher'
    );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') IN ('admin', 'super_admin')
    OR private.is_messaging_admin(COALESCE(auth.uid()::text, ''))
    OR private.has_permission('can_manage_students');
$$;

CREATE OR REPLACE FUNCTION private.protect_user_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NOT private.is_admin() THEN
    NEW.role := OLD.role;
    NEW.permissions := OLD.permissions;
    NEW."paymentVerified" := OLD."paymentVerified";
    NEW.status := OLD.status;
    NEW.scholarship := OLD.scholarship;
    NEW.gateway_auth_token := OLD.gateway_auth_token;
    NEW.payment_gateway := OLD.payment_gateway;
    NEW.base_usd_price := OLD.base_usd_price;
    NEW.next_billing_date := OLD.next_billing_date;
    NEW.grace_period_until := OLD.grace_period_until;
    NEW."lastPaymentDate" := OLD."lastPaymentDate";
    NEW.cancelled_at := OLD.cancelled_at;
    NEW."planDays" := OLD."planDays";
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_teacher() FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_teacher() TO authenticated;

DROP TRIGGER IF EXISTS protect_user_identity ON public.users;
CREATE TRIGGER protect_user_identity
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION private.protect_user_identity();

DROP POLICY IF EXISTS "Admins can do everything on users" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Allow public insert to users" ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_admin ON public.users;
DROP POLICY IF EXISTS users_select_teacher ON public.users;
DROP POLICY IF EXISTS users_select_children ON public.users;
DROP POLICY IF EXISTS users_select_live_teachers ON public.users;
DROP POLICY IF EXISTS users_insert_own ON public.users;
DROP POLICY IF EXISTS users_insert_admin ON public.users;
DROP POLICY IF EXISTS users_update_own ON public.users;
DROP POLICY IF EXISTS users_update_admin ON public.users;
DROP POLICY IF EXISTS users_update_teacher_students ON public.users;
DROP POLICY IF EXISTS users_delete_admin ON public.users;

CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid()::text);

CREATE POLICY users_select_admin ON public.users
  FOR SELECT TO authenticated
  USING (private.is_admin());

CREATE POLICY users_select_teacher ON public.users
  FOR SELECT TO authenticated
  USING (private.is_teacher());

CREATE POLICY users_select_children ON public.users
  FOR SELECT TO authenticated
  USING ("parentId" = auth.uid()::text);

CREATE POLICY users_select_live_teachers ON public.users
  FOR SELECT TO anon, authenticated
  USING (
    (to_jsonb(role) #>> '{}') = 'teacher'
    AND COALESCE("publicProfile" ->> 'isLive', 'false') IN ('true', 't')
  );

CREATE POLICY users_insert_own ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY users_insert_admin ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY users_update_admin ON public.users
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

CREATE POLICY users_update_teacher_students ON public.users
  FOR UPDATE TO authenticated
  USING (
    private.is_teacher()
    AND (to_jsonb(role) #>> '{}') IN ('student', 'parent')
  )
  WITH CHECK (
    private.is_teacher()
    AND (to_jsonb(role) #>> '{}') IN ('student', 'parent')
  );

CREATE POLICY users_delete_admin ON public.users
  FOR DELETE TO authenticated
  USING (private.is_admin());

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

REVOKE SELECT ON public.users FROM anon;
GRANT SELECT (id, name, role, "publicProfile") ON public.users TO anon;

-- Library columns the resource policies below depend on.
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS submitted_by text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS submitted_by_name text;
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin';
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS uploaded_by text;

ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS "coverImage" text;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS "coverImageUrl" text;

DO $$
BEGIN
  IF to_regclass('public.public_teachers') IS NULL THEN
    RAISE NOTICE 'public.public_teachers is missing — policies skipped';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE public.public_teachers ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS public_teachers_read ON public.public_teachers';
  EXECUTE 'DROP POLICY IF EXISTS public_teachers_admin ON public.public_teachers';
  EXECUTE $p$
    CREATE POLICY public_teachers_read ON public.public_teachers
      FOR SELECT TO anon, authenticated
      USING (true)
  $p$;
  EXECUTE $p$
    CREATE POLICY public_teachers_admin ON public.public_teachers
      FOR ALL TO authenticated
      USING (private.is_admin())
      WITH CHECK (private.is_admin())
  $p$;
END $$;

-- feedback.student_id is what src/lib/db.ts inserts.
-- Older SQL used "studentId". Use whichever column is present.
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can read their feedback" ON public.feedback;
DROP POLICY IF EXISTS "Teachers can insert feedback" ON public.feedback;
DROP POLICY IF EXISTS "Teachers can update their own feedback" ON public.feedback;
DROP POLICY IF EXISTS feedback_select ON public.feedback;
DROP POLICY IF EXISTS feedback_insert ON public.feedback;
DROP POLICY IF EXISTS feedback_update ON public.feedback;

DO $$
DECLARE
  student_col text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'student_id'
  ) THEN
    student_col := 'student_id';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feedback' AND column_name = 'studentId'
  ) THEN
    student_col := '"studentId"';
  ELSE
    RAISE NOTICE 'feedback has neither student_id nor studentId — policies skipped';
    RETURN;
  END IF;

  EXECUTE format($p$
    CREATE POLICY feedback_select ON public.feedback
      FOR SELECT TO authenticated
      USING (
        %1$s = auth.uid()::text
        OR private.is_admin()
        OR private.is_teacher()
      )
  $p$, student_col);

  EXECUTE format($p$
    CREATE POLICY feedback_insert ON public.feedback
      FOR INSERT TO authenticated
      WITH CHECK (
        %1$s = auth.uid()::text
        OR private.is_admin()
        OR private.is_teacher()
      )
  $p$, student_col);

  EXECUTE $p$
    CREATE POLICY feedback_update ON public.feedback
      FOR UPDATE TO authenticated
      USING (private.is_admin() OR private.is_teacher())
      WITH CHECK (private.is_admin() OR private.is_teacher())
  $p$;
END $$;

DROP POLICY IF EXISTS "Admins can manage resources" ON public.resources;
DROP POLICY IF EXISTS "Users can read resources" ON public.resources;
DROP POLICY IF EXISTS resources_select ON public.resources;
DROP POLICY IF EXISTS resources_write ON public.resources;

CREATE POLICY resources_select ON public.resources
  FOR SELECT TO authenticated
  USING (
    status = 'approved'
    OR status IS NULL
    OR submitted_by = auth.uid()::text
    OR uploaded_by = auth.uid()::text
    OR private.is_admin()
    OR private.is_teacher()
  );

CREATE POLICY resources_write ON public.resources
  FOR ALL TO authenticated
  USING (
    private.is_admin()
    OR private.is_teacher()
    OR submitted_by = auth.uid()::text
  )
  WITH CHECK (
    private.is_admin()
    OR private.is_teacher()
    OR submitted_by = auth.uid()::text
  );

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
