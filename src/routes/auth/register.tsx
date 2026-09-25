import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/register")({
  beforeLoad: () => { throw redirect({ to: "/auth/login" }); },
  head: () => ({
    meta: [
      { title: "Criar conta - Coutseg" },
      { name: "description", content: "Crie sua conta no sistema de gestão da Coutseg" },
    ],
  }),
});
