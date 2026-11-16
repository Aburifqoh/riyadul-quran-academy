-- 1. Add columns to community_posts
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'published', 'rejected'));
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS author_id uuid REFERENCES auth.users(id);

-- 2. Update existing posts to published so they don't disappear
UPDATE community_posts SET status = 'published' WHERE status = 'pending_approval';

-- 3. Update RLS policies
-- Drop old policies if any
DROP POLICY IF EXISTS "Public can view community posts" ON community_posts;
DROP POLICY IF EXISTS "Admins can insert community posts" ON community_posts;
DROP POLICY IF EXISTS "Admins can update community posts" ON community_posts;
DROP POLICY IF EXISTS "Admins can delete community posts" ON community_posts;

-- Public can see published posts
CREATE POLICY "Public sees published posts"
ON community_posts FOR SELECT
USING (status = 'published');

-- Admins and Teachers can insert posts (teachers will default to pending_approval)
CREATE POLICY "Admins and teachers insert posts"
ON community_posts FOR INSERT
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin', 'teacher')
);

-- Teachers can see their own pending posts, Admins/SuperAdmins see all
CREATE POLICY "Teachers see own posts, Admins see all"
ON community_posts FOR SELECT
USING (
  status = 'published' OR 
  author_id = auth.uid() OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
);

-- Only Super Admins and Admins can update (to approve/reject or edit)
CREATE POLICY "Admins update posts"
ON community_posts FOR UPDATE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
);

-- Only Super Admins and Admins can delete
CREATE POLICY "Admins delete posts"
ON community_posts FOR DELETE
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
);
