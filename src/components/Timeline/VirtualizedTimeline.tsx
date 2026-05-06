/**
 * Virtualized Timeline Component
 * 
 * Requirements: 89
 * Level: 🟡 HAUTE
 * 
 * High-performance timeline with virtualization for large datasets
 */

import React, { useMemo, useCallback, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { usePerformanceMeasure } from '../hooks/usePerformanceOptimization';

export interface TimelineItem {
  id: string;
  timestamp: number;
  type: 'action' | 'event' | 'milestone' | 'error';
  title: string;
  description?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface VirtualizedTimelineProps {
  items: TimelineItem[];
  itemHeight?: number;
  overscan?: number;
  onItemClick?: (item: TimelineItem) => void;
  renderItem?: (item: TimelineItem) => React.ReactNode;
  className?: string;
  showPerformanceMetrics?: boolean;
}

export const VirtualizedTimeline: React.FC<VirtualizedTimelineProps> = ({
  items,
  itemHeight = 60,
  overscan = 5,
  onItemClick,
  renderItem,
  className = '',
  showPerformanceMetrics = false,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const perf = usePerformanceMeasure('VirtualizedTimeline');

  // Sort items by timestamp
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.timestamp - b.timestamp);
  }, [items]);

  // Virtualizer setup
  const rowVirtualizer = useVirtualizer({
    count: sortedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemHeight,
    overscan,
  });

  // Get virtual items
  const virtualItems = rowVirtualizer.getVirtualItems();

  // Handle item click
  const handleItemClick = useCallback(
    (item: TimelineItem) => {
      setSelectedItemId(item.id);
      onItemClick?.(item);
    },
    [onItemClick]
  );

  // Default item renderer
  const defaultRenderItem = useCallback(
    (item: TimelineItem, isSelected: boolean) => {
      const itemDate = new Date(item.timestamp);
      const timeString = itemDate.toLocaleTimeString();
      const dateString = itemDate.toLocaleDateString();

      return (
        <div className={`timeline-item ${item.type} ${isSelected ? 'selected' : ''}`}>
          <div className="timeline-item-time">
            <span className="time">{timeString}</span>
            <span className="date">{dateString}</span>
          </div>
          <div className="timeline-item-content">
            <div className="timeline-item-title">{item.title}</div>
            {item.description && (
              <div className="timeline-item-description">{item.description}</div>
            )}
            {item.duration && (
              <div className="timeline-item-duration">
                Duration: {item.duration}ms
              </div>
            )}
            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="timeline-item-metadata">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <span key={key} className="metadata-tag">
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="timeline-item-type">{item.type}</div>
        </div>
      );
    },
    []
  );

  // Performance metrics
  const perfMetrics = useMemo(() => {
    if (!showPerformanceMetrics) return null;

    return {
      totalItems: sortedItems.length,
      visibleItems: virtualItems.length,
      overscan,
      itemHeight,
      estimatedHeight: sortedItems.length * itemHeight,
      viewportHeight: parentRef.current?.clientHeight || 0,
    };
  }, [sortedItems.length, virtualItems.length, overscan, itemHeight, showPerformanceMetrics]);

  return (
    <div className={`virtualized-timeline ${className}`}>
      {showPerformanceMetrics && perfMetrics && (
        <div className="timeline-performance-metrics">
          <div className="metric">
            <span className="label">Total Items:</span>
            <span className="value">{perfMetrics.totalItems}</span>
          </div>
          <div className="metric">
            <span className="label">Visible Items:</span>
            <span className="value">{perfMetrics.visibleItems}</span>
          </div>
          <div className="metric">
            <span className="label">Render Time:</span>
            <span className="value">{perf.end().toFixed(2)}ms</span>
          </div>
        </div>
      )}

      <div
        ref={parentRef}
        className="timeline-container"
        style={{ height: '600px', overflow: 'auto' }}
      >
        <div
          style={{
            height: `${sortedItems.length * itemHeight}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItems[0]?.start || 0}px)`,
            }}
          >
            {virtualItems.map((virtualRow) => {
              const item = sortedItems[virtualRow.index];
              if (!item) return null;

              const isSelected = selectedItemId === item.id;

              return (
                <div
                  key={item.id}
                  className="timeline-item-wrapper"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: itemHeight,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => handleItemClick(item)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Timeline item: ${item.title}`}
                >
                  {renderItem
                    ? renderItem(item)
                    : defaultRenderItem(item, isSelected)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {items.length === 0 && (
        <div className="timeline-empty-state">
          <p>No timeline items to display</p>
        </div>
      )}

      <style jsx>{`
        .virtualized-timeline {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .timeline-performance-metrics {
          display: flex;
          gap: 16px;
          padding: 8px 16px;
          background: #f0f0f0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 12px;
        }

        .metric {
          display: flex;
          gap: 8px;
        }

        .metric .label {
          color: #666;
        }

        .metric .value {
          font-weight: 500;
          color: #333;
        }

        .timeline-container {
          flex: 1;
          overflow: auto;
        }

        .timeline-item-wrapper {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .timeline-item-wrapper:hover {
          background-color: #f5f5f5;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          height: 100%;
          padding: 8px 16px;
          border-bottom: 1px solid #f0f0f0;
          background: white;
          transition: all 0.2s;
        }

        .timeline-item:hover {
          background: #f8f9fa;
        }

        .timeline-item.selected {
          background: #e3f2fd;
          border-left: 3px solid #2196f3;
        }

        .timeline-item.action {
          border-left: 3px solid #4caf50;
        }

        .timeline-item.event {
          border-left: 3px solid #2196f3;
        }

        .timeline-item.milestone {
          border-left: 3px solid #ff9800;
        }

        .timeline-item.error {
          border-left: 3px solid #f44336;
        }

        .timeline-item-time {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 80px;
          margin-right: 16px;
        }

        .timeline-item-time .time {
          font-size: 12px;
          font-weight: 500;
          color: #333;
        }

        .timeline-item-time .date {
          font-size: 10px;
          color: #666;
        }

        .timeline-item-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-item-title {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }

        .timeline-item-description {
          font-size: 12px;
          color: #666;
        }

        .timeline-item-duration {
          font-size: 11px;
          color: #4caf50;
        }

        .timeline-item-metadata {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .metadata-tag {
          font-size: 10px;
          padding: 2px 6px;
          background: #e0e0e0;
          border-radius: 10px;
          color: #666;
        }

        .timeline-item-type {
          font-size: 10px;
          text-transform: uppercase;
          color: #666;
          font-weight: 500;
        }

        .timeline-empty-state {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};
