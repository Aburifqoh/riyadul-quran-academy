import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getDay, startOfDay, addMinutes, addDays } from 'date-fns';

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTimeString(timeStr: string) {
  try {
    if (!timeStr || !/\d/.test(timeStr)) return [0, 0];
    let rawTime = timeStr;
    if (rawTime.includes('-')) {
      rawTime = rawTime.split('-')[0].trim();
    }
    const isPM = rawTime.toLowerCase().includes('pm');
    const isAM = rawTime.toLowerCase().includes('am');
    const cleanTime = rawTime.replace(/am|pm/i, '').trim();
    const [hoursPart, minutesPart] = cleanTime.split(':').map(Number);
    let hours = hoursPart;
    const minutes = minutesPart || 0;
    if (isNaN(hours)) return [0, 0];
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;
    return [hours, minutes || 0];
  } catch {
    return [0, 0];
  }
}

export function resolveClassStatus(dayOfWeek: string, localTimeStr: string, timezone: string = 'UTC') {
  const targetDayIndex = days.findIndex(d => d.toLowerCase() === dayOfWeek.toLowerCase());
  if (targetDayIndex === -1) return { isLive: false, startAt: 0, endAt: 0 };

  const nowUtc = new Date();
  const nowInTargetTz = toZonedTime(nowUtc, timezone);
  const currentDayIndex = getDay(nowInTargetTz);
  
  // If the day of the week in the target timezone doesn't match the schedule, it's not live today
  if (currentDayIndex !== targetDayIndex) {
      return { isLive: false, startAt: 0, endAt: 0 };
  }
  
  const [hours, minutes] = parseTimeString(localTimeStr);
  
  // Create a Date object for today in the target timezone at the scheduled time
  const startOfTodayInTz = startOfDay(nowInTargetTz);
  const scheduledTimeInTz = addMinutes(startOfTodayInTz, (hours * 60) + (minutes || 0));
  
  // Convert this scheduled local time back to UTC to get the absolute timestamp
  const startAtUtc = fromZonedTime(scheduledTimeInTz, timezone);
  
  // Assume a default class duration of 60 minutes
  const endAtUtc = addMinutes(startAtUtc, 60);
  
  const nowMs = Date.now();
  const startMs = startAtUtc.getTime();
  const endMs = endAtUtc.getTime();
  
  // Live if within 5 mins before or during the 60 min class
  const isLive = nowMs >= (startMs - 5 * 60 * 1000) && nowMs <= endMs;
  
  return {
    isLive,
    startAt: startMs,
    endAt: endMs
  };
}

/**
 * The canonical timezone for a user. Teachers set it explicitly; students get it
 * auto-detected. Falls back through `timezone` → `detectedTz` → 'UTC' so scheduling
 * code always has an explicit IANA zone to work with.
 */
export function weekdayInTimezone(timezone?: string | null, now = new Date()): string {
  const zone = timezone && timezone.trim() ? timezone : 'UTC';
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(now);
  } catch {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
  }
}

export function readBrowserTimezone(): string {
  if (typeof window === 'undefined') return 'UTC';
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getUserTimezone(
  user?: { timezone?: string | null; detectedTz?: string | null } | null
): string {
  const tz = user?.timezone || user?.detectedTz;
  return tz && tz.trim() ? tz : 'UTC';
}

/** Normalize a "HH:mm" / "8:00 PM" style string to minutes-since-midnight. */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = parseTimeString(timeStr);
  return hours * 60 + (minutes || 0);
}

/**
 * True when a student's preferred recurring slot (expressed in `studentTz`) lands
 * on the exact same real-world weekly moment as a teacher's availability slot
 * (expressed in `teacherTz`). This is what makes cross-timezone matching correct:
 * a Lagos "Monday 20:00" equals a London "Monday 19:00".
 */
export function slotsAreEquivalent(
  studentDay: string,
  studentTime: string,
  studentTz: string,
  teacherDay: string,
  teacherTime: string,
  teacherTz: string
): boolean {
  if (!studentDay || !studentTime || !teacherDay || !teacherTime) return false;
  const converted = convertSlotToTimezone(
    studentDay,
    studentTime,
    studentTz || 'UTC',
    teacherTz || 'UTC'
  );
  return (
    converted.day.toLowerCase() === teacherDay.toLowerCase() &&
    timeToMinutes(converted.time) === timeToMinutes(teacherTime)
  );
}

export function convertSlotToTimezone(dayOfWeek: string, timeStr: string, sourceTz: string, targetTz: string) {
  if (!dayOfWeek || !timeStr || !sourceTz || !targetTz || sourceTz === targetTz) {
    return { day: dayOfWeek, time: timeStr };
  }
  
  const targetDayIndex = days.findIndex(d => d.toLowerCase() === dayOfWeek.toLowerCase());
  if (targetDayIndex === -1) return { day: dayOfWeek, time: timeStr };
  
  const nowUtc = new Date();
  const nowInSourceTz = toZonedTime(nowUtc, sourceTz);
  
  const currentDayIndex = getDay(nowInSourceTz);
  let daysToAdd = targetDayIndex - currentDayIndex;
  // Only roll forward when the weekday has already passed. Using today (0) keeps
  // the conversion on this week's DST rules instead of next week's.
  if (daysToAdd < 0) daysToAdd += 7;
  
  const targetDateInSource = addDays(startOfDay(nowInSourceTz), daysToAdd);
  
  const [hours, minutes] = parseTimeString(timeStr);
  const scheduledTimeInSource = addMinutes(targetDateInSource, (hours * 60) + (minutes || 0));
  
  const absoluteUtc = fromZonedTime(scheduledTimeInSource, sourceTz);
  const timeInTargetTz = toZonedTime(absoluteUtc, targetTz);
  
  const newDayOfWeek = days[getDay(timeInTargetTz)];
  const newHours = timeInTargetTz.getHours().toString().padStart(2, '0');
  const newMinutes = timeInTargetTz.getMinutes().toString().padStart(2, '0');
  
  return {
    day: newDayOfWeek,
    time: `${newHours}:${newMinutes}`
  };
}
