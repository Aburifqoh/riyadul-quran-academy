'use client';

import type { CommunityPost } from '@/types/content';

import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/permissions';
import { authFetch } from '@/lib/authFetch';
import { GalleryUpload } from '@/components/admin/GalleryUpload';
import { GalleryReviewQueue } from '@/components/admin/GalleryReviewQueue';
import CommunityPostComposer from '@/components/community/CommunityPostComposer';
import type { HealthCheck, HealthLevel, HealthReport } from '@/lib/systemHealth';
import { FileEditIcon, CheckIcon, XIcon, Eye, RefreshCw } from 'lucide-react';
import { formatWallClock } from '@/lib/timeFormat';

export default function AdminCMS() {
  const { userData } = useAuth();
  const [announcement, setAnnouncement] = useState("");
  const [isUpdatingAnnouncement, setIsUpdatingAnnouncement] = useState(false);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [pendingPosts, setPendingPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [postActionError, setPostActionError] = useState('');

  const loadPendingPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('community_posts')
      .select('id, title, content, body, author, date, category, coverImage, coverImageUrl, status')
      .eq('status', 'pending_approval')
      .order('date', { ascending: false });
    if (data && !error) setPendingPosts(data);
    else if (error) {
      const fallback = await supabase
        .from('community_posts')
        .select('id, title, content, author, date, status')
        .eq('status', 'pending_approval')
        .order('date', { ascending: false });
      if (fallback.data) setPendingPosts(fallback.data);
    }
    setLoadingPosts(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('community_posts')
        .select('id, title, content, body, author, date, category, coverImage, coverImageUrl, status')
        .eq('status', 'pending_approval')
        .order('date', { ascending: false });
      if (cancelled) return;
      if (data && !error) {
        setPendingPosts(data);
      } else if (error) {
        const fallback = await supabase
          .from('community_posts')
          .select('id, title, content, author, date, status')
          .eq('status', 'pending_approval')
          .order('date', { ascending: false });
        if (!cancelled && fallback.data) setPendingPosts(fallback.data);
      }
      if (!cancelled) setLoadingPosts(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'global_announcement')
        .single();
      if (cancelled) return;
      if (data?.value) {
        setAnnouncement(typeof data.value === 'string' ? data.value : JSON.stringify(data.value).replace(/^"|"$/g, ''));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const res = await authFetch('/api/admin/system-health');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Health check failed');
      setHealth(data as HealthReport);
      setHealthError('');
    } catch (err) {
      setHealthError(getErrorMessage(err) || 'Could not load system health');
    }
    setHealthLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch('/api/admin/system-health');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Health check failed');
        if (!cancelled) {
          setHealth(data as HealthReport);
          setHealthError('');
        }
      } catch (err) {
        if (!cancelled) setHealthError(getErrorMessage(err) || 'Could not load system health');
      }
      if (!cancelled) setHealthLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAnnouncement = async () => {
    setIsUpdatingAnnouncement(true);
    const { error } = await supabase
      .from('system_settings')
      .upsert({ key: 'global_announcement', value: JSON.stringify(announcement) }, { onConflict: 'key' });
    setIsUpdatingAnnouncement(false);
    if (error) {
      alert('Failed to update announcement: ' + getErrorMessage(error));
    } else {
      alert('Announcement updated successfully across all portals!');
    }
  };

  const approvePost = async (id: string) => {
    setPostActionError('');
    const { error } = await supabase.from('community_posts').update({ status: 'published' }).eq('id', id);
    if (error) {
      setPostActionError(getErrorMessage(error) || 'Could not approve this post.');
      return;
    }
    const post = pendingPosts.find((item) => item.id === id);
    void authFetch('/api/newsletter/broadcast', {
      method: 'POST',
      body: JSON.stringify({
        id,
        title: post?.title || 'New update from Ilmvers',
        excerpt: (post?.body || post?.content || '').slice(0, 280),
      }),
    }).catch((err: unknown) => console.warn('Newsletter broadcast skipped:', getErrorMessage(err)));
    setPendingPosts(prev => prev.filter(p => p.id !== id));
    setPreviewId(null);
  };

  const rejectPost = async (id: string) => {
    setPostActionError('');
    const { error } = await supabase.from('community_posts').update({ status: 'rejected' }).eq('id', id);
    if (error) {
      setPostActionError(getErrorMessage(error) || 'Could not reject this post.');
      return;
    }
    setPendingPosts(prev => prev.filter(p => p.id !== id));
    setPreviewId(null);
  };

  if (!hasPermission(userData, 'can_manage_cms_gallery')) {
     return <div className="p-10 text-center text-gray-500">Access Denied. CMS permission required.</div>;
  }

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-headers font-bold text-gray-900 m-0">Content Management</h2>
        <p className="text-gray-500 m-0">Control institutional messaging and public-facing content.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-xl font-headers font-bold text-gray-900 m-0">Global Announcement</h3>
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Dashboard Ticker Text</label>
               <textarea 
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  className="w-full p-5 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 h-32 text-sm leading-relaxed"
                  placeholder="Type an announcement..."
               />
               <button 
                  onClick={updateAnnouncement}
                  disabled={isUpdatingAnnouncement}
                  className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold text-sm shadow-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
               >
                  {isUpdatingAnnouncement ? 'Updating...' : 'Update All Portals'}
               </button>
            </div>
         </section>
 
         <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-start justify-between gap-4">
               <div>
                  <h3 className="text-xl font-headers font-bold text-gray-900 m-0">System Integrity</h3>
                  <p className="text-xs text-gray-400 m-0 mt-1">
                    {health?.checkedAt
                      ? `Live probes · ${formatWallClock(health.checkedAt)}`
                      : healthLoading ? 'Running live probes…' : 'Not checked yet'}
                  </p>
               </div>
               <button
                  type="button"
                  onClick={() => {
                    setHealthLoading(true);
                    void loadHealth();
                  }}
                  disabled={healthLoading}
                  className="shrink-0 px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
               >
                  <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                  Recheck
               </button>
            </div>
            {healthError && <p className="text-sm font-bold text-red-600 m-0">{healthError}</p>}
            <div className="grid grid-cols-3 gap-3">
               <SummaryChip label="Healthy" value={health?.summary.ok ?? '—'} tone="emerald" />
               <SummaryChip label="Warnings" value={health?.summary.warn ?? '—'} tone="amber" />
               <SummaryChip label="Failures" value={health?.summary.error ?? '—'} tone="red" />
            </div>
            <p className="text-xs text-gray-400 m-0">
              Live probes of the database, classroom proxy, payments, email, AI, storage, and cron jobs. Secrets are never shown.
            </p>
         </section>
      </div>

      <section className="bg-white p-8 md:p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-6">
         <div>
            <h3 className="text-xl font-headers font-bold text-gray-900 m-0">Live service checks</h3>
            <p className="text-sm text-gray-500 m-0 mt-1">Keys, connectivity, and critical tables. Secrets are never shown.</p>
         </div>
         {healthLoading && !health ? (
            <p className="text-sm text-gray-400">Checking database, classroom proxy, payments, email, AI, and jobs…</p>
         ) : (
            <div className="space-y-8">
               {['Core', 'Classroom', 'AI', 'Comms', 'Security', 'Jobs', 'Billing'].map(group => {
                  const items = (health?.checks || []).filter(c => c.group === group);
                  if (!items.length) return null;
                  return (
                    <div key={group}>
                       <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{group}</p>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {items.map(item => <HealthRow key={item.id} check={item} />)}
                       </div>
                    </div>
                  );
               })}
            </div>
         )}
      </section>

      <section className="space-y-4">
         <div>
            <h3 className="text-2xl font-headers font-bold text-gray-900 m-0">Write a Community Post</h3>
            <p className="text-sm text-gray-500 m-0 mt-1">Publish directly to the public Community page and Journal. Teachers still submit for your review below.</p>
         </div>
         <CommunityPostComposer
            authorName={userData?.name || 'Ilmvers Admin'}
            authorId={userData?.id}
            publishImmediately
            onSuccess={() => void loadPendingPosts()}
         />
      </section>

      <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
         <div className="mb-6 flex items-baseline justify-between border-b border-gray-100 pb-4">
            <h3 className="text-xl font-headers font-bold text-gray-900 m-0 flex items-center gap-2">
               <FileEditIcon className="w-5 h-5 text-amber-500" /> Pending Community Posts
            </h3>
            <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
              {pendingPosts.length} pending
            </span>
         </div>

         {postActionError && (
           <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">{postActionError}</div>
         )}
         
         {loadingPosts ? (
           <p className="text-sm text-gray-400 text-center py-10">Loading pending posts...</p>
         ) : pendingPosts.length === 0 ? (
           <div className="text-center py-10 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-sm text-gray-500">No posts waiting for review.</p>
           </div>
         ) : (
           <div className="space-y-4">
             {pendingPosts.map(post => {
                const rawHtml = post.body || post.content || '';
                const plainText = rawHtml.replace(/<[^>]*>?/gm, '');
                const snippet = plainText.length > 150 ? plainText.substring(0, 150) + '...' : plainText;
                const cover = post.coverImageUrl || post.coverImage;
                const isOpen = previewId === post.id;

                return (
                  <div key={post.id} className="p-6 rounded-2xl border border-gray-100 bg-gray-50">
                     <div className="flex flex-col md:flex-row gap-6 items-start">
                        {cover && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={cover} alt="" className="w-full md:w-40 h-28 object-cover rounded-xl border border-gray-100" />
                        )}
                        <div className="flex-1 min-w-0">
                           <h4 className="text-lg font-bold text-gray-900 mb-1">{post.title}</h4>
                           <p className="text-xs text-gray-500 mb-3">
                             By {post.author} on {post.date ? new Date(post.date).toLocaleDateString() : '—'}
                             {post.category ? ` · ${post.category}` : ''}
                           </p>
                           <p className="text-sm text-gray-600 line-clamp-3">{snippet || 'No preview text.'}</p>
                        </div>
                        <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto">
                           <button
                             type="button"
                             onClick={() => setPreviewId(isOpen ? null : post.id)}
                             className="flex-1 md:w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                           >
                             <Eye className="w-4 h-4" /> {isOpen ? 'Hide' : 'Preview'}
                           </button>
                           <button 
                             onClick={() => approvePost(post.id)}
                             className="flex-1 md:w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                           >
                             <CheckIcon className="w-4 h-4" /> Approve
                           </button>
                           <button 
                             onClick={() => rejectPost(post.id)}
                             className="flex-1 md:w-full px-4 py-2.5 bg-white border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-gray-700 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                           >
                             <XIcon className="w-4 h-4" /> Reject
                           </button>
                        </div>
                     </div>
                     {isOpen && (
                       <div
                         className="mt-5 bg-white rounded-2xl border border-gray-100 p-6 prose prose-sm max-w-none"
                         dangerouslySetInnerHTML={{ __html: rawHtml }}
                       />
                     )}
                  </div>
                );
             })}
           </div>
         )}
      </section>

      <section className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm space-y-10">
         <div>
            <h3 className="text-2xl font-headers font-bold text-gray-900 mb-2">Community Gallery Manager</h3>
            <p className="text-sm text-gray-500">Upload photos or review pending uploads from admins.</p>
         </div>

         <div className="border-b border-gray-100 pb-10">
            <GalleryUpload adminId={userData?.id || ''} />
         </div>
         
         <div className="pt-4">
            <GalleryReviewQueue superAdminId={userData?.id || ''} />
         </div>
      </section>

      <section className="bg-gray-50 p-10 rounded-[48px] border border-gray-100">
         <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
               <h4 className="text-xl font-headers font-bold text-gray-900 m-0">Institutional Backup</h4>
               <p className="text-sm text-gray-500 m-0">Download a full snapshot of the database for archival purposes.</p>
            </div>
            <button className="px-8 py-4 bg-white border border-gray-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 transition-all">
               Generate Snapshot (JSON)
            </button>
         </div>
      </section>
    </div>
  );
}

function toneFor(status: HealthLevel) {
  if (status === 'ok') return { dot: 'bg-emerald-500', label: 'Healthy', chip: 'text-emerald-700 bg-emerald-50' };
  if (status === 'warn') return { dot: 'bg-amber-500', label: 'Warning', chip: 'text-amber-700 bg-amber-50' };
  return { dot: 'bg-red-500', label: 'Failure', chip: 'text-red-700 bg-red-50' };
}

function SummaryChip({ label, value, tone }: { label: string; value: number | string; tone: 'emerald' | 'amber' | 'red' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    amber: 'bg-amber-50 text-amber-800 border-amber-100',
    red: 'bg-red-50 text-red-800 border-red-100',
  }[tone];
  return (
    <div className={`rounded-2xl border px-3 py-3 text-center ${cls}`}>
      <p className="text-2xl font-black m-0">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest m-0 mt-1 opacity-70">{label}</p>
    </div>
  );
}

function HealthRow({ check }: { check: HealthCheck }) {
  const tone = toneFor(check.status);
  return (
    <div className="flex items-start justify-between gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-gray-800">{check.title}</span>
          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${tone.chip}`}>{tone.label}</span>
        </div>
        <p className="text-xs text-gray-500 m-0 mt-1 leading-relaxed">{check.detail}</p>
      </div>
      {typeof check.latencyMs === 'number' && (
        <span className="text-[10px] font-bold text-gray-400 shrink-0">{check.latencyMs}ms</span>
      )}
    </div>
  );
}
