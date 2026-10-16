'use client';

import { useState } from 'react';
import { getAssignedClassSlots, getPreferredSchedule, parseScheduleChangeRequest } from '@/lib/userDataHelpers';
import type { UserData } from '@/types/user';
import type { ScheduleSlot } from '@/types/content';
import { Calendar, CheckCircle, Clock, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDayAtTime } from '@/lib/timeFormat';

interface ScheduleRequestStatusProps {
  userData: UserData | null;
  className?: string;
  showWithdraw?: boolean;
}

export function ScheduleRequestStatus({ userData, className, showWithdraw = true }: ScheduleRequestStatusProps) {
  const { refreshUserData } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);
  const changeReq = parseScheduleChangeRequest(userData?.scheduleChangeRequest);
  const preferred = getPreferredSchedule(userData?.preferredSchedule);
  const assigned = getAssignedClassSlots(userData?.schedule);
  const slots = changeReq?.slots?.length ? changeReq.slots : preferred;
  const status = changeReq?.status;
  const isInitial = changeReq?.type === 'initial' || (!changeReq && preferred.length > 0);
  const supersededByAssignment =
    (status === 'rejected' || status === 'expired') && assigned.length > 0;

  if (supersededByAssignment) return null;
  if (!slots.length && !changeReq) return null;

  const statusConfig = {
    pending: {
      icon: Clock,
      title: isInitial ? 'Schedule Preferences Submitted' : 'Schedule Change Pending',
      message: 'Your request is being reviewed by administration. We will notify you once a decision is made.',
      className: 'bg-amber-50 border-amber-200 text-amber-800',
      iconClass: 'text-amber-500',
    },
    approved: {
      icon: CheckCircle,
      title: 'Schedule Request Approved',
      message: 'Your schedule request was approved. Check your dashboard for assigned class times.',
      className: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      iconClass: 'text-emerald-500',
    },
    rejected: {
      icon: XCircle,
      title: 'Schedule Request Not Approved',
      message: changeReq?.rejectionNote || 'Your request was not approved. You may submit a new request from Settings.',
      className: 'bg-red-50 border-red-200 text-red-800',
      iconClass: 'text-red-500',
    },
    expired: {
      icon: XCircle,
      title: 'Schedule Request Expired',
      message: changeReq?.rejectionNote || 'Your request expired without a decision. Please submit again.',
      className: 'bg-gray-50 border-gray-200 text-gray-700',
      iconClass: 'text-gray-500',
    },
  };

  const effectiveStatus = status || (preferred.length > 0 ? 'pending' : undefined);
  if (!effectiveStatus) return null;

  const config = statusConfig[effectiveStatus as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  const canEdit = effectiveStatus === 'pending';

  // Update the user row, transparently dropping any column the DB schema doesn't
  // have (e.g. `scheduleChangeRequest` may not exist in every environment).
  const safeUpdate = async (payload: Record<string, unknown>) => {
    if (!userData?.id) throw new Error('Not signed in');
    let attempt = { ...payload };
    for (let i = 0; i < Object.keys(payload).length + 1; i++) {
      const { data, error } = await supabase
        .from('users')
        .update(attempt)
        .eq('id', userData.id)
        .select('id');
      if (!error) {
        if (!data || data.length === 0) {
          throw new Error('Update was blocked. Please refresh and try again.');
        }
        return;
      }
      const missing = error.message.match(/Could not find the '(\w+)' column/);
      if (missing && missing[1] in attempt) {
        const { [missing[1]]: _drop, ...rest } = attempt;
        void _drop;
        attempt = rest;
        continue;
      }
      throw new Error(error.message);
    }
    throw new Error('Update failed. Please refresh and try again.');
  };

  const persistSlots = async (nextSlots: ScheduleSlot[]) => {
    const now = new Date().toISOString();

    if (nextSlots.length === 0) {
      await safeUpdate({
        preferredSchedule: null,
        scheduleChangeRequest: null,
        scheduleSelected: false,
        updatedAt: now,
      });
      return;
    }

    const text = nextSlots.map(s => formatDayAtTime(s.day, s.time)).join(', ');
    await safeUpdate({
      preferredSchedule: nextSlots,
      scheduleChangeRequest: {
        type: changeReq?.type || 'initial',
        status: 'pending',
        slots: nextSlots,
        text,
        requestedAt: changeReq?.requestedAt || now,
      },
      updatedAt: now,
    });
  };

  const handleWithdrawAll = async () => {
    if (!confirm('Withdraw your entire schedule request? You can submit a new one later.')) return;
    setWithdrawing(true);
    try {
      await persistSlots([]);
      await refreshUserData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to withdraw request');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRemoveSlot = async (index: number) => {
    const remaining = slots.filter((_, i) => i !== index);
    if (remaining.length === 0) {
      return handleWithdrawAll();
    }
    setWithdrawing(true);
    try {
      await persistSlots(remaining);
      await refreshUserData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update request');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className={cn('rounded-2xl border p-6', config.className, className)}>
      <div className="flex items-start gap-4">
        <Icon className={cn('w-8 h-8 shrink-0', config.iconClass)} />
        <div className="flex-1">
          <h4 className="font-bold text-lg m-0 mb-1">{config.title}</h4>
          <p className="text-sm m-0 opacity-90">{config.message}</p>
          {canEdit && showWithdraw && (
            <button
              type="button"
              onClick={handleWithdrawAll}
              disabled={withdrawing}
              className="mt-3 text-xs font-bold uppercase tracking-wider text-amber-700 bg-white/80 border border-amber-300 px-4 py-2 rounded-full hover:bg-white disabled:opacity-50"
            >
              {withdrawing ? 'Withdrawing...' : 'Withdraw All'}
            </button>
          )}
          {slots.length > 0 && (
            <div className="mt-4 bg-white/60 rounded-xl p-4 border border-white">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Your Requested Times
              </p>
              <div className="space-y-1.5">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold m-0">
                      {formatDayAtTime(slot.day, slot.time)}
                    </p>
                    {canEdit && showWithdraw && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(i)}
                        disabled={withdrawing}
                        aria-label={`Remove ${formatDayAtTime(slot.day, slot.time)}`}
                        className="shrink-0 p-1 rounded-full text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {changeReq?.requestedAt && (
                <p className="text-xs opacity-60 mt-2 mb-0">
                  Submitted {new Date(changeReq.requestedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
