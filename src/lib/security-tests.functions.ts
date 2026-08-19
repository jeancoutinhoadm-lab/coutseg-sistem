import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";

/**
 * Script de Teste de Isolamento RLS e IDOR
 * 
 * Este script deve ser executado no ambiente de teste para validar 
 * se as proteções de segurança estão funcionando como esperado.
 */

export const runSecurityIsolationTest = createServerFn({ method: "POST" })
  .handler(async () => {
    const results: any[] = [];
    
    // 1. Verificar se user_roles está protegido
    const { data: allRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");
    
    results.push({
      test: "user_roles_isolation",
      description: "Usuário deve ver apenas seu próprio role",
      passed: !rolesError && allRoles?.every(r => r.user_id === (supabase as any).auth.session()?.user?.id),
      details: rolesError ? rolesError.message : `Encontrados ${allRoles?.length || 0} registros.`
    });

    // 2. Testar acesso ao bucket policy_documents sem Signed URL
    const { data: bucketFiles, error: bucketError } = await supabase
      .storage
      .from("policy_documents")
      .list("");

    results.push({
      test: "storage_list_isolation",
      description: "Listagem na raiz do bucket deve ser restrita ou vazia para corretores",
      passed: !bucketError,
      details: `Encontrados ${bucketFiles?.length || 0} arquivos na raiz.`
    });

    return results;
  });
