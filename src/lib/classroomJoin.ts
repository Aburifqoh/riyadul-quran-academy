'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAttendanceArray } from '@/lib/userDataHelpers';
import { resolveClassStatus } from '@/lib/timezoneUtils';
import { studentClassroomRoom } from '@/lib/classroomRoom';
import { classroomPresenceChannel } from '@/lib/classroomCall';
import type { ScheduleSlot } from '@/types/content';

export type LiveJoinPhase = 'upcoming' | 'live' | 'rejoin' | 'held_open' | 'ended';

function joinedLiveKey(now = new Date()) {
  return `ilmvers-joined-live-${now.toISOString().slice(0, 10)}`;
}

export function markJoinedLiveClassToday() {
  try {
    sessionStorage.setItem(joinedLiveKey(), '1');
  } catch {
    /* private mode */
  }
}

export function joinedLiveClassTodayLocal(): boolean {
  try {
    return sessionStorage.getItem(joinedLiveKey()) === '1';
  } catch {
    return false;
  }
}

export function attendedLiveClassToday(log?: unknown, now = new Date()): boolean {
  if (joinedLiveClassTodayLocal()) return true;
  const today = now.toISOString().slice(0, 10);
  return getAttendanceArray(log as Parameters<typeof getAttendanceArray>[0]).some((entry) => {
    const date = typeof entry.date === 'string' ? entry.date : '';
    if (!date.startsWith(today)) return false;
    if ((entry.subject || 'Class') !== 'Live Class') return false;
    return Number(entry.durationMinutes || 0) > 0 || String(entry.status || '').toLowerCase() === 'present';
  });
}

function slotTime(slot: ScheduleSlot) {
  let timeStr = slot.time || '';
  if (timeStr.includes('-')) timeStr = timeStr.split('-')[0].trim();
  return timeStr;
}

export function findTodaysClassSlot(schedule: ScheduleSlot[], now = new Date()) {
  let todays: { slot: ScheduleSlot; startAt: number; endAt: number; isLive: boolean } | null = null;
  for (const slot of schedule) {
    if (!slot.day || !slot.time) continue;
    const status = resolveClassStatus(slot.day, slotTime(slot), slot.timezone || 'UTC');
    if (!status.startAt) continue;
    if (status.isLive) return { slot, ...status };
    if (now.getTime() >= status.startAt - 5 * 60 * 1000) {
      todays = { slot, ...status };
    }
  }
  return todays;
}

export function useStudentLiveJoin(opts: {
  schedule: ScheduleSlot[];
  attendanceLog?: unknown;
}) {
  const liveRoom = useMemo(() => studentClassroomRoom(opts.schedule), [opts.schedule]);
  const [scheduleLive, setScheduleLive] = useState(false);
  const [classEndedToday, setClassEndedToday] = useState(false);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [attendedToday, setAttendedToday] = useState(() => attendedLiveClassToday(opts.attendanceLog));

  useEffect(() => {
    const tick = () => {
      const found = findTodaysClassSlot(opts.schedule);
      setScheduleLive(Boolean(found?.isLive));
      setClassEndedToday(Boolean(found && !found.isLive && Date.now() > found.endAt));
      setAttendedToday(attendedLiveClassToday(opts.attendanceLog));
    };
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, [opts.schedule, opts.attendanceLog]);

  useEffect(() => {
    if (!liveRoom) return;
    const channel = supabase.channel(classroomPresenceChannel(liveRoom), {
      config: { presence: { key: `lobby-${liveRoom}` } },
    });
    const readTeachers = () => {
      const state = channel.presenceState() as Record<string, Array<{ role?: string }>>;
      setTeacherPresent(
        Object.values(state).some((metas) => metas.some((meta) => meta.role === 'teacher'))
      );
    };
    channel.on('presence', { event: 'sync' }, readTeachers);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') readTeachers();
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [liveRoom]);

  const canJoin = scheduleLive || attendedToday || teacherPresent;
  const phase: LiveJoinPhase = scheduleLive
    ? 'live'
    : teacherPresent
      ? 'held_open'
      : attendedToday
        ? 'rejoin'
        : classEndedToday
          ? 'ended'
          : 'upcoming';

  return { liveRoom, canJoin, phase, scheduleLive, teacherPresent, attendedToday };
}
