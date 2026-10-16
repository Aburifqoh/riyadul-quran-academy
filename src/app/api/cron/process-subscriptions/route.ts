import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';



// Pure fetch-based Supabase REST helper (Edge compatible, no SDK)
function supabase(table: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase environment variables');
  const base = `${url}/rest/v1/${table}`;
  const headers: Record<string, string> = {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
  return {
    async select(query: string) {
      const res = await fetch(`${base}?${query}`, { headers });
      if (!res.ok) throw new Error(`DB Error: ${await res.text()}`);
      return res.json();
    },
    async update(id: string, data: Record<string, any>) {
      const res = await fetch(`${base}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`DB Error: ${await res.text()}`);
      return res.json();
    }
  };
}

async function sendEmail(subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY || '';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'Ilmvers Institute <noreply@ilmversinstitute.com>',
      to: ADMIN_ALERT_EMAIL,
      subject,
      html,
    }),
  });
}

export async function GET(req: NextRequest) {
  const CRON_SECRET = process.env.CRON_SECRET || '';
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Fetch live exchange rate
    let exchangeRate = 1600;
    try {
      const rateRes = await fetch('https://open.er-api.com/v6/latest/USD');
      const rateData = await rateRes.json();
      exchangeRate = rateData?.rates?.NGN || 1600;
    } catch {
      console.warn('Failed to fetch exchange rate, using fallback.');
    }

    // 2. Fetch due subscriptions using Supabase REST API
    const now = new Date().toISOString();
    const db = supabase('users');
    const dueUsers: any[] = await db.select(
      `select=*&status=eq.%22active%22&next_billing_date=lte.${now}&gateway_auth_token=not.is.null`
    );

    if (!dueUsers || dueUsers.length === 0) {
      return NextResponse.json({ message: 'No subscriptions due today.' });
    }

    let results = { success: 0, failed: 0, grace: 0 };

    for (const user of dueUsers) {
      const baseUsd = parseFloat(user.base_usd_price) || 0;
      if (baseUsd <= 0) continue;

      const amountNgn = Math.floor(baseUsd * exchangeRate);
      let paymentSuccess = false;

      if (user.payment_gateway === 'paystack') {
        paymentSuccess = await chargePaystack(user.gateway_auth_token, user.email, amountNgn);
      } else if (user.payment_gateway === 'flutterwave') {
        paymentSuccess = await chargeFlutterwave(user.gateway_auth_token, user.email, amountNgn, user.name);
      }

      if (paymentSuccess) {
        const nextBilling = new Date();
        nextBilling.setDate(nextBilling.getDate() + 30);
        await db.update(user.id, {
          next_billing_date: nextBilling.toISOString(),
          grace_period_until: null,
          lastPaymentDate: new Date().toISOString(),
        });
        results.success++;
      } else {
        const hasGrace = user.grace_period_until && new Date(user.grace_period_until) > new Date();
        if (!user.grace_period_until) {
          const graceUntil = new Date();
          graceUntil.setDate(graceUntil.getDate() + 1);
          await db.update(user.id, { grace_period_until: graceUntil.toISOString() });
          await sendEmail("Ilmvers Subscription Alert", `<p>Payment failed for ${user.email}. 1-day grace period started.</p>`);
          results.grace++;
        } else if (!hasGrace) {
          await db.update(user.id, { status: 'inactive' });
          await sendEmail("Ilmvers Subscription Alert", `<p>CRITICAL: Subscription suspended for ${user.email}.</p>`);
          results.failed++;
        }
      }
    }

    return NextResponse.json({ message: 'Billing cycle processed', stats: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function chargePaystack(token: string, email: string, amountNgn: number) {
  try {
    const res = await fetch('https://api.paystack.co/transaction/charge_authorization', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorization_code: token, email, amount: amountNgn * 100 }),
    });
    const data = await res.json();
    return data.status === true && data.data?.status === 'success';
  } catch { return false; }
}

async function chargeFlutterwave(token: string, email: string, amountNgn: number, name: string) {
  try {
    const res = await fetch('https://api.flutterwave.com/v3/tokenized-charges', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, currency: 'NGN', country: 'NG', amount: amountNgn, email, first_name: name, tx_ref: 'ALMQ_REC_' + Date.now() }),
    });
    const data = await res.json();
    return data.status === 'success';
  } catch { return false; }
}

