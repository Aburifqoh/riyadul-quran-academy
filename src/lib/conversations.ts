import type { MessagingContact } from '@/types/messaging';
import { getUserRole } from '@/lib/userDataHelpers';

export interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  student_context_id?: string | null;
  filtered?: boolean;
}

export interface ConversationParty {
  id: string;
  name: string;
  role: string;
}

export interface ConversationSummary {
  threadKey: string;
  contactId: string;
  name: string;
  role: string;
  email?: string;
  studentContextId?: string;
  studentContextName?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  messageCount: number;
  participantLabel?: string;
  partyA?: ConversationParty;
  partyB?: ConversationParty;
}

const BROADCAST_IDS = new Set(['all_users', 'all_students', 'all_teachers']);

type UserLookup = Map<string, { name?: string; role?: string; email?: string }>;

function isAdminParty(id: string, adminIds: Set<string>): boolean {
  return id === 'admin' || adminIds.has(id);
}

function normalizeParty(id: string, adminIds: Set<string>): string {
  return isAdminParty(id, adminIds) ? 'admin' : id;
}

/** Stable key for a message thread (pair + optional child context). */
export function getThreadKey(msg: MessageRow, adminIds: Set<string>): string {
  const ctx = msg.student_context_id || '';
  const a = normalizeParty(msg.sender_id, adminIds);
  const b = normalizeParty(msg.receiver_id, adminIds);
  const pair = [a, b].sort();
  return `${pair[0]}:${pair[1]}:${ctx}`;
}

function resolveDisplayName(
  partyId: string,
  userMap: UserLookup,
  studentContextId?: string,
  studentContextName?: string
): { name: string; role: string; email?: string } {
  if (partyId === 'admin') {
    return { name: 'Ilmvers Administration', role: 'admin' };
  }
  const user = userMap.get(partyId);
  const baseName = user?.name || 'Unknown';
  if (studentContextId && studentContextName) {
    return {
      name: `${baseName} (re: ${studentContextName})`,
      role: user?.role || 'user',
      email: user?.email,
    };
  }
  return { name: baseName, role: user?.role || 'user', email: user?.email };
}

function primaryContactId(
  msg: MessageRow,
  adminIds: Set<string>,
  viewerId: string,
  viewerIsAdmin: boolean
): string {
  const sender = normalizeParty(msg.sender_id, adminIds);
  const receiver = normalizeParty(msg.receiver_id, adminIds);

  if (viewerIsAdmin) {
    if (sender === 'admin') return receiver;
    if (receiver === 'admin') return sender;
    return sender;
  }

  const viewerNorm = normalizeParty(viewerId, adminIds);
  if (sender === viewerNorm) return receiver;
  return sender;
}

function countUnread(
  messages: MessageRow[],
  viewerId: string,
  adminIds: Set<string>,
  viewerIsAdmin: boolean
): number {
  return messages.filter(m => {
    if (m.read) return false;
    if (viewerIsAdmin) {
      return m.receiver_id === 'admin' || m.receiver_id === viewerId || adminIds.has(m.receiver_id);
    }
    return m.receiver_id === viewerId;
  }).length;
}

export function buildConversationSummaries(options: {
  messages: MessageRow[];
  userMap: UserLookup;
  viewerId: string;
  viewerIsAdmin: boolean;
  adminIds: Set<string>;
  studentNames?: Map<string, string>;
}): ConversationSummary[] {
  const { messages, userMap, viewerId, viewerIsAdmin, adminIds, studentNames } = options;
  const buckets = new Map<string, MessageRow[]>();

  for (const msg of messages) {
    if (BROADCAST_IDS.has(msg.receiver_id) || BROADCAST_IDS.has(msg.sender_id)) continue;
    const a = normalizeParty(msg.sender_id, adminIds);
    const b = normalizeParty(msg.receiver_id, adminIds);
    if (a === b) continue;
    const key = getThreadKey(msg, adminIds);
    const list = buckets.get(key) || [];
    list.push(msg);
    buckets.set(key, list);
  }

  const summaries: ConversationSummary[] = [];

  for (const [threadKey, threadMessages] of buckets) {
    const sorted = [...threadMessages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const latest = sorted[sorted.length - 1];
    const ctx = latest.student_context_id || undefined;
    const ctxName = ctx ? studentNames?.get(ctx) : undefined;
    const contactId = primaryContactId(latest, adminIds, viewerId, viewerIsAdmin);
    const display = resolveDisplayName(contactId, userMap, ctx, ctxName);

    const senderNorm = normalizeParty(latest.sender_id, adminIds);
    const receiverNorm = normalizeParty(latest.receiver_id, adminIds);
    const partyA: ConversationParty = {
      id: senderNorm,
      name: senderNorm === 'admin' ? 'Administration' : (userMap.get(senderNorm)?.name || 'Unknown'),
      role: senderNorm === 'admin' ? 'admin' : (getUserRole(userMap.get(senderNorm)?.role) || 'user'),
    };
    const partyB: ConversationParty = {
      id: receiverNorm,
      name: receiverNorm === 'admin' ? 'Administration' : (userMap.get(receiverNorm)?.name || 'Unknown'),
      role: receiverNorm === 'admin' ? 'admin' : (getUserRole(userMap.get(receiverNorm)?.role) || 'user'),
    };
    const participantLabel = ctxName
      ? `${partyA.name} (${partyA.role}) ↔ ${partyB.name} (${partyB.role}) · re: ${ctxName}`
      : `${partyA.name} (${partyA.role}) ↔ ${partyB.name} (${partyB.role})`;

    summaries.push({
      threadKey,
      contactId,
      name: display.name,
      role: display.role,
      email: display.email,
      studentContextId: ctx,
      studentContextName: ctxName,
      lastMessage: latest.content,
      lastMessageAt: latest.created_at,
      unreadCount: countUnread(sorted, viewerId, adminIds, viewerIsAdmin),
      messageCount: sorted.length,
      participantLabel,
      partyA,
      partyB,
    });
  }

  return summaries.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );
}

function isAdminContact(role?: string, id?: string): boolean {
  const r = getUserRole(role);
  return id === 'admin' || r === 'admin' || r === 'super_admin';
}

export function mergeContactsWithConversations(
  contacts: MessagingContact[],
  conversations: ConversationSummary[]
): MessagingContact[] {
  const convByKey = new Map<string, ConversationSummary>();
  for (const c of conversations) {
    const key = isAdminContact(c.role, c.contactId)
      ? 'admin:'
      : `${c.contactId}:${c.studentContextId || ''}`;
    const existing = convByKey.get(key);
    if (!existing || new Date(c.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime()) {
      convByKey.set(key, { ...c, contactId: isAdminContact(c.role, c.contactId) ? 'admin' : c.contactId });
    }
  }

  const enriched = contacts.map(contact => {
    if (isAdminContact(contact.role, contact.id)) {
      const conv = convByKey.get('admin:');
      if (!conv) return { ...contact, id: 'admin', name: contact.name || 'Ilmvers Administration', role: 'admin' };
      return {
        ...contact,
        id: 'admin',
        role: 'admin',
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unread: (conv.unreadCount || 0) + (contact.unread || 0) || conv.unreadCount,
      };
    }
    const key = `${contact.id}:${contact.studentContextId || ''}`;
    const conv = convByKey.get(key);
    if (!conv) return contact;
    return {
      ...contact,
      lastMessage: conv.lastMessage,
      lastMessageAt: conv.lastMessageAt,
      unread: conv.unreadCount || contact.unread,
    };
  });

  const contactKeys = new Set(
    contacts.map(c => isAdminContact(c.role, c.id) ? 'admin:' : `${c.id}:${c.studentContextId || ''}`)
  );
  for (const conv of conversations) {
    if (isAdminContact(conv.role, conv.contactId)) continue;
    const key = `${conv.contactId}:${conv.studentContextId || ''}`;
    if (!contactKeys.has(key)) {
      enriched.push({
        id: conv.contactId,
        name: conv.name,
        role: conv.role,
        email: conv.email || '',
        studentContextId: conv.studentContextId,
        studentContextName: conv.studentContextName,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unread: conv.unreadCount,
      });
    }
  }

  const seenAdmin = new Set<string>();
  return enriched
    .filter(c => {
      if (!isAdminContact(c.role, c.id)) return true;
      if (seenAdmin.has('admin')) return false;
      seenAdmin.add('admin');
      return true;
    })
    .map(c => isAdminContact(c.role, c.id) ? { ...c, id: 'admin', role: 'admin', name: c.name || 'Ilmvers Administration' } : c)
    .sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (aTime !== bTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });
}

export function truncatePreview(text: string, max = 60): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export function formatConversationTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
