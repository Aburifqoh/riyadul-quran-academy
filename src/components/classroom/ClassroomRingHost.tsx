'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getTeacherStudents } from '@/lib/db';
import { getAssignedClassSlots, slotBelongsToTeacher } from '@/lib/userDataHelpers';
import { slotClassroomRoom } from '@/lib/classroomRoom';
import { resolveClassStatus } from '@/lib/timezoneUtils';
import {
  classCallHref,
  classroomCallChannel,
  classroomPresenceChannel,
  playJoinChime,
  type ClassCallPayload,
} from '@/lib/classroomCall';
import type { UserData } from '@/types/user';

export function ClassroomRingHost({
  roomName,
  userId,
  userName,
  role,
  userData,
}: {
  roomName: string;
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  userData: UserData | null;
}) {
  const [phase, setPhase] = useState<'calling' | 'arrived' | 'hidden'>('calling');
  const [ringingNames, setRingingNames] = useState<string[]>([]);
  const rung = useRef(false);
  const hadCompany = useRef(false);

  useEffect(() => {
    if (!userId || !roomName) return;
    const presence = supabase.channel(classroomPresenceChannel(roomName), {
      config: { presence: { key: userId } },
    });

    const countOthers = () =>
      Object.keys(presence.presenceState()).filter((id) => id !== userId).length;

    presence.on('presence', { event: 'sync' }, () => {
      const others = countOthers();
      if (others === 0) {
        setPhase((current) => (current === 'hidden' ? 'hidden' : 'calling'));
        return;
      }
      if (!hadCompany.current) {
        hadCompany.current = true;
        playJoinChime();
        setPhase('arrived');
        window.setTimeout(() => setPhase('hidden'), 2500);
      } else {
        setPhase('hidden');
      }
    });

    presence.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return;
      const alreadyWaitingAlone = countOthers() === 0;
      await presence.track({ userId, name: userName, role });
      if (alreadyWaitingAlone && !rung.current) {
        rung.current = true;
        const targets = await resolveCallTargets({ roomName, userId, role, userData });
        setRingingNames(targets.map((t) => t.name));
        await ringCounterparts({
          roomName,
          userId,
          userName,
          role,
          targets: targets.map((t) => t.id),
        });
      }
    });

    return () => {
      void presence.untrack();
      void supabase.removeChannel(presence);
    };
  }, [roomName, userId, userName, role, userData]);

  if (phase === 'hidden') return null;

  const who = ringingNames.length
    ? ringingNames.slice(0, 3).join(', ') + (ringingNames.length > 3 ? ` and ${ringingNames.length - 3} more` : '')
    : 'the other side';

  return (
    <div className="pointer-events-auto absolute bottom-24 left-1/2 z-[47] w-[min(420px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/20 bg-black/70 px-5 py-4 text-center text-white shadow-xl backdrop-blur-md">
      <div className="mb-2 flex items-center justify-center gap-2 text-emerald-300">
        <Phone className="h-4 w-4 animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-widest">
          {phase === 'arrived' ? 'Connected' : 'Calling class'}
        </span>
      </div>
      <p className="m-0 text-sm font-semibold">
        {phase === 'arrived'
          ? 'They are here.'
          : `You are in. Ringing ${who}…`}
      </p>
    </div>
  );
}

async function ringCounterparts(opts: {
  roomName: string;
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  targets: string[];
}) {
  if (!opts.targets.length) return;

  const payload: ClassCallPayload = {
    room: opts.roomName,
    href: classCallHref(opts.role === 'teacher' ? 'student' : 'teacher', opts.roomName),
    fromId: opts.userId,
    fromName: opts.userName,
    fromRole: opts.role,
  };

  await Promise.all(opts.targets.map(async (targetId) => {
    const channel = supabase.channel(classroomCallChannel(targetId));
    const ready = await new Promise<boolean>((resolve) => {
      const timer = window.setTimeout(() => resolve(false), 2500);
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          window.clearTimeout(timer);
          resolve(true);
        }
      });
    });
    if (ready) {
      await channel.send({ type: 'broadcast', event: 'ring', payload });
    }
    void supabase.removeChannel(channel);
  }));
}

async function resolveCallTargets(opts: {
  userId: string;
  role: 'teacher' | 'student';
  userData: UserData | null;
  roomName: string;
}): Promise<Array<{ id: string; name: string }>> {
  if (opts.role === 'teacher' && opts.userData) {
    const roster = await getTeacherStudents({ id: opts.userData.id, email: opts.userData.email });
    const dueNow = roster.filter((student) =>
      getAssignedClassSlots(student.schedule).some((slot) => {
        if (!slotBelongsToTeacher(slot, opts.userData!)) return false;
        if (!slot.day || !slot.time) return false;
        const { isLive } = resolveClassStatus(slot.day, slot.time, slot.timezone || 'UTC');
        if (isLive) return true;
        try {
          const today = new Intl.DateTimeFormat('en-US', {
            timeZone: slot.timezone || 'UTC',
            weekday: 'long',
          }).format(new Date());
          return slot.day.toLowerCase() === today.toLowerCase();
        } catch {
          return false;
        }
      })
    );
    const chosen = dueNow.length ? dueNow : roster;
    return chosen.filter((s) => s.id).map((s) => ({ id: s.id, name: s.name || 'Student' }));
  }

  const slots = getAssignedClassSlots(opts.userData?.schedule);
  const match = slots.find((slot) => slotClassroomRoom(slot) === opts.roomName) || slots[0];
  if (!match?.teacherId) return [];
  return [{ id: match.teacherId, name: match.teacherName || match.teacher || 'Instructor' }];
}
