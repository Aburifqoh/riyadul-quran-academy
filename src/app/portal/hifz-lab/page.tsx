'use client';

import type { HifzPlanRange } from '@/types/content';


// ─────────────────────────────────────────────
// app/portal/hifz-lab/page.tsx
// Student portal — Hifz Lab entry point
// ─────────────────────────────────────────────
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { StudyAssistant } from '@/components/StudyAssistant';
import { HifzLab } from '@/components/hifz/HifzLab';
import { supabase } from '@/lib/supabase'; // Using the client from existing lib
import { HIFZ_LAB_ENABLED } from '@/lib/hifzLab';

export default function HifzLabPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [plan, setPlan] = useState<HifzPlanRange | null>(null);
  const [planLoaded, setPlanLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: planData } = await supabase
          .from('hifz_plan')
          .select('page_start, page_end')
          .eq('student_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!cancelled) setPlan(planData);
      } catch (err) {
        console.error("Error fetching hifz profile/plan:", err);
      } finally {
        if (!cancelled) setPlanLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const isFetching = loading || (!!user && !planLoaded);

  if (loading || isFetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
          <p className="text-emerald-800 font-medium">Loading Hifz Lab...</p>
        </div>
      </div>
    );
  }

  if (!user) return null; // will redirect

  const studentName = userData?.name || user.email || 'Student';

  const lab = (
    <HifzLab
      studentId={user.id}
      studentName={studentName}
      assignedPageStart={plan?.page_start ?? 1}
      assignedPageEnd={plan?.page_end ?? 604}
    />
  );

  if (HIFZ_LAB_ENABLED) {
    return <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden">{lab}</div>;
  }

  return (
    <div className="relative w-full h-[calc(100vh-100px)] overflow-hidden">
      <div className="absolute z-50 inset-0 flex items-center justify-center bg-black/5 backdrop-blur-[8px]">
        <div className="bg-white/95 p-6 rounded-3xl shadow-2xl text-left max-w-xl w-[92%] max-h-[90vh] overflow-y-auto border border-white/50">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <h2 className="text-3xl font-bold font-headers text-emerald-900 mb-2">Hifz AI Lab</h2>
          <p className="text-emerald-800/80 font-medium mb-6">Phonetic scoring is still being tuned. You can ask the study assistant now. It helps you practise and it does not give a fatwa.</p>
          <StudyAssistant />
        </div>
      </div>
      <div className="pointer-events-none opacity-40 w-full h-full overflow-hidden">{lab}</div>
    </div>
  );
}
