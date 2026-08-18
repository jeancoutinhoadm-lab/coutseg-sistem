import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Save } from "lucide-react";
import { processDocumentWithIA } from "@/lib/ai-extraction.functions";
import { logAudit } from "@/utils/audit";

export const Route = createFileRoute("/_authenticated/central-entrada")({
  component: CentralEntradaPage,
});

function CentralEntradaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<any>("policy");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: insurers } = useQuery({
    queryKey: ["insurers"],
    queryFn: async () => {
      const { data } = await supabase.from("insurers").select("*");
      return data || [];
    },
  });

  const { data: clients } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase.from("clients").select("*");
      return data || [];
    },
  });

  const { data: brokers } = useQuery({
    queryKey: ["brokers"],
    queryFn: async () => {
      const { data } = await supabase.from("brokers").select("*");
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData || !file) return;

      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("policy_documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          size: file.size,
        })
        .select()
        .single();

      if (docError) throw docError;

      if (docType === 'policy') {
        const insurerName = extractedData.insurer_name?.toLowerCase() || "";
        const clientName = extractedData.client_name?.toLowerCase() || "";
        
        const insurer = insurers?.find(i => i.name.toLowerCase().includes(insurerName));
        const client = clients?.find(c => c.full_name.toLowerCase().includes(clientName));

        const { error: policyError } = await supabase.from("policies").insert({
          policy_number: extractedData.policy_number || "PENDENTE",
          client_id: client?.id || clients?.[0]?.id || "", 
          insurer_id: insurer?.id || insurers?.[0]?.id || "",
          type: 'auto', 
          premium: Number(extractedData.premium) || 0,
          start_date: extractedData.start_date || new Date().toISOString().split('T')[0],
          end_date: extractedData.end_date || new Date().toISOString().split('T')[0],
          status: 'active'
        });
        if (policyError) throw policyError;
      } else if (docType === 'bill') {
        const categoryName = extractedData.category_suggestion || "";
        const { data: categoryData } = await supabase
          .from("expense_categories")
          .select("id")
          .ilike("name", `%${categoryName}%`)
          .maybeSingle();

        await supabase.from("expenses").insert({
          description: extractedData.provider_name || file.name,
          amount: Number(extractedData.amount) || 0,
          date: extractedData.due_date || new Date().toISOString().split('T')[0],
          category_id: categoryData?.id || null,
          status: 'pending',
          document_id: doc.id
        });
      }

      await logAudit('CREATE', 'IA_IMPORT', doc.id);
    },
    onSuccess: () => {
      toast.success("Dados salvos e vinculados com sucesso!");
      queryClient.invalidateQueries();
      navigate({ to: "/" });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar: " + error.message);
    }
  });

  const processMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");
      setIsProcessing(true);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64.split(',')[1];
      if (!imageBase64) throw new Error("Falha ao converter arquivo");

      const result = await processDocumentWithIA({
        data: {
          image: imageBase64,
          mimeType: file.type || 'application/octet-stream',
          documentType: docType
        }
      });
      return result;
    },
    onSuccess: (data) => {
      setExtractedData(data);
      toast.success("Documento analisado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao processar: " + error.message);
    },
    onSettled: () => setIsProcessing(false)
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractedData(null);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Central de Entrada</h1>
        <p className="text-muted-foreground">me mande dados de acesso</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upload de Documento</CardTitle>
            <CardDescription>Arraste ou selecione o arquivo para análise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Apólice / Proposta</SelectItem>
                  <SelectItem value="bill">Boleto / Conta a Pagar</SelectItem>
                  <SelectItem value="commission_report">Extrato de Comissão</SelectItem>
                  <SelectItem value="other">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 bg-muted/30">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <Input 
                type="file" 
                className="max-w-xs" 
                onChange={handleFileUpload}
                accept="application/pdf,image/*"
              />
              <p className="text-xs text-muted-foreground mt-2">PDF, PNG, JPG (Máx. 5MB)</p>
            </div>

            <Button 
              className="w-full" 
              disabled={!file || isProcessing}
              onClick={() => processMutation.mutate()}
            >
              {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...</> : "Analisar com IA"}
            </Button>
          </CardContent>
        </Card>

        {extractedData && (
          <Card className="border-primary/50">
            <CardHeader className="bg-primary/5 rounded-t-lg">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Dados Identificados
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setExtractedData(null)}>Limpar</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <pre className="text-xs bg-muted p-4 rounded-md overflow-auto max-h-[400px]">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
              <div className="mt-6 flex gap-2">
                <Button 
                  className="flex-1" 
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Confirmar e Salvar
                </Button>
                <Button variant="secondary" className="flex-1">Editar Dados</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
