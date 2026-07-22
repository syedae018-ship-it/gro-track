-- ============================================================
-- Notifications Table RLS Policy Upgrade
-- This migration updates RLS policies to allow authenticated
-- users to insert notifications for other users (such as
-- task assignments, review submissions, and approvals).
-- ============================================================

-- Drop the existing all-encompassing policy
DROP POLICY IF EXISTS "Users can manage own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_own" ON public.notifications;

-- 1. Policy for Reading: Users can only see their own notifications
CREATE POLICY "notifications_select_own" 
  ON public.notifications 
  FOR SELECT 
  USING (user_id = auth.uid());

-- 2. Policy for Updating: Users can only mark their own notifications as read
CREATE POLICY "notifications_update_own" 
  ON public.notifications 
  FOR UPDATE 
  USING (user_id = auth.uid());

-- 3. Policy for Deleting: Users can only clear their own notifications
CREATE POLICY "notifications_delete_own" 
  ON public.notifications 
  FOR DELETE 
  USING (user_id = auth.uid());

-- 4. Policy for Inserting: Any authenticated user can insert/send notifications to others
CREATE POLICY "notifications_insert_all_auth" 
  ON public.notifications 
  FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');
