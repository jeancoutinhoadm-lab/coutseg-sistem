DO $$
DECLARE
    new_user_id UUID := gen_random_uuid();
    target_email TEXT := 'admin@coutseg.com.br';
BEGIN
    -- Check if user already exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = target_email) THEN
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            aud,
            role
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            target_email,
            extensions.crypt('Admin@Coutseg2026', extensions.gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Admin Coutseg"}',
            now(),
            now(),
            'authenticated',
            'authenticated'
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = target_email;
        -- Update password just in case
        UPDATE auth.users 
        SET encrypted_password = extensions.crypt('Admin@Coutseg2026', extensions.gen_salt('bf')),
            updated_at = now()
        WHERE id = new_user_id;
    END IF;

    -- Ensure the user has the admin role in public.user_roles
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new_user_id AND role = 'admin') THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (new_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;