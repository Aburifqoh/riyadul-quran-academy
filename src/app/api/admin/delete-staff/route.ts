import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { logActivity } from '@/lib/activityLog';

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
    if (getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role) !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admin can delete accounts.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const targetId = typeof body?.userId === 'string' ? body.userId : '';
    if (!targetId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 });
    }
    if (targetId === user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
    }

    const { data: targetRaw } = await admin.from('users').select('id, role, name').eq('id', targetId).single();
    const targetRole = getUserRole(parseUserRecord((targetRaw || {}) as Record<string, unknown>).role);
    if (targetRole === 'super_admin' || !targetRole) {
      return NextResponse.json({ error: 'This account cannot be deleted.' }, { status: 400 });
    }
    if (!['admin', 'teacher', 'student', 'parent'].includes(targetRole)) {
      return NextResponse.json({ error: 'This account cannot be deleted.' }, { status: 400 });
    }

    const targetName = String(parseUserRecord((targetRaw || {}) as Record<string, unknown>).name || targetId);

    await admin.from('push_subscriptions').delete().eq('user_id', targetId);
    await admin.from('admin_activity_log').delete().eq('actor_id', targetId);
    await admin.from('messaging_assignments').delete().eq('teacher_id', targetId);
    await admin.from('messaging_assignments').delete().eq('student_id', targetId);
    await admin.from('community_posts').update({ author_id: null }).eq('author_id', targetId);
    await admin.from('gallery_photos').update({ uploaded_by: null }).eq('uploaded_by', targetId);
    await admin.from('gallery_photos').update({ reviewed_by: null }).eq('reviewed_by', targetId);
    await admin.from('hifz_plan').update({ teacher_id: null }).eq('teacher_id', targetId);

    const { error: rowError } = await admin.from('users').delete().eq('id', targetId);
    if (rowError) {
      return NextResponse.json({ error: rowError.message }, { status: 400 });
    }

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(targetId);
    if (authDeleteError) {
      return NextResponse.json({
        error: `Profile removed, but login delete failed: ${authDeleteError.message}`,
      }, { status: 400 });
    }

    await logActivity(admin, {
      actorId: user.id,
      actorRole: 'super_admin',
      actionType: 'user.deleted',
      summary: `Deleted ${targetRole} account for ${targetName}`,
      targetType: 'user',
      targetId,
      metadata: { role: targetRole },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('delete-staff error:', error);
    return NextResponse.json({ error: 'Failed to delete staff account.' }, { status: 500 });
  }
}
