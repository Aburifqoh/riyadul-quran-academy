'use client';

import type { UserData } from '@/types/user';

import { getErrorMessage } from '@/lib/errors';

import React, { useState, useEffect } from 'react';
import { fetchAllUsersParsed, USER_EMAIL_COLUMNS } from '@/lib/fetchAllUsers';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { getUserRole } from '@/lib/userDataHelpers';
import { Mail, Users, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { isSandboxAccount } from '@/lib/billing';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';

export default function AdminEmailDashboard() {
  const { userData, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserData[] | null>(null);
  const loading = users === null;
  const [selectedAudience, setSelectedAudience] = useState('all'); // 'all', 'students', 'teachers', 'custom'
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await fetchAllUsersParsed(USER_EMAIL_COLUMNS);
      if (cancelled) return;
      setUsers(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getRecipientEmails = () => {
    const live = (users ?? []).filter(u => !isSandboxAccount(u));
    if (selectedAudience === 'all') return live.map(u => u.email).filter(Boolean);
    if (selectedAudience === 'students') return live.filter(u => getUserRole(u.role) === 'student').map(u => u.email).filter(Boolean);
    if (selectedAudience === 'teachers') return live.filter(u => getUserRole(u.role) === 'teacher').map(u => u.email).filter(Boolean);
    return selectedEmails;
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails(prev => 
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipients = getRecipientEmails();
    
    if (recipients.length === 0) {
      setStatus({ type: 'error', msg: 'No recipients selected.' });
      return;
    }
    
    if (!subject.trim() || !message.trim()) {
      setStatus({ type: 'error', msg: 'Subject and message are required.' });
      return;
    }

    if (!confirm(`Are you sure you want to send this email to ${recipients.length} people?`)) return;

    setIsSending(true);
    setStatus(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          recipients,
          subject,
          htmlContent: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #FAF9F6; padding: 20px; text-align: center; border-bottom: 3px solid #004D4A;">
                <h2 style="color: #004D4A; margin: 0;">Ilmvers Institute</h2>
              </div>
              <div style="padding: 30px 20px; color: #333; line-height: 1.6;">
                ${message.replace(/\n/g, '<br/>')}
              </div>
              <div style="text-align: center; padding: 20px; font-size: 12px; color: #888; background-color: #f9f9f9;">
                This is an automated message from Ilmvers Administration.
              </div>
            </div>
          `
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to send email');

      setStatus({ type: 'success', msg: `Successfully sent ${recipients.length} emails!` });
      setSubject('');
      setMessage('');
      
    } catch (err: unknown) {
      setStatus({ type: 'error', msg: getErrorMessage(err) });
    } finally {
      setIsSending(false);
    }
  };

  const recipientCount = getRecipientEmails().length;

  if (authLoading) return <PortalSkeleton />;
  if (getUserRole(userData?.role) !== 'super_admin') {
    return <div className="p-10 text-center text-gray-500">Access denied. Super admin only.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto pb-10">
      <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
             <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 text-white flex items-center justify-center shadow-md">
                <Mail className="w-6 h-6" />
             </div>
             Mass Email Broadcaster
          </h2>
          <p className="text-gray-500 m-0">Send automated announcements or notifications to users.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COMPOSER */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
            
            {status?.type === 'success' && (
              <div className="mb-6 bg-green-50 text-green-700 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 border border-green-100">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{status.msg}</span>
              </div>
            )}

            {status?.type === 'error' && (
              <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-semibold flex items-start gap-3 border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{status.msg}</span>
              </div>
            )}

            <form onSubmit={handleSend} className="space-y-6">
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Select Audience</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { id: 'all', label: 'All Users' },
                    { id: 'students', label: 'Students Only' },
                    { id: 'teachers', label: 'Faculty Only' },
                    { id: 'custom', label: 'Custom List' }
                  ].map(aud => (
                    <button
                      key={aud.id}
                      type="button"
                      onClick={() => {
                        setSelectedAudience(aud.id);
                        if (aud.id !== 'custom') setSelectedEmails([]);
                      }}
                      className={cn(
                        "px-4 py-3 rounded-xl text-sm font-bold border transition-all",
                        selectedAudience === aud.id 
                          ? "bg-blue-50 border-blue-200 text-blue-700 shadow-sm" 
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      )}
                    >
                      {aud.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Subject Line</label>
                <input
                  type="text"
                  placeholder="e.g. Important Update: New Portal Features"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Message Body</label>
                <textarea
                  placeholder="Type your message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-medium min-h-[250px] resize-y"
                />
              </div>

              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
                <div className="text-sm font-medium text-blue-800">
                  Ready to send to <strong className="text-blue-900 text-lg">{recipientCount}</strong> recipients
                </div>
                <button
                  type="submit"
                  disabled={isSending || recipientCount === 0}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "rounded-full font-bold shadow-lg flex items-center gap-2",
                    isSending || recipientCount === 0 ? "opacity-50 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 hover:-translate-y-1 hover:shadow-xl text-white"
                  )}
                >
                  <Send className="w-5 h-5" />
                  {isSending ? "Sending..." : "Send Broadcast"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* AUDIENCE SELECTOR SIDEBAR */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col h-[600px] overflow-hidden sticky top-24">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-secondary flex items-center gap-2 m-0">
                <Users className="w-5 h-5 text-gray-400" />
                User Directory
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="p-8 text-center text-gray-400 font-medium">Loading users...</div>
              ) : (
                <ul className="m-0 p-0 list-none space-y-1">
                  {users.map(u => {
                    // Determine if this user is targeted
                    let isTargeted = false;
                    const sandbox = isSandboxAccount(u);
                    if (selectedAudience === 'all') isTargeted = !sandbox;
                    else if (selectedAudience === 'students' && getUserRole(u.role) === 'student') isTargeted = !sandbox;
                    else if (selectedAudience === 'teachers' && getUserRole(u.role) === 'teacher') isTargeted = !sandbox;
                    else if (selectedAudience === 'custom' && selectedEmails.includes(u.email ?? '')) isTargeted = true;

                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAudience('custom');
                            toggleEmailSelection(u.email ?? '');
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left",
                            isTargeted ? "bg-blue-50/50" : "hover:bg-gray-50"
                          )}
                        >
                          <div className="flex-1 overflow-hidden">
                            <div className="font-bold text-secondary text-sm truncate flex items-center gap-1.5">
                              <span className="truncate">{u.name || 'Unknown User'}</span>
                              <TestSeatBadge user={u} />
                            </div>
                            <div className="text-xs text-gray-500 truncate">{u.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                              {u.role}
                            </span>
                            <div className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center transition-colors",
                              isTargeted ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"
                            )}>
                              {isTargeted && <CheckCircle2 className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
