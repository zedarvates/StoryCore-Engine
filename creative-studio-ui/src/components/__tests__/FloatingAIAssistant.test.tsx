import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FloatingAIAssistant } from '../FloatingAIAssistant';
import { useAppStore } from '@/stores/useAppStore';

// Mock the ChatPanel component
vi.mock('../ChatPanel', () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat Panel</div>,
}));

// Mock the storage utility
vi.mock('@/utils/chatPanelStorage', () => ({
  loadChatPanelState: vi.fn(() => ({
    position: { x: 100, y: 100 },
    size: { width: 384, height: 500 },
    isOpen: false,
    isMinimized: false,
  })),
  updateChatPanelOpenState: vi.fn(),
  DEFAULT_CHAT_PANEL_STATE: {
    position: { x: 100, y: 100 },
    size: { width: 384, height: 500 },
    isOpen: false,
    isMinimized: false,
  },
}));

describe('FloatingAIAssistant', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      showChat: false,
      chatPanelPosition: { x: 100, y: 100 },
      chatPanelSize: { width: 384, height: 500 },
      chatPanelMinimized: false,
    });
  });

  it('should not render when showChat is false', () => {
    render(<FloatingAIAssistant />);
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('should render ChatPanel when showChat is true', () => {
    useAppStore.setState({ showChat: true });
    render(<FloatingAIAssistant />);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('should toggle chat on Ctrl+K', async () => {
    const { rerender } = render(<FloatingAIAssistant />);
    
    // Initially closed
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
    
    // Press Ctrl+K
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    
    await waitFor(() => {
      expect(useAppStore.getState().showChat).toBe(true);
    });
    
    // Rerender to reflect state change
    rerender(<FloatingAIAssistant />);
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
  });

  it('should close chat on Escape when open', async () => {
    useAppStore.setState({ showChat: true });
    const { rerender } = render(<FloatingAIAssistant />);
    
    // Initially open
    expect(screen.getByTestId('chat-panel')).toBeInTheDocument();
    
    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });
    
    await waitFor(() => {
      expect(useAppStore.getState().showChat).toBe(false);
    });
    
    // Rerender to reflect state change
    rerender(<FloatingAIAssistant />);
    expect(screen.queryByTestId('chat-panel')).not.toBeInTheDocument();
  });

  it('should load saved state on mount', () => {
    const setChatPanelPosition = vi.fn();
    const setChatPanelSize = vi.fn();
    const setChatPanelMinimized = vi.fn();
    
    useAppStore.setState({
      setChatPanelPosition,
      setChatPanelSize,
      setChatPanelMinimized,
    });
    
    render(<FloatingAIAssistant />);
    
    expect(setChatPanelPosition).toHaveBeenCalledWith({ x: 100, y: 100 });
    expect(setChatPanelSize).toHaveBeenCalledWith({ width: 384, height: 500 });
    expect(setChatPanelMinimized).toHaveBeenCalledWith(false);
  });
});
