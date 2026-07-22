-- ============================================================
-- Migration: Add Task Reminders and Settings
-- ============================================================

-- 1. Add use_global_settings flag to tasks
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS use_global_settings BOOLEAN DEFAULT true;

-- 2. Create task_reminders table with optional note support
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('automatic', 'manual')) DEFAULT 'automatic',
  status TEXT CHECK (status IN ('pending', 'sent', 'cancelled')) DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS on task_reminders
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for task_reminders
DROP POLICY IF EXISTS "Admins can manage task reminders" ON public.task_reminders;
CREATE POLICY "Admins can manage task reminders" ON public.task_reminders 
  FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));

DROP POLICY IF EXISTS "Employees can manage own task reminders" ON public.task_reminders;
CREATE POLICY "Employees can manage own task reminders" ON public.task_reminders 
  FOR ALL USING (owner_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.tasks WHERE tasks.id = task_reminders.task_id AND tasks.assigned_to = auth.uid()
  ));

-- 5. Add to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'task_reminders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_reminders;
  END IF;
END $$;
