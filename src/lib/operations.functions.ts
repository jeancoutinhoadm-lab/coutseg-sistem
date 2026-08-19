import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { parseSafeDate, getAuditTimestamp } from "./date-utils";

export type OperationType = 'new_sale' | 'renewal' | 'endorsement' | 'cancellation' | 'update';
export type OperationStatus = 'draft' | 'in_progress' | 'pending_docs' | 'review' | 'completed' | 'cancelled';

const createOperationSchema = z.object({
  type: z.enum(['new_sale', 'renewal', 'endorsement', 'cancellation', 'update']),
  title: z.string(),
  description: z.string().optional(),
  clientId: z.string().optional(),
  policyId: z.string().optional(),
  previousPolicyId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Cria uma nova operação centralizada
 */
export const createOperation = createServerFn({ method: "POST" })
  .validator((data: unknown) => createOperationSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("Unauthorized");

    const { data: operation, error } = await supabase
      .from("operations")
      .insert({
        type: data.type,
        title: data.title,
        description: data.description ?? null,
        client_id: data.clientId ?? null,
        policy_id: data.policyId ?? null,
        previous_policy_id: data.previousPolicyId ?? null,
        responsible_id: authData.user.id,
        created_by: authData.user.id,
        status: 'draft',
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Criar checklist inicial baseado no tipo
    const initialChecklist = getInitialChecklist(data.type);
    if (initialChecklist.length > 0) {
      const { error: checklistError } = await supabase
        .from("operation_checklists")
        .insert(
          initialChecklist.map(task => ({
            operation_id: operation.id,
            task_name: task.name,
            required: task.required,
            is_completed: false
          }))
        );
      if (checklistError) console.error("Erro ao criar checklist:", checklistError);
    }

    return operation;
  });

/**
 * Busca unificada de clientes para iniciar operação
 */
export const searchOperationTarget = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ query: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: clients, error } = await supabase
      .from("clients")
      .select(`
        *,
        policies (
          id,
          policy_number,
          end_date,
          insurers (name),
          products (name)
        )
      `)
      .or(`full_name.ilike.%${data.query}%,cpf_cnpj.ilike.%${data.query}%,phone.ilike.%${data.query}%`)
      .limit(10);

    if (error) throw new Error(error.message);
    return clients;
  });

/**
 * Cria um novo cliente inline durante a operação
 */
export const createInlineClient = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({
    full_name: z.string().min(1),
    cpf_cnpj: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    address: z.string().optional(),
    broker_id: z.string().optional(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error("Unauthorized");

    // Verificar duplicidade
    if (data.cpf_cnpj) {
      const { data: existing } = await supabase
        .from("clients")
        .select("id, full_name")
        .eq("cpf_cnpj", data.cpf_cnpj)
        .maybeSingle();
      
      if (existing) throw new Error(`CPF/CNPJ já cadastrado para o cliente: ${existing.full_name}`);
    }

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        full_name: data.full_name,
        cpf_cnpj: data.cpf_cnpj || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        broker_id: data.broker_id || null,
        status: 'active'
      } as any)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return client;
  });

/**
 * Atualiza o checklist dinamicamente e valida pendências
 */
export const validateOperationProgress = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ operationId: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { data: operation, error: opError } = await supabase
      .from("operations")
      .select(`
        *,
        operation_checklists (*)
      `)
      .eq("id", data.operationId)
      .single();

    if (opError) throw new Error(opError.message);

    const pendingRequired = operation.operation_checklists?.filter(item => item.required && !item.is_completed) || [];
    const isReady = pendingRequired.length === 0;

    return {
      operation,
      isReady,
      pendingRequired
    };
  });

/**
 * Define o checklist inicial por tipo de operação com obrigatoriedade
 */
function getInitialChecklist(type: OperationType): { name: string; required: boolean }[] {
  switch (type) {
    case 'new_sale':
      return [
        { name: "Cliente confirmado", required: true },
        { name: "Oportunidade registrada", required: true },
        { name: "Cotação apresentada", required: true },
        { name: "Apólice emitida", required: true },
        { name: "Documento anexado", required: true },
        { name: "Comissão configurada", required: true }
      ];
    case 'renewal':
      return [
        { name: "Cliente confirmado", required: true },
        { name: "Apólice anterior localizada", required: true },
        { name: "Nova vigência definida", required: true },
        { name: "Prêmio atualizado", required: true },
        { name: "Nova apólice emitida", required: true },
        { name: "Documento anexado", required: true }
      ];
    case 'endorsement':
      return [
        { name: "Apólice original identificada", required: true },
        { name: "Motivo do endosso registrado", required: true },
        { name: "Alterações conferidas", required: true },
        { name: "Documento do endosso anexado", required: true }
      ];
    case 'cancellation':
      return [
        { name: "Motivo do cancelamento", required: true },
        { name: "Data do distrato", required: true },
        { name: "Confirmação da seguradora", required: true },
        { name: "Ajuste financeiro (se houver)", required: false }
      ];
    default:
      return [{ name: "Conferência de dados", required: true }];
  }
}
