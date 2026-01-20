/**
 * VirtualShotList - Virtualized shot list for performance with large projects
 * 
 * Uses virtual scrolling to render only visible shots, improving performance
 * with projects containing 100+ shots.
 * 
 * Requirements: 10.2
 */

import React, { useRef, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { CheckCircle, AlertCircle, Circle } from 'lucide-react';
import type { Shot } from '../types/projectDashboard';
import { calculateVisibleItems } from '../utils/performanceOptimizations';

// ============================================================================
// Constants
// ============================================================================

const ITEM_HEIGHT = 100; // Height of each shot item in pixels
const OVERSCAN = 5; // Number of items to render outside viewport

// ============================================================================
// Component Props
// ============================================================================

export interface VirtualShotListProps {
  shots: Shot[];
  selectedShotId: string | null;
  onShotSelect: (shot: Shot) => void;
  getPromptIndicator: (shot: Shot) => {
    icon: React.ComponentType<any>;
    color: string;
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
  };
  containerHeight: number;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const VirtualShotList: React.FC<VirtualShotListProps> = ({
  shots,
  selectedShotId,
  onShotSelect,
  getPromptIndicator,
  containerHeight,
  className = '',
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // ============================================================================
  // Virtual Scrolling Calculation
  // ============================================================================

  const { visibleItems, totalHeight, offsetY } = React.useMemo(() => {
    return calculateVisibleItems(
      shots,
      scrollTop,
      containerHeight,
      ITEM_HEIGHT,
      OVERSCAN
    );
  }, [shots, scrollTop, containerHeight]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      ref={containerRef}
      className={`virtual-shot-list overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      role="list"
      aria-label="Shot list"
    >
      {/* Spacer for total height */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((shot) => {
            const indicator = getPromptIndicator(shot);
            const Icon = indicator.icon;
            const isSelected = selectedShotId === shot.id;

            return (
              <div
                key={shot.id}
                style={{ height: ITEM_HEIGHT }}
                className="px-2 py-1"
              >
                <Button
                  variant={isSelected ? 'default' : 'outline'}
                  className={`w-full justify-start text-left h-full py-3 px-4 ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => onShotSelect(shot)}
                  role="listitem"
                  aria-label={`Shot ${shot.id.slice(0, 8)}, ${indicator.label}, ${shot.startTime} to ${shot.startTime + shot.duration} seconds`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3 w-full">
                    {/* Completion Indicator */}
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${indicator.color}`} aria-hidden="true" />
                    
                    {/* Shot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm truncate">
                          Shot {shot.id.slice(0, 8)}
                        </span>
                        <Badge variant={indicator.variant} className="text-xs" aria-hidden="true">
                          {indicator.label}
                        </Badge>
                      </div>
                      
                      {/* Shot Metadata */}
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          Time: {shot.startTime}s - {shot.startTime + shot.duration}s
                        </div>
                        {shot.metadata.cameraAngle && (
                          <div>Camera: {shot.metadata.cameraAngle}</div>
                        )}
                      </div>
                      
                      {/* Prompt Preview */}
                      {shot.prompt && (
                        <div className="text-xs text-muted-foreground mt-2 line-clamp-2" aria-label="Prompt preview">
                          {shot.prompt}
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualShotList;
