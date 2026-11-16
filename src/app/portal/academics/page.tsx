'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CalendarDays, CheckCircle, Clock, AlertCircle, Target, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AcademicsPage() {
  const { userData } = useAuth();
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);
  
  const name = userData?.name || 'Student';
  const teacherName = (userData?.schedule && userData?.schedule[0]) ? userData?.schedule[0].teacher : 'Pending Assignment';
  const nowDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];
  const todaySch = (userData?.schedule || []).filter((s: any) => s.day === nowDay && s.time !== 'TBD');
  const pendingHw = (userData?.homeworkInbox || []).filter((h: any) => h.status === 'pending');
  const progress = userData?.progress || [];
  const attendance = userData?.attendanceLog || [];

  const displayedAttendance = attendanceExpanded ? attendance : attendance.slice(0, 5);

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
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2">Academic Records</h2>
        <p className="text-gray-500 m-0">Track your progress, attendance, and daily schedules.</p>
      </div>

      {/* Hero Profile Card */}
      <motion.div variants={itemVariants} className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 mb-8 text-white shadow-lg relative overflow-hidden group">
        <div className="absolute top-[-50%] right-[-10%] w-[80%] h-[150%] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none transition-transform group-hover:scale-110 duration-1000" />
        
        <div className="w-24 h-24 rounded-[24px] flex items-center justify-center text-4xl font-black shrink-0 bg-white/10 backdrop-blur-md border-2 border-white/20 shadow-inner">
          {name.charAt(0)}
        </div>
        <div className="flex-1 text-center md:text-left z-10">
          <h2 className="text-white m-0 mb-4 text-4xl font-bold font-headers">{name}</h2>
          <div className="flex flex-wrap gap-3 items-center justify-center md:justify-start">
            <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#004D4A] to-[#0F3D38] text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-[#004D4A]/20">
              <Award className="w-4 h-4" /> {userData?.type === 'child' ? 'Youth Program' : 'Adult Mastery'}
            </span>
            <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20">
              <Target className="w-4 h-4" /> Instructor: {teacherName}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
         {/* Today's Schedule */}
         <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
            <h3 className="flex items-center gap-3 mb-6 text-xl font-bold font-headers text-secondary">
              <div className="w-10 h-10 rounded-xl bg-[#E6F3F2] text-[#004D4A] flex items-center justify-center">
                 <CalendarDays className="w-5 h-5" />
              </div>
              Today's Schedule
            </h3>
            
            <div className="flex flex-col gap-4">
               {todaySch.length > 0 ? todaySch.map((s: any, idx: number) => (
                  <div key={idx} className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100/50 hover:bg-amber-50 hover:border-amber-200 transition-colors">
                     <strong className="block text-lg text-secondary mb-1">{s.subject}</strong>
                     <span className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4" /> {s.teacher} • {s.time}
                     </span>
                  </div>
               )) : (
                  <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold m-0">No classes scheduled for today.</p>
                  </div>
               )}
            </div>
         </motion.div>
         
         {/* Action Required */}
         <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
            <h3 className="flex items-center gap-3 mb-6 text-xl font-bold font-headers text-secondary">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                 <AlertCircle className="w-5 h-5" />
              </div>
              Action Required
            </h3>
            
            <div className="flex flex-col gap-4">
               {pendingHw.length > 0 ? pendingHw.map((h: any, idx: number) => (
                  <div key={idx} className="bg-red-50/50 p-5 rounded-2xl border border-red-100 hover:bg-red-50 transition-colors">
                     <strong className="block text-lg text-red-600 mb-1">{h.task}</strong>
                     <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                        {h.teacher} • Due: {new Date(h.dateAssigned).toLocaleDateString()}
                     </span>
                  </div>
               )) : (
                  <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-bold m-0">Great job! You have no pending tasks.</p>
                  </div>
               )}
            </div>
         </motion.div>
      </div>

      {/* Progress & Attendance Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SYLLABUS PROGRESS */}
        <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group h-max">
          <h3 className="flex items-center gap-3 mb-8 text-xl font-bold font-headers text-secondary">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
               <BookOpen className="w-5 h-5" />
            </div>
            Syllabus Progress
          </h3>
          <div className="flex flex-col gap-8">
            {progress.length > 0 ? progress.map((p: any, idx: number) => (
              <div key={idx}>
                <div className="flex justify-between items-end mb-3">
                  <span className="font-bold text-secondary text-lg">{p.name}</span>
                  <span className="font-black text-gray-400">
                    {p.currentPage !== undefined ? `Pg ${p.currentPage}/${p.totalPages} (${p.percentage}%)` : `${p.percentage}%`}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${p.percentage}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="absolute top-0 left-0 h-full rounded-full bg-emerald-500"
                    style={{ backgroundColor: p.color || '#10b981' }}
                  />
                </div>
              </div>
            )) : (
              <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                <p className="text-gray-500 font-bold m-0">No syllabus data recorded yet.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ATTENDANCE LOG */}
        <motion.div variants={itemVariants} className="bg-white rounded-[32px] shadow-sm border border-gray-100 relative overflow-hidden flex flex-col h-max">
          <div className="p-8 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
               <h3 className="flex items-center gap-3 m-0 text-xl font-bold font-headers text-secondary">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5" />
                 </div>
                 Attendance Log
               </h3>
               <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                 {attendance.length} Total
               </span>
            </div>
          </div>
          
          <div className="flex-1 w-full relative">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 px-4 md:px-8 text-xs font-black uppercase tracking-widest text-gray-400">Date</th>
                    <th className="p-4 px-4 md:px-8 text-xs font-black uppercase tracking-widest text-gray-400">Subject</th>
                    <th className="p-4 px-4 md:px-8 text-xs font-black uppercase tracking-widest text-gray-400 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <AnimatePresence>
                    {displayedAttendance.length > 0 ? displayedAttendance.map((a: any, idx: number) => (
                      <motion.tr 
                        key={idx} 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="p-4 px-4 md:px-8 font-bold text-secondary whitespace-nowrap">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="p-4 px-4 md:px-8 font-bold text-secondary">{a.subject}</td>
                        <td className="p-4 px-4 md:px-8 text-right">
                          <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-[10px] md:text-xs font-bold border",
                            a.status.toLowerCase() === 'present' 
                               ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                               : "bg-amber-50 text-amber-600 border-amber-200"
                          )}>
                            {a.status}
                          </span>
                        </td>
                      </motion.tr>
                    )) : (
                      <tr>
                         <td colSpan={3} className="p-12 text-center bg-white">
                            <div className="flex flex-col items-center justify-center text-gray-400">
                               <Clock className="w-10 h-10 mb-3 opacity-20" />
                               <span className="font-semibold">No classes tracked yet.</span>
                            </div>
                         </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            
            {/* Expand / Collapse Button */}
            {attendance.length > 5 && (
               <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                  <button 
                     onClick={() => setAttendanceExpanded(!attendanceExpanded)}
                     className="flex items-center gap-2 text-sm font-bold text-secondary bg-white border border-gray-200 px-6 py-3 rounded-full hover:border-primary hover:text-primary hover:shadow-md transition-all active:scale-95"
                  >
                     {attendanceExpanded ? (
                        <>Show Less <ChevronUp className="w-4 h-4" /></>
                     ) : (
                        <>View All ({attendance.length}) <ChevronDown className="w-4 h-4" /></>
                     )}
                  </button>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
