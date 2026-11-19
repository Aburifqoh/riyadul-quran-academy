'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Phone, PhoneOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { classroomCallChannel, startRingTone, type ClassCallPayload } from '@/lib/classroomCall';

export function IncomingClassCall({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [call, setCall] = useState<ClassCallPayload | null>(null);
  const stopRing = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!userId || pathname.startsWith('/portal/classroom/session')) return;

    const channel = supabase
      .channel(classroomCallChannel(userId))
      .on('broadcast', { event: 'ring' }, ({ payload }) => {
        const data = payload as ClassCallPayload;
        if (!data?.room || !data.href) return;
        setCall(data);
        stopRing.current?.();
        stopRing.current = startRingTone();
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try {
            new Notification(`${data.fromName} is in class`, {
              body: 'Tap Join to enter the live classroom.',
            });
          } catch {
            /* ignore */
          }
        }
      })
      .on('broadcast', { event: 'cancel' }, () => {
        stopRing.current?.();
        stopRing.current = null;
        setCall(null);
      })
      .subscribe();

    return () => {
      stopRing.current?.();
      stopRing.current = null;
      void supabase.removeChannel(channel);
    };
  }, [userId, pathname]);

  useEffect(() => {
    if (!call) return;
    const timer = window.setTimeout(() => {
      stopRing.current?.();
      stopRing.current = null;
      setCall(null);
    }, 60_000);
    return () => window.clearTimeout(timer);
  }, [call]);

  if (!call) return null;

  const join = () => {
    stopRing.current?.();
    stopRing.current = null;
    const href = call.href;
    setCall(null);
    router.push(href);
  };

  const dismiss = () => {
    stopRing.current?.();
    stopRing.current = null;
    setCall(null);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
          <Phone className="h-7 w-7 animate-pulse" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Incoming class</p>
        <h3 className="mt-2 text-2xl font-headers font-bold text-secondary">{call.fromName}</h3>
        <p className="mt-2 text-sm text-gray-500">
          {call.fromRole === 'teacher' ? 'Your instructor is in the classroom.' : 'Your student has entered the classroom.'}
        </p>
        <div className="mt-8 flex gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <PhoneOff className="h-4 w-4" /> Later
            </span>
          </button>
          <button
            type="button"
            onClick={join}
            className="flex-1 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Join class
          </button>
        </div>
      </div>
    </div>
  );
}
