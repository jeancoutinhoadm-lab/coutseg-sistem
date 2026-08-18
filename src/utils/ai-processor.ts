import { analyzeDocument } from "@/lib/ai.functions";

export interface ExtractedPolicyData {
  policy_number?: string;
  client_name?: string;
  insurer_name?: string;
  start_date?: string;
  end_date?: string;
  premium?: number;
  type?: string;
}

export async function extractPolicyData(file: File): Promise<ExtractedPolicyData> {
  // Convert file to base64
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const prompt = `
    Analise esta imagem ou PDF de apólice de seguro e extraia as seguintes informações no formato JSON:
    - policy_number (número da apólice)
    - client_name (nome completo do segurado)
    - insurer_name (nome da seguradora)
    - start_date (data de início da vigência, formato YYYY-MM-DD)
    - end_date (data de término da vigência, formato YYYY-MM-DD)
    - premium (valor do prêmio líquido ou total, apenas números)
    - type (tipo de seguro: auto, life, home, health, business, other)

    Responda APENAS o JSON puro, sem explicações. Se não encontrar um campo, omita-o.
  `;

  try {
    const imageBase64 = base64.split(',')[1];
    if (!imageBase64) throw new Error("Falha ao processar arquivo");

    const input = {
      image: imageBase64,
      mimeType: file.type || 'application/octet-stream',
      prompt 
    };
    
    const data = await analyzeDocument({ data: input });
    
    const resultText = data.text || "";
    const result = JSON.parse(resultText.replace(/```json|```/g, ''));
    return result;
  } catch (err) {
    console.error("Erro na extração via IA:", err);
    throw new Error("Não foi possível processar o documento com IA.");
  }
}


