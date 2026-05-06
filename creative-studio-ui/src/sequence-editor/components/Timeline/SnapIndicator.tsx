/**
 * SnapIndicator — Ligne de snap visuelle affichée pendant le drag
 * Overlay DOM positionné absolument au-dessus de la timeline.
 * Inspiré de LTX-Desktop.
 */
import React from 'react';

interface SnapIndicatorProps {
  /** Position X en pixels de la ligne de snap */
  position: number | null;
  /** Hauteur totale de la zone de snap */
  height?: number;
  /** La ligne est-elle active */
  active?: boolean;
}

export const SnapIndicator: React.FC<SnapIndicatorProps> = ({
  position,
  height = '100%',
  active = true,
}) => {
  if (position === null || !active) return null;

  return (
    <div
      className="snap-indicator-line"
      style={{
        left: `${position}px`,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      aria-hidden="true"
    />
  );
};

export default SnapIndicator;
