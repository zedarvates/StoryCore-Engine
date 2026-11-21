import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  localStorage.removeItem('conversations');
  vi.resetModules();
});

describe('restoring a conversation history', () => {
  it('restores serialized dates and retains other valid conversations beside a damaged entry', async () => {
    const timestamp = Date.UTC(2026, 10, 21, 9, 15);
    localStorage.setItem('conversations', JSON.stringify([
      { id: 'damaged', messages: null },
      {
        id: 'saved',
        title: 'Saved conversation',
        createdAt: new Date(timestamp).toISOString(),
        updatedAt: timestamp,
        messages: [{ id: 'message', type: 'user', content: 'Hello', timestamp }],
        metadata: { source: 'studio' },
      },
    ]));

    const { conversationExportService } = await import('./ConversationExportService');
    expect(conversationExportService.getConversations()).toMatchObject([{
      id: 'saved',
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp),
      messages: [{ timestamp: new Date(timestamp), content: 'Hello' }],
      metadata: { source: 'studio' },
    }]);
  });
});
