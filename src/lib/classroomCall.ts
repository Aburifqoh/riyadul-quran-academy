import { classroomSessionHref } from '@/lib/classroomRoom';

export type ClassCallPayload = {
  room: string;
  href: string;
  fromId: string;
  fromName: string;
  fromRole: 'teacher' | 'student';
};

export function classroomPresenceChannel(room: string): string {
  return `classroom-presence-${room.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

export function classroomCallChannel(userId: string): string {
  return `classroom-call-${userId}`;
}

export function classCallHref(role: 'teacher' | 'student', room: string): string {
  return classroomSessionHref({ role, room });
}

/** Simple phone-style ring. Not attached to Jitsi — stop it anytime. */
export function startRingTone(): () => void {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return () => {};
  const ctx = new AudioCtx();
  let stopped = false;
  let timer = 0;

  const chirp = (when: number, freq: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.07, when + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + 0.4);
  };

  const loop = () => {
    if (stopped) return;
    const t = ctx.currentTime;
    chirp(t, 520);
    chirp(t + 0.42, 440);
    timer = window.setTimeout(loop, 1800);
  };

  void ctx.resume();
  loop();

  return () => {
    stopped = true;
    window.clearTimeout(timer);
    void ctx.close();
  };
}

export function playJoinChime(): void {
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = 660;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.28);
  osc.onended = () => { void ctx.close(); };
}
