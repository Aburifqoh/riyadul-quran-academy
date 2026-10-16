'use client';


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAllUsers as fetchAllUserRows, fetchNonAdminUsers, USER_CONTACT_COLUMNS } from '@/lib/fetchAllUsers';
import { authFetch } from '@/lib/authFetch';
import { supabase } from '@/lib/supabase';
import {
  buildConversationSummaries,
  formatConversationTime,
  getThreadKey,
  truncatePreview,
  type ConversationSummary,
  type MessageRow,
} from '@/lib/conversations';
import { getUserRole } from '@/lib/userDataHelpers';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { ShieldAlert, Send, Eye, MessageSquare, AlertTriangle, Radio, Users, User, Search, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWallClock } from '@/lib/timeFormat';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';

type RawMessage = MessageRow;
// Only the columns the UI actually renders — avoids transferring any extra
// message columns and keeps large threads snappy.
const MSG_COLS = 'id, sender_id, receiver_id, content, read, created_at, student_context_id, filtered';
type EnrichedMessage = RawMessage & { senderName: string; senderRole: string; receiverName: string; isFlagged: boolean; threadKey?: string; };
type UserContact = { id: string; name: string; role: string; email: string; lastMessage?: string; lastMessageAt?: string; unread?: number; studentContextId?: string; studentContextName?: string; };

type Tab = 'panopticon' | 'direct' | 'broadcast' | 'safeguarding';

type SafeguardFlag = {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
  reporterName?: string;
  senderName?: string;
  receiverName?: string;
  message?: { content?: string; sender_id?: string; receiver_id?: string };
};

export default function AdminCommunications() {
  const { userData, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('panopticon');
  const [globalMessages, setGlobalMessages] = useState<EnrichedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminId, setAdminId] = useState<string | null>(null);
  const [safeguardFlags, setSafeguardFlags] = useState<SafeguardFlag[]>([]);

  const [conversationThreads, setConversationThreads] = useState<ConversationSummary[]>([]);
  const [selectedThread, setSelectedThread] = useState<ConversationSummary | null>(null);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [allUsers, setAllUsers] = useState<UserContact[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserContact | null>(null);
  const [conversation, setConversation] = useState<RawMessage[]>([]);
  const [dmText, setDmText] = useState('');
  const [isSendingDm, setIsSendingDm] = useState(false);
  const [conversationSearch, setConversationSearch] = useState('');
  const [dmSearch, setDmSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserRef = useRef<UserContact | null>(null);
  const selectedThreadRef = useRef<ConversationSummary | null>(null);

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);

  useEffect(() => {
    selectedThreadRef.current = selectedThread;
  }, [selectedThread]);

  // Broadcast state
  const [broadcastTarget, setBroadcastTarget] = useState('all_users');
  const [selectedBroadcastUsers, setSelectedBroadcastUsers] = useState<string[]>([]);
  const [broadcastSearch, setBroadcastSearch] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const fetchSafeguardFlags = useCallback(async () => {
    try {
      const res = await authFetch('/api/messages/flags');
      if (res.ok) {
        const data = await res.json();
        setSafeguardFlags(data.flags || []);
      }
    } catch (err) {
      console.error('Failed to load safeguarding flags:', err);
    }
  }, []);

  const resolveSafeguardFlag = async (flagId: string, status: 'reviewed' | 'dismissed' | 'action_taken', note?: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch('/api/messages/flags', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ flagId, status, adminNote: note }),
    });
    await fetchSafeguardFlags();
  };

  const fetchGlobalMessages = useCallback(async (ids: Set<string>) => {
    const { data: msgs } = await supabase.from('messages').select(MSG_COLS).order('created_at', { ascending: false }).limit(500);
    const users = await fetchAllUserRows(USER_CONTACT_COLUMNS);

    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    if (msgs) {
      const lookup = new Map(
        users.map(u => [u.id as string, {
          name: String(u.name ?? 'Unknown'),
          role: getUserRole(u.role) || 'user',
          email: String(u.email ?? ''),
        }])
      );
      const enriched = msgs.map(m => {
        const sender = lookup.get(m.sender_id);
        const receiver = lookup.get(m.receiver_id);
        const receiverName = receiver?.name || (
          m.receiver_id === 'all_users' ? 'Broadcast (All Users)' :
          m.receiver_id === 'all_students' ? 'Broadcast (All Students)' :
          m.receiver_id === 'all_teachers' ? 'Broadcast (All Teachers)' :
          m.receiver_id === 'admin' ? 'Administration' : 'Unknown'
        );
        return {
          ...m,
          senderName: sender?.name || (m.sender_id === 'admin' ? 'Administration' : 'Unknown'),
          senderRole: sender?.role || (m.sender_id === 'admin' ? 'admin' : 'unknown'),
          receiverName,
          isFlagged: emailRegex.test(m.content) || phoneRegex.test(m.content) || urlRegex.test(m.content),
          threadKey: getThreadKey(m as RawMessage, ids),
        };
      });
      setGlobalMessages(enriched);
      setConversationThreads(buildConversationSummaries({
        messages: msgs as MessageRow[],
        userMap: lookup,
        viewerId: '',
        viewerIsAdmin: true,
        adminIds: ids,
      }));
    }
    setLoading(false);
  }, []);

  const fetchAllUsers = useCallback(async (currentAdminId?: string) => {
    const actAdminId = currentAdminId || adminId;
    try {
      const data = await fetchNonAdminUsers();
      if (data) {
        const unreadMap: Record<string, number> = {};
        if (actAdminId) {
          const { data: unreadData } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('read', false)
            .or(`receiver_id.eq.admin,receiver_id.eq.${actAdminId}`);
          
          if (unreadData) {
            unreadData.forEach(m => {
              unreadMap[m.sender_id] = (unreadMap[m.sender_id] || 0) + 1;
            });
          }
        }

        setAllUsers(data
          .filter(u => String(u.id) !== actAdminId)
          .map(u => ({
            id: String(u.id),
            name: String(u.name ?? ''),
            role: getUserRole(u.role) || 'user',
            email: String(u.email ?? ''),
            unread: unreadMap[String(u.id)] || 0,
          })));
      }
    } catch (err) {
      console.error(err);
    }
  }, [adminId]);

  const loadConversation = useCallback(async (userId: string, thread?: ConversationSummary | null) => {
    if (!adminId) return;

    if (thread) {
      const { data } = await supabase.from('messages').select(MSG_COLS).order('created_at', { ascending: true }).limit(500);
      if (data) {
        const threadMessages = (data as RawMessage[]).filter(m => getThreadKey(m, adminIds) === thread.threadKey);
        setConversation(threadMessages);
        const unread = threadMessages.filter(m => (m.receiver_id === adminId || m.receiver_id === 'admin') && !m.read).map(m => m.id);
        if (unread.length) {
          try {
            await authFetch('/api/messages/read', {
              method: 'POST',
              body: JSON.stringify({ messageIds: unread }),
            });
            window.dispatchEvent(new CustomEvent('messages-read'));
          } catch (err) {
            console.error(err);
          }
          setConversationThreads(prev => prev.map(t => t.threadKey === thread.threadKey ? { ...t, unreadCount: 0 } : t));
        }
      }
      return;
    }

    const { data } = await supabase.from('messages').select(MSG_COLS)
      .or(`and(sender_id.eq.${adminId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${adminId}),and(sender_id.eq.${userId},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
    if (data) {
      const seen = new Set<string>();
      setConversation((data as RawMessage[]).filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true; }));
      const unread = data.filter(m => (m.receiver_id === adminId || m.receiver_id === 'admin') && !m.read).map(m => m.id);
      if (unread.length) {
        try {
          await authFetch('/api/messages/read', {
            method: 'POST',
            body: JSON.stringify({ messageIds: unread }),
          });
          window.dispatchEvent(new CustomEvent('messages-read'));
        } catch (err) {
          console.error(err);
        }
        setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, unread: 0 } : u));
        setConversationThreads(prev => prev.map(t => t.contactId === userId ? { ...t, unreadCount: 0 } : t));
      }
    }
  }, [adminId, adminIds]);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentAdminId = session?.user?.id;
      if (currentAdminId) setAdminId(currentAdminId);

      const { data: allRows } = await supabase.from('users').select('id, role');
      const ids = new Set(
        (allRows || [])
          .filter(a => {
            const role = getUserRole(a.role);
            return role === 'admin' || role === 'super_admin';
          })
          .map(a => a.id as string)
      );
      setAdminIds(ids);

      await fetchGlobalMessages(ids);
      await fetchAllUsers(currentAdminId);
      await fetchSafeguardFlags();
    };
    void init();

    const channel = supabase.channel('admin:global:messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        const { data: allRows } = await supabase.from('users').select('id, role');
        const ids = new Set(
          (allRows || [])
            .filter(a => {
              const role = getUserRole(a.role);
              return role === 'admin' || role === 'super_admin';
            })
            .map(a => a.id as string)
        );
        void fetchGlobalMessages(ids);
        void fetchAllUsers();
        void fetchSafeguardFlags();
        const activeUser = selectedUserRef.current;
        const activeThread = selectedThreadRef.current;
        if (activeThread) void loadConversation(activeThread.contactId, activeThread);
        else if (activeUser) void loadConversation(activeUser.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchGlobalMessages, fetchAllUsers, fetchSafeguardFlags, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const handleSelectUser = (u: UserContact) => {
    setSelectedUser(u);
    setSelectedThread(null);
    loadConversation(u.id);
  };

  const handleSelectThread = (thread: ConversationSummary) => {
    setSelectedThread(thread);
    setSelectedUser(null);
    loadConversation(thread.contactId, thread);
  };

  const sendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || !selectedUser || !adminId) return;
    if (selectedUser.id === adminId || selectedUser.role === 'admin' || selectedUser.role === 'super_admin') {
      alert('You cannot message yourself or another admin here.');
      return;
    }
    setIsSendingDm(true);
    try {
      const res = await authFetch('/api/messages/send', {
        method: 'POST',
        body: JSON.stringify({ receiverId: selectedUser.id, content: dmText.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setConversation(prev => [...prev, data.message as RawMessage]);
      setDmText('');
      void fetchGlobalMessages(adminIds);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send message.');
    }
    setIsSendingDm(false);
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim() || !adminId) return;
    if (broadcastTarget === 'specific_users' && selectedBroadcastUsers.length === 0) {
      alert('Please select at least one user.');
      return;
    }

    setIsBroadcasting(true);
    try {
      const res = await authFetch('/api/messages/broadcast', {
        method: 'POST',
        body: JSON.stringify({
          target: broadcastTarget,
          userIds: broadcastTarget === 'specific_users' ? selectedBroadcastUsers : undefined,
          content: broadcastMsg.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send broadcast');
      setBroadcastMsg('');
      setSelectedBroadcastUsers([]);
      void fetchGlobalMessages(adminIds);
      alert(`Broadcast sent successfully${data.count ? ` (${data.count} recipient${data.count === 1 ? '' : 's'})` : ''}!`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send broadcast.');
    }
    setIsBroadcasting(false);
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const directoryUsers = allUsers.filter(u =>
    u.id !== adminId &&
    u.role !== 'admin' &&
    u.role !== 'super_admin' &&
    (u.name?.toLowerCase().includes(dmSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(dmSearch.toLowerCase()) ||
      u.role?.toLowerCase().includes(dmSearch.toLowerCase()))
  );
  const directoryTeachers = directoryUsers.filter(u => u.role === 'teacher');
  const directoryStudents = directoryUsers.filter(u => u.role === 'student');
  const directoryParents = directoryUsers.filter(u => u.role === 'parent');

  const filteredThreads = conversationThreads.filter(t =>
    t.participantLabel?.toLowerCase().includes(conversationSearch.toLowerCase()) ||
    t.name.toLowerCase().includes(conversationSearch.toLowerCase()) ||
    t.lastMessage.toLowerCase().includes(conversationSearch.toLowerCase())
  );

  const roleChip = (role?: string) => {
    const r = (role || 'user').toLowerCase();
    const color = r === 'teacher' ? 'bg-purple-100 text-purple-700' : r === 'parent' ? 'bg-green-100 text-green-700' : r === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';
    return <span className={cn('text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md', color)}>{r}</span>;
  };

  const flaggedCount = globalMessages.filter(m => m.isFlagged).length;
  const openSafeguardCount = safeguardFlags.length;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'panopticon', label: 'Conversations', icon: <Eye className="w-4 h-4" />, badge: flaggedCount || undefined },
    { id: 'safeguarding', label: 'Safeguarding', icon: <ShieldAlert className="w-4 h-4" />, badge: openSafeguardCount || undefined },
    { id: 'direct', label: 'Direct Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Radio className="w-4 h-4" /> },
  ];

  if (authLoading || loading) return <PortalSkeleton />;
  if (!hasPermission(userData, 'can_access_communications')) {
    return <div className="p-10 text-center text-gray-500">Access denied. Communications permission required.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border mb-4 uppercase tracking-widest bg-red-50 text-red-600 border-red-200">
          <ShieldAlert className="w-4 h-4" /> Admin Command Centre
        </span>
        <h2 className="text-2xl sm:text-4xl font-bold font-headers text-secondary m-0 leading-tight">Comms & Monitoring</h2>
        <p className="text-gray-500 mt-2">Watch institute conversations, message teachers and students, and send inbox broadcasts. You cannot message yourself.</p>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all relative shrink-0",
              activeTab === tab.id ? "bg-white text-secondary shadow-sm" : "text-gray-500 hover:text-secondary"
            )}
          >
            {tab.icon} {tab.label}
            {tab.badge ? (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {tab.badge > 9 ? '9+' : tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ── TAB: CONVERSATIONS (grouped per user/thread) ───────────────── */}
      {activeTab === 'panopticon' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col md:flex-row h-[700px] overflow-hidden">
          <div className={cn("w-full md:w-[340px] border-r border-gray-100 flex flex-col bg-gray-50/40", selectedThread ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-secondary m-0 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-red-500" /> All Conversations
                </h3>
                <span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-md border border-gray-200">
                  {conversationThreads.length}
                </span>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by either person..."
                  value={conversationSearch}
                  onChange={e => setConversationSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredThreads.length === 0 ? (
                <div className="text-center p-8 text-gray-400 text-sm font-medium">No conversations yet.</div>
              ) : filteredThreads.map(thread => (
                <button
                  key={thread.threadKey}
                  onClick={() => handleSelectThread(thread)}
                  className={cn(
                    "w-full text-left p-3 rounded-2xl transition-all mb-1 border",
                    selectedThread?.threadKey === thread.threadKey ? "bg-white border-blue-100 shadow-sm" : "border-transparent hover:bg-gray-100"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-2 items-start mb-1">
                        <div className="min-w-0">
                          <p className="font-bold text-secondary text-sm m-0 leading-snug">
                            {thread.partyA?.name || thread.name} {roleChip(thread.partyA?.role)}
                          </p>
                          <p className="text-xs text-gray-500 m-0 mt-1">
                            ↔ {thread.partyB?.name || 'Unknown'} {roleChip(thread.partyB?.role)}
                          </p>
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{formatConversationTime(thread.lastMessageAt)}</span>
                      </div>
                      <p className="text-xs text-gray-500 m-0 truncate">{truncatePreview(thread.lastMessage)}</p>
                      <p className="text-[10px] text-gray-400 m-0 mt-1">{thread.messageCount} message{thread.messageCount === 1 ? '' : 's'}</p>
                    </div>
                    {thread.unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">{thread.unreadCount}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className={cn("flex-1 flex flex-col", !selectedThread ? "hidden md:flex" : "flex")}>
            {!selectedThread ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                <div className="w-20 h-20 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Select a conversation</h3>
                <p className="text-gray-500 text-sm max-w-xs">Monitor-only. Each thread shows both people and their roles. Use Direct Messages if you need to contact someone.</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button onClick={() => { setSelectedThread(null); setSelectedUser(null); }} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-bold text-secondary m-0 text-sm flex flex-wrap items-center gap-1.5">
                      {selectedThread.partyA?.name || selectedThread.name} {roleChip(selectedThread.partyA?.role)}
                      <span className="text-gray-400 font-medium">↔</span>
                      {selectedThread.partyB?.name} {roleChip(selectedThread.partyB?.role)}
                    </h3>
                    <p className="text-xs text-gray-400 m-0 mt-1">
                      {selectedThread.messageCount} messages · viewing only
                    </p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-gray-50 text-gray-600 border border-gray-200 px-2 py-1 rounded-lg font-bold">
                      Monitor only
                    </span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FDF8F3]/20">
                  {conversation.map((msg, idx) => {
                    const sender = globalMessages.find(g => g.id === msg.id);
                    const fromAdmin = msg.sender_id === 'admin' || adminIds.has(msg.sender_id);
                    const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(conversation[idx - 1].created_at).getTime() > 300000;
                    return (
                      <div key={msg.id} className="flex flex-col items-stretch">
                        {showTime && (
                          <span className="text-[10px] font-bold text-gray-400 mb-1.5 px-2 uppercase tracking-wider text-center">
                            {new Date(msg.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        <div className={cn(
                          "rounded-2xl px-4 py-3 shadow-sm text-[15px] leading-relaxed",
                          fromAdmin ? "bg-red-50 border border-red-100" : "bg-white border border-gray-100",
                          sender?.isFlagged && "ring-2 ring-red-200"
                        )}>
                          <p className="text-[11px] font-bold text-gray-500 m-0 mb-1.5 flex flex-wrap items-center gap-1">
                            <span className="text-secondary">{sender?.senderName || 'Unknown'}</span>
                            {roleChip(sender?.senderRole)}
                            <span className="text-gray-400 font-medium">→</span>
                            <span className="text-secondary">{sender?.receiverName || 'Unknown'}</span>
                          </p>
                          <p className="m-0 text-secondary whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: SAFEGUARDING ───────────────────────────────────────────── */}
      {activeTab === 'safeguarding' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col min-h-[500px] overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-red-50/40">
            <h3 className="text-xl font-bold text-secondary flex items-center gap-2 m-0">
              <ShieldAlert className="w-5 h-5 text-red-500" /> Safeguarding Reports
            </h3>
            <p className="text-sm text-gray-500 m-0 mt-1">User-reported messages. Use one action only so the safety log stays consistent.</p>
            <ul className="text-xs text-gray-500 m-0 mt-3 space-y-1 list-disc pl-4">
              <li><strong>Action Taken</strong> — you did something (warned a user, removed content, escalated).</li>
              <li><strong>Reviewed</strong> — you looked into it and no action was needed.</li>
              <li><strong>Dismiss</strong> — not a genuine safety issue (spam, misclick, false report).</li>
            </ul>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {safeguardFlags.length === 0 ? (
              <div className="text-center p-12 text-gray-400 font-bold">No open safeguarding reports.</div>
            ) : safeguardFlags.map(flag => (
              <div key={flag.id} className="border border-red-100 bg-red-50/30 rounded-2xl p-5">
                <div className="flex flex-wrap justify-between gap-2 mb-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-red-600 m-0">Reported by {flag.reporterName}</p>
                    <p className="text-xs text-gray-500 m-0">{new Date(flag.created_at).toLocaleString()}</p>
                  </div>
                  <span className="text-xs font-bold bg-white border border-red-200 text-red-700 px-3 py-1 rounded-full uppercase">{flag.status}</span>
                </div>
                <p className="text-sm font-semibold text-secondary m-0 mb-2">Reason: {flag.reason}</p>
                {flag.message?.content && (
                  <blockquote className="text-sm text-gray-700 bg-white border border-gray-100 rounded-xl p-4 m-0 mb-3">
                    {flag.senderName} → {flag.receiverName}: {flag.message.content}
                  </blockquote>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => resolveSafeguardFlag(flag.id, 'action_taken', 'Reviewed and action taken')}
                    className="text-xs font-bold bg-red-600 text-white px-4 py-2 rounded-full"
                  >
                    Action Taken
                  </button>
                  <button
                    onClick={() => resolveSafeguardFlag(flag.id, 'reviewed', 'Reviewed — no further action')}
                    className="text-xs font-bold bg-white border border-gray-200 text-secondary px-4 py-2 rounded-full"
                    title="Looked into it; no action needed"
                  >
                    Reviewed
                  </button>
                  <button
                    onClick={() => resolveSafeguardFlag(flag.id, 'dismissed', 'Dismissed')}
                    className="text-xs font-bold bg-white border border-gray-200 text-gray-500 px-4 py-2 rounded-full"
                    title="Not a genuine safety issue"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TAB: DIRECT MESSAGES ────────────────────────────────────────── */}
      {activeTab === 'direct' && (
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex h-[700px]">
          {/* Sidebar */}
          <div className={cn("w-full md:w-[300px] border-r border-gray-100 flex flex-col bg-gray-50/40", selectedUser ? "hidden md:flex" : "flex")}>
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-blue-500" />
                <h3 className="font-bold text-secondary m-0">Directory</h3>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search teachers or students..."
                  value={dmSearch}
                  onChange={e => setDmSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {directoryUsers.length === 0 ? (
                <div className="text-center p-6 text-gray-400 text-sm font-medium">No users found.</div>
              ) : (
                <>
                  {([
                    { label: 'Teachers', items: directoryTeachers, color: 'bg-purple-500' },
                    { label: 'Students', items: directoryStudents, color: 'bg-blue-500' },
                    { label: 'Parents', items: directoryParents, color: 'bg-green-500' },
                  ] as const).map(group => (
                    group.items.length === 0 ? null : (
                      <div key={group.label} className="mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-3 mb-1 mt-2">{group.label}</p>
                        {group.items.map(u => (
                          <button
                            key={u.id}
                            onClick={() => handleSelectUser(u)}
                            className={cn(
                              "w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left mb-1",
                              selectedUser?.id === u.id ? "bg-blue-50 border border-blue-100" : "hover:bg-gray-100 border border-transparent"
                            )}
                          >
                            <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white text-sm", group.color)}>
                              {u.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-secondary text-sm truncate flex items-center gap-1.5">
                                <span className="truncate">{u.name}</span>
                                <TestSeatBadge user={u} />
                              </div>
                              <div className="text-xs text-gray-500 capitalize truncate">{u.role}{u.email ? ` · ${u.email}` : ''}</div>
                            </div>
                            {u.unread && u.unread > 0 ? (
                              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">{u.unread}</span>
                            ) : null}
                          </button>
                        ))}
                      </div>
                    )
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Conversation panel */}
          <div className={cn("flex-1 flex flex-col", !selectedUser ? "hidden md:flex" : "flex")}>
            {!selectedUser ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
                <div className="w-20 h-20 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-secondary mb-2">Select a teacher or student</h3>
                <p className="text-gray-500 text-sm max-w-xs">Message any user on the site except yourself or other admins. Teachers and students are listed separately.</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white shadow-sm z-10">
                  <button onClick={() => { setSelectedUser(null); setSelectedThread(null); }} className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className={cn("w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white",
                    selectedUser.role === 'teacher' ? 'bg-purple-500' : selectedUser.role === 'parent' ? 'bg-green-500' : 'bg-blue-500'
                  )}>
                    {selectedUser.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-secondary m-0 text-sm">{selectedUser.name}</h3>
                    <p className="text-xs text-gray-400 capitalize m-0">{selectedUser.role} · {selectedUser.email}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-red-50 text-red-600 border border-red-100 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" /> Admin View
                    </span>
                  </div>
                </div>

                {/* Security notice */}
                <div className="bg-amber-50 p-2.5 text-center border-b border-amber-100">
                  <p className="text-xs font-bold text-amber-700 m-0">All messages are securely logged. This is an official administrative channel.</p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FDF8F3]/20">
                  {conversation.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 bg-blue-50 text-blue-400 rounded-full flex items-center justify-center mb-3">
                        <Send className="w-7 h-7" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No messages yet. Start the conversation below.</p>
                    </div>
                  ) : (
                    <>
                      {conversation.map((msg, idx) => {
                        const isAdmin = msg.sender_id === adminId;
                        const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(conversation[idx - 1].created_at).getTime() > 300000;
                        return (
                          <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                            {showTime && (
                              <span className="text-[10px] font-bold text-gray-400 mb-1.5 px-2 uppercase tracking-wider">
                                {formatWallClock(msg.created_at)}
                              </span>
                            )}
                            <div className={cn(
                              "max-w-[75%] rounded-2xl px-4 py-3 shadow-sm text-[15px] leading-relaxed",
                              isAdmin ? "bg-red-600 text-white rounded-tr-sm" : "bg-white border border-gray-100 text-secondary rounded-tl-sm"
                            )}>
                              {msg.content}
                            </div>
                            {isAdmin && <span className="text-[10px] text-gray-400 mt-1 pr-1">Admin · {formatWallClock(msg.created_at)}</span>}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>

                {/* Composer */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={sendDirectMessage} className="flex gap-3">
                    <input
                      type="text"
                      value={dmText}
                      onChange={e => setDmText(e.target.value)}
                      placeholder={`Message ${selectedUser.name}...`}
                      className="flex-1 bg-gray-50 border border-gray-200 px-5 py-3.5 rounded-full focus:outline-none focus:border-red-400 focus:ring-4 focus:ring-red-50 transition-all text-sm"
                    />
                    <button
                      type="submit"
                      disabled={isSendingDm || !dmText.trim()}
                      className="bg-red-600 hover:bg-red-700 text-white w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
                    >
                      <Send className="w-5 h-5 -ml-0.5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: BROADCAST ──────────────────────────────────────────────── */}
      {activeTab === 'broadcast' && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center">
                <Radio className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-secondary m-0">In-App Broadcast</h3>
                <p className="text-sm text-gray-500 m-0">Send an official message to selected users instantly</p>
              </div>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Target Audience</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { value: 'all_users', label: 'All Users', icon: <Users className="w-5 h-5" /> },
                    { value: 'all_students', label: 'All Students', icon: <User className="w-5 h-5" /> },
                    { value: 'all_teachers', label: 'All Teachers', icon: <ShieldAlert className="w-5 h-5" /> },
                    { value: 'specific_users', label: 'Specific Users', icon: <MessageSquare className="w-5 h-5" /> },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBroadcastTarget(opt.value)}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-2xl border-2 transition-all font-bold text-sm text-center",
                        broadcastTarget === opt.value
                          ? "border-amber-400 bg-amber-50 text-amber-700"
                          : "border-gray-200 bg-white text-gray-500 hover:border-amber-200"
                      )}
                    >
                      {opt.icon} {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {broadcastTarget === 'specific_users' && (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
                  <div className="relative mb-3">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search to add users..."
                      value={broadcastSearch}
                      onChange={e => setBroadcastSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="max-h-[180px] overflow-y-auto space-y-1">
                    {([
                      { label: 'Teachers', items: allUsers.filter(u => u.role === 'teacher' && u.id !== adminId && u.name.toLowerCase().includes(broadcastSearch.toLowerCase())) },
                      { label: 'Students', items: allUsers.filter(u => u.role === 'student' && u.id !== adminId && u.name.toLowerCase().includes(broadcastSearch.toLowerCase())) },
                      { label: 'Parents', items: allUsers.filter(u => u.role === 'parent' && u.id !== adminId && u.name.toLowerCase().includes(broadcastSearch.toLowerCase())) },
                    ]).map(group => (
                      group.items.length === 0 ? null : (
                        <div key={group.label}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2 mt-2 mb-1">{group.label}</p>
                          {group.items.map(u => (
                            <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                                checked={selectedBroadcastUsers.includes(u.id)}
                                onChange={(e) => {
                                  if (e.target.checked) setSelectedBroadcastUsers(prev => [...prev, u.id]);
                                  else setSelectedBroadcastUsers(prev => prev.filter(id => id !== u.id));
                                }}
                              />
                              <div className="flex-1 text-sm font-medium text-secondary">{u.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{u.role}</div>
                            </label>
                          ))}
                        </div>
                      )
                    ))}
                  </div>
                  <div className="mt-3 text-xs font-bold text-gray-500">
                    {selectedBroadcastUsers.length} user(s) selected
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Message</label>
                <textarea
                  value={broadcastMsg}
                  onChange={e => setBroadcastMsg(e.target.value)}
                  placeholder="Type your official broadcast message here..."
                  className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-amber-50 focus:border-amber-400 outline-none min-h-[180px] resize-none font-medium text-sm"
                />
              </div>

              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-sm text-amber-800 font-medium flex gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>This lands in their main Secure Inbox immediately (the same inbox they use day-to-day). Use official language only.</span>
              </div>

              <button
                type="submit"
                disabled={isBroadcasting || !broadcastMsg.trim()}
                className="w-full py-4 rounded-full font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50 text-base"
              >
                <Radio className="w-5 h-5" />
                {isBroadcasting ? 'Broadcasting...' : 'Send Broadcast'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
