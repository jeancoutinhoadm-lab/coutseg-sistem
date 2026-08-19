import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

type AgencySettings = {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

function SettingsPage() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = role === "admin";

  const { data: settings, isLoading } = useQuery({
    queryKey: ["agency-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_settings")
        .select("*")
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data as AgencySettings | null;
    },
  });

  const { register, handleSubmit, reset } = useForm<AgencySettings>({
    values: settings || ({} as AgencySettings),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: AgencySettings) => {
      if (!isAdmin) throw new Error("Apenas administradores podem alterar as configurações.");
      
      const { id, ...updateData } = data;
      
      let error;
      if (id) {
        const { error: err } = await supabase
          .from("agency_settings")
          .update(updateData)
          .eq("id", id);
        error = err;
      } else {
        const { error: err } = await supabase
          .from("agency_settings")
          .insert(updateData);
        error = err;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-settings"] });
      toast.success("Configurações atualizadas com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar configurações: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações da Corretora</h1>
        <p className="text-muted-foreground">Gerencie os dados institucionais da CoutSeg.</p>
      </div>

      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 text-primary">
              <Building2 className="h-5 w-5" />
              <CardTitle>Dados Principais</CardTitle>
            </div>
            <CardDescription>Informações que aparecem em documentos e cabeçalhos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Corretora</Label>
                <Input id="name" {...register("name", { required: true })} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" {...register("cnpj")} placeholder="00.000.000/0000-00" disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register("phone")} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input id="email" {...register("email")} type="email" disabled={!isAdmin} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>Localização física da corretora.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Logradouro / Número / Complemento</Label>
                <Input id="address" {...register("address")} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" {...register("city")} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado (UF)</Label>
                <Input id="state" {...register("state")} maxLength={2} disabled={!isAdmin} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zip_code">CEP</Label>
                <Input id="zip_code" {...register("zip_code")} disabled={!isAdmin} />
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
