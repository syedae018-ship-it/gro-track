-- Update Enforce Admin Limit Trigger to allow 3 admins
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

    IF admin_count >= 3 THEN
      RAISE EXCEPTION 'Maximum admin limit reached. Only 3 admins are allowed in the system.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
