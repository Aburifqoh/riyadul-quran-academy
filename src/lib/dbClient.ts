import { supabase } from './supabase';
import { getSupabaseAdmin } from './supabaseAdmin';

/**
 * Browser: the signed-in anon key (RLS applies).
 * Server: service role so API/cron writes are not blocked by RLS.
 */
export function dbClient() {
  return typeof window === 'undefined' ? getSupabaseAdmin() : supabase;
}
