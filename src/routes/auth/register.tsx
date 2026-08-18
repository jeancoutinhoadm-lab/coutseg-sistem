import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Shield, Loader2 } from "lucide-react";
import { logAudit } from "@/utils/audit";

const registerSchema = z.object({
  fullName: z.string().min(2, "Digite seu nome completo"),
  email: z.string().email("Digite um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/auth/register")({
  component: RegisterPage,
  head: () => ({
    meta: [
      { title: "Criar conta - Coutseg" },
      { name: "description", content: "Crie sua conta no sistema de gestão da Coutseg" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.fullName },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }
    await logAudit('CREATE', 'USER', undefined, null, { email: values.email, fullName: values.fullName });
    toast.success("Conta criada", {
      description: "Verifique seu e-mail para confirmar o cadastro.",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-flex mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Criar conta</CardTitle>
          <CardDescription>Comece a usar o sistema da Coutseg</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cadastrar
              </Button>
            </CardContent>
          </form>
        </Form>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          <span>
            Já tem conta?{" "}
            <Link to="/auth/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}
