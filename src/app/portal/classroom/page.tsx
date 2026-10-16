'use client';

import type { HomeworkItem } from '@/types/content';
import type { ScheduleSlot } from '@/types/content';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Video, Calendar as CalendarIcon, Clock, User, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';

import { classroomSessionHref, practiceClassroomHref } from '@/lib/classroomRoom';
import { useStudentLiveJoin } from '@/lib/classroomJoin';
import { getHomeworkArray, homeworkLabel } from '@/lib/userDataHelpers';
import { formatClockTime } from '@/lib/timeFormat';

export default function VirtualClassroomPage() {
  const { userData, refreshUserData } = useAuth();
  
  const schedule = React.useMemo(() => {
    if (!userData?.schedule) return [];
    if (typeof userData.schedule === 'string') {
      try { return JSON.parse(userData.schedule); } catch { return []; }
    }
    return Array.isArray(userData.schedule) ? userData.schedule : [];
  }, [userData]);

  const pendingHw = React.useMemo(
    () => getHomeworkArray(userData?.homeworkInbox).filter((h: HomeworkItem) => h.status === 'pending'),
    [userData?.homeworkInbox]
  );
  
  const { liveRoom: roomID, canJoin, phase } = useStudentLiveJoin({
    schedule,
    attendanceLog: userData?.attendanceLog,
  });
  
  const [localSchedule, setLocalSchedule] = React.useState<ScheduleSlot[]>(schedule);

  React.useEffect(() => {
    import('@/lib/timezoneUtils').then(({ convertSlotToTimezone }) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const converted = schedule.map((slot: ScheduleSlot) => {
        if (!slot.day || !slot.time) return slot;
        const local = convertSlotToTimezone(slot.day, slot.time, slot.timezone || 'UTC', tz);
        return { ...slot, day: local.day, time: local.time };
      });
      setLocalSchedule(converted);
    });
  }, [schedule]);

  React.useEffect(() => {
    void refreshUserData();
  }, [refreshUserData]);
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-10 max-w-7xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-red-500 text-white flex items-center justify-center shadow-sm">
              <Video className="w-5 h-5" />
           </div>
           Virtual Classroom
        </h2>
        <p className="text-gray-500 m-0">Enter your live sessions and manage your learning schedule.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        
        {/* Left Column: Live Session Portal */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
           <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100 relative overflow-hidden group h-full flex flex-col justify-center items-center text-center">
              <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-rose-500/10 blur-[80px] rounded-full pointer-events-none transition-transform group-hover:scale-110 duration-1000" />
              
              <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mb-6 relative">
                 {canJoin && (
                    <>
                       <span className="absolute inset-0 rounded-full border-2 border-rose-500 animate-ping opacity-75"></span>
                       <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></span>
                    </>
                 )}
                 <Video className="w-10 h-10" />
              </div>

              <h3 className="text-2xl font-bold font-headers text-secondary mb-2 relative z-10">Live Session Portal</h3>
              <p className="text-gray-500 mb-8 max-w-[320px] relative z-10">
                 {phase === 'live' && "It's time for class. Join live, or use Practice if you only want the desk."}
                 {phase === 'rejoin' && "You were already in today's class. Rejoin even if the hour has passed."}
                 {phase === 'held_open' && "Your instructor is still in the room. You can join."}
                 {phase === 'ended' && "This class has ended. Practice is still open."}
                 {phase === 'upcoming' && "Live class opens at your scheduled time. Practice uses the same desk and never rings anyone."}
              </p>

              <div className="relative z-10 w-full max-w-[300px] flex flex-col gap-3">
                 {canJoin && roomID && roomID !== 'Ilmvers_General' ? (
                    <Link
                       href={classroomSessionHref({ role: 'student', room: roomID })}
                       className="inline-flex items-center justify-center px-10 py-4 rounded-full font-bold text-white bg-gradient-to-r from-rose-500 to-red-500 shadow-[0_4px_20px_rgba(244,63,94,0.3)] hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(244,63,94,0.4)] transition-all duration-300 w-full gap-2"
                    >
                       {phase === 'rejoin' ? 'Rejoin class' : 'Join Live Class'} <ArrowRight className="w-5 h-5" />
                    </Link>
                 ) : (
                    <button
                       type="button"
                       disabled
                       className="inline-flex items-center justify-center px-10 py-4 rounded-full font-bold text-white/70 bg-gray-300 w-full gap-2 cursor-not-allowed"
                    >
                       Join Live Class
                    </button>
                 )}
                 <Link
                    href={practiceClassroomHref({ role: 'student', liveRoom: roomID, email: userData?.email })}
                    className="inline-flex items-center justify-center px-10 py-3 rounded-full font-bold text-secondary bg-gray-100 hover:bg-gray-200 shadow-sm hover:-translate-y-1 transition-all duration-300 w-full gap-2"
                 >
                    Practice room <ArrowRight className="w-5 h-5" />
                 </Link>
              </div>
           </div>
        </motion.div>

        {/* Right Column: Schedule Matrix */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col h-full">
           <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden flex-1">
              <h3 className="text-xl font-bold font-headers text-secondary flex items-center gap-2 mb-6">
                 <CalendarIcon className="w-5 h-5 text-rose-500" /> Weekly Schedule
              </h3>

              {localSchedule.length > 0 ? (
                 <div className="space-y-4">
                    {localSchedule.map((slot: ScheduleSlot, idx: number) => (
                       <div key={idx} className="flex justify-between items-center p-5 bg-gray-50/50 rounded-2xl border border-gray-100 hover:border-rose-200 hover:bg-rose-50/30 transition-colors group">
                          <div>
                             <strong className="block text-secondary font-bold mb-1">{slot.day}</strong>
                             <span className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> {formatClockTime(slot.time)}
                             </span>
                          </div>
                          <div className="text-right">
                             <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1">
                                <User className="w-3 h-3" /> {slot.teacher}
                             </span>
                          </div>
                       </div>
                    ))}
                 </div>
              ) : (
                 <div className="bg-gray-50 rounded-2xl p-8 border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-[200px]">
                    <CalendarIcon className="w-10 h-10 text-gray-300 mb-3" />
                    <p className="text-gray-400 font-bold m-0">No schedule selected yet.</p>
                 </div>
              )}
           </div>
        </motion.div>
      </div>

      {/* Homework Section */}
      <motion.div variants={itemVariants}>
         <h3 className="text-xl font-bold font-headers text-secondary flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-amber-500" /> Active Assignments
         </h3>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pendingHw.length > 0 ? pendingHw.map((hw: HomeworkItem, idx: number) => (
               <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                  <div className="flex justify-between items-start mb-4">
                     <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                        <AlertCircle className="w-3 h-3" /> Due: {hw.dueDate || 'Soon'}
                     </span>
                     <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{hw.teacher}</span>
                  </div>
                  <p className="text-secondary font-medium mb-6 line-clamp-3">{homeworkLabel(hw)}</p>
                  
                  <Link href="/portal/homework" className="w-full inline-flex items-center justify-center py-3 rounded-full font-bold text-secondary bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 transition-all text-sm">
                     Submit Homework
                  </Link>
               </div>
            )) : (
               <div className="lg:col-span-3 bg-gray-50 rounded-[32px] p-8 border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white text-emerald-400 flex items-center justify-center shadow-sm mb-4 border border-emerald-100">
                     <BookOpen className="w-8 h-8" />
                  </div>
                  <h4 className="text-lg font-bold font-headers text-gray-500 mb-1">No pending assignments!</h4>
                  <p className="text-gray-400 m-0">Great job staying caught up with your studies.</p>
               </div>
            )}
         </div>
      </motion.div>

    </motion.div>
  );
}
