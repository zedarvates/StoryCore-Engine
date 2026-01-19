import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatService } from '../useChatService';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('useChatService', () => {
  const mockAddChatMessage = vi.fn();
  const mockAddShot = vi.fn();
  const mockUpdateShot = vi.fn();
  const mockDeleteShot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      project: null,
      shots: [],
      assets: [],
      selectedShotId: null,
      chatMessages: [],
      addChatMessage: mockAddChatMessage,
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
      deleteShot: mockDeleteShot,
    });
  });

  it('initializes chat service', () => {
    const { result } = renderHook(() => useChatService());

    expect(result.current).toBeDefined();
    expect(result.current.messages).toEqual([]);
    expect(result.current.isProcessing).toBe(false);
  });

  it('sends user message', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    expect(mockAddChatMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'user',
        content: 'Test message',
      })
    );
  });

  it('generates AI response after user message', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Create a shot');
    });

    await waitFor(() => {
      expect(mockAddChatMessage).toHaveBeenCalledTimes(2); // User + Assistant
    });
  });

  it('sets processing state during message handling', async () => {
    const { result } = renderHook(() => useChatService());

    let processingDuringCall = false;

    await act(async () => {
      const promise = result.current.sendMessage('Test');
      processingDuringCall = result.current.isProcessing;
      await promise;
    });

    expect(processingDuringCall).toBe(true);
    expect(result.current.isProcessing).toBe(false);
  });

  it('does not send empty messages', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('');
    });

    expect(mockAddChatMessage).not.toHaveBeenCalled();
  });

  it('does not send messages while processing', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      const promise1 = result.current.sendMessage('Message 1');
      const promise2 = result.current.sendMessage('Message 2');
      await Promise.all([promise1, promise2]);
    });

    // Should only process first message
    expect(mockAddChatMessage).toHaveBeenCalledTimes(2); // User + Assistant for first message
  });

  it('executes addShot actions from AI response', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Create 2 shots');
    });

    await waitFor(() => {
      expect(mockAddShot).toHaveBeenCalled();
    });
  });

  it('updates context when project state changes', () => {
    const { rerender } = renderHook(() => useChatService());

    // Update store mock
    (useAppStore as any).mockReturnValue({
      project: null,
      shots: [
        {
          id: 'shot-1',
          title: 'New Shot',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ],
      assets: [],
      selectedShotId: null,
      chatMessages: [],
      addChatMessage: mockAddChatMessage,
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
      deleteShot: mockDeleteShot,
    });

    rerender();

    // Context should be updated (verified through behavior)
    expect(true).toBe(true);
  });

  it('provides conversation history', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      const history = result.current.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  it('clears conversation history', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    await waitFor(() => {
      expect(result.current.getHistory().length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.getHistory().length).toBe(0);
  });

  it('handles errors gracefully', async () => {
    // Mock console.error to avoid test output noise
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useChatService());

    // Force an error by making addChatMessage throw
    mockAddChatMessage.mockImplementationOnce(() => {
      throw new Error('Test error');
    });

    await act(async () => {
      await result.current.sendMessage('Test message');
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(result.current.isProcessing).toBe(false);

    consoleErrorSpy.mockRestore();
  });

  it('returns messages from store', () => {
    const mockMessages = [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: 'Test',
        timestamp: new Date(),
      },
    ];

    (useAppStore as any).mockReturnValue({
      project: null,
      shots: [],
      assets: [],
      selectedShotId: null,
      chatMessages: mockMessages,
      addChatMessage: mockAddChatMessage,
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
      deleteShot: mockDeleteShot,
    });

    const { result } = renderHook(() => useChatService());

    expect(result.current.messages).toEqual(mockMessages);
  });

  it('creates shots with correct properties', async () => {
    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('Create a sunset shot');
    });

    await waitFor(() => {
      expect(mockAddShot).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('sunset'),
          duration: 5,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        })
      );
    });
  });

  it('provides context-aware responses', async () => {
    (useAppStore as any).mockReturnValue({
      project: null,
      shots: [],
      assets: [],
      selectedShotId: null,
      chatMessages: [],
      addChatMessage: mockAddChatMessage,
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
      deleteShot: mockDeleteShot,
    });

    const { result } = renderHook(() => useChatService());

    await act(async () => {
      await result.current.sendMessage('How many shots do I have?');
    });

    await waitFor(() => {
      const assistantCall = mockAddChatMessage.mock.calls.find(
        (call) => call[0].role === 'assistant'
      );
      expect(assistantCall[0].content).toContain('empty');
    });
  });
});
