import type { JsonValue } from '@/types/json';
import { supabase } from './supabase';

const ASSESSMENT_COLUMNS = [
  'name', 'age', 'email', 'phone', 'level', 'goal',
  'nationality', 'country', 'city', 'referral',
] as const;

export async function bookAssessment(data: Record<string, JsonValue>) {
  const row: Record<string, JsonValue> = {
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
  for (const key of ASSESSMENT_COLUMNS) {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') row[key] = value;
  }

  // Insert only — no .select(). Public/anon can INSERT under RLS, but SELECT
  // is admin-only, so returning the row would fail with "permission denied".
  const { error } = await supabase.from('assessments').insert(row);
  if (error) {
    console.error('Error booking assessment:', error.message);
    throw new Error(error.message || 'Could not save your assessment details.');
  }

  // Resend cannot run in the browser — notify via the server route.
  try {
    await fetch('/api/assessment-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (notifyError) {
    console.error('Assessment notify failed:', notifyError);
  }
}
