import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { logAudit } from "@/utils/audit";
import { extractPolicyData, type ExtractedPolicyData } from "@/utils/ai-processor";
import { useAuth } from "@/hooks/use-auth";

type PolicyRow = Database["public"]["Tables"]["policies"]["Row"];
type PolicyInsert = Database["public"]["Tables"]["policies"]["Insert"];
type PolicyType = Database["public"]["Enums"]["policy_type"];
type PolicyStatus = Database["public"]["Enums"]["policy_status"];
type PolicyWithRelations = PolicyRow & {
  clients: { full_name: string | null } | null;
  insurers: { name: string | null } | null;
  products: { name: string | null } | null;
};

const VALID_POLICY_TYPES: PolicyType[] = ["auto", "home", "life", "health", "business", "other"];
const MAX_POLICY_DOCUMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_POLICY_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const RENEWABLE_POLICY_STATUSES = new Set<PolicyStatus>([
  "active",
  "pending",
  "issued",
  "upcoming",
  "contact_pending",
  "contacted",
  "quote_in_progress",
  "quote_sent",
  "negotiation",
]);

const nextCalendarDate = (date: string) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + 1);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

const getStatusLabel = (status: PolicyStatus) => {
  const labels: Record<string, string> = {
    lead: "Lead",
    quotation: "Cotação",
    proposal: "Proposta",
    analyzing: "Em Análise",
    issued: "Emitida",
    active: "Vigente",
    renewed: "Renovada",
    expired: "Vencida",
    cancelled: "Cancelada",
    refused: "Recusada",
    pending: "Pendente",
  };

  return labels[status as string] || status;
};

const onlyDigits = (value?: string | null) => (value || "").replace(/\D/g, "");

const normalizeText = (value?: string | null) =>
  (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const mapPolicyType = (raw?: string | null, productName?: string | null): PolicyType => {
  const value = normalizeText(`${raw || ""} ${productName || ""}`);

  if (VALID_POLICY_TYPES.includes((raw || "") as PolicyType)) {
    return raw as PolicyType;
  }

  if (/auto|automovel|veiculo|carro|moto/.test(value)) return "auto";
  if (/residencial|residencia|casa|habitacao|condominio/.test(value)) return "home";
  if (/vida|acidentes pessoais|ap /.test(`${value} `)) return "life";
  if (/saude|saude|medico|odontologico/.test(value)) return "health";
  if (/empresarial|empresa|comercial|pj|responsabilidade civil|equipamento/.test(value)) {
    return "business";
  }

  return "other";
};

const findProductMatch = (
  products: Array<{ id: string; name: string }> | undefined,
  productName?: string | null,
  policyType?: string | null,
) => {
  if (!products?.length) return undefined;

  const wanted = normalizeText(productName);
  if (wanted) {
    const exact = products.find((p) => normalizeText(p.name) === wanted);
    if (exact) return exact;

    const partial = products.find((p) => {
      const current = normalizeText(p.name);
      return current.includes(wanted) || wanted.includes(current);
    });
    if (partial) return partial;
  }

  const mappedType = mapPolicyType(policyType, productName);
  const aliases: Record<PolicyType, string[]> = {
    auto: ["auto", "automovel", "veiculo"],
    home: ["residencial", "residencia", "casa", "condominio"],
    life: ["vida", "acidentes pessoais"],
    health: ["saude", "odontologico"],
    business: ["empresarial", "empresa", "comercial", "responsabilidade civil"],
    other: [],
  };

  return products.find((p) => {
    const current = normalizeText(p.name);
    return aliases[mappedType].some((alias) => current.includes(alias));
  });
};

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
  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const queryClient = useQueryClient();

  const { data: policies, isLoading } = useQuery({
    queryKey: ["policies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policies")
        .select("*, clients(full_name), insurers(name), brokers(full_name), products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PolicyWithRelations[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: PolicyInsert) => {
      if (!editing?.id) {
        throw new Error("Apólice sem ID para atualização.");
      }

      const { error } = await supabase.from("policies").update(values).eq("id", editing.id);
      if (error) throw error;

      await logAudit("UPDATE", "POLICY", editing.id, editing, values);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Apólice atualizada");
    },
    onError: (err: Error) => {
      toast.error("Erro ao salvar", { description: err.message });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ policy, reason }: { policy: PolicyRow; reason: string }) => {
      const cancellationDate = new Date().toISOString().slice(0, 10);
      const { error } = await supabase
        .from("policies")
        .update({
          status: "cancelled",
          cancellation_date: cancellationDate,
          cancellation_reason: reason,
        })
        .eq("id", policy.id);
      if (error) throw error;
      await logAudit("UPDATE", "POLICY", policy.id, policy, {
        status: "cancelled",
        cancellation_date: cancellationDate,
        cancellation_reason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies"] });
      toast.success("Apólice cancelada");
    },
    onError: (error: Error) =>
      toast.error("Não foi possível cancelar a apólice", { description: error.message }),
  });

  const filtered = policies?.filter((p) =>
    [p.policy_number, p.clients?.full_name, p.insurers?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
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
                  <TableHead>Produto</TableHead>
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
                      <TableCell>{policy.clients?.full_name ?? "—"}</TableCell>
                      <TableCell>{policy.insurers?.name ?? "—"}</TableCell>
                      <TableCell>{policy.products?.name ?? policy.type}</TableCell>
                      <TableCell>{formatCurrency(policy.premium)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            policy.status === "active"
                              ? "default"
                              : policy.status === "cancelled"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {getStatusLabel(policy.status as PolicyStatus)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Renovar"
                          onClick={() => {
                            setEditing({
                              ...policy,
                              id: "",
                              policy_number: "",
                              start_date: nextCalendarDate(policy.end_date),
                              end_date: "",
                              issuance_date: null,
                              renewal_date: null,
                              renewed_from_policy_id: policy.id,
                              status: "quotation" as PolicyStatus,
                            } as PolicyRow);
                            setDialogOpen(true);
                          }}
                          disabled={!RENEWABLE_POLICY_STATUSES.has(policy.status as PolicyStatus)}
                        >
                          <Plus className="h-4 w-4 text-blue-500" />
                        </Button>
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
                          title="Cancelar apólice"
                          onClick={() => {
                            const reason = window.prompt("Informe o motivo do cancelamento:");
                            if (!reason?.trim()) return;
                            cancelMutation.mutate({ policy, reason: reason.trim() });
                          }}
                          disabled={policy.status === "cancelled" || cancelMutation.isPending}
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
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) setEditing(null);
        }}
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
  editing: PolicyRow | null;
  onSubmit: (values: PolicyInsert) => void;
  isPending: boolean;
}) {
  const [policyNumber, setPolicyNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [insurerId, setInsurerId] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<PolicyType>("auto");
  const [status, setStatus] = useState<PolicyStatus>("active");
  const [premium, setPremium] = useState(0);
  const [commissionAmount, setCommissionAmount] = useState(0);
  const [coverageAmount, setCoverageAmount] = useState(0);
  const [deductible, setDeductible] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");
  const [issuanceDate, setIssuanceDate] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationDate, setCancellationDate] = useState("");
  const [renewedFromPolicyId, setRenewedFromPolicyId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedPolicyData | null>(null);
  const [createdPolicyId, setCreatedPolicyId] = useState<string | null>(null);
  const [createdPolicyClientId, setCreatedPolicyClientId] = useState<string | null>(null);
  const [pendingUploadPath, setPendingUploadPath] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { role, user } = useAuth();

  const persistedPolicyId = editing?.id || createdPolicyId;
  const isExistingPolicy = Boolean(persistedPolicyId);

  const { data: clients } = useQuery({
    queryKey: ["clients-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, full_name, cpf_cnpj, email, phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: insurers } = useQuery({
    queryKey: ["insurers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("insurers")
        .select("id, name, cnpj")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: brokers } = useQuery({
    queryKey: ["brokers-select"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brokers")
        .select("id, full_name, user_id")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: documents } = useQuery({
    queryKey: ["policy-documents", editing?.id],
    enabled: Boolean(editing?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("policy_id", editing!.id)
        .is("deleted_at", null);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!open) {
      setCreatedPolicyId(null);
      setCreatedPolicyClientId(null);
      setPendingUploadPath(null);
    }

    if (editing) {
      setPolicyNumber(editing.policy_number || "");
      setClientId(editing.client_id || "");
      setInsurerId(editing.insurer_id || "");
      setBrokerId(editing.broker_id || "");
      setProductId(editing.product_id || "");
      setType(editing.type || "auto");
      setStatus(editing.status || "active");
      setPremium(editing.premium || 0);
      setCommissionAmount(editing.commission_amount || 0);
      setCoverageAmount(editing.coverage_amount || 0);
      setDeductible(editing.deductible || 0);
      setStartDate(editing.start_date || "");
      setEndDate(editing.end_date || "");
      setRenewalDate(editing.renewal_date || "");
      setIssuanceDate(editing.issuance_date || "");
      setCancellationReason(editing.cancellation_reason || "");
      setCancellationDate(editing.cancellation_date || "");
      setRenewedFromPolicyId(editing.renewed_from_policy_id || "");
    } else {
      setPolicyNumber("");
      setClientId("");
      setInsurerId("");
      setBrokerId("");
      setProductId("");
      setType("auto");
      setStatus("active");
      setPremium(0);
      setCommissionAmount(0);
      setCoverageAmount(0);
      setDeductible(0);
      setStartDate("");
      setEndDate("");
      setRenewalDate("");
      setIssuanceDate("");
      setCancellationReason("");
      setCancellationDate("");
      setRenewedFromPolicyId("");
    }

    setSelectedFile(null);
    setExtractedData(null);
  }, [editing, open]);

  useEffect(() => {
    if (role !== "corretor" || editing || createdPolicyId || !user || !brokers) return;
    const ownBroker = brokers.find((broker) => broker.user_id === user.id);
    if (ownBroker) setBrokerId(ownBroker.id);
  }, [brokers, createdPolicyId, editing, role, user]);

  const pendingClientLabel = useMemo(() => {
    if (clientId || !extractedData?.client_name) return null;
    return `Novo cliente será cadastrado: ${extractedData.client_name}`;
  }, [clientId, extractedData]);

  const pendingInsurerLabel = useMemo(() => {
    if (insurerId || !extractedData?.insurer_name) return null;
    return `Nova seguradora será cadastrada: ${extractedData.insurer_name}`;
  }, [insurerId, extractedData]);

  const validateDates = () => {
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      toast.error("Data de vigência inválida", {
        description: "A data de fim deve ser posterior à data de início.",
      });
      return false;
    }
    return true;
  };

  const handleSelectedFile = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!ALLOWED_POLICY_DOCUMENT_TYPES.has(file.type)) {
      toast.error("Formato de documento inválido", {
        description: "Envie um arquivo PDF, JPG, PNG ou WebP.",
      });
      return;
    }

    if (file.size > MAX_POLICY_DOCUMENT_BYTES) {
      toast.error("Documento muito grande", {
        description: "O limite para envio é de 10 MB.",
      });
      return;
    }

    setPendingUploadPath(null);
    setSelectedFile(file);
  };

  const handleFileUpload = async (policyId: string, resolvedClientId?: string) => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Sua sessão expirou. Entre novamente para enviar o documento.");

      const fileExt = selectedFile.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = pendingUploadPath || `${user.id}/${policyId}/${fileName}`;
      setPendingUploadPath(filePath);

      const { error: uploadError } = await supabase.storage
        .from("policy_documents")
        .upload(filePath, selectedFile);

      // A prior attempt may already have stored the object before the metadata insert
      // failed. Reusing the same path makes the retry idempotent within this workflow.
      if (uploadError && (uploadError as { statusCode?: string }).statusCode !== "409") {
        throw uploadError;
      }

      const { data: existingDocument, error: existingDocumentError } = await supabase
        .from("documents")
        .select("id")
        .eq("policy_id", policyId)
        .eq("file_path", filePath)
        .maybeSingle();
      if (existingDocumentError) throw existingDocumentError;

      if (existingDocument) {
        setSelectedFile(null);
        return;
      }

      const { data: document, error: dbError } = await supabase
        .from("documents")
        .insert({
          name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          mime_type: selectedFile.type,
          size: selectedFile.size,
          policy_id: policyId,
          client_id: resolvedClientId || clientId,
          uploaded_by: user.id,
          metadata: {
            source: "policy_form",
            ai_extracted: Boolean(extractedData),
          },
        })
        .select("id")
        .single();

      if (dbError) throw dbError;

      if (extractedData) {
        const { error: processingError } = await supabase.from("document_processing").insert({
          document_id: document.id,
          type: "policy",
          status: "completed",
          processed_at: new Date().toISOString(),
          extracted_data: extractedData as unknown as NonNullable<
            Database["public"]["Tables"]["document_processing"]["Insert"]["extracted_data"]
          >,
          ai_model: "gemini",
        });
        if (processingError) {
          toast.warning("Documento salvo, mas o histórico da extração não pôde ser registrado.", {
            description: processingError.message,
          });
        }
      }

      await logAudit("UPLOAD", "DOCUMENT", policyId);
      queryClient.invalidateQueries({ queryKey: ["policy-documents", policyId] });
      toast.success("Documento enviado com sucesso");
      setSelectedFile(null);
      setPendingUploadPath(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha inesperada ao enviar o documento.";
      toast.error("Erro no upload", { description: message });
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!selectedFile) return;

    setAnalyzing(true);
    try {
      const data = await extractPolicyData(selectedFile);
      setExtractedData(data);

      setPolicyNumber(data.policy_number || "");
      setPremium(data.premium || 0);
      setCoverageAmount(data.coverage_amount || 0);
      setDeductible(data.deductible || 0);
      setStartDate(data.start_date || "");
      setEndDate(data.end_date || "");
      setRenewalDate(data.renewal_date || data.end_date || "");
      setIssuanceDate(data.issuance_date || "");

      const mappedType = mapPolicyType(data.policy_type, data.product_name);
      setType(mappedType);

      const matchedProduct = findProductMatch(products, data.product_name, data.policy_type);
      setProductId(matchedProduct?.id || "");

      const clientDocument = onlyDigits(data.client_cpf_cnpj);
      const normalizedClientName = normalizeText(data.client_name);
      const matchedClient = clients?.find((client) => {
        const existingDocument = onlyDigits(client.cpf_cnpj);
        if (clientDocument && existingDocument) return clientDocument === existingDocument;
        return Boolean(
          normalizedClientName && normalizeText(client.full_name) === normalizedClientName,
        );
      });
      setClientId(matchedClient?.id || "");

      const insurerDocument = onlyDigits(data.insurer_cnpj);
      const normalizedInsurerName = normalizeText(data.insurer_name);
      const matchedInsurer = insurers?.find((insurer) => {
        const existingDocument = onlyDigits(insurer.cnpj);
        if (insurerDocument && existingDocument) return insurerDocument === existingDocument;
        return Boolean(
          normalizedInsurerName && normalizeText(insurer.name) === normalizedInsurerName,
        );
      });
      setInsurerId(matchedInsurer?.id || "");

      if (!matchedProduct && data.product_name) {
        toast.warning("Produto não encontrado automaticamente", {
          description: `A IA identificou “${data.product_name}”. Selecione o produto antes de salvar.`,
        });
      } else {
        toast.success("Apólice analisada e preenchida automaticamente.");
      }

      await logAudit("CONFIRM_IA", "POLICY_EXTRACTION", undefined, null, data);
    } catch (error) {
      toast.error("Erro na análise por IA", {
        description: error instanceof Error ? error.message : "Falha inesperada na análise.",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const resolveClientId = async () => {
    if (clientId) return clientId;
    if (!extractedData?.client_name) {
      throw new Error("A IA não identificou o cliente. Selecione um cliente manualmente.");
    }

    const document = onlyDigits(extractedData.client_cpf_cnpj);
    const normalizedName = normalizeText(extractedData.client_name);

    const existing = clients?.find((client) => {
      const existingDocument = onlyDigits(client.cpf_cnpj);
      if (document && existingDocument) return document === existingDocument;
      return normalizeText(client.full_name) === normalizedName;
    });

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("clients")
      .insert({
        full_name: extractedData.client_name.trim(),
        cpf_cnpj: document || null,
        email: extractedData.client_email || null,
        phone: extractedData.client_phone || null,
        whatsapp: extractedData.client_phone || null,
        address: extractedData.client_address || null,
        city: extractedData.client_city || null,
        state: extractedData.client_state || null,
        zip_code: onlyDigits(extractedData.client_zip_code) || null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Erro ao cadastrar cliente: ${error.message}`);

    await logAudit("CREATE", "CLIENT", data.id, null, {
      source: "policy_ai",
      full_name: extractedData.client_name,
      cpf_cnpj: document || null,
    });

    setClientId(data.id);
    queryClient.invalidateQueries({ queryKey: ["clients-select"] });
    return data.id;
  };

  const resolveInsurerId = async () => {
    if (insurerId) return insurerId;
    if (!extractedData?.insurer_name) {
      throw new Error("A IA não identificou a seguradora. Selecione uma seguradora manualmente.");
    }

    const document = onlyDigits(extractedData.insurer_cnpj);
    const normalizedName = normalizeText(extractedData.insurer_name);

    const existing = insurers?.find((insurer) => {
      const existingDocument = onlyDigits(insurer.cnpj);
      if (document && existingDocument) return document === existingDocument;
      return normalizeText(insurer.name) === normalizedName;
    });

    if (existing) return existing.id;

    const { data, error } = await supabase
      .from("insurers")
      .insert({
        name: extractedData.insurer_name.trim(),
        cnpj: document || null,
        active: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Erro ao cadastrar seguradora: ${error.message}`);

    await logAudit("CREATE", "INSURER", data.id, null, {
      source: "policy_ai",
      name: extractedData.insurer_name,
      cnpj: document || null,
    });

    setInsurerId(data.id);
    queryClient.invalidateQueries({ queryKey: ["insurers-select"] });
    return data.id;
  };

  const handleSave = async () => {
    if (!validateDates()) return;

    if (!policyNumber.trim()) {
      toast.error("Informe o número da apólice.");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Informe o início e o fim da vigência.");
      return;
    }
    if (!productId) {
      toast.error("Produto não identificado", {
        description: "Selecione o produto antes de salvar.",
      });
      return;
    }
    if (role === "corretor" && !brokerId) {
      toast.error("Corretor responsável não encontrado", {
        description:
          "Seu usuário precisa estar vinculado a um cadastro de corretor antes de criar uma apólice.",
      });
      return;
    }

    setSaving(true);
    try {
      const resolvedClientId = await resolveClientId();
      const resolvedInsurerId = await resolveInsurerId();

      const values: PolicyInsert = {
        policy_number: policyNumber.trim(),
        client_id: resolvedClientId,
        insurer_id: resolvedInsurerId,
        broker_id: brokerId || null,
        product_id: productId || null,
        type,
        status,
        premium,
        commission_amount: commissionAmount,
        coverage_amount: coverageAmount || null,
        deductible: deductible || null,
        start_date: startDate,
        end_date: endDate,
        renewal_date: renewalDate || endDate || null,
        cancellation_reason: cancellationReason || null,
        cancellation_date: cancellationDate || null,
        issuance_date: issuanceDate || null,
        renewed_from_policy_id: renewedFromPolicyId || null,
      };

      if (isExistingPolicy) {
        if (editing?.id) onSubmit(values);
        if (!editing?.id && renewedFromPolicyId) {
          const { error: renewalError } = await supabase
            .from("policies")
            .update({ status: "renewed" })
            .eq("id", renewedFromPolicyId);
          if (renewalError) throw renewalError;
          await logAudit("UPDATE", "POLICY_RENEWED", renewedFromPolicyId, null, {
            renewed_by_policy_id: persistedPolicyId,
          });
        }
        if (selectedFile) {
          await handleFileUpload(persistedPolicyId!, createdPolicyClientId || resolvedClientId);
        }
        if (!editing?.id) {
          queryClient.invalidateQueries({ queryKey: ["policies"] });
          onOpenChange(false);
          toast.success("Apólice criada com sucesso");
        }
        return;
      }

      const { data: duplicates, error: duplicateError } = await supabase
        .from("policies")
        .select("id, status")
        .eq("client_id", resolvedClientId)
        .eq("insurer_id", resolvedInsurerId)
        .eq("policy_number", policyNumber.trim());
      if (duplicateError) throw duplicateError;

      const activeDuplicate = duplicates?.find((policy) => policy.status !== "cancelled");
      if (activeDuplicate) {
        throw new Error(
          "Já existe uma apólice não cancelada para este cliente, seguradora e número.",
        );
      }
      if (duplicates?.length) {
        const shouldContinue = window.confirm(
          "Existe uma apólice cancelada com esta combinação. Deseja registrar uma nova apólice?",
        );
        if (!shouldContinue) return;
      }

      const { data, error } = await supabase.from("policies").insert(values).select().single();

      if (error) throw error;

      // Persist the ID before any later side effect. A retry after a failure
      // must continue this renewal instead of creating another policy.
      setCreatedPolicyId(data.id);
      setCreatedPolicyClientId(resolvedClientId);

      if (renewedFromPolicyId) {
        const { error: renewalError } = await supabase
          .from("policies")
          .update({ status: "renewed" })
          .eq("id", renewedFromPolicyId);
        if (renewalError) {
          throw new Error(
            `A nova apólice foi criada, mas a anterior não pôde ser marcada como renovada: ${renewalError.message}`,
          );
        }
        await logAudit("UPDATE", "POLICY_RENEWED", renewedFromPolicyId, null, {
          renewed_by_policy_id: data.id,
        });
      }

      await logAudit("CREATE", "POLICY", data.id, null, values);

      // From this point onward the policy is durable. A failed upload must only be retried,
      // never cause a second policy insert.
      if (selectedFile) {
        await handleFileUpload(data.id, resolvedClientId);
      }

      queryClient.invalidateQueries({ queryKey: ["policies"] });
      onOpenChange(false);
      toast.success("Apólice criada com sucesso");
    } catch (error) {
      toast.error("Erro ao salvar apólice", {
        description: error instanceof Error ? error.message : "Falha inesperada ao salvar.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isExistingPolicy ? "Editar apólice" : "Nova apólice"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="policyNumber">Número da apólice *</Label>
              <Input
                id="policyNumber"
                value={policyNumber}
                onChange={(e) => setPolicyNumber(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="productId">Produto *</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger id="productId">
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
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
              {pendingClientLabel && (
                <p className="text-xs text-muted-foreground">{pendingClientLabel}</p>
              )}
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
              {pendingInsurerLabel && (
                <p className="text-xs text-muted-foreground">{pendingInsurerLabel}</p>
              )}
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

          <div className="grid grid-cols-4 gap-4">
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
              <Label htmlFor="coverageAmount">Cobertura (R$)</Label>
              <Input
                id="coverageAmount"
                type="number"
                step="0.01"
                value={coverageAmount}
                onChange={(e) => setCoverageAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="deductible">Franquia (R$)</Label>
              <Input
                id="deductible"
                type="number"
                step="0.01"
                value={deductible}
                onChange={(e) => setDeductible(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Início *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fim *</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (!renewalDate) setRenewalDate(e.target.value);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="renewalDate">Renovação</Label>
              <Input
                id="renewalDate"
                type="date"
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="issuanceDate">Data de Emissão</Label>
              <Input
                id="issuanceDate"
                type="date"
                value={issuanceDate}
                onChange={(e) => setIssuanceDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as PolicyStatus)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="quotation">Cotação</SelectItem>
                  <SelectItem value="proposal">Proposta</SelectItem>
                  <SelectItem value="analyzing">Em Análise</SelectItem>
                  <SelectItem value="issued">Emitida</SelectItem>
                  <SelectItem value="active">Vigente</SelectItem>
                  <SelectItem value="expired">Vencida</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                  <SelectItem value="refused">Recusada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {status === "cancelled" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="cancellationDate">Data de Cancelamento</Label>
                <Input
                  id="cancellationDate"
                  type="date"
                  value={cancellationDate}
                  onChange={(e) => setCancellationDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="cancellationReason">Motivo do Cancelamento</Label>
                <Input
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="grid gap-2 border-t pt-4">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documento da Apólice (PDF/Imagens)
            </Label>

            {editing?.id && documents && documents.length > 0 && (
              <div className="mb-2 space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-md bg-muted p-2 text-sm"
                  >
                    <span className="truncate">{doc.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={async () => {
                        if (
                          !confirm("Arquivar este documento? O arquivo original será preservado.")
                        )
                          return;
                        const { error } = await supabase
                          .from("documents")
                          .update({ deleted_at: new Date().toISOString() })
                          .eq("id", doc.id);
                        if (error) {
                          toast.error("Não foi possível arquivar o documento", {
                            description: error.message,
                          });
                          return;
                        }
                        queryClient.invalidateQueries({
                          queryKey: ["policy-documents", editing!.id],
                        });
                        await logAudit("UPDATE", "DOCUMENT_ARCHIVED", doc.id, null, {
                          policy_id: editing!.id,
                        });
                        toast.success("Documento arquivado");
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
                onChange={(e) => handleSelectedFile(e.target.files?.[0] || null)}
                accept="application/pdf,image/jpeg,image/png,image/webp"
              />

              {selectedFile && (
                <div className="flex gap-2">
                  {!isExistingPolicy && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAIAnalysis}
                      disabled={analyzing || uploading || saving}
                    >
                      {analyzing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                      )}
                      Analisar com IA
                    </Button>
                  )}

                  {isExistingPolicy && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        handleFileUpload(persistedPolicyId!, createdPolicyClientId || clientId)
                      }
                      disabled={uploading || analyzing || saving}
                    >
                      {uploading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Enviar
                    </Button>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Tipos permitidos: PDF, JPG, PNG e WebP. Tamanho máx: 10 MB.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={
              isPending ||
              saving ||
              uploading ||
              analyzing ||
              !policyNumber.trim() ||
              !startDate ||
              !endDate ||
              !productId ||
              (!clientId && !extractedData?.client_name) ||
              (!insurerId && !extractedData?.insurer_name)
            }
            onClick={handleSave}
          >
            {isPending || saving || uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
