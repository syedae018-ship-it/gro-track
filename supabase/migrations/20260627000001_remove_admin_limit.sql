-- Remove the admin limit trigger and function to allow unlimited admins
DROP TRIGGER IF EXISTS enforce_admin_limit_trigger ON public.profiles;
DROP FUNCTION IF EXISTS check_admin_limit();
