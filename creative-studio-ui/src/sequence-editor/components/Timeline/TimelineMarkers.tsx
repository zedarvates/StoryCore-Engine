/**
 * TimelineMarkers Component
 * 
 * Renders color-coded markers on the timeline with drag support,
 * selection, and tooltip display.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  TimelineMarker,
  MarkerType,
  getMarkerColor,
  formatMarkerLabel,
  positionToTimecode,
} from './markerTypes';

interface TimelineMarkersProps {
  markers: TimelineMarker[];
  zoomLevel: number;
  height: number;
  selectedIds?: string[];
  onMarkerClick?: (marker: TimelineMarker) => void;
  onMarkerDoubleClick?: (marker: TimelineMarker) => void;
  onMarkerDragStart?: (marker: TimelineMarker) => void;
  onMarkerDrag?: (marker: TimelineMarker, newPosition: number) => void;
  onMarkerDragEnd?: (marker: TimelineMarker) => void;
  onCreateMarker?: (position: number) => void;
}

export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  markers,
  zoomLevel,
  height,
  selectedIds = [],
  onMarkerClick,
  onMarkerDoubleClick,
  onMarkerDragStart,
  onMarkerDrag,
  onMarkerDragEnd,
  onCreateMarker,
}) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartPosition, setDragStartPosition] = useState(0);
  const [tooltipMarker, setTooltipMarker] = useState<TimelineMarker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle marker click
  const handleMarkerClick = useCallback((marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkerClick) {
      onMarkerClick(marker);
    }
  }, [onMarkerClick]);

  // Handle marker double click
  const handleMarkerDoubleClick = useCallback((marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMarkerDoubleClick) {
      onMarkerDoubleClick(marker);
    }
  }, [onMarkerDoubleClick]);

  // Handle marker drag start
  const handleMarkerDragStart = useCallback((marker: TimelineMarker, e: React.MouseEvent) => {
    e.stopPropagation();
    setDraggingId(marker.id);
    setDragStartX(e.clientX);
    setDragStartPosition(marker.position);
    if (onMarkerDragStart) {
      onMarkerDragStart(marker);
    }
  }, [onMarkerDragStart]);

  // Handle mouse move for dragging
  useEffect(() => {
    if (!draggingId) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaFrames = Math.round(deltaX / zoomLevel);
      const newPosition = Math.max(0, dragStartPosition + deltaFrames);

      const marker = markers.find(m => m.id === draggingId);
      if (marker && onMarkerDrag) {
        onMarkerDrag(marker, newPosition);
      }
    };

    const handleMouseUp = () => {
      const marker = markers.find(m => m.id === draggingId);
      if (marker && onMarkerDragEnd) {
        onMarkerDragEnd(marker);
      }
      setDraggingId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, dragStartX, dragStartPosition, markers, zoomLevel, onMarkerDrag, onMarkerDragEnd]);

  // Handle container click to create new marker
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !onCreateMarker) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const position = Math.round(x / zoomLevel);

    if (position >= 0 && onCreateMarker) {
      onCreateMarker(position);
    }
  }, [zoomLevel, onCreateMarker]);

  // Handle tooltip mouse enter/leave
  const handleTooltipEnter = useCallback((marker: TimelineMarker) => {
    setTooltipMarker(marker);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setTooltipMarker(null);
  }, []);

  // Get marker icon based on type
  const getMarkerIcon = (type: MarkerType): string => {
    const icons: Record<MarkerType, string> = {
      info: '💬',
      warning: '⚠️',
      error: '❌',
      important: '⭐',
      bookmark: '🔖',
      custom: '📌',
    };
    return icons[type] || '📌';
  };

  // Sort markers by position
  const sortedMarkers = [...markers].sort((a, b) => a.position - b.position);

  return (
    <div 
      ref={containerRef}
      className="timeline-markers"
      style={{ height, position: 'relative' }}
      onClick={handleContainerClick}
      role="list"
      aria-label="Timeline markers"
    >
      {sortedMarkers.map((marker) => {
        const left = marker.position * zoomLevel;
        const isSelected = selectedIds.includes(marker.id);
        const isDragging = draggingId === marker.id;
        const color = getMarkerColor(marker.type, marker.color);

        return (
          <div
            key={marker.id}
            className={`timeline-marker ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} type-${marker.type}`}
            style={{
              left,
              color,
              borderColor: color,
              backgroundColor: `${color}20`,
            }}
            onClick={(e) => handleMarkerClick(marker, e)}
            onDoubleClick={(e) => handleMarkerDoubleClick(marker, e)}
            onMouseDown={(e) => handleMarkerDragStart(marker, e)}
            onMouseEnter={() => handleTooltipEnter(marker)}
            onMouseLeave={handleTooltipLeave}
            role="listitem"
            aria-label={`${marker.label} at ${positionToTimecode(marker.position)}`}
            tabIndex={0}
          >
            {/* Marker indicator line */}
            <div className="marker-indicator" style={{ backgroundColor: color }} />

            {/* Marker icon */}
            <div className="marker-icon" title={formatMarkerLabel(marker.type)}>
              {getMarkerIcon(marker.type)}
            </div>

            {/* Marker label */}
            {marker.label && (
              <div className="marker-label">{marker.label}</div>
            )}

            {/* Resize handle indicator */}
            <div className="marker-resize-handle" />
          </div>
        );
      })}

      {/* Tooltip */}
      {tooltipMarker && (
        <div 
          className="timeline-marker-tooltip"
          style={{
            left: tooltipMarker.position * zoomLevel,
          }}
        >
          <div className="tooltip-header">
            <span className="tooltip-icon">{getMarkerIcon(tooltipMarker.type)}</span>
            <span className="tooltip-label">{tooltipMarker.label || formatMarkerLabel(tooltipMarker.type)}</span>
          </div>
          <div className="tooltip-timecode">{positionToTimecode(tooltipMarker.position)}</div>
          {tooltipMarker.description && (
            <div className="tooltip-description">{tooltipMarker.description}</div>
          )}
          <div className="tooltip-meta">
            <span className="tooltip-type">{formatMarkerLabel(tooltipMarker.type)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Export for use in other components
export default TimelineMarkers;

