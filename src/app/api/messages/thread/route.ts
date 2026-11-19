import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getThreadMessages } from '@/lib/messaging';
import { getUserRole } from '@/lib/userDataHelpers';

export async function GET(request: Request) {
  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');
    if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });

    const result = await getThreadMessages({
      viewerId: user.id,
      viewerRole: getUserRole(profile?.role),
      contactId,
      studentContextId: url.searchParams.get('studentContextId'),
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ messages: result.messages });
  } catch (err) {
    console.error('Get thread error:', err);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}
