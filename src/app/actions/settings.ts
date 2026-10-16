import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errors';
import { parseHourlyRates, type HourlyRates } from '@/lib/billing';

const FALLBACK: HourlyRates = { group: 8, oneToOne: 10, ijazah: 12 };

export async function getPricingRates(): Promise<HourlyRates> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'pricing_rates')
    .maybeSingle();
  if (error || !data) return FALLBACK;
  const parsed = parseHourlyRates(data.value);
  if (parsed.group <= 0 && parsed.oneToOne <= 0 && parsed.ijazah <= 0) return FALLBACK;
  return parsed;
}

export async function updatePricingRates(rates: HourlyRates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Sign in as an admin first.' };

  const { error } = await supabase.from('system_settings').upsert({
    key: 'pricing_rates',
    value: JSON.stringify(rates),
  }, { onConflict: 'key' });
  if (error) return { success: false, error: getErrorMessage(error) };
  return { success: true };
}
