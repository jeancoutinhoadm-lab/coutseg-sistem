import { processDocumentWithIA } from "@/lib/ai-extraction.functions";

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
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const imageBase64 = base64.split(',')[1];
  if (!imageBase64) throw new Error("Falha ao processar arquivo");

  const result = await processDocumentWithIA({
    data: {
      image: imageBase64,
      mimeType: file.type || 'application/octet-stream',
      documentType: 'policy'
    }
  });
  
  return result as ExtractedPolicyData;
}
