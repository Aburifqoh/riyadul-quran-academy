import { getPreferredSchedule, getStudentPlanDays } from '@/lib/userDataHelpers';
import type { UserData } from '@/types/user';

import type { ScheduleSlot } from '@/types/content';
import type { AdminRecord } from '@/types/records';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, CheckCircle, RefreshCw, AlertCircle, Globe } from 'lucide-react';
import { getUnassignedStudents, getAvailableTeachersWithSlots } from '@/lib/db';
import { authFetch } from '@/lib/authFetch';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { getUserTimezone, slotsAreEquivalent, convertSlotToTimezone } from '@/lib/timezoneUtils';
import { formatClockTime, formatDayAtTime } from '@/lib/timeFormat';

export default function MatchmakingTab() {
  const [students, setStudents] = useState<UserData[]>([]);
  const [teachersSlots, setTeachersSlots] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<UserData | null>(null);
  const [assigningSlot, setAssigningSlot] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [unassigned, slots] = await Promise.all([
        getUnassignedStudents(),
        getAvailableTeachersWithSlots()
      ]);
      setStudents(unassigned);
      setTeachersSlots(slots);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [unassigned, slots] = await Promise.all([
          getUnassignedStudents(),
          getAvailableTeachersWithSlots()
        ]);
        if (!cancelled) {
          setStudents(unassigned);
          setTeachersSlots(slots);
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleAssign = async (slot: ScheduleSlot) => {
    if (!selectedStudent) return;

    const teacherTz = String(slot.timezone || 'UTC');
    const studentTz = getUserTimezone(selectedStudent);
    const forStudent = studentTz !== teacherTz
      ? convertSlotToTimezone(slot.day || '', slot.time || '', teacherTz, studentTz)
      : null;
    const studentLine = forStudent
      ? `\nStudent will see: ${formatDayAtTime(forStudent.day, forStudent.time)} (${studentTz})`
      : '';

    if (!window.confirm(
      `Assign ${selectedStudent.name ?? 'Student'} to ${slot.teacher} on ${formatDayAtTime(slot.day, slot.time)} (${teacherTz})?${studentLine}`
    )) return;

    setAssigningSlot(slot.id ?? null);
    const res = await authFetch('/api/admin/assign-student', {
      method: 'POST',
      body: JSON.stringify({
        studentId: selectedStudent.id,
        teacherId: slot.teacherId || '',
        day: slot.day || '',
        time: slot.time || '',
        timezone: slot.timezone || 'UTC',
      }),
    });
    const result = await res.json().catch(() => ({}));

    if (res.ok && result.success) {
      alert('Successfully matched!');
      setSelectedStudent(null);
      await fetchData();
    } else {
      alert('Error matching: ' + result.error);
    }
    setAssigningSlot(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold font-headers text-secondary">Matchmaking Engine</h3>
            <p className="text-gray-500 m-0">Assign waiting students to available teachers based on their preferred schedules.</p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-secondary">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column: Waiting Students */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h4 className="font-bold text-lg text-secondary mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Waiting Students ({students.length})
            </h4>
            
            {students.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-gray-500 font-medium m-0">All students are assigned!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {students.map((student) => (
                  <div 
                    key={student.id} 
                    onClick={() => setSelectedStudent(student)}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all",
                      selectedStudent?.id === student.id 
                        ? "bg-indigo-50 border-indigo-200 shadow-sm ring-2 ring-indigo-500/20" 
                        : "bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-secondary m-0">{student.name}</p>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {student.tuitionPlan ? student.tuitionPlan.replace('_', ' ') : 'Standard'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{student.email}</p>
                    
                    <div className="bg-gray-50 rounded-lg p-2 mt-2">
                      <p className="text-[10px] font-bold uppercase text-gray-400 mb-1 flex items-center gap-1">
                        Free periods · plan {getStudentPlanDays(student)}/week
                        <span className="inline-flex items-center gap-1 text-indigo-500 normal-case font-semibold">
                          <Globe className="w-3 h-3" /> {getUserTimezone(student)}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {getPreferredSchedule(student.preferredSchedule).length > 0 ? (
                          getPreferredSchedule(student.preferredSchedule).map((pref, i: number) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
                              {pref.day} @ {formatClockTime(pref.time)}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-amber-600">No preferred times submitted yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Available Teachers */}
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <h4 className="font-bold text-lg text-secondary mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Available Teachers ({teachersSlots.length} Slots)
            </h4>

            {!selectedStudent ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
                <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
                <p className="text-gray-500 font-medium m-0">Select a student on the left to assign a teacher.</p>
              </div>
            ) : teachersSlots.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                <p className="text-gray-500 font-medium m-0">No teachers have submitted available slots.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Find recommended slots first (timezone-aware) */}
                {(() => {
                  const studentPrefs = getPreferredSchedule(selectedStudent.preferredSchedule);
                  const studentTz = getUserTimezone(selectedStudent);

                  const isMatch = (slot: AdminRecord) =>
                    studentPrefs.some((pref: ScheduleSlot) =>
                      slotsAreEquivalent(
                        pref.day || '',
                        pref.time || '',
                        studentTz,
                        String(slot.day || ''),
                        String(slot.time || ''),
                        String(slot.timezone || 'UTC')
                      )
                    );

                  const recommendedSlots = teachersSlots.filter(isMatch);
                  const otherSlots = teachersSlots.filter(slot => !isMatch(slot));

                  return (
                    <>
                      {recommendedSlots.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Matches ({studentTz})
                          </p>
                          <div className="space-y-2">
                            {recommendedSlots.map(slot => (
                              <SlotCard 
                                key={slot.id} 
                                slot={slot} 
                                studentTz={studentTz}
                                onAssign={() => handleAssign(slot)} 
                                isAssigning={assigningSlot === slot.id} 
                                recommended={true}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mb-4">
                        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Other Available Slots</p>
                        <div className="space-y-2">
                          {otherSlots.map(slot => (
                            <SlotCard 
                              key={slot.id} 
                              slot={slot} 
                              studentTz={studentTz}
                              onAssign={() => handleAssign(slot)} 
                              isAssigning={assigningSlot === slot.id} 
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SlotCard({ slot, studentTz, onAssign, isAssigning, recommended = false }: { slot: AdminRecord, studentTz?: string, onAssign: () => void, isAssigning: boolean, recommended?: boolean }) {
  const teacherTz = String(slot.timezone || 'UTC');
  const day = String(slot.day || '');
  const time = String(slot.time || '');
  const localToStudent =
    studentTz && studentTz !== teacherTz
      ? convertSlotToTimezone(day, time, teacherTz, studentTz)
      : null;

  return (
    <div className={cn(
      "p-4 rounded-xl border flex justify-between items-center bg-white transition-all gap-3",
      recommended ? "border-emerald-200 shadow-sm" : "border-gray-200"
    )}>
      <div className="min-w-0">
        <p className="font-bold text-secondary m-0 truncate">{String(slot.teacher || 'Instructor')}</p>
        <p className="text-sm font-medium text-gray-500 m-0">
          {formatDayAtTime(day, time)}
          <span className="text-[10px] font-semibold text-gray-400 ml-1">({teacherTz})</span>
        </p>
        {localToStudent && (
          <p className="text-xs font-semibold text-indigo-600 m-0 mt-0.5">
            = {formatDayAtTime(localToStudent.day, localToStudent.time)} for student ({studentTz})
          </p>
        )}
      </div>
      <button 
        onClick={onAssign}
        disabled={isAssigning}
        className={cn(
          buttonVariants({ size: "sm" }),
          "rounded-full font-bold shadow-sm transition-all shrink-0",
          recommended ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "bg-white text-secondary border border-gray-200 hover:border-secondary",
          isAssigning ? "opacity-50 cursor-not-allowed" : ""
        )}
      >
        {isAssigning ? 'Assigning...' : 'Assign'}
      </button>
    </div>
  );
}
