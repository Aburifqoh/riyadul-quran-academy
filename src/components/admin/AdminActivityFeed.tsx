'use client';


import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityEntry {
  id: string;
  actor_id: string;
  actor_role: string;
  action_type: string;
  target_type: string | null;
  summary: string;
  created_at: string;
  actor_name?: string;
}

const ACTION_TYPE_ICONS: Record<string, string> = {
  'student.schedule_changed': '\uD83D\uDCC5',
  'schedule.request_approved': '\u2705',
  'schedule.request_rejected': '\u274C',
  'schedule.requests_expired': '\u23F0',
  'student.enrolled': '\u2795',
  'student.removed': '\u2796',
  'teacher.assigned': '\uD83D\uDC68\u200D\uD83C\uDFEB',
  'teacher.unassigned': '\uD83D\uDC68\u200D\uD83C\uDFEB',
  'gallery.photo_uploaded': '\uD83D\uDDBC\uFE0F',
  'gallery.photo_approved': '\u2705',
  'gallery.photo_rejected': '\u274C',
  'live_class.cancelled': '\u26A0\uFE0F',
  'live_class.rescheduled': '\uD83D\uDD01',
  'user.permissions_changed': '\uD83D\uDD10',
  'user.created': '\uD83D\uDC64',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All activity' },
  { value: 'student', label: 'Students' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'gallery', label: 'Gallery' },
  { value: 'live_class', label: 'Live classes' },
  { value: 'user', label: 'Account & access changes' },
];

export function AdminActivityFeed() {
  const [entries, setEntries] = useState<ActivityEntry[] | null>(null);
  const loading = entries === null;
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let query = supabase
        .from('admin_activity_log')
        .select('id, actor_id, actor_role, action_type, target_type, summary, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filter !== 'all') {
        query = query.like('action_type', `${filter}.%`);
      }

      const { data, error } = await query;
      if (!cancelled) {
        setEntries(!error && data ? data : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 flex items-baseline justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Admin activity</h2>
          <p className="text-sm text-stone-500 mt-1">
            Key decisions admins have made with the access they have \u2014 not every click.
          </p>
        </div>

        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {FILTER_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-stone-400 text-center py-12">Loading\u2026</p>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-stone-200 bg-stone-50">
          <p className="text-sm text-stone-500">No activity recorded yet for this filter.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="flex items-start gap-3 p-3 rounded-xl border border-stone-200 bg-white"
            >
              <span className="text-lg leading-none mt-0.5">
                {ACTION_TYPE_ICONS[entry.action_type] || '\u2022'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-800">{entry.summary}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {entry.actor_role === 'super_admin' ? 'Super Admin' : 'Admin'}
                  {' \u00B7 '}
                  {new Date(entry.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
