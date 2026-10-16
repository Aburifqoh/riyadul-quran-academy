'use client';

import { displayValue, asStringArray } from '@/lib/userDataHelpers';
import type { TranscriptEntry } from '@/types/content';

import type { UserData } from '@/types/user';

import type { AdminRecord } from '@/types/records';
import { getErrorMessage } from '@/lib/errors';
import { authFetch } from '@/lib/authFetch';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { fetchUsersByRoles, USER_LIVE_CLASS_COLUMNS } from '@/lib/fetchAllUsers';
import { getDeterministicRoomID, getTranscriptsBySession } from '@/lib/db';
import { ShieldAlert, Video, Eye, Users, FileText, Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';
import { formatWallClock } from '@/lib/timeFormat';

export default function AdminLiveClasses() {
  const { userData, loading: authLoading } = useAuth();
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'live' | 'transcripts'>('live');
  const router = useRouter();

  // Transcript viewer state
  const [selectedTeacher, setSelectedTeacher] = useState<UserData | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [loadingTranscripts, setLoadingTranscripts] = useState(false);

  // AI analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<AdminRecord | null>(null);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const filtered = await fetchUsersByRoles(['teacher'], USER_LIVE_CLASS_COLUMNS);
        if (cancelled) return;
        setTeachers(filtered);
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadTranscripts = async (teacher: UserData) => {
    setSelectedTeacher(teacher);
    setAiReport(null);
    setAnalysisError('');
    setLoadingTranscripts(true);
    const roomName = getDeterministicRoomID(teacher.email ?? '');
    const logs = await getTranscriptsBySession(roomName);
    setTranscripts(logs);
    setLoadingTranscripts(false);
  };

  const runAiAnalysis = async () => {
    if (!selectedTeacher || transcripts.length === 0) return;
    setAnalyzing(true);
    setAnalysisError('');
    setAiReport(null);

    const roomName = getDeterministicRoomID(selectedTeacher.email ?? '');
    // Stitch transcript together
    const stitchedText = transcripts
      .map((t: TranscriptEntry) => `[${t.name?.toUpperCase() || 'UNKNOWN'}]: ${t.transcriptData?.text || ''}`)
      .join('\n');

    try {
      const res = await authFetch('/api/analyze-transcript', {
        method: 'POST',
        body: JSON.stringify({ transcript: stitchedText, roomName })
      });
      const json = await res.json();
      if (json.error) {
        setAnalysisError(json.error);
      } else {
        setAiReport(json.analysis);
      }
    } catch (err: unknown) {
      setAnalysisError(getErrorMessage(err) || 'Failed to connect to AI analysis.');
    }
    setAnalyzing(false);
  };

  if (authLoading || loading) return <PortalSkeleton />;
  if (!hasPermission(userData, 'can_manage_live_classes')) {
    return <div className="p-10 text-center text-gray-500">Access denied. Live class permission required.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
          <Video className="w-8 h-8 text-emerald-600" /> Live Class Monitoring
        </h2>
        <p className="text-gray-500 m-0">Monitor sessions in real-time and review AI-analyzed transcripts from past classes.</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-white border border-gray-200 rounded-full p-1.5 shadow-sm mb-6 w-fit">
        {[
          { id: 'live', label: 'Live Sessions', icon: <Video className="w-4 h-4" /> },
          { id: 'transcripts', label: 'Transcripts & AI Review', icon: <FileText className="w-4 h-4" /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'live' | 'transcripts')}
            className={cn(
              "px-5 py-2.5 text-sm font-bold rounded-full whitespace-nowrap transition-all flex items-center gap-2",
              activeTab === tab.id ? "bg-secondary text-white shadow-md" : "text-gray-500 hover:text-secondary hover:bg-gray-100"
            )}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'live' && (
          <motion.div key="live" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <ShieldAlert className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-800 m-0">Ghost Join Active</h4>
                  <p className="text-xs font-medium text-emerald-700 m-0">When you join a session, your camera and microphone will be forcibly disabled. You will appear as &quot;Admin Monitor&quot;.</p>
                </div>
              </div>

              <div className="space-y-4">
                {teachers.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-xl font-bold font-headers text-gray-400 mb-2">No Faculty Found</h4>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {teachers.map(t => {
                      const roomID = getDeterministicRoomID(t.email ?? '');
                      return (
                        <div key={t.id} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between">
                          <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                              {t.name?.charAt(0) || 'T'}
                            </div>
                            <div>
                              <h4 className="text-lg font-bold text-secondary m-0 flex items-center gap-2 flex-wrap">
                                <span>{t.name || 'Instructor'}</span>
                                <TestSeatBadge user={t} />
                              </h4>
                              <p className="text-sm text-gray-500 m-0 mb-2">{t.email}</p>
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-500">
                                Room ID: {roomID.split('_').pop()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => router.push(`/portal/classroom/session?room=${roomID}&ghost=true`)}
                              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-sm hover:shadow-md group"
                            >
                              <Eye className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                              Ghost Join
                            </button>
                            <button 
                              onClick={() => { setActiveTab('transcripts'); loadTranscripts(t); }}
                              className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-3 px-4 rounded-xl transition-colors border border-indigo-200"
                            >
                              <FileText className="w-5 h-5" /> Transcripts
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'transcripts' && (
          <motion.div key="transcripts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Teacher Selector */}
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 h-fit">
              <h3 className="text-lg font-bold font-headers text-secondary mb-4">Select Instructor</h3>
              <div className="space-y-2">
                {teachers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => loadTranscripts(t)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all font-bold text-sm",
                      selectedTeacher?.id === t.id ? "bg-secondary text-white" : "hover:bg-gray-50 text-secondary border border-transparent hover:border-gray-200"
                    )}
                  >
                    <span>{t.name || t.email}</span>
                    <ChevronRight className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>

            {/* Transcript Viewer */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedTeacher ? (
                <div className="bg-gray-50 rounded-[32px] p-16 border-2 border-dashed border-gray-200 text-center">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold">Select an instructor to view their class transcripts.</p>
                </div>
              ) : (
                <>
                  {/* Transcript log */}
                  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-headers text-secondary m-0">Class Transcript</h3>
                        <p className="text-sm text-gray-500 m-0">{selectedTeacher.name} — {transcripts.length} captured phrases</p>
                      </div>
                      <button onClick={() => loadTranscripts(selectedTeacher)} className="p-2 hover:bg-gray-50 rounded-lg transition-colors">
                        <RefreshCw className={cn("w-4 h-4 text-gray-400", loadingTranscripts && "animate-spin")} />
                      </button>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {loadingTranscripts ? (
                        <div className="text-center py-8"><div className="w-8 h-8 border-2 border-secondary border-t-transparent rounded-full animate-spin mx-auto" /></div>
                      ) : transcripts.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                          <p className="text-gray-400 font-bold text-sm">No transcript data found for this instructor.</p>
                          <p className="text-gray-400 text-xs mt-1">Transcriptions are captured automatically during live classes.</p>
                        </div>
                      ) : (
                        transcripts.map((entry: TranscriptEntry, i: number) => (
                          <div key={i} className={cn(
                            "flex gap-3 p-3 rounded-xl",
                            entry.name === 'teacher' ? "bg-indigo-50/50" : "bg-amber-50/50"
                          )}>
                            <span className={cn(
                              "text-[10px] font-black uppercase tracking-widest shrink-0 mt-1 w-14 text-right",
                              entry.name === 'teacher' ? "text-indigo-500" : "text-amber-600"
                            )}>
                              {entry.name === 'teacher' ? 'Teacher' : 'Student'}
                            </span>
                            <div className="flex-1">
                              <p className="text-sm text-secondary font-medium m-0">{entry.transcriptData?.text}</p>
                              <p className="text-[10px] text-gray-400 m-0 mt-1">{formatWallClock(String(entry.timestamp ?? ''))}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* AI Analysis */}
                  <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-bold font-headers text-secondary m-0 flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-amber-500" /> AI Quality Review
                        </h3>
                        <p className="text-xs text-gray-500 m-0">
                          {aiReport?.source === 'preview'
                            ? 'Preview on local — full Llama review uses free Cloudflare Workers AI after deploy'
                            : 'Powered by Cloudflare Workers AI (Llama 3, free tier)'}
                        </p>
                      </div>
                      <button
                        onClick={runAiAnalysis}
                        disabled={analyzing || transcripts.length === 0}
                        className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-2.5 px-5 rounded-full shadow-sm hover:shadow-md transition-all text-sm disabled:opacity-50"
                      >
                        {analyzing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing...</> : <><Sparkles className="w-4 h-4" /> Analyze with AI</>}
                      </button>
                    </div>

                    {analysisError && (
                      <div className="p-4 bg-red-50 rounded-2xl border border-red-100 text-sm text-red-700 font-medium">
                        {analysisError}
                      </div>
                    )}

                    {!aiReport && !analyzing && !analysisError && (
                      <div className="text-center py-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Sparkles className="w-10 h-10 text-amber-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-bold text-sm">Click &quot;Analyze with AI&quot; to generate a quality report</p>
                      </div>
                    )}

                    {aiReport && (
                      <div className="space-y-4">
                        {/* Score Banner */}
                        <div className="flex gap-4">
                          <div className="flex-1 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                            <p className="text-4xl font-black text-emerald-600 m-0">{displayValue(aiReport.overallScore)}<span className="text-xl">/100</span></p>
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-700 m-0">Overall Score</p>
                          </div>
                          <div className="flex-1 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                            <p className="text-xl font-black text-blue-600 m-0 mt-2">{displayValue(aiReport.sentiment)}</p>
                            <p className="text-xs font-black uppercase tracking-widest text-blue-700 m-0">Sentiment</p>
                          </div>
                          <div className="flex-1 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                            <p className="text-xl font-black text-indigo-600 m-0 mt-2">{displayValue(aiReport.classEngagement)}</p>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-700 m-0">Engagement</p>
                          </div>
                        </div>

                        {/* Teacher Summary */}
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">Teacher Performance</p>
                          <p className="text-sm text-secondary font-medium m-0">{displayValue(aiReport.teacherPerformanceSummary)}</p>
                        </div>

                        {/* Detected Keywords */}
                        {aiReport.detectedKeywords && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {Object.entries(aiReport.detectedKeywords ?? {}).map(([category, words]) => (
                              <div key={category} className="p-3 bg-white rounded-xl border border-gray-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{category.replace(/([A-Z])/g, ' $1')}</p>
                                <div className="flex flex-wrap gap-1">
                                  {(Array.isArray(words) ? words : []).slice(0, 5).map((w: string, i: number) => (
                                    <span key={i} className="text-xs font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">{w}</span>
                                  ))}
                                  {(Array.isArray(words) ? words.length === 0 : true) && <span className="text-xs text-gray-400">None detected</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Strengths & Red Flags */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-2">✓ Strengths</p>
                            <ul className="space-y-1">
                              {asStringArray(aiReport.strengths).map((s, i) => <li key={i} className="text-sm text-emerald-800 font-medium">{s}</li>)}
                            </ul>
                          </div>
                          <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-black uppercase tracking-widest text-red-700 mb-2">⚠ Red Flags</p>
                            {!asStringArray(aiReport.redFlags).length ? (
                              <p className="text-sm text-red-400 font-medium">None detected</p>
                            ) : (
                              <ul className="space-y-1">
                                {asStringArray(aiReport.redFlags).map((f, i) => <li key={i} className="text-sm text-red-800 font-medium">{f}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Follow-up */}
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2">Recommended Follow-Up</p>
                          <p className="text-sm text-amber-900 font-medium m-0">{displayValue(aiReport.recommendedFollowUp)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
