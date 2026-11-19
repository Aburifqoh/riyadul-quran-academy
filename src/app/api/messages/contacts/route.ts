import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getMessagingContacts } from '@/lib/messaging';
import { parseUserRecord } from '@/lib/userDataHelpers';
import type { UserData } from '@/types/user';

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

    const { data: raw } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (!raw) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const userData = parseUserRecord(raw) as UserData;
    const contacts = await getMessagingContacts(userData);

    return NextResponse.json({ contacts });
  } catch (error) {
    console.error('Get contacts error:', error);
    return NextResponse.json({ error: 'Failed to load contacts' }, { status: 500 });
  }
}
