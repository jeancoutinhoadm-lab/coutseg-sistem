import { processDocumentWithIA } from "@/lib/ai-extraction.functions";
import { getFileForIA } from "./pdf-converter";

export interface ExtractedPolicyData {
  policy_number?: string;
  client_name?: string;
  client_cpf_cnpj?: string;
  insurer_name?: string;
  start_date?: string;
  end_date?: string;
  premium?: number;
  installments?: number;
  payment_method?: string;
  type?: string;
  coverage_details?: string;
}

export async function extractPolicyData(file: File): Promise<ExtractedPolicyData> {
  const { base64: imageBase64, mimeType } = await getFileForIA(file);

  const result = await processDocumentWithIA({
    data: {
      image: imageBase64,
      mimeType: mimeType,
      documentType: 'policy'
    }
  });
  
  return result as ExtractedPolicyData;
}

