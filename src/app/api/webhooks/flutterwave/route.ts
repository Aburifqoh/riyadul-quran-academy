import { NextResponse } from 'next/server';




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
    const signature = req.headers.get('verif-hash');
    const secretHash = process.env.FLUTTERWAVE_SECRET_HASH || '';

    if (!signature || signature !== secretHash) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const body = await req.json();

    if (body.event === 'charge.completed' && body.data.status === 'successful') {
      const email = body.data.customer.email;

      const user = await supabaseGet('users', `email=eq.${encodeURIComponent(email)}&select=id,email,name`);

      if (user) {
        const amountInDollars = parseFloat(body.data.amount) || 0;

        const meta = body.data.meta || {};
        const baseUsdPrice = meta.base_usd_price ? parseFloat(meta.base_usd_price) : amountInDollars;
        const isRecurring = meta.is_recurring === 'true';
        const planDays = meta.plan_days ? parseInt(meta.plan_days) : 2;
        const authToken = body.data.card?.token;

        const nextBillingDate = new Date();
        nextBillingDate.setDate(nextBillingDate.getDate() + 30);

        await supabasePatch('users', user.id, {
          paymentVerified: true,
          status: '"active"',
          lastPaymentDate: new Date().toISOString(),
          planDays: planDays,
          ...(isRecurring && authToken ? {
            payment_gateway: 'flutterwave',
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
    console.error('Flutterwave webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

