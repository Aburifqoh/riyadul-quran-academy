import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildConversationSummaries,
  mergeContactsWithConversations,
} from '@/lib/conversations';
import { getMessagingContacts, getViewerMessages } from '@/lib/messaging';
import { getUserRole, parseUserRecord } from '@/lib/userDataHelpers';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
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

    const { data: raw } = await supabase
      .from('users')
      .select('id, name, email, role, schedule, parentId')
      .eq('id', user.id)
      .single();
    if (!raw) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const userData = parseUserRecord(raw) as UserData;
    const role = getUserRole(userData.role);
    const isAdmin = role === 'admin' || role === 'super_admin';

    const admin = getSupabaseAdmin();
    const { data: roleRows } = await admin.from('users').select('id, name, role, email');
    const adminIds = new Set(
      (roleRows || [])
        .filter(u => {
          const r = getUserRole(u.role);
          return r === 'admin' || r === 'super_admin';
        })
        .map(u => u.id as string)
    );

    // Service-role read of THIS user's threads only. The previous user-JWT query
    // also matched every admin outbound message, so a 300-row cap hid teacher mail.
    let messages;
    if (isAdmin) {
      const { data, error } = await admin
        .from('messages')
        .select('id, sender_id, receiver_id, content, read, created_at, student_context_id, filtered')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      messages = data || [];
    } else {
      const result = await getViewerMessages(user.id, role, 400);
      if (result.error) throw new Error(result.error);
      messages = result.data;
    }

    const userMap = new Map(
      (roleRows || []).map(u => [u.id as string, { name: u.name as string, role: getUserRole(u.role) || String(u.role ?? ''), email: u.email as string }])
    );

    const studentIds = new Set<string>();
    messages.forEach(m => {
      if (m.student_context_id) studentIds.add(m.student_context_id as string);
    });
    const studentNames = new Map<string, string>();
    if (studentIds.size > 0) {
      const { data: students } = await admin
        .from('users')
        .select('id, name')
        .in('id', [...studentIds]);
      (students || []).forEach(s => studentNames.set(s.id as string, (s.name as string) || 'Student'));
    }

    const conversations = buildConversationSummaries({
      messages,
      userMap,
      viewerId: user.id,
      viewerIsAdmin: isAdmin,
      adminIds,
      studentNames,
    });

    if (isAdmin) {
      return NextResponse.json({ conversations, contacts: null });
    }

    const contacts = await getMessagingContacts(userData);
    const mergedContacts = mergeContactsWithConversations(contacts, conversations);

    return NextResponse.json({ conversations, contacts: mergedContacts });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}
