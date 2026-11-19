-- Ilmvers — additive user columns the portal already reads and writes.
-- Apply on the Ilmvers Supabase project only. Do not run this on any other project.
-- Assumes public.users already exists. This file does not create that table.
-- Safe to re-run. No columns are dropped or retyped.
--
-- Apply order: 01, 02, 03, 04, 05, 06, 07.
--
-- ROLLBACK
-- Dropping these columns deletes values written after this migration.
-- Do that only if this migration was just applied and those values are disposable.
-- The timezone copy and the billing-date fill cannot be undone: previously
-- empty timezones and billing dates stay filled.
--
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "preferredSchedule";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "scheduleChangeRequest";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "scheduleSelected";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "pendingAvailabilityUpdate";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "availabilityChangeRequested";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "availabilitySlots";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "availabilityLocked";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "lastAvailabilityUpdate";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS timezone;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "detectedTz";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "parentId";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS scholarship;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "lastPaymentDate";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS cancelled_at;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS permissions;
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "publicProfile";
--   ALTER TABLE public.users DROP COLUMN IF EXISTS "planDays";
--   DROP INDEX IF EXISTS public.idx_users_parent_id;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "preferredSchedule" jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "scheduleChangeRequest" jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "scheduleSelected" boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "pendingAvailabilityUpdate" jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "availabilityChangeRequested" boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "availabilitySlots" jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "availabilityLocked" boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastAvailabilityUpdate" timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "detectedTz" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "parentId" text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scholarship boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "lastPaymentDate" timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS permissions jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "publicProfile" jsonb;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "planDays" integer DEFAULT 2;

-- Columns the billing trigger in migration 04 freezes. Added only when absent
-- so a database that already has them (text or jsonb) is left unchanged.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "paymentVerified" boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gateway_auth_token text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS payment_gateway text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS base_usd_price numeric;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS next_billing_date timestamptz;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS grace_period_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_parent_id
  ON public.users ("parentId")
  WHERE "parentId" IS NOT NULL;

-- Copy timezone <-> detectedTz only where one side is blank.
-- Handles text and jsonb without changing the column type.
DO $$
DECLARE
  tz_type  text;
  dtz_type text;
  tz_read  text := 'NULLIF(btrim(to_jsonb(timezone) #>> ''{}''), '''')';
  dtz_read text := 'NULLIF(btrim(to_jsonb("detectedTz") #>> ''{}''), '''')';
  tz_write text;
  dtz_write text;
BEGIN
  SELECT data_type INTO tz_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'timezone';

  SELECT data_type INTO dtz_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'detectedTz';

  IF tz_type IS NULL OR dtz_type IS NULL THEN
    RAISE NOTICE 'timezone or detectedTz missing — backfill skipped';
    RETURN;
  END IF;

  tz_write := CASE WHEN tz_type = 'jsonb' THEN 'to_jsonb(' || dtz_read || ')' ELSE dtz_read END;
  EXECUTE 'UPDATE public.users SET timezone = ' || tz_write ||
          ' WHERE ' || tz_read || ' IS NULL AND ' || dtz_read || ' IS NOT NULL';

  dtz_write := CASE WHEN dtz_type = 'jsonb' THEN 'to_jsonb(' || tz_read || ')' ELSE tz_read END;
  EXECUTE 'UPDATE public.users SET "detectedTz" = ' || dtz_write ||
          ' WHERE ' || dtz_read || ' IS NULL AND ' || tz_read || ' IS NOT NULL';
END $$;

-- Give paid or scholarship students a billing date when they have none.
-- Does not move a date that is already set. Does not charge anyone.
UPDATE public.users
SET
  "lastPaymentDate" = COALESCE("lastPaymentDate", now()),
  next_billing_date = COALESCE(next_billing_date, now() + interval '30 days')
WHERE next_billing_date IS NULL
  AND (
    (to_jsonb("paymentVerified") #>> '{}') IN ('true', 't')
    OR (to_jsonb(status) #>> '{}') = 'active'
  )
  AND (
    gateway_auth_token IS NULL
    OR cancelled_at IS NOT NULL
    OR scholarship IS TRUE
  );

NOTIFY pgrst, 'reload schema';
