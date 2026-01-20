/**
 * GridLayoutToolbar Component
 * 
 * Provides controls for grid layout operations including "Distribute Evenly"
 * Exigence: 3.8
 */

import React from 'react';
import { motion } from 'framer-motion';

interface GridLayoutToolbarProps {
  selectedPanelIds: string[];
  onDistributeHorizontally: () => void;
  onDistributeVertically: () => void;
  onToggleGridLines: () => void;
  onToggleSnap: () => void;
  showGridLines: boolean;
  snapEnabled: boolean;
}

export const GridLayoutToolbar: React.FC<GridLayoutToolbarProps> = ({
  selectedPanelIds,
  onDistributeHorizontally,
  onDistributeVertically,
  onToggleGridLines,
  onToggleSnap,
  showGridLines,
  snapEnabled
}) => {
  const hasSelection = selectedPanelIds.length >= 2;

  return (
    <motion.div
      className="grid-layout-toolbar"
      style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        gap: '8px',
        zIndex: 100
      }}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Distribute Evenly buttons (Exigence 3.8) */}
      {hasSelection && (
        <>
          <motion.button
            onClick={onDistributeHorizontally}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Distribute selected panels evenly horizontally"
          >
            ↔ Distribute Horizontally
          </motion.button>

          <motion.button
            onClick={onDistributeVertically}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Distribute selected panels evenly vertically"
          >
            ↕ Distribute Vertically
          </motion.button>

          <div style={{ width: '1px', backgroundColor: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />
        </>
      )}

      {/* Grid controls */}
      <motion.button
        onClick={onToggleGridLines}
        style={{
          padding: '8px 16px',
          backgroundColor: showGridLines ? '#2196F3' : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Toggle grid lines visibility"
      >
        {showGridLines ? '✓' : ''} Grid Lines
      </motion.button>

      <motion.button
        onClick={onToggleSnap}
        style={{
          padding: '8px 16px',
          backgroundColor: snapEnabled ? '#2196F3' : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Toggle snap-to-grid (or hold Shift to temporarily disable)"
      >
        {snapEnabled ? '✓' : ''} Snap to Grid
      </motion.button>

      {/* Selection info */}
      {hasSelection && (
        <div style={{
          padding: '8px 12px',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center'
        }}>
          {selectedPanelIds.length} panels selected
        </div>
      )}
    </motion.div>
  );
};
