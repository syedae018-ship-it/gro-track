-- Fix the profiles role check constraint to include 'admin'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('employee', 'admin_ops', 'admin_finance', 'managing_director', 'admin'));
