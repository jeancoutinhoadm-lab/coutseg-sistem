
-- 1. Create app_role enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'corretor', 'administrativo', 'financeiro', 'gerente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role public.app_role NOT NULL,
    UNIQUE (user_id, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security Definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Audit Logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity text NOT NULL,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs" ON public.audit_logs
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Migrate current roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
       CASE 
         WHEN role = 'admin' THEN 'admin'::public.app_role 
         ELSE 'corretor'::public.app_role 
       END
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 6. Refine RLS Policies for existing tables

-- CLIENTS
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;
CREATE POLICY "Admins and Managers view all clients" ON public.clients
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Brokers view own clients" ON public.clients
    FOR SELECT TO authenticated USING (
        public.has_role(auth.uid(), 'corretor') AND 
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid())
    );
CREATE POLICY "Staff view all clients" ON public.clients
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admins and Staff can insert/update clients" ON public.clients
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'));

-- POLICIES
DROP POLICY IF EXISTS "Authenticated users can manage policies" ON public.policies;
CREATE POLICY "Admins and Managers view all policies" ON public.policies
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gerente'));
CREATE POLICY "Brokers view own policies" ON public.policies
    FOR SELECT TO authenticated USING (
        public.has_role(auth.uid(), 'corretor') AND 
        broker_id IN (SELECT id FROM public.brokers WHERE user_id = auth.uid())
    );
CREATE POLICY "Staff view all policies" ON public.policies
    FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'administrativo') OR public.has_role(auth.uid(), 'financeiro'));
CREATE POLICY "Admins and Staff can manage policies" ON public.policies
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'));

-- INSURERS
DROP POLICY IF EXISTS "Authenticated users can manage insurers" ON public.insurers;
CREATE POLICY "All authenticated can view insurers" ON public.insurers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and Staff can manage insurers" ON public.insurers
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'))
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'administrativo'));

-- BROKERS
DROP POLICY IF EXISTS "Authenticated users can manage brokers" ON public.brokers;
CREATE POLICY "All authenticated can view brokers" ON public.brokers
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage brokers" ON public.brokers
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
