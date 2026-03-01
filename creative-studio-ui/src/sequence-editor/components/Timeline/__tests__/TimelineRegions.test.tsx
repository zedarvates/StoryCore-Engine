import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React from 'react';
import { TimelineRegions } from '../TimelineRegions';
import { TimelineRegion } from '../markerTypes';

describe('TimelineRegions Component', () => {
  const mockRegions: TimelineRegion[] = [
    { id: 'r1', start: 10, end: 50, type: 'work', label: 'Work Area' } as unknown as TimelineRegion,
    { id: 'r2', start: 60, end: 100, type: 'selection', label: 'Selection', isLocked: true } as unknown as TimelineRegion,
  ];

  const defaultProps = {
    regions: mockRegions,
    zoomLevel: 10,
    height: 100,
    onRegionClick: vi.fn(),
    onRegionDoubleClick: vi.fn(),
    onRegionDragStart: vi.fn(),
    onRegionDrag: vi.fn(),
    onRegionResizeStart: vi.fn(),
    onRegionResize: vi.fn(),
    onRegionResizeEnd: vi.fn(),
    onRegionDragEnd: vi.fn(),
    onCreateRegion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all regions', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    const regionElements = container.querySelectorAll('.timeline-region');
    expect(regionElements.length).toBe(mockRegions.length);
  });

  it('calls onRegionClick when clicked', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    const region = container.querySelector('.timeline-region');
    
    if (region) {
      fireEvent.click(region);
      expect(defaultProps.onRegionClick).toHaveBeenCalledWith(mockRegions[0]);
    }
  });

  it('calls onRegionDoubleClick when double-clicked', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    const region = container.querySelector('.timeline-region');
    
    if (region) {
      fireEvent.doubleClick(region);
      expect(defaultProps.onRegionDoubleClick).toHaveBeenCalledWith(mockRegions[0]);
    }
  });

  it('calls onCreateRegion on container shift+click', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    const wrapper = container.querySelector('.timeline-regions');
    
    if (wrapper) {
      fireEvent.click(wrapper, { clientX: 200, shiftKey: true });
      expect(defaultProps.onCreateRegion).toHaveBeenCalled();
    }
  });

  it('does not call onCreateRegion on container regular click', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    const wrapper = container.querySelector('.timeline-regions');
    
    if (wrapper) {
      fireEvent.click(wrapper, { clientX: 200, shiftKey: false });
      expect(defaultProps.onCreateRegion).not.toHaveBeenCalled();
    }
  });

  it('handles region lock indicator', () => {
    const { container } = render(<TimelineRegions {...defaultProps} />);
    // Second mock region is locked
    const lockedIndicator = container.querySelector('.region-locked-indicator');
    expect(lockedIndicator).toBeTruthy();
  });
});
