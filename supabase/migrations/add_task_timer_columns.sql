-- ============================================================
-- Run this in Supabase SQL Editor → New Query → Run
-- This adds timer support columns to the tasks table
-- ============================================================

-- Add started_at column (tracks when employee clicks "Start Task")
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Add duration_minutes column (calculated on completion)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS duration_minutes INTEGER;

-- Confirm columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
ORDER BY ordinal_position;

-- ============================================================
-- Fix RLS Policy for Task Creation by Employees
-- ============================================================
-- Allow authenticated users/employees to insert tasks
DROP POLICY IF EXISTS "Employees can insert tasks" ON public.tasks;
CREATE POLICY "Employees can insert tasks" ON public.tasks 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Upgrade deadline column to store precise date and time
-- ============================================================
ALTER TABLE public.tasks
  ALTER COLUMN deadline TYPE TIMESTAMPTZ USING deadline::timestamptz;

