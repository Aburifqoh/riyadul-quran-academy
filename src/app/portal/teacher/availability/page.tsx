'use client';

import type { ScheduleSlot } from '@/types/content';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTeacherAvailability } from '@/lib/db';
import { getAvailabilitySlots } from '@/lib/userDataHelpers';
import { authFetch } from '@/lib/authFetch';
import { WHATSAPP_NUMBER } from '@/lib/utils';
import { TimeSelect } from '@/components/ui/TimeSelect';

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface AvailabilityRow {
  id: number;
  start: string;
  end: string;
  day: string;
}

export default function TeacherAvailability() {
  const { userData, refreshUserData } = useAuth();
  const [rows, setRows] = useState<AvailabilityRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [changeRequested, setChangeRequested] = useState(false);
  const availStatus = userData?.pendingAvailabilityUpdate?.status;
  const pendingAvailRequest = availStatus === 'pending';
  const rejectedAvailRequest = availStatus === 'rejected' || availStatus === 'expired';
  // SSR-safe: Intl.DateTimeFormat() resolves to the server's timezone
  // (e.g. "UTC" on Cloudflare Workers) during server render, which never
  // matches the teacher's actual browser timezone during client hydration --
  // computing it eagerly here caused a hydration mismatch (React error
  // #418). Default to the institute's base timezone (also loadAvailability's
  // own fallback below), then detect the real one client-side only, after
  // mount -- the async load of a saved userData.timezone (if any) below
  // still wins once it resolves, this is just the interim/no-saved-pref value.
  const [timezone, setTimezone] = useState('Africa/Lagos');
  const [detectedTimezone, setDetectedTimezone] = useState('Africa/Lagos');
  useEffect(() => {
    // React's documented fix for a server/client value mismatch, not the
    // derived-state anti-pattern this lint rule targets -- see HowItWorks.tsx.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetectedTimezone(tz);
    setTimezone(tz);
  }, []);
  const nextRowId = useRef(0);
  const canEdit = !locked || (!pendingAvailRequest && (rejectedAvailRequest || !changeRequested));

  const teacherKey = userData?.id || userData?.email || '';

  const loadAvailability = async () => {
    if (!teacherKey) return;
    const data = await getTeacherAvailability(teacherKey);
    if (!data) return;
    setLocked(data.locked);
    
    if (userData?.timezone) {
      setTimezone(userData.timezone);
    }
    
    const rejectedSlots = getAvailabilitySlots(userData?.pendingAvailabilityUpdate?.slots);
    const sourceSlots = (availStatus === 'rejected' || availStatus === 'expired') && rejectedSlots.length
      ? rejectedSlots
      : (data.slots || []);

    const groupedByDay: Record<string, string[]> = {};
    DAYS.forEach(d => groupedByDay[d] = []);
    
    sourceSlots.forEach((slot: ScheduleSlot) => {
      if (slot.day) groupedByDay[slot.day].push(slot.time ?? '');
    });

    const allRanges: AvailabilityRow[] = [];
    let rowId = 0;
    DAYS.forEach(day => {
      const ranges = slotsToRanges(groupedByDay[day]);
      ranges.forEach(r => {
        allRanges.push({ id: rowId++, start: r.start, end: r.end, day });
      });
    });
    nextRowId.current = rowId;
    
    setRows(allRanges.length > 0 ? allRanges : [{ id: 0, start: '06:30', end: '00:00', day: 'Monday' }]);
  };

  useEffect(() => {
    if (!teacherKey) return;
    let cancelled = false;
    (async () => {
      const data = await getTeacherAvailability(teacherKey);
      if (cancelled || !data) return;
      setLocked(data.locked);
      setChangeRequested(data.changeRequested);

      if (userData?.timezone) {
        setTimezone(userData.timezone);
      }

      const rejectedSlots = getAvailabilitySlots(userData?.pendingAvailabilityUpdate?.slots);
      const sourceSlots = (availStatus === 'rejected' || availStatus === 'expired') && rejectedSlots.length
        ? rejectedSlots
        : (data.slots || []);

      const groupedByDay: Record<string, string[]> = {};
      DAYS.forEach(d => groupedByDay[d] = []);

      sourceSlots.forEach((slot: ScheduleSlot) => {
        if (slot.day) groupedByDay[slot.day].push(slot.time ?? '');
      });

      const allRanges: AvailabilityRow[] = [];
      let rowId = 0;
      DAYS.forEach(day => {
        const ranges = slotsToRanges(groupedByDay[day]);
        ranges.forEach(r => {
          allRanges.push({ id: rowId++, start: r.start, end: r.end, day });
        });
      });
      nextRowId.current = rowId;

      setRows(allRanges.length > 0 ? allRanges : [{ id: 0, start: '06:30', end: '00:00', day: 'Monday' }]);
    })();
    return () => {
      cancelled = true;
    };
  }, [teacherKey, userData?.timezone, userData?.pendingAvailabilityUpdate, availStatus]);

  const addRow = () => {
    const id = nextRowId.current++;
    setRows([...rows, { id, start: '06:30', end: '00:00', day: 'Monday' }]);
  };

  const removeRow = (id: number) => {
    setRows(rows.filter(r => r.id !== id));
  };

  const updateRow = (id: number, field: string, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const persistAvailability = async (action: 'save' | 'request') => {
    const built = rangesToSlots(rows);
    if ('error' in built) {
      alert(built.error);
      return;
    }
    if (built.slots.length === 0) {
      alert('Add at least one working window before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await authFetch('/api/teacher/availability', {
        method: 'POST',
        body: JSON.stringify({ action, slots: built.slots, timezone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        alert(json.error || 'Failed to save schedule. Please try again.');
        return;
      }
      if (action === 'save') {
        alert('Availability saved and locked. Contact Admin to unlock.');
        setLocked(true);
      } else {
        alert('Availability change request submitted. An administrator will review it shortly.');
        setChangeRequested(true);
      }
      await refreshUserData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => persistAvailability('save');
  const handleRequestChange = () => persistAvailability('request');

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h2 className="text-3xl font-headers font-bold text-[#004D4A] m-0">Availability Schedule</h2>
          <p className="text-gray-500 m-0">Set your recurring weekly working hours.</p>
        </div>
        {locked && (
           <span className="bg-amber-50 text-amber-600 px-4 py-2 rounded-full text-xs font-bold border border-amber-100 flex items-center gap-2">
              <LockIcon /> Schedule Locked
           </span>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Timezone:</span>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={!canEdit}
          className="bg-gray-50 border border-gray-100 p-2 rounded-xl text-sm font-bold outline-none flex-1"
        >
          <option value="Africa/Lagos">Africa/Lagos (WAT)</option>
          <option value="Europe/London">Europe/London (GMT/BST)</option>
          <option value="Asia/Riyadh">Asia/Riyadh (AST)</option>
          <option value="America/New_York">America/New_York (EST/EDT)</option>
          <option value="America/Chicago">America/Chicago (CST/CDT)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="Asia/Kuala_Lumpur">Asia/Kuala_Lumpur (MYT)</option>
          <option value={detectedTimezone}>
            Auto ({detectedTimezone})
          </option>
        </select>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 shrink-0">
               <span className="text-[0.65rem] font-black uppercase tracking-widest text-gray-400">Day:</span>
               <select 
                  disabled={!canEdit}
                  value={row.day}
                  onChange={(e) => updateRow(row.id, 'day', e.target.value)}
                  className="bg-gray-50 border border-gray-100 p-2 rounded-xl text-sm font-bold outline-none"
               >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
               </select>
            </div>

            <div className="flex items-center gap-3 shrink-0">
               <span className="text-[0.65rem] font-black uppercase tracking-widest text-gray-400">From:</span>
               <TimeSelect
                  disabled={!canEdit}
                  value={row.start}
                  onChange={(time) => updateRow(row.id, 'start', time)}
                  className="bg-gray-50 border-gray-100 p-2 text-sm"
                  placeholder="From"
                  aria-label="Available from"
               />
            </div>

            <div className="flex items-center gap-3 shrink-0">
               <span className="text-[0.65rem] font-black uppercase tracking-widest text-gray-400">To:</span>
               <TimeSelect
                  disabled={!canEdit}
                  value={row.end}
                  onChange={(time) => updateRow(row.id, 'end', time)}
                  className="bg-gray-50 border-gray-100 p-2 text-sm"
                  placeholder="To"
                  aria-label="Available until"
               />
            </div>

            <div className="flex-1"></div>

            {canEdit && (
               <button onClick={() => removeRow(row.id)} className="text-red-400 hover:text-red-600 transition-colors">
                  <TrashIcon />
               </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-6">
          <button 
             onClick={addRow}
             className="px-6 py-3 bg-[#004D4A]/10 text-[#004D4A] rounded-2xl font-bold text-sm hover:bg-[#004D4A] hover:text-white transition-all"
          >
             + Add Day
          </button>
          {!locked && (
            <div className="flex gap-4">
               <button onClick={loadAvailability} className="px-6 py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm">Cancel</button>
               <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-3 bg-[#004D4A] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#004D4A]/20"
               >
                  {isSaving ? 'Saving...' : 'Save Schedule'}
               </button>
            </div>
          )}
        </div>
      )}
      
      {locked && (
         <div className="p-8 bg-gray-50 rounded-[32px] border border-gray-100 space-y-4">
            {pendingAvailRequest ? (
              <>
                <p className="text-sm text-amber-700 m-0 font-bold">Your availability change request is pending admin review.</p>
                <p className="text-xs text-gray-500 m-0">You will be notified once a decision is made.</p>
              </>
            ) : rejectedAvailRequest ? (
              <>
                <p className="text-sm text-red-600 m-0 font-bold">Your last availability change was not approved.</p>
                <p className="text-sm text-gray-600 m-0">{userData?.pendingAvailabilityUpdate?.rejectionNote || 'Please adjust your request and resubmit.'}</p>
                <button onClick={handleRequestChange} disabled={isSaving} className="px-6 py-2 bg-[#004D4A] text-white rounded-full text-xs font-bold">
                  {isSaving ? 'Submitting...' : 'Resubmit Change Request'}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 m-0">Your schedule is locked. Submit a change request for admin approval, or contact support.</p>
                <button onClick={handleRequestChange} disabled={isSaving} className="px-6 py-2 bg-[#004D4A] text-white rounded-full text-xs font-bold">
                  {isSaving ? 'Submitting...' : 'Request Schedule Change'}
                </button>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50 no-underline transition-all ml-2">WhatsApp Support</a>
              </>
            )}
         </div>
      )}
    </div>
  );
}

// HELPERS
function normalizeTime(t: string) {
  const parts = (t || '').trim().split(':');
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isEndOfDay(t: string) {
  const n = normalizeTime(t);
  return n === '00:00' || n === '24:00';
}

function timeToMin(t: string) {
  const n = normalizeTime(t);
  const [h, m] = n.split(':').map(Number);
  return h * 60 + m;
}

function rangesToSlots(rows: AvailabilityRow[]): { slots: ScheduleSlot[] } | { error: string } {
  const newGrid: Record<string, string[]> = {};
  DAYS.forEach(d => { newGrid[d] = []; });

  for (const r of rows) {
    const startMin = timeToMin(r.start);
    const endMin = isEndOfDay(r.end) ? 1440 : timeToMin(r.end);
    if (!Number.isFinite(startMin) || !Number.isFinite(endMin) || startMin >= endMin) {
      return { error: `Invalid range for ${r.day}. "To" must be later than "From" (use 12:00 AM for midnight).` };
    }
    for (let m = startMin; m < endMin; m += 30) {
      const timeStr = minToTime(m);
      if (!newGrid[r.day].includes(timeStr)) newGrid[r.day].push(timeStr);
    }
  }

  const slots: ScheduleSlot[] = [];
  DAYS.forEach(day => {
    newGrid[day].sort().forEach((timeStr: string) => {
      slots.push({ day, time: timeStr, isBooked: false });
    });
  });
  return { slots };
}

function minToTime(m: number) {
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

function slotsToRanges(slots: string[]) {
  if (slots.length === 0) return [];
  const minutes = slots.map(timeToMin).sort((a, b) => a - b);
  const ranges = [];
  let start = minutes[0];
  let end = minutes[0] + 30;

  for (let i = 1; i < minutes.length; i++) {
    if (minutes[i] === end) {
      end += 30;
    } else {
      ranges.push({ start: minToTime(start), end: end >= 1440 ? "00:00" : minToTime(end) });
      start = minutes[i];
      end = minutes[i] + 30;
    }
  }
  ranges.push({ start: minToTime(start), end: end >= 1440 ? "00:00" : minToTime(end) });
  return ranges;
}

function LockIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>; }
function TrashIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>; }
