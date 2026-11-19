import type { JsonValue } from './json';

export interface CommunityPost {
  id: string;
  title?: string;
  body?: string;
  content?: string;
  author?: string;
  date?: string;
  category?: string;
  coverImage?: string;
  coverImageUrl?: string;
  status?: string;
}

export interface Testimonial {
  id?: string;
  name?: string;
  location?: string;
  content?: string;
  rating?: number;
  type?: string;
}

export interface ScheduleSlot {
  id?: string;
  day?: string;
  time?: string;
  teacherEmail?: string;
  teacherId?: string;
  teacherName?: string;
  teacher?: string;
  subject?: string;
  timezone?: string;
  isBooked?: boolean;
  /** One student id for 1:1, or up to five ids for a group slot. */
  bookedBy?: string | string[];
  /** True when this teacher time is a shared group class (capacity 5). */
  groupSlot?: boolean;
  roomID?: string;
}

export interface HomeworkItem {
  id?: string;
  status?: string;
  title?: string;
  task?: string;
  text?: string;
  dueDate?: string;
  date?: string;
  dateAssigned?: string;
  grade?: string | number;
  teacherFeedback?: string;
  teacher?: string;
  studentId?: string;
  studentName?: string;
  response?: { type?: string; data?: string; submittedAt?: string; [key: string]: JsonValue | undefined };
}

export interface ProgressLogEntry {
  date: string;
  topic: string;
  currentPage?: number;
  notes?: string;
}

export interface ProgressItem {
  name?: string;
  currentPage?: number;
  totalPages?: number;
  percentage?: number;
  color?: string;
  value?: number;
  topic?: string;
  updatedAt?: string;
  entries?: ProgressLogEntry[];
}

export interface HifzSession {
  id?: string;
  surah_name?: string;
  ayah_range?: string;
  accuracy_score?: number;
  tajweed_feedback?: string;
  session_date?: string;
  student_name?: string;
}

export interface LibraryResource {
  id: string;
  title?: string;
  description?: string;
  type?: string;
  category?: string;
  url?: string;
  status?: string;
  submitted_by?: string;
  submitted_by_name?: string;
  uploaded_by?: string;
  source?: string;
}

export interface TranscriptEntry {
  name?: string;
  timestamp?: string;
  transcriptData?: { text?: string };
}

export interface AiAnalysisReport {
  overallScore?: number | string;
  sentiment?: string;
  classEngagement?: string;
  teacherPerformanceSummary?: string;
  detectedKeywords?: Record<string, string[]>;
  strengths?: string[];
  redFlags?: string[];
  recommendedFollowUp?: string;
}

export interface HifzStudentProfile {
  id?: string;
  first_name?: string;
  last_name?: string;
}

export interface HifzPlanRange {
  page_start?: number;
  page_end?: number;
}

export interface InboxMessage {
  id?: string;
  read?: boolean;
  date?: string;
  dateAssigned?: string;
  subject?: string;
  teacher?: string;
  body?: string;
  comment?: string;
  [key: string]: JsonValue | undefined;
}
