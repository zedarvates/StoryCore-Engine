import { LLDAProvider } from '../diffusion-providers/llda-provider';

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('LLDAProvider', () => {
  let provider: LLDAProvider;

  beforeEach(() => {
    provider = new LLDAProvider({ baseUrl: 'http://localhost:8005' });
    jest.clearAllMocks();
  });

  it('should generate text via diffusion server', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ text: 'Generated content', latencyMs: 100 }),
    });

    const result = await provider.generateText('Test prompt');
    expect(result).toBe('Generated content');
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8005/generate', expect.any(Object));
  });

  it('should return availability status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
    
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it('should handle server errors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, statusText: 'Bad Request' });

    await expect(provider.generateText('Test')).rejects.toThrow('Diffusion server error');
  });
});
