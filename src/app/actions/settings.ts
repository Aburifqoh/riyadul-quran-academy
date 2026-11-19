'use server';

import { createClient } from '@supabase/supabase-js';
import { getErrorMessage } from '@/lib/errors';
import { parseHourlyRates, type HourlyRates } from '@/lib/billing';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const FALLBACK: HourlyRates = { group: 8, oneToOne: 10, ijazah: 12 };

export async function getPricingRates(): Promise<HourlyRates> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'pricing_rates')
      .maybeSingle();
    if (error || !data) return FALLBACK;
    const parsed = parseHourlyRates(data.value);
    if (parsed.group <= 0 && parsed.oneToOne <= 0 && parsed.ijazah <= 0) return FALLBACK;
    return parsed;
  } catch {
    return FALLBACK;
  }
}

export async function updatePricingRates(rates: HourlyRates) {
  try {
    const { error } = await supabase.from('system_settings').upsert(
      {
        key: 'pricing_rates',
        value: JSON.stringify(rates),
      },
      { onConflict: 'key' }
    );
    if (error) return { success: false, error: getErrorMessage(error) };
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
