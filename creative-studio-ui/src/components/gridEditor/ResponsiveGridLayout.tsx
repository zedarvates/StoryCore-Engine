/**
 * ResponsiveGridLayout Component
 * 
 * Grid layout that adapts to different screen sizes with smooth transitions.
 * Automatically switches between grid and list modes based on viewport width.
 * 
 * Exigences: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsiveGrid } from '../../hooks/useResponsiveGrid';
import { getLayoutPreferencesManager } from '../../services/responsive/LayoutPreferences';
import type { GridLayoutConfig, GridPanel } from '../../types/gridEditorAdvanced';
import { GridLayout } from './GridLayout';
import { GridListView } from './GridListView';
import './ResponsiveGridLayout.css';

export interface ResponsiveGridLayoutProps {
  items: GridPanel[];
  baseConfig: GridLayoutConfig;
  onLayoutChange?: (items: GridPanel[]) => void;
  enablePreferences?: boolean;
  animateTransitions?: boolean;
}

export const ResponsiveGridLayout: React.FC<ResponsiveGridLayoutProps> = ({
  items,
  baseConfig,
  onLayoutChange,
  enablePreferences = true,
  animateTransitions = true
}) => {
  const responsive = useResponsiveGrid();
  const [config, setConfig] = useState<GridLayoutConfig>(baseConfig);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const preferencesManager = useMemo(() => getLayoutPreferencesManager(), []);
  
  // Stable refs for props that might change on every render
  const onLayoutChangeRef = useRef(onLayoutChange);
  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange;
  }, [onLayoutChange]);

  const baseConfigString = JSON.stringify({ gap: baseConfig.gap, showGridLines: baseConfig.showGridLines });

  // Handle transition state when breakpoint changes
  const lastBreakpointRef = useRef(responsive.breakpoint.name);
  useEffect(() => {
    if (lastBreakpointRef.current !== responsive.breakpoint.name) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      lastBreakpointRef.current = responsive.breakpoint.name;
      return () => clearTimeout(timer);
    }
  }, [responsive.breakpoint.name]);

  /**
   * Synchronize layout configuration with responsive state and preferences
   * Exigences: 12.2, 12.3, 12.4, 12.5, 12.7, 12.8
   */
  useEffect(() => {
    setConfig(prev => {
      let next = { ...prev, columns: responsive.columns };

      // Apply preferences if enabled
      if (enablePreferences) {
        const preference = preferencesManager.getPreference(responsive.breakpoint);
        if (preference) {
          next = {
            ...next,
            columns: preference.columns ?? next.columns,
            showGridLines: preference.showGridLines ?? next.showGridLines,
            snapEnabled: preference.snapEnabled ?? next.snapEnabled,
            cellSize: preference.gridSize 
              ? { width: preference.gridSize, height: preference.gridSize }
              : next.cellSize
          };
        }
      }

      // Apply fullscreen adjustments
      if (responsive.isFullscreen) {
        next = {
          ...next,
          gap: Math.max(4, baseConfig.gap - 4),
          showGridLines: false
        };
      } else if (!enablePreferences) {
        // Restore from baseConfig if preferences are off
        next = {
          ...next,
          gap: baseConfig.gap,
          showGridLines: baseConfig.showGridLines
        };
      }

      // Portrait overrides
      if (responsive.orientation === 'portrait' && responsive.width < 1024) {
        next = { ...next, columns: 1 };
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    responsive.columns, 
    responsive.breakpoint, 
    responsive.isFullscreen, 
    responsive.orientation, 
    responsive.width,
    enablePreferences, 
    preferencesManager, 
    baseConfigString
  ]);


  /**
   * Save preferences when config changes
   * Exigence: 12.8
   */
  const handleConfigChange = useCallback((newConfig: Partial<GridLayoutConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));

    if (enablePreferences) {
      preferencesManager.setPreference(responsive.breakpoint, {
        columns: newConfig.columns,
        showGridLines: newConfig.showGridLines,
        snapEnabled: newConfig.snapEnabled,
        gridSize: newConfig.cellSize?.width
      });
    }
  }, [enablePreferences, preferencesManager, responsive.breakpoint]);

  /**
   * Handle layout change with proportion maintenance
   * Exigence: 12.6
   */
  const handleLayoutChange = useCallback((newItems: GridPanel[]) => {
    // Maintain proportions when resizing
    const scaledItems = newItems.map(item => {
      const widthRatio = item.size.width / config.cellSize.width;
      const heightRatio = item.size.height / config.cellSize.height;

      return {
        ...item,
        size: {
          width: Math.round(widthRatio * config.cellSize.width),
          height: Math.round(heightRatio * config.cellSize.height)
        }
      };
    });

    onLayoutChangeRef.current?.(scaledItems);
  }, [config.cellSize]);

  /**
   * Render appropriate view based on breakpoint
   * Exigence: 12.2
   */
  const renderView = () => {
    if (responsive.useListMode) {
      // List mode for small screens (< 1024px)
      return (
        <GridListView
          items={items}
          onItemClick={(item) => console.log('Item clicked:', item)}
          onLayoutChange={onLayoutChange}
        />
      );
    }

    // Grid mode for larger screens
    return (
      <GridLayout
        config={config}
        items={items}
        onLayoutChange={handleLayoutChange}
      />
    );
  };

  return (
    <motion.div
      className="responsive-grid-layout"
      animate={{
        opacity: isTransitioning ? 0.8 : 1
      }}
      transition={{
        duration: 0.3,
        ease: 'easeInOut'
      }}
    >
      {/* Breakpoint indicator (dev mode) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="breakpoint-indicator">
          {responsive.breakpoint.name} ({responsive.width}x{responsive.height})
          {responsive.isFullscreen && ' [Fullscreen]'}
        </div>
      )}

      {/* Animated view transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={responsive.useListMode ? 'list' : 'grid'}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{
            duration: animateTransitions ? 0.3 : 0,
            ease: 'easeInOut'
          }}
          className="view-container"
        >
          {renderView()}
        </motion.div>
      </AnimatePresence>

      {/* Configuration controls */}
      <ResponsiveGridControls
        config={config}
        responsive={responsive}
        onConfigChange={handleConfigChange}
      />
    </motion.div>
  );
};

/**
 * Controls for responsive grid configuration
 */
interface ResponsiveGridControlsProps {
  config: GridLayoutConfig;
  responsive: ReturnType<typeof useResponsiveGrid>;
  onConfigChange: (config: Partial<GridLayoutConfig>) => void;
}

const ResponsiveGridControls: React.FC<ResponsiveGridControlsProps> = ({
  config,
  responsive,
  onConfigChange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      className="responsive-grid-controls"
      initial={false}
      animate={{
        width: isExpanded ? 280 : 48,
        height: isExpanded ? 'auto' : 48
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="controls-trigger"
        aria-label={isExpanded ? "Close controls" : "Open controls"}
        title={isExpanded ? "Close controls" : "Open controls"}
      >
        ⚙️
      </button>

      {isExpanded && (
        <div className="controls-content">
          <div className="control-group">
            <label htmlFor="columns-range" className="control-label">
              Columns: {config.columns}
            </label>
            <input
              id="columns-range"
              type="range"
              min="1"
              max="6"
              value={config.columns}
              onChange={(e) => onConfigChange({ columns: parseInt(e.target.value) })}
              className="control-input-range"
              title="Columns range"
            />
          </div>

          <div className="control-group">
            <label className="control-checkbox-label">
              <input
                type="checkbox"
                checked={config.showGridLines}
                onChange={(e) => onConfigChange({ showGridLines: e.target.checked })}
                className="control-checkbox"
                title="Show Grid Lines"
              />
              Show Grid Lines
            </label>
          </div>

          <div className="control-group">
            <label className="control-checkbox-label">
              <input
                type="checkbox"
                checked={config.snapEnabled}
                onChange={(e) => onConfigChange({ snapEnabled: e.target.checked })}
                className="control-checkbox"
                title="Snap to Grid"
              />
              Snap to Grid
            </label>
          </div>

          <div className="controls-footer">
            {responsive.breakpoint.name} • {responsive.orientation}
          </div>
        </div>
      )}
    </motion.div>
  );
};
