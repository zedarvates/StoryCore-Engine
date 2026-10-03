import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('stores without a shipped redaction policy', () => {
  const connect = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    connect.mockReset();
    vi.stubGlobal('__REDUX_DEVTOOLS_EXTENSION__', { connect });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not export addon state to an installed debugger while store actions still work', async () => {
    const { useAddonStore } = await import('../addonStore');
    useAddonStore.setState({ error: 'Private addon diagnostic' });
    const onState = vi.fn();
    const unsubscribe = useAddonStore.subscribe(onState);
    try {
      useAddonStore.getState().clearError();

      expect(useAddonStore.getState().error).toBeNull();
      expect(onState).toHaveBeenCalledOnce();
      expect(connect).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('does not export marketplace state to an installed debugger while local controls still work', async () => {
    const { useNexRealmStore } = await import('../../addons/nexrealm-marketplace/nexrealmStore');
    useNexRealmStore.getState().setView('collection');
    useNexRealmStore.getState().toggleWishlist('private-asset');

    expect(useNexRealmStore.getState().activeView).toBe('collection');
    expect(useNexRealmStore.getState().wishlist).toEqual(['private-asset']);
    expect(connect).not.toHaveBeenCalled();
  });
});
