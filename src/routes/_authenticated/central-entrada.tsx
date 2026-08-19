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
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Save, RefreshCw, Eye } from "lucide-react";
import { processDocumentWithIA } from "@/lib/ai-extraction.functions";
import { logAudit } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/central-entrada")({
  component: CentralEntradaPage,
});

function CentralEntradaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<any>("policy");
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<'idle' | 'uploading' | 'uploaded' | 'processing' | 'processed'>('idle');
  const [lastSavedDoc, setLastSavedDoc] = useState<{ id: string; path: string } | null>(null);
  
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

  // Step 1 & 2: Upload only
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");
      setCurrentStep('uploading');

      const fileExt = file.name.split(".").pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("policy_documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      
      const { data: { user } } = await supabase.auth.getUser();

      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          name: file.name,
          file_path: filePath,
          file_type: file.type,
          size: file.size,
          uploaded_by: user?.id,
        })
        .select()
        .single();

      if (docError) throw docError;
      
      // Step 3: Record processing status
      await supabase.from('document_processing').insert({
        document_id: doc.id,
        type: docType,
        status: 'pending'
      });

      return { id: doc.id, path: filePath };
    },
    onSuccess: (data) => {
      setLastSavedDoc(data);
      setCurrentStep('uploaded');
      toast.success("Arquivo salvo com sucesso no servidor!");
    },
    onError: (error: any) => {
      setCurrentStep('idle');
      toast.error("Erro no upload: " + error.message);
    }
  });

  // Step 4 & 5: IA Processing
  const processMutation = useMutation({
    mutationFn: async () => {
      if (!file || !lastSavedDoc) throw new Error("Arquivo não disponível para processamento");
      setCurrentStep('processing');
      
      // Update status to processing
      await supabase.from('document_processing')
        .update({ status: 'processing' })
        .eq('document_id', lastSavedDoc.id);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64.split(',')[1];
      if (!imageBase64) throw new Error("Falha ao preparar dados para IA");

      try {
        const result = await processDocumentWithIA({
          data: {
            image: imageBase64,
            mimeType: file.type || 'application/octet-stream',
            documentType: docType
          }
        });

        // Step 6: Update database with extracted results
        await supabase.from('document_processing')
          .update({ 
            status: 'completed',
            extracted_data: result,
            processed_at: new Date().toISOString()
          })
          .eq('document_id', lastSavedDoc.id);

        return result;
      } catch (err: any) {
        // Handle IA failure specifically but keep the document
        await supabase.from('document_processing')
          .update({ 
            status: 'failed',
            error_message: err.message
          })
          .eq('document_id', lastSavedDoc.id);
        throw err;
      }
    },
    onSuccess: (data) => {
      setExtractedData(data);
      setCurrentStep('processed');
      toast.success("Documento analisado com IA!");
    },
    onError: (error: any) => {
      setCurrentStep('uploaded');
      toast.error("Erro na IA: " + error.message + ". O documento continua salvo.");
    }
  });

  const finalSaveMutation = useMutation({
    mutationFn: async () => {
      if (!extractedData || !lastSavedDoc) return;

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

        // Link policy to document
        const { data: policyData } = await supabase.from('policies').select('id').eq('policy_number', extractedData.policy_number).single();
        if (policyData) {
          await supabase.from('documents').update({ policy_id: policyData.id }).eq('id', lastSavedDoc.id);
        }
      }

      await logAudit('CREATE', 'IA_IMPORT', lastSavedDoc.id);
    },
    onSuccess: () => {
      toast.success("Dados vinculados com sucesso!");
      queryClient.invalidateQueries();
      navigate({ to: "/" });
    },
    onError: (error: any) => {
      toast.error("Erro ao vincular dados: " + error.message);
    }
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractedData(null);
      setLastSavedDoc(null);
      setCurrentStep('idle');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Central de Entrada</h1>
        <p className="text-muted-foreground">Fluxo de processamento inteligente e seguro</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className={currentStep === 'idle' || currentStep === 'uploading' ? 'ring-2 ring-primary' : ''}>
          <CardHeader>
            <CardTitle>Passo 1: Upload</CardTitle>
            <CardDescription>O arquivo será salvo permanentemente antes da análise.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Documento</Label>
              <Select value={docType} onValueChange={setDocType} disabled={currentStep !== 'idle'}>
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

            <div className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 ${currentStep === 'idle' ? 'bg-muted/30' : 'bg-green-50/20 border-green-200'}`}>
              {currentStep === 'idle' ? (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground mb-4" />
                  <Input 
                    type="file" 
                    className="max-w-xs" 
                    onChange={handleFileUpload}
                    accept="application/pdf,image/*"
                  />
                  <p className="text-xs text-muted-foreground mt-2">PDF, PNG, JPG (Máx. 5MB)</p>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                  <p className="font-medium">{file?.name}</p>
                  <Button variant="link" size="sm" onClick={() => setCurrentStep('idle')}>Trocar arquivo</Button>
                </div>
              )}
            </div>

            {currentStep === 'idle' && (
              <Button 
                className="w-full" 
                disabled={!file || uploadMutation.isPending}
                onClick={() => uploadMutation.mutate()}
              >
                {uploadMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando no Storage...</> : "Salvar Arquivo no Servidor"}
              </Button>
            )}

            {lastSavedDoc && (
              <div className="flex items-center gap-2 p-3 bg-secondary rounded-md text-sm">
                <FileText className="h-4 w-4" />
                <span className="flex-1 truncate">Salvo: {lastSavedDoc.path}</span>
                <Badge variant="outline">STORAGE OK</Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={currentStep === 'uploaded' || currentStep === 'processing' ? 'ring-2 ring-primary' : currentStep === 'idle' ? 'opacity-50' : ''}>
          <CardHeader>
            <CardTitle>Passo 2: Análise IA</CardTitle>
            <CardDescription>Extração automática de dados do documento salvo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              className="w-full" 
              variant="default"
              disabled={!lastSavedDoc || processMutation.isPending || currentStep === 'processed'}
              onClick={() => processMutation.mutate()}
            >
              {processMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analisando com GPT-4o...</>
              ) : currentStep === 'processed' ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Análise Concluída</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4" /> Iniciar Processamento IA</>
              )}
            </Button>

            {currentStep === 'processed' && extractedData && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-100 rounded-md text-green-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Extração concluída com sucesso!</span>
                </div>
                
                <Label className="text-xs uppercase text-muted-foreground font-semibold">Dados Identificados:</Label>
                <div className="grid grid-cols-2 gap-2 text-sm p-3 bg-muted rounded-md border">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Número</span>
                    {extractedData.policy_number || extractedData.provider_name || '—'}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase">Valor</span>
                    {extractedData.premium ? `R$ ${extractedData.premium}` : extractedData.amount ? `R$ ${extractedData.amount}` : '—'}
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase">Cliente / Provedor</span>
                    {extractedData.client_name || extractedData.provider_name || '—'}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => finalSaveMutation.mutate()}
                    disabled={finalSaveMutation.isPending}
                  >
                    {finalSaveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Confirmar e Vincular
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => setCurrentStep('uploaded')}>Re-processar</Button>
                </div>
              </div>
            )}

            {!extractedData && currentStep === 'uploaded' && (
               <div className="text-center p-6 border rounded-md border-dashed">
                 <RefreshCw className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                 <p className="text-sm text-muted-foreground">Aguardando início da análise...</p>
               </div>
            )}
          </CardContent>
        </Card>
      </div>

      {lastSavedDoc && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" /> Visualização do Documento Original
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center bg-muted/20 border-t">
            <p className="text-sm text-muted-foreground">O arquivo {file?.name} está seguro no Storage.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
