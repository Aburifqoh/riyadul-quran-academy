import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';
import { sendAdminNewLeadAlert, sendAssessmentConfirmation } from '@/lib/email';
import type { JsonValue } from '@/types/json';

/** The assessment form saves in the browser. Mail has to leave from here. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, JsonValue> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Missing payload' }, { status: 400 });
    }

    const email = typeof body.email === 'string'
      ? body.email
      : (typeof body.contact === 'string' ? body.contact : '');
    const name = typeof body.name === 'string' ? body.name : 'Student';
    const whenLabel = typeof body.whenLabel === 'string' ? body.whenLabel : '';

    const results = await Promise.allSettled([
      email.includes('@')
        ? sendAssessmentConfirmation(email, name, { whenLabel, booked: body.booked === true })
        : Promise.resolve(),
      sendAdminNewLeadAlert(ADMIN_ALERT_EMAIL, body),
    ]);
    for (const result of results) {
      if (result.status === 'rejected') console.error('Assessment notify email failed:', result.reason);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('assessment-notify error:', error);
    return NextResponse.json({ error: 'Notify failed' }, { status: 500 });
  }
}
