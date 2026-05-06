/**
 * SpriteClipOverlay — Rendu visuel d'un clip sprite sur la timeline
 * Affiche l'orientation, l'animation, et le style du sprite.
 */
import React from 'react';
import type { SpriteClipConfig } from '@/types';
import { PersonStanding, Gamepad2 } from 'lucide-react';

interface SpriteClipOverlayProps {
  config?: SpriteClipConfig;
  width: number;
  height: number;
}

const ORIENTATION_LABELS: Record<string, string> = {
  n: '↑', ne: '↗', e: '→', se: '↘', s: '↓', sw: '↙', w: '←', nw: '↖',
};

const ANIMATION_COLORS: Record<string, string> = {
  idle: '#22c55e',
  walk: '#3b82f6',
  run: '#f59e0b',
  jump: '#8b5cf6',
  attack: '#ef4444',
  hurt: '#f97316',
  die: '#64748b',
};

export const SpriteClipOverlay: React.FC<SpriteClipOverlayProps> = ({
  config,
  width,
  height,
}) => {
  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
        <Gamepad2 className="w-4 h-4" />
      </div>
    );
  }

  const animColor = ANIMATION_COLORS[config.animation] || '#a1a1aa';
  const dirLabel = ORIENTATION_LABELS[config.orientation] || '●';

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.1))',
        borderLeft: `3px solid ${animColor}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        gap: '4px',
        pointerEvents: 'none',
      }}
    >
      <PersonStanding className="w-3.5 h-3.5" style={{ color: animColor, flexShrink: 0 }} />
      {width > 60 && (
        <span style={{ fontSize: '9px', fontWeight: 700, color: animColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {config.animation} {dirLabel}
        </span>
      )}
      {width > 100 && (
        <span style={{ fontSize: '8px', color: '#a1a1aa', opacity: 0.6, marginLeft: 'auto' }}>
          {config.style?.replace(/_/g, ' ')} · {config.frameRate}fps
        </span>
      )}
      {config.flipH && width > 60 && (
        <span style={{ fontSize: '8px', color: '#f59e0b', marginLeft: '2px' }}>↔</span>
      )}
    </div>
  );
};

export default SpriteClipOverlay;
