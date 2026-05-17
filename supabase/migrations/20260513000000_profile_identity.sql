-- ============================================================
-- Profile Identity System — Safe Additive Migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- All columns use ADD COLUMN IF NOT EXISTS for backward compat
-- ============================================================

-- 1. Extend profiles with identity fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS handle TEXT,
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS status_emoji TEXT DEFAULT '💼',
  ADD COLUMN IF NOT EXISTS current_project TEXT,
  ADD COLUMN IF NOT EXISTS favorite_tools TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Kolkata',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"task_assigned":true,"payment_update":true,"deadline_reminder":true,"system_alerts":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS xp_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS profile_completed INTEGER DEFAULT 0;

-- 2. Create unique index on username (skip if already exists)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles(username)
  WHERE username IS NOT NULL;

-- 3. Create banners storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banners',
  'banners',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for banners
DROP POLICY IF EXISTS "banner_read_all" ON storage.objects;
CREATE POLICY "banner_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');

DROP POLICY IF EXISTS "banner_upload_own" ON storage.objects;
CREATE POLICY "banner_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "banner_update_own" ON storage.objects;
CREATE POLICY "banner_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "banner_delete_own" ON storage.objects;
CREATE POLICY "banner_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'banners'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Also ensure avatars bucket exists (fixes "Bucket not found" issue)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatar_read_all" ON storage.objects;
CREATE POLICY "avatar_read_all" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatar_upload_own" ON storage.objects;
CREATE POLICY "avatar_upload_own" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatar_update_own" ON storage.objects;
CREATE POLICY "avatar_update_own" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "avatar_delete_own" ON storage.objects;
CREATE POLICY "avatar_delete_own" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Done! All existing data and users are unaffected.
