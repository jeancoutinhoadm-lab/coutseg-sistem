import { processDocumentWithIA } from "@/lib/ai-extraction.functions";
import { getFileForIA } from "./pdf-converter";

export interface ExtractedPolicyData {
  policy_number?: string | null;

  client_name?: string | null;
  client_cpf_cnpj?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  client_city?: string | null;
  client_state?: string | null;
  client_zip_code?: string | null;

  insurer_name?: string | null;
  insurer_cnpj?: string | null;

  product_name?: string | null;
  policy_type?: string | null;

  issuance_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  renewal_date?: string | null;

  premium?: number | null;
  coverage_amount?: number | null;
  deductible?: number | null;

  installments?: number | null;
  payment_method?: string | null;
  coverage_details?: string | null;
}

export async function extractPolicyData(
  file: File,
): Promise<ExtractedPolicyData> {
  const { base64, mimeType } = await getFileForIA(file);

  const result = await processDocumentWithIA({
    data: {
      image: base64,
      mimeType,
      documentType: "policy",
    },
  });

  return result as ExtractedPolicyData;
}