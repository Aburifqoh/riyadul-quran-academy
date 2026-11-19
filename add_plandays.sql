-- Run this SQL in your Supabase SQL Editor to add the camelCase "planDays" column to public.users table:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "planDays" integer DEFAULT 2;
