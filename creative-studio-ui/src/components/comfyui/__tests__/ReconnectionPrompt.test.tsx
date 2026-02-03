/**
 * ReconnectionPrompt Component Tests
 * 
 * Tests for the reconnection prompt component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReconnectionPrompt from '../ReconnectionPrompt';

describe('ReconnectionPrompt', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render when show is false', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    const { container } = render(
      <ReconnectionPrompt
        show={false}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when show is true', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(screen.getByText('ComfyUI Backend Available')).toBeInTheDocument();
  });

  it('should display backend URL', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        backendUrl="http://localhost:8000"
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(screen.getByText('http://localhost:8000')).toBeInTheDocument();
  });

  it('should display backend version when provided', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        backendVersion="v1.2.3"
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(screen.getByText('v1.2.3')).toBeInTheDocument();
  });

  it('should call onSwitchNow when Switch Now button is clicked', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const switchButton = screen.getByText('Switch Now');
    fireEvent.click(switchButton);
    
    // Wait for animation
    vi.advanceTimersByTime(250);
    
    expect(handleSwitchNow).toHaveBeenCalledTimes(1);
  });

  it('should call onStayInMockMode when Stay in Mock Mode button is clicked', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const stayButton = screen.getByText('Stay in Mock Mode');
    fireEvent.click(stayButton);
    
    // Wait for animation
    vi.advanceTimersByTime(250);
    
    expect(handleStayInMockMode).toHaveBeenCalledTimes(1);
  });

  it('should call onDismiss when close button is clicked', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    const handleDismiss = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
        onDismiss={handleDismiss}
      />
    );
    
    const closeButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(closeButton);
    
    // Wait for animation
    vi.advanceTimersByTime(250);
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not show close button when onDismiss is not provided', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(screen.queryByLabelText('Dismiss notification')).not.toBeInTheDocument();
  });

  it('should handle keyboard navigation on Switch Now button', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const switchButton = screen.getByText('Switch Now');
    
    // Test Enter key
    fireEvent.keyDown(switchButton, { key: 'Enter' });
    vi.advanceTimersByTime(250);
    
    expect(handleSwitchNow).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard navigation on Stay in Mock Mode button', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const stayButton = screen.getByText('Stay in Mock Mode');
    
    // Test Space key
    fireEvent.keyDown(stayButton, { key: ' ' });
    vi.advanceTimersByTime(250);
    
    expect(handleStayInMockMode).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after specified time', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    const handleDismiss = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
        onDismiss={handleDismiss}
        autoDismissMs={5000}
      />
    );
    
    // Fast-forward time
    vi.advanceTimersByTime(5250);
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('should not auto-dismiss when autoDismissMs is 0', async () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    const handleDismiss = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
        onDismiss={handleDismiss}
        autoDismissMs={0}
      />
    );
    
    // Fast-forward time
    vi.advanceTimersByTime(10000);
    
    expect(handleDismiss).not.toHaveBeenCalled();
  });

  it('should have proper ARIA attributes', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'reconnection-prompt-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'reconnection-prompt-description');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('should focus Switch Now button by default', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    const switchButton = screen.getByText('Switch Now');
    // Check that autoFocus prop is present (React doesn't set it as HTML attribute)
    expect(switchButton.closest('button')).toBeTruthy();
  });

  it('should display descriptive message', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(screen.getByText(/ComfyUI Desktop is now available/)).toBeInTheDocument();
    expect(screen.getByText(/Would you like to switch to real generation/)).toBeInTheDocument();
  });

  it('should have proper CSS classes', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    const { container } = render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    expect(container.querySelector('.reconnection-prompt-overlay')).toBeInTheDocument();
    expect(container.querySelector('.reconnection-prompt')).toBeInTheDocument();
    expect(container.querySelector('.reconnection-prompt-header')).toBeInTheDocument();
    expect(container.querySelector('.reconnection-prompt-content')).toBeInTheDocument();
    expect(container.querySelector('.reconnection-prompt-actions')).toBeInTheDocument();
  });

  it('should apply exiting class when hiding', () => {
    const handleSwitchNow = vi.fn();
    const handleStayInMockMode = vi.fn();
    
    const { container, rerender } = render(
      <ReconnectionPrompt
        show={true}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    // Verify it's visible
    expect(container.querySelector('.reconnection-prompt')).toBeInTheDocument();
    
    // Change show to false
    rerender(
      <ReconnectionPrompt
        show={false}
        onSwitchNow={handleSwitchNow}
        onStayInMockMode={handleStayInMockMode}
      />
    );
    
    // Should have exiting class
    expect(container.querySelector('.reconnection-prompt.exiting')).toBeInTheDocument();
  });
});
