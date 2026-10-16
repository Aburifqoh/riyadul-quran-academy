import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { sendTeacherWelcomeEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

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

    const supabaseAdmin = getSupabaseAdmin();
    const { data: raw } = await supabaseAdmin.from('users').select('id, role').eq('id', user.id).single();
    if (getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role) !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admin can create teacher accounts.' }, { status: 403 });
    }

    const payload = await req.json().catch(() => null) as { email?: string; name?: string; password?: string } | null;
    const email = payload?.email;
    const name = payload?.name;
    const password = payload?.password;
    if (!email || !name || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role: 'teacher' },
    });

    if (createAuthError || !authData.user) {
      return NextResponse.json({ error: createAuthError?.message || 'Failed to create auth user' }, { status: 400 });
    }

    const userId = authData.user.id;
    const teacherData = {
      id: userId,
      name,
      email,
      role: 'teacher',
      createdAt: new Date().toISOString(),
      publicProfile: {
        isLive: false,
        gender: '',
        qualifications: '',
        specialization: '',
        languages: '',
        about: '',
      },
    };

    const { error: dbError } = await supabaseAdmin.from('users').insert(teacherData);
    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    await sendTeacherWelcomeEmail(email, name, password);
    return NextResponse.json({ success: true, teacher: teacherData });
  } catch (error: unknown) {
    console.error('Create teacher error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
