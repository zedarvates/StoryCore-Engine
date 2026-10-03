/**
 * TimelineRegions Component
 * 
 * Renders regions on the timeline with drag and resize support.
 * Regions can be used for work areas, selections, loops, etc.
 * 
 * Requirements: 3.6, 3.7, 3.8
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TimelineRegion,
  RegionType,
  getRegionColor,
  isPositionInRegion,
} from './markerTypes';

interface TimelineRegionsProps {
  regions: TimelineRegion[];
  zoomLevel: number;
  height: number;
  selectedIds?: string[];
  onRegionClick?: (region: TimelineRegion) => void;
  onRegionDoubleClick?: (region: TimelineRegion) => void;
  onRegionDragStart?: (region: TimelineRegion) => void;
  onRegionDrag?: (region: TimelineRegion, newStart: number) => void;
  onRegionResizeStart?: (region: TimelineRegion, edge: 'start' | 'end') => void;
  onRegionResize?: (region: TimelineRegion, newStart: number, newEnd: number) => void;
  onRegionResizeEnd?: (region: TimelineRegion) => void;
  onRegionDragEnd?: (region: TimelineRegion) => void;
  onCreateRegion?: (start: number, end: number) => void;
}

export const TimelineRegions: React.FC<TimelineRegionsProps> = ({
  regions,
  zoomLevel,
  height,
  selectedIds = [],
  onRegionClick,
  onRegionDoubleClick,
  onRegionDragStart,
  onRegionDrag,
  onRegionResizeStart,
  onRegionResize,
  onRegionResizeEnd,
  onRegionDragEnd,
  onCreateRegion,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeEdge, setResizeEdge] = useState<'start' | 'end'>('start');
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartStart, setDragStartStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle region click
  const handleRegionClick = useCallback((region: TimelineRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegionClick) {
      onRegionClick(region);
    }
  }, [onRegionClick]);

  // Handle region double click
  const handleRegionDoubleClick = useCallback((region: TimelineRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRegionDoubleClick) {
      onRegionDoubleClick(region);
    }
  }, [onRegionDoubleClick]);

  // Handle region drag start
  const handleRegionDragStart = useCallback((region: TimelineRegion, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingId(region.id);
    setDragStartX(e.clientX);
    setDragStartStart(region.start);
    if (onRegionDragStart) {
      onRegionDragStart(region);
    }
  }, [onRegionDragStart]);

  // Handle resize handle mousedown
  const handleResizeStart = useCallback((region: TimelineRegion, edge: 'start' | 'end', e: React.MouseEvent) => {
    e.stopPropagation();
    setResizingId(region.id);
    setResizeEdge(edge);
    setDragStartX(e.clientX);
    setDragStartStart(edge === 'start' ? region.start : region.end);
    if (onRegionResizeStart) {
      onRegionResizeStart(region, edge);
    }
  }, [onRegionResizeStart]);

  // Handle mouse move for dragging and resizing
  useEffect(() => {
    if (!draggingId && !resizingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaFrames = Math.round(deltaX / zoomLevel);

      if (draggingId) {
        const region = regions.find(r => r.id === draggingId);
        if (region) {
          const newStart = Math.max(0, dragStartStart + deltaFrames);
          if (onRegionDrag) {
            onRegionDrag(region, newStart);
          }
        }
      } else if (resizingId) {
        const region = regions.find(r => r.id === resizingId);
        if (region) {
          const newStart = region.start;
          const newEnd = region.end;
          
          if (resizeEdge === 'start') {
            const calculatedStart = Math.max(0, Math.min(dragStartStart + deltaFrames, region.end - 1));
            if (onRegionResize) {
              onRegionResize(region, calculatedStart, newEnd);
            }
          } else {
            const calculatedEnd = Math.max(region.start + 1, dragStartStart + deltaFrames);
            if (onRegionResize) {
              onRegionResize(region, newStart, calculatedEnd);
            }
          }
        }
      }
    };

    const handleMouseUp = () => {
      if (draggingId) {
        const region = regions.find(r => r.id === draggingId);
        if (region && onRegionDragEnd) {
          onRegionDragEnd(region);
        }
        setDraggingId(null);
      }
      if (resizingId) {
        const region = regions.find(r => r.id === resizingId);
        if (region && onRegionResizeEnd) {
          onRegionResizeEnd(region);
        }
        setResizingId(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, resizingId, resizeEdge, dragStartX, dragStartStart, regions, zoomLevel, onRegionDrag, onRegionResize, onRegionDragEnd, onRegionResizeEnd]);

  // Handle container click to create new region
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !onCreateRegion) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.round(x / zoomLevel);

    if (position >= 0 && !e.shiftKey) {
      // Simple click - don't create region
      return;
    }

    if (e.shiftKey && onCreateRegion) {
      // Shift+click to create a region of default length (e.g., 60 frames / 2.5 seconds)
      const defaultLength = 60;
      const start = Math.max(0, position - Math.round(defaultLength / 2));
      const end = start + defaultLength;
      onCreateRegion(start, end);
    }
  }, [zoomLevel, onCreateRegion]);

  // Get region label based on type
  const getRegionLabel = (type: RegionType): string => {
    const labels: Record<RegionType, string> = {
      work: 'Work Area',
      selection: 'Selection',
      gap: 'Gap',
      loop: 'Loop',
      highlight: 'Highlight',
      comment: 'Comment',
    };
    return labels[type] || 'Region';
  };

  // Sort regions by start position
  const sortedRegions = [...regions].sort((a, b) => a.start - b.start);

  return (
    <div 
      ref={containerRef}
      className="timeline-regions"
      style={{ height, position: 'relative' }}
      onClick={handleContainerClick}
      role="list"
      aria-label="Timeline regions"
    >
      {sortedRegions.map((region) => {
        const left = region.start * zoomLevel;
        const width = (region.end - region.start) * zoomLevel;
        const isSelected = selectedIds.includes(region.id);
        const isDragging = draggingId === region.id;
        const isResizing = resizingId === region.id;
        const color = getRegionColor(region.type, region.color);

        return (
          <div
            key={region.id}
            className={`timeline-region ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''} type-${region.type}`}
            style={{
              left,
              width,
              backgroundColor: color,
              borderColor: color.replace('0.2', '0.8').replace('0.3', '0.8'),
            }}
            onClick={(e) => handleRegionClick(region, e)}
            onDoubleClick={(e) => handleRegionDoubleClick(region, e)}
            onMouseDown={(e) => handleRegionDragStart(region, e)}
            role="listitem"
            aria-label={`${region.label || getRegionLabel(region.type)} from frame ${region.start} to ${region.end}`}
            tabIndex={0}
          >
            {/* Resize handle - start */}
            <div 
              className="region-resize-handle start"
              onMouseDown={(e) => handleResizeStart(region, 'start', e)}
              title="Drag to resize start"
            />

            {/* Region content */}
            <div className="region-content">
              {(region.label || isSelected) && (
                <div className="region-label">
                  {region.label || getRegionLabel(region.type)}
                </div>
              )}
              {region.description && (
                <div className="region-description">{region.description}</div>
              )}
            </div>

            {/* Resize handle - end */}
            <div 
              className="region-resize-handle end"
              onMouseDown={(e) => handleResizeStart(region, 'end', e)}
              title="Drag to resize end"
            />

            {/* Lock indicator */}
            {region.isLocked && (
              <div className="region-locked-indicator" title="Region is locked">
                🔒
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Export for use in other components
export default TimelineRegions;

