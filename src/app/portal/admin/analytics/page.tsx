'use client';

import { displayValue, getUserRole } from '@/lib/userDataHelpers';
import { isSandboxAccount, isSubscriptionActive, recordedTuitionAmount } from '@/lib/billing';


import type { AdminRecord } from '@/types/records';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Users, DollarSign, Activity, GraduationCap, TrendingUp, Book } from 'lucide-react';
import PortalSkeleton from '@/components/ui/PortalSkeleton';

function BarChart({ data, color = "#F59A23" }: { data: { label: string, value: number }[], color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full h-[200px] flex items-end justify-between gap-2 pt-6">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div className="opacity-0 group-hover:opacity-100 absolute -top-8 bg-slate-800 text-white text-[10px] py-1 px-2 rounded whitespace-nowrap transition-opacity pointer-events-none z-10">
            {d.value} {d.label}
          </div>
          <motion.div 
            initial={{ height: 0 }} 
            animate={{ height: `${(d.value / max) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="w-full rounded-t-sm min-h-[4px]"
            style={{ backgroundColor: color }}
          />
          <span className="text-[10px] text-slate-400 mt-2 rotate-[-45deg] origin-top-left -ml-2">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ data, color = "#F59A23" }: { data: { label: string, value: number }[], color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="w-full space-y-4">
      {data.map((d, i) => (
        <div key={i} className="w-full relative group">
          <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
            <span className="truncate pr-2">{d.label}</span>
            <span>{d.value}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} 
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ data, color = "#F59A23" }: { data: { label: string, value: number }[], color?: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const width = 400;
  const height = 150;
  
  const getCoords = (val: number, i: number) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - ((val / max) * height);
    return { x, y: isNaN(y) ? height : y };
  };
  
  const points = data.map((d, i) => getCoords(d.value, i));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="w-full h-[200px] flex flex-col pt-6 relative">
      <svg viewBox={`0 -10 ${width} ${height + 20}`} className="w-full h-full overflow-visible">
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="#fff" stroke={color} strokeWidth="2">
            <title>{data[i].label}: {data[i].value}</title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        {data.map((d, i) => <span key={i} className="text-[10px] text-slate-400">{d.label}</span>)}
      </div>
    </div>
  );
}

function DonutChart({ data }: { data: { label: string, value: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colors = ['#F59A23', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#64748b'];
  
  const segments = data.reduce<Array<{
    d: { label: string; value: number };
    i: number;
    strokeDasharray: string;
    strokeDashoffset: number;
  }>>((items, d, i) => {
    if (d.value === 0) return items;
    const priorTotal = items.reduce((sum, segment) => sum + segment.d.value, 0);
    return [...items, {
      d,
      i,
      strokeDasharray: `${(d.value / total) * 314.159} 314.159`,
      strokeDashoffset: -(priorTotal / total) * 314.159,
    }];
  }, []);

  return (
    <div className="flex flex-col items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-40 h-40 transform -rotate-90">
        {segments.map(({ d, i, strokeDasharray, strokeDashoffset }) => (
          <circle
            key={i}
            cx="50" cy="50" r="25"
            fill="transparent"
            stroke={colors[i % colors.length]}
            strokeWidth="50"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          >
            <title>{d.label}: {d.value}</title>
          </circle>
        ))}
        <circle cx="50" cy="50" r="15" fill="#ffffff" />
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        {data.map((d, i) => d.value > 0 && (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="capitalize">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalTeachers: 0,
    monthlyRevenue: 0,
    totalHifz: 0,
    avgHifzAccuracy: 0,
  });

  const [charts, setCharts] = useState({
    studentsJoined: [] as { label: string; value: number }[],
    hifzWeeks: [] as { label: string; value: number }[],
    topSurahs: [] as { label: string; value: number }[],
    planDistribution: [] as { label: string; value: number }[],
  });

  const [topStudents, setTopStudents] = useState<AdminRecord[]>([]);
  const [teacherWorkload, setTeacherWorkload] = useState<AdminRecord[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (getUserRole(userData?.role) !== 'super_admin') {
      router.push('/portal/admin');
      return;
    }

    async function loadAnalytics() {
      try {
        // 1. Fetch Users
        const users = await fetchAllUsersParsed();
        
        // 2. Fetch Hifz Sessions
        const { data: hifz } = await supabase.from('hifz_sessions').select('id, created_at, student_id, score, verse_key');

        const allUsers = users || [];
        const students = allUsers.filter(u => getUserRole(u.role) === 'student' && !isSandboxAccount(u));
        const liveStudentIds = new Set(students.map(s => s.id));
        const allHifz = (hifz || []).filter(s => liveStudentIds.has(String(s.student_id || '')));
        const studentById = new Map(students.map(s => [s.id, s]));

        const activeStudents = students.filter(u => isSubscriptionActive(u) && !u.scholarship);
        const teachers = allUsers.filter(u => getUserRole(u.role) === 'teacher' && !isSandboxAccount(u));
        
        const monthlyRevenue = activeStudents.reduce((sum, u) => sum + recordedTuitionAmount(u), 0);
        
        const avgAccuracy = allHifz.length > 0 
          ? Math.round(allHifz.reduce((acc, s) => acc + (Number(s.score) || 0), 0) / allHifz.length)
          : 0;

        setStats({
          totalStudents: students.length,
          activeStudents: activeStudents.length,
          totalTeachers: teachers.length,
          monthlyRevenue,
          totalHifz: allHifz.length,
          avgHifzAccuracy: avgAccuracy
        });

        // Chart: Students joined last 6 months
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const studentJoins = Array(6).fill(0).map((_, i) => {
          const m = new Date();
          m.setMonth(currentMonth - 5 + i);
          return { label: monthNames[m.getMonth()], value: 0, monthNum: m.getMonth(), year: m.getFullYear() };
        });

        students.forEach(s => {
          const created = s.created_at || s.createdAt;
          if (!created) return;
          const d = new Date(created);
          const bucket = studentJoins.find(b => b.monthNum === d.getMonth() && b.year === d.getFullYear());
          if (bucket) bucket.value++;
        });

        // Chart: Hifz sessions per week (last 8 weeks)
        const weekBuckets = Array(8).fill(0).map((_, i) => ({ label: `W${8-i}`, value: 0 }));
        const now = new Date().getTime();
        const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
        
        allHifz.forEach(s => {
          if (!s.created_at) return;
          const diff = now - new Date(s.created_at).getTime();
          const weeksAgo = Math.floor(diff / ONE_WEEK);
          if (weeksAgo >= 0 && weeksAgo < 8) {
            weekBuckets[7 - weeksAgo].value++;
          }
        });

        // Chart: Top 5 Surahs
        const surahCounts: Record<string, number> = {};
        allHifz.forEach(s => {
          const key = String(s.verse_key || '').split(':')[0];
          if (!key) return;
          const label = `Surah ${key}`;
          surahCounts[label] = (surahCounts[label] || 0) + 1;
        });
        const topSurahs = Object.entries(surahCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([label, value]) => ({ label, value }));

        // Chart: Plan distribution
        const planCounts: Record<string, number> = {};
        activeStudents.forEach(s => {
          const plan = s.tuitionPlan ? s.tuitionPlan.replace(/_/g, ' ') : 'No Plan';
          planCounts[plan] = (planCounts[plan] || 0) + 1;
        });
        const planDist = Object.entries(planCounts).map(([label, value]) => ({ label, value }));

        setCharts({
          studentsJoined: studentJoins,
          hifzWeeks: weekBuckets,
          topSurahs,
          planDistribution: planDist
        });

        // Top Students (by average accuracy, min 2 sessions)
        const studentScores: Record<string, { name: string, total: number, count: number }> = {};
        allHifz.forEach(s => {
          const student = studentById.get(String(s.student_id || ''));
          const name = student?.name;
          if (!name) return;
          if (!studentScores[name]) studentScores[name] = { name, total: 0, count: 0 };
          studentScores[name].total += (Number(s.score) || 0);
          studentScores[name].count++;
        });
        const tops = Object.values(studentScores)
          .filter(s => s.count >= 2)
          .map(s => ({ name: s.name, avg: Math.round(s.total / s.count), count: s.count }))
          .sort((a, b) => b.avg - a.avg)
          .slice(0, 5);
        setTopStudents(tops);

        // Teacher Workload
        const workloads: Record<string, number> = {};
        teachers.forEach(t => workloads[t.id] = 0);
        students.forEach(s => {
          if (s.teacherId && workloads[s.teacherId] !== undefined) {
            workloads[s.teacherId]++;
          }
        });
        const workloadList = teachers.map(t => ({
          name: t.name || 'Unknown',
          count: workloads[t.id] || 0
        })).sort((a, b) => b.count - a.count);
        
        setTeacherWorkload(workloadList);

      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [userData, authLoading, router]);

  if (authLoading || loading) return <PortalSkeleton />;
  if (getUserRole(userData?.role) !== 'super_admin') {
    return <div className="p-10 text-center text-gray-500">Access denied. Super admin only.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Analytics</h1>
        <p className="text-slate-500 mt-1">Real-time data and insights for Al-Muqri Institute.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Active Students', value: stats.activeStudents, icon: GraduationCap, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Total Teachers', value: stats.totalTeachers, icon: Book, color: 'text-purple-500', bg: 'bg-purple-50' },
          { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue}`, icon: DollarSign, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Hifz Sessions', value: stats.totalHifz, icon: Activity, color: 'text-rose-500', bg: 'bg-rose-50' },
          { label: 'Avg Accuracy', value: `${stats.avgHifzAccuracy}%`, icon: TrendingUp, color: 'text-indigo-500', bg: 'bg-indigo-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg} ${kpi.color} mb-4`}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">Student Growth</h3>
          <p className="text-xs text-slate-500 mb-2">New enrollments over the last 6 months</p>
          <BarChart data={charts.studentsJoined} color="#3b82f6" />
        </div>

        {/* Chart 2 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900">AI Hifz Activity</h3>
          <p className="text-xs text-slate-500 mb-2">Sessions completed per week (last 8 weeks)</p>
          <LineChart data={charts.hifzWeeks} color="#10b981" />
        </div>

        {/* Chart 3 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Top Practiced Surahs</h3>
          <HorizontalBarChart data={charts.topSurahs} color="#F59A23" />
        </div>

        {/* Chart 4 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Plan Distribution</h3>
            <p className="text-xs text-slate-500 mb-6">Active students by tuition plan</p>
          </div>
          <DonutChart data={charts.planDistribution} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Top Performing Students</h3>
          <div className="space-y-4">
            {topStudents.length > 0 ? topStudents.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    #{i + 1}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{s.name}</p>
                    <p className="text-xs text-slate-500">{displayValue(s.count)} sessions</p>
                  </div>
                </div>
                <div className="text-emerald-600 font-bold text-sm bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {displayValue(s.avg)}%
                </div>
              </div>
            )) : <p className="text-sm text-slate-500 italic">No hifz data available yet.</p>}
          </div>
        </div>

        {/* Teacher Workload */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Teacher Workload</h3>
          <div className="space-y-4">
            {teacherWorkload.length > 0 ? teacherWorkload.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {(t.name ?? '?').charAt(0)}
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                </div>
                <div className="text-slate-600 font-bold text-sm">
                  {displayValue(t.count)} student{t.count !== 1 ? 's' : ''}
                </div>
              </div>
            )) : <p className="text-sm text-slate-500 italic">No teachers found.</p>}
          </div>
        </div>
      </div>

    </div>
  );
}
