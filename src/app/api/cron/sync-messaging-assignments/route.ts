import { NextResponse } from 'next/server';
import { syncAllMessagingAssignments } from '@/lib/messaging';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const synced = await syncAllMessagingAssignments();
    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('Cron sync messaging assignments error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
