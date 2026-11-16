-- Run this in your Supabase SQL Editor to create the messages table

CREATE TABLE IF NOT EXISTS messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id text NOT NULL, -- The user.id of the sender
  receiver_id text NOT NULL, -- The user.id of the receiver, or a broadcast string like 'all_students', 'all_teachers', 'all_users'
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read messages sent TO them, OR sent BY them, OR broadcast messages.
-- Admins and super_admins can read ALL messages.
CREATE POLICY "Users can read their own messages or broadcasts" 
ON messages FOR SELECT 
TO authenticated 
USING (
  auth.uid()::text = sender_id 
  OR auth.uid()::text = receiver_id 
  OR receiver_id = 'all_users'
  OR (receiver_id = 'all_students' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role::text LIKE '%student%'))
  OR (receiver_id = 'all_teachers' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role::text LIKE '%teacher%'))
  OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND (role::text LIKE '%admin%' OR role::text LIKE '%super_admin%'))
);

-- Allow authenticated users to insert messages.
CREATE POLICY "Users can insert messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid()::text = sender_id
);

-- Allow users to update 'read' status for messages sent TO them
CREATE POLICY "Users can mark messages as read" 
ON messages FOR UPDATE
TO authenticated 
USING (
  auth.uid()::text = receiver_id
)
WITH CHECK (
  auth.uid()::text = receiver_id
);
