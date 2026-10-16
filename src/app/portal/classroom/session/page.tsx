'use client';

import React, { useEffect, useRef, useState, Suspense, useCallback } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { autoLogAttendance, getTeacherStudents, saveClassRecapToStudents, saveTranscriptChunk } from '@/lib/db';
import { getAssignedClassSlots, getUserRole, loginPathFor, slotBelongsToTeacher } from '@/lib/userDataHelpers';
import { hasPermission } from '@/lib/permissions';
import { isPracticeClassroom, studentClassroomRoom, teacherClassroomRoom } from '@/lib/classroomRoom';
import { authFetch } from '@/lib/authFetch';
import { ClassroomTools } from '@/components/classroom/ClassroomTools';
import { ClassroomRingHost } from '@/components/classroom/ClassroomRingHost';
import { getClassroomLesson } from '@/lib/classroomLesson';
import { markJoinedLiveClassToday } from '@/lib/classroomJoin';
import {
  closeStage,
  dockStage,
  openStage,
  parkStage,
  stageElapsedMinutes,
  startCall,
} from '@/lib/classroomStage';

const JAAS_APP_ID = process.env.NEXT_PUBLIC_JAAS_APP_ID || '';

/** Errors that mean recognition will never work here — don't retry them. */
const FATAL_RECOGNITION_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported']);
const MAX_RECOGNITION_FAILURES = 5;

function ClassroomSessionContent() {
  const { user, userData, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusText, setStatusText] = useState('Preparing Your Classroom...');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const recognitionStopped = useRef(false);
  const recognitionFailures = useRef(0);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const role = searchParams.get('role') || getUserRole(userData?.role) || 'student';
  const ghostRequested = searchParams.get('ghost') === 'true';
  // The token service only grants a moderator pass when the role is teacher.
  // A student pass sits in the lobby and never sees the class. Only an admin
  // who can open Live Classes is allowed to take that pass.
  const staffGhost = Boolean(userData) && ghostRequested && hasPermission(userData, 'can_manage_live_classes');

  let roomName = 'Ilmvers_General';
  if (searchParams.get('room')) {
    roomName = searchParams.get('room') as string;
  } else if (userData) {
    if (getUserRole(userData.role) === 'teacher' || role === 'teacher') {
      roomName = teacherClassroomRoom(userData.email);
    } else {
      roomName = studentClassroomRoom(userData.schedule);
    }
  }
  const isPractice = isPracticeClassroom(roomName);
  const isTeacherRole = role === 'teacher' || getUserRole(userData?.role) === 'teacher';
  const profileReady = Boolean(userData);
  const missingLiveRoom = !isTeacherRole && !staffGhost && !isPractice && (!roomName || roomName === 'Ilmvers_General');
  const recapSaved = useRef(false);

  const persistClassRecap = useCallback(async () => {
    if (recapSaved.current || isPractice || staffGhost || !isTeacherRole || !userData) return;
    const lesson = getClassroomLesson();
    if (!lesson) return;
    recapSaved.current = true;
    try {
      const roster = await getTeacherStudents({ id: userData.id, email: userData.email });
      const dueToday = roster.filter((student) =>
        getAssignedClassSlots(student.schedule).some((slot) => {
          if (!slotBelongsToTeacher(slot, userData)) return false;
          if (!slot.day) return false;
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
      const targets = dueToday.length ? dueToday : roster;
      await saveClassRecapToStudents(
        targets.map((s) => s.id).filter(Boolean),
        userData.name || 'Instructor',
        lesson
      );
    } catch (error) {
      recapSaved.current = false;
      console.warn('[Classroom] Recap save failed:', error);
    }
  }, [isPractice, staffGhost, isTeacherRole, userData]);

  const persistClassRecapRef = useRef(persistClassRecap);
  const userDataRef = useRef(userData);
  useEffect(() => {
    persistClassRecapRef.current = persistClassRecap;
    userDataRef.current = userData;
  });

  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    recognitionStopped.current = true;
    recognitionFailures.current = 0;
    recognitionRef.current.onend = null;
    recognitionRef.current.stop();
    recognitionRef.current = null;
    setIsTranscribing(false);
  }, []);

  const startLiveTranscription = useCallback(() => {
    if (recognitionRef.current) return;
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn('[Transcription] Web Speech API not supported in this browser.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-SA';
      recognition.interimResults = false;
      recognition.continuous = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        recognitionFailures.current = 0;
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript.trim();
            if (transcript) {
              saveTranscriptChunk(roomName, user?.id || 'unknown', role, transcript)
                .catch(e => console.warn('[Transcription] Save error:', e));
            }
          }
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Speech recognition opens its own capture of the same microphone the
        // call is using. Where the browser won't allow that (common on mobile),
        // it fails instantly and forever -- so give up rather than restart in a
        // tight loop that competes with the class audio.
        if (FATAL_RECOGNITION_ERRORS.has(event.error)) {
          recognitionFailures.current = MAX_RECOGNITION_FAILURES;
          console.warn('[Transcription] Disabled for this session:', event.error);
          return;
        }
        if (event.error !== 'no-speech') {
          recognitionFailures.current += 1;
          console.warn('[Transcription] Error:', event.error);
        }
      };

      recognition.onend = () => {
        if (!recognitionRef.current || recognitionStopped.current) return;
        if (recognitionFailures.current >= MAX_RECOGNITION_FAILURES) {
          recognitionRef.current = null;
          setIsTranscribing(false);
          return;
        }
        try { recognitionRef.current.start(); } catch {}
      };

      recognitionRef.current = recognition;
      recognitionStopped.current = false;
      recognition.start();
      setIsTranscribing(true);
    } catch (err) {
      console.warn('[Transcription] Initialization failed:', err);
    }
  }, [roomName, user?.id, role]);

  const startLiveTranscriptionRef = useRef(startLiveTranscription);
  useEffect(() => {
    startLiveTranscriptionRef.current = startLiveTranscription;
  });

  const userId = user?.id;
  const userEmail = user?.email;
  const displayNameFromProfile = userData?.name;
  const profileRole = userData?.role;
  const queryString = searchParams.toString();

  const exitHref = staffGhost
    ? '/portal/admin/live-classes'
    : isTeacherRole
      ? '/portal/teacher'
      : '/portal/classroom';

  const leaveClass = useCallback(() => {
    void closeStage().then(() => router.replace(exitHref));
  }, [router, exitHref]);

  // --- The call itself. It lives in a body-level stage, so unmounting this page
  // --- (back button, in-app navigation) parks the conference instead of ending it.
  useEffect(() => {
    if (authLoading || !profileReady) return;
    if (ghostRequested && !staffGhost) return;
    if (missingLiveRoom) return;
    if (!userId) {
      router.replace(loginPathFor({
        role: profileRole || (role === 'teacher' ? 'teacher' : role),
        search: queryString ? `?${queryString}` : undefined,
      }));
      return;
    }

    const href = `${window.location.pathname}${window.location.search}`;
    const returnToClass = () => router.push(href);
    const trackAttendance = staffGhost || isPractice
      ? undefined
      : () => {
          void authFetch('/api/attendance/log', {
            method: 'POST',
            body: JSON.stringify({ subject: 'Live Class', tick: true }),
          }).catch((e) => console.warn('Attendance log ping failed', e));
        };

    const { stage, isNew } = openStage({
      key: `${roomName}::${userId}::${role}::${staffGhost ? 'ghost' : 'live'}`,
      room: roomName,
      href,
      onReturn: returnToClass,
      onTick: trackAttendance,
    });

    dockStage(headerRef.current?.getBoundingClientRect().height ?? 0);

    const displayName = staffGhost
      ? 'Admin Monitor'
      : (searchParams.get(role === 'teacher' ? 'tn' : 'sn') || displayNameFromProfile || (role === 'teacher' ? 'Instructor' : 'Student'));

    const afterJoin = () => {
      setIsLoading(false);
      if (staffGhost || isPractice) return;
      markJoinedLiveClassToday();
      // Every participant transcribes their OWN microphone. The Web Speech API
      // reads this browser's mic input and cannot see the remote WebRTC audio,
      // so limiting this to a super admin meant the stored transcript was
      // whatever the observing admin happened to say into their own mic --
      // i.e. nothing, which is why classes came back with no transcript.
      // saveTranscriptChunk already tags each chunk with the speaker's role and
      // the admin viewer already stitches them back together by role, so the
      // two sides reassemble into one conversation. The ghost monitor stays
      // excluded: it is muted, so it has nothing to contribute.
      startLiveTranscriptionRef.current();
    };

    if (!isNew) {
      // Walking back into a call that never stopped.
      if (stage.joined) afterJoin();
      return () => parkStage(returnToClass);
    }

    if (userDataRef.current && !isPractice && !staffGhost) {
      autoLogAttendance(userId, userDataRef.current).catch((err: unknown) => console.warn('Attendance log delayed:', err));
    }

    void startCall({
      appId: JAAS_APP_ID,
      roomName,
      displayName,
      email: userEmail,
      userId,
      role: (staffGhost || role === 'teacher') ? 'teacher' : 'student',
      isGhost: staffGhost,
      // A monitor watches. Turning the kicker on would let this pass eject
      // whoever joined the room first.
      canModerate: isTeacherRole && !staffGhost,
      onStatus: setStatusText,
      onJoined: afterJoin,
      onLeft: () => {
        stopRecognition();
        void persistClassRecapRef.current();
        if (window.location.pathname.startsWith('/portal/classroom/session')) {
          router.replace(exitHref);
        }
      },
      onFailed: (text) => {
        setStatusText(text);
        setIsLoading(false);
      },
    });

    return () => parkStage(returnToClass);
  }, [
    authLoading, profileReady, missingLiveRoom, userId, userEmail, displayNameFromProfile,
    profileRole, queryString, roomName, role, ghostRequested, staffGhost, isPractice, isTeacherRole,
    router, searchParams, exitHref, stopRecognition,
  ]);

  // Keep the stage sized to the space under the page header. Declared after the
  // effect above so the stage already exists on the first pass.
  useEffect(() => {
    const el = headerRef.current;
    if (!el || missingLiveRoom) return;
    const sync = () => dockStage(el.getBoundingClientRect().height);
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, [missingLiveRoom, isLoading]);

  // Transcription belongs to this page, not to the call: stop it when we navigate away.
  useEffect(() => stopRecognition, [stopRecognition]);

  useEffect(() => {
    const tick = () => setElapsedMinutes(stageElapsedMinutes());
    tick();
    const timer = window.setInterval(tick, 15000);
    return () => window.clearInterval(timer);
  }, []);

  // Never leave the overlay up forever if a join event goes missing.
  useEffect(() => {
    if (!isLoading) return;
    const timer = window.setTimeout(() => setIsLoading(false), 15000);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  if (userData && ghostRequested && !staffGhost) {
    return (
      <div className="pointer-events-auto absolute inset-0 bg-[#111] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-[32px] p-8">
          <h2 className="text-2xl font-bold font-headers text-secondary mb-3">Monitoring is closed</h2>
          <p className="text-gray-500 mb-6">Ghost join is limited to administrators who can manage live classes.</p>
          <button
            type="button"
            onClick={() => router.push('/portal')}
            className="px-6 py-3 rounded-full font-bold text-white bg-primary"
          >
            Back to portal
          </button>
        </div>
      </div>
    );
  }

  if (missingLiveRoom) {
    return (
      <div className="pointer-events-auto absolute inset-0 bg-[#111] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white rounded-[32px] p-8">
          <h2 className="text-2xl font-bold font-headers text-secondary mb-3">Classroom not ready</h2>
          <p className="text-gray-500 mb-6">You do not have an assigned teacher room yet. Practice stays on the classroom page; live class opens after administration pairs you.</p>
          <button
            type="button"
            onClick={() => router.push('/portal/classroom')}
            className="px-6 py-3 rounded-full font-bold text-white bg-primary"
          >
            Back to Classroom
          </button>
        </div>
      </div>
    );
  }

  return (
    // Transparent and click-through: the conference is painted underneath by the
    // stage, and only the chrome below opts back into pointer events.
    <div className="absolute inset-0 overflow-hidden flex flex-col pointer-events-none">

      {/* Premium Loading Overlay */}
      {isLoading && (
        <div className="pointer-events-auto absolute inset-0 z-[50] bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center text-center transition-opacity duration-1000">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
             <div className="w-[400px] h-[400px] bg-amber-500/10 blur-[100px] rounded-full animate-pulse" />
             <div className="absolute w-[300px] h-[300px] bg-blue-500/10 blur-[80px] rounded-full animate-pulse delay-700" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative w-24 h-24 mb-8 flex items-center justify-center">
               <div className="absolute inset-0 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
               <div className="absolute inset-2 border-4 border-blue-200 border-b-blue-500 rounded-full animate-spin-reverse" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
               <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-[0_0_30px_rgba(245,154,35,0.4)] flex items-center justify-center text-white">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
               </div>
            </div>

            <h2 className="text-3xl font-black text-secondary mb-2 tracking-tight">{isPractice ? 'Opening practice room…' : statusText}</h2>
            <p className="text-gray-500 font-medium text-lg max-w-sm">
              {isPractice ? 'Same desk as class. No ringing, attendance, or transcript.' : 'Establishing secure connection to your virtual classroom.'}
            </p>
          </div>
        </div>
      )}

      {/* Status and exit stay on the left so they never sit on top of the
          self-view tile Jitsi floats in the top-right corner. */}
      <header
        ref={headerRef}
        className="pointer-events-auto shrink-0 z-[40] flex items-center gap-3 px-3 py-1.5 bg-[#111] border-b border-white/10"
      >
        <button
          type="button"
          onClick={leaveClass}
          className="shrink-0 rounded-full bg-red-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-red-500"
        >
          {staffGhost ? 'Stop monitoring' : 'Leave class'}
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className={isPractice ? 'w-2 h-2 rounded-full bg-sky-400 shrink-0' : 'w-2 h-2 rounded-full bg-emerald-400 shrink-0'} />
          <span className="text-xs font-semibold text-white/90 truncate">
            {staffGhost ? 'Monitor' : isPractice ? 'Practice' : `In class · ${elapsedMinutes}m`}
          </span>
          {isTranscribing ? (
            <span className="relative flex h-2 w-2 shrink-0" title="This class is being transcribed">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
          ) : null}
        </div>
        {isTeacherRole && !isPractice && !staffGhost && (
          <span className="hidden sm:inline ml-auto text-[10px] text-white/60">Students can rejoin while you are here</span>
        )}
      </header>

      {/* Matches the docked stage underneath; holds the overlays that sit on the video. */}
      <div className="relative flex-1 min-h-0 z-[10]">
        {!staffGhost && userData && user && (
          <>
            <ClassroomTools
              roomName={roomName}
              isTeacher={isTeacherRole}
              userData={userData}
            />
            {!isPractice && (
              <ClassroomRingHost
                roomName={roomName}
                userId={user.id}
                userName={userData.name || 'Class participant'}
                role={isTeacherRole ? 'teacher' : 'student'}
                userData={userData}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function VirtualClassroomSession() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading Classroom Module...</div>}>
      <ClassroomSessionContent />
    </Suspense>
  );
}
