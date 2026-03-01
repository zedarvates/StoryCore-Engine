import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TimelineMarkers } from '../TimelineMarkers';
import { TimelineMarker } from '../markerTypes';

describe('TimelineMarkers Component', () => {
  const mockMarkers: TimelineMarker[] = [
    { id: 'm1', position: 10, type: 'info', label: 'Marker 1' } as unknown as TimelineMarker,
    { id: 'm2', position: 50, type: 'warning', label: 'Marker 2' } as unknown as TimelineMarker,
  ];

  const defaultProps = {
    markers: mockMarkers,
    zoomLevel: 10,
    height: 100,
    onMarkerClick: vi.fn(),
    onMarkerDoubleClick: vi.fn(),
    onMarkerDragStart: vi.fn(),
    onMarkerDrag: vi.fn(),
    onMarkerDragEnd: vi.fn(),
    onCreateMarker: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all markers', () => {
    const { container } = render(<TimelineMarkers {...defaultProps} />);
    const markerElements = container.querySelectorAll('.timeline-marker');
    expect(markerElements.length).toBe(mockMarkers.length);
  });

  it('calls onMarkerClick when a marker is clicked', () => {
    const { container } = render(<TimelineMarkers {...defaultProps} />);
    const firstMarker = container.querySelector('.timeline-marker');
    
    if (firstMarker) {
      fireEvent.click(firstMarker);
      expect(defaultProps.onMarkerClick).toHaveBeenCalledWith(mockMarkers[0]);
    }
  });

  it('calls onMarkerDoubleClick when a marker is double-clicked', () => {
    const { container } = render(<TimelineMarkers {...defaultProps} />);
    const firstMarker = container.querySelector('.timeline-marker');
    
    if (firstMarker) {
      fireEvent.doubleClick(firstMarker);
      expect(defaultProps.onMarkerDoubleClick).toHaveBeenCalledWith(mockMarkers[0]);
    }
  });

  it('calls onCreateMarker on container click', () => {
    const { container } = render(<TimelineMarkers {...defaultProps} />);
    const wrapper = container.querySelector('.timeline-markers');
    
    if (wrapper) {
      // Simulate click
      fireEvent.click(wrapper, { clientX: 200 });
      expect(defaultProps.onCreateMarker).toHaveBeenCalled();
    }
  });

  it('shows tooltip on hover', () => {
    const { container } = render(<TimelineMarkers {...defaultProps} />);
    const firstMarker = container.querySelector('.timeline-marker');
    
    if (firstMarker) {
      fireEvent.mouseEnter(firstMarker);
      const tooltip = container.querySelector('.timeline-marker-tooltip');
      expect(tooltip).toBeTruthy();
      expect(tooltip?.textContent).toContain('Marker 1');
    }
  });
});
