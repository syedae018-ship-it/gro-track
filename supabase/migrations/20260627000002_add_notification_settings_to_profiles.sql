-- ============================================================
-- Migration: Add notification_settings column to profiles
-- ============================================================

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"deadline_notifications_enabled": false, "default_reminder_timings": []}'::jsonb;
