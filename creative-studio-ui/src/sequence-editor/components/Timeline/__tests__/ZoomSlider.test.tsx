import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ZoomSlider } from '../ZoomSlider';

describe('ZoomSlider Component', () => {
  const defaultProps = {
    zoomLevel: 10,
    onZoomChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders zoom in and out buttons', () => {
    render(<ZoomSlider {...defaultProps} />);
    
    expect(screen.getByTitle(/Zoom in/i)).toBeTruthy();
    expect(screen.getByTitle(/Zoom out/i)).toBeTruthy();
  });

  it('displays correct zoom percentage', () => {
    render(<ZoomSlider {...defaultProps} />);
    
    // zoomLevel 10 * 10 = 100%
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('calls onZoomChange when zoom in is clicked', () => {
    render(<ZoomSlider {...defaultProps} />);
    
    const zoomInBtn = screen.getByTitle(/Zoom in/i);
    fireEvent.click(zoomInBtn);
    
    // 10 * 1.25 = 12.5
    expect(defaultProps.onZoomChange).toHaveBeenCalledWith(12.5);
  });

  it('calls onZoomChange when zoom out is clicked', () => {
    render(<ZoomSlider {...defaultProps} />);
    
    const zoomOutBtn = screen.getByTitle(/Zoom out/i);
    fireEvent.click(zoomOutBtn);
    
    // 10 / 1.25 = 8
    expect(defaultProps.onZoomChange).toHaveBeenCalledWith(8);
  });

  it('calls onZoomChange when fit to window is clicked', () => {
    render(<ZoomSlider {...defaultProps} />);
    
    const fitBtn = screen.getByTitle(/Fit to window/i);
    fireEvent.click(fitBtn);
    
    // Default fit zoom level is 10
    expect(defaultProps.onZoomChange).toHaveBeenCalledWith(10);
  });

  it('handles slider change correctly', () => {
    const { container } = render(<ZoomSlider {...defaultProps} />);
    
    const slider = container.querySelector('input[type="range"]') as HTMLInputElement;
    expect(slider).toBeTruthy();
    
    fireEvent.change(slider, { target: { value: '50' } });
    
    expect(defaultProps.onZoomChange).toHaveBeenCalled();
  });
});
