import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';
import { sendAdminNewUserAlert, sendWelcomeEmail } from '@/lib/email';
import { passwordPolicyError } from '@/lib/passwordPolicy';
import { verifyTurnstile } from '@/lib/turnstile';

/**
 * Public registration. The browser cannot insert the profile row: email
 * confirmation means sign-up returns no session, and the users insert then
 * runs as anon. This route uses the service role, writes only known columns,
 * and deletes the auth user if the profile insert fails.
 */

const PROFILE_COLUMNS = new Set([
  'name', 'email', 'phone', 'nationality', 'country', 'city',
  'referral', 'timezone', 'detectedTz', 'tuitionPlan',
]);

const NEVER_STORE = new Set(['password', 'confirmPassword', 'role', 'id', 'permissions', 'parentId']);

function splitFields(input: Record<string, unknown>) {
  const columns: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (NEVER_STORE.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    if (PROFILE_COLUMNS.has(key)) columns[key] = value;
    else extra[key] = value;
  }
  return { columns, extra };
}

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  let createdAuthId: string | null = null;
  const supabase = admin();

  try {
    const body = await req.json();
    const accountType: 'adult' | 'parent' = body?.accountType === 'parent' ? 'parent' : 'adult';
    const profile = (body?.profile ?? {}) as Record<string, unknown>;
    const children = Array.isArray(body?.children) ? (body.children as Record<string, unknown>[]) : [];

    const email = String(profile.email ?? '').trim().toLowerCase();
    const password = String(profile.password ?? '');
    const name = String(profile.name ?? '').trim();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Name, email and password are all required.' }, { status: 400 });
    }

    const policyError = passwordPolicyError(password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const turnstile = await verifyTurnstile({
      token: String(body?.turnstileToken ?? ''),
      email,
      host: req.headers.get('host'),
      remoteip: req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });
    if (!turnstile.ok) {
      console.warn('Registration blocked by Turnstile:', turnstile.reason, turnstile.errorCodes);
      return NextResponse.json(
        { error: 'The security check did not pass. Please refresh the page and try again.' },
        { status: 400 }
      );
    }

    const { data: created, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
      app_metadata: { role: accountType === 'parent' ? 'parent' : 'student' },
    });

    if (authError || !created?.user) {
      const already = /already|exists|registered/i.test(authError?.message ?? '');
      return NextResponse.json(
        {
          error: already
            ? 'An account with this email already exists. Try signing in, or use the password reset link.'
            : 'We could not create your account. Please check your details and try again.',
        },
        { status: already ? 409 : 400 }
      );
    }
    createdAuthId = created.user.id;

    const { columns, extra } = splitFields(profile);
    const now = new Date().toISOString();
    const role = accountType === 'parent' ? 'parent' : 'student';

    const { error: profileError } = await supabase.from('users').insert({
      ...columns,
      id: createdAuthId,
      email,
      name,
      role,
      permissions: {},
      paymentVerified: false,
      createdAt: now,
      ...(Object.keys(extra).length > 0 ? { studentProfile: extra } : {}),
    });
    if (profileError) throw profileError;

    for (const child of children) {
      const { columns: childColumns, extra: childExtra } = splitFields(child);
      const { error: childError } = await supabase.from('users').insert({
        ...childColumns,
        id: globalThis.crypto.randomUUID(),
        parentId: createdAuthId,
        name: String(child.name ?? '').trim() || 'Student',
        role: 'student',
        permissions: {},
        paymentVerified: false,
        createdAt: now,
        ...(Object.keys(childExtra).length > 0 ? { studentProfile: childExtra } : {}),
      });
      if (childError) throw childError;
    }

    const alertPayload = {
      name,
      email,
      role,
      accountType: accountType === 'parent' ? 'Parent / Guardian' : 'Adult student',
      phone: String(profile.phone ?? ''),
      gender: String(profile.gender ?? ''),
      nationality: String(profile.nationality ?? ''),
      country: String(profile.country ?? ''),
      city: String(profile.city ?? ''),
      referral: String(profile.referral ?? ''),
      children: children.map((child) => ({
        name: String(child.name ?? ''),
        email: String(child.email ?? ''),
        age: String(child.age ?? ''),
        gender: String(child.gender ?? ''),
        level: String(child.level ?? ''),
      })),
    };

    const [welcome, adminAlert] = await Promise.allSettled([
      sendWelcomeEmail(email, name),
      sendAdminNewUserAlert(ADMIN_ALERT_EMAIL, alertPayload),
    ]);
    if (welcome.status === 'rejected') console.error('Welcome email failed:', welcome.reason);
    if (adminAlert.status === 'rejected') console.error('Registration alert email failed:', adminAlert.reason);

    return NextResponse.json({ ok: true, userId: createdAuthId });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'The registration form was not sent correctly. Please refresh and try again.' },
        { status: 400 }
      );
    }
    if (createdAuthId) {
      await supabase.from('users').delete().eq('parentId', createdAuthId);
      await supabase.from('users').delete().eq('id', createdAuthId);
      const { error: cleanupError } = await supabase.auth.admin.deleteUser(createdAuthId);
      if (cleanupError) {
        console.error('Registration rollback failed, orphaned auth user:', createdAuthId, cleanupError);
      }
    }
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'We could not complete your registration. Please try again, or contact us if it keeps happening.' },
      { status: 500 }
    );
  }
}
