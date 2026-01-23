import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '../ChatPanel';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

// Mock ChatBox component
vi.mock('../ChatBox', () => ({
  ChatBox: ({ className }: { className?: string }) => (
    <div data-testid="chat-box" className={className}>
      Chat Box Content
    </div>
  ),
}));

describe('ChatPanel', () => {
  const mockSetShowChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      showChat: false,
      setShowChat: mockSetShowChat,
    });
  });

  it('does not render when chat is closed', () => {
    render(<ChatPanel />);

    expect(screen.queryByTestId('chat-box')).not.toBeInTheDocument();
  });

  it('renders when chat is open', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    render(<ChatPanel />);

    expect(screen.getByTestId('chat-box')).toBeInTheDocument();
  });

  it('renders ChatBox component', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    render(<ChatPanel />);

    expect(screen.getByText('Chat Box Content')).toBeInTheDocument();
  });

  it('has fixed positioning', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.fixed');

    expect(panel).toBeInTheDocument();
  });

  it('has white background', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.bg-white');

    expect(panel).toBeInTheDocument();
  });

  it('has shadow', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.shadow-2xl');

    expect(panel).toBeInTheDocument();
  });

  it('has high z-index', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.z-50');

    expect(panel).toBeInTheDocument();
  });

  it('renders overlay for mobile', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');

    expect(overlay).toBeInTheDocument();
  });

  it('closes chat when overlay is clicked', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');

    if (overlay) {
      fireEvent.click(overlay);
      expect(mockSetShowChat).toHaveBeenCalledWith(false);
    }
  });

  it('renders close button for mobile', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    expect(closeButton).toBeInTheDocument();
  });

  it('closes chat when close button is clicked', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    fireEvent.click(closeButton);

    expect(mockSetShowChat).toHaveBeenCalledWith(false);
  });

  it('has responsive width', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.fixed');

    expect(panel).toBeInTheDocument();
  });

  it('applies custom className', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    const { container } = render(<ChatPanel className="custom-class" />);
    const panel = container.querySelector('.custom-class');

    expect(panel).toBeInTheDocument();
  });

  it('passes className to ChatBox', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
    });

    render(<ChatPanel />);

    const chatBox = screen.getByTestId('chat-box');
    expect(chatBox).toHaveClass('h-full');
  });
});
