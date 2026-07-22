-- ============================================================
-- Add deadline_notified Column to Tasks Table
-- Purpose: Track if a deadline notification/alert has been sent for a task.
-- ============================================================

ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS deadline_notified BOOLEAN DEFAULT false;

-- Create an index to quickly find tasks that haven't been notified yet and have deadlines
CREATE INDEX IF NOT EXISTS tasks_deadline_notified_idx 
  ON public.tasks (deadline, deadline_notified) 
  WHERE status NOT IN ('completed', 'approved');
