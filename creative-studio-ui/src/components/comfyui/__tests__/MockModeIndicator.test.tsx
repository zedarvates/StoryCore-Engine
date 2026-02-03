/**
 * MockModeIndicator Component Tests
 * 
 * Tests for the mock mode indicator component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MockModeIndicator from '../MockModeIndicator';

describe('MockModeIndicator', () => {
  it('should not render when mock mode is not active', () => {
    const { container } = render(
      <MockModeIndicator active={false} />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('should render when mock mode is active', () => {
    render(
      <MockModeIndicator active={true} />
    );
    
    expect(screen.getByText('Mock Mode Active')).toBeInTheDocument();
  });

  it('should display backend unavailable reason by default', () => {
    render(
      <MockModeIndicator active={true} />
    );
    
    expect(screen.getByText('ComfyUI backend unavailable')).toBeInTheDocument();
  });

  it('should display user preference reason', () => {
    render(
      <MockModeIndicator active={true} reason="user_preference" />
    );
    
    expect(screen.getByText('Manually enabled by user')).toBeInTheDocument();
  });

  it('should display configuration reason', () => {
    render(
      <MockModeIndicator active={true} reason="configuration" />
    );
    
    expect(screen.getByText('Configured in settings')).toBeInTheDocument();
  });

  it('should display custom message when provided', () => {
    render(
      <MockModeIndicator 
        active={true} 
        customMessage="Custom test message" 
      />
    );
    
    expect(screen.getByText('Custom test message')).toBeInTheDocument();
  });

  it('should display placeholder description', () => {
    render(
      <MockModeIndicator active={true} />
    );
    
    expect(screen.getByText(/Placeholder images will be generated/)).toBeInTheDocument();
  });

  it('should call onClick when clicked', () => {
    const handleClick = vi.fn();
    
    render(
      <MockModeIndicator active={true} onClick={handleClick} />
    );
    
    const indicator = screen.getByRole('button');
    fireEvent.click(indicator);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard navigation', () => {
    const handleClick = vi.fn();
    
    render(
      <MockModeIndicator active={true} onClick={handleClick} />
    );
    
    const indicator = screen.getByRole('button');
    
    // Test Enter key
    fireEvent.keyDown(indicator, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(1);
    
    // Test Space key
    fireEvent.keyDown(indicator, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should render in compact mode', () => {
    render(
      <MockModeIndicator active={true} compact={true} />
    );
    
    expect(screen.getByText('Mock Mode')).toBeInTheDocument();
    expect(screen.queryByText('Mock Mode Active')).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    render(
      <MockModeIndicator active={true} onClick={() => {}} />
    );
    
    const indicator = screen.getByRole('button');
    expect(indicator).toHaveAttribute('aria-label');
    expect(indicator.getAttribute('aria-label')).toContain('Mock Mode Active');
  });

  it('should have status role when not clickable', () => {
    render(
      <MockModeIndicator active={true} />
    );
    
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
  });

  it('should show click hint when onClick is provided', () => {
    render(
      <MockModeIndicator active={true} onClick={() => {}} />
    );
    
    expect(screen.getByText('Click for more information')).toBeInTheDocument();
  });

  it('should not show click hint when onClick is not provided', () => {
    render(
      <MockModeIndicator active={true} />
    );
    
    expect(screen.queryByText('Click for more information')).not.toBeInTheDocument();
  });

  it('should display correct icon for backend unavailable', () => {
    const { container } = render(
      <MockModeIndicator active={true} reason="backend_unavailable" />
    );
    
    const icon = container.querySelector('.mock-mode-icon');
    expect(icon?.textContent).toBe('⚠');
  });

  it('should display correct icon for user preference', () => {
    const { container } = render(
      <MockModeIndicator active={true} reason="user_preference" />
    );
    
    const icon = container.querySelector('.mock-mode-icon');
    expect(icon?.textContent).toBe('👤');
  });

  it('should display correct icon for configuration', () => {
    const { container } = render(
      <MockModeIndicator active={true} reason="configuration" />
    );
    
    const icon = container.querySelector('.mock-mode-icon');
    expect(icon?.textContent).toBe('⚙');
  });

  it('should have proper CSS classes', () => {
    const { container } = render(
      <MockModeIndicator active={true} />
    );
    
    expect(container.querySelector('.mock-mode-indicator')).toBeInTheDocument();
    expect(container.querySelector('.mock-mode-header')).toBeInTheDocument();
    expect(container.querySelector('.mock-mode-content')).toBeInTheDocument();
  });

  it('should have compact CSS class in compact mode', () => {
    const { container } = render(
      <MockModeIndicator active={true} compact={true} />
    );
    
    expect(container.querySelector('.mock-mode-indicator.compact')).toBeInTheDocument();
  });
});
