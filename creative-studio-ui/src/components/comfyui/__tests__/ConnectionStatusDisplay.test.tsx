/**
 * ConnectionStatusDisplay Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConnectionStatusDisplay } from '../ConnectionStatusDisplay';
import type { ConnectionStatus } from '../ConnectionStatusDisplay';

describe('ConnectionStatusDisplay', () => {
  it('renders with Connected status', () => {
    render(
      <ConnectionStatusDisplay
        status="Connected"
        message="ComfyUI v1.0.0 - 0 items in queue"
      />
    );
    
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('ComfyUI v1.0.0 - 0 items in queue')).toBeInTheDocument();
  });

  it('renders with Connecting status', () => {
    render(
      <ConnectionStatusDisplay
        status="Connecting"
        message="Connecting to ComfyUI Desktop..."
      />
    );
    
    expect(screen.getByText('Connecting')).toBeInTheDocument();
    expect(screen.getByText('Connecting to ComfyUI Desktop...')).toBeInTheDocument();
  });

  it('renders with Disconnected status', () => {
    render(
      <ConnectionStatusDisplay
        status="Disconnected"
        message="Not connected to ComfyUI Desktop"
      />
    );
    
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
    expect(screen.getByText('Not connected to ComfyUI Desktop')).toBeInTheDocument();
  });

  it('renders with Error status', () => {
    render(
      <ConnectionStatusDisplay
        status="Error"
        message="Connection error"
      />
    );
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Connection error')).toBeInTheDocument();
  });

  it('renders details when provided', () => {
    render(
      <ConnectionStatusDisplay
        status="Connected"
        message="Connected"
        details="Connected to http://localhost:8000"
      />
    );
    
    expect(screen.getByText('Connected to http://localhost:8000')).toBeInTheDocument();
  });

  it('calls onAction when action button is clicked', () => {
    const onAction = vi.fn();
    
    render(
      <ConnectionStatusDisplay
        status="Disconnected"
        message="Not connected"
        onAction={onAction}
      />
    );
    
    const button = screen.getByRole('button', { name: /retry/i });
    fireEvent.click(button);
    
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it('calls onClick when status display is clicked', () => {
    const onClick = vi.fn();
    
    render(
      <ConnectionStatusDisplay
        status="Connected"
        message="Connected"
        onClick={onClick}
      />
    );
    
    const display = screen.getByRole('button');
    fireEvent.click(display);
    
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('uses custom action label when provided', () => {
    render(
      <ConnectionStatusDisplay
        status="Connected"
        message="Connected"
        onAction={() => {}}
        actionLabel="Custom Action"
      />
    );
    
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });

  it('shows default action label based on status', () => {
    const { rerender } = render(
      <ConnectionStatusDisplay
        status="Connected"
        message="Connected"
        onAction={() => {}}
      />
    );
    
    expect(screen.getByText('View Details')).toBeInTheDocument();
    
    rerender(
      <ConnectionStatusDisplay
        status="Disconnected"
        message="Disconnected"
        onAction={() => {}}
      />
    );
    
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('applies pulsing animation for Connecting status', () => {
    const { container } = render(
      <ConnectionStatusDisplay
        status="Connecting"
        message="Connecting..."
      />
    );
    
    const dot = container.querySelector('.connection-status-dot');
    expect(dot).toHaveClass('pulsing');
  });

  it('does not apply pulsing animation for other statuses', () => {
    const statuses: ConnectionStatus[] = ['Connected', 'Disconnected', 'Error'];
    
    statuses.forEach((status) => {
      const { container } = render(
        <ConnectionStatusDisplay
          status={status}
          message="Test"
        />
      );
      
      const dot = container.querySelector('.connection-status-dot');
      expect(dot).not.toHaveClass('pulsing');
    });
  });

  it('handles keyboard navigation', () => {
    const onClick = vi.fn();
    
    render(
      <ConnectionStatusDisplay
        status="Connected"
        message="Connected"
        onClick={onClick}
      />
    );
    
    const display = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(display, { key: 'Enter' });
    expect(onClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(display, { key: ' ' });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('stops propagation when action button is clicked', () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    
    render(
      <ConnectionStatusDisplay
        status="Disconnected"
        message="Not connected"
        onAction={onAction}
        onClick={onClick}
      />
    );
    
    // Get the actual button element (not the wrapper div)
    const button = screen.getByText('Retry').closest('button');
    if (button) {
      fireEvent.click(button);
    }
    
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
