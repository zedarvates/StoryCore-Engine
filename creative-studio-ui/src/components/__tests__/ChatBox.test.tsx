import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { ChatBox } from '../ChatBox';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('ChatBox', () => {
  const mockAddChatMessage = vi.fn();
  const mockAddShot = vi.fn();
  const mockUpdateShot = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      chatMessages: [],
      addChatMessage: mockAddChatMessage,
      shots: [],
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders chat interface with header', () => {
    render(<ChatBox />);

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Describe what you want to create...')).toBeInTheDocument();
  });

  it('displays welcome message when no messages exist', () => {
    render(<ChatBox />);

    expect(screen.getByText(/Hi! I'm your AI assistant/i)).toBeInTheDocument();
    expect(screen.getByText(/Try asking me to:/i)).toBeInTheDocument();
  });

  it('displays suggestion chips in welcome message', () => {
    render(<ChatBox />);

    expect(screen.getByText(/Create a 3-shot sequence about a sunrise/i)).toBeInTheDocument();
    expect(screen.getByText(/Add a dramatic transition between shots/i)).toBeInTheDocument();
    expect(screen.getByText(/Suggest audio for my action scene/i)).toBeInTheDocument();
  });

  it('allows user to type and send messages', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Create a shot' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockAddChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Create a shot',
        })
      );
    });
  });

  it('sends message on Enter key press', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });

    await waitFor(() => {
      expect(mockAddChatMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Test message',
        })
      );
    });
  });

  it('does not send message on Shift+Enter', () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

    expect(mockAddChatMessage).not.toHaveBeenCalled();
  });

  it('disables send button when input is empty', () => {
    render(<ChatBox />);

    const sendButton = screen.getByRole('button', { name: '' });

    expect(sendButton).toBeDisabled();
  });

  it('displays user messages with correct styling', () => {
    (useAppStore as any).mockReturnValue({
      chatMessages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello AI',
          timestamp: new Date('2024-01-01T12:00:00'),
        },
      ],
      addChatMessage: mockAddChatMessage,
      shots: [],
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
    });

    render(<ChatBox />);

    const message = screen.getByText('Hello AI');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-purple-600');
  });

  it('displays assistant messages with correct styling', () => {
    (useAppStore as any).mockReturnValue({
      chatMessages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Hello user',
          timestamp: new Date('2024-01-01T12:00:00'),
        },
      ],
      addChatMessage: mockAddChatMessage,
      shots: [],
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
    });

    render(<ChatBox />);

    const message = screen.getByText('Hello user');
    expect(message).toBeInTheDocument();
    expect(message.closest('div')).toHaveClass('bg-gray-100');
  });

  it('displays message timestamps', () => {
    const testDate = new Date('2024-01-01T14:30:00');
    (useAppStore as any).mockReturnValue({
      chatMessages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: testDate,
        },
      ],
      addChatMessage: mockAddChatMessage,
      shots: [],
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
    });

    render(<ChatBox />);

    const timeString = testDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    expect(screen.getByText(timeString)).toBeInTheDocument();
  });

  it('displays suggestion chips from assistant messages', () => {
    (useAppStore as any).mockReturnValue({
      chatMessages: [
        {
          id: 'msg-1',
          role: 'assistant',
          content: 'Here are some suggestions',
          timestamp: new Date(),
          suggestions: ['Suggestion 1', 'Suggestion 2'],
        },
      ],
      addChatMessage: mockAddChatMessage,
      shots: [],
      addShot: mockAddShot,
      updateShot: mockUpdateShot,
    });

    render(<ChatBox />);

    expect(screen.getByText('Suggestion 1')).toBeInTheDocument();
    expect(screen.getByText('Suggestion 2')).toBeInTheDocument();
  });

  it('fills input when suggestion is clicked', () => {
    render(<ChatBox />);

    const suggestion = screen.getByText(/Create a 3-shot sequence about a sunrise/i);
    fireEvent.click(suggestion);

    const input = screen.getByPlaceholderText(
      'Describe what you want to create...'
    ) as HTMLTextAreaElement;
    expect(input.value).toBe('Create a 3-shot sequence about a sunrise');
  });

  it('clears input after sending message', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText(
      'Describe what you want to create...'
    ) as HTMLTextAreaElement;
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('shows loading indicator while processing', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Create a shot' } });
    fireEvent.click(sendButton);

    // Loading indicator should appear briefly
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '' })).toBeDisabled();
    });
  });

  it('generates AI response after user message', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Create 3 shots about sunrise' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(mockAddChatMessage).toHaveBeenCalledTimes(2); // User message + AI response
      },
      { timeout: 2000 }
    );
  });

  it('creates shots when AI suggests shot creation', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Create 2 shots about sunset' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        expect(mockAddShot).toHaveBeenCalled();
      },
      { timeout: 2000 }
    );
  });

  it('provides transition suggestions when asked', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Add transitions' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        const calls = mockAddChatMessage.mock.calls;
        const assistantMessage = calls.find((call) => call[0].role === 'assistant');
        expect(assistantMessage).toBeDefined();
        expect(assistantMessage![0].content).toContain('transition');
      },
      { timeout: 2000 }
    );
  });

  it('provides audio suggestions when asked', async () => {
    render(<ChatBox />);

    const input = screen.getByPlaceholderText('Describe what you want to create...');
    const sendButton = screen.getByRole('button', { name: '' });

    fireEvent.change(input, { target: { value: 'Suggest audio for action scene' } });
    fireEvent.click(sendButton);

    await waitFor(
      () => {
        const calls = mockAddChatMessage.mock.calls;
        const assistantMessage = calls.find((call) => call[0].role === 'assistant');
        expect(assistantMessage).toBeDefined();
        expect(assistantMessage![0].content).toContain('audio');
      },
      { timeout: 2000 }
    );
  });
});
