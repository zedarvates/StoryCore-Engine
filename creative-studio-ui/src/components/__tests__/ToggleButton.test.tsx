import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleButton } from '../ToggleButton';
import { useAppStore } from '@/stores/useAppStore';

describe('ToggleButton', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      showChat: false,
    });
  });

  it('should render with correct default position', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('right-6', 'bottom-6');
  });

  it('should render with custom position', () => {
    render(<ToggleButton position="bottom-left" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('left-6', 'bottom-6');
  });

  it('should toggle showChat state on click', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    
    // Initially closed
    expect(useAppStore.getState().showChat).toBe(false);
    
    // Click to open
    fireEvent.click(button);
    expect(useAppStore.getState().showChat).toBe(true);
    
    // Click to close
    fireEvent.click(button);
    expect(useAppStore.getState().showChat).toBe(false);
  });

  it('should show MessageSquare icon when chat is closed', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Show AI Assistant');
  });

  it('should show X icon when chat is open', () => {
    useAppStore.setState({ showChat: true });
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Hide AI Assistant');
  });

  it('should have correct ARIA attributes', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAttribute('title');
  });

  it('should apply ring effect when chat is open', () => {
    useAppStore.setState({ showChat: true });
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('ring-4', 'ring-pink-300');
  });

  it('should be keyboard accessible', () => {
    render(<ToggleButton />);
    const button = screen.getByRole('button');
    
    button.focus();
    expect(button).toHaveFocus();
    
    // Simulate Enter key
    fireEvent.keyDown(button, { key: 'Enter' });
    fireEvent.click(button);
    
    expect(useAppStore.getState().showChat).toBe(true);
  });
});
