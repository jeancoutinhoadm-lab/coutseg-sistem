import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  user_id: z.string().uuid().optional(), // Responsável
  client_id: z.string().uuid().optional(),
  opportunity_id: z.string().uuid().optional(),
  policy_id: z.string().uuid().optional(),
  lead_id: z.string().uuid().optional(),
  document_id: z.string().uuid().optional(),
  commission_id: z.string().uuid().optional(),
  payable_id: z.string().uuid().optional(),
  origin: z.string().default('manual'),
  origin_id: z.string().optional(), // Para idempotência
});

export const createOperationalTask = createServerFn({ method: "POST" })
  .validator((data: unknown) => taskSchema.parse(data))
  .handler(async ({ data }) => {
    const { origin, origin_id, ...taskData } = data;

    // Idempotência: se origin_id for fornecido, verificar se já existe
    if (origin_id) {
      const { data: existing } = await supabase
        .from("tasks")
        .select("id")
        .eq("origin", origin)
        .eq("origin_id" as any, origin_id)
        .maybeSingle();
      
      if (existing) return { id: existing.id, status: 'already_exists' };
    }

    const { data: user } = await supabase.auth.getUser();

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        ...taskData,
        origin,
        origin_id: origin_id || null,
        creator_id: user.user?.id,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as any)
      .select("id")
      .single();

    if (error) throw error;

    // Notificação se houver responsável diferente do criador
    if (taskData.user_id && taskData.user_id !== user.user?.id) {
      await supabase.from("notifications").insert({
        user_id: taskData.user_id,
        title: "Nova Tarefa Atribuída",
        message: `Você recebeu a tarefa: ${taskData.title}`,
        type: "task_assigned",
        origin_table: "tasks",
        origin_id: task.id
      } as any);
    }

    return { id: task.id, status: 'created' };
  });

export const updateTaskStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }) => 
    z.object({
      id: z.string().uuid(),
      status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { id, status } = data;

    const { data: oldTask } = await supabase.from("tasks").select("status").eq("id", id).single();

    const updateData: any = { 
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'COMPLETED') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  });

export const transferTask = createServerFn({ method: "POST" })
  .validator((data: { id: string, newUserId: string }) => 
    z.object({
      id: z.string().uuid(),
      newUserId: z.string().uuid()
    }).parse(data)
  )
  .handler(async ({ data }) => {
    const { id, newUserId } = data;

    const { data: task, error: fetchError } = await supabase
      .from("tasks")
      .select("user_id, title")
      .eq("id", id)
      .single();

    if (fetchError || !task) throw new Error("Tarefa não encontrada");

    const { error } = await supabase
      .from("tasks")
      .update({ 
        user_id: newUserId,
        updated_at: new Date().toISOString()
      } as any)
      .eq("id", id);

    if (error) throw error;

    // Notificar novo responsável
    await supabase.from("notifications").insert({
      user_id: newUserId,
      title: "Tarefa Transferida",
      message: `A tarefa "${task.title}" foi transferida para você.`,
      type: "task_assigned",
      origin_table: "tasks",
      origin_id: id
    } as any);

    return { success: true };
  });
