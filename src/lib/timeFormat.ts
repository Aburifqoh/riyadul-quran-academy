/**
 * Clock display for the whole site. Storage and matching stay on "HH:mm"
 * (or already-parsed AM/PM strings); every human-facing clock uses 12-hour.
 */

/** Minutes since midnight from "HH:mm", "8:00 PM", ranges like "20:00-20:30". */
export function parseClockMinutes(timeStr: string): number {
  if (!timeStr || !/\d/.test(timeStr)) return NaN;
  let raw = timeStr.trim();
  if (raw.includes('-')) raw = raw.split('-')[0].trim();
  const isPM = /pm/i.test(raw);
  const isAM = /am/i.test(raw);
  const clean = raw.replace(/am|pm/i, '').trim();
  const [hoursPart, minutesPart] = clean.split(':').map(Number);
  if (!Number.isFinite(hoursPart)) return NaN;
  let hours = hoursPart;
  const minutes = Number.isFinite(minutesPart) ? minutesPart : 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59) return NaN;
  if (hours === 24) return 24 * 60;
  return hours * 60 + minutes;
}

/** Canonical storage form used by matching / booking: "20:00". */
export function toStoredClockTime(timeStr: string): string {
  const mins = parseClockMinutes(timeStr);
  if (!Number.isFinite(mins)) return '';
  const clamped = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Human clock: "8:00 PM". Leaves blank / unparseable strings alone. */
export function formatClockTime(timeStr?: string | null): string {
  if (timeStr == null) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '';
  const mins = parseClockMinutes(trimmed);
  if (!Number.isFinite(mins)) return trimmed;
  const clamped = ((mins % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h24 = Math.floor(clamped / 60);
  const m = clamped % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDayAtTime(day?: string | null, time?: string | null): string {
  const d = (day || '').trim();
  const t = formatClockTime(time);
  if (d && t) return `${d} at ${t}`;
  return d || t;
}

/** Wall-clock stamp for message / log timestamps — always 12-hour. */
export function formatWallClock(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export type ClockOption = { value: string; label: string };

/** Half-hour choices from midnight through 11:30 PM. Values are "HH:mm". */
export function clockTimeOptions(stepMinutes = 30): ClockOption[] {
  const step = Math.max(1, Math.min(60, stepMinutes));
  const options: ClockOption[] = [];
  for (let m = 0; m < 24 * 60; m += step) {
    const value = toStoredClockTime(`${Math.floor(m / 60)}:${m % 60}`);
    options.push({ value, label: formatClockTime(value) });
  }
  return options;
}

const HALF_HOUR_OPTIONS = clockTimeOptions(30);

/** Options for a picker, including the current value if it is off-step. */
export function clockOptionsForValue(value?: string, stepMinutes = 30): ClockOption[] {
  const base = stepMinutes === 30 ? HALF_HOUR_OPTIONS : clockTimeOptions(stepMinutes);
  const stored = toStoredClockTime(value || '');
  if (!stored || base.some((o) => o.value === stored)) return base;
  return [...base, { value: stored, label: formatClockTime(stored) }]
    .sort((a, b) => parseClockMinutes(a.value) - parseClockMinutes(b.value));
}
