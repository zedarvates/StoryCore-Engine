import { LegacyAny } from '@/types/legacy';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import n8nService from '../n8nService';

describe('n8nService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    global.fetch = vi.fn();
  });

  it('getStatus should return online if fetch succeeds', async () => {
    (global.fetch as LegacyAny).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'online', message: 'All good' }),
    });

    const status = await n8nService.getStatus();
    expect(status.status).toBe('online');
    expect(status.message).toBe('All good');
  });

  it('getStatus should return offline if fetch fails', async () => {
    (global.fetch as LegacyAny).mockRejectedValue(new Error('Network failure'));

    const status = await n8nService.getStatus();
    expect(status.status).toBe('offline');
    expect(status.message).toBe('Network failure');
  });

  it('listWorkflows should return workflows list', async () => {
    const mockWorkflows = [{ id: '1', name: 'Test Workflow', active: true }];
    (global.fetch as LegacyAny).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ workflows: mockWorkflows }),
    });

    const workflows = await n8nService.listWorkflows();
    expect(workflows).toEqual(mockWorkflows);
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/n8n/workflows'));
  });

  it('triggerWorkflow should post data to correct endpoint', async () => {
    (global.fetch as LegacyAny).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const payload = { test: 'data' };
    await n8nService.triggerWorkflow('webhook-123', payload);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/n8n/trigger/webhook-123'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      })
    );
  });

  it('createWorkflow should post workflow definition', async () => {
    (global.fetch as LegacyAny).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'new-id' }),
    });

    await n8nService.createWorkflow('New Flow', [], {});

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/n8n/workflows'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"name":"New Flow"'),
      })
    );
  });
});
