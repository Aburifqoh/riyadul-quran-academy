-- Ilmvers — permission helper, admin activity log, payment idempotency.
-- Run after 2026-10-16-02-messaging.sql.
-- Safe to re-run. Does not delete log rows or payment rows.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.admin_activity_log;
--   DROP TABLE IF EXISTS public.processed_payments;
--   DROP FUNCTION IF EXISTS private.has_permission(text);
-- Activity rows and processed payment rows are deleted by those drops.

CREATE SCHEMA IF NOT EXISTS private;

-- Mirrors src/lib/permissions.ts. super_admin always passes.
-- An admin passes only when permissions->>key is true.
-- Stored in private so PostgREST does not expose it as an RPC.
CREATE OR REPLACE FUNCTION private.has_permission(perm text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT
      CASE
        WHEN (to_jsonb(role) #>> '{}') = 'super_admin' THEN true
        WHEN (to_jsonb(role) #>> '{}') <> 'admin' THEN false
        ELSE COALESCE((permissions ->> perm)::boolean, false)
      END
    FROM public.users
    WHERE id = auth.uid()::text
  ), false);
$$;

REVOKE ALL ON FUNCTION private.has_permission(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_permission(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.admin_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  actor_role text NOT NULL,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  summary text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_log_created
  ON public.admin_activity_log (created_at DESC);

ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_activity_log FROM anon;
GRANT SELECT, INSERT ON public.admin_activity_log TO authenticated;

DROP POLICY IF EXISTS admin_activity_select ON public.admin_activity_log;
CREATE POLICY admin_activity_select
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (private.has_permission('can_manage_students') OR private.is_messaging_admin(auth.uid()::text));

DROP POLICY IF EXISTS admin_activity_insert ON public.admin_activity_log;
CREATE POLICY admin_activity_insert
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (
    actor_id = auth.uid()::text
    AND (
      private.has_permission('can_manage_students')
      OR private.is_messaging_admin(auth.uid()::text)
    )
  );

-- Written by payment webhooks with the service role. No browser policy.
CREATE TABLE IF NOT EXISTS public.processed_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  gateway text NOT NULL,
  email text,
  amount numeric,
  processed_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.processed_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processed_payments FROM anon;
REVOKE ALL ON public.processed_payments FROM authenticated;

NOTIFY pgrst, 'reload schema';
