/**
 * CameraPresetControl Component
 * 
 * Provides preset camera angles and animations for 3D scene viewing.
 * Supports smooth transitions between preset views and auto-rotate functionality.
 * 
 * File: creative-studio-ui/src/components/scene/CameraPresetControl.tsx
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, RotateCcw, Play, Pause, Eye, View, Box, Layers } from 'lucide-react';
import type { Vector3 } from 'three';
import './CameraPresetControl.css';

// ============================================================================
// Types
// ============================================================================

/**
 * Camera preset configuration
 */
export interface CameraPreset {
  id: string;
  name: string;
  description: string;
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

/**
 * Props for the CameraPresetControl component
 */
export interface CameraPresetControlProps {
  /** Current camera position (for initial state) */
  currentPosition?: [number, number, number];
  
  /** Current camera target/look-at point */
  currentTarget?: [number, number, number];
  
  /** Handler for camera position changes */
  onCameraChange?: (position: [number, number, number], target: [number, number, number]) => void;
  
  /** Handler for auto-rotate toggle */
  onAutoRotateChange?: (enabled: boolean) => void;
  
  /** Handler for camera reset */
  onReset?: () => void;
}

// ============================================================================
// Camera Presets
// ============================================================================

/**
 * Predefined camera presets for different viewing angles
 */
export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: 'front',
    name: 'Front',
    description: 'View from the front (z+)',
    position: [0, 0, 10],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'back',
    name: 'Back',
    description: 'View from the back (z-)',
    position: [0, 0, -10],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'left',
    name: 'Left',
    description: 'View from the left (x+)',
    position: [10, 0, 0],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'right',
    name: 'Right',
    description: 'View from the right (x-)',
    position: [-10, 0, 0],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'top',
    name: 'Top',
    description: 'View from above (y+)',
    position: [0, 10, 0],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'bottom',
    name: 'Bottom',
    description: 'View from below (y-)',
    position: [0, -10, 0],
    target: [0, 0, 0],
    fov: 50,
  },
  {
    id: 'iso-front-left',
    name: 'ISO Front-Left',
    description: 'Isometric view from front-left',
    position: [8, 8, 8],
    target: [0, 0, 0],
    fov: 45,
  },
  {
    id: 'iso-front-right',
    name: 'ISO Front-Right',
    description: 'Isometric view from front-right',
    position: [-8, 8, 8],
    target: [0, 0, 0],
    fov: 45,
  },
  {
    id: 'iso-back-left',
    name: 'ISO Back-Left',
    description: 'Isometric view from back-left',
    position: [8, 8, -8],
    target: [0, 0, 0],
    fov: 45,
  },
  {
    id: 'iso-back-right',
    name: 'ISO Back-Right',
    description: 'Isometric view from back-right',
    position: [-8, 8, -8],
    target: [0, 0, 0],
    fov: 45,
  },
  {
    id: 'free',
    name: 'Free Orbit',
    description: 'Free camera movement (OrbitControls)',
    position: [5, 5, 5],
    target: [0, 0, 0],
    fov: 50,
  },
];

// ============================================================================
// Animation Helper
// ============================================================================

/**
 * Smoothly interpolate between two vectors
 */
function lerpVector3(
  start: [number, number, number],
  end: [number, number, number],
  t: number
): [number, number, number] {
  return [
    start[0] + (end[0] - start[0]) * t,
    start[1] + (end[1] - start[1]) * t,
    start[2] + (end[2] - start[2]) * t,
  ];
}

// ============================================================================
// Component
// ============================================================================

export function CameraPresetControl({
  currentPosition = [5, 5, 5],
  currentTarget = [0, 0, 0],
  onCameraChange,
  onAutoRotateChange,
  onReset,
}: CameraPresetControlProps) {
  const [activePreset, setActivePreset] = useState<string>('free');
  const [isAnimating, setIsAnimating] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const animationRef = useRef<number | null>(null);
  const targetPositionRef = useRef<[number, number, number]>(currentPosition);
  const startPositionRef = useRef<[number, number, number]>(currentPosition);
  const startTimeRef = useRef<number>(0);
  const animationDuration = 800; // ms

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  /**
   * Animate camera to a new position
   */
  const animateToPosition = useCallback(
    (newPosition: [number, number, number], newTarget: [number, number, number]) => {
      if (isAnimating) return;

      setIsAnimating(true);
      startPositionRef.current = currentPosition;
      targetPositionRef.current = newPosition;
      startTimeRef.current = performance.now();

      const animate = (timestamp: number) => {
        const elapsed = timestamp - startTimeRef.current;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const newPos = lerpVector3(startPositionRef.current, newPosition, eased);
        
        onCameraChange?.(newPos, newTarget);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    },
    [currentPosition, isAnimating, onCameraChange]
  );

  /**
   * Handle preset selection
   */
  const handlePresetSelect = useCallback(
    (presetId: string) => {
      const preset = CAMERA_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      setActivePreset(presetId);
      setShowDropdown(false);

      if (preset.id === 'free') {
        // For free mode, just set position without animation
        onCameraChange?.(preset.position, preset.target);
      } else {
        animateToPosition(preset.position, preset.target);
      }
    },
    [animateToPosition, onCameraChange]
  );

  /**
   * Handle auto-rotate toggle
   */
  const handleAutoRotateToggle = useCallback(() => {
    const newValue = !autoRotate;
    setAutoRotate(newValue);
    onAutoRotateChange?.(newValue);
  }, [autoRotate, onAutoRotateChange]);

  /**
   * Handle reset camera
   */
  const handleReset = useCallback(() => {
    const defaultPreset = CAMERA_PRESETS.find((p) => p.id === 'iso-front-left');
    if (defaultPreset) {
      handlePresetSelect('iso-front-left');
    }
    setAutoRotate(false);
    onAutoRotateChange?.(false);
    onReset?.();
  }, [handlePresetSelect, onAutoRotateChange, onReset]);

  const activePresetData = CAMERA_PRESETS.find((p) => p.id === activePreset);

  return (
    <div className="camera-preset-control">
      {/* Preset Dropdown */}
      <div className="camera-preset-control__dropdown">
        <button
          className="camera-preset-control__trigger"
          onClick={() => setShowDropdown(!showDropdown)}
          title="Select camera preset"
        >
          <Camera size={18} />
          <span className="camera-preset-control__label">
            {activePresetData?.name || 'Camera'}
          </span>
          <Eye size={14} className="camera-preset-control__icon" />
        </button>

        {showDropdown && (
          <div className="camera-preset-control__menu">
            {/* Standard Views */}
            <div className="camera-preset-control__section">
              <span className="camera-preset-control__section-title">Standard Views</span>
              {CAMERA_PRESETS.filter((p) => 
                ['front', 'back', 'left', 'right', 'top', 'bottom'].includes(p.id)
              ).map((preset) => (
                <button
                  key={preset.id}
                  className={`camera-preset-control__option ${
                    activePreset === preset.id ? 'camera-preset-control__option--active' : ''
                  }`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <View size={14} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Isometric Views */}
            <div className="camera-preset-control__section">
              <span className="camera-preset-control__section-title">Isometric Views</span>
              {CAMERA_PRESETS.filter((p) => p.id.startsWith('iso-')).map((preset) => (
                <button
                  key={preset.id}
                  className={`camera-preset-control__option ${
                    activePreset === preset.id ? 'camera-preset-control__option--active' : ''
                  }`}
                  onClick={() => handlePresetSelect(preset.id)}
                >
                  <Box size={14} />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>

            {/* Free Orbit */}
            <div className="camera-preset-control__section">
              <button
                className={`camera-preset-control__option ${
                  activePreset === 'free' ? 'camera-preset-control__option--active' : ''
                }`}
                onClick={() => handlePresetSelect('free')}
              >
                <Layers size={14} />
                <span>Free Orbit</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Auto Rotate Toggle */}
      <button
        className={`camera-preset-control__btn ${autoRotate ? 'camera-preset-control__btn--active' : ''}`}
        onClick={handleAutoRotateToggle}
        title={autoRotate ? 'Disable auto-rotate' : 'Enable auto-rotate'}
      >
        {autoRotate ? <Pause size={16} /> : <Play size={16} />}
      </button>

      {/* Reset Button */}
      <button
        className="camera-preset-control__btn"
        onClick={handleReset}
        title="Reset camera to default view"
        disabled={isAnimating}
      >
        <RotateCcw size={16} />
      </button>

      {/* Animation Indicator */}
      {isAnimating && (
        <span className="camera-preset-control__animating">
          Animating...
        </span>
      )}
    </div>
  );
}

export default CameraPresetControl;
