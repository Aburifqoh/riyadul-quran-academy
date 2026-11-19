'use client';

import type { UserData } from '@/types/user';


import type { HomeworkItem } from '@/types/content';
import type { ScheduleSlot } from '@/types/content';

import { getSchedule, getUserRole, slotBelongsToTeacher } from '@/lib/userDataHelpers';
import { planLabel } from '@/lib/billing';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Video, Users, FileSignature, CheckCircle, Clock, CalendarDays, AlertCircle } from 'lucide-react';
import { getTeacherStudents } from '@/lib/db';
import { classroomSessionHref, practiceClassroomHref, teacherClassroomRoom } from '@/lib/classroomRoom';
import { cn } from '@/lib/utils';
import { formatClockTime } from '@/lib/timeFormat';
import { weekdayInTimezone } from '@/lib/timezoneUtils';

export default function TeacherDashboard() {
  const { userData } = useAuth();
  const router = useRouter();

  const [students, setStudents] = useState<UserData[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const isTeacher = !!userData && getUserRole(userData.role) === 'teacher';

  useEffect(() => {
    if (!userData) return;
    const role = getUserRole(userData.role);
    if (role === 'admin' || role === 'super_admin') {
      router.push('/portal/admin');
    } else if (role === 'student' || role === 'parent') {
      router.push('/portal');
    }
  }, [userData, router]);

  useEffect(() => {
    if (!isTeacher || !userData) return;
    let cancelled = false;
    getTeacherStudents({ id: userData.id, email: userData.email }).then((s) => {
      if (!cancelled) {
        setStudents(s);
        setStudentsLoaded(true);
      }
    }).catch(() => {
      if (!cancelled) setStudentsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isTeacher, userData]);

  const loading = isTeacher ? !studentsLoaded : false;

  const todayName = weekdayInTimezone(userData?.timezone);

  const classesToday = students.flatMap((s) =>
    getSchedule(s.schedule)
      .filter((slot: ScheduleSlot) =>
        slotBelongsToTeacher(slot, { id: userData?.id, email: userData?.email }) &&
        slot.day?.toLowerCase() === weekdayInTimezone(slot.timezone || userData?.timezone).toLowerCase()
      )
      .map((slot) => ({ student: s, slot }))
  ).sort((a, b) => String(a.slot.time || '').localeCompare(String(b.slot.time || '')));

  // Pending reports: students with at least one 'submitted' (ungraded) homework
  const pendingReports = students.filter((s) =>
    (Array.isArray(s.homeworkInbox) ? s.homeworkInbox : []).some((hw: HomeworkItem) => hw.status === 'submitted')
  ).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-10 max-w-7xl mx-auto"
    >
      {/* ROW 1: Hero Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Next Class Hero */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <div className="bg-secondary rounded-[24px] sm:rounded-[32px] p-5 sm:p-8 md:p-10 shadow-lg relative overflow-hidden h-full flex flex-col justify-between group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full pointer-events-none transition-transform group-hover:scale-125 duration-1000" />

            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border mb-4 backdrop-blur-md uppercase tracking-widest bg-white/10 text-white border-white/20">
                  <CalendarDays className="w-4 h-4" /> Instructor Desk
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-headers font-bold text-white leading-tight mb-2">
                  Assalamu Alaikum{userData?.name ? `, ${userData.name.split(' ')[0]}` : ''}
                </h2>
                <p className="text-white/70 text-lg">
                  {classesToday.length > 0
                    ? `You have ${classesToday.length} class${classesToday.length > 1 ? 'es' : ''} today.`
                    : 'No classes scheduled for today.'}
                </p>
              </div>

              <div className="w-full md:w-auto flex flex-col gap-3">
                <Link
                  href={classroomSessionHref({ role: 'teacher', room: teacherClassroomRoom(userData?.email) })}
                  className="w-full bg-primary hover:bg-primary-hover text-white rounded-full px-8 py-4 font-bold text-lg shadow-[0_10px_30px_rgba(0,77,74,0.4)] hover:-translate-y-1 hover:shadow-[0_15px_40px_rgba(0,77,74,0.6)] transition-all flex items-center justify-center gap-3 border-2 border-primary/50 relative overflow-hidden group/btn"
                >
                  <div className="absolute inset-0 -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent z-10 pointer-events-none" />
                  <Video className="w-5 h-5" /> Enter Classroom
                </Link>
                <Link
                  href={practiceClassroomHref({
                    role: 'teacher',
                    liveRoom: teacherClassroomRoom(userData?.email),
                    email: userData?.email,
                  })}
                  className="w-full text-center text-white/80 hover:text-white text-sm font-bold underline-offset-4 hover:underline"
                >
                  Practice room (no ring, no transcript)
                </Link>
                <p className="text-[11px] text-white/50 text-center m-0">
                  Stay in the live room if a student needs to come back after the hour.
                </p>
              </div>
            </div>

            {/* Today's classes list */}
            {classesToday.length > 0 && (
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classesToday.map(({ student, slot }, i) => (
                    <div key={`${student.id}-${slot.time}-${i}`} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {student.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm m-0">{student.name}</p>
                        <p className="text-white/60 text-xs m-0">{slot.time ? formatClockTime(slot.time) : 'TBD'}</p>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Column */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          {/* Classes Today */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex-1 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full pointer-events-none" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Classes Today</p>
            {loading ? (
              <div className="h-10 w-16 bg-gray-100 animate-pulse rounded-xl" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black text-secondary">{classesToday.length}</span>
                <span className="text-sm font-bold text-gray-400">{todayName}</span>
              </div>
            )}
          </div>

          {/* Pending Reports */}
          <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex-1 relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pending Reports</p>
            {loading ? (
              <div className="h-10 w-16 bg-gray-100 animate-pulse rounded-xl" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className={cn('text-5xl font-black', pendingReports > 0 ? 'text-amber-500' : 'text-emerald-500')}>
                  {pendingReports}
                </span>
                {pendingReports === 0 && (
                  <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> All clear
                  </span>
                )}
                {pendingReports > 0 && (
                  <span className="text-xs font-bold text-amber-500 bg-amber-50 px-2 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> to grade
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ROW 2: Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Link href="/portal/teacher/students" className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[32px] p-8 h-full flex items-center justify-between group hover:shadow-lg hover:shadow-blue-500/30 transition-all cursor-pointer no-underline">
            <div className="text-white">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-sm border border-white/20 mb-3 inline-block">Management</span>
              <h3 className="text-2xl font-bold m-0 font-headers text-white">Academic Roster</h3>
              <p className="text-blue-50 font-medium m-0 mt-1 opacity-90">
                {loading ? 'Loading...' : `${students.length} student${students.length !== 1 ? 's' : ''} assigned`}
              </p>
            </div>
            <div className="w-14 h-14 bg-white text-blue-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
              <Users className="w-6 h-6" strokeWidth={2.5} />
            </div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link href="/portal/teacher/assignments" className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[32px] p-8 h-full flex flex-col justify-center items-center text-center group hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/30 transition-all no-underline relative">
            {pendingReports > 0 && (
              <span className="absolute top-4 right-4 w-6 h-6 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center shadow-md">
                {pendingReports}
              </span>
            )}
            <div className="w-16 h-16 bg-white/20 text-white rounded-full flex items-center justify-center mb-4 backdrop-blur-md group-hover:scale-110 transition-transform">
              <FileSignature className="w-8 h-8" strokeWidth={2} />
            </div>
            <h3 className="text-2xl font-bold font-headers text-white mb-1">Assign Tasks</h3>
            <p className="text-indigo-100 font-medium text-sm">Create homework & review submissions</p>
          </Link>
        </motion.div>
      </div>

      {/* ROW 3: Today's Schedule Detail */}
      <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold font-headers text-secondary flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Today&apos;s Schedule — {todayName}
          </h3>
          <span className="text-xs font-black uppercase tracking-widest text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            {classesToday.length} {classesToday.length === 1 ? 'Class' : 'Classes'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-16 bg-gray-50 animate-pulse rounded-2xl" />)}
          </div>
        ) : classesToday.length > 0 ? (
          <div className="space-y-3">
            {classesToday.map(({ student, slot }, i) => (
                <div key={`${student.id}-${slot.time}-${i}`} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary/30 hover:bg-amber-50/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-amber-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      {student.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-secondary m-0">{student.name}</p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">{planLabel(student.tuitionPlan)}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary" /> {slot.time ? formatClockTime(slot.time) : 'TBD'}
                  </span>
                </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center bg-gray-50 rounded-2xl p-10 border-2 border-dashed border-gray-200 min-h-[180px]">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <h4 className="text-lg font-bold text-gray-500 mb-2">No Classes Today</h4>
            <p className="text-sm text-gray-400">Enjoy your break or use this time to review student progress.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
