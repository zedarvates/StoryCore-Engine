/**
 * Orientation Selector Component
 * 
 * An interactive 8-direction selector for animated sprites.
 * Provides visual feedback and selection for N, NE, E, SE, S, SW, W, NW orientations.
 */

import React, { useCallback, useMemo } from 'react';
import { 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  ArrowUpLeft,
  Compass
} from 'lucide-react';

import {
  SpriteOrientation,
  SPRITE_ORIENTATIONS,
  ORIENTATION_ANGLES
} from '../../types/sprite';

// Simple cn utility
const cn = (...classes: (string | boolean | undefined)[]) => 
  classes.filter(Boolean).join(' ');

// ============================================================================
// Types
// ============================================================================

export interface OrientationSelectorProps {
  /** Currently selected orientation */
  value: SpriteOrientation;
  
  /** Callback when orientation changes */
  onChange: (orientation: SpriteOrientation) => void;
  
  /** Available orientations (all if not specified) */
  availableOrientations?: SpriteOrientation[];
  
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Show labels */
  showLabels?: boolean;
  
  /** Show angle indicator */
  showAngle?: boolean;
  
  /** Enable auto-orient mode */
  autoOrient?: boolean;
  
  /** Auto-orient movement vector */
  movementVector?: { x: number; y: number };
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Additional class name */
  className?: string;
  
  /** Compact mode (just arrows, no wheel) */
  compact?: boolean;
}

// ============================================================================
// Orientation Data
// ============================================================================

interface OrientationInfo {
  orientation: SpriteOrientation;
  label: string;
  angle: number;
  position: { row: number; col: number };
  icon: React.ReactNode;
}

const ORIENTATION_INFO: OrientationInfo[] = [
  {
    orientation: 'nw' as const,
    label: 'NW',
    angle: 135,
    position: { row: 0, col: 0 },
    icon: <ArrowUpLeft size={16} />
  },
  {
    orientation: 'n' as const,
    label: 'N',
    angle: 90,
    position: { row: 0, col: 1 },
    icon: <ChevronUp size={16} />
  },
  {
    orientation: 'ne' as const,
    label: 'NE',
    angle: 45,
    position: { row: 0, col: 2 },
    icon: <ArrowUpRight size={16} />
  },
  {
    orientation: 'w' as const,
    label: 'W',
    angle: 180,
    position: { row: 1, col: 0 },
    icon: <ChevronLeft size={16} />
  },
  {
    orientation: 's' as const,
    label: 'S',
    angle: 270,
    position: { row: 1, col: 1 },
    icon: <ChevronDown size={16} />
  },
  {
    orientation: 'e' as const,
    label: 'E',
    angle: 0,
    position: { row: 1, col: 2 },
    icon: <ChevronRight size={16} />
  },
  {
    orientation: 'sw' as const,
    label: 'SW',
    angle: 225,
    position: { row: 2, col: 0 },
    icon: <ArrowDownLeft size={16} />
  },
  {
    orientation: 'se' as const,
    label: 'SE',
    angle: 315,
    position: { row: 2, col: 2 },
    icon: <ArrowDownRight size={16} />
  }
];

// ============================================================================
// Styles
// ============================================================================

const SIZE_CONFIG = {
  sm: {
    button: 'w-7 h-7',
    icon: 'w-3 h-3',
    gap: 'gap-0.5',
    label: 'text-[10px]'
  },
  md: {
    button: 'w-9 h-9',
    icon: 'w-4 h-4',
    gap: 'gap-1',
    label: 'text-xs'
  },
  lg: {
    button: 'w-12 h-12',
    icon: 'w-5 h-5',
    gap: 'gap-1.5',
    label: 'text-sm'
  }
};

// ============================================================================
// Component
// ============================================================================

export const OrientationSelector: React.FC<OrientationSelectorProps> = ({
  value,
  onChange,
  availableOrientations,
  size = 'md',
  showLabels = true,
  showAngle = false,
  autoOrient = false,
  movementVector,
  disabled = false,
  className,
  compact = false
}) => {
  const sizeConfig = SIZE_CONFIG[size];

  // Check if orientation is available
  const isAvailable = useCallback((orientation: SpriteOrientation) => {
    if (!availableOrientations) return true;
    return availableOrientations.includes(orientation);
  }, [availableOrientations]);

  // Handle orientation click
  const handleOrientationClick = useCallback((orientation: SpriteOrientation) => {
    if (disabled || !isAvailable(orientation)) return;
    onChange(orientation);
  }, [disabled, isAvailable, onChange]);

  // Get current orientation info
  const currentInfo = useMemo(() => 
    ORIENTATION_INFO.find(info => info.orientation === value),
    [value]
  );

  // Render compact version
  if (compact) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <button
          onClick={() => {
            const currentIndex = SPRITE_ORIENTATIONS.indexOf(value);
            const prevIndex = (currentIndex - 1 + SPRITE_ORIENTATIONS.length) % SPRITE_ORIENTATIONS.length;
            handleOrientationClick(SPRITE_ORIENTATIONS[prevIndex]);
          }}
          className={cn(
            'p-1 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 min-w-[60px] justify-center',
          sizeConfig.label
        )}>
          <Compass className="w-3 h-3 text-violet-400" />
          <span className="font-medium">{currentInfo?.label}</span>
        </div>
        
        <button
          onClick={() => {
            const currentIndex = SPRITE_ORIENTATIONS.indexOf(value);
            const nextIndex = (currentIndex + 1) % SPRITE_ORIENTATIONS.length;
            handleOrientationClick(SPRITE_ORIENTATIONS[nextIndex]);
          }}
          className={cn(
            'p-1 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          disabled={disabled}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Render wheel version
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        <div className={cn('grid grid-cols-3', sizeConfig.gap)}>
          {ORIENTATION_INFO.map(info => {
            const isSelected = value === info.orientation;
            const available = isAvailable(info.orientation);

            return (
              <button
                key={info.orientation}
                onClick={() => handleOrientationClick(info.orientation)}
                disabled={disabled || !available}
                className={cn(
                  sizeConfig.button,
                  'flex items-center justify-center rounded-lg transition-all',
                  'border border-slate-600',
                  isSelected
                    ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-500/30'
                    : available
                      ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
                title={`${info.label} (${info.angle}°)${!available ? ' - Non disponible' : ''}`}
              >
                <span className={sizeConfig.icon}>{info.icon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {showLabels && (
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Compass className="w-4 h-4 text-violet-400" />
          <span className={cn('font-medium text-white', sizeConfig.label)}>
            {currentInfo?.label}
          </span>
          {showAngle && (
            <span className={cn('text-slate-500', sizeConfig.label)}>
              ({currentInfo?.angle}°)
            </span>
          )}
        </div>
      )}

      {autoOrient && movementVector && (
        <div className="flex items-center justify-center gap-1 text-xs text-slate-500">
          <span>Auto-orient</span>
          <span className="text-violet-400">
            ({movementVector.x.toFixed(2)}, {movementVector.y.toFixed(2)})
          </span>
        </div>
      )}

      <div className="flex items-center justify-center gap-1 pt-1">
        <button
          onClick={() => handleOrientationClick('n')}
          disabled={disabled}
          className={cn(
            'px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors',
            value === 'n' && 'bg-violet-600 hover:bg-violet-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          Nord
        </button>
        <button
          onClick={() => handleOrientationClick('s')}
          disabled={disabled}
          className={cn(
            'px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors',
            value === 's' && 'bg-violet-600 hover:bg-violet-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          Sud
        </button>
        <button
          onClick={() => handleOrientationClick('e')}
          disabled={disabled}
          className={cn(
            'px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors',
            value === 'e' && 'bg-violet-600 hover:bg-violet-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          Est
        </button>
        <button
          onClick={() => handleOrientationClick('w')}
          disabled={disabled}
          className={cn(
            'px-2 py-0.5 text-xs rounded bg-slate-700 hover:bg-slate-600 transition-colors',
            value === 'w' && 'bg-violet-600 hover:bg-violet-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          Ouest
        </button>
      </div>
    </div>
  );
};

export const OrientationSelectorCompact: React.FC<Omit<OrientationSelectorProps, 'compact'>> = (props) => (
  <OrientationSelector {...props} compact />
);

export const OrientationWheel: React.FC<OrientationSelectorProps> = ({
  value,
  onChange,
  availableOrientations,
  disabled = false,
  className
}) => {
  const wheelRadius = 60;
  const buttonRadius = 20;
  const centerOffset = wheelRadius + buttonRadius;

  const isAvailable = (orientation: SpriteOrientation) => {
    if (!availableOrientations) return true;
    return availableOrientations.includes(orientation);
  };

  return (
    <div className={cn('relative', className)} style={{ width: centerOffset * 2, height: centerOffset * 2 }}>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-700 border-2 border-violet-500 flex items-center justify-center">
        <Compass className="w-4 h-4 text-violet-400" />
      </div>

      {SPRITE_ORIENTATIONS.map(orientation => {
        const angle = ORIENTATION_ANGLES[orientation];
        const radians = (angle - 90) * (Math.PI / 180);
        
        const x = centerOffset + Math.cos(radians) * wheelRadius - buttonRadius;
        const y = centerOffset + Math.sin(radians) * wheelRadius - buttonRadius;

        const isSelected = value === orientation;
        const available = isAvailable(orientation);

        return (
          <button
            key={orientation}
            onClick={() => {
              if (!disabled && available) onChange(orientation);
            }}
            disabled={disabled || !available}
            className={cn(
              'absolute w-10 h-10 rounded-full flex items-center justify-center transition-all',
              'border-2 text-xs font-bold uppercase',
              isSelected
                ? 'bg-violet-600 border-violet-400 text-white scale-110 shadow-lg shadow-violet-500/50'
                : available
                  ? 'bg-slate-700 border-slate-500 text-slate-300 hover:bg-slate-600 hover:scale-105'
                  : 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              left: x,
              top: y
            }}
          >
            {orientation}
          </button>
        );
      })}

      <svg
        className="absolute inset-0 pointer-events-none"
        style={{ width: centerOffset * 2, height: centerOffset * 2 }}
      >
        <line
          x1={centerOffset}
          y1={centerOffset}
          x2={centerOffset + Math.cos((ORIENTATION_ANGLES[value] - 90) * (Math.PI / 180)) * wheelRadius}
          y2={centerOffset + Math.sin((ORIENTATION_ANGLES[value] - 90) * (Math.PI / 180)) * wheelRadius}
          stroke="rgb(139, 92, 246)"
          strokeWidth="2"
          strokeDasharray="4 2"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};

export default OrientationSelector;