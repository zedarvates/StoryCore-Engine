/**
 * CrossDissolveOverlay — UI de création de cross-dissolve entre deux clips adjacents
 * Apparait au survol du point de coupe entre deux clips sur la meme piste.
 * Inspiré de LTX-Desktop.
 */
import React, { useState, useCallback } from 'react';

interface CrossDissolveOverlayProps {
  /** Position X en pixels du point de coupe */
  cutPointPx: number;
  /** Hauteur du track en pixels */
  trackHeight: number;
  /** Durée de transition recommandée (frames) */
  defaultDuration?: number;
  /** Callback pour créer la transition */
  onAddDissolve: (duration: number) => void;
  /** Callback pour supprimer une transition existante */
  onRemoveDissolve?: () => void;
  /** Une transition existe-t-elle déjà ? */
  hasExisting?: boolean;
  /** Désactivé ? */
  disabled?: boolean;
}

export const CrossDissolveOverlay: React.FC<CrossDissolveOverlayProps> = ({
  cutPointPx,
  trackHeight,
  defaultDuration = 12,
  onAddDissolve,
  onRemoveDissolve,
  hasExisting = false,
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) setIsHovered(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleAdd = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAddDissolve(defaultDuration);
  }, [onAddDissolve, defaultDuration]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemoveDissolve?.();
  }, [onRemoveDissolve]);

  // Zone de hit : 12px de large centrée sur le point de coupe
  const hitWidth = 12;
  const left = cutPointPx - hitWidth / 2;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${left}px`,
        top: 2,
        width: `${hitWidth}px`,
        height: `${trackHeight - 4}px`,
        zIndex: isHovered ? 90 : 25,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Indicateur de point de coupe toujours visible */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          width: '1px',
          height: '100%',
          background: 'rgba(255, 255, 255, 0.08)',
          transform: 'translateX(-50%)',
        }}
      />

      {/* Bouton Dissolve au survol */}
      {isHovered && !disabled && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            gap: '4px',
            background: 'rgba(0, 0, 0, 0.85)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '6px',
            padding: '2px 6px',
            whiteSpace: 'nowrap',
            zIndex: 100,
          }}
        >
          {hasExisting ? (
            <button
              onClick={handleRemove}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px',
              }}
              title="Supprimer la transition"
            >
              ✕ Dissolve
            </button>
          ) : (
            <button
              onClick={handleAdd}
              style={{
                background: 'rgba(139, 92, 246, 0.2)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                color: '#a78bfa',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                padding: '2px 6px',
                borderRadius: '3px',
              }}
              title={`Ajouter cross-dissolve (${defaultDuration}f ≈ ${(defaultDuration / 24).toFixed(1)}s)`}
            >
              + Dissolve
            </button>
          )}
        </div>
      )}

      {/* Zone colorée de la transition (si existante) */}
      {hasExisting && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.4), rgba(139,92,246,0.15), rgba(0,0,0,0.4))',
            pointerEvents: 'none',
          }}
        />
      )}
    </div>
  );
};

export default CrossDissolveOverlay;
