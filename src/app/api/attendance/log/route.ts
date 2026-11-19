import { getErrorMessage } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { updateAttendance } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
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

    const body = await req.json().catch(() => ({}));
    const subject = typeof body.subject === 'string' ? body.subject : 'Live Class';
    const tick = body.tick !== false;
    const success = await updateAttendance(user.id, 'Auto', subject, tick);
    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  } catch (err: unknown) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}
