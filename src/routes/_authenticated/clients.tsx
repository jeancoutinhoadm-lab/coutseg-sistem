import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, UserCheck } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/utils/audit";

const maskCPF = (value: string) => {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
};

const maskCNPJ = (value: string) => {
  return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.***.***/$4-$5");
};


export const Route = createFileRoute("/_authenticated/clients")({
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: "Clientes - Coutseg" },
      { name: "description", content: "Gerencie a carteira de clientes da Coutseg" },
    ],
  }),
});

function ClientsPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const queryClient = useQueryClient();
  const { role } = useAuth();

  const { data: clients, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*, brokers(full_name)")
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: any) => {
      // Verificar duplicidade por CPF/CNPJ
      if (values.cpf_cnpj) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id, full_name")
          .eq("cpf_cnpj", values.cpf_cnpj)
          .maybeSingle();

        if (existing && (!editing || existing.id !== editing.id)) {
          throw new Error(`CPF/CNPJ já cadastrado para o cliente: ${existing.full_name}`);
        }
      }

      if (editing) {
        const { error } = await supabase.from("clients").update(values).eq("id", editing.id);
        if (error) throw error;
        await logAudit('UPDATE', 'CLIENT', editing.id, editing, values);
      } else {
        const { data, error } = await supabase.from("clients").insert(values).select().single();
        if (error) throw error;
        await logAudit('CREATE', 'CLIENT', data.id, null, values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      await logAudit('DELETE', 'CLIENT', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente removido");
    },
  });

  const filtered = clients?.filter((c) =>
    [c.full_name, c.email, c.phone, c.cpf_cnpj].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie a carteira de clientes da Coutseg</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo cliente
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Buscar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail, telefone ou documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Corretor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length ? (
                  filtered.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.full_name}</TableCell>
                      <TableCell>
                        <div className="text-sm">{client.email}</div>
                        <div className="text-sm text-muted-foreground">{client.phone}</div>
                      </TableCell>
                      <TableCell>{client.cpf_cnpj ? (client.type === 'PJ' ? maskCNPJ(client.cpf_cnpj) : maskCPF(client.cpf_cnpj)) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant={(client as any).status === 'active' ? 'default' : (client as any).status === 'prospect' ? 'outline' : 'secondary'}>
                          {(client as any).status === 'active' ? 'Ativo' : (client as any).status === 'prospect' ? 'Prospect' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{(client as any).brokers?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(client);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Excluir cliente?")) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}

function ClientDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: any;
  onSubmit: (values: any) => void;
  isPending: boolean;
}) {
  const [fullName, setFullName] = useState(editing?.full_name ?? "");
  const [type, setType] = useState(editing?.type ?? "PF");
  const [status, setStatus] = useState(editing?.status ?? "active");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [phone, setPhone] = useState(editing?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(editing?.whatsapp ?? "");
  const [cpfCnpj, setCpfCnpj] = useState(editing?.cpf_cnpj ?? "");
  const [birthDate, setBirthDate] = useState(editing?.birth_date ?? "");
  const [address, setAddress] = useState(editing?.address ?? "");
  const [complement, setComplement] = useState(editing?.complement ?? "");
  const [neighborhood, setNeighborhood] = useState(editing?.neighborhood ?? "");
  const [city, setCity] = useState(editing?.city ?? "");
  const [state, setState] = useState(editing?.state ?? "");
  const [zipCode, setZipCode] = useState(editing?.zip_code ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [brokerId, setBrokerId] = useState(editing?.broker_id ?? "");

  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("*").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { role } = useAuth();

  useEffect(() => {
    if (editing) {
      setFullName(editing.full_name);
      setType(editing.type ?? "PF");
      setStatus(editing.status ?? "active");
      setEmail(editing.email ?? "");
      setPhone(editing.phone ?? "");
      setWhatsapp(editing.whatsapp ?? "");
      setCpfCnpj(editing.cpf_cnpj ?? "");
      setBirthDate(editing.birth_date ?? "");
      setAddress(editing.address ?? "");
      setComplement(editing.complement ?? "");
      setNeighborhood(editing.neighborhood ?? "");
      setCity(editing.city ?? "");
      setState(editing.state ?? "");
      setZipCode(editing.zip_code ?? "");
      setNotes(editing.notes ?? "");
      setBrokerId(editing.broker_id ?? "");
    } else {
      setFullName("");
      setType("PF");
      setStatus("active");
      setEmail("");
      setPhone("");
      setWhatsapp("");
      setCpfCnpj("");
      setBirthDate("");
      setAddress("");
      setComplement("");
      setNeighborhood("");
      setCity("");
      setState("");
      setZipCode("");
      setNotes("");
      setBrokerId("");
    }
  }, [editing, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo de Pessoa</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física (PF)</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica (PJ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="fullName">Nome / Razão Social *</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cpfCnpj">{type === 'PF' ? 'CPF' : 'CNPJ'}</Label>
              <Input id="cpfCnpj" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="birthDate">{type === 'PF' ? 'Data de Nascimento' : 'Data de Fundação'}</Label>
              <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="zipCode">CEP</Label>
              <Input id="zipCode" value={zipCode} onChange={(e) => setZipCode(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Endereço</Label>
              <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="complement">Complemento</Label>
              <Input id="complement" value={complement} onChange={(e) => setComplement(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="state">UF</Label>
                  <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Observações</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {role === "admin" && (
            <div className="grid gap-2">
              <Label htmlFor="brokerId">Corretor Responsável</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um corretor" />
                </SelectTrigger>
                <SelectContent>
                  {brokers?.map((broker) => (
                    <SelectItem key={broker.id} value={broker.id}>
                      {broker.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || !fullName.trim()}
            onClick={() =>
              onSubmit({
                full_name: fullName,
                type,
                status,
                email: email || null,
                phone: phone || null,
                whatsapp: whatsapp || null,
                cpf_cnpj: cpfCnpj || null,
                birth_date: birthDate || null,
                address: address || null,
                complement: complement || null,
                neighborhood: neighborhood || null,
                city: city || null,
                state: state || null,
                zip_code: zipCode || null,
                notes: notes || null,
                broker_id: brokerId || null,
              })
            }
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
