import { NextResponse } from 'next/server';
import { MESSAGE_RETENTION_MONTHS, purgeOldMessages } from '@/lib/messaging';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const deleted = await purgeOldMessages(MESSAGE_RETENTION_MONTHS);
    return NextResponse.json({ success: true, deleted, months: MESSAGE_RETENTION_MONTHS });
  } catch (error) {
    console.error('Cron purge messages error:', error);
    return NextResponse.json({ error: 'Purge failed' }, { status: 500 });
  }
}
