-- ============================================================
-- GroTrack — Safe User Data Cleanup Script
-- Purpose: Remove all user-generated data for fresh QA testing
-- ⚠️  Run this ONLY in the Supabase SQL Editor
-- ⚠️  This does NOT touch tables, RLS policies, or schema
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- STEP 1: BACKUP (run separately before cleanup if you want a
-- snapshot — Supabase Dashboard > Table Editor > Export CSV)
-- ─────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────
-- STEP 2: Delete in safe cascade order to avoid FK violations
-- (child tables first, parent tables last)
-- ─────────────────────────────────────────────────────────────

-- 2a. Notifications (references profiles via user_id & owner_id)
DELETE FROM public.notifications;

-- 2b. Activity Logs (references profiles via user_id & owner_id)
DELETE FROM public.activity_logs;

-- 2c. Invoices (references payments, clients, profiles)
DELETE FROM public.invoices;

-- 2d. Payments (references clients, profiles)
DELETE FROM public.payments;

-- 2e. Tasks (references projects, clients, profiles)
DELETE FROM public.tasks;

-- 2f. Projects (references clients, profiles)
DELETE FROM public.projects;

-- 2g. Clients (references profiles)
DELETE FROM public.clients;

-- 2h. Profiles (references auth.users — CASCADE will handle auth.users)
DELETE FROM public.profiles;

-- ─────────────────────────────────────────────────────────────
-- STEP 3: Delete auth.users (requires service role / SQL Editor)
-- This triggers the ON DELETE CASCADE on profiles automatically,
-- but we already cleared profiles above for safety.
-- ─────────────────────────────────────────────────────────────

-- ⚠️  This deletes ALL registered users from Supabase Auth.
-- Only run this in Supabase SQL Editor with service_role context.
DELETE FROM auth.users;

-- ─────────────────────────────────────────────────────────────
-- STEP 4: Verification — these should all return 0 rows
-- ─────────────────────────────────────────────────────────────

SELECT 'auth.users'       AS table_name, COUNT(*) AS remaining FROM auth.users
UNION ALL
SELECT 'profiles',         COUNT(*) FROM public.profiles
UNION ALL
SELECT 'clients',          COUNT(*) FROM public.clients
UNION ALL
SELECT 'projects',         COUNT(*) FROM public.projects
UNION ALL
SELECT 'tasks',            COUNT(*) FROM public.tasks
UNION ALL
SELECT 'payments',         COUNT(*) FROM public.payments
UNION ALL
SELECT 'invoices',         COUNT(*) FROM public.invoices
UNION ALL
SELECT 'activity_logs',    COUNT(*) FROM public.activity_logs
UNION ALL
SELECT 'notifications',    COUNT(*) FROM public.notifications;

-- ─────────────────────────────────────────────────────────────
-- ✅ Schema, RLS policies, triggers, functions, storage buckets,
-- and all Supabase configuration remain fully intact.
-- The app is now ready for a clean fresh-start QA session.
-- ─────────────────────────────────────────────────────────────
