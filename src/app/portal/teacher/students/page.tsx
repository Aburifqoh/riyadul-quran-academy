'use client';

import { getProgressArray } from '@/lib/userDataHelpers';

import type { HifzSession } from '@/types/content';
import type { UserData } from '@/types/user';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTeacherStudents, teacherUpdateStudent, updateAttendance } from '@/lib/db';
import { planLabel } from '@/lib/billing';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, UserCircle2, Clock, MessageSquare, ChevronRight, CheckCircle, Target, Award, Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StudentRoster() {
  const { userData } = useAuth();
  const [students, setStudents] = useState<UserData[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<UserData | null>(null);
  
  const [tab, setTab] = useState('attendance');
  
  const [attStatus, setAttStatus] = useState('Present');
  const [attSubject, setAttSubject] = useState('');
  
  const [progName, setProgName] = useState('');
  const [progCurrent, setProgCurrent] = useState(0);
  const [progTotal, setProgTotal] = useState(100);
  const [progTopic, setProgTopic] = useState('');
  const [progNotes, setProgNotes] = useState('');
  
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hifzSessions, setHifzSessions] = useState<HifzSession[]>([]);

  useEffect(() => {
    if (selectedStudent?.id) {
      supabase.from('hifz_sessions').select('*').eq('student_id', selectedStudent.id).order('session_date', { ascending: false }).then(({data}) => {
        if(data) setHifzSessions(data);
      });
    }
  }, [selectedStudent]);

  useEffect(() => {
    if (userData?.id || userData?.email) {
      getTeacherStudents({ id: userData.id, email: userData.email }).then(setStudents);
    }
  }, [userData]);

  const handleAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !attSubject) return;
    setIsSubmitting(true);
    const success = await updateAttendance(selectedStudent.id, attStatus, attSubject);
    if (success) {
      alert("Attendance logged!");
      setAttSubject('');
    } else alert("Failed to log attendance.");
    setIsSubmitting(false);
  };

  const handleProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !progName || progTotal === 0) return;
    setIsSubmitting(true);
    
    try {

      const percentage = Math.round((progCurrent / progTotal) * 100);
      const now = new Date().toISOString();

      const existingProgress = [...getProgressArray(selectedStudent.progress)];
      const idx = existingProgress.findIndex((p: { name?: string }) => p.name === progName);

      // Keep an append-only lesson log per syllabus so teachers can record as many
      // topics/lessons as they cover over time, while the bar shows latest state.
      const prevEntries = idx >= 0 && Array.isArray(existingProgress[idx].entries)
        ? existingProgress[idx].entries as { date: string; topic: string; currentPage?: number; notes?: string }[]
        : [];
      const newEntries = progTopic.trim()
        ? [
            ...prevEntries,
            { date: now, topic: progTopic.trim(), currentPage: progCurrent, ...(progNotes.trim() ? { notes: progNotes.trim() } : {}) },
          ]
        : prevEntries;

      const newProgressItem = {
        name: progName,
        currentPage: progCurrent,
        totalPages: progTotal,
        percentage,
        color: '#10b981',
        topic: progTopic.trim() || (idx >= 0 ? existingProgress[idx].topic : undefined),
        updatedAt: now,
        entries: newEntries,
      };

      if (idx >= 0) {
        existingProgress[idx] = newProgressItem;
      } else {
        existingProgress.push(newProgressItem);
      }
      
      const saved = await teacherUpdateStudent(selectedStudent.id, { progress: existingProgress });
      if (!saved.success) {
         alert("Error updating progress: " + (saved.error || 'Update failed'));
         setIsSubmitting(false);
         return;
      }
      alert("Syllabus progress updated!");
      setProgName('');
      setProgCurrent(0);
      setProgTotal(100);
      setProgTopic('');
      setProgNotes('');
      getTeacherStudents({ id: userData?.id, email: userData?.email }).then((freshStudents) => {
        setStudents(freshStudents);
        const updated = freshStudents.find((s: UserData) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      });
    } catch {
       alert("Error updating progress.");
    }
    setIsSubmitting(false);
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !feedbackMsg) return;
    setIsSubmitting(true);
    try {
      const newFeedback = {
          date: new Date().toISOString(),
          comment: feedbackMsg,
          teacher: userData?.name ?? 'Teacher',
          teacherEmail: userData?.email ?? ''
      };
      const existingFeedback = Array.isArray(selectedStudent.feedback) ? selectedStudent.feedback : [];
      const saved = await teacherUpdateStudent(selectedStudent.id, {
        feedback: [...existingFeedback, newFeedback]
      });
      if (!saved.success) {
        alert("Error saving feedback: " + (saved.error || 'Update failed'));
        setIsSubmitting(false);
        return;
      }
      getTeacherStudents({ id: userData?.id, email: userData?.email }).then((freshStudents) => {
        setStudents(freshStudents);
        const updated = freshStudents.find((s: UserData) => s.id === selectedStudent.id);
        if (updated) setSelectedStudent(updated);
      });
      alert('Feedback sent!');
      setFeedbackMsg('');
    } catch {
      alert('Error saving feedback');
    }
    setIsSubmitting(false);
  };

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
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 text-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5" />
           </div>
           Academic Roster
        </h2>
        <p className="text-gray-500 m-0">Manage your students, log attendance, and record syllabus progress.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Student List */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-4">
           {students.length > 0 ? students.map((s) => (
             <div 
               key={s.id} 
               onClick={() => setSelectedStudent(s)}
               className={cn(
                  "bg-white rounded-3xl p-6 shadow-sm border transition-all cursor-pointer group flex items-center justify-between",
                  selectedStudent?.id === s.id 
                     ? "border-blue-300 bg-blue-50/50" 
                     : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
               )}
             >
               <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xl font-bold shadow-inner">
                    {s?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                     <h4 className="m-0 text-lg font-bold text-secondary">{s.name}</h4>
                     <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">
                        {planLabel(s.tuitionPlan)}
                     </span>
                  </div>
               </div>
               <ChevronRight className={cn(
                  "w-5 h-5 transition-transform",
                  selectedStudent?.id === s.id ? "text-blue-500" : "text-gray-300 group-hover:text-blue-400 group-hover:translate-x-1"
               )} />
             </div>
           )) : (
             <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-xl font-bold font-headers text-gray-400 mb-2">No Students Assigned</h3>
                <p className="text-gray-400 text-sm max-w-[200px]">You do not have any active students in your roster at this time.</p>
             </div>
           )}
        </motion.div>

        {/* Right Column: Management Panel */}
        <motion.div variants={itemVariants} className="lg:col-span-7">
           <AnimatePresence mode="wait">
              {selectedStudent ? (
                 <motion.div 
                    key="management-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white rounded-[32px] p-8 md:p-10 shadow-lg border border-gray-100 sticky top-24"
                 >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-gray-100 pb-6 mb-8">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-white flex items-center justify-center text-xl font-bold shadow-md">
                             {selectedStudent?.name?.charAt(0) || '?'}
                          </div>
                          <div>
                             <h3 className="text-2xl font-bold font-headers text-secondary m-0">{selectedStudent.name}</h3>
                             <p className="text-gray-500 text-sm font-medium m-0 flex items-center gap-1">
                                <Award className="w-4 h-4" /> Active Student
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex bg-gray-50 border border-gray-200 rounded-full p-1.5 mb-8 shadow-inner overflow-x-auto no-scrollbar">
                       <button onClick={() => setTab('attendance')} className={cn("px-6 py-2.5 rounded-full text-sm font-bold flex-1 flex items-center justify-center gap-2 transition-all whitespace-nowrap", tab === 'attendance' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-secondary")}>
                          <Clock className="w-4 h-4" /> Attendance
                       </button>
                       <button onClick={() => setTab('progress')} className={cn("px-6 py-2.5 rounded-full text-sm font-bold flex-1 flex items-center justify-center gap-2 transition-all whitespace-nowrap", tab === 'progress' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-secondary")}>
                          <Target className="w-4 h-4" /> Progress
                       </button>
                       <button onClick={() => setTab('feedback')} className={cn("px-6 py-2.5 rounded-full text-sm font-bold flex-1 flex items-center justify-center gap-2 transition-all whitespace-nowrap", tab === 'feedback' ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-secondary")}>
                          <MessageSquare className="w-4 h-4" /> Feedback
                       </button>
                       <button onClick={() => setTab('hifz')} className={cn("px-6 py-2.5 rounded-full text-sm font-bold flex-1 flex items-center justify-center gap-2 transition-all whitespace-nowrap", tab === 'hifz' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-secondary")}>
                          <Mic className="w-4 h-4" /> AI Hifz
                       </button>
                    </div>

                    {/* Forms */}
                    <AnimatePresence mode="wait">
                       
                       {tab === 'attendance' && (
                          <motion.form key="att" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={handleAttendance} className="space-y-6">
                             <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                <div className="mb-5">
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Topic / Lesson Covered</label>
                                   <input type="text" className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all bg-white" placeholder="e.g. Surah Al-Baqarah Ayah 1-5" value={attSubject} onChange={e=>setAttSubject(e.target.value)} required />
                                </div>
                                <div>
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Session Status</label>
                                   <select className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all bg-white cursor-pointer font-bold" value={attStatus} onChange={e=>setAttStatus(e.target.value)}>
                                      <option value="Present">Present (Attended)</option>
                                      <option value="Absent">Absent (Missed)</option>
                                      <option value="Late">Late (Tardy)</option>
                                   </select>
                                </div>
                             </div>
                             <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-full font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                                {isSubmitting ? 'Saving...' : <><CheckCircle className="w-5 h-5" /> Log Attendance</>}
                             </button>
                          </motion.form>
                       )}

                       {tab === 'progress' && (
                          <motion.div key="prog" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                          <form onSubmit={handleProgress} className="space-y-6">
                             <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 space-y-5">
                                <div>
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Syllabus / Book Name</label>
                                   <input type="text" className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white" placeholder="e.g. Qaida Noorania, Juz Amma" value={progName} onChange={e=>setProgName(e.target.value)} required />
                                </div>
                                <div>
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Topic / Lesson Covered</label>
                                   <input type="text" className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white" placeholder="e.g. Surah Al-Baqarah Ayah 1-5" value={progTopic} onChange={e=>setProgTopic(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Current Page</label>
                                      <input type="number" className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white font-bold" value={progCurrent} onChange={e=>setProgCurrent(Number(e.target.value))} required min="0" />
                                   </div>
                                   <div>
                                      <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Total Pages</label>
                                      <input type="number" className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white font-bold" value={progTotal} onChange={e=>setProgTotal(Number(e.target.value))} required min="1" />
                                   </div>
                                </div>
                                <div>
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Notes (optional)</label>
                                   <textarea className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white min-h-[80px] resize-none" placeholder="Anything to remember for next class..." value={progNotes} onChange={e=>setProgNotes(e.target.value)} />
                                </div>
                                <p className="text-xs text-gray-500 m-0">Add a topic each class to build a lesson log. Use the same syllabus name to keep it grouped; use a new name to track another book.</p>
                             </div>
                             <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-full font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                                {isSubmitting ? 'Saving...' : <><Target className="w-5 h-5" /> Save Progress & Lesson</>}
                             </button>
                          </form>

                          {/* Existing progress + lesson history */}
                          {getProgressArray(selectedStudent.progress).length > 0 && (
                            <div className="space-y-4">
                               <p className="text-xs font-black uppercase tracking-widest text-gray-400 m-0">Recorded Progress</p>
                               {getProgressArray(selectedStudent.progress).map((p, pi) => {
                                  const entries = Array.isArray(p.entries) ? [...p.entries].reverse() : [];
                                  return (
                                    <div key={pi} className="bg-white border border-gray-200 rounded-2xl p-5">
                                       <div className="flex items-center justify-between gap-3 mb-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                             <button
                                                type="button"
                                                onClick={() => { setProgName(p.name || ''); setProgCurrent(p.currentPage || 0); setProgTotal(p.totalPages || 100); }}
                                                className="font-bold text-secondary truncate hover:text-emerald-600"
                                                title="Load into form to continue"
                                             >
                                                {p.name}
                                             </button>
                                          </div>
                                          <span className="text-xs font-black text-emerald-600 shrink-0">{p.percentage ?? 0}%</span>
                                       </div>
                                       <div className="w-full bg-gray-100 rounded-full h-2 mb-3 overflow-hidden">
                                          <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, p.percentage ?? 0)}%` }} />
                                       </div>
                                       {p.topic && <p className="text-sm text-secondary m-0 mb-2"><span className="text-gray-400">Latest topic:</span> {p.topic}</p>}
                                       {entries.length > 0 && (
                                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                             {entries.map((e, ei) => (
                                                <div key={ei} className="text-xs bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                                   <div className="flex justify-between gap-2">
                                                      <span className="font-semibold text-secondary">{e.topic}</span>
                                                      <span className="text-gray-400 shrink-0">{new Date(e.date).toLocaleDateString()}</span>
                                                   </div>
                                                   {e.notes && <p className="text-gray-500 m-0 mt-1">{e.notes}</p>}
                                                </div>
                                             ))}
                                          </div>
                                       )}
                                    </div>
                                  );
                               })}
                            </div>
                          )}
                          </motion.div>
                       )}

                       {tab === 'feedback' && (
                          <motion.form key="feed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} onSubmit={handleFeedback} className="space-y-6">
                             <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100">
                                <div>
                                   <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Post-Class Feedback</label>
                                   <p className="text-xs text-gray-500 mb-4 font-medium">This will be sent directly to the student/parent dashboard.</p>
                                   <textarea className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-purple-400 focus:ring-4 focus:ring-purple-50 transition-all bg-white min-h-[150px] resize-none" placeholder="Masha Allah! Today we completed..." value={feedbackMsg} onChange={e=>setFeedbackMsg(e.target.value)} required />
                                </div>
                             </div>
                             <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-full font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                                {isSubmitting ? 'Sending...' : <><Send className="w-5 h-5" /> Send to Student</>}
                             </button>
                          </motion.form>
                       )}

                       {tab === 'hifz' && (
                          <motion.div key="hifz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                             {hifzSessions.length === 0 ? (
                               <div className="p-6 text-center text-gray-400 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                 No AI Hifz Lab sessions recorded yet.
                               </div>
                             ) : hifzSessions.map((session, i) => (
                               <div key={i} className="bg-amber-50/30 p-5 rounded-2xl border border-amber-100 flex flex-col gap-3">
                                 <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-bold text-secondary">{session.surah_name} <span className="text-sm font-normal text-gray-500">({session.ayah_range})</span></h4>
                                      <div className="text-xs text-gray-400">{new Date(String(session.session_date ?? '')).toLocaleString()}</div>
                                    </div>
                                    <div className="font-bold text-amber-600 bg-amber-100 px-3 py-1 rounded-full text-sm">
                                      Score: {session.accuracy_score}%
                                    </div>
                                 </div>
                                 <div className="text-sm text-gray-600 mt-2 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                   <strong className="text-secondary flex items-center gap-2 mb-1"><Mic className="w-3 h-3 text-amber-500"/> AI Tajweed & Memorization Feedback:</strong>
                                   <p className="mt-1 whitespace-pre-wrap leading-relaxed">{session.tajweed_feedback}</p>
                                 </div>
                               </div>
                             ))}
                          </motion.div>
                       )}

                    </AnimatePresence>
                 </motion.div>
              ) : (
                 <motion.div 
                    key="empty-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center h-full min-h-[500px] text-center p-10"
                 >
                    <div className="w-20 h-20 rounded-full bg-white text-gray-300 flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                       <UserCircle2 className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold font-headers text-gray-400 mb-2">Select a Student</h3>
                    <p className="text-gray-400 max-w-[300px] leading-relaxed">Choose a student from your roster on the left to log attendance, track syllabus progress, or send direct feedback.</p>
                 </motion.div>
              )}
           </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
