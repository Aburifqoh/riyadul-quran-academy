-- Gallery photos table with approval workflow
create table gallery_photos (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  caption text,
  event_tag text not null default 'Other',
  uploaded_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now()
);

create index on gallery_photos(status);
create index on gallery_photos(event_tag);
create index on gallery_photos(created_at desc);

alter table gallery_photos enable row level security;

-- Admins and Super Admins can upload (insert) new pending photos
create policy "admins can upload"
  on gallery_photos for insert
  to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  );

-- Admins can see their own uploads regardless of status (so they can track review state)
-- Super Admins can see everything
create policy "admins see own, super admin sees all"
  on gallery_photos for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );

-- Only Super Admin can change status (approve/reject)
create policy "only super_admin reviews"
  on gallery_photos for update
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Only Super Admin can delete outright
create policy "only super_admin deletes"
  on gallery_photos for delete
  to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin');

-- Public (anon) can only ever see approved photos — this is what the
-- public gallery page's anon-key client relies on
create policy "public sees only approved"
  on gallery_photos for select
  to anon
  using (status = 'approved');


-- ============================================================
-- Storage bucket setup (run in Supabase Dashboard > Storage, or via SQL
-- if you have the storage extension exposed)
-- ============================================================

-- 1. Create a bucket named "gallery" — public read, since approved
--    photos are meant to be publicly visible. Do this via the Dashboard
--    UI (Storage > New bucket > Public bucket: ON) for simplicity, or:

insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

-- 2. Storage policies: any authenticated admin/super_admin can upload,
--    nobody can upload as anon, and deletion is super_admin only.

create policy "admins can upload to gallery bucket"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'gallery'
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
  );

create policy "public can read gallery bucket"
  on storage.objects for select
  to public
  using (bucket_id = 'gallery');

create policy "only super_admin deletes from gallery bucket"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'gallery'
    and (auth.jwt() -> 'app_metadata' ->> 'role') = 'super_admin'
  );
