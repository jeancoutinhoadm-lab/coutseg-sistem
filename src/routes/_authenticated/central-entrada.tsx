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
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, RefreshCw, Eye, XCircle, Trash2, Check } from "lucide-react";
import { processDocumentWithIA } from "@/lib/ai-extraction.functions";
import { extractCommissionReportWithIA } from "@/lib/commission-extraction.functions";
import { logAudit } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


export const Route = createFileRoute("/_authenticated/central-entrada")({
  component: CentralEntradaPage,
});

function CentralEntradaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<any>("policy");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [validationData, setValidationData] = useState<{ status: string; errors: string[] } | null>(null);
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

  const calculateHash = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Step 1 & 2: Upload only
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo");
      setCurrentStep('uploading');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const fileHash = await calculateHash(file);
      
      // Check for duplicate hash
      const { data: existingDoc } = await supabase
        .from('documents')
        .select('id, name')
        .eq('file_hash', fileHash)
        .single();
        
      if (existingDoc) {
        toast.info(`Este documento já foi enviado anteriormente: ${existingDoc.name}`);
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;
      
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
          uploaded_by: user.id,
          file_hash: fileHash
        })
        .select()
        .single();

      if (docError) {
        await supabase.storage.from("policy_documents").remove([filePath]);
        throw docError;
      }
      
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

  // Step 4 & 5: IA Processing (Refined for Step 8 - Commission Real IA)
  const processMutation = useMutation({
    mutationFn: async () => {
      if (!file || !lastSavedDoc) throw new Error("Arquivo não disponível para processamento");
      setCurrentStep('processing');
      
      const { data: currentProc } = await supabase.from('document_processing')
        .select('*')
        .eq('document_id', lastSavedDoc.id)
        .single();
        
      const attempts = (currentProc as any)?.attempts || 0;

      await supabase.from('document_processing')
        .update({ 
          status: 'processing',
          attempts: attempts + 1
        } as any)
        .eq('document_id', lastSavedDoc.id);

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const imageBase64 = base64.split(',')[1];
      if (!imageBase64) throw new Error("Falha ao preparar dados para IA");

      try {
        let result: any;
        
        if (docType === 'commission_report') {
          // Real extraction for commission reports
          result = await extractCommissionReportWithIA({
            data: {
              image: imageBase64,
              mimeType: file.type || 'application/octet-stream',
              documentId: lastSavedDoc.id
            }
          });
        } else {
          // Legacy/Simulation for other types
          result = await processDocumentWithIA({
            data: {
              image: imageBase64,
              mimeType: file.type || 'application/octet-stream',
              documentType: docType,
              simulationMode: true
            }
          });
        }

        // Validation Logic
        let validationStatus: 'success' | 'failed' | 'unknown' = 'success';
        let validationErrors: string[] = [];
        
        if (docType === 'commission_report') {
          const extractedTotal = result.items.reduce((sum: number, item: any) => sum + (Number(item.paid_commission) || 0), 0);
          const documentTotal = Number(result.document_total) || 0;
          const extractedCount = result.items.length;
          const documentCount = Number(result.document_line_count) || 0;
          
          if (documentCount > 0 && extractedCount !== documentCount) {
            validationStatus = 'failed';
            validationErrors.push(`Divergência na contagem: Documento indica ${documentCount} linhas, mas foram extraídas ${extractedCount}.`);
          }
          
          if (documentTotal > 0 && Math.abs(extractedTotal - documentTotal) > 0.01) {
            validationStatus = 'failed';
            validationErrors.push(`Divergência no total: Documento indica R$ ${documentTotal.toFixed(2)}, mas a soma das linhas é R$ ${extractedTotal.toFixed(2)}.`);
          }

          if (documentCount === 0 && documentTotal === 0) {
            validationStatus = 'unknown';
            validationErrors.push("Não foi possível identificar totais ou contagem no documento para validação automática.");
          }
        }

        await supabase.from('document_processing')
          .update({ 
            status: 'needs_review',
            extracted_data: result,
            ai_model: result.metadata?.ai_model || 'gpt-4o',
            ai_prompt_version: 'v2.2-reliability',
            ai_confidence: result.confidence || {},
            input_tokens: result.metadata?.input_tokens,
            output_tokens: result.metadata?.output_tokens,
            estimated_cost: result.metadata?.estimated_cost,
            execution_duration_ms: result.metadata?.execution_duration_ms,
            processed_at: new Date().toISOString(),
            document_line_count: result.document_line_count,
            extracted_line_count: result.items?.length,
            document_total: result.document_total,
            extracted_total: result.items?.reduce((sum: number, item: any) => sum + (Number(item.paid_commission) || 0), 0),
            validation_status: validationStatus,
            validation_errors: validationErrors
          } as any)
          .eq('document_id', lastSavedDoc.id);

        setValidationData({ status: validationStatus, errors: validationErrors });
        return result;
      } catch (err: any) {
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
      toast.success("Extração IA concluída! Aguardando revisão.");
    },
    onError: (error: any) => {
      setCurrentStep('uploaded');
      toast.error("Erro na IA: " + error.message);
    }
  });


  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!lastSavedDoc || !extractedData) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: proc } = await supabase.from('document_processing')
        .select('id')
        .eq('document_id', lastSavedDoc.id)
        .single();
        
      if (!proc) throw new Error("Processamento não encontrado");

      if (docType === 'commission_report') {
        // Process each approved item
        const items = extractedData.items.filter((i: any) => i.status !== 'rejected');
        
        for (const item of items) {
          const { data, error } = await supabase.rpc('process_commission_item_approval', {
            _document_id: lastSavedDoc.id,
            _item: item,
            _user_id: user.id
          });
          
          if (error) {
            console.error("Erro ao processar item:", error);
            toast.error(`Erro no item ${item.policy_number}: ${error.message}`);
          }
        }
      } else {
        // Legacy approval for other types
        const { error } = await supabase.rpc('approve_document_extraction', {
          _processing_id: proc.id
        });
        if (error) throw error;
      }
      
      // Update overall status to completed
      await supabase.from('document_processing')
        .update({ 
          status: 'completed',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        } as any)
        .eq('document_id', lastSavedDoc.id);

      await logAudit('UPDATE', 'IA_APPROVED', lastSavedDoc.id);
    },
    onSuccess: () => {
      toast.success("Processamento aprovado e finalizado!");
      setCurrentStep('idle');
      setExtractedData(null);
      setFile(null);
      setLastSavedDoc(null);
      queryClient.invalidateQueries();
      navigate({ to: "/" });
    },
    onError: (error: any) => {
      toast.error("Erro ao aprovar: " + error.message);
    }
  });

  const updateItemStatus = (index: number, status: string) => {
    if (!extractedData || !extractedData.items) return;
    const newItems = [...extractedData.items];
    newItems[index] = { ...newItems[index], status };
    setExtractedData({ ...extractedData, items: newItems });
  };

  const updateItemValue = (index: number, field: string, value: any) => {
    if (!extractedData || !extractedData.items) return;
    const newItems = [...extractedData.items];
    newItems[index] = { ...newItems[index], [field]: value, status: 'corrected' };
    
    // Recalculate difference if monetary values change
    if (field === 'paid_commission' || field === 'expected_commission') {
      const paid = field === 'paid_commission' ? Number(value) : Number(newItems[index].paid_commission);
      const expected = field === 'expected_commission' ? Number(value) : Number(newItems[index].expected_commission);
      newItems[index].difference = paid - expected;
    }
    
    setExtractedData({ ...extractedData, items: newItems });
  };


  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!lastSavedDoc) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('document_processing')
        .update({ 
          status: 'rejected',
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString()
        } as any)
        .eq('document_id', lastSavedDoc.id);


        
      await logAudit('UPDATE', 'IA_REJECTED', lastSavedDoc.id);
    },
    onSuccess: () => {
      toast.success("Extração rejeitada.");
      setCurrentStep('uploaded');
      setExtractedData(null);
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

        const { data: policy, error: policyError } = await supabase.from("policies").insert({
          policy_number: extractedData.policy_number || "PENDENTE",
          client_id: client?.id || clients?.[0]?.id || "", 
          insurer_id: insurer?.id || insurers?.[0]?.id || "",
          type: 'auto', 
          premium: Number(extractedData.premium) || 0,
          start_date: extractedData.start_date || new Date().toISOString().split('T')[0],
          end_date: extractedData.end_date || new Date().toISOString().split('T')[0],
          status: 'active'
        }).select().single();
        
        if (policyError) throw policyError;

        if (policy) {
          await supabase.from('documents').update({ policy_id: policy.id }).eq('id', lastSavedDoc.id);
        }
      }

      await logAudit('CREATE', 'IA_IMPORT', lastSavedDoc.id);
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
                <div className={`flex items-start gap-2 p-3 border rounded-md text-sm ${validationData?.status === 'failed' ? 'bg-red-50 border-red-100 text-red-800' : validationData?.status === 'unknown' ? 'bg-amber-50 border-amber-100 text-amber-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
                  {validationData?.status === 'failed' ? <AlertCircle className="h-5 w-5 mt-0.5" /> : validationData?.status === 'unknown' ? <AlertCircle className="h-5 w-5 mt-0.5" /> : <CheckCircle2 className="h-5 w-5 mt-0.5" />}
                  <div className="flex-1">
                    <p className="font-bold">
                      {validationData?.status === 'failed' ? "Divergência Crítica Detectada" : 
                       validationData?.status === 'unknown' ? "Validação Manual Necessária" : 
                       "Integridade Validada"}
                    </p>
                    {validationData?.errors.map((err, i) => (
                      <p key={i} className="text-xs mt-1">• {err}</p>
                    ))}
                    {validationData?.status === 'failed' && (
                      <p className="text-[10px] mt-2 font-semibold uppercase opacity-70">Aprovação bloqueada até correção dos valores.</p>
                    )}
                  </div>
                </div>
                
                {docType === 'commission_report' && extractedData.items ? (
                  <div className="border rounded-md overflow-hidden bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-[10px] uppercase">Apólice / Cliente</TableHead>
                          <TableHead className="text-[10px] uppercase text-right">Previsto</TableHead>
                          <TableHead className="text-[10px] uppercase text-right">Pago</TableHead>
                          <TableHead className="text-[10px] uppercase text-right">Dif.</TableHead>
                          <TableHead className="text-[10px] uppercase text-center w-24">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedData.items.map((item: any, index: number) => (
                          <TableRow key={index} className={item.status === 'rejected' ? 'opacity-40' : ''}>
                            <TableCell className="py-2">
                              <div className="text-xs font-bold">{item.policy_number || 'S/N'}</div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">{item.client_name || '—'}</div>
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Input 
                                type="number" 
                                className="h-7 text-right text-xs p-1" 
                                value={item.expected_commission || 0}
                                onChange={(e) => updateItemValue(index, 'expected_commission', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className="text-right py-2">
                              <Input 
                                type="number" 
                                className="h-7 text-right text-xs p-1" 
                                value={item.paid_commission || 0}
                                onChange={(e) => updateItemValue(index, 'paid_commission', e.target.value)}
                              />
                            </TableCell>
                            <TableCell className={`text-right py-2 text-xs font-mono ${item.difference < 0 ? 'text-red-500' : item.difference > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                              {item.difference?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell className="py-2">
                              <div className="flex justify-center gap-1">
                                {item.status === 'rejected' ? (
                                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateItemStatus(index, 'pending_review')}>
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                ) : (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => updateItemStatus(index, 'confirmed')}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => updateItemStatus(index, 'rejected')}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 font-bold" 
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isPending || validationData?.status === 'failed'}
                  >
                    {approveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    APROVAR E REGISTRAR FINANCEIRO
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="px-3" 
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
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
