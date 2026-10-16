'use client';

import type { UserData } from '@/types/user';

import type { HifzSession } from '@/types/content';
import type { HomeworkItem } from '@/types/content';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getTeacherStudents, submitHomework, gradeHomework } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { FileSignature, Send, User, Calendar, CheckCircle, GraduationCap, Edit3, MessageSquare, Target, Info, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { planLabel } from '@/lib/billing';

export default function HomeworkManager() {
  const { userData } = useAuth();
  const [students, setStudents] = useState<UserData[]>([]);
  // 'assign', 'grade', or 'hifz'
  const [activeTab, setActiveTab] = useState('assign');
  const [hifzSessions, setHifzSessions] = useState<HifzSession[]>([]);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [homeworkText, setHomeworkText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Grade Form
  const [selectedHw, setSelectedHw] = useState<HomeworkItem | null>(null);
  const [selectedHwStudentId, setSelectedHwStudentId] = useState('');
  const [grade, setGrade] = useState('A');
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  useEffect(() => {
    if (userData?.id || userData?.email) {
      getTeacherStudents({ id: userData.id, email: userData.email }).then(async (fetchedStudents) => {
        setStudents(fetchedStudents);
        // Also fetch Hifz sessions for these students
        const studentIds = fetchedStudents.map(s => s.id);
        if (studentIds.length > 0) {
          const { data } = await supabase.from('hifz_sessions')
            .select('*')
            .in('student_id', studentIds)
            .order('session_date', { ascending: false });
          if (data) setHifzSessions(data);
        }
      });
    }
  }, [userData]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail || !homeworkText || !dueDate) return;

    setIsSubmitting(true);
    const success = await submitHomework(selectedEmail, userData?.name || 'Teacher', homeworkText, dueDate);
    if (success) {
      alert('Homework assigned successfully!');
      setHomeworkText('');
      setDueDate('');
      setSelectedEmail('');
      getTeacherStudents({ id: userData?.id, email: userData?.email }).then(setStudents);
    } else {
      alert('Error assigning homework');
    }
    setIsSubmitting(false);
  };

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHw || !selectedHwStudentId) return;

    setIsGrading(true);
    const success = await gradeHomework(selectedHwStudentId, selectedHw.id ?? '', grade, feedback);
    if (success) {
      alert("Graded successfully!");
      setSelectedHw(null);
      setFeedback('');
      setGrade('A');
      getTeacherStudents({ id: userData?.id, email: userData?.email }).then(setStudents);
    } else {
      alert("Error grading homework.");
    }
    setIsGrading(false);
  };

  // Collect all submitted homework
  const submittedHomeworks: HomeworkItem[] = [];
  students.forEach(student => {
    const inbox = Array.isArray(student.homeworkInbox) ? student.homeworkInbox : [];
    inbox.forEach((hw: HomeworkItem) => {
      if (hw.status === 'submitted') {
        submittedHomeworks.push({ ...hw, studentName: student.name, studentId: student.id });
      }
    });
  });

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
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center shadow-sm">
                <FileSignature className="w-5 h-5" />
             </div>
             Assignments Manager
          </h2>
          <p className="text-gray-500 m-0">Assign tasks and review student submissions.</p>
        </div>
      </div>
        
      <div className="flex flex-col md:flex-row gap-8 mt-4">
        {/* Left Side Vertical Tabs */}
        <div className="w-full md:w-64 flex flex-col gap-2 shrink-0">
           <button 
            onClick={() => setActiveTab('assign')} 
            className={cn(
               "w-full text-left px-5 py-4 font-bold rounded-2xl transition-all flex items-center gap-3",
               activeTab === 'assign' 
                 ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700" 
                 : "bg-white text-gray-500 hover:text-secondary hover:bg-gray-50 border border-gray-100"
            )}
          >
            <Edit3 className="w-5 h-5" /> Draft Assignment
          </button>
          
          <button 
            onClick={() => setActiveTab('grade')} 
            className={cn(
               "w-full text-left px-5 py-4 font-bold rounded-2xl transition-all flex items-center justify-between",
               activeTab === 'grade' 
                 ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700" 
                 : "bg-white text-gray-500 hover:text-secondary hover:bg-gray-50 border border-gray-100"
            )}
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5" /> Submissions
            </div>
            {submittedHomeworks.length > 0 && (
               <span className={cn(
                 "text-[11px] w-6 h-6 rounded-full flex items-center justify-center font-black",
                 activeTab === 'grade' ? "bg-white text-emerald-600" : "bg-red-500 text-white"
               )}>
                 {submittedHomeworks.length}
               </span>
            )}
          </button>
          
          <button 
            onClick={() => setActiveTab('hifz')} 
            className={cn(
               "w-full text-left px-5 py-4 font-bold rounded-2xl transition-all flex items-center justify-between",
               activeTab === 'hifz' 
                 ? "bg-blue-600 text-white shadow-md hover:bg-blue-700" 
                 : "bg-white text-gray-500 hover:text-secondary hover:bg-gray-50 border border-gray-100"
            )}
          >
            <div className="flex items-center gap-3">
              <Bot className="w-5 h-5" /> AI Hifz Lab
            </div>
          </button>
        </div>

        {/* Right Side Content Area */}
        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
         {activeTab === 'assign' && (
            <motion.div key="assign-tab" variants={containerVariants} initial="hidden" animate="visible" exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <motion.div variants={itemVariants} className="lg:col-span-8">
                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                     <h3 className="text-xl font-bold font-headers text-secondary border-b border-gray-100 pb-4 mb-6">Draft New Assignment</h3>
                     
                     <form onSubmit={handleAssign} className="space-y-6">
                        <div className="bg-indigo-50/30 p-6 rounded-2xl border border-indigo-50">
                           <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                              <User className="w-4 h-4 text-indigo-400" /> Select Student
                           </label>
                           <select 
                              required
                              value={selectedEmail}
                              onChange={(e) => setSelectedEmail(e.target.value)}
                              className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white font-bold cursor-pointer"
                           >
                              <option value="">-- Choose a Student --</option>
                              {students.map((s) => (
                                 <option key={s.id} value={s.id}>{s.name}{s.tuitionPlan ? ` (${planLabel(s.tuitionPlan)})` : ''}</option>
                              ))}
                           </select>
                        </div>

                        <div>
                           <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                              <Target className="w-4 h-4 text-indigo-400" /> Assignment Description
                           </label>
                           <textarea 
                              required
                              value={homeworkText}
                              onChange={(e) => setHomeworkText(e.target.value)}
                              className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white min-h-[150px] resize-none"
                              placeholder="1. Memorize Surah Al-Mulk V 1-5&#10;2. Complete Arabic Workbook Page 12"
                           />
                        </div>

                        <div>
                           <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3 flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-indigo-400" /> Due Date
                           </label>
                           <input 
                              required
                              type="date"
                              value={dueDate}
                              onChange={(e) => setDueDate(e.target.value)}
                              className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all bg-white font-bold"
                           />
                        </div>

                        <button 
                           type="submit"
                           disabled={isSubmitting}
                           className="w-full py-4 rounded-full font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2"
                        >
                           {isSubmitting ? 'Assigning...' : <><Send className="w-5 h-5" /> Assign to Student</>}
                        </button>
                     </form>
                  </div>
               </motion.div>

               <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-6">
                  <div className="bg-indigo-600 rounded-[32px] p-8 text-white shadow-lg relative overflow-hidden group">
                     <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 blur-[40px] rounded-full pointer-events-none transition-transform group-hover:scale-125 duration-1000" />
                     <h3 className="text-xl font-bold font-headers mb-6 relative z-10 flex items-center gap-2">
                        <Info className="w-5 h-5" /> Faculty Guidelines
                     </h3>
                     <div className="space-y-6 relative z-10">
                        <div>
                           <strong className="block mb-1 text-indigo-200 uppercase tracking-widest text-xs">Clear Instructions</strong>
                           <p className="text-sm m-0 leading-relaxed font-medium">Always specify surah names and verse ranges clearly to avoid confusion for both parents and students.</p>
                        </div>
                        <div>
                           <strong className="block mb-1 text-indigo-200 uppercase tracking-widest text-xs">Worksheets</strong>
                           <p className="text-sm m-0 leading-relaxed font-medium">You can mention PDF resources available in the Faculty Resources tab in your descriptions.</p>
                        </div>
                        <div>
                           <strong className="block mb-1 text-indigo-200 uppercase tracking-widest text-xs">Due Dates</strong>
                           <p className="text-sm m-0 leading-relaxed font-medium">Assignments are typically due 24 hours before the next scheduled session.</p>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
         )}

         {activeTab === 'grade' && (
            <motion.div key="grade-tab" variants={containerVariants} initial="hidden" animate="visible" exit={{ opacity: 0, y: -20 }} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
               <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-4">
                  {submittedHomeworks.length > 0 ? submittedHomeworks.map((hw: HomeworkItem, idx: number) => (
                    <div 
                      key={idx} 
                      className={cn(
                         "p-6 rounded-3xl shadow-sm cursor-pointer transition-all border group",
                         selectedHw?.id === hw.id 
                            ? "border-emerald-400 bg-emerald-50/50" 
                            : "border-gray-100 bg-white hover:border-emerald-200 hover:bg-gray-50"
                      )}
                      onClick={() => { setSelectedHw(hw); setSelectedHwStudentId(hw.studentId ?? ''); }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <strong className="block text-lg font-bold text-secondary mb-1">{hw.studentName}</strong>
                          <span className="text-sm text-gray-600 line-clamp-1">{hw.text}</span>
                        </div>
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100 whitespace-nowrap">
                           Awaiting Grade
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Submitted: {hw.response?.submittedAt ? new Date(hw.response.submittedAt).toLocaleDateString() : 'Recently'}
                      </div>
                    </div>
                  )) : (
                    <div className="bg-gray-50 p-10 rounded-3xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center h-full min-h-[300px]">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mb-4" />
                      <h3 className="text-xl font-bold font-headers text-gray-400 mb-2">All caught up!</h3>
                      <p className="text-gray-400 text-sm">There are no ungraded submissions.</p>
                    </div>
                  )}
               </motion.div>

               <motion.div variants={itemVariants} className="lg:col-span-7">
                  <AnimatePresence mode="wait">
                     {selectedHw ? (
                       <motion.div 
                          key="grading-panel"
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 sticky top-24"
                       >
                         <h3 className="text-xl font-bold font-headers text-secondary border-b border-gray-100 pb-4 mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                               {selectedHw?.studentName?.charAt(0) || '?'}
                            </div>
                            Grading: {selectedHw.studentName}
                         </h3>

                         <div className="mb-6">
                           <strong className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-2">
                              <Target className="w-4 h-4 text-emerald-500" /> Original Task
                           </strong>
                           <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-gray-600 text-sm whitespace-pre-wrap">
                             {selectedHw.text}
                           </div>
                         </div>

                         <div className="mb-8">
                           <strong className="block text-sm font-bold uppercase tracking-wider text-secondary mb-2 flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-emerald-500" /> Student Submission
                           </strong>
                           {selectedHw.response?.type === 'audio' ? (
                             <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                               <audio src={selectedHw.response.data} controls className="w-full h-12" />
                             </div>
                           ) : (
                             <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-secondary whitespace-pre-wrap leading-relaxed font-medium">
                               {selectedHw.response?.data || 'No content provided.'}
                             </div>
                           )}
                         </div>

                         <form onSubmit={handleGrade} className="border-t border-gray-100 pt-8 space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="md:col-span-1">
                                <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Assign Grade</label>
                                <select 
                                   className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white font-bold cursor-pointer" 
                                   value={grade} 
                                   onChange={e => setGrade(e.target.value)} 
                                   required
                                >
                                  <option value="A+">A+ (Excellent)</option>
                                  <option value="A">A (Very Good)</option>
                                  <option value="B">B (Good)</option>
                                  <option value="C">C (Satisfactory)</option>
                                  <option value="Needs Work">Needs Work</option>
                                </select>
                              </div>
                           </div>

                           <div>
                             <label className="block text-sm font-bold uppercase tracking-wider text-secondary mb-3">Feedback Notes</label>
                             <textarea 
                               className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all bg-white min-h-[120px] resize-none" 
                               placeholder="Great tajweed on the letter Qaf, but please revise the rules of Madd..."
                               value={feedback}
                               onChange={e => setFeedback(e.target.value)}
                               required
                             ></textarea>
                           </div>

                           <div className="flex gap-4">
                             <button type="button" onClick={() => setSelectedHw(null)} className="flex-1 py-4 rounded-full font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                             <button type="submit" disabled={isGrading} className="flex-[2] py-4 rounded-full font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center justify-center gap-2">
                                {isGrading ? 'Saving...' : <><CheckCircle className="w-5 h-5" /> Submit Grade</>}
                             </button>
                           </div>
                         </form>
                       </motion.div>
                     ) : (
                       <motion.div 
                          key="empty-grading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center h-full min-h-[500px] text-center p-10"
                       >
                         <div className="w-20 h-20 rounded-full bg-white text-gray-300 flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                           <GraduationCap className="w-10 h-10" />
                         </div>
                         <h3 className="text-2xl font-bold font-headers text-gray-400 mb-2">Select a Submission</h3>
                         <p className="text-gray-400 max-w-[300px] leading-relaxed">Choose a student&apos;s submission from the left to review their work and provide a grade with feedback.</p>
                       </motion.div>
                     )}
                  </AnimatePresence>
               </motion.div>
            </motion.div>
         )}

         {activeTab === 'hifz' && (
            <motion.div key="hifz-tab" variants={containerVariants} initial="hidden" animate="visible" exit={{ opacity: 0, y: -20 }} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
               <h3 className="text-xl font-bold font-headers text-secondary border-b border-gray-100 pb-4 mb-6 flex items-center gap-2">
                 <Bot className="w-6 h-6 text-blue-500" /> Students&apos; AI Hifz Sessions
               </h3>
               <div className="space-y-4">
                 {hifzSessions.length === 0 ? (
                    <div className="text-center p-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <p className="text-gray-400 font-bold">No AI Hifz sessions recorded by your students yet.</p>
                    </div>
                 ) : (
                    hifzSessions.map(session => (
                       <div key={session.id} className="p-6 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-md transition-all group">
                         <div className="flex justify-between items-start mb-4">
                           <div>
                             <strong className="text-lg font-bold text-secondary block">{session.student_name}</strong>
                             <span className="text-sm text-gray-500">{session.surah_name} (Ayahs: {session.ayah_range})</span>
                           </div>
                           <div className="text-right">
                             <div className={cn("text-2xl font-black font-headers", (session.accuracy_score ?? 0) >= 90 ? "text-emerald-500" : (session.accuracy_score ?? 0) >= 75 ? "text-amber-500" : "text-red-500")}>
                               {session.accuracy_score ?? 0}%
                             </div>
                             <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Accuracy</span>
                           </div>
                         </div>
                         <div className="text-sm text-gray-600 mb-4 bg-white p-4 rounded-xl border border-gray-100">
                           <strong className="block text-secondary mb-1">Tajweed AI Feedback:</strong>
                           {session.tajweed_feedback}
                         </div>
                         <div className="text-xs text-gray-400 font-bold tracking-wider">
                           Recorded on: {new Date(String(session.session_date ?? '')).toLocaleString()}
                         </div>
                       </div>
                    ))
                 )}
               </div>
            </motion.div>
         )}
      </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
