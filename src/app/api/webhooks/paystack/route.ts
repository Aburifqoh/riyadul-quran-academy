import { NextResponse } from 'next/server';

// Edge-compatible HMAC-SHA512 using Web Crypto API (replaces Node.js 'crypto')
async function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

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

/** Prefer metadata student_id (parent paying for a child); otherwise payer email. */
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
    // Only allow when the payer is the linked parent or the student themself.
    if (payer?.id && (child.parentId === payer.id || child.id === payer.id)) {
      return child;
    }
    console.warn('Paystack webhook: student_id rejected (payer is not parent/self)', {
      studentId,
      payerEmail: opts.payerEmail,
    });
    return null;
  }
  return supabaseGet('users', `email=eq.${encodeURIComponent(opts.payerEmail)}&select=id,email,name,parentId`);
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const secret = process.env.PAYSTACK_SECRET_KEY || '';

    const valid = await verifyPaystackSignature(rawBody, signature, secret);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.event === 'charge.success') {
      const data = body.data;
      const email = data.customer.email;

      const customFields = data.metadata?.custom_fields || [];
      const baseUsdField = customFields.find((f: { variable_name?: string }) => f.variable_name === 'base_usd_price');
      const isRecurringField = customFields.find((f: { variable_name?: string }) => f.variable_name === 'is_recurring');
      const planDaysField = customFields.find((f: { variable_name?: string }) => f.variable_name === 'plan_days');
      const studentIdField = customFields.find((f: { variable_name?: string }) => f.variable_name === 'student_id');

      // Paystack amount is kobo NGN — never treat /100 as USD. Prefer metadata USD.
      const baseUsdPrice = baseUsdField ? parseFloat(String(baseUsdField.value)) : NaN;
      const amountUsd = Number.isFinite(baseUsdPrice) && baseUsdPrice > 0 ? baseUsdPrice : 0;
      const isRecurring = isRecurringField?.value === 'true';
      const planDays = planDaysField ? parseInt(String(planDaysField.value), 10) : 2;
      const authToken = data.authorization?.authorization_code;
      const studentId = studentIdField?.value ? String(studentIdField.value) : null;

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
          patch.payment_gateway = 'paystack';
          patch.gateway_auth_token = authToken;
          patch.next_billing_date = nextBillingDate.toISOString();
        }

        await supabasePatch('users', user.id, patch);
        await sendPaymentReceiptEmail(email, amountUsd > 0 ? amountUsd.toFixed(0) : '—');
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
