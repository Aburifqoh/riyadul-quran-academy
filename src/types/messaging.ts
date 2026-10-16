export interface MessagingContact {
  id: string;
  name: string;
  role: string;
  email: string;
  studentContextId?: string;
  studentContextName?: string;
  unread?: number;
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface MessageRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  student_context_id?: string | null;
  filtered?: boolean;
}

export interface MessageFlag {
  id: string;
  message_id: string;
  reporter_id: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed' | 'action_taken';
  reviewed_by?: string;
  reviewed_at?: string;
  admin_note?: string;
  created_at: string;
}

export interface MessageBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  reason?: string;
  status: 'pending_review' | 'active' | 'lifted';
  created_at: string;
}

export interface MessagingAssignment {
  id: string;
  student_id: string;
  teacher_id: string;
  active: boolean;
  assigned_at: string;
  ended_at?: string;
  ended_reason?: string;
}
