'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getAvailabilitySlots, getUserRole } from '@/lib/userDataHelpers';
import { GROUP_CLASS_CAPACITY, isGroupTuitionPlan, slotBookedIds, slotIsOpenFor } from '@/lib/slotCapacity';
import type { UserData } from '@/types/user';
import type { UnifiedScheduleRequest } from '@/types/scheduling';
import {
  buildScheduleRequestsFromUsers,
  expireStaleScheduleRequests,
  checkSlotConflicts,
  getTeacherAvailabilityOrphans,
} from '@/lib/scheduleRequests';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import { getUserTimezone, convertSlotToTimezone } from '@/lib/timezoneUtils';
import { formatClockTime, formatDayAtTime } from '@/lib/timeFormat';
import { authFetch } from '@/lib/authFetch';
import { cn } from '@/lib/utils';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TYPE_LABELS: Record<string, string> = {
  student_initial: 'New Student Preferences',
  student_change: 'Schedule Change',
  teacher_availability: 'Teacher Availability',
};

export default function ScheduleRequestsTab() {
  const { user, userData } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [activeRequest, setActiveRequest] = useState<UnifiedScheduleRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTime, setSelectedTime] = useState('');
  const [processing, setProcessing] = useState(false);
  const [acknowledgeOrphans, setAcknowledgeOrphans] = useState(false);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const parsed = await fetchAllUsersParsed();
    setUsers(parsed);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const parsed = await fetchAllUsersParsed();
      if (!cancelled) {
        setUsers(parsed);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allRequests = useMemo(() => buildScheduleRequestsFromUsers(users), [users]);

  const requests = useMemo(() => {
    return allRequests.filter(r => {
      if (filter === 'pending' && r.status !== 'pending') return false;
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      return true;
    });
  }, [allRequests, filter, typeFilter]);

  const teachers = useMemo(() => users.filter(u => getUserRole(u.role) === 'teacher'), [users]);
  const pendingCount = allRequests.filter(r => r.status === 'pending').length;
  const actorRole = getUserRole(userData?.role) || 'super_admin';

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  const teacherTz = getUserTimezone(selectedTeacher);
  const requestTz = activeRequest?.timezone || 'UTC';

  const requestStudent = users.find(u => u.id === activeRequest?.userId);
  const studentIsGroup = isGroupTuitionPlan(requestStudent?.tuitionPlan);
  const availableSlots = selectedTeacherId
    ? getAvailabilitySlots(selectedTeacher?.availabilitySlots).filter(s => slotIsOpenFor(s, studentIsGroup).ok)
    : [];

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openApprove = (req: UnifiedScheduleRequest, slotIndex?: number) => {
    setActiveRequest(req);
    const scopedSlot = req.type === 'teacher_availability' ? undefined : slotIndex;
    setActiveSlotIndex(scopedSlot ?? null);
    setAcknowledgeOrphans(false);
    const pref = scopedSlot != null ? req.requestedSlots[scopedSlot] : req.requestedSlots[0];
    setSelectedDay(pref?.day || 'Monday');
    setSelectedTime(pref?.time || '');
    setShowApproveModal(true);
  };

  const openReject = (req: UnifiedScheduleRequest, slotIndex?: number) => {
    setActiveRequest(req);
    setActiveSlotIndex(slotIndex ?? null);
    setRejectNote('');
    setShowRejectModal(true);
  };

  const handleApprove = async () => {
    if (!activeRequest || !user?.id) return;
    setProcessing(true);
    try {
    const res = await authFetch('/api/admin/schedule-requests', {
      method: 'POST',
      body: JSON.stringify({
        action: 'approve',
        request: activeRequest,
        teacherId: selectedTeacherId || undefined,
        assignDay: selectedDay,
        assignTime: selectedTime,
        acknowledgeOrphans,
        slotIndex: activeSlotIndex ?? undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (res.ok && result.success) {
      setShowApproveModal(false);
      setActiveRequest(null);
      setActiveSlotIndex(null);
      await fetchUsers();
    } else {
      alert(result.error || 'Approval failed');
    }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Approval failed');
    } finally {
    setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!activeRequest || !user?.id || !rejectNote.trim()) {
      alert('Please provide a rejection note.');
      return;
    }
    setProcessing(true);
    try {
    const res = await authFetch('/api/admin/schedule-requests', {
      method: 'POST',
      body: JSON.stringify({
        action: 'reject',
        request: activeRequest,
        rejectionNote: rejectNote.trim(),
        slotIndex: activeSlotIndex ?? undefined,
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (res.ok && result.success) {
      setShowRejectModal(false);
      setActiveRequest(null);
      setActiveSlotIndex(null);
      await fetchUsers();
    } else {
      alert(result.error || 'Rejection failed');
    }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Rejection failed');
    } finally {
    setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!user?.id || selected.size === 0) return;
    const note = prompt('Enter rejection note for all selected requests:');
    if (!note?.trim()) return;

    setProcessing(true);
    const toReject = requests.filter(r => selected.has(r.id));
    let succeeded = 0;
    let failed = 0;
    for (const req of toReject) {
      const res = await authFetch('/api/admin/schedule-requests', {
        method: 'POST',
        body: JSON.stringify({ action: 'reject', request: req, rejectionNote: note.trim() }),
      });
      if (res.ok) succeeded++;
      else failed++;
    }
    alert(`Rejected ${succeeded} request(s).${failed ? ` ${failed} failed.` : ''}`);
    setSelected(new Set());
    await fetchUsers();
    setProcessing(false);
  };

  const handleExpireStale = async () => {
    if (!user?.id) return;
    setProcessing(true);
    const count = await expireStaleScheduleRequests(user.id, actorRole);
    alert(count > 0 ? `Expired ${count} stale request(s).` : 'No stale requests found.');
    await fetchUsers();
    setProcessing(false);
  };

  const conflictWarning = activeRequest && selectedTeacherId && selectedDay && selectedTime
    ? checkSlotConflicts(users, selectedTeacherId, selectedDay, selectedTime, activeRequest.userId)
    : null;

  const orphanWarning = activeRequest?.type === 'teacher_availability'
    ? getTeacherAvailabilityOrphans(users, activeRequest.currentSlots, activeRequest.requestedSlots)
    : [];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold font-headers text-secondary m-0 flex items-center gap-3">
            <Calendar className="w-7 h-7 text-primary" />
            Schedule Requests
            {pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">{pendingCount} pending</span>
            )}
          </h3>
          <p className="text-gray-500 m-0 mt-1">Review, approve, or reject student and teacher schedule requests.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={cn('px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2', viewMode === 'list' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600')}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={cn('px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2', viewMode === 'calendar' ? 'bg-secondary text-white' : 'bg-gray-100 text-gray-600')}
          >
            <LayoutGrid className="w-4 h-4" /> Calendar
          </button>
          <button onClick={handleExpireStale} disabled={processing} className="px-4 py-2 rounded-full text-sm font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Expire Stale
          </button>
          {selected.size > 0 && (
            <button onClick={handleBulkReject} disabled={processing} className="px-4 py-2 rounded-full text-sm font-bold bg-red-50 text-red-600 border border-red-200">
              Reject Selected ({selected.size})
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['pending', 'all'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn('px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider', filter === f ? 'bg-primary text-white' : 'bg-white border border-gray-200 text-gray-500')}
          >
            {f}
          </button>
        ))}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-4 py-2 rounded-full text-xs font-bold border border-gray-200 bg-white"
        >
          <option value="all">All Types</option>
          <option value="student_initial">New Student</option>
          <option value="student_change">Schedule Change</option>
          <option value="teacher_availability">Teacher Availability</option>
        </select>
      </div>

      {viewMode === 'calendar' ? (
        <ScheduleCalendar
          requests={requests}
          onApprove={(req, slotIndex) => openApprove(req, slotIndex)}
          onReject={(req, slotIndex) => openReject(req, slotIndex)}
        />
      ) : (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 font-bold m-0">No schedule requests found.</p>
            </div>
          ) : (
            requests.map(req => (
              <motion.div
                key={req.id}
                layout
                className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(req.id)}
                      onChange={() => toggleSelect(req.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-bold text-secondary text-lg">{req.userName}</span>
                        <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                          {TYPE_LABELS[req.type]}
                        </span>
                        <span className={cn(
                          'text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full',
                          req.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                        )}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 m-0">{req.userEmail} · {req.timezone || 'UTC'}</p>
                      <p className="text-xs text-gray-400 mt-1">Submitted {new Date(req.requestedAt).toLocaleString()}</p>
                      {req.status !== 'pending' && req.resolvedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed {new Date(req.resolvedAt).toLocaleString()}
                          {req.resolvedByName ? ` by ${req.resolvedByName}` : ''}
                        </p>
                      )}
                      {req.rejectionNote && req.status !== 'pending' && (
                        <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-1 rounded-lg inline-block">
                          Note: {req.rejectionNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Current Schedule</p>
                      {req.currentSlots.length > 0 ? req.currentSlots.map((s, i) => (
                        <p key={i} className="text-sm text-secondary m-0">{formatDayAtTime(s.day, s.time)} {s.teacher ? `· ${s.teacher}` : ''}</p>
                      )) : <p className="text-sm text-gray-400 m-0">None</p>}
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">
                        Free periods <span className="normal-case text-emerald-500">({req.timezone || 'UTC'})</span>
                        {(req.type === 'student_initial' || req.type === 'student_change') && (
                          <span className="block normal-case font-semibold text-emerald-700 mt-1">
                            Plan books {req.planDays && req.planDays > 0 ? req.planDays : 2} class{(req.planDays && req.planDays > 0 ? req.planDays : 2) === 1 ? '' : 'es'}/week. Assign from these options.
                          </span>
                        )}
                      </p>
                      {req.requestedSlots.length > 0 ? req.requestedSlots.map((s, i) => (
                        <div
                          key={i}
                          className={cn(
                            'py-2',
                            i < req.requestedSlots.length - 1 && 'border-b border-emerald-100'
                          )}
                        >
                          <p className="text-sm text-secondary m-0 font-medium">{formatDayAtTime(s.day, s.time)}</p>
                          {req.status === 'pending' && req.requestedSlots.length > 1 && (
                            req.type === 'teacher_availability' ? (
                              <button
                                type="button"
                                onClick={() => openReject(req, i)}
                                className="h-9 w-full mt-2 rounded-full bg-red-50 text-red-600 font-bold text-xs border border-red-200 hover:bg-red-100 inline-flex items-center justify-center gap-1.5"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject this time
                              </button>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                  type="button"
                                  onClick={() => openApprove(req, i)}
                                  className="h-9 w-full rounded-full bg-emerald-500 text-white font-bold text-xs hover:bg-emerald-600 inline-flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openReject(req, i)}
                                  className="h-9 w-full rounded-full bg-red-50 text-red-600 font-bold text-xs border border-red-200 hover:bg-red-100 inline-flex items-center justify-center gap-1.5"
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )) : <p className="text-sm text-gray-500 m-0">{req.requestText || '—'}</p>}
                    </div>
                  </div>

                  {req.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => openApprove(req)}
                        className="h-11 w-full rounded-full bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 inline-flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {req.requestedSlots.length > 1 ? 'Approve request' : 'Approve'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openReject(req)}
                        className="h-11 w-full rounded-full bg-red-50 text-red-600 font-bold text-sm border border-red-200 hover:bg-red-100 inline-flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        {req.requestedSlots.length > 1 ? 'Reject request' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {showApproveModal && activeRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold text-secondary mb-4">
              {activeSlotIndex != null && activeRequest.requestedSlots[activeSlotIndex]
                ? `Approve ${formatDayAtTime(activeRequest.requestedSlots[activeSlotIndex].day, activeRequest.requestedSlots[activeSlotIndex].time)}`
                : 'Approve Request'}
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              Approving schedule for <strong>{activeRequest.userName}</strong>
              {activeSlotIndex != null ? ' — this time only. Other free periods stay open until the weekly plan is filled.' : ' Assign one class. Other free periods stay open until the weekly plan is filled.'}
            </p>

            {activeRequest.type === 'teacher_availability' ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl m-0">
                  This will apply the teacher&apos;s requested availability slots and lock their schedule.
                </p>
                {orphanWarning.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                    <div className="flex items-start gap-2 text-amber-800 text-sm mb-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <strong>{orphanWarning.length} booked slot(s) will be removed:</strong>
                    </div>
                    <ul className="text-sm text-amber-900 m-0 pl-5 space-y-1">
                      {orphanWarning.map((o, i) => (
                        <li key={i}>{o.studentName} — {formatDayAtTime(o.day, o.time)}</li>
                      ))}
                    </ul>
                    <label className="flex items-center gap-2 mt-3 text-sm text-amber-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acknowledgeOrphans}
                        onChange={e => setAcknowledgeOrphans(e.target.checked)}
                      />
                      I understand these students will need reassignment
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
                  <p className="m-0 font-semibold">Student wants ({requestTz}):</p>
                  <div className="mt-1 space-y-0.5">
                    {activeRequest.requestedSlots.length > 0 ? activeRequest.requestedSlots.map((s, i) => {
                      const inTeacher = selectedTeacherId
                        ? convertSlotToTimezone(s.day || '', s.time || '', requestTz, teacherTz)
                        : null;
                      return (
                        <p key={i} className="m-0">
                          {formatDayAtTime(s.day, s.time)}
                          {inTeacher && (
                            <span className="font-semibold text-blue-900"> = {formatDayAtTime(inTeacher.day, inTeacher.time)} in teacher&apos;s time ({teacherTz})</span>
                          )}
                        </p>
                      );
                    }) : <p className="m-0 text-blue-600">{activeRequest.requestText || 'No specific times'}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400">Assign Teacher</label>
                  <select
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="w-full mt-1 p-3 border border-gray-200 rounded-xl font-medium"
                  >
                    <option value="">Select teacher...</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({getUserTimezone(t)})</option>
                    ))}
                  </select>
                </div>
                {selectedTeacherId && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-400">Day (teacher&apos;s time)</label>
                        <select value={selectedDay} onChange={e => setSelectedDay(e.target.value)} className="w-full mt-1 p-3 border rounded-xl">
                          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase text-gray-400">Time (teacher&apos;s time)</label>
                        <select value={selectedTime} onChange={e => setSelectedTime(e.target.value)} className="w-full mt-1 p-3 border rounded-xl">
                          <option value="">Select...</option>
                          {availableSlots.filter(s => s.day === selectedDay).map((s, i) => {
                            const forStudent = requestTz !== teacherTz
                              ? convertSlotToTimezone(selectedDay, s.time || '', teacherTz, requestTz)
                              : null;
                            const seated = slotBookedIds(s).length;
                            const groupLabel = s.groupSlot ? ` · group ${seated}/${GROUP_CLASS_CAPACITY}` : '';
                            return (
                              <option key={i} value={s.time}>
                                {formatClockTime(s.time)}{forStudent ? ` (student: ${formatDayAtTime(forStudent.day, forStudent.time)})` : ''}{groupLabel}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                    {selectedTime && requestTz !== teacherTz && (
                      <p className="text-xs text-gray-500 m-0">
                        Student will see this as{' '}
                        <strong>
                          {(() => {
                            const c = convertSlotToTimezone(selectedDay, selectedTime, teacherTz, requestTz);
                            return `${formatDayAtTime(c.day, c.time)} (${requestTz})`;
                          })()}
                        </strong>.
                      </p>
                    )}
                    {conflictWarning && (
                      <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {conflictWarning}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setActiveSlotIndex(null);
                }}
                className="flex-1 py-3 rounded-full font-bold bg-gray-100 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={
                  processing ||
                  !!(conflictWarning && activeRequest.type !== 'teacher_availability') ||
                  (activeRequest.type === 'teacher_availability' && orphanWarning.length > 0 && !acknowledgeOrphans) ||
                  (activeRequest.type !== 'teacher_availability' && (!selectedTeacherId || !selectedTime))
                }
                className="flex-1 py-3 rounded-full font-bold bg-emerald-500 text-white disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && activeRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h4 className="text-xl font-bold text-secondary mb-2">
              {activeSlotIndex != null && activeRequest.requestedSlots[activeSlotIndex]
                ? `Reject ${formatDayAtTime(activeRequest.requestedSlots[activeSlotIndex].day, activeRequest.requestedSlots[activeSlotIndex].time)}`
                : 'Reject Request'}
            </h4>
            <p className="text-sm text-gray-500 mb-4">
              {activeSlotIndex != null
                ? <>Rejecting this time for <strong>{activeRequest.userName}</strong>. Other requested times stay pending.</>
                : <>Rejecting schedule request from <strong>{activeRequest.userName}</strong>. The note below will be sent to them.</>}
            </p>
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Explain why this request cannot be approved..."
              className="w-full p-4 border border-gray-200 rounded-xl min-h-[120px] text-sm"
              required
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setActiveSlotIndex(null);
                }}
                className="flex-1 py-3 rounded-full font-bold bg-gray-100 text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectNote.trim()}
                className="flex-1 py-3 rounded-full font-bold bg-red-500 text-white disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScheduleCalendar({
  requests,
  onApprove,
  onReject,
}: {
  requests: UnifiedScheduleRequest[];
  onApprove: (req: UnifiedScheduleRequest, slotIndex: number) => void;
  onReject: (req: UnifiedScheduleRequest, slotIndex: number) => void;
}) {
  const slotsByDay: Record<string, Array<{ time: string; label: string; type: string; status: string; req: UnifiedScheduleRequest; slotIndex: number }>> = {};
  DAYS.forEach(d => { slotsByDay[d] = []; });

  for (const req of requests) {
    req.requestedSlots.forEach((slot, slotIndex) => {
      if (slot.day && slot.time) {
        slotsByDay[slot.day]?.push({
          time: slot.time,
          label: req.userName,
          type: req.type,
          status: req.status,
          req,
          slotIndex,
        });
      }
    });
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-gray-100">
        {DAYS.map(day => (
          <div key={day} className="p-4 min-h-[160px]">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">{day}</p>
            <div className="space-y-2">
              {(slotsByDay[day] || []).sort((a, b) => a.time.localeCompare(b.time)).map((s, i) => (
                <div
                  key={`${s.req.id}-${s.slotIndex}-${i}`}
                  className={cn(
                    'text-xs p-2 rounded-lg border',
                    s.type === 'teacher_availability' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  )}
                >
                  <strong>{formatClockTime(s.time)}</strong>
                  <p className="m-0 truncate">{s.label}</p>
                  {s.status === 'pending' && (
                    <div className="grid grid-cols-2 gap-1 mt-2">
                      <button
                        type="button"
                        onClick={() => onApprove(s.req, s.slotIndex)}
                        className="h-7 w-full rounded-full bg-emerald-500 text-white font-bold text-[10px] hover:bg-emerald-600"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(s.req, s.slotIndex)}
                        className="h-7 w-full rounded-full bg-white text-red-600 font-bold text-[10px] border border-red-200 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {(slotsByDay[day] || []).length === 0 && (
                <p className="text-xs text-gray-300 m-0">—</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
