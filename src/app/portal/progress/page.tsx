'use client';

import type { HifzSession } from '@/types/content';

import { displayValue, asNumber, getSchedule } from '@/lib/userDataHelpers';
import type { ScheduleSlot } from '@/types/content';

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Download, Activity, BookOpen, Clock, Target, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatClockTime } from '@/lib/timeFormat';

export default function StudentProgressPage() {
  const { user, userData } = useAuth();
  const [sessions, setSessions] = useState<HifzSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('hifz_sessions')
          .select('id, verse_key, page_number, score, created_at, feedback')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false });
        
        setSessions((data || []).map((row) => ({
          id: row.id,
          surah_name: row.verse_key ? `Verse ${row.verse_key}` : (row.page_number ? `Page ${row.page_number}` : 'Hifz session'),
          accuracy_score: row.score,
          session_date: row.created_at,
          tajweed_feedback: row.feedback,
        })));
      } catch (err) {
        console.error('Failed to fetch hifz sessions:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const schedule = useMemo(() => getSchedule(userData?.schedule), [userData?.schedule]);
  const [localSchedule, setLocalSchedule] = React.useState<ScheduleSlot[]>(schedule);

  React.useEffect(() => {
    if (!userData) return;
    import('@/lib/timezoneUtils').then(({ convertSlotToTimezone }) => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const converted = schedule.map((slot: ScheduleSlot) => {
        if (!slot.day || !slot.time) return slot;
        const local = convertSlotToTimezone(slot.day, slot.time, slot.timezone || 'UTC', tz);
        return { ...slot, day: local.day, time: local.time };
      });
      setLocalSchedule(converted);
    });
  }, [schedule, userData]);

  if (loading || !userData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const classesPerWeek = schedule.length;
  const totalSessions = sessions.length;
  const avgAccuracy = totalSessions > 0 
    ? Math.round(sessions.reduce((acc, s) => acc + asNumber(s.accuracy_score), 0) / totalSessions)
    : 0;

  // Chart Data (Last 10 sessions, chronological)
  const chartSessions = [...sessions].slice(0, 10).reverse();
  const maxScore = 100;
  const chartHeight = 100;
  const chartWidth = 300;
  
  const getCoordinatesForScore = (score: number, index: number, total: number) => {
    const x = total === 1 ? chartWidth / 2 : (index / (total - 1)) * chartWidth;
    const y = chartHeight - ((score / maxScore) * chartHeight);
    return { x, y };
  };

  const points = chartSessions.map((s, i) => getCoordinatesForScore(asNumber(s.accuracy_score), i, chartSessions.length));
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPathData = `${pathData} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      {/* Header & Print Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Progress Report</h1>
          <p className="text-slate-500 mt-1">Track your learning journey and Hifz accuracy.</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-md shadow-slate-900/10"
        >
          <Download className="w-4 h-4" />
          Download PDF
        </button>
      </div>

      {/* Print-only Header */}
      <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Ilmvers Institute</h1>
        <h2 className="text-xl font-bold text-slate-700 mt-2">Student Progress Report</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-600">
          <p><strong>Student:</strong> {userData.name || user?.email}</p>
          <p><strong>Date Generated:</strong> {new Date().toLocaleDateString()}</p>
          <p><strong>Level:</strong> <span className="capitalize">{userData.level || 'Beginner'}</span></p>
          <p><strong>Plan:</strong> <span className="capitalize">{userData.tuitionPlan?.replace(/_/g, ' ') || 'None'}</span></p>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/20 print:bg-white print:text-slate-900 print:border print:border-slate-200 print:shadow-none">
          <div className="flex items-center gap-3 mb-4 opacity-90 print:opacity-100 print:text-slate-500">
            <Target className="w-5 h-5" />
            <h3 className="font-semibold text-sm uppercase tracking-wider">Avg Accuracy</h3>
          </div>
          <p className="text-4xl font-black">{avgAccuracy}%</p>
          <p className="text-sm mt-2 opacity-80 print:opacity-100 print:text-slate-500">Across all AI Hifz sessions</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Activity className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-700">Hifz Sessions</h3>
          </div>
          <p className="text-4xl font-black text-slate-900">{totalSessions}</p>
          <p className="text-sm mt-2 text-slate-500">Total sessions completed</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Calendar className="w-5 h-5 text-emerald-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-700">Classes/Week</h3>
          </div>
          <p className="text-4xl font-black text-slate-900">{classesPerWeek}</p>
          <p className="text-sm mt-2 text-slate-500 capitalize">{userData.tuitionPlan?.replace(/_/g, ' ') || 'No Plan'}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <BookOpen className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-sm uppercase tracking-wider text-slate-700">AI Credits</h3>
          </div>
          <p className="text-4xl font-black text-slate-900">{userData.ai_hifz_credits ?? 0}</p>
          <p className="text-sm mt-2 text-slate-500">Remaining for AI Lab</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Trend & Schedule */}
        <div className="space-y-6 lg:col-span-1">
          {/* Trend Chart (Pure SVG) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-6">Recent Accuracy Trend</h3>
            {chartSessions.length > 1 ? (
              <div className="relative w-full h-[150px]">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 25, 50, 75, 100].map((line, i) => (
                    <line key={i} x1="0" y1={chartHeight - line} x2={chartWidth} y2={chartHeight - line} stroke="#f1f5f9" strokeWidth="1" />
                  ))}
                  
                  {/* Area */}
                  <path d={areaPathData} fill="url(#gradient)" className="opacity-20" />
                  <defs>
                    <linearGradient id="gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#004D4A" />
                      <stop offset="100%" stopColor="#004D4A" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Line */}
                  <path d={pathData} fill="none" stroke="#004D4A" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  
                  {/* Points */}
                  {points.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill="#ffffff" stroke="#004D4A" strokeWidth="2">
                      <title>Session {i+1}: {chartSessions[i].accuracy_score}%</title>
                    </circle>
                  ))}
                </svg>
                <div className="absolute top-0 -left-6 h-full flex flex-col justify-between text-[10px] text-slate-400 font-medium">
                  <span>100</span><span>50</span><span>0</span>
                </div>
              </div>
            ) : (
              <div className="h-[150px] flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100 border-dashed text-slate-400 text-sm">
                Need more sessions for trend
              </div>
            )}
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-slate-400" /> My Schedule
            </h3>
            {localSchedule.length > 0 ? (
              <div className="space-y-3">
                {localSchedule.map((slot: ScheduleSlot, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="font-semibold text-slate-700">{slot.day}</span>
                    <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{formatClockTime(slot.time)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No schedule set yet.</p>
            )}
          </div>
        </div>

        {/* Right Col: Session History */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">AI Hifz Lab History</h3>
              <p className="text-sm text-slate-500 mt-1">Your recent recitation evaluations</p>
            </div>
            
            {sessions.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {sessions.map((session) => (
                  <div key={session.id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 text-lg">{displayValue(session.surah_name)}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(String(session.session_date ?? '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-sm font-bold",
                        asNumber(session.accuracy_score) >= 80 ? "bg-emerald-100 text-emerald-700" :
                        asNumber(session.accuracy_score) >= 60 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {session.accuracy_score}%
                      </div>
                    </div>
                    {session.tajweed_feedback && (
                      <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded-xl mt-3 line-clamp-2 print:line-clamp-none">
                        <span className="font-semibold text-slate-800">Feedback: </span>
                        {displayValue(session.tajweed_feedback)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-slate-300" />
                </div>
                <h4 className="font-bold text-slate-900">No sessions yet</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">Head to the AI Hifz Lab to start practicing your recitation and tracking your accuracy.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
