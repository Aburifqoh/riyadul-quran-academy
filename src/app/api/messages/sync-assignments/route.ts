import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserRole } from '@/lib/userDataHelpers';
import { syncAllMessagingAssignments } from '@/lib/messaging';

function isCronAuthorized(request: Request): boolean {
  const authHeader = request.headers.get('authorization');
  const cronHeader = request.headers.get('x-cron-secret');
  const secret = process.env.CRON_SECRET;
  return !!secret && (
    authHeader === `Bearer ${secret}` ||
    cronHeader === secret
  );
}

export async function POST(request: Request) {
  try {
    if (!isCronAuthorized(request)) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      const profileRole = getUserRole(profile?.role);
      if (!profileRole || (profileRole !== 'admin' && profileRole !== 'super_admin')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const synced = await syncAllMessagingAssignments();
    return NextResponse.json({ success: true, synced });
  } catch (error) {
    console.error('Sync assignments error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
