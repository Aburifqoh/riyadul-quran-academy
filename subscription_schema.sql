-- ==============================================================================
-- DYNAMIC SUBSCRIPTION SCHEMA
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- Add columns to track custom tokenized billing
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS gateway_auth_token TEXT,
ADD COLUMN IF NOT EXISTS payment_gateway TEXT,      -- 'paystack' or 'flutterwave'
ADD COLUMN IF NOT EXISTS base_usd_price NUMERIC,    -- The base USD cost of their plan
ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS grace_period_until TIMESTAMPTZ; -- Tracks 1-day grace period for failures
