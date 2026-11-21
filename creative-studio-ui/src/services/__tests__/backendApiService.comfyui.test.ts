import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BackendApiService } from '../backendApiService';
import { getDefaultComfyUIConfig } from '../comfyuiService';

const backendUrl = 'http://test-api.invalid';
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

describe('Backend API ComfyUI requests', () => {
  let api: BackendApiService;
  let fetchRequest: ReturnType<typeof vi.fn<typeof fetch>>;

  beforeEach(() => {
    fetchRequest = vi.fn<typeof fetch>().mockRejectedValue(new Error('Unexpected request'));
    vi.stubGlobal('fetch', fetchRequest);
    api = new BackendApiService({ baseUrl: backendUrl, timeout: 100, retryAttempts: 1, comfyui: undefined });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('stores the selected ComfyUI configuration', () => {
    expect(api.getComfyUIConfig()).toBeUndefined();
    const config = { ...getDefaultComfyUIConfig(), serverUrl: 'http://localhost:8188' };

    api.updateComfyUIConfig(config);

    expect(api.getComfyUIConfig()).toEqual(config);
  });

  it('submits a workflow and its generation parameters to the backend', async () => {
    const parameters = { prompt: 'A landscape', width: 512, height: 512, checkpoint: 'sd15-base' };
    fetchRequest.mockResolvedValueOnce(json({ prompt_id: 'prompt-123' }));

    await expect(api.submitComfyUIWorkflow('workflow-image-1', parameters)).resolves.toEqual({
      success: true,
      data: { prompt_id: 'prompt-123' },
    });
    expect(fetchRequest).toHaveBeenCalledWith(backendUrl + '/api/comfyui/submit', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ workflow: 'workflow-image-1', parameters }),
    }));
  });

  it('preserves the backend rejection message when a workflow cannot be queued', async () => {
    fetchRequest.mockResolvedValueOnce(json({ message: 'Workflow not found' }, 404));

    const result = await api.submitComfyUIWorkflow('unknown');
    expect(result).toMatchObject({ success: false, error: 'Workflow not found' });
  });

  it('reports a network failure without returning a prompt id', async () => {
    fetchRequest.mockRejectedValueOnce(new Error('Network error'));

    const result = await api.submitComfyUIWorkflow('workflow-image-1');
    expect(result).toMatchObject({ success: false, error: 'Network error' });
    expect(result.data).toBeUndefined();
  });

  it('reads execution status including progress and completed outputs', async () => {
    const status = {
      promptId: 'prompt-123',
      status: 'completed',
      progress: 100,
      outputs: [{ type: 'image', filename: 'result.png', url: '/output/result.png' }],
    };
    fetchRequest.mockResolvedValueOnce(json(status));

    await expect(api.getComfyUIStatus('prompt-123')).resolves.toEqual({ success: true, data: status });
    expect(fetchRequest).toHaveBeenCalledWith(backendUrl + '/api/comfyui/status/prompt-123', expect.objectContaining({
      method: 'GET',
    }));
  });

  it('reports a rejected status request', async () => {
    fetchRequest.mockResolvedValueOnce(new Response(null, { status: 404, statusText: 'Not Found' }));
    await expect(api.getComfyUIStatus('missing')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('Not Found'),
    });
  });

  it('reads queue counts from the response envelope', async () => {
    fetchRequest.mockResolvedValueOnce(json({ success: true, data: { pending: 3, running: 1 } }));

    await expect(api.getComfyUIQueue()).resolves.toEqual({ success: true, data: { pending: 3, running: 1 } });
    expect(fetchRequest).toHaveBeenCalledWith(backendUrl + '/api/comfyui/queue', expect.anything());
  });

  it('cancels only the requested prompt', async () => {
    fetchRequest.mockResolvedValueOnce(json({}));

    await expect(api.cancelComfyUIWorkflow('prompt-123')).resolves.toEqual({ success: true });
    expect(fetchRequest).toHaveBeenCalledWith(backendUrl + '/api/comfyui/cancel', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ promptId: 'prompt-123' }),
    }));
  });

  it('surfaces cancellation errors', async () => {
    fetchRequest.mockResolvedValueOnce(new Response(null, { status: 400, statusText: 'Cancel refused' }));

    await expect(api.cancelComfyUIWorkflow('prompt-123')).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining('Cancel refused'),
    });
  });

  it.each(['image', 'video', 'upscale'])('sends a %s task and its configuration to the matching route', async (type) => {
    const input = { prompt: 'A landscape', checkpoint: 'sd15-base', vae: 'vae-ft-mse', loras: ['lora-detail'] };
    fetchRequest.mockResolvedValueOnce(json({ taskId: 'task-1' }));

    await expect(api.executeTaskWithComfyUI(type, input)).resolves.toEqual({ success: true, data: { taskId: 'task-1' } });
    expect(fetchRequest).toHaveBeenCalledWith(backendUrl + '/api/comfyui/execute/' + type, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
    }));
  });
});

describe('Backend API ComfyUI subscriptions', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('notifies immediately, coalesces progress and cancels pending notifications on unsubscribe', () => {
    vi.useFakeTimers();

    const sockets: TestSocket[] = [];
    class TestSocket {
      onmessage?: (event: MessageEvent<string>) => void;
      onclose?: () => void;
      close = vi.fn(() => this.onclose?.());

      constructor() {
        sockets.push(this);
      }

      receive(value: unknown) {
        this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(value) }));
      }
    }
    vi.stubGlobal('WebSocket', TestSocket);
    const api = new BackendApiService({ baseUrl: backendUrl });
    const onUpdate = vi.fn();
    const unsubscribe = api.subscribeToComfyUIUpdates(onUpdate);
    const socket = sockets[0];

    socket.receive({ promptId: 'prompt-123', progress: 10 });
    socket.receive({ promptId: 'prompt-123', progress: 35 });
    socket.receive({ promptId: 'prompt-123', progress: 60 });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenLastCalledWith({ promptId: 'prompt-123', progress: 10 });

    vi.advanceTimersByTime(250);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    expect(onUpdate).toHaveBeenLastCalledWith({ promptId: 'prompt-123', progress: 60 });

    socket.receive({ promptId: 'prompt-123', progress: 80 });
    socket.receive({ promptId: 'prompt-123', progress: 100 });
    unsubscribe();
    vi.advanceTimersByTime(3000);
    expect(onUpdate).toHaveBeenCalledTimes(3);
    expect(onUpdate).toHaveBeenLastCalledWith({ promptId: 'prompt-123', progress: 80 });
    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(sockets).toHaveLength(1);
  });
});
