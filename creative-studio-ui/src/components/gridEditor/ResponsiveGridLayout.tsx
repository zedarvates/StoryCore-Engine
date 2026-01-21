/**
 * ResponsiveGridLayout Component
 * 
 * Grid layout that adapts to different screen sizes with smooth transitions.
 * Automatically switches between grid and list modes based on viewport width.
 * 
 * Exigences: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResponsiveGrid } from '../../hooks/useResponsiveGrid';
import { getLayoutPreferencesManager } from '../../services/responsive/LayoutPreferences';
import type { GridLayoutConfig, GridPanel } from '../../types/gridEditorAdvanced';
import { GridLayout } from './GridLayout';
import { GridListView } from './GridListView';

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

  /**
   * Load preferences for current breakpoint
   * Exigence: 12.8
   */
  useEffect(() => {
    if (!enablePreferences) return;

    const preference = preferencesManager.getPreference(responsive.breakpoint);
    if (preference) {
      setConfig(prev => ({
        ...prev,
        columns: preference.columns ?? prev.columns,
        showGridLines: preference.showGridLines ?? prev.showGridLines,
        snapEnabled: preference.snapEnabled ?? prev.snapEnabled,
        cellSize: preference.gridSize 
          ? { width: preference.gridSize, height: preference.gridSize }
          : prev.cellSize
      }));
    }
  }, [responsive.breakpoint, enablePreferences, preferencesManager]);

  /**
   * Update config when breakpoint changes
   * Exigences: 12.2, 12.3, 12.4
   */
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      columns: responsive.columns
    }));
  }, [responsive.columns]);

  /**
   * Handle window resize with animation
   * Exigences: 12.1, 12.6
   */
  useEffect(() => {
    if (animateTransitions) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 300);
      return () => clearTimeout(timer);
    }
  }, [responsive.width, responsive.height, animateTransitions]);

  /**
   * Adjust layout for fullscreen mode
   * Exigence: 12.5
   */
  useEffect(() => {
    if (responsive.isFullscreen) {
      // Maximize space utilization in fullscreen
      setConfig(prev => ({
        ...prev,
        gap: Math.max(4, prev.gap - 4), // Reduce gap slightly
        showGridLines: false // Hide grid lines for cleaner look
      }));
    } else {
      // Restore normal config
      setConfig(prev => ({
        ...prev,
        gap: baseConfig.gap,
        showGridLines: baseConfig.showGridLines
      }));
    }
  }, [responsive.isFullscreen, baseConfig.gap, baseConfig.showGridLines]);

  /**
   * Handle orientation change
   * Exigence: 12.7
   */
  useEffect(() => {
    // Recalculate layout immediately on orientation change
    if (responsive.orientation === 'portrait' && responsive.width < 1024) {
      // Force list mode in portrait on smaller screens
      setConfig(prev => ({
        ...prev,
        columns: 1
      }));
    }
  }, [responsive.orientation, responsive.width]);

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

    onLayoutChange?.(scaledItems);
  }, [config.cellSize, onLayoutChange]);

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
          onItemClick={(item) => }
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
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden'
      }}
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
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '12px',
            borderRadius: '4px',
            zIndex: 9999,
            pointerEvents: 'none'
          }}
        >
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
          style={{
            width: '100%',
            height: '100%'
          }}
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
      style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        zIndex: 1000
      }}
      initial={false}
      animate={{
        width: isExpanded ? 280 : 48,
        height: isExpanded ? 'auto' : 48
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        ⚙️
      </button>

      {isExpanded && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
              Columns: {config.columns}
            </label>
            <input
              type="range"
              min="1"
              max="6"
              value={config.columns}
              onChange={(e) => onConfigChange({ columns: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={config.showGridLines}
                onChange={(e) => onConfigChange({ showGridLines: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Show Grid Lines
            </label>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <input
                type="checkbox"
                checked={config.snapEnabled}
                onChange={(e) => onConfigChange({ snapEnabled: e.target.checked })}
                style={{ marginRight: '8px' }}
              />
              Snap to Grid
            </label>
          </div>

          <div style={{ fontSize: '10px', color: '#666', marginTop: '12px' }}>
            {responsive.breakpoint.name} • {responsive.orientation}
          </div>
        </div>
      )}
    </motion.div>
  );
};
