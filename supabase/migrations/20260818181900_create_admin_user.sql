-- Create a new admin user if not exists
-- Note: We use auth.users but since we are in a migration, we can't easily set passwords without pgcrypto or similar
-- However, the user asked to "create it again and save it". 
-- In a Supabase environment, the best way to ensure an admin exists with a known role is to insert into user_roles.

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
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            new_user_id,
            '00000000-0000-0000-0000-000000000000',
            target_email,
            crypt('Admin@Coutseg2026', gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Admin Coutseg"}',
            now(),
            now(),
            '',
            '',
            '',
            ''
        );
    ELSE
        SELECT id INTO new_user_id FROM auth.users WHERE email = target_email;
        -- Update password just in case
        UPDATE auth.users 
        SET encrypted_password = crypt('Admin@Coutseg2026', gen_salt('bf')),
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
