import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Download, 
  Trash2, 
  Search, 
  Eye, 
  Filter, 
  ExternalLink,
  History,
  AlertCircle,
  FileSearch,
  CheckCircle2,
  Clock,
  XCircle,
  Loader2
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { logAudit } from "@/utils/audit";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/documents")({
  component: DocumentsPage,
  head: () => ({
    meta: [
      { title: "Gestão Documental - Coutseg" },
      { name: "description", content: "Sistema centralizado de gestão de documentos da Coutseg" },
    ],
  }),
});

function DocumentsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ["documents", searchTerm, typeFilter, statusFilter, page],
    queryFn: async () => {
      await logAudit('VIEW', 'DOCUMENTS_LIST');
      
      let query = supabase
        .from("documents")
        .select(`
          *, 
          policy:policies(id, policy_number, type, insurer:insurers(name)), 
          client:clients(id, full_name, cpf_cnpj),
          insurer:insurers(id, name),
          processing:document_processing(status, ai_model, attempts, validation_status)
        `, { count: 'exact' })
        .is('deleted_at', null);

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,file_hash.eq.${searchTerm}`);
      }

      if (typeFilter !== "all") {
        query = query.eq('file_type', typeFilter);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data, count };
    },
  });

  const softDeleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
      await logAudit('DELETE', 'DOCUMENT_SOFT', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Documento movido para lixeira");
      setIsDetailsOpen(false);
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir", { description: error.message });
    },
  });

  const getSignedUrl = async (filePath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from("policy_documents")
        .createSignedUrl(filePath, 60); // 1 minute expiry

      if (error) throw error;
      await logAudit('VIEW', 'DOCUMENT_SIGNED_URL', filePath);
      return data.signedUrl;
    } catch (error: any) {
      toast.error("Erro ao gerar acesso", { description: error.message });
      return null;
    }
  };

  const handleView = async (doc: any) => {
    const url = await getSignedUrl(doc.file_path);
    if (url) {
      window.open(url, '_blank');
    }
  };

  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Processado</Badge>;
      case 'processing': return <Badge className="bg-blue-500 animate-pulse"><Clock className="w-3 h-3 mr-1" /> Analisando</Badge>;
      case 'needs_review': return <Badge className="bg-amber-500"><AlertCircle className="w-3 h-3 mr-1" /> Revisão</Badge>;
      case 'failed': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Falhou</Badge>;
      default: return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Gestão Documental</h1>
          <p className="text-muted-foreground text-sm uppercase font-semibold">Repositório Interno Seguro - CoutSeg</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/central-entrada">
              <History className="w-4 h-4 mr-2" /> Central de Entrada
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou hash SHA-256..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="application/pdf">PDF</SelectItem>
                  <SelectItem value="image/png">PNG</SelectItem>
                  <SelectItem value="image/jpeg">JPEG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[300px]">Documento</TableHead>
                  <TableHead>Cliente / Apólice</TableHead>
                  <TableHead>Upload em</TableHead>
                  <TableHead>Status IA</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-50" />
                      <p className="text-xs mt-2 text-muted-foreground">Localizando arquivos...</p>
                    </TableCell>
                  </TableRow>
                ) : documentsData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum documento encontrado para os filtros aplicados.
                    </TableCell>
                  </TableRow>
                ) : (
                  documentsData?.data?.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => { setSelectedDoc(doc); setIsDetailsOpen(true); }}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm truncate max-w-[200px]">{doc.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">{doc.file_hash}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-semibold">{doc.client?.full_name || '—'}</span>
                          <span className="text-[10px] text-muted-foreground">{doc.policy?.policy_number ? `Apólice: ${doc.policy.policy_number}` : 'Sem vínculo'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {format(new Date(doc.created_at!), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(doc.processing?.[0]?.status ?? undefined)}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(doc)}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                            if(confirm("Deseja mover para a lixeira?")) softDeleteMutation.mutate(doc.id);
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {documentsData?.count && documentsData.count > pageSize && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-xs text-muted-foreground">Mostrando {(page-1)*pageSize + 1} a {Math.min(page*pageSize, documentsData.count)} de {documentsData.count} documentos</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={page * pageSize >= documentsData.count}>Próximo</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Detalhes do Documento
            </DialogTitle>
            <DialogDescription className="font-mono text-[10px]">
              ID: {selectedDoc?.id}
            </DialogDescription>
          </DialogHeader>
          
          {selectedDoc && (
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Arquivo</h4>
                  <p className="text-sm font-medium">{selectedDoc.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(selectedDoc.size || 0)} • {selectedDoc.mime_type || selectedDoc.file_type}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Associação</h4>
                  <div className="p-3 bg-muted/50 rounded-md space-y-2">
                    <p className="text-xs"><span className="text-muted-foreground">Cliente:</span> {selectedDoc.client?.full_name || 'Não associado'}</p>
                    <p className="text-xs"><span className="text-muted-foreground">Apólice:</span> {selectedDoc.policy?.policy_number || 'Não associado'}</p>
                    {selectedDoc.policy?.insurer?.name && (
                       <p className="text-xs"><span className="text-muted-foreground">Seguradora:</span> {selectedDoc.policy.insurer.name}</p>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">SHA-256 Integrity</h4>
                  <p className="text-[10px] font-mono break-all p-2 bg-slate-50 border rounded">{selectedDoc.file_hash}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Processamento IA</h4>
                  <div className="p-3 border rounded-md space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedDoc.processing?.[0]?.status ?? undefined)}
                    </div>
                    <p className="text-xs"><span className="text-muted-foreground">Modelo:</span> {selectedDoc.processing?.[0]?.ai_model || '—'}</p>
                    <p className="text-xs"><span className="text-muted-foreground">Tentativas:</span> {selectedDoc.processing?.[0]?.attempts || 0}</p>
                    {selectedDoc.processing?.[0]?.validation_status && (
                      <div className="flex justify-between items-center pt-1 border-t">
                         <span className="text-xs text-muted-foreground">Validação:</span>
                         <Badge variant="outline" className="text-[10px]">{selectedDoc.processing[0].validation_status}</Badge>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Rastreabilidade</h4>
                  <div className="text-xs space-y-1">
                    <p><span className="text-muted-foreground">Upload em:</span> {format(new Date(selectedDoc.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                    <p><span className="text-muted-foreground">Storage Path:</span> <span className="text-[9px] font-mono">{selectedDoc.file_path}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => handleView(selectedDoc)}>
              <Download className="w-4 h-4 mr-2" /> Baixar Cópia Original
            </Button>
            <Button variant="default" onClick={() => setIsDetailsOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
