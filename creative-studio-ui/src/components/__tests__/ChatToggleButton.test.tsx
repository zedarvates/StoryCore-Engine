import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatToggleButton } from '../ChatToggleButton';
import { useAppStore } from '@/stores/useAppStore';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('ChatToggleButton', () => {
  const mockSetShowChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue({
      showChat: false,
      setShowChat: mockSetShowChat,
      chatMessages: [],
    });
  });

  it('renders floating button', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toBeInTheDocument();
  });

  it('displays message icon when chat is closed', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toBeInTheDocument();
  });

  it('displays close icon when chat is open', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
      chatMessages: [],
    });

    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Close chat' });
    expect(button).toBeInTheDocument();
  });

  it('toggles chat when clicked', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    fireEvent.click(button);

    expect(mockSetShowChat).toHaveBeenCalledWith(true);
  });

  it('closes chat when clicked while open', () => {
    (useAppStore as any).mockReturnValue({
      showChat: true,
      setShowChat: mockSetShowChat,
      chatMessages: [],
    });

    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Close chat' });
    fireEvent.click(button);

    expect(mockSetShowChat).toHaveBeenCalledWith(false);
  });

  it('has fixed positioning', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('fixed');
    expect(button).toHaveClass('bottom-6');
    expect(button).toHaveClass('right-6');
  });

  it('has circular shape', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('rounded-full');
  });

  it('has purple background', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('bg-purple-600');
  });

  it('has hover effects', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('hover:bg-purple-700');
    expect(button).toHaveClass('hover:scale-110');
  });

  it('has shadow', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('shadow-lg');
  });

  it('has high z-index for floating', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('z-50');
  });

  it('applies custom className', () => {
    render(<ChatToggleButton className="custom-class" />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveClass('custom-class');
  });

  it('has accessible label', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveAttribute('aria-label', 'Open chat');
  });

  it('has tooltip title', () => {
    render(<ChatToggleButton />);

    const button = screen.getByRole('button', { name: 'Open chat' });
    expect(button).toHaveAttribute('title', 'Open chat assistant');
  });
});
