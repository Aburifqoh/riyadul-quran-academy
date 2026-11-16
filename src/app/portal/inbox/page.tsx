'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { getTeacherStudents } from '@/lib/db';
import { Search, Send, ShieldAlert, User, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import PortalSkeleton from '@/components/ui/PortalSkeleton';

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

type Contact = {
  id: string;
  name: string;
  role: string;
  email: string;
  unread?: number;
};

export default function InboxPage() {
  const { user, userData, loading } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && userData) {
      loadContacts();
    }
  }, [user, userData]);

  useEffect(() => {
    if (activeContact) {
      loadMessages(activeContact.id);
      
      const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin';
      const myId = isAdmin ? 'admin' : user?.id;

      // Subscribe to new messages
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages',
          }, 
          (payload) => {
            const newMsg = payload.new as Message;
            const isForMe = newMsg.receiver_id === myId || newMsg.receiver_id === user?.id;
            const isFromActive = newMsg.sender_id === activeContact.id;
            if (isForMe && isFromActive) {
              setMessages(prev => [...prev, newMsg]);
              markAsRead(newMsg.id);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [activeContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadContacts = async () => {
    if (!user || !userData) return;
    
    let allowedContacts: Contact[] = [];
    
    // Admins are always available to everyone
    const adminContact: Contact = { id: 'admin', name: "Ilmvers Administration", role: 'admin', email: 'admin@ilmversinstitute.com' };

    if (userData.role === 'student' || userData.role === 'parent') {
      // Students can only message their assigned teachers and Admin
      const teachers = new Map();
      (userData.schedule || []).forEach((s: any) => {
        if (s.teacherId && !teachers.has(s.teacherId)) {
          teachers.set(s.teacherId, {
            id: s.teacherId,
            name: s.teacherName || 'Instructor',
            role: 'teacher',
            email: s.teacherEmail || ''
          });
        }
      });
      allowedContacts = [adminContact, ...Array.from(teachers.values())];
    } 
    else if (userData.role === 'teacher') {
      // Teachers can message Admin and their assigned students
      const students = await getTeacherStudents(userData.email);
      const studentContacts: Contact[] = students.map(s => ({
        id: s.id,
        name: s.name || 'Student',
        role: s.role || 'student',
        email: s.email || ''
      }));
      allowedContacts = [adminContact, ...studentContacts];
    }
    else if (userData.role === 'admin' || userData.role === 'super_admin') {
      // Admin sees everyone (this will be handled differently in the admin communications dashboard, 
      // but for basic inbox, we can just load everyone or a specific list)
      const { data, error } = await supabase.from('users').select('id, name, role, email');
      if (error) {
        console.error('Error loading inbox contacts:', error);
      }
      if (data) {
        allowedContacts = data.map(d => ({
          id: d.id,
          name: d.name || 'User',
          role: d.role || 'student',
          email: d.email || ''
        }));
      }
    }

    // Fetch unread messages count grouped by sender
    try {
      const { data: unreadData } = await supabase
        .from('messages')
        .select('sender_id')
        .eq('read', false)
        .eq('receiver_id', user.id);

      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .or('role.eq."admin",role.eq."super_admin"');
      const adminIds = new Set(admins?.map(a => a.id) || []);

      const unreadMap: Record<string, number> = {};
      if (unreadData) {
        unreadData.forEach(m => {
          const sender = adminIds.has(m.sender_id) ? 'admin' : m.sender_id;
          unreadMap[sender] = (unreadMap[sender] || 0) + 1;
        });
      }

      const contactsWithUnread = allowedContacts.map(c => ({
        ...c,
        unread: unreadMap[c.id] || 0
      }));

      setContacts(contactsWithUnread);
    } catch (err) {
      console.error('Error fetching contact unread counts:', err);
      setContacts(allowedContacts);
    }
  };

  const loadMessages = async (contactId: string) => {
    if (!user?.id) return;

    const isAdmin = userData?.role === 'admin' || userData?.role === 'super_admin';
    const myId = isAdmin ? 'admin' : user.id;

    // Get admin IDs if we need to load conversation with 'admin'
    let adminIds = new Set<string>();
    if (contactId === 'admin') {
      try {
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .or('role.eq."admin",role.eq."super_admin"');
        adminIds = new Set(admins?.map(a => a.id) || []);
      } catch (err) {
        console.error(err);
      }
    }

    let orFilter = '';
    if (contactId === 'admin') {
      orFilter = `and(sender_id.eq.${user.id},receiver_id.eq.admin),and(sender_id.eq.admin,receiver_id.eq.${user.id})`;
      adminIds.forEach(adminId => {
        orFilter += `,and(sender_id.eq.${user.id},receiver_id.eq.${adminId}),and(sender_id.eq.${adminId},receiver_id.eq.${user.id})`;
      });
    } else {
      orFilter = `and(sender_id.eq.${myId},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${myId}),and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`;
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(orFilter)
      .order('created_at', { ascending: true });

    if (data && !error) {
      // Deduplicate by id in case overlapping OR clauses return duplicates
      const seen = new Set<string>();
      const unique = (data as Message[]).filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      });
      setMessages(unique);
      
      // Mark unread messages as read (both targeting uid and 'admin')
      const unreadIds = unique.filter(m => (m.receiver_id === user.id || m.receiver_id === 'admin') && !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        unreadIds.forEach(id => markAsRead(id));
        setContacts(prev => prev.map(c => c.id === contactId ? { ...c, unread: 0 } : c));
      }
    }
  };

  const markAsRead = async (messageId: string) => {
    await supabase.from('messages').update({ read: true }).eq('id', messageId);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact || !user?.id) return;

    setIsSending(true);
    const msgData = {
      sender_id: user.id,
      receiver_id: activeContact.id,
      content: newMessage.trim()
    };

    const { data, error } = await supabase.from('messages').insert([msgData]).select().single();
    
    if (data && !error) {
      setMessages(prev => [...prev, data as Message]);
      setNewMessage('');
    } else {
      alert("Failed to send message.");
    }
    setIsSending(false);
  };

  if (loading) return <PortalSkeleton />;

  return (
    <div className="max-w-7xl mx-auto h-[calc(100dvh-170px)] lg:h-[calc(100vh-120px)] pb-2 flex flex-col">
      <div className="mb-4 lg:mb-6 hidden md:block">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0">Secure Communications</h2>
        <p className="text-gray-500 m-0">Communicate directly with your assigned instructors and administration.</p>
      </div>

      <div className="flex-1 bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden flex flex-col md:flex-row">
        
        {/* SIDEBAR */}
        <div className={cn("w-full md:w-[320px] border-r border-gray-100 flex-col bg-gray-50/30", activeContact ? "hidden md:flex" : "flex")}>
          <div className="p-6 border-b border-gray-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search contacts..." 
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {contacts
              .filter(c => c.name.toLowerCase().includes(contactSearch.toLowerCase()))
              .map(contact => (
              <button
                key={contact.id}
                onClick={() => setActiveContact(contact)}
                className={cn(
                  "w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left mb-1",
                  activeContact?.id === contact.id 
                    ? "bg-blue-50 border border-blue-100 shadow-sm" 
                    : "hover:bg-gray-100 border border-transparent"
                )}
              >
                <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg text-white shadow-sm" style={{ backgroundColor: contact.role === 'admin' ? '#ef4444' : '#3b82f6' }}>
                  {contact.role === 'admin' ? <ShieldAlert className="w-6 h-6" /> : contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-secondary text-sm truncate">{contact.name}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wider font-bold truncate mt-0.5">{contact.role}</div>
                </div>
                {contact.unread && contact.unread > 0 ? (
                  <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0">
                    {contact.unread}
                  </span>
                ) : null}
              </button>
            ))}
            {contacts.length === 0 && (
              <div className="text-center p-6 text-gray-400 font-medium text-sm">
                No active contacts found.
              </div>
            )}
          </div>
        </div>

        {/* CHAT AREA */}
        <div className={cn("flex-1 flex-col bg-white min-h-0", !activeContact ? "hidden md:flex" : "flex")}>
          {activeContact ? (
            <>
              {/* Chat Header */}
              <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-white shadow-sm z-10 relative">
                <div className="flex items-center gap-4">
                   <button onClick={() => setActiveContact(null)} className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
                     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                   </button>
                   <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm" style={{ backgroundColor: activeContact.role === 'admin' ? '#ef4444' : '#3b82f6' }}>
                     {activeContact.role === 'admin' ? <ShieldAlert className="w-5 h-5" /> : activeContact.name.charAt(0)}
                   </div>
                   <div>
                     <h3 className="font-bold text-secondary m-0 leading-tight">{activeContact.name}</h3>
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">Verified {activeContact.role}</p>
                   </div>
                </div>
              </div>

              {/* Security Banner */}
              <div className="bg-amber-50 p-2 md:p-3 text-center border-b border-amber-100 shrink-0">
                <p className="text-[10px] md:text-xs font-bold text-amber-700 m-0 flex items-center justify-center gap-2">
                   <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4" /> 
                   Messages securely monitored by Administration.
                </p>
              </div>

              {/* Messages View */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#FAF9F6]/30 min-h-0">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                      <Send className="w-8 h-8 ml-1" />
                    </div>
                    <h4 className="font-bold text-secondary mb-2">No messages yet</h4>
                    <p className="text-sm text-gray-500">Send a message to start the conversation.</p>
                  </div>
                ) : (
                  <div className="space-y-4 md:space-y-6">
                    {messages.map((msg, idx) => {
                      const isMe = msg.sender_id === user?.id;
                      const showTime = idx === 0 || new Date(msg.created_at).getTime() - new Date(messages[idx-1].created_at).getTime() > 300000; // 5 mins
                      
                      return (
                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showTime && (
                            <span className="text-[10px] font-bold text-gray-400 mb-1.5 px-2 uppercase tracking-wider">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          <div className={cn(
                            "max-w-[85%] md:max-w-[70%] rounded-2xl p-3 md:p-4 shadow-sm relative group",
                            isMe 
                              ? "bg-blue-600 text-white rounded-tr-sm" 
                              : "bg-white border border-gray-100 text-secondary rounded-tl-sm"
                          )}>
                            <p className="m-0 whitespace-pre-wrap leading-relaxed text-[14px] md:text-[15px]">{msg.content}</p>
                            
                            {isMe && (
                              <div className="absolute bottom-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <CheckCircle2 className={cn("w-3 h-3", msg.read ? "text-blue-200" : "text-blue-400")} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Composer */}
              <div className="p-3 md:p-4 bg-white border-t border-gray-100 shrink-0">
                <form onSubmit={sendMessage} className="flex gap-2 md:gap-3 max-w-4xl mx-auto">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type securely..."
                    className="flex-1 bg-gray-50 border border-gray-200 px-4 py-3 md:px-5 md:py-4 rounded-full focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base"
                  />
                  <button 
                    type="submit" 
                    disabled={isSending || !newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center flex-shrink-0 shadow-md transition-transform hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Send className="w-4 h-4 md:w-5 md:h-5 -ml-0.5 md:-ml-1" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/50">
               <div className="w-24 h-24 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-6">
                 <User className="w-10 h-10 text-gray-300" />
               </div>
               <h3 className="text-2xl font-bold font-headers text-secondary mb-2">Select a Conversation</h3>
               <p className="text-gray-500 max-w-sm">Choose a contact from the sidebar to view your secure messaging history or start a new conversation.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
