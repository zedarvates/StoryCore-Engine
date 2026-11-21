import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddonManager } from '../AddonManager';

describe('unavailable demo addon', () => {
  let manager: AddonManager;

  beforeEach(async () => {
    localStorage.clear();
    vi.resetModules();
    manager = (await import('../AddonManager')).addonManager;
    manager.registerAddon({
      id: 'demo-addon',
      name: 'Demo Addon',
      description: 'System demonstration add-on',
      version: '1.0.0',
      author: 'Unknown',
      category: 'utility',
      builtin: true,
    });
  });

  it('keeps the descriptor discoverable but never reports successful activation', async () => {
    expect(manager.searchAddons('Demo Addon')).toHaveLength(1);
    await expect(manager.activateAddon('demo-addon')).resolves.toBe(false);

    expect(manager.getAddon('demo-addon')).toMatchObject({
      enabled: false,
      status: 'error',
      errorMessage: expect.stringContaining('implementation is unavailable'),
    });
    expect(manager.getActiveAddons()).toEqual([]);
    expect(localStorage.getItem('storycore_addon_config')).toBeNull();
  });

  it('notifies consumers of the failure and keeps retries unavailable', async () => {
    const statuses: string[] = [];
    const onUpdate = () => statuses.push(manager.getAddon('demo-addon')!.status);
    window.addEventListener('addon-manager-updated', onUpdate);

    try {
      await expect(manager.toggleAddon('demo-addon')).resolves.toBe(false);
      await expect(manager.toggleAddon('demo-addon')).resolves.toBe(false);

      expect(statuses).toEqual(['loading', 'error', 'loading', 'error']);
      expect(manager.getActiveAddons()).toEqual([]);
      expect(manager.exportConfig()['demo-addon']?.enabled).not.toBe(true);
    } finally {
      window.removeEventListener('addon-manager-updated', onUpdate);
    }
  });
});
