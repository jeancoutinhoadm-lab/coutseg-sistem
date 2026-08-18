import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AuditAction = 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'VIEW' 
  | 'UPLOAD' 
  | 'CONFIRM_IA';

export async function logAudit(
  action: AuditAction,
  entity: string,
  recordId?: string,
  oldData?: any,
  newData?: any
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action,
      entity,
      record_id: recordId,
      old_data: oldData,
      new_data: newData
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
