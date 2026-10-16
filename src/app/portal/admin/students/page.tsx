'use client';

import { getPreferredSchedule, getAvailabilitySlots, displayValue, getAssignedTeacherName, getAssignedClassSlots, getStudentPlanDays, getUserRole } from '@/lib/userDataHelpers';
import { GROUP_CLASS_CAPACITY, isGroupTuitionPlan, slotBookedIds, slotIsOpenFor } from '@/lib/slotCapacity';
import { planLabel } from '@/lib/billing';
import type { UserData } from '@/types/user';

import type { ScheduleSlot } from '@/types/content';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, X, CalendarClock } from 'lucide-react';
import { authFetch } from '@/lib/authFetch';
import { isSubscriptionActive, formatBillingDate, subscriptionExpiryIso, billingStatus } from '@/lib/billing';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';
import { getErrorMessage } from '@/lib/errors';
import { convertSlotToTimezone, getUserTimezone } from '@/lib/timezoneUtils';
import { formatClockTime, formatDayAtTime } from '@/lib/timeFormat';
import { cn } from '@/lib/utils';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import PortalSkeleton from '@/components/ui/PortalSkeleton';

type RosterView = 'registry' | 'pairings';

type PairingRow = {
  key: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  teacherId: string;
  teacherName: string;
  day: string;
  time: string;
  timezone: string;
  studentTz: string;
  studentView: { day: string; time: string } | null;
  classCount: number;
  planDays: number;
  overPlan: boolean;
};

function pairingRows(students: UserData[]) {
  return students.flatMap((student) => {
    const studentTz = getUserTimezone(student);
    const planDays = getStudentPlanDays(student);
    const classes = getAssignedClassSlots(student.schedule);
    return classes.map((slot, index) => {
      const timezone = slot.timezone || studentTz;
      const studentView = studentTz !== timezone
        ? convertSlotToTimezone(slot.day || '', slot.time || '', timezone, studentTz)
        : null;
      return {
        key: `${student.id}-${slot.day}-${slot.time}-${index}`,
        studentId: student.id,
        studentName: student.name || 'Unnamed',
        studentEmail: student.email || '',
        teacherId: slot.teacherId || '',
        teacherName: slot.teacherName || slot.teacher || 'Instructor',
        day: slot.day || '',
        time: slot.time || '',
        timezone,
        studentTz,
        studentView,
        classCount: classes.length,
        planDays,
        overPlan: classes.length > planDays,
      };
    });
  }).sort((a, b) =>
    a.studentName.localeCompare(b.studentName) || a.day.localeCompare(b.day) || a.time.localeCompare(b.time)
  );
}

export default function StudentManager() {
  const { userData, loading: authLoading } = useAuth();
  const [students, setStudents] = useState<UserData[]>([]);
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<RosterView>('registry');
  const router = useRouter();

  // Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UserData | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [removingKey, setRemovingKey] = useState('');
  const [pendingDelete, setPendingDelete] = useState<UserData | null>(null);
  const [profileStudent, setProfileStudent] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const all = await fetchAllUsersParsed();
      setStudents(all.filter((u) => {
        const role = getUserRole(u.role);
        return role === 'student' || role === 'parent';
      }));
      setTeachers(all.filter((u) => getUserRole(u.role) === 'teacher'));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllUsersParsed();
        if (cancelled) return;
        setStudents(all.filter((u) => {
          const role = getUserRole(u.role);
          return role === 'student' || role === 'parent';
        }));
        setTeachers(all.filter((u) => getUserRole(u.role) === 'teacher'));
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleStatus = async (student: UserData) => {
    const newVerified = !isSubscriptionActive(student);
    try {
      const res = await authFetch('/api/admin/billing', {
        method: 'POST',
        body: JSON.stringify({
          userId: student.id,
          action: newVerified ? 'paid' : 'unpaid',
          tuitionPlan: student.tuitionPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      fetchData();
    } catch (err: unknown) {
      alert('Update failed: ' + getErrorMessage(err));
    }
  };

  const handleDeleteStudent = async () => {
    if (!pendingDelete?.id) return;
    setIsDeleting(true);
    try {
      const res = await authFetch('/api/admin/delete-staff', {
        method: 'POST',
        body: JSON.stringify({ userId: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete student.');
      setPendingDelete(null);
      fetchData();
    } catch (err: unknown) {
      alert('Update failed: ' + getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const openAssignModal = (student: UserData) => {
    setSelectedStudent(student);
    const schedule = Array.isArray(student.schedule) ? student.schedule as ScheduleSlot[] : [];
    setSelectedTeacherId(schedule[0]?.teacherId || '');
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setSelectedStudent(null);
    setSelectedTeacherId('');
  };

  const handleAssignSlot = async (day: string, time: string) => {
    if (!selectedStudent || !selectedTeacherId) return;
    setIsAssigning(true);
    const teacher = teachers.find(t => t.id === selectedTeacherId);
    
    const res = await authFetch('/api/admin/assign-student', {
      method: 'POST',
      body: JSON.stringify({
        studentId: selectedStudent.id,
        teacherId: selectedTeacherId,
        day,
        time,
        timezone: teacher?.timezone || 'UTC',
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (res.ok && result.success) {
      alert('Assigned successfully!');
      closeAssignModal();
      fetchData();
    } else {
      alert('Failed: ' + (result.error || 'Assignment failed'));
    }
    setIsAssigning(false);
  };

  const handleRemoveSlot = async (row: PairingRow) => {
    if (!confirm(`Remove ${formatDayAtTime(row.day, row.time)} for ${row.studentName}?`)) return;
    setRemovingKey(row.key);
    const res = await authFetch('/api/admin/assign-student', {
      method: 'POST',
      body: JSON.stringify({
        action: 'remove',
        studentId: row.studentId,
        teacherId: row.teacherId,
        day: row.day,
        time: row.time,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setRemovingKey('');
    if (res.ok && result.success) {
      fetchData();
    } else {
      alert(result.error || 'Failed to remove pairing.');
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = students.filter(s =>
    !q || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q)
  );
  const pairings = useMemo(() => pairingRows(students), [students]);
  const filteredPairings = pairings.filter((row) =>
    !q
    || row.studentName.toLowerCase().includes(q)
    || row.studentEmail.toLowerCase().includes(q)
    || row.teacherName.toLowerCase().includes(q)
  );

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);
  // Admin's browser timezone -- computed client-side only, after mount.
  // The server's timezone (e.g. "UTC" on Cloudflare Workers) never matches
  // the admin's actual browser timezone, so resolving this during the
  // initial render caused a hydration mismatch (React error #418).
  const [adminTz, setAdminTz] = useState('UTC');
  useEffect(() => {
    // React's documented fix for a server/client value mismatch, not the
    // derived-state anti-pattern this lint rule targets -- see HowItWorks.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAdminTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  if (authLoading || loading) return <PortalSkeleton />;
  if (!hasPermission(userData, 'can_manage_students')) {
    return <div className="p-10 text-center text-gray-500">Access denied. Student management permission required.</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push('/portal/admin')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-headers font-bold text-secondary m-0 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-500" /> Student Registry
          </h2>
          <p className="text-gray-500 m-0">
            {view === 'pairings'
              ? 'Every assigned class: student, teacher, day, time, and timezone.'
              : 'Manage enrollments, billing status, and faculty assignments.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-200 rounded-full p-1 flex text-sm font-bold">
            <button
              type="button"
              onClick={() => setView('registry')}
              className={cn(
                'px-4 py-2 rounded-full transition-colors',
                view === 'registry' ? 'bg-secondary text-white' : 'text-gray-500 hover:text-secondary'
              )}
            >
              Registry
            </button>
            <button
              type="button"
              onClick={() => setView('pairings')}
              className={cn(
                'px-4 py-2 rounded-full transition-colors inline-flex items-center gap-1.5',
                view === 'pairings' ? 'bg-secondary text-white' : 'text-gray-500 hover:text-secondary'
              )}
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Pairings
              <span className={cn('text-[10px] font-black', view === 'pairings' ? 'text-white/70' : 'text-gray-400')}>
                {pairings.length}
              </span>
            </button>
          </div>
          <input
            type="text"
            placeholder={view === 'pairings' ? 'Search student or teacher...' : 'Search by name or email...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-5 py-3 bg-white border border-gray-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-secondary/20 w-64"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'pairings' ? (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Teacher</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Day</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Time</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Timezone</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPairings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-gray-400 font-bold">
                      {pairings.length === 0
                        ? 'No pairings yet. Assign a slot from the Registry tab.'
                        : 'No pairings match this search.'}
                    </td>
                  </tr>
                ) : filteredPairings.map((row) => {
                  const student = students.find((s) => s.id === row.studentId);
                  return (
                    <tr key={row.key} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-secondary flex items-center gap-2 flex-wrap">
                          <span>{row.studentName}</span>
                          <TestSeatBadge user={student} />
                        </div>
                        <div className="text-xs text-gray-400">{row.studentEmail}</div>
                        <div className={cn('text-[10px] font-black uppercase tracking-widest mt-1', row.overPlan ? 'text-amber-600' : 'text-gray-400')}>
                          {row.classCount} of {row.planDays} weekly classes
                        </div>
                      </td>
                      <td className="px-8 py-6 text-sm font-bold text-secondary">{row.teacherName}</td>
                      <td className="px-8 py-6 text-sm font-medium text-secondary whitespace-nowrap">{row.day}</td>
                      <td className="px-8 py-6 text-sm font-medium text-secondary whitespace-nowrap">{formatClockTime(row.time)}</td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-medium text-secondary">{row.timezone}</div>
                        {row.studentView && (
                          <div className="text-xs text-gray-400 mt-1">
                            Student sees {formatDayAtTime(row.studentView.day, row.studentView.time)} ({row.studentTz})
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          {student && (
                            <button
                              type="button"
                              onClick={() => openAssignModal(student)}
                              className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
                            >
                              Assign
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(row)}
                            disabled={removingKey === row.key}
                            className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full font-bold hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {removingKey === row.key ? 'Removing…' : 'Remove'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Student</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Payment</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Started</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Expires</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Assigned Teacher</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-8 py-16 text-center text-gray-400 font-bold">No students found.</td></tr>
                ) : filtered.map((s) => {
                  const isPaid = isSubscriptionActive(s);
                  const status = billingStatus(s);
                  const assignedTeacherName = getAssignedTeacherName(s.schedule);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-bold text-secondary flex items-center gap-2 flex-wrap">
                          <span>{s.name || 'Unnamed'}</span>
                          <TestSeatBadge user={s} />
                        </div>
                        <div className="text-xs text-gray-400">{s.email}</div>
                        <button
                          type="button"
                          onClick={() => setProfileStudent(s)}
                          className="mt-1 text-xs font-bold text-primary hover:underline"
                        >
                          Full details
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => toggleStatus(s)}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                            isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                          }`}
                        >
                          {status.label}
                        </button>
                      </td>
                      <td className="px-8 py-6 text-sm whitespace-nowrap">{formatBillingDate(s.lastPaymentDate)}</td>
                      <td className="px-8 py-6 text-sm whitespace-nowrap">{formatBillingDate(subscriptionExpiryIso(s))}</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-secondary">{assignedTeacherName}</span>
                          <button
                            onClick={() => openAssignModal(s)}
                            className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-bold hover:bg-primary/20 transition-colors"
                          >
                            Assign Slot
                          </button>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button
                          onClick={() => setPendingDelete(s)}
                          className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {profileStudent && (
        <RegistrationDetailsModal
          student={profileStudent}
          household={students.filter((row) => row.parentId === profileStudent.id || row.id === profileStudent.parentId)}
          onClose={() => setProfileStudent(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.name || pendingDelete.email}
          role={getUserRole(pendingDelete.role) || 'student'}
          loading={isDeleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleDeleteStudent()}
        />
      )}

      {assignModalOpen && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-2xl font-headers font-bold text-secondary">Assign Teacher Slot</h3>
                <p className="text-gray-500 text-sm">
                  Matching {selectedStudent.name} · {planLabel(selectedStudent.tuitionPlan)} · {getAssignedClassSlots(selectedStudent.schedule).length} of {getStudentPlanDays(selectedStudent)} weekly classes
                  {isGroupTuitionPlan(selectedStudent.tuitionPlan) ? ` · up to ${GROUP_CLASS_CAPACITY} students can share one time` : ''}
                </p>
              </div>
              <button onClick={closeAssignModal} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-8 space-y-8">
                {/* Student Profile Information */}
                {selectedStudent.studentProfile && (
                  <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-blue-400">Student Profile</h4>
                    
                    {selectedStudent.studentProfile.address && (
                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Location:</span>
                        <p className="text-sm font-medium text-secondary mt-1">{displayValue(selectedStudent.studentProfile.address)}</p>
                      </div>
                    )}
                    
                    {selectedStudent.studentProfile.goals && (
                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase">Learning Goals:</span>
                        <p className="text-sm font-medium text-secondary mt-1">{displayValue(selectedStudent.studentProfile.goals)}</p>
                      </div>
                    )}
                    
                    {selectedStudent.studentProfile.bio && (
                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase">About / Bio:</span>
                        <p className="text-sm font-medium text-secondary mt-1">{displayValue(selectedStudent.studentProfile.bio)}</p>
                      </div>
                    )}
                  </div>
                )}

              {/* Student Preferences */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Student&apos;s Preferred Schedule</h4>
                {getPreferredSchedule(selectedStudent.preferredSchedule) && getPreferredSchedule(selectedStudent.preferredSchedule).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {getPreferredSchedule(selectedStudent.preferredSchedule).map((pref: ScheduleSlot, idx: number) => {
                      return (
                        <div key={idx} className="bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-secondary shadow-sm">
                          {formatDayAtTime(pref.day, pref.time)} <span className="text-gray-400 text-xs ml-1 font-medium">({selectedStudent.timezone || selectedStudent.detectedTz || 'Local'})</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 font-medium">No preferred schedule selected by student.</p>
                )}
              </div>

              {/* Teacher Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Select Teacher</label>
                <select
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-secondary font-bold focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  value={selectedTeacherId}
                  onChange={e => setSelectedTeacherId(e.target.value)}
                >
                  <option value="">-- Choose a Teacher --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Teacher Slots */}
              {selectedTeacher && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Teacher&apos;s Available Slots (in Admin&apos;s Timezone)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {getAvailabilitySlots(selectedTeacher.availabilitySlots)?.map((slot: ScheduleSlot, idx: number) => {
                      const studentIsGroup = isGroupTuitionPlan(selectedStudent.tuitionPlan);
                      if (!slotIsOpenFor(slot, studentIsGroup).ok) return null;
                      const booked = slotBookedIds(slot).length;
                      
                      const converted = convertSlotToTimezone(
                        slot.day ?? '', 
                        slot.time ?? '', 
                        selectedTeacher.timezone || 'UTC', 
                        adminTz
                      );

                      return (
                        <div key={idx} className="flex items-center justify-between border border-gray-200 p-4 rounded-2xl bg-white hover:border-primary transition-colors">
                          <div>
                            <div className="font-bold text-secondary">{converted.day}</div>
                            <div className="text-sm text-gray-500 font-medium">{formatClockTime(converted.time)} {adminTz}</div>
                            {slot.groupSlot && (
                              <div className="text-xs font-bold text-amber-600 mt-1">
                                Group {booked}/{GROUP_CLASS_CAPACITY} seated
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleAssignSlot(slot.day ?? '', slot.time ?? '')}
                            disabled={isAssigning}
                            className="bg-primary/10 text-primary hover:bg-primary hover:text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                          >
                            Assign
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  {(!getAvailabilitySlots(selectedTeacher.availabilitySlots) || getAvailabilitySlots(selectedTeacher.availabilitySlots).filter((s: ScheduleSlot) => slotIsOpenFor(s, isGroupTuitionPlan(selectedStudent.tuitionPlan)).ok).length === 0) && (
                    <p className="text-sm text-gray-500 font-medium text-center py-4 bg-gray-50 rounded-2xl border border-gray-100">
                      This teacher has no available slots.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function savedText(user: UserData, key: string): string {
  const direct = (user as unknown as Record<string, unknown>)[key];
  if (typeof direct === 'string' || typeof direct === 'number') return String(direct);
  const extra = user.studentProfile?.[key];
  if (typeof extra === 'string' || typeof extra === 'number') return String(extra);
  return '';
}

function RegistrationDetailsModal({
  student,
  household,
  onClose,
}: {
  student: UserData;
  household: UserData[];
  onClose: () => void;
}) {
  const fields = [
    ['Role', getUserRole(student.role) || ''],
    ['Email', student.email || ''],
    ['WhatsApp', student.phone || savedText(student, 'phone')],
    ['Gender', savedText(student, 'gender')],
    ['Age', savedText(student, 'age')],
    ['Level', savedText(student, 'level')],
    ['Goal', savedText(student, 'goal')],
    ['Nationality', student.nationality || savedText(student, 'nationality')],
    ['Country', student.country || savedText(student, 'country')],
    ['City / Province', student.city || savedText(student, 'city')],
    ['Heard about us', student.referral || savedText(student, 'referral')],
    ['Timezone', student.timezone || student.detectedTz || ''],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[32px] w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h3 className="text-2xl font-headers font-bold text-secondary">Registration details</h3>
            <p className="text-gray-500 text-sm">{student.name || 'Unnamed'}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">{label}</p>
                <p className="font-bold text-secondary">{value || '—'}</p>
              </div>
            ))}
          </div>
          {household.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Linked family</p>
              <div className="space-y-3">
                {household.map((person) => (
                  <div key={person.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <p className="font-bold text-secondary">{person.name || 'Unnamed'} · {getUserRole(person.role) || 'student'}</p>
                    <p className="text-sm text-gray-500">{person.email || 'No email'}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {[savedText(person, 'age') && `Age ${savedText(person, 'age')}`, savedText(person, 'gender'), savedText(person, 'level')].filter(Boolean).join(' · ') || 'No extra details saved'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
