-- Create an RPC to sync NextAuth users with auth.users and profiles
CREATE OR REPLACE FUNCTION public.sync_nextauth_user(
  google_email TEXT,
  google_name TEXT,
  google_image TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id UUID;
  existing_role TEXT;
BEGIN
  -- Check if user exists in auth.users
  SELECT id INTO user_id FROM auth.users WHERE email = google_email LIMIT 1;
  
  IF user_id IS NULL THEN
    -- Generate a new UUID for the user
    user_id := gen_random_uuid();
    
    -- Insert into auth.users to satisfy the foreign key constraint
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, 
      email_confirmed_at, recovery_sent_at, last_sign_in_at, 
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', google_email, '', 
      now(), NULL, now(), 
      '{"provider": "google", "providers": ["google"]}'::jsonb, 
      jsonb_build_object('full_name', google_name, 'avatar_url', google_image), 
      now(), now(), 
      '', '', '', ''
    );
  END IF;

  -- Determine role from allowed_users if possible
  SELECT role INTO existing_role FROM public.allowed_users WHERE email = google_email;

  -- Force development admin rule
  IF google_email = 'syed.ae018@gmail.com' THEN
    existing_role := 'managing_director';
  END IF;

  -- Convert 'admin' to 'managing_director' to bypass the profiles_role_check constraint mismatch
  IF existing_role = 'admin' THEN
    existing_role := 'managing_director';
  END IF;

  -- Ensure the user's email is updated in profiles
  UPDATE public.profiles SET email = google_email WHERE id = user_id;

  -- Ensure the profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id) THEN
    INSERT INTO public.profiles (id, full_name, email, avatar_url, role, is_active)
    VALUES (
      user_id, 
      google_name, 
      google_email, 
      google_image, 
      COALESCE(existing_role, 'employee'), 
      true
    );
  ELSE
    -- ALWAYS sync the role from allowed_users (single source of truth) to profiles
    IF existing_role IS NOT NULL THEN
      UPDATE public.profiles SET role = existing_role WHERE id = user_id;
    END IF;
  END IF;

  RETURN user_id;
END;
$$;
