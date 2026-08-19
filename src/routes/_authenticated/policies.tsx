import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Loader2, FileText, Upload, Paperclip, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/utils/audit";
import { extractPolicyData } from "@/utils/ai-processor";

export const Route = createFileRoute("/_authenticated/policies")({
  component: PoliciesPage,
  head: () => ({
    meta: [
      { title: "Apólices - Coutseg" },
      { name: "description", content: "Gerencie as apólices de seguro da Coutseg" },
    ],
  }),
});

function PoliciesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Database["public"]["Tables"]["policies"]["Row"] | null>(null);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("*, clients(full_name), insurers(name), brokers(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: Database["public"]["Tables"]["policies"]["Insert"]) => {
      if (editing) {
        const { error } = await supabase.from("policies").update(values).eq("id", editing.id);
        if (error) throw error;
        await logAudit('UPDATE', 'POLICY', editing.id, editing, values);
      } else {
        const { data, error } = await supabase.from("policies").insert(values).select().single();
        if (error) throw error;
        await logAudit('CREATE', 'POLICY', data.id, null, values);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success(editing ? "Apólice atualizada" : "Apólice criada");
    },
    onError: (err) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("policies").delete().eq("id", id);
      if (error) throw error;
      await logAudit('DELETE', 'POLICY', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Apólice removida");
    },
  });

  const filtered = policies?.filter((p) =>
    [p.policy_number, (p as any).clients?.full_name, (p as any).insurers?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Apólices</h1>
          <p className="text-muted-foreground">Gestão de contratos de seguro</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova apólice
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
              placeholder="Buscar por apólice, cliente ou seguradora..."
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
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Seguradora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prêmio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.length ? (
                  filtered.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          {policy.policy_number}
                        </div>
                      </TableCell>
                      <TableCell>{(policy as any).clients?.full_name ?? "—"}</TableCell>
                      <TableCell>{(policy as any).insurers?.name ?? "—"}</TableCell>
                      <TableCell className="capitalize">{policy.type}</TableCell>
                      <TableCell>{formatCurrency(policy.premium)}</TableCell>
                      <TableCell>
                        <Badge variant={policy.status === "active" ? "default" : "secondary"}>
                          {policy.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(policy);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(policy.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma apólice encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PolicyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSubmit={(values) => saveMutation.mutate(values)}
        isPending={saveMutation.isPending}
      />
    </div>
  );
}

function PolicyDialog({
  open,
  onOpenChange,
  editing,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Database["public"]["Tables"]["policies"]["Row"] | null;
  onSubmit: (values: Database["public"]["Tables"]["policies"]["Insert"]) => void;
  isPending: boolean;
}) {
  const [policyNumber, setPolicyNumber] = useState(editing?.policy_number ?? "");
  const [clientId, setClientId] = useState(editing?.client_id ?? "");
  const [insurerId, setInsurerId] = useState(editing?.insurer_id ?? "");
  const [brokerId, setBrokerId] = useState(editing?.broker_id ?? "");
  const [type, setType] = useState<Database["public"]["Enums"]["policy_type"]>(
    editing?.type ?? "auto"
  );
  const [status, setStatus] = useState<Database["public"]["Enums"]["policy_status"]>(
    editing?.status ?? "active"
  );
  const [premium, setPremium] = useState(editing?.premium ?? 0);
  const [commissionAmount, setCommissionAmount] = useState(editing?.commission_amount ?? 0);
  const [startDate, setStartDate] = useState(editing?.start_date ?? "");
  const [endDate, setEndDate] = useState(editing?.end_date ?? "");
  const [renewalDate, setRenewalDate] = useState(editing?.renewal_date ?? "");
  const [coverageAmount, setCoverageAmount] = useState(editing?.coverage_amount ?? 0);
  
  // States for file upload
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Reset form when editing changes
  useEffect(() => {
    if (editing) {
      setPolicyNumber(editing.policy_number);
      setClientId(editing.client_id);
      setInsurerId(editing.insurer_id);
      setBrokerId(editing.broker_id ?? "");
      setType(editing.type);
      setStatus(editing.status ?? "active");
      setPremium(editing.premium);
      setCommissionAmount(editing.commission_amount ?? 0);
      setStartDate(editing.start_date);
      setEndDate(editing.end_date);
      setRenewalDate(editing.renewal_date ?? "");
      setCoverageAmount(editing.coverage_amount ?? 0);
    } else {
      setPolicyNumber("");
      setClientId("");
      setInsurerId("");
      setBrokerId("");
      setType("auto");
      setStatus("active");
      setPremium(0);
      setCommissionAmount(0);
      setStartDate("");
      setEndDate("");
      setRenewalDate("");
      setCoverageAmount(0);
    }
    setSelectedFile(null);
  }, [editing, open]);

  const { data: documents } = useQuery({
    queryKey: ["policy-documents", editing?.id],
    enabled: !!editing?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("policy_id", editing!.id);
      if (error) throw error;
      return data;
    },
  });

  const handleFileUpload = async (policyId: string) => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${policyId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("policy_documents")
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("documents").insert({
        name: selectedFile.name,
        file_path: filePath,
        file_type: selectedFile.type,
        size: selectedFile.size,
        policy_id: policyId,
        client_id: clientId,
      });

      if (dbError) throw dbError;
      
      await logAudit('UPLOAD', 'DOCUMENT', policyId);
      toast.success("Documento enviado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["policy-documents", editing?.id] });
      setSelectedFile(null);
    } catch (error: any) {
      toast.error("Erro no upload", { description: error.message });
    } finally {
      setUploading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    // Limpar campos antes da análise para feedback visual
    setPolicyNumber("");
    setPremium(0);
    setStartDate("");
    setEndDate("");

    try {
      const data = await extractPolicyData(selectedFile);
      
      if (data.policy_number) setPolicyNumber(data.policy_number);
      if (data.premium) setPremium(data.premium);
      if (data.start_date) setStartDate(data.start_date);
      if (data.end_date) setEndDate(data.end_date);
      
      if (data.type) {
        const typeLower = data.type.toLowerCase();
        const validTypes = ["auto", "home", "life", "health", "business", "other"];
        if (validTypes.includes(typeLower)) {
          setType(typeLower as any);
        } else if (products) {
          const matchedProduct = products.find(p => 
            p.name.toLowerCase().includes(typeLower) || 
            typeLower.includes(p.name.toLowerCase())
          );
          if (matchedProduct) setType(matchedProduct.name.toLowerCase() as any);
        }
      }
      
      if (data.client_name && clients) {
        const matchedClient = clients.find(c => 
          c.full_name.toLowerCase().includes(data.client_name!.toLowerCase()) ||
          data.client_name!.toLowerCase().includes(c.full_name.toLowerCase())
        );
        if (matchedClient) setClientId(matchedClient.id);
      }

      if (data.insurer_name && insurers) {
        const matchedInsurer = insurers.find(i => 
          i.name.toLowerCase().includes(data.insurer_name!.toLowerCase()) ||
          data.insurer_name!.toLowerCase().includes(i.name.toLowerCase())
        );
        if (matchedInsurer) setInsurerId(matchedInsurer.id);
      }

      toast.success("Informações extraídas com sucesso! Por favor, confira os dados.");
      await logAudit('CONFIRM_IA', 'POLICY_EXTRACTION', undefined, null, data);
    } catch (error: any) {
      toast.error("Erro na análise por IA", { description: error.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    const values = {
      policy_number: policyNumber,
      client_id: clientId,
      insurer_id: insurerId,
      broker_id: brokerId || null,
      type,
      status,
      premium,
      commission_amount: commissionAmount,
      coverage_amount: coverageAmount,
      start_date: startDate,
      end_date: endDate,
      renewal_date: renewalDate || null,
    };

    if (editing) {
      onSubmit(values);
      if (selectedFile) {
        await handleFileUpload(editing.id);
      }
    } else {
      // For new policy, we need the ID first
      const { data, error } = await supabase.from("policies").insert(values).select().single();
      if (error) {
        toast.error("Erro ao criar apólice", { description: error.message });
        return;
      }
      
      await logAudit('CREATE', 'POLICY', data.id, null, values);
      
      if (selectedFile) {
        await handleFileUpload(data.id);
      }
      
      if (!validateDates()) return;
      
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      onOpenChange(false);
      toast.success("Apólice criada com sucesso");

    }
  };

  const validateDates = () => {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      toast.error("Data de vigência inválida", { description: "A data de fim deve ser posterior à data de início." });
      return false;
    }
    return true;
  };



  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id, full_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: insurers } = useQuery({
    queryKey: ["insurers-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("insurers").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: brokers } = useQuery({
    queryKey: ["brokers-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brokers").select("id, full_name").order("full_name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar apólice" : "Nova apólice"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="policyNumber">Número da apólice *</Label>
              <Input id="policyNumber" value={policyNumber} onChange={(e) => setPolicyNumber(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Tipo / Produto *</Label>
              <Select value={type} onValueChange={(v) => setType(v as any)}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.name.toLowerCase()}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label>Cliente *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Seguradora *</Label>
              <Select value={insurerId} onValueChange={setInsurerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {insurers?.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Corretor</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {brokers?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="premium">Prêmio (R$) *</Label>
              <Input
                id="premium"
                type="number"
                step="0.01"
                value={premium}
                onChange={(e) => setPremium(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commissionAmount">Comissão (R$)</Label>
              <Input
                id="commissionAmount"
                type="number"
                step="0.01"
                value={commissionAmount}
                onChange={(e) => setCommissionAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="coverageAmount">Limite de cobertura (R$)</Label>
              <Input
                id="coverageAmount"
                type="number"
                step="0.01"
                value={coverageAmount}
                onChange={(e) => setCoverageAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Início *</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fim *</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="renewalDate">Renovação</Label>
              <Input id="renewalDate" type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Database["public"]["Enums"]["policy_status"])}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documento da Apólice (PDF/Imagens)
            </Label>
            
            {editing && documents && documents.length > 0 && (
              <div className="mb-2 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-md bg-muted p-2 text-sm">
                    <span className="truncate">{doc.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={async () => {
                        if (confirm("Excluir este documento?")) {
                          await supabase.storage.from("policy_documents").remove([doc.file_path]);
                          await supabase.from("documents").delete().eq("id", doc.id);
                          queryClient.invalidateQueries({ queryKey: ["policy-documents", editing.id] });
                          toast.success("Documento removido");
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Input
                type="file"
                className="cursor-pointer"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,image/*"
              />
              {selectedFile && (
                <div className="flex gap-2">
                  {!editing && (
                    <Button 
                      type="button" 
                      variant="secondary"
                      size="sm" 
                      onClick={handleAIAnalysis}
                      disabled={analyzing || uploading}
                    >
                      {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Analisar com IA
                    </Button>
                  )}
                  {editing && (
                    <Button 
                      type="button" 
                      size="sm" 
                      onClick={() => handleFileUpload(editing.id)}
                      disabled={uploading || analyzing}
                    >
                      {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                      Enviar
                    </Button>
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Tipos permitidos: PDF, JPG, PNG. Tamanho máx: 10MB.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={isPending || uploading || !policyNumber.trim() || !clientId || !insurerId || !startDate || !endDate}
            onClick={handleSave}
          >
            {(isPending || uploading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value?: number) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}
