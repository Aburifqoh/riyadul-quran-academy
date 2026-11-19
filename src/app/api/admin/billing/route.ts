import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { hasPermission } from '@/lib/permissions';
import { adminApplyBilling, type BillingAction } from '@/lib/db';
import { isSandboxFinanceEmail, isSandboxFinanceReference, parseHourlyRates } from '@/lib/billing';

const ACTIONS = new Set<BillingAction>(['paid', 'scholarship', 'unpaid']);

async function requireBillingAdmin(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const token = authHeader.slice(7);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = getSupabaseAdmin();
  const { data: raw } = await admin.from('users').select('id, role, permissions').eq('id', user.id).single();
  if (!hasPermission(parseUserRecord((raw || {}) as Record<string, unknown>), 'can_manage_students')) {
    return { error: NextResponse.json({ error: 'You do not have permission to update billing.' }, { status: 403 }) };
  }
  return { user, admin };
}

export async function GET(request: Request) {
  try {
    const gate = await requireBillingAdmin(request);
    if ('error' in gate && gate.error) return gate.error;

    const admin = getSupabaseAdmin();
    const [{ data: payments }, { data: ratesRow }] = await Promise.all([
      admin.from('processed_payments').select('id, reference, gateway, email, amount, processed_at').order('processed_at', { ascending: false }).limit(300),
      admin.from('system_settings').select('value').eq('key', 'pricing_rates').maybeSingle(),
    ]);

    const livePayments = (payments || []).filter((p) =>
      !isSandboxFinanceEmail(p.email) && !isSandboxFinanceReference(p.reference)
    );

    return NextResponse.json({
      payments: livePayments,
      rates: parseHourlyRates(ratesRow?.value),
    });
  } catch (error) {
    console.error('admin billing get error:', error);
    return NextResponse.json({ error: 'Failed to load billing.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireBillingAdmin(request);
    if ('error' in gate && gate.error) return gate.error;

    const body = await request.json().catch(() => null);
    const userId = typeof body?.userId === 'string' ? body.userId : '';
    const actionRaw = typeof body?.action === 'string' ? body.action : '';
    const tuitionPlan = typeof body?.tuitionPlan === 'string' ? body.tuitionPlan : undefined;
    const months = Number(body?.months);
    const cycleMonths = Number.isFinite(months) && months >= 1 && months <= 12 ? Math.round(months) : 1;

    if (!userId || !ACTIONS.has(actionRaw as BillingAction)) {
      return NextResponse.json({ error: 'User and a valid billing action are required.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: targetRaw } = await admin.from('users').select('id, role').eq('id', userId).single();
    const targetRole = getUserRole(parseUserRecord((targetRaw || {}) as Record<string, unknown>).role);
    if (targetRole !== 'student' && targetRole !== 'parent') {
      return NextResponse.json({ error: 'Billing can only be updated for students and parents.' }, { status: 400 });
    }

    const result = await adminApplyBilling(userId, actionRaw as BillingAction, tuitionPlan, cycleMonths);
    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Billing update failed.' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('admin billing error:', error);
    return NextResponse.json({ error: 'Failed to update billing.' }, { status: 500 });
  }
}
