-- ==============================================================================
-- ALMUQRI INSTITUTE - ROW LEVEL SECURITY (RLS) POLICIES
-- Run this script in the Supabase SQL Editor
-- ==============================================================================

-- 1. Enable RLS on core tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- 2. USERS TABLE
-- Allow public insert (for registration)
CREATE POLICY "Allow public insert to users" ON users FOR INSERT WITH CHECK (true);
-- Users can view and update their own record
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid()::text = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid()::text = id);
-- Admins can read and update all users
CREATE POLICY "Admins can do everything on users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- 3. ASSESSMENTS TABLE
-- Allow public insert (for booking form)
CREATE POLICY "Allow public insert to assessments" ON assessments FOR INSERT WITH CHECK (true);
-- Users can read their own assessments
CREATE POLICY "Users can read own assessments" ON assessments FOR SELECT USING (user_id = auth.uid()::text);
-- Admins can do everything
CREATE POLICY "Admins can do everything on assessments" ON assessments FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- 4. FEEDBACK TABLE
-- Only teachers and admins can insert/update feedback
CREATE POLICY "Teachers can insert feedback" ON feedback FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('teacher', 'admin'))
);
CREATE POLICY "Teachers can update their own feedback" ON feedback FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('teacher', 'admin'))
);
-- Students can read feedback assigned to them
CREATE POLICY "Students can read their feedback" ON feedback FOR SELECT USING (
  studentId = auth.uid()::text OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('teacher', 'admin'))
);

-- 5. RESOURCES TABLE
-- Admins can insert/update/delete resources
CREATE POLICY "Admins can manage resources" ON resources FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);
-- Students can read resources assigned to them, Teachers can read all
CREATE POLICY "Users can read resources" ON resources FOR SELECT USING (
  assignedTo = auth.uid()::text OR
  assignedTo = 'all' OR
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role IN ('teacher', 'admin'))
);

-- 6. COMMUNITY POSTS
-- Anyone can read community posts
CREATE POLICY "Public read community posts" ON community_posts FOR SELECT USING (true);
-- Only Admins can manage community posts
CREATE POLICY "Admins can manage community posts" ON community_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin')
);

-- ==============================================================================
-- NOTE: The service_role key (used in webhooks) automatically bypasses all RLS.
-- ==============================================================================
