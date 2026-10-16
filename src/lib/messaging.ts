import { createClient } from '@supabase/supabase-js';
import { getSchedule, parseUserRecord, getUserRole, slotBelongsToTeacher } from '@/lib/userDataHelpers';
import { sendNewMessageEmail } from '@/lib/email';
import { ADMIN_ALERT_EMAIL } from '@/lib/config';
import { missingColumnFromError } from '@/lib/supabaseSafe';
import type { ScheduleSlot } from '@/types/content';
import type { UserData } from '@/types/user';
import type { MessagingContact } from '@/types/messaging';
import type { MessageRow } from '@/lib/conversations';

const RATE_LIMIT_PER_MINUTE = 20;
export const MESSAGE_RETENTION_MONTHS = 12;

const PROFANITY_PATTERNS = [
  /\b(fuck|shit|bitch|asshole|bastard|damn)\b/gi,
  /\b(kill yourself|kys)\b/gi,
];

function canUseServiceClient() {
  return typeof window === 'undefined' && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase service role is only available on the server.');
  }
  return createClient(url, key);
}

export function filterMessageContent(content: string): { text: string; filtered: boolean } {
  let filtered = false;
  let text = content.trim();
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(text)) {
      filtered = true;
      text = text.replace(pattern, '***');
    }
  }
  return { text, filtered };
}

export async function checkRateLimit(senderId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('sender_id', senderId)
    .gte('created_at', oneMinuteAgo);
  return (count ?? 0) < RATE_LIMIT_PER_MINUTE;
}

export async function isBlocked(senderId: string, receiverId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('message_blocks')
    .select('id')
    .eq('status', 'active')
    .or(`and(blocker_id.eq.${senderId},blocked_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_id.eq.${senderId})`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

interface ActiveAssignmentRow {
  student_id: string;
  teacher_id: string;
  active: true;
  assigned_at: string;
  ended_at: null;
  ended_reason: null;
}

function buildActiveAssignmentRow(
  studentId: string,
  teacherId: string,
  assignedAt: string
): ActiveAssignmentRow {
  return {
    student_id: studentId,
    teacher_id: teacherId,
    active: true,
    assigned_at: assignedAt,
    ended_at: null,
    ended_reason: null,
  };
}

export async function activateMessagingAssignment(studentId: string, teacherId: string) {
  if (!canUseServiceClient()) return;
  const supabase = getServiceClient();
  await supabase.from('messaging_assignments').upsert(
    buildActiveAssignmentRow(studentId, teacherId, new Date().toISOString()),
    { onConflict: 'student_id,teacher_id' }
  );
}

export async function deactivateMessagingAssignment(
  studentId: string,
  teacherId: string,
  reason = 'reassigned'
) {
  if (!canUseServiceClient()) return;
  const supabase = getServiceClient();
  await supabase
    .from('messaging_assignments')
    .update({
      active: false,
      ended_at: new Date().toISOString(),
      ended_reason: reason,
    })
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
    .eq('active', true);
}

export async function syncAssignmentsFromStudentSchedule(studentId: string, schedule: ScheduleSlot[]) {
  const teacherIds = new Set<string>();
  for (const slot of schedule) {
    if (slot.teacherId) teacherIds.add(slot.teacherId);
  }
  for (const teacherId of teacherIds) {
    await activateMessagingAssignment(studentId, teacherId);
  }
}

/**
 * Reconcile messaging_assignments from all student/parent schedules.
 *
 * Delegates to the sync_messaging_assignments() Postgres function so the work is
 * set-based: unaffected by the PostgREST row cap and the Workers CPU/subrequest
 * limits regardless of how many users exist. Requires messaging_scale_v3.sql.
 */
export async function syncAllMessagingAssignments(): Promise<number> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('sync_messaging_assignments');
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

/** Delete messages older than the retention window (default 12 months). */
export async function purgeOldMessages(months = MESSAGE_RETENTION_MONTHS): Promise<number> {
  const supabase = getServiceClient();
  const { data, error } = await supabase.rpc('purge_old_messages', { months });
  if (error) throw error;
  return typeof data === 'number' ? data : 0;
}

async function getChildrenOfParent(parentId: string): Promise<UserData[]> {
  const supabase = getServiceClient();
  // Only the fields needed to derive messaging contacts — avoids pulling every
  // large JSON column (inbox, progress, publicProfile, etc.) per child.
  const { data } = await supabase
    .from('users')
    .select('id, name, role, schedule')
    .eq('parentId', parentId);
  return (data || []).map(u => parseUserRecord(u)) as UserData[];
}

function teacherFromSlot(slot: ScheduleSlot): MessagingContact | null {
  if (!slot.teacherId) return null;
  return {
    id: slot.teacherId,
    name: slot.teacher || slot.teacherName || 'Instructor',
    role: 'teacher',
    email: slot.teacherEmail || '',
  };
}

async function selectMessages(
  orFilter: string,
  limit: number
): Promise<{ data: MessageRow[]; error: string | null }> {
  const supabase = getServiceClient();
  const full = 'id, sender_id, receiver_id, content, read, created_at, student_context_id, filtered';
  let cols = full;
  for (let i = 0; i < 4; i++) {
    const { data, error } = await supabase
      .from('messages')
      .select(cols)
      .or(orFilter)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (!error) return { data: (data || []) as unknown as MessageRow[], error: null };
    const missing = missingColumnFromError(error.message);
    if (missing && cols.includes(missing)) {
      cols = cols.split(', ').filter(c => c !== missing).join(', ');
      continue;
    }
    return { data: [], error: error.message };
  }
  return { data: [], error: 'Failed to load messages' };
}

export async function getViewerMessages(userId: string, role?: string, limit = 400): Promise<{ data: MessageRow[]; error: string | null }> {
  const parts = [
    `sender_id.eq.${userId}`,
    `receiver_id.eq.${userId}`,
    `and(sender_id.eq.${userId},receiver_id.eq.admin)`,
    `and(sender_id.eq.admin,receiver_id.eq.${userId})`,
    `receiver_id.eq.all_users`,
  ];
  if (role === 'teacher') parts.push('receiver_id.eq.all_teachers');
  if (role === 'student' || role === 'parent') parts.push('receiver_id.eq.all_students');
  return selectMessages(parts.join(','), limit);
}

export async function getThreadMessages(options: {
  viewerId: string;
  viewerRole?: string;
  contactId: string;
  studentContextId?: string | null;
  limit?: number;
}): Promise<{ messages: MessageRow[]; error?: string }> {
  const { viewerId, viewerRole, contactId, studentContextId, limit = 200 } = options;
  const isAdmin = viewerRole === 'admin' || viewerRole === 'super_admin';
  const myId = isAdmin ? 'admin' : viewerId;
  const supabase = getServiceClient();

  let orFilter: string;
  if (contactId === 'admin') {
    const parts = [
      `and(sender_id.eq.${viewerId},receiver_id.eq.admin)`,
      `and(sender_id.eq.admin,receiver_id.eq.${viewerId})`,
      `receiver_id.eq.all_users`,
    ];
    if (viewerRole === 'teacher') parts.push('receiver_id.eq.all_teachers');
    if (viewerRole === 'student' || viewerRole === 'parent') parts.push('receiver_id.eq.all_students');
    const { data: roleRows } = await supabase.from('users').select('id, role');
    (roleRows || []).forEach(u => {
      const role = getUserRole(u.role);
      if (role !== 'admin' && role !== 'super_admin') return;
      parts.push(`and(sender_id.eq.${viewerId},receiver_id.eq.${u.id})`);
      parts.push(`and(sender_id.eq.${u.id},receiver_id.eq.${viewerId})`);
    });
    orFilter = parts.join(',');
  } else {
    orFilter = [
      `and(sender_id.eq.${myId},receiver_id.eq.${contactId})`,
      `and(sender_id.eq.${contactId},receiver_id.eq.${myId})`,
      `and(sender_id.eq.${viewerId},receiver_id.eq.${contactId})`,
      `and(sender_id.eq.${contactId},receiver_id.eq.${viewerId})`,
    ].join(',');
  }

  const { data, error } = await selectMessages(orFilter, limit);
  if (error) return { messages: [], error };

  const seen = new Set<string>();
  let unique = data.filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  }).reverse();

  if (studentContextId) {
    unique = unique.filter(m => !m.student_context_id || m.student_context_id === studentContextId);
  } else if (contactId !== 'admin') {
    unique = unique.filter(m => !m.student_context_id || m.student_context_id === contactId);
  }

  return { messages: unique };
}

export async function getMessagingContacts(user: UserData): Promise<MessagingContact[]> {
  const adminContact: MessagingContact = {
    id: 'admin',
    name: 'Ilmvers Administration',
    role: 'admin',
    email: ADMIN_ALERT_EMAIL,
  };

  const role = getUserRole(user.role) || user.role;

  if (role === 'teacher') {
    const supabase = getServiceClient();
    const { data: assignments } = await supabase
      .from('messaging_assignments')
      .select('student_id')
      .eq('teacher_id', user.id)
      .eq('active', true);

    const studentIds = new Set((assignments || []).map(a => a.student_id).filter(Boolean) as string[]);

    // Schedule-assigned students belong in the inbox even when assignment rows
    // were never written (admin paired via schedule only).
    const { data: rosterRows } = await supabase
      .from('users')
      .select('id, role, schedule');
    (rosterRows || []).forEach((row) => {
      const r = getUserRole(row.role);
      if (r !== 'student' && r !== 'parent') return;
      if (getSchedule(row.schedule as string | ScheduleSlot[] | undefined).some((slot) =>
        slotBelongsToTeacher(slot, { id: user.id, email: user.email })
      )) {
        studentIds.add(String(row.id));
      }
    });

    // If assignment rows are missing, still surface people this teacher already
    // messaged so incoming threads are openable.
    if (!studentIds.size) {
      const { data: recent } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(250);
      (recent || []).forEach(m => {
        const other = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (other && other !== 'admin' && !String(other).startsWith('all_')) studentIds.add(String(other));
      });
    }

    if (!studentIds.size) return [adminContact];

    const { data: students } = await supabase
      .from('users')
      .select('id, name, email, role, parentId')
      .in('id', [...studentIds]);

    const contacts: MessagingContact[] = [adminContact];
    const seen = new Set<string>();

    // Batch-fetch all parents in one query instead of one query per student (N+1).
    const parentIds = [...new Set((students || []).map(s => s.parentId).filter(Boolean))] as string[];
    const parentMap = new Map<string, { id: string; name?: string; email?: string; role?: string }>();
    if (parentIds.length) {
      const { data: parents } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('id', parentIds);
      (parents || []).forEach(p => parentMap.set(p.id as string, p));
    }

    for (const s of students || []) {
      const sRole = getUserRole(s.role) || String(s.role || 'student');
      if (sRole === 'admin' || sRole === 'super_admin') continue;
      if (!seen.has(s.id)) {
        seen.add(s.id);
        contacts.push({ id: s.id, name: s.name || 'Student', role: sRole, email: s.email || '' });
      }
      if (s.parentId && !seen.has(s.parentId)) {
        const parent = parentMap.get(s.parentId);
        if (parent) {
          seen.add(parent.id);
          contacts.push({
            id: parent.id,
            name: `${parent.name || 'Parent'} (parent of ${s.name})`,
            role: 'parent',
            email: parent.email || '',
            studentContextId: s.id,
            studentContextName: s.name,
          });
        }
      }
    }
    return contacts;
  }

  if (role === 'parent') {
    const children = await getChildrenOfParent(user.id);
    const contacts: MessagingContact[] = [adminContact];
    const seen = new Set<string>();

    for (const child of children) {
      const schedule = getSchedule(child.schedule);
      for (const slot of schedule) {
        const teacher = teacherFromSlot(slot);
        if (teacher && !seen.has(teacher.id)) {
          seen.add(teacher.id);
          contacts.push({
            ...teacher,
            studentContextId: child.id,
            studentContextName: child.name,
          });
        }
      }
    }
    return contacts;
  }

  if (role === 'student' || !role) {
    const contacts: MessagingContact[] = [adminContact];
    const seen = new Set<string>();
    for (const slot of getSchedule(user.schedule)) {
      const teacher = teacherFromSlot(slot);
      if (teacher && !seen.has(teacher.id)) {
        seen.add(teacher.id);
        contacts.push(teacher);
      }
    }
    return contacts;
  }

  return [adminContact];
}

export async function canUsersMessage(
  senderId: string,
  receiverId: string,
  studentContextId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (receiverId === 'admin' || senderId === 'admin') return { allowed: true };

  const supabase = getServiceClient();
  const { data: sender } = await supabase.from('users').select('id, role').eq('id', senderId).single();
  const { data: receiver } = await supabase.from('users').select('id, role').eq('id', receiverId).single();

  if (!sender || !receiver) return { allowed: false, reason: 'User not found' };

  if (await isBlocked(senderId, receiverId)) {
    return { allowed: false, reason: 'Messaging is blocked between these users' };
  }

  const sRole = getUserRole(sender.role);
  const rRole = getUserRole(receiver.role);

  if (sRole === 'teacher' && rRole === 'student') {
    const ok = await hasActiveAssignment(receiverId, senderId)
      || await isScheduledWithTeacher(receiverId, senderId)
      || await haveMessagedBefore(senderId, receiverId);
    return ok ? { allowed: true } : { allowed: false, reason: 'No active assignment with this student' };
  }

  if (sRole === 'student' && rRole === 'teacher') {
    const ok = await hasActiveAssignment(senderId, receiverId)
      || await isScheduledWithTeacher(senderId, receiverId)
      || await haveMessagedBefore(senderId, receiverId);
    return ok ? { allowed: true } : { allowed: false, reason: 'No active assignment with this teacher' };
  }

  if (sRole === 'parent' && rRole === 'teacher') {
    if (!studentContextId) return { allowed: false, reason: 'Child context required for parent messages' };
    const { data: child } = await supabase.from('users').select('parentId').eq('id', studentContextId).single();
    if (child?.parentId !== senderId) return { allowed: false, reason: 'Not authorized for this child' };
    const ok = await hasActiveAssignment(studentContextId, receiverId)
      || await isScheduledWithTeacher(studentContextId, receiverId);
    return ok ? { allowed: true } : { allowed: false, reason: 'Child is not assigned to this teacher' };
  }

  if (sRole === 'teacher' && rRole === 'parent') {
    if (!studentContextId) return { allowed: false, reason: 'Child context required' };
    const { data: child } = await supabase.from('users').select('parentId').eq('id', studentContextId).single();
    if (child?.parentId !== receiverId) return { allowed: false, reason: 'Parent not linked to student' };
    const ok = await hasActiveAssignment(studentContextId, senderId)
      || await isScheduledWithTeacher(studentContextId, senderId);
    return ok ? { allowed: true } : { allowed: false, reason: 'No active assignment' };
  }

  if (sRole === 'admin' || sRole === 'super_admin' || rRole === 'admin' || rRole === 'super_admin') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Messaging not permitted between these roles' };
}

async function haveMessagedBefore(a: string, b: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('messages')
    .select('id')
    .or(`and(sender_id.eq.${a},receiver_id.eq.${b}),and(sender_id.eq.${b},receiver_id.eq.${a})`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function isScheduledWithTeacher(studentId: string, teacherId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase.from('users').select('id, email, schedule').eq('id', studentId).single();
  if (!data) return false;
  const { data: teacher } = await supabase.from('users').select('id, email').eq('id', teacherId).single();
  return getSchedule(data.schedule as string | ScheduleSlot[] | undefined).some((slot) =>
    slotBelongsToTeacher(slot, { id: teacherId, email: teacher?.email ? String(teacher.email) : undefined })
    || slot.teacherId === teacherId
  );
}

async function hasActiveAssignment(studentId: string, teacherId: string): Promise<boolean> {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('messaging_assignments')
    .select('id')
    .eq('student_id', studentId)
    .eq('teacher_id', teacherId)
    .eq('active', true)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function sendSecureMessage(options: {
  senderId: string;
  receiverId: string;
  content: string;
  studentContextId?: string;
}): Promise<{ success: boolean; message?: Record<string, unknown>; error?: string }> {
  const { senderId, receiverId, content, studentContextId } = options;

  if (!content.trim()) return { success: false, error: 'Message cannot be empty' };
  if (content.length > 4000) return { success: false, error: 'Message too long (max 4000 characters)' };

  const allowed = await canUsersMessage(senderId, receiverId, studentContextId);
  if (!allowed.allowed) return { success: false, error: allowed.reason };

  const withinLimit = await checkRateLimit(senderId);
  if (!withinLimit) return { success: false, error: 'Rate limit exceeded. Please wait a moment.' };

  const { text, filtered } = filterMessageContent(content);
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content: text,
      student_context_id: studentContextId || null,
      filtered,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('sendSecureMessage error:', error);
    return { success: false, error: 'Failed to send message' };
  }

  await notifyMessageRecipient(senderId, receiverId, text, studentContextId);

  return { success: true, message: data };
}

/** Admin broadcast / multi-recipient sends (service role — bypasses client RLS). */
export async function sendAdminBroadcast(options: {
  senderId: string;
  target: string;
  userIds?: string[];
  content: string;
}): Promise<{ success: boolean; error?: string; count?: number }> {
  const { senderId, target, userIds, content } = options;
  if (!content.trim()) return { success: false, error: 'Message cannot be empty' };

  const { text, filtered } = filterMessageContent(content);
  const supabase = getServiceClient();

  if (userIds?.length) {
    const rows = userIds.map((uid) => ({
      sender_id: senderId,
      receiver_id: uid,
      content: text,
      filtered,
    }));
    const { error } = await supabase.from('messages').insert(rows);
    if (error) {
      console.error('sendAdminBroadcast batch error:', error);
      return { success: false, error: 'Failed to send broadcast' };
    }
    return { success: true, count: rows.length };
  }

  const { error } = await supabase.from('messages').insert({
    sender_id: senderId,
    receiver_id: target,
    content: text,
    filtered,
  });
  if (error) {
    console.error('sendAdminBroadcast error:', error);
    return { success: false, error: 'Failed to send broadcast' };
  }
  return { success: true, count: 1 };
}

async function notifyMessageRecipient(
  senderId: string,
  receiverId: string,
  preview: string,
  studentContextId?: string
) {
  const supabase = getServiceClient();
  const { data: sender } = await supabase.from('users').select('name, role').eq('id', senderId).single();

  const recipientId = receiverId;
  if (receiverId === 'admin') {
    await sendNewMessageEmail(ADMIN_ALERT_EMAIL, sender?.name || 'User', preview.slice(0, 120));
    return;
  }

  const { data: recipient } = await supabase.from('users').select('email, name').eq('id', recipientId).single();
  if (recipient?.email) {
    const fromLabel = studentContextId
      ? `${sender?.name || 'Parent'} (regarding your child)`
      : sender?.name || 'Someone';
    await sendNewMessageEmail(recipient.email, fromLabel, preview.slice(0, 120));
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    try {
      const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://ilmversinstitute.com';
      await fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: cronSecret,
          title: 'New message',
          body: `${sender?.name || 'Someone'}: ${preview.slice(0, 80)}`,
          url: '/portal/inbox',
          userIds: [recipientId],
        }),
      });
    } catch (err) {
      console.error('Push notification failed:', err);
    }
  }
}

export async function flagMessage(
  messageId: string,
  reporterId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  if (!reason.trim()) return { success: false, error: 'Reason is required' };

  const supabase = getServiceClient();
  const { error } = await supabase.from('message_flags').insert({
    message_id: messageId,
    reporter_id: reporterId,
    reason: reason.trim(),
    status: 'open',
  });

  if (error) {
    console.error('flagMessage error:', error);
    return { success: false, error: 'Failed to submit report' };
  }

  await sendNewMessageEmail(
    ADMIN_ALERT_EMAIL,
    'Safeguarding Alert',
    `A message was reported: "${reason.trim()}". Review in Admin → Comms → Safeguarding.`
  );

  return { success: true };
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = getServiceClient();
  const { error } = await supabase.from('message_blocks').upsert(
    {
      blocker_id: blockerId,
      blocked_id: blockedId,
      reason: reason?.trim() || 'User requested block',
      status: 'active',
    },
    { onConflict: 'blocker_id,blocked_id' }
  );

  if (error) return { success: false, error: 'Failed to block user' };

  await sendNewMessageEmail(
    ADMIN_ALERT_EMAIL,
    'Block Request',
    `User ${blockerId} blocked ${blockedId}. Reason: ${reason || 'Not specified'}`
  );

  return { success: true };
}

export async function getOpenFlags() {
  const supabase = getServiceClient();
  const { data: flags } = await supabase
    .from('message_flags')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (!flags?.length) return [];

  const messageIds = flags.map(f => f.message_id);
  const { data: messages } = await supabase.from('messages').select('*').in('id', messageIds);
  const msgMap = new Map((messages || []).map(m => [m.id, m]));

  const userIds = new Set<string>();
  flags.forEach(f => userIds.add(f.reporter_id));
  (messages || []).forEach(m => {
    userIds.add(m.sender_id);
    userIds.add(m.receiver_id);
  });

  const { data: users } = await supabase.from('users').select('id, name, role').in('id', [...userIds]);
  const userMap = new Map((users || []).map(u => [u.id, u]));

  return flags.map(f => ({
    ...f,
    message: msgMap.get(f.message_id),
    reporterName: userMap.get(f.reporter_id)?.name || 'Unknown',
    senderName: userMap.get(msgMap.get(f.message_id)?.sender_id)?.name,
    receiverName: userMap.get(msgMap.get(f.message_id)?.receiver_id)?.name,
  }));
}

/** Receivers this user is allowed to mark as read / count as unread. */
export function readableReceiverIds(userId: string, role?: string): string[] {
  const ids = [userId];
  if (role === 'admin' || role === 'super_admin') ids.push('admin');
  ids.push('all_users');
  if (role === 'student' || role === 'parent') ids.push('all_students');
  if (role === 'teacher') ids.push('all_teachers');
  return [...new Set(ids)];
}

export async function markMessagesRead(options: {
  userId: string;
  role?: string;
  messageIds?: string[];
  markAll?: boolean;
}): Promise<{ success: boolean; updated: number; error?: string }> {
  const { userId, role, messageIds, markAll } = options;
  const supabase = getServiceClient();
  const allowed = readableReceiverIds(userId, role);

  let query = supabase.from('messages').update({ read: true }).eq('read', false).in('receiver_id', allowed);
  if (!markAll) {
    const ids = (messageIds || []).filter(Boolean);
    if (!ids.length) return { success: true, updated: 0 };
    query = query.in('id', ids);
  }

  const { data, error } = await query.select('id');
  if (error) {
    console.error('markMessagesRead error:', error);
    return { success: false, updated: 0, error: 'Failed to mark messages as read' };
  }
  return { success: true, updated: data?.length ?? 0 };
}

export async function getUnreadCount(userId: string, role?: string): Promise<number> {
  const supabase = getServiceClient();
  const allowed = readableReceiverIds(userId, role);
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('read', false)
    .in('receiver_id', allowed);
  if (error) {
    console.error('getUnreadCount error:', error);
    return 0;
  }
  return count ?? 0;
}

export async function resolveFlag(
  flagId: string,
  adminId: string,
  status: 'reviewed' | 'dismissed' | 'action_taken',
  adminNote?: string
) {
  const supabase = getServiceClient();
  await supabase
    .from('message_flags')
    .update({
      status,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_note: adminNote?.trim() || null,
    })
    .eq('id', flagId);
}
