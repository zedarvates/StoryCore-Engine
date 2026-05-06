/**
 * Scene3DClipOverlay — Rendu visuel d'un clip scène 3D sur la timeline
 * Affiche les infos de caméra, environnement, et keyframes 3D.
 */
import React from 'react';
import type { Scene3DClipConfig } from '@/types';
import { Box, Camera } from 'lucide-react';

interface Scene3DClipOverlayProps {
  config?: Scene3DClipConfig;
  width: number;
  height: number;
}

const ENV_PRESET_COLORS: Record<string, string> = {
  studio: '#a78bfa',
  outdoor: '#22c55e',
  night: '#3b82f6',
  sunset: '#f59e0b',
  default: '#a1a1aa',
};

export const Scene3DClipOverlay: React.FC<Scene3DClipOverlayProps> = ({
  config,
  width,
  height,
}) => {
  if (!config) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.3 }}>
        <Box className="w-4 h-4" />
      </div>
    );
  }

  const envColor = ENV_PRESET_COLORS[config.environmentPreset || ''] || ENV_PRESET_COLORS.default;
  const hasKeyframes = config.keyframes && config.keyframes.length > 0;
  const kfCount = config.keyframes?.length ?? 0;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(234,179,8,0.08))',
        borderLeft: `3px solid ${envColor}`,
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 6px',
        gap: '4px',
        pointerEvents: 'none',
      }}
    >
      <Box className="w-3.5 h-3.5" style={{ color: envColor, flexShrink: 0 }} />
      {width > 60 && (
        <Camera className="w-3 h-3" style={{ color: '#f97316', opacity: 0.7 }} />
      )}
      {width > 80 && (
        <span style={{ fontSize: '9px', fontWeight: 600, color: '#fdba74', whiteSpace: 'nowrap' }}>
          {config.environmentPreset || 'Scene 3D'}
        </span>
      )}
      {hasKeyframes && width > 100 && (
        <span style={{ fontSize: '8px', color: '#f59e0b', marginLeft: 'auto', fontWeight: 700 }}>
          ◆{kfCount} KF
        </span>
      )}
      {config.gltfPath && width > 120 && (
        <span style={{ fontSize: '7px', color: '#71717a', opacity: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60px' }}>
          {config.gltfPath.split('/').pop()?.split('\\').pop()}
        </span>
      )}
    </div>
  );
};

export default Scene3DClipOverlay;
