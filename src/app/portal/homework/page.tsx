'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { submitHomeworkResponse } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { FileEdit, Mic, Square, CheckCircle, Clock, AlertCircle, X, Send, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export default function StudentHomeworkPage() {
  const { user, userData } = useAuth();
  const homework = userData?.homeworkInbox || [];
  
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [responseText, setResponseText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const handleSubmit = async () => {
    if (!user || !selectedHw) return;
    
    setSubmitting(true);
    let type: 'text' | 'audio' = 'text';
    let data = responseText;

    if (audioBlob) {
      // Use FormData to send to our Cloudflare Pages Function proxy
      const formData = new FormData();
      const filename = `hw_${selectedHw.id}_${user.id}_${Date.now()}.webm`;
      formData.append('audioFile', audioBlob);
      formData.append('filename', filename);

      try {
        const uploadRes = await fetch('/api/upload-audio', {
          method: 'POST',
          body: formData
        });
        const json = await uploadRes.json();
        
        if (!uploadRes.ok || json.error) {
           alert("Audio upload failed: " + (json.error || 'Unknown error. Are you running on Cloudflare Pages?'));
           setSubmitting(false);
           return;
        }
        
        // Save the public path that will retrieve the file from R2 via our proxy function
        data = `/api/audio/${json.filename}`;
        type = 'audio';
      } catch (err) {
        alert("Upload error. Please try again.");
        setSubmitting(false);
        return;
      }
    } else if (!responseText.trim()) {
      alert("Please provide a text response or record audio.");
      setSubmitting(false);
      return;
    }

    const success = await submitHomeworkResponse(user.id, selectedHw.id, type, data);
    if (success) {
      alert("Homework submitted successfully!");
      setSelectedHw(null);
      setResponseText('');
      clearAudio();
      window.location.reload(); 
    } else {
      alert("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  const pending = homework.filter((h: any) => h.status === 'pending');
  const completed = homework.filter((h: any) => h.status !== 'pending');

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
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2">Homework & Assignments</h2>
        <p className="text-gray-500 m-0">Complete pending tasks and review teacher feedback.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks List */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Pending Tasks */}
          <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
            <h3 className="flex items-center gap-3 mb-6 text-xl font-bold font-headers text-secondary">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center">
                 <AlertCircle className="w-5 h-5" />
              </div>
              Pending Tasks
            </h3>
            
            <div className="flex flex-col gap-4">
              {pending.length > 0 ? pending.map((h: any) => (
                <div 
                   key={h.id} 
                   onClick={() => setSelectedHw(h)}
                   className={cn(
                      "p-5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer group",
                      selectedHw?.id === h.id 
                        ? "bg-amber-50/50 border-amber-300 shadow-sm" 
                        : "bg-red-50/50 border-red-100 hover:border-red-300 hover:bg-red-50"
                   )}
                >
                  <div>
                    <strong className="block text-lg text-red-600 mb-1">{h.task}</strong>
                    <span className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Due: {new Date(h.dueDate || h.date).toLocaleDateString()}
                    </span>
                  </div>
                  <button className={cn(
                    "px-6 py-2 rounded-full font-bold text-sm transition-all",
                    selectedHw?.id === h.id ? "bg-amber-500 text-white shadow-md" : "bg-white text-secondary border border-gray-200 group-hover:border-secondary"
                  )}>
                    {selectedHw?.id === h.id ? 'Selected' : 'Complete'}
                  </button>
                </div>
              )) : (
                <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-gray-500 font-bold m-0">No pending assignments.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Past Submissions */}
          <motion.div variants={itemVariants} className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden group">
            <h3 className="flex items-center gap-3 mb-6 text-xl font-bold font-headers text-secondary">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                 <CheckCircle className="w-5 h-5" />
              </div>
              Past Submissions
            </h3>
            
            <div className="flex flex-col gap-4">
              {completed.length > 0 ? completed.map((h: any) => (
                <div key={h.id} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                  <div className="flex justify-between items-start">
                     <div>
                       <strong className="block text-lg text-secondary mb-1">{h.task}</strong>
                       <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Submitted: {new Date(h.response?.submittedAt || h.date).toLocaleDateString()}</span>
                     </div>
                     <span className={cn(
                        "inline-block px-3 py-1 rounded-full text-xs font-bold border",
                        h.status === 'graded' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
                     )}>
                        {h.status}
                     </span>
                  </div>
                  {h.status === 'graded' && (
                     <div className="mt-4 p-4 bg-white rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                           <strong className="text-secondary text-sm font-bold uppercase tracking-wider">Teacher Feedback</strong>
                           <span className="font-black text-amber-500">{h.grade}</span>
                        </div>
                        <p className="m-0 text-gray-600 italic">"{h.teacherFeedback}"</p>
                     </div>
                  )}
                </div>
              )) : (
                <div className="bg-gray-50 p-8 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <p className="text-gray-500 font-bold m-0">No completed assignments yet.</p>
                </div>
              )}
            </div>
          </motion.div>

        </div>

        {/* Right Column: Submission Widget */}
        <motion.div variants={itemVariants} className="lg:col-span-1">
          <AnimatePresence mode="wait">
            {selectedHw ? (
              <motion.div 
                key="submission-panel"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-[32px] p-8 shadow-lg border border-gray-100 relative overflow-hidden flex flex-col sticky top-24"
              >
                 <div className="border-b border-gray-100 pb-4 mb-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold font-headers text-secondary m-0">Submit Assignment</h3>
                    <button onClick={() => setSelectedHw(null)} className="w-8 h-8 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-400 flex items-center justify-center transition-colors">
                       <X className="w-4 h-4" />
                    </button>
                 </div>
                 
                 <div className="mb-6">
                    <strong className="block text-secondary mb-2 text-sm uppercase tracking-wider">Instructions:</strong>
                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-gray-700 whitespace-pre-wrap text-sm leading-relaxed">
                       {selectedHw.text}
                    </div>
                 </div>

                 <div className="mb-8 flex-1">
                    <strong className="block text-secondary mb-2 text-sm uppercase tracking-wider">Your Submission:</strong>
                    
                    {!audioBlob && (
                      <textarea 
                         className="w-full p-4 border border-gray-200 rounded-2xl text-secondary focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all bg-gray-50/50 min-h-[150px] resize-none" 
                         placeholder="Type your answer here..."
                         value={responseText}
                         onChange={e => setResponseText(e.target.value)}
                         disabled={isRecording}
                      ></textarea>
                    )}

                    <div className="mt-4">
                       {!audioBlob ? (
                          <button 
                             onClick={isRecording ? stopRecording : startRecording} 
                             className={cn(
                                "w-full py-4 rounded-full font-bold shadow-sm transition-all flex items-center justify-center gap-2",
                                isRecording 
                                   ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 animate-pulse" 
                                   : "bg-white text-secondary border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                             )}
                          >
                             {isRecording ? (
                                <>
                                   <Square className="w-4 h-4 fill-current" /> Stop Recording
                                </>
                             ) : (
                                <>
                                   <Mic className="w-5 h-5" /> Record Audio Answer
                                </>
                             )}
                          </button>
                       ) : (
                          <div className="flex flex-col gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                             <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Audio Recorded</span>
                             <audio src={audioUrl!} controls className="w-full h-10" />
                             <button onClick={clearAudio} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors self-end mt-1">Remove Audio</button>
                          </div>
                       )}
                    </div>
                 </div>

                 <button 
                    onClick={handleSubmit} 
                    disabled={submitting || (responseText.trim() === '' && !audioBlob)}
                    className="w-full py-4 rounded-full font-bold text-white bg-primary hover:bg-primary-hover shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center justify-center gap-2"
                 >
                    {submitting ? 'Submitting...' : <><Send className="w-4 h-4" /> Submit to Teacher</>}
                 </button>
              </motion.div>
            ) : (
              <motion.div 
                key="empty-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-50 rounded-[32px] p-8 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center h-full min-h-[400px] text-center"
              >
                 <div className="w-16 h-16 rounded-2xl bg-white text-gray-300 flex items-center justify-center shadow-sm mb-4">
                    <FileEdit className="w-8 h-8" />
                 </div>
                 <h3 className="text-xl font-bold font-headers text-gray-400 mb-2">Select an Assignment</h3>
                 <p className="text-gray-400 text-sm max-w-[200px]">Choose a pending task from the list to view instructions and submit.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}

