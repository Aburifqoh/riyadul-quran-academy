'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDayAtTime } from '@/lib/timeFormat';
import { convertSlotToTimezone, readBrowserTimezone } from '@/lib/timezoneUtils';
import { getSchedule } from '@/lib/userDataHelpers';
import type { ScheduleSlot } from '@/types/content';
import type { UserData } from '@/types/user';

export default function ParentChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerTz, setViewerTz] = useState('');

  useEffect(() => {
    setViewerTz(readBrowserTimezone());
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data: kids } = await supabase
          .from('users')
          .select('*')
          .eq('parentId', user.id);
        setChildren(kids || []);
      } catch (err) {
        console.error('Error fetching children:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="animate-pulse bg-slate-100 rounded-2xl h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">My Children</h2>
        <p className="text-slate-500 mt-1">View each child&apos;s schedule, plan, and enrolment status.</p>
      </div>

      {children.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-500 font-medium">No children linked to this account.</p>
          <p className="text-slate-400 text-sm mt-1">Contact support if this is an error.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {children.map((child: UserData) => {
            const isActive = child.paymentVerified || child.status === 'active';
            const schedule = getSchedule(child.schedule);

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl font-bold border border-emerald-100">
                      {child.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{child.name}</h3>
                      <p className="text-sm text-slate-500 capitalize">
                        {child.level || 'Beginner'} · {child.tuitionPlan?.replace(/_/g, ' ') || 'No plan'}
                      </p>
                    </div>
                  </div>
                  {isActive ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full">
                      Active
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider rounded-full">
                      Pending Payment
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  <div className="p-5 text-center">
                    <p className="text-2xl font-bold text-slate-900">{schedule.length}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Classes/Week</p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-2xl font-bold text-slate-900">{child.planDays ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Days / Week</p>
                  </div>
                </div>

                {schedule.length > 0 && (
                  <div className="p-6 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Weekly Schedule{viewerTz ? ` · ${viewerTz}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {schedule.map((slot: ScheduleSlot, i: number) => {
                        const local = viewerTz
                          ? convertSlotToTimezone(slot.day || '', slot.time || '', slot.timezone || 'UTC', viewerTz)
                          : { day: slot.day || '', time: slot.time || '' };
                        return (
                          <span
                            key={i}
                            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium"
                          >
                            {formatDayAtTime(local.day, local.time)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!isActive && (
                  <div className="px-6 pb-6">
                    <Link
                      href={`/payment?studentId=${child.id}&plan=${child.tuitionPlan}`}
                      className="block w-full text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.01] shadow-md shadow-emerald-500/20"
                    >
                      Complete Enrolment Payment
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
