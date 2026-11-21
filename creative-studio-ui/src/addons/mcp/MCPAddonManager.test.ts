import { expect, it, vi } from 'vitest';
import { MCPAddonManager } from './MCPAddonManager';

it('returns a stable React snapshot until a manager state change', () => {
  const manager = new MCPAddonManager();
  const listener = vi.fn();
  const unsubscribe = manager.subscribe(listener);
  const original = manager.getSnapshot();
  expect(manager.getSnapshot()).toBe(original);

  manager.setSelectedServer('test-server');
  const updated = manager.getSnapshot();
  expect(updated).not.toBe(original);
  expect(updated.selectedServer).toBe('test-server');
  expect(manager.getSnapshot()).toBe(updated);
  expect(listener).toHaveBeenCalledWith(updated);
  unsubscribe();
});
