import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Minimap } from '../Minimap';
import { Track, Shot, LayerType } from '../../../types';

describe('Minimap Component', () => {
  const mockTracks: Track[] = [
    { id: '1', type: 'video' as LayerType, height: 100, locked: false, hidden: false, color: '#ff0000', icon: 'video' },
    { id: '2', type: 'audio' as LayerType, height: 60, locked: false, hidden: false, color: '#00ff00', icon: 'audio' },
  ];

  const mockShots: Shot[] = [
    { id: 's1', name: 'Shot 1', startTime: 0, duration: 10, layers: [], thumbnail: '' } as unknown as Shot,
  ];

  const defaultProps = {
    tracks: mockTracks,
    shots: mockShots,
    zoomLevel: 10,
    scrollLeft: 0,
    containerWidth: 800,
    timelineWidth: 2000,
    totalTracksHeight: 160,
    onViewportChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders minimap container', () => {
    render(<Minimap {...defaultProps} />);
    
    expect(screen.getByText('Minimap')).toBeTruthy();
  });

  it('renders track overview', () => {
    const { container } = render(<Minimap {...defaultProps} />);
    
    // 2 visible tracks
    const tracks = container.querySelectorAll('.minimap-track');
    expect(tracks.length).toBe(2);
  });

  it('calls onViewportChange when minimap is clicked', () => {
    render(<Minimap {...defaultProps} />);
    
    const minimapCanvas = screen.getByRole('slider', { name: /minimap/i });
    
    // Using fireEvent since its mouse offset needs to be calculated
    fireEvent.click(minimapCanvas, { clientX: 100 });
    
    expect(defaultProps.onViewportChange).toHaveBeenCalled();
  });
});
