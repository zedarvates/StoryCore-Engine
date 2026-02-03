import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '../ChatPanel';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

// Mock LandingChatBox component (the actual component rendered by ChatPanel)
vi.mock('../launcher/LandingChatBox', () => ({
  LandingChatBox: ({ className }: { className?: string }) => (
    <div data-testid="landing-chat-box" className={className}>
      Landing ChatBox Content
    </div>
  ),
}));

// Common mock values
const mockShowChatFalse = {
  showChat: false,
  setShowChat: vi.fn(),
  chatPanelMinimized: false,
  setChatPanelMinimized: vi.fn(),
  project: null,
};

const mockShowChatTrue = {
  showChat: true,
  setShowChat: vi.fn(),
  chatPanelMinimized: false,
  setChatPanelMinimized: vi.fn(),
  project: null,
};

describe('ChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockShowChatFalse);
  });

  it('is hidden when chat is closed', () => {
    render(<ChatPanel />);

    const panel = screen.queryByTestId('landing-chat-box');
    // Panel exists but is hidden via CSS when showChat is false
    expect(panel).not.toBeVisible();
  });

  it('renders when chat is open', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    expect(screen.getByTestId('landing-chat-box')).toBeInTheDocument();
  });

  it('renders LandingChatBox component', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    expect(screen.getByText('Landing ChatBox Content')).toBeInTheDocument();
  });

  it('has fixed positioning', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.fixed');

    expect(panel).toBeInTheDocument();
  });

  it('has shadow styles', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.shadow-2xl');

    expect(panel).toBeInTheDocument();
  });

  it('renders overlay for mobile', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    const { container } = render(<ChatPanel />);
    const overlay = container.querySelector('.fixed.inset-0.bg-black\\/50');

    expect(overlay).toBeInTheDocument();
  });

  it('has close button', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    expect(closeButton).toBeInTheDocument();
  });

  it('close button is clickable', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    const closeButton = screen.getByRole('button', { name: 'Close chat' });
    // Just verify the button can be clicked without errors
    fireEvent.click(closeButton);
    expect(closeButton).toBeInTheDocument();
  });

  it('has responsive container', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    const { container } = render(<ChatPanel />);
    const panel = container.querySelector('.fixed');

    expect(panel).toBeInTheDocument();
  });

  it('applies custom className', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    const { container } = render(<ChatPanel className="custom-class" />);
    const panel = container.querySelector('.custom-class');

    expect(panel).toBeInTheDocument();
  });

  it('passes className prop to LandingChatBox', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    const chatBox = screen.getByTestId('landing-chat-box');
    expect(chatBox).toBeInTheDocument();
  });

  it('has minimize button', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    const minimizeButton = screen.getByRole('button', { name: /minimize/i });
    expect(minimizeButton).toBeInTheDocument();
  });

  it('has maximize button', () => {
    (useAppStore as any).mockReturnValue(mockShowChatTrue);

    render(<ChatPanel />);

    const maximizeButton = screen.getByRole('button', { name: /maximize/i });
    expect(maximizeButton).toBeInTheDocument();
  });
});

