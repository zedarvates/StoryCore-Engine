import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MCPServerConfig } from '../types';

const server: Omit<MCPServerConfig, 'id'> = {
  name: 'Local test server',
  endpoint: 'http://localhost:3000',
  timeout: 2000,
  maxRetries: 1,
  enabled: true,
  status: 'disconnected',
  capabilities: [],
};

describe('MCP hooks', () => {
  let hooks: typeof import('../hooks');

  beforeEach(async () => {
    vi.resetModules();
    hooks = await import('../hooks');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reports the initial addon and server state', () => {
    const { result } = renderHook(() => hooks.useMCPAddon());

    expect(result.current.addon.id).toBe('mcp-server');
    expect(result.current.addon.enabled).toBe(false);
    expect(result.current.servers).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('enables and disables the addon and publishes loading state', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => hooks.useMCPAddon());

    let enable: Promise<void> | undefined;
    act(() => { enable = result.current.enable(); });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.runAllTimersAsync();
      await enable;
    });
    expect(result.current.addon.enabled).toBe(true);
    expect(result.current.isLoading).toBe(false);

    await act(async () => {
      const disable = result.current.disable();
      await vi.runAllTimersAsync();
      await disable;
    });
    expect(result.current.addon.enabled).toBe(false);
  });

  it('shares config changes between the addon hook and config hook', async () => {
    const { result } = renderHook(() => ({ addon: hooks.useMCPAddon(), settings: hooks.useMCPConfig() }));

    await act(async () => result.current.addon.updateConfig({ timeout: 1200 }));
    expect(result.current.settings.config).toEqual({ timeout: 1200 });

    await act(async () => result.current.settings.updateConfig({ timeout: 2000, retries: 3 }));
    expect(result.current.addon.addon.config).toEqual({ timeout: 2000, retries: 3 });
  });

  it('tracks, selects, updates, tests and removes a server', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const { result } = renderHook(() => ({
      servers: hooks.useMCPServers(),
      tests: hooks.useMCPTest(),
    }));

    await act(async () => {
      const add = result.current.servers.addServer(server);
      await vi.runAllTimersAsync();
      await add;
    });

    expect(result.current.servers.servers).toHaveLength(1);
    const entry = result.current.servers.servers[0];
    expect(entry.name).toBe(server.name);
    expect(entry.status).toBe('connected');
    expect(result.current.tests.testResults).toContainEqual(expect.objectContaining({
      serverId: entry.id,
      success: true,
    }));

    act(() => result.current.servers.setSelectedServer(entry.id));
    expect(result.current.servers.selectedServer).toBe(entry.id);

    await act(async () => result.current.servers.updateServer(entry.id, { name: 'Updated server' }));
    expect(result.current.servers.servers[0].name).toBe('Updated server');

    await act(async () => result.current.servers.removeServer(entry.id));
    expect(result.current.servers.servers).toEqual([]);
    expect(result.current.servers.selectedServer).toBeNull();
  });

  it('reports a failed server test without a live connection', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const { result } = renderHook(() => ({
      servers: hooks.useMCPServers(),
      tests: hooks.useMCPTest(),
    }));

    await act(async () => {
      const add = result.current.servers.addServer(server);
      await vi.runAllTimersAsync();
      await add;
    });

    expect(result.current.servers.servers[0].status).toBe('error');
    expect(result.current.tests.testResults).toContainEqual(expect.objectContaining({
      success: false, error: 'Connection failed',
    }));
    expect(result.current.tests.isLoading).toBe(false);
  });
});
