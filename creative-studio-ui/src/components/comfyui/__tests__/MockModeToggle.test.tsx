/**
 * MockModeToggle Component Tests
 * 
 * Tests for the mock mode toggle component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import MockModeToggle from '../MockModeToggle';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MockModeToggle', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should render with default props', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    expect(screen.getByText('Mock Mode')).toBeInTheDocument();
    expect(screen.getByText('OFF')).toBeInTheDocument();
  });

  it('should render in enabled state', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={true} onChange={handleChange} />
    );
    
    expect(screen.getByText('ON')).toBeInTheDocument();
  });

  it('should call onChange when toggled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should toggle from enabled to disabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={true} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(handleChange).toHaveBeenCalledWith(false);
  });

  it('should persist preference to localStorage', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(localStorage.getItem('comfyui_mock_mode_preference')).toBe('true');
  });

  it('should load preference from localStorage on mount', () => {
    localStorage.setItem('comfyui_mock_mode_preference', 'true');
    
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    // Should call onChange with stored preference
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should handle keyboard navigation with Enter', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: 'Enter' });
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should handle keyboard navigation with Space', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.keyDown(toggle, { key: ' ' });
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('should not toggle when disabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} disabled={true} />
    );
    
    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('should display custom label', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={false} 
        onChange={handleChange} 
        label="Test Mode"
      />
    );
    
    expect(screen.getByText('Test Mode')).toBeInTheDocument();
  });

  it('should show description by default', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={false} 
        onChange={handleChange} 
        backendAvailable={true}
      />
    );
    
    expect(screen.getByText(/Using real ComfyUI backend/)).toBeInTheDocument();
  });

  it('should hide description when showDescription is false', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={false} 
        onChange={handleChange} 
        showDescription={false}
      />
    );
    
    expect(screen.queryByText(/Using real ComfyUI backend/)).not.toBeInTheDocument();
  });

  it('should show enabled description when enabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={true} onChange={handleChange} />
    );
    
    expect(screen.getByText(/Using placeholder images/)).toBeInTheDocument();
  });

  it('should show backend available description when backend is available', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={false} 
        onChange={handleChange} 
        backendAvailable={true}
      />
    );
    
    expect(screen.getByText(/Using real ComfyUI backend/)).toBeInTheDocument();
  });

  it('should show backend unavailable warning when backend is unavailable and disabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={false} 
        onChange={handleChange} 
        backendAvailable={false}
      />
    );
    
    // Use more specific query for the warning element
    expect(screen.getByText(/mock mode will activate automatically/)).toBeInTheDocument();
  });

  it('should not show warning when mock mode is enabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle 
        enabled={true} 
        onChange={handleChange} 
        backendAvailable={false}
      />
    );
    
    expect(screen.queryByText(/Backend unavailable/)).not.toBeInTheDocument();
  });

  it('should have proper ARIA attributes', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
    expect(toggle).toHaveAttribute('aria-label');
  });

  it('should update ARIA checked when enabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={true} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('should have aria-disabled when disabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} disabled={true} />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-disabled', 'true');
  });

  it('should have tabIndex 0 when enabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('tabIndex', '0');
  });

  it('should have tabIndex -1 when disabled', () => {
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} disabled={true} />
    );
    
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('tabIndex', '-1');
  });

  it('should apply disabled CSS class when disabled', () => {
    const handleChange = vi.fn();
    
    const { container } = render(
      <MockModeToggle enabled={false} onChange={handleChange} disabled={true} />
    );
    
    expect(container.querySelector('.mock-mode-toggle.disabled')).toBeInTheDocument();
  });

  it('should apply transitioning CSS class during transition', async () => {
    vi.useFakeTimers();
    const handleChange = vi.fn();
    
    const { container } = render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    
    // Click to start transition
    fireEvent.click(toggle);
    
    // Should have transitioning class immediately
    expect(container.querySelector('.mock-mode-toggle.transitioning')).toBeInTheDocument();
    
    // Fast-forward past the transition time
    act(() => {
      vi.advanceTimersByTime(350);
    });
    
    // Should no longer have transitioning class
    expect(container.querySelector('.mock-mode-toggle.transitioning')).not.toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('should not allow toggle during transition', () => {
    vi.useFakeTimers();
    const handleChange = vi.fn();
    
    render(
      <MockModeToggle enabled={false} onChange={handleChange} />
    );
    
    const toggle = screen.getByRole('switch');
    
    // First click
    fireEvent.click(toggle);
    expect(handleChange).toHaveBeenCalledTimes(1);
    
    // Second click during transition
    fireEvent.click(toggle);
    expect(handleChange).toHaveBeenCalledTimes(1); // Should not increase
    
    vi.useRealTimers();
  });
});
