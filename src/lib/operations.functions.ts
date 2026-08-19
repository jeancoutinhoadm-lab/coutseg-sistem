import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { parseSafeDate, getAuditTimestamp } from "./date-utils";

export type OperationType = 'new_sale' | 'renewal' | 'endorsement' | 'cancellation' | 'update';

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
  .inputValidator((data) => createOperationSchema.parse(data))
  .handler(async ({ data }) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error("Unauthorized");

    const { data: operation, error } = await supabase
      .from("operations")
      .insert({
        type: data.type,
        title: data.title,
        description: data.description,
        client_id: data.clientId,
        policy_id: data.policyId,
        previous_policy_id: data.previousPolicyId,
        responsible_id: user.user.id,
        created_by: user.user.id,
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
            task_name: task,
            required: true,
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
  .inputValidator((data) => z.object({ query: z.string() }).parse(data))
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
 * Define o checklist inicial por tipo de operação
 */
function getInitialChecklist(type: OperationType): string[] {
  switch (type) {
    case 'new_sale':
      return [
        "Cliente confirmado",
        "Oportunidade registrada",
        "Cotação apresentada",
        "Apólice emitida",
        "Documento anexado",
        "Comissão configurada"
      ];
    case 'renewal':
      return [
        "Cliente confirmado",
        "Apólice anterior localizada",
        "Nova vigência definida",
        "Prêmio atualizado",
        "Nova apólice emitida",
        "Documento anexado"
      ];
    case 'endorsement':
      return [
        "Apólice original identificada",
        "Motivo do endosso registrado",
        "Alterações conferidas",
        "Documento do endosso anexado"
      ];
    case 'cancellation':
      return [
        "Motivo do cancelamento",
        "Data do distrato",
        "Confirmação da seguradora",
        "Ajuste financeiro (se houver)"
      ];
    default:
      return ["Conferência de dados"];
  }
}
