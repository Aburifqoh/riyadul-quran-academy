import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getCallerPermissions, hasPermission } from '@/lib/permissions';
import { sendTeacherFollowUp } from '@/lib/email';
import { getErrorMessage } from '@/lib/errors';

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

    const caller = await getCallerPermissions(getSupabaseAdmin(), user.id);
    if (!hasPermission(caller, 'can_manage_live_classes')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => null) as {
      teacherEmail?: string;
      teacherName?: string;
      followUp?: string;
    } | null;
    const teacherEmail = typeof body?.teacherEmail === 'string' ? body.teacherEmail.trim() : '';
    const teacherName = typeof body?.teacherName === 'string' ? body.teacherName.trim() : '';
    const followUp = typeof body?.followUp === 'string' ? body.followUp.trim() : '';
    if (!teacherEmail.includes('@') || !followUp) {
      return NextResponse.json({ error: 'Teacher email and a follow-up note are required.' }, { status: 400 });
    }

    const mailed = await sendTeacherFollowUp(teacherEmail, teacherName, followUp);
    if (!mailed) {
      return NextResponse.json({ error: 'The follow-up could not be emailed.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error('class-follow-up:', getErrorMessage(error) || error);
    return NextResponse.json({ error: 'Could not send the follow-up.' }, { status: 500 });
  }
}
