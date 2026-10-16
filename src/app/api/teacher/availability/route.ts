import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { saveTeacherAvailability, requestTeacherAvailabilityChange } from '@/lib/db';
import type { ScheduleSlot } from '@/types/content';

const DAYS = new Set(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;
const MAX_SLOTS = 7 * 48;

function normalizeSlots(raw: unknown): ScheduleSlot[] | null {
  if (!Array.isArray(raw) || raw.length > MAX_SLOTS) return null;
  const slots: ScheduleSlot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null;
    const rec = item as Record<string, unknown>;
    const day = String(rec.day || '');
    const time = String(rec.time || '');
    if (!DAYS.has(day) || !TIME_RE.test(time)) return null;
    slots.push({
      day,
      time: time.slice(0, 5),
      isBooked: false,
    });
  }
  return slots;
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: raw } = await admin.from('users').select('id, role').eq('id', user.id).single();
    const role = getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role);
    if (role !== 'teacher' && role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({ error: 'Only teachers can update availability.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action === 'request' ? 'request' : 'save';
    const timezone = typeof body?.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim()
      : 'UTC';
    const slots = normalizeSlots(body?.slots);
    if (!slots) {
      return NextResponse.json({ error: 'Invalid availability slots.' }, { status: 400 });
    }
    if (slots.length === 0) {
      return NextResponse.json({ error: 'Add at least one working window before saving.' }, { status: 400 });
    }

    const result = action === 'request'
      ? await requestTeacherAvailabilityChange(user.id, slots, timezone, admin)
      : await saveTeacherAvailability(user.id, slots, timezone, admin);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Save failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('teacher availability error:', error);
    return NextResponse.json({ error: 'Failed to save availability.' }, { status: 500 });
  }
}
