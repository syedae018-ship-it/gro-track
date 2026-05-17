-- 1. Enforce Admin Limit Trigger
CREATE OR REPLACE FUNCTION check_admin_limit()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INT;
BEGIN
  -- If we are inserting an admin role OR updating a role to admin
  IF NEW.role IN ('admin_ops', 'admin_finance', 'managing_director', 'admin') THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.profiles
    WHERE role IN ('admin_ops', 'admin_finance', 'managing_director', 'admin')
      AND id != NEW.id;

    IF admin_count >= 2 THEN
      RAISE EXCEPTION 'Maximum admin limit reached. Only 2 admins are allowed in the system.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_admin_limit_trigger ON public.profiles;
CREATE TRIGGER enforce_admin_limit_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_admin_limit();

-- 2. Add custom_client_name to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS custom_client_name TEXT;
