-- Add performance indexes for frequently queried columns

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON public.tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON public.tasks(client_id);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON public.payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Note: payouts table might not exist in your schema, but if it does, it's highly recommended to index:
-- CREATE INDEX IF NOT EXISTS idx_payouts_employee_id ON public.payouts(employee_id);
