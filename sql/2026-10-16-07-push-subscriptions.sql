-- Ilmvers — push subscription rows, so staff deletion does not fail
-- when it clears this table. Web push itself stays off until a later phase.
-- user_id is text, matching public.users.id in this app. A foreign key is
-- added only when users.id is text.
--
-- Run any time after public.users exists.
--
-- ROLLBACK
--   DROP TABLE IF EXISTS public.push_subscriptions;
--   DROP FUNCTION IF EXISTS public.update_push_subscriptions_updated_at();

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'id'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.push_subscriptions
      DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
    ALTER TABLE public.push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.update_push_subscriptions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_push_subscriptions_updated_at();

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

DROP POLICY IF EXISTS "Users manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own subscriptions"
  ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

NOTIFY pgrst, 'reload schema';
