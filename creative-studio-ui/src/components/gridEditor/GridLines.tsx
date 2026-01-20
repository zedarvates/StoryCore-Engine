/**
 * GridLines Component
 * 
 * Renders semi-transparent grid lines for visual alignment
 * Exigences: 3.4, 3.6
 */

import React, { useMemo } from 'react';
import type { GridLayoutConfig } from '../../types/gridEditorAdvanced';

interface GridLinesProps {
  config: GridLayoutConfig;
}

export const GridLines: React.FC<GridLinesProps> = ({ config }) => {
  const { columns, rows, gap, cellSize } = config;

  // Calculate grid dimensions
  const cellWidth = cellSize.width + gap;
  const cellHeight = cellSize.height + gap;
  const totalWidth = columns * cellWidth;
  const totalHeight = rows * cellHeight;

  // Generate vertical lines
  const verticalLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let i = 0; i <= columns; i++) {
      const x = i * cellWidth;
      lines.push(
        <line
          key={`v-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={totalHeight}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      );
    }
    return lines;
  }, [columns, cellWidth, totalHeight]);

  // Generate horizontal lines
  const horizontalLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let i = 0; i <= rows; i++) {
      const y = i * cellHeight;
      lines.push(
        <line
          key={`h-${i}`}
          x1={0}
          y1={y}
          x2={totalWidth}
          y2={y}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="1"
        />
      );
    }
    return lines;
  }, [rows, cellHeight, totalWidth]);

  return (
    <svg
      className="grid-lines"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      {verticalLines}
      {horizontalLines}
    </svg>
  );
};
