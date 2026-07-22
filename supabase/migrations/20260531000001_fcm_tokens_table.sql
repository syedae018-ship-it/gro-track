-- ============================================================
-- FCM Tokens and Notifications Category Upgrade
-- This migration:
-- 1. Adds a category column to the notifications table.
-- 2. Creates the fcm_tokens table to track user devices.
-- 3. Enables RLS and configures policies for token management.
-- ============================================================

-- 1. Upgrade Notifications Table
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS category TEXT 
  CHECK (category IN ('tasks', 'payments', 'attendance', 'announcements', 'system')) 
  DEFAULT 'system';

-- 2. Create FCM Tokens Table
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')) DEFAULT 'desktop',
  last_active TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can read, insert, and update their own tokens
DROP POLICY IF EXISTS "fcm_tokens_manage_own" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_manage_own" 
  ON public.fcm_tokens 
  FOR ALL 
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow any authenticated user to delete device tokens by value (needed for pruning expired tokens)
DROP POLICY IF EXISTS "fcm_tokens_delete_any_auth" ON public.fcm_tokens;
CREATE POLICY "fcm_tokens_delete_any_auth" 
  ON public.fcm_tokens 
  FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 5. Realtime replication enablement
ALTER PUBLICATION supabase_realtime ADD TABLE public.fcm_tokens;
