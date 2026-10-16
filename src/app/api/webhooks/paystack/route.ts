import { NextResponse } from 'next/server';




// Edge-compatible HMAC-SHA512 using Web Crypto API (replaces Node.js 'crypto')
async function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
  const hex = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex === signature;
}

// Pure fetch Supabase helper (Edge compatible, no SDK)
async function supabaseGet(table: string, query: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabasePatch(table: string, id: string, body: Record<string, any>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body),
  });
}

async function sendPaymentReceiptEmail(email: string, amount: string) {
  const apiKey = process.env.RESEND_API_KEY || '';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: "Ilmvers Institute <noreply@ilmversinstitute.com>",
      to: email,
      subject: "Payment Successful - Ilmvers Institute",
      html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;">
        <h2>Payment Received</h2>
        <p>We received your payment of <strong>$${amount}</strong>. Your subscription is now active.</p>
        <br/>
        <a href="https://ilmversinstitute.com/portal" style="background:#F59A23;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:bold;">Go to Dashboard</a>
      </div>`,
    }),
  });
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

      const user = await supabaseGet('users', `email=eq.${encodeURIComponent(email)}&select=id,email,name`);

      if (user) {
        const amountInDollars = data.amount / 100;

        const customFields = data.metadata?.custom_fields || [];
        const baseUsdField = customFields.find((f: any) => f.variable_name === 'base_usd_price');
        const isRecurringField = customFields.find((f: any) => f.variable_name === 'is_recurring');
        const planDaysField = customFields.find((f: any) => f.variable_name === 'plan_days');

        const baseUsdPrice = baseUsdField ? parseFloat(baseUsdField.value) : amountInDollars;
        const isRecurring = isRecurringField?.value === 'true';
        const planDays = planDaysField ? parseInt(planDaysField.value) : 2;
        const authToken = data.authorization?.authorization_code;

        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        await supabasePatch('users', user.id, {
          paymentVerified: true,
          status: '"active"',
          lastPaymentDate: new Date().toISOString(),
          planDays: planDays,
          ...(isRecurring && authToken ? {
            payment_gateway: 'paystack',
            gateway_auth_token: authToken,
            base_usd_price: baseUsdPrice,
            next_billing_date: nextBillingDate.toISOString(),
          } : {}),
        });

        await sendPaymentReceiptEmail(email, amountInDollars.toString());
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Paystack webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

