-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- DROP EXISTING TABLES (clean slate)
-- ============================================================
DROP TABLE IF EXISTS public.analytics CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL DEFAULT 'New User',
  role TEXT CHECK (role IN ('employee','admin_ops','admin_finance','managing_director')) DEFAULT 'employee',
  avatar_initials TEXT,
  avatar_gradient TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. CLIENTS TABLE
-- ============================================================
CREATE TABLE public.clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry TEXT,
  contact_email TEXT,
  status TEXT CHECK (status IN ('active','on_hold','completed')) DEFAULT 'active',
  total_billed NUMERIC DEFAULT 0,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PROJECTS TABLE
-- ============================================================
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('planning','active','completed','paused')) DEFAULT 'planning',
  progress INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. TASKS TABLE
-- ============================================================
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  deadline DATE,
  priority TEXT CHECK (priority IN ('high','medium','low')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo','in_progress','review','completed','approved')) DEFAULT 'todo',
  payment_amount NUMERIC DEFAULT 0,
  delivery_link TEXT,
  revision_count INTEGER DEFAULT 0,
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PAYMENTS TABLE
-- ============================================================
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount NUMERIC DEFAULT 0,
  tasks_included UUID[] DEFAULT '{}',
  status TEXT CHECK (status IN ('pending','approved','paid')) DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. INVOICES TABLE
-- ============================================================
CREATE TABLE public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  employee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  pdf_url TEXT,
  amount NUMERIC DEFAULT 0,
  status TEXT CHECK (status IN ('draft','sent','paid','overdue')) DEFAULT 'draft',
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. ACTIVITY LOGS TABLE
-- ============================================================
CREATE TABLE public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. NOTIFICATIONS TABLE
-- ============================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT CHECK (type IN ('alert','success','info','warning')) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. ANALYTICS TABLE
-- ============================================================
CREATE TABLE public.analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,
  value NUMERIC,
  period DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics ENABLE ROW LEVEL SECURITY;

-- ── Profiles ─────────────────────────────────────────────────
-- Any authenticated user can read all profiles (needed for assignee dropdowns)
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can insert only their own profile row
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update only their own profile row
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ── Helper function to check if current user is admin ────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin_ops', 'admin_finance', 'managing_director')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── Clients ───────────────────────────────────────────────────
CREATE POLICY "clients_admin_all" ON public.clients
  FOR ALL USING (public.is_admin());

CREATE POLICY "clients_employee_select" ON public.clients
  FOR SELECT USING (auth.role() = 'authenticated');

-- ── Projects ──────────────────────────────────────────────────
CREATE POLICY "projects_admin_all" ON public.projects
  FOR ALL USING (public.is_admin());

CREATE POLICY "projects_employee_select" ON public.projects
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      created_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.project_id = projects.id
        AND tasks.assigned_to = auth.uid()
      )
    )
  );

-- ── Tasks ─────────────────────────────────────────────────────
CREATE POLICY "tasks_admin_all" ON public.tasks
  FOR ALL USING (public.is_admin());

CREATE POLICY "tasks_employee_select" ON public.tasks
  FOR SELECT USING (
    assigned_to = auth.uid() OR created_by = auth.uid()
  );

CREATE POLICY "tasks_employee_update" ON public.tasks
  FOR UPDATE USING (assigned_to = auth.uid())
  WITH CHECK (assigned_to = auth.uid());

-- ── Payments ──────────────────────────────────────────────────
CREATE POLICY "payments_admin_all" ON public.payments
  FOR ALL USING (public.is_admin());

CREATE POLICY "payments_employee_select" ON public.payments
  FOR SELECT USING (employee_id = auth.uid() OR created_by = auth.uid());

-- ── Invoices ──────────────────────────────────────────────────
CREATE POLICY "invoices_admin_all" ON public.invoices
  FOR ALL USING (public.is_admin());

CREATE POLICY "invoices_employee_select" ON public.invoices
  FOR SELECT USING (employee_id = auth.uid() OR created_by = auth.uid());

-- ── Activity Logs ─────────────────────────────────────────────
CREATE POLICY "logs_admin_all" ON public.activity_logs
  FOR ALL USING (public.is_admin());

CREATE POLICY "logs_employee_select" ON public.activity_logs
  FOR SELECT USING (user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "logs_employee_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (created_by = auth.uid());

-- ── Notifications ─────────────────────────────────────────────
CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ── Analytics ────────────────────────────────────────────────
CREATE POLICY "analytics_admin_all" ON public.analytics
  FOR ALL USING (public.is_admin());

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- TRIGGER: Auto-set completed_at on task status change
-- ============================================================
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    NEW.completed_at = NOW();
  ELSIF NEW.status NOT IN ('completed', 'approved') THEN
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

-- ============================================================
-- TRIGGER: Auto-create profile on new user signup
-- CRITICAL: Only creates the profile row. No demo data here.
-- Demo data is seeded separately via the /auth/callback route.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1), 'New User'),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'employee')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      full_name = EXCLUDED.full_name,
      role = EXCLUDED.role,
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
