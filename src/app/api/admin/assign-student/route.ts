import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { parseUserRecord } from '@/lib/userDataHelpers';
import { hasPermission } from '@/lib/permissions';
import { adminAssignStudentToTeacher, adminRemoveStudentSlot } from '@/lib/db';

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
    const { data: raw } = await admin.from('users').select('id, role, permissions').eq('id', user.id).single();
    if (!hasPermission(parseUserRecord((raw || {}) as Record<string, unknown>), 'can_manage_students')) {
      return NextResponse.json({ error: 'You do not have permission to assign students.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const studentId = typeof body?.studentId === 'string' ? body.studentId : '';
    const teacherId = typeof body?.teacherId === 'string' ? body.teacherId : '';
    const day = typeof body?.day === 'string' ? body.day : '';
    const time = typeof body?.time === 'string' ? body.time : '';
    const timezone = typeof body?.timezone === 'string' && body.timezone.trim()
      ? body.timezone.trim()
      : 'UTC';
    const action = body?.action === 'remove' ? 'remove' : 'assign';

    if (!studentId || !day || !time || (action === 'assign' && !teacherId)) {
      return NextResponse.json({ error: 'Student, day, and time are required.' }, { status: 400 });
    }

    const result = action === 'remove'
      ? await adminRemoveStudentSlot(studentId, day, time, teacherId || undefined)
      : await adminAssignStudentToTeacher(studentId, teacherId, day, time, timezone);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Assignment failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('assign-student error:', error);
    return NextResponse.json({ error: 'Failed to assign student.' }, { status: 500 });
  }
}
