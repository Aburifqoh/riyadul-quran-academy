import { getErrorMessage } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getCallerPermissions,
  requireSuperAdmin,
  PermissionError,
  DEFAULT_ADMIN_PERMISSIONS,
} from '@/lib/permissions';
import { logActivity } from '@/lib/activityLog';
import { sendTeacherWelcomeEmail } from '@/lib/email';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';

// No `export const runtime = 'edge'` — this project deploys via
// @opennextjs/cloudflare to Workers, which expects the Node.js runtime.
// See prior discussion: declaring edge here is unsupported and was the
// source of earlier inconsistent behavior in this codebase.

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    const { name, email, password, role } = body as {
      name: string;
      email: string;
      password: string;
      role: 'teacher' | 'admin';
    };

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }
    if (!['teacher', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role must be teacher or admin.' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const token = authHeader.slice(7);
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();
    const { data: raw } = await supabase.from('users').select('id, role').eq('id', user.id).single();
    if (getUserRole(parseUserRecord((raw || {}) as Record<string, unknown>).role) !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admin can create staff accounts.' }, { status: 403 });
    }

    const caller = await getCallerPermissions(supabase, user.id);
    requireSuperAdmin(caller);

    // --- 1. Create the auth identity ---
    // app_metadata.role is set HERE at creation time, so the very first
    // JWT this user receives already carries the correct role for every
    // RLS policy that reads (auth.jwt() -> 'app_metadata' ->> 'role').
    const { data: authUser, error: createAuthError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role },
    });

    if (createAuthError || !authUser?.user) {
      return NextResponse.json(
        { error: createAuthError?.message || 'Could not create auth account.' },
        { status: 502 }
      );
    }

    // --- 2. Insert the profile row ---
    // Admins get the default permissions object (all toggles on) so a
    // newly created admin isn't accidentally locked out of everything
    // until a Super Admin visits the permissions UI. Non-admins get an
    // empty object, NOT null: the users.permissions column is NOT NULL,
    // so null failed the insert outright for every teacher created here.
    // Empty is equivalent in meaning — has_permission() already returns
    // false for any non-admin role regardless of this column's content.
    const { error: profileError } = await supabase.from('users').insert({
      id: authUser.user.id,
      name,
      email,
      role,
      permissions: role === 'admin' ? DEFAULT_ADMIN_PERMISSIONS : {},
    });

    if (profileError) {
      // Roll back the auth identity so we don't leave an orphaned login
      // with no matching profile row.
      await supabase.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json(
        { error: `Profile creation failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    await logActivity(supabase, {
      actorId: user.id,
      actorRole: 'super_admin',
      actionType: 'user.created',
      summary: `Created ${role} account for ${name} (${email})`,
      targetType: 'user',
      targetId: authUser.user.id,
      metadata: { role },
    });

    if (role === 'teacher') {
      await sendTeacherWelcomeEmail(email, name, password);
    }

    return NextResponse.json({
      success: true,
      userId: authUser.user.id,
      role,
    });
  } catch (err: unknown) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: getErrorMessage(err) }, { status: err.status });
    }
    console.error('create-user error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
