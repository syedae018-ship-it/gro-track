-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('employee','admin_ops','admin_finance','managing_director')),
  avatar_initials TEXT,
  avatar_gradient TEXT,
  is_active BOOLEAN DEFAULT true,
  notification_settings JSONB DEFAULT '{"deadline_notifications_enabled": false, "default_reminder_timings": []}'::jsonb,
  employee_id TEXT UNIQUE,
  email TEXT UNIQUE,
  designation TEXT,
  pay_type TEXT,
  default_rate NUMERIC DEFAULT 0,
  google_user_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Clients Table
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  contact_email TEXT,
  status TEXT CHECK (status IN ('active','on_hold','completed')) DEFAULT 'active',
  total_billed NUMERIC DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Projects Table (NEW)
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planning','active','completed','paused')) DEFAULT 'planning',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tasks Table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  task_type TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  deadline TIMESTAMPTZ,
  priority TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo','in_progress','review','completed','approved')) DEFAULT 'todo',
  payment_amount NUMERIC DEFAULT 0,
  task_pay_type TEXT,
  task_rate NUMERIC DEFAULT 0,
  hours_worked NUMERIC DEFAULT 0,
  delivery_link TEXT,
  revision_count INTEGER DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  deadline_notifications_enabled BOOLEAN DEFAULT false,
  automatic_reminder_timings JSONB DEFAULT '[]'::jsonb,
  use_global_settings BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.5 Task Reminders (NEW)
CREATE TABLE public.task_reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  type TEXT CHECK (type IN ('automatic', 'manual')) DEFAULT 'automatic',
  status TEXT CHECK (status IN ('pending', 'sent', 'cancelled')) DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments Table
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  tasks_included UUID[] DEFAULT '{}',
  status TEXT CHECK (status IN ('pending','approved','paid')) DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Invoices Table
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  employee_id UUID REFERENCES public.profiles(id),
  pdf_url TEXT,
  amount NUMERIC DEFAULT 0,
  line_items JSONB DEFAULT '[]'::jsonb,
  discount NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  notes TEXT,
  status TEXT CHECK (status IN ('draft','sent','paid','overdue')) DEFAULT 'draft',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Activity Logs (NEW)
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications (NEW)
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT CHECK (type IN ('alert','success','info','warning')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- Profiles: Anyone authenticated can read profiles (needed for dropdowns, etc.)
CREATE POLICY "Authenticated users can read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Clients
CREATE POLICY "Admins can manage clients" ON public.clients FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));

-- Projects
CREATE POLICY "Admins can manage projects" ON public.projects FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));
CREATE POLICY "Employees can view projects of assigned tasks" ON public.projects FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.tasks WHERE tasks.project_id = projects.id AND tasks.assigned_to = auth.uid())
);

-- Tasks
CREATE POLICY "Admins can manage tasks" ON public.tasks FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));
CREATE POLICY "Employees can view assigned tasks" ON public.tasks FOR SELECT USING (assigned_to = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Employees can update assigned tasks" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid()) WITH CHECK (assigned_to = auth.uid());
CREATE POLICY "Employees can insert tasks" ON public.tasks FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Task Reminders
CREATE POLICY "Admins can manage task reminders" ON public.task_reminders FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));
CREATE POLICY "Employees can manage own task reminders" ON public.task_reminders FOR ALL USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.tasks WHERE tasks.id = task_reminders.task_id AND tasks.assigned_to = auth.uid()));

-- Payments
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));
CREATE POLICY "Employees can view own payments" ON public.payments FOR SELECT USING (employee_id = auth.uid());

-- Invoices
CREATE POLICY "Admins can manage invoices" ON public.invoices FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));

-- Activity Logs
CREATE POLICY "Admins can manage logs" ON public.activity_logs FOR ALL USING ((auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director'));
CREATE POLICY "Employees can view own logs" ON public.activity_logs FOR SELECT USING (user_id = auth.uid() OR owner_id = auth.uid());
CREATE POLICY "Employees can insert own logs" ON public.activity_logs FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Notifications
CREATE POLICY "Users can manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());

-- REALTIME CONFIGURATION
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.payments;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.task_reminders;

-- TRIGGER FOR AUTO COMPLETION TIMESTAMP
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    ELSIF NEW.status != 'completed' AND NEW.status != 'approved' THEN
        NEW.completed_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_completed_at ON public.tasks;
CREATE TRIGGER trigger_update_completed_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION update_completed_at();

-- TRIGGER FOR NEW USER PROFILE CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_client_id UUID;
  new_project_id UUID;
  new_payment_id UUID;
BEGIN
  -- 1. Create Profile
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 
    COALESCE(new.raw_user_meta_data->>'role', 'employee')
  );

  -- 2. Seed Demo Data
  -- Create a Client
  INSERT INTO public.clients (owner_id, name, industry, contact_email)
  VALUES (new.id, 'Acme Corp', 'Technology', 'contact@acme.com')
  RETURNING id INTO new_client_id;

  -- Create a Project
  INSERT INTO public.projects (owner_id, client_id, name, description)
  VALUES (new.id, new_client_id, 'Website Redesign', 'Redesign of corporate website')
  RETURNING id INTO new_project_id;

  -- Create a Task
  INSERT INTO public.tasks (owner_id, project_id, client_id, title, task_type, assigned_to, assigned_by)
  VALUES (new.id, new_project_id, new_client_id, 'Design System', 'design', new.id, new.id);

  -- Create a Payment
  INSERT INTO public.payments (owner_id, client_id, employee_id, period_start, period_end, total_amount)
  VALUES (new.id, new_client_id, new.id, CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE, 5000)
  RETURNING id INTO new_payment_id;

  -- Create an Invoice
  INSERT INTO public.invoices (owner_id, payment_id, client_id, invoice_number, employee_id, amount)
  VALUES (new.id, new_payment_id, new_client_id, 'INV-1001', new.id, 5000);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 9. Attendance Logs (NEW)
CREATE TABLE public.attendance_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can manage their own attendance logs" 
  ON public.attendance_logs 
  USING (auth.uid() = employee_id);

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
