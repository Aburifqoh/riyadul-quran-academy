import { NextResponse } from 'next/server';

async function supabaseGet(table: string, query: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabasePatch(table: string, id: string, body: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function sendPaymentReceiptEmail(email: string, amountUsd: string) {
  const apiKey = process.env.RESEND_API_KEY || '';
  if (!apiKey) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'Ilmvers Institute <noreply@ilmversinstitute.com>',
      to: email,
      subject: 'Payment Successful - Ilmvers Institute',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2>Payment Received</h2>
        <p>We received your payment of <strong>$${amountUsd}</strong>. Your subscription is now active.</p>
        <br/>
        <a href="https://ilmvers.com/portal" style="background:#004D4A;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Dashboard</a>
      </div>`,
    }),
  });
}

async function resolveBeneficiary(opts: {
  payerEmail: string;
  studentId?: string | null;
}): Promise<{ id: string; email?: string; name?: string; parentId?: string } | null> {
  const studentId = String(opts.studentId || '').trim();
  if (studentId) {
    const child = await supabaseGet(
      'users',
      `id=eq.${encodeURIComponent(studentId)}&select=id,email,name,parentId`
    );
    if (!child?.id) return null;
    const payer = await supabaseGet(
      'users',
      `email=eq.${encodeURIComponent(opts.payerEmail)}&select=id`
    );
    if (payer?.id && (child.parentId === payer.id || child.id === payer.id)) {
      return child;
    }
    console.warn('Flutterwave webhook: student_id rejected (payer is not parent/self)', {
      studentId,
      payerEmail: opts.payerEmail,
    });
    return null;
  }
  return supabaseGet('users', `email=eq.${encodeURIComponent(opts.payerEmail)}&select=id,email,name,parentId`);
}

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || '';

    if (!signature || signature !== secretHash) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await req.json();

    if (body.event === 'charge.completed' && body.data.status === 'successful') {
      const email = body.data.customer.email;
      const meta = body.data.meta || {};
      const studentId = meta.student_id ? String(meta.student_id) : null;

      // Flutterwave amount is usually NGN — prefer metadata USD.
      const metaUsd = meta.base_usd_price ? parseFloat(String(meta.base_usd_price)) : NaN;
      const amountUsd = Number.isFinite(metaUsd) && metaUsd > 0 ? metaUsd : 0;
      const isRecurring = meta.is_recurring === 'true';
      const planDays = meta.plan_days ? parseInt(String(meta.plan_days), 10) : 2;
      const authToken = body.data.card?.token;

      const user = await resolveBeneficiary({ payerEmail: email, studentId });

      if (user) {
        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        const patch: Record<string, unknown> = {
          paymentVerified: true,
          paymentStatus: 'active',
          status: 'active',
          lastPaymentDate: new Date().toISOString(),
          planDays: Number.isFinite(planDays) && planDays > 0 ? planDays : 2,
        };
        if (amountUsd > 0) patch.base_usd_price = amountUsd;
        if (isRecurring && authToken) {
          patch.payment_gateway = 'flutterwave';
          patch.gateway_auth_token = authToken;
          patch.next_billing_date = nextBillingDate.toISOString();
        }

        await supabasePatch('users', user.id, patch);
        await sendPaymentReceiptEmail(email, amountUsd > 0 ? amountUsd.toFixed(0) : '—');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Flutterwave webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
