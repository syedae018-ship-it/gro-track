-- Create the allowed_users table
CREATE TABLE public.allowed_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('employee','admin_ops','admin_finance','managing_director', 'admin')) DEFAULT 'employee',
  designation TEXT,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- Admins can manage allowed_users
CREATE POLICY "Admins can manage allowed_users" ON public.allowed_users FOR ALL USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin_ops', 'admin_finance', 'managing_director', 'admin')
  OR 
  -- Allow users with the role 'admin' in their allowed_users record to manage (if needed)
  EXISTS (SELECT 1 FROM public.allowed_users WHERE email = auth.jwt() ->> 'email' AND role IN ('admin_ops', 'admin_finance', 'managing_director', 'admin'))
);

-- Note: In NextAuth, RLS might not work perfectly without a custom JWT, 
-- but we are bypassing this for login using SECURITY DEFINER function.

-- Create RPC function to securely get an allowed user by email
CREATE OR REPLACE FUNCTION public.get_allowed_user(lookup_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_data jsonb;
BEGIN
  SELECT row_to_json(allowed_users)::jsonb INTO user_data
  FROM public.allowed_users
  WHERE email = lookup_email;

  RETURN user_data;
END;
$$;

-- Seed the initial admin user
INSERT INTO public.allowed_users (email, full_name, role, designation, status)
VALUES ('syed.ae018@gmail.com', 'Syed Mustafa Ahmed', 'admin', 'System Admin', 'active')
ON CONFLICT (email) DO NOTHING;
