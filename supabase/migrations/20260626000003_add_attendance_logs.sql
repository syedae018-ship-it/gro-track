-- ============================================================
-- Add Attendance Logs Table for Work Session Tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS public.attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Employees can manage their own attendance logs" ON public.attendance_logs;
CREATE POLICY "Employees can manage their own attendance logs" 
  ON public.attendance_logs 
  USING (auth.uid() = employee_id);

DROP POLICY IF EXISTS "Admins can view all attendance logs" ON public.attendance_logs;
CREATE POLICY "Admins can view all attendance logs"
  ON public.attendance_logs 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
        AND role IN ('admin_ops', 'admin_finance', 'managing_director')
    )
  );
