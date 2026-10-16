import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { adminSaveTeacherProfile } from '@/lib/db';

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
      return NextResponse.json({ error: 'Only super admin can edit teacher profiles.' }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const teacherId = typeof body?.teacherId === 'string' ? body.teacherId : '';
    if (!teacherId) {
      return NextResponse.json({ error: 'Teacher id is required.' }, { status: 400 });
    }

    const nextEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (nextEmail) {
      const { data: authUser, error: getAuthError } = await admin.auth.admin.getUserById(teacherId);
      if (getAuthError || !authUser.user) {
        return NextResponse.json({ error: 'Teacher login account was not found.' }, { status: 404 });
      }
      if ((authUser.user.email || '').toLowerCase() !== nextEmail) {
        const { error: emailError } = await admin.auth.admin.updateUserById(teacherId, {
          email: nextEmail,
          email_confirm: true,
        });
        if (emailError) {
          return NextResponse.json({
            error: emailError.message.includes('already')
              ? 'That email is already used by another login account.'
              : emailError.message,
          }, { status: 400 });
        }
      }
    }

    const result = await adminSaveTeacherProfile(teacherId, {
      name: String(body?.name || '').trim(),
      email: nextEmail,
      kunyah: String(body?.kunyah || '').trim(),
      gender: String(body?.gender || ''),
      qualifications: Array.isArray(body?.qualifications) ? body.qualifications : [],
      specialization: Array.isArray(body?.specialization) ? body.specialization : [],
      languages: Array.isArray(body?.languages) ? body.languages : [],
      about: String(body?.about || ''),
      isLive: Boolean(body?.isLive),
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to save profile.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('teacher-profile update error:', error);
    return NextResponse.json({ error: 'Failed to update teacher profile.' }, { status: 500 });
  }
}
