-- ============================================================
-- Add Payouts System Tables and update Tasks
-- ============================================================

-- Add payout_status and payout_id to tasks
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS payout_status TEXT CHECK (payout_status IN ('unpaid', 'payout_requested', 'paid')) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payout_id UUID;

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('requested', 'paid', 'rejected')) DEFAULT 'requested',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  payment_proof_url TEXT,
  notes TEXT,
  filter_used TEXT
);

-- Create payout_tasks link table
CREATE TABLE IF NOT EXISTS public.payout_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID REFERENCES public.payouts(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE
);

-- Add foreign key constraint to tasks for payout_id
ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_payout_id_fkey,
  ADD CONSTRAINT tasks_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_tasks ENABLE ROW LEVEL SECURITY;

-- Employee policies for payouts
CREATE POLICY "Employees can view own payouts" ON public.payouts
  FOR SELECT USING (auth.uid() = employee_id);

CREATE POLICY "Employees can insert own payouts" ON public.payouts
  FOR INSERT WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update own payouts" ON public.payouts
  FOR UPDATE USING (auth.uid() = employee_id);

-- Employee policies for payout_tasks
CREATE POLICY "Employees can view own payout_tasks" ON public.payout_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.payouts
      WHERE payouts.id = payout_tasks.payout_id
      AND payouts.employee_id = auth.uid()
    )
  );

CREATE POLICY "Employees can insert own payout_tasks" ON public.payout_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.payouts
      WHERE payouts.id = payout_tasks.payout_id
      AND payouts.employee_id = auth.uid()
    )
  );

-- Admin policies
CREATE POLICY "Admins can manage all payouts" ON public.payouts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all payout_tasks" ON public.payout_tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
