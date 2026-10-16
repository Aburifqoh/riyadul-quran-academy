import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { approveScheduleRequest, rejectScheduleRequest } from '@/lib/scheduleRequests';
import type { UnifiedScheduleRequest } from '@/types/scheduling';

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
    if (role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admin can decide schedule requests.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const action = body?.action === 'approve' ? 'approve' : body?.action === 'reject' ? 'reject' : null;
    const req = body?.request as UnifiedScheduleRequest | undefined;
    if (!action || !req?.id || !req.userId || !req.type) {
      return NextResponse.json({ error: 'Invalid schedule request payload.' }, { status: 400 });
    }

    const slotIndex = typeof body?.slotIndex === 'number' ? body.slotIndex : undefined;

    if (action === 'reject') {
      const note = typeof body?.rejectionNote === 'string' ? body.rejectionNote.trim() : '';
      const result = await rejectScheduleRequest(req, user.id, role, note, slotIndex);
      if (!result.success) {
        return NextResponse.json({ error: result.error || 'Rejection failed.' }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }

    const result = await approveScheduleRequest(req, {
      actorId: user.id,
      actorRole: role,
      teacherId: typeof body?.teacherId === 'string' ? body.teacherId : undefined,
      assignDay: typeof body?.assignDay === 'string' ? body.assignDay : undefined,
      assignTime: typeof body?.assignTime === 'string' ? body.assignTime : undefined,
      acknowledgeOrphans: Boolean(body?.acknowledgeOrphans),
      slotIndex,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Approval failed.' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('schedule-requests decide error:', error);
    return NextResponse.json({ error: 'Failed to process schedule request.' }, { status: 500 });
  }
}
