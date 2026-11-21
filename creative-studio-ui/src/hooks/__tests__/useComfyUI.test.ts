import { vi, type MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useComfyUI } from '../useComfyUI';
import type { ComfyUIServer } from '@/types/comfyuiServers';

/**
 * useComfyUI React Hook Tests
 *
 * The hook is now a thin connection and generation facade over the canonical
 * ComfyUIServersService. Server management (CRUD, active-server switching,
 * connection probing, configuration import/export) moved into that service and
 * is covered by src/services/__tests__/comfyuiServersService.test.ts. These
 * tests exercise only the surface the hook still owns: connect, disconnect and
 * generate, together with the error and loading states they drive.
 */

const { getActiveServer } = vi.hoisted(() => ({
  getActiveServer: vi.fn() as MockedFunction<() => ComfyUIServer | null>,
}));

vi.mock('@/services/comfyuiServersService', () => ({
  getComfyUIServersService: vi.fn(() => ({ getActiveServer })),
}));

interface FetchStubResponse {
  ok: boolean;
  statusText: string;
  json: () => Promise<unknown>;
}

function createServer(overrides: Partial<ComfyUIServer> = {}): ComfyUIServer {
  return {
    id: 'server-1',
    name: 'Test Server',
    serverUrl: 'http://localhost:8188',
    authentication: { type: 'none' },
    isActive: true,
    ...overrides,
  };
}

describe('useComfyUI Hook', () => {
  beforeEach(() => {
    getActiveServer.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('initial state', () => {
    it('starts disconnected, idle and without an error', () => {
      const { result } = renderHook(() => useComfyUI());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('connect', () => {
    it('connects from the active server provided by the servers service', async () => {
      const server = createServer();
      getActiveServer.mockReturnValue(server);

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });

      expect(getActiveServer).toHaveBeenCalledTimes(1);
      expect(result.current.isConnected).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('reports an error when no active server is configured', async () => {
      getActiveServer.mockReturnValue(null);

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('No active ComfyUI server configured');
    });

    it('surfaces a servers service failure as a connection error', async () => {
      getActiveServer.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBe('Service initialization failed');
    });
  });

  describe('disconnect', () => {
    it('clears the connected state and any error', async () => {
      getActiveServer.mockReturnValue(createServer());

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });
      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(result.current.isConnected).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('generate', () => {
    it('refuses to generate while disconnected', async () => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.generate('a castle');
      });

      expect(fetchMock).not.toHaveBeenCalled();
      expect(result.current.error).toBe('Not connected to ComfyUI server');
      expect(result.current.isGenerating).toBe(false);
    });

    it('posts the prompt to the active server', async () => {
      const server = createServer();
      getActiveServer.mockReturnValue(server);

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        statusText: 'OK',
        json: () => Promise.resolve({ prompt_id: 'prompt-1' }),
      });
      vi.stubGlobal('fetch', fetchMock);

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });
      await act(async () => {
        await result.current.generate('a castle');
      });

      expect(fetchMock).toHaveBeenCalledWith(
        `${server.serverUrl}/prompt`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ prompt: 'a castle' }),
        }),
      );
      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(false);
    });

    it('keeps the generating flag while a request is in flight', async () => {
      const server = createServer();
      getActiveServer.mockReturnValue(server);

      let resolveFetch!: (value: FetchStubResponse) => void;
      const fetchPromise = new Promise<FetchStubResponse>((resolve) => {
        resolveFetch = resolve;
      });
      vi.stubGlobal('fetch', vi.fn(() => fetchPromise));

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });

      let pending!: Promise<void>;
      act(() => {
        pending = result.current.generate('a castle');
      });
      expect(result.current.isGenerating).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          statusText: 'OK',
          json: () => Promise.resolve({ prompt_id: 'prompt-1' }),
        });
        await pending;
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('reports a network failure', async () => {
      getActiveServer.mockReturnValue(createServer());
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });
      await act(async () => {
        await result.current.generate('a castle');
      });

      expect(result.current.error).toBe('Network down');
      expect(result.current.isGenerating).toBe(false);
    });

    it('reports a non-successful HTTP response', async () => {
      getActiveServer.mockReturnValue(createServer());
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
        json: () => Promise.resolve({}),
      }));

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });
      await act(async () => {
        await result.current.generate('a castle');
      });

      expect(result.current.error).toBe('ComfyUI generation failed: Bad Request');
      expect(result.current.isGenerating).toBe(false);
    });

    it('reports a missing active server after a successful connect', async () => {
      getActiveServer.mockReturnValue(createServer());

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });

      getActiveServer.mockReturnValue(null);

      await act(async () => {
        await result.current.generate('a castle');
      });

      expect(result.current.error).toBe('No active ComfyUI server configured');
    });
  });

  describe('error clearing', () => {
    it('clears a previous error on a successful connect', async () => {
      getActiveServer.mockReturnValue(null);

      const { result } = renderHook(() => useComfyUI());
      await act(async () => {
        await result.current.connect();
      });
      expect(result.current.error).toBe('No active ComfyUI server configured');

      getActiveServer.mockReturnValue(createServer());
      await act(async () => {
        await result.current.connect();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('unmount', () => {
    it('unmounts without errors', () => {
      const { unmount } = renderHook(() => useComfyUI());
      expect(() => unmount()).not.toThrow();
    });
  });
});
