
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askBusinessIA } from './business-ai.functions';

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
    process.env['LOVABLE_API_KEY'] = mockApiKey;
    global.fetch = vi.fn();
  });

  it('deve processar resposta JSON 200 com sucesso', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        choices: [{ message: { content: 'Resposta de teste' } }]
      }),
    });

    const result = await askBusinessIA({ data: { question: 'Teste?' } });
    expect(result.answer).toBe('Resposta de teste');
  });

  it('deve tratar erro HTTP 500 do Gateway', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Internal Server Error',
    });

    await expect(askBusinessIA({ data: { question: 'Teste?' } }))
      .rejects.toThrow("O serviço de Inteligência Artificial está temporariamente indisponível");
  });

  it('deve tratar especificamente erro Cloudflare 1016', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>error code: 1016 Origin DNS Error</html>',
    });

    await expect(askBusinessIA({ data: { question: 'Teste?' } }))
      .rejects.toThrow("O serviço de Inteligência Artificial está temporariamente indisponível");
  });

  it('deve tratar resposta não-JSON (HTML) como erro', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'text/html' }),
      text: async () => '<html>Ops</html>',
    });

    await expect(askBusinessIA({ data: { question: 'Teste?' } }))
      .rejects.toThrow("O serviço de IA retornou um formato inesperado.");
  });

  it('deve tratar timeout da requisição', async () => {
    (global.fetch as any).mockImplementation(() => {
      const error = new Error('The user aborted a request.');
      error.name = 'AbortError';
      return Promise.reject(error);
    });

    await expect(askBusinessIA({ data: { question: 'Teste?' } }))
      .rejects.toThrow("A IA demorou muito para responder");
  });

  it('deve tratar erro de rede genérico', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network connection lost'));

    await expect(askBusinessIA({ data: { question: 'Teste?' } }))
      .rejects.toThrow("Falha na análise da IA.");
  });
});
