
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processBusinessIA } from './business-ai.functions';

// Mock do supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

describe('askBusinessIA Resilience Tests', () => {
  const mockApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['GEMINI_API_KEY'] = mockApiKey;
    global.fetch = vi.fn();
  });

  it('deve processar resposta JSON 200 com sucesso', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Resposta de teste' }] } }]
      }),
    });

    const result = await processBusinessIA({ question: 'Teste?' });
    expect(result.answer).toBe('Resposta de teste');
  });

  it('deve tratar erro HTTP 500 do Gemini', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Internal Server Error',
    });

    await expect(processBusinessIA({ question: 'Teste?' }))
      .rejects.toThrow("A API Gemini retornou um erro (500)");
  });

  it('deve tratar erro 503 do Gemini', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ 'content-type': 'application/json' }),
      text: async () => JSON.stringify({ error: { status: 'UNAVAILABLE' } }),
    });

    await expect(processBusinessIA({ question: 'Teste?' }))
      .rejects.toThrow("O modelo Gemini está temporariamente indisponível");
  });

  it('deve tratar resposta não-JSON (HTML) como erro', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>Ops</html>',
    });

    await expect(processBusinessIA({ question: 'Teste?' }))
      .rejects.toThrow("A API Gemini retornou uma resposta inválida.");
  });

  it('deve tratar timeout da requisição', async () => {
    (global.fetch as any).mockImplementation(() => {
      const error = new Error('The user aborted a request.');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    await expect(processBusinessIA({ question: 'Teste?' }))
      .rejects.toThrow("A API Gemini excedeu o tempo limite");
  });

  it('deve tratar erro de rede genérico', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network connection lost'));

    await expect(processBusinessIA({ question: 'Teste?' }))
      .rejects.toThrow("Network connection lost");
  });
});
