import React, { useState } from 'react';
import { useStore } from '../store';
import type { Animation, Keyframe, Point } from '../types';
import { BezierCurveEditor } from './BezierCurveEditor';

interface AnimationPanelProps {
  shotId: string;
}

export const AnimationPanel: React.FC<AnimationPanelProps> = ({ shotId }) => {
  const shot = useStore((state) => state.shots.find((s) => s.id === shotId));
  const addAnimation = useStore((state) => state.addAnimation);
  const updateAnimation = useStore((state) => state.updateAnimation);
  const deleteAnimation = useStore((state) => state.deleteAnimation);

  const [selectedProperty, setSelectedProperty] = useState<
    'position' | 'scale' | 'rotation' | 'opacity'
  >('position');

  if (!shot) {
    return (
      <div className="p-4 text-gray-500">
        No shot selected. Select a shot to manage animations.
      </div>
    );
  }

  // Find animation for selected property
  const currentAnimation = shot.animations.find(
    (anim) => anim.property === selectedProperty
  );

  const handleAddAnimation = () => {
    if (currentAnimation) return; // Already exists

    const newAnimation: Animation = {
      id: `anim-${Date.now()}`,
      property: selectedProperty,
      keyframes: [],
    };

    addAnimation(shotId, newAnimation);
  };

  const handleDeleteAnimation = () => {
    if (!currentAnimation) return;
    deleteAnimation(shotId, currentAnimation.id);
  };

  const handleAddKeyframe = () => {
    if (!currentAnimation) return;

    const newKeyframe: Keyframe = {
      id: `keyframe-${Date.now()}`,
      time: 0,
      value: selectedProperty === 'position' ? { x: 0, y: 0 } : 1,
      easing: 'linear',
    };

    const updatedKeyframes = [...currentAnimation.keyframes, newKeyframe];
    updateAnimation(shotId, currentAnimation.id, { keyframes: updatedKeyframes });
  };

  const handleDeleteKeyframe = (keyframeId: string) => {
    if (!currentAnimation) return;

    const updatedKeyframes = currentAnimation.keyframes.filter(
      (kf) => kf.id !== keyframeId
    );
    updateAnimation(shotId, currentAnimation.id, { keyframes: updatedKeyframes });
  };

  const handleUpdateKeyframe = (
    keyframeId: string,
    updates: Partial<Keyframe>
  ) => {
    if (!currentAnimation) return;

    const updatedKeyframes = currentAnimation.keyframes.map((kf) =>
      kf.id === keyframeId ? { ...kf, ...updates } : kf
    );
    updateAnimation(shotId, currentAnimation.id, { keyframes: updatedKeyframes });
  };

  // Sort keyframes by time
  const sortedKeyframes = currentAnimation
    ? [...currentAnimation.keyframes].sort((a, b) => a.time - b.time)
    : [];

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Keyframe Animation</h3>
        <p className="text-sm text-gray-600">
          Animate shot properties over time using keyframes
        </p>
      </div>

      {/* Property Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Animated Property
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['position', 'scale', 'rotation', 'opacity'] as const).map(
            (property) => (
              <button
                key={property}
                onClick={() => setSelectedProperty(property)}
                className={`px-4 py-2 rounded border capitalize ${
                  selectedProperty === property
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {property}
              </button>
            )
          )}
        </div>
      </div>

      {/* Animation Controls */}
      <div className="border-t pt-4">
        {!currentAnimation ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No animation for {selectedProperty}
            </p>
            <button
              onClick={handleAddAnimation}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add Animation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {selectedProperty.charAt(0).toUpperCase() +
                  selectedProperty.slice(1)}{' '}
                Animation
              </h4>
              <button
                onClick={handleDeleteAnimation}
                className="px-3 py-1 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                Remove Animation
              </button>
            </div>

            {/* Keyframes List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Keyframes</label>
                <button
                  onClick={handleAddKeyframe}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Add Keyframe
                </button>
              </div>

              {sortedKeyframes.length === 0 ? (
                <div className="text-center py-4 text-gray-500 text-sm border border-dashed rounded">
                  No keyframes. Add a keyframe to start animating.
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedKeyframes.map((keyframe, index) => (
                    <KeyframeEditor
                      key={keyframe.id}
                      keyframe={keyframe}
                      index={index}
                      property={selectedProperty}
                      shotDuration={shot.duration}
                      onUpdate={(updates) =>
                        handleUpdateKeyframe(keyframe.id, updates)
                      }
                      onDelete={() => handleDeleteKeyframe(keyframe.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Keyframe Timeline Visualization */}
            {sortedKeyframes.length > 0 && (
              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">
                  Timeline
                </label>
                <KeyframeTimeline
                  keyframes={sortedKeyframes}
                  duration={shot.duration}
                  property={selectedProperty}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Keyframe Editor Component
interface KeyframeEditorProps {
  keyframe: Keyframe;
  index: number;
  property: 'position' | 'scale' | 'rotation' | 'opacity';
  shotDuration: number;
  onUpdate: (updates: Partial<Keyframe>) => void;
  onDelete: () => void;
}

const KeyframeEditor: React.FC<KeyframeEditorProps> = ({
  keyframe,
  index,
  property,
  shotDuration,
  onUpdate,
  onDelete,
}) => {
  const isPositionProperty = property === 'position';
  const value = keyframe.value as any;

  return (
    <div className="p-3 border rounded bg-gray-50 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Keyframe {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          Delete
        </button>
      </div>

      {/* Time */}
      <div>
        <label className="text-xs text-gray-600">Time (seconds)</label>
        <input
          type="number"
          min={0}
          max={shotDuration}
          step={0.1}
          value={keyframe.time}
          onChange={(e) => onUpdate({ time: parseFloat(e.target.value) })}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>

      {/* Value */}
      {isPositionProperty ? (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X</label>
            <input
              type="number"
              step={1}
              value={value.x}
              onChange={(e) =>
                onUpdate({ value: { ...value, x: parseFloat(e.target.value) } })
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y</label>
            <input
              type="number"
              step={1}
              value={value.y}
              onChange={(e) =>
                onUpdate({ value: { ...value, y: parseFloat(e.target.value) } })
              }
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="text-xs text-gray-600">
            {property === 'scale' && 'Scale'}
            {property === 'rotation' && 'Rotation (degrees)'}
            {property === 'opacity' && 'Opacity (0-1)'}
          </label>
          <input
            type="number"
            step={property === 'opacity' ? 0.1 : 1}
            min={property === 'opacity' ? 0 : undefined}
            max={property === 'opacity' ? 1 : undefined}
            value={value}
            onChange={(e) => onUpdate({ value: parseFloat(e.target.value) })}
            className="w-full px-2 py-1 text-sm border rounded"
          />
        </div>
      )}

      {/* Easing */}
      <div>
        <label className="text-xs text-gray-600">Easing</label>
        <select
          value={keyframe.easing}
          onChange={(e) =>
            onUpdate({
              easing: e.target.value as Keyframe['easing'],
            })
          }
          className="w-full px-2 py-1 text-sm border rounded"
        >
          <option value="linear">Linear</option>
          <option value="ease-in">Ease In</option>
          <option value="ease-out">Ease Out</option>
          <option value="ease-in-out">Ease In-Out</option>
          <option value="bezier">Bezier (Custom)</option>
        </select>
      </div>

      {/* Bezier Curve Editor */}
      {keyframe.easing === 'bezier' && (
        <div className="mt-2 p-2 border rounded bg-white">
          <BezierCurveEditor
            controlPoint1={
              keyframe.bezierControlPoints?.cp1 || { x: 0.25, y: 0.25 }
            }
            controlPoint2={
              keyframe.bezierControlPoints?.cp2 || { x: 0.75, y: 0.75 }
            }
            onChange={(cp1: Point, cp2: Point) =>
              onUpdate({
                bezierControlPoints: { cp1, cp2 },
              })
            }
          />
        </div>
      )}
    </div>
  );
};

// Keyframe Timeline Visualization
interface KeyframeTimelineProps {
  keyframes: Keyframe[];
  duration: number;
  property: 'position' | 'scale' | 'rotation' | 'opacity';
}

const KeyframeTimeline: React.FC<KeyframeTimelineProps> = ({
  keyframes,
  duration,
}) => {
  return (
    <div className="relative h-16 bg-gray-100 border rounded overflow-hidden">
      {/* Time markers */}
      <div className="absolute inset-0 flex">
        {Array.from({ length: Math.ceil(duration) + 1 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 border-r border-gray-300 relative"
            style={{ minWidth: '40px' }}
          >
            <span className="absolute bottom-0 left-1 text-xs text-gray-500">
              {i}s
            </span>
          </div>
        ))}
      </div>

      {/* Keyframe markers */}
      {keyframes.map((keyframe, index) => {
        const position = (keyframe.time / duration) * 100;
        return (
          <div
            key={keyframe.id}
            className="absolute top-2 w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md"
            style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            title={`Keyframe ${index + 1} at ${keyframe.time.toFixed(1)}s`}
          />
        );
      })}

      {/* Connection lines between keyframes */}
      {keyframes.length > 1 && (
        <svg className="absolute inset-0 pointer-events-none">
          {keyframes.slice(0, -1).map((keyframe, index) => {
            const nextKeyframe = keyframes[index + 1];
            const x1 = (keyframe.time / duration) * 100;
            const x2 = (nextKeyframe.time / duration) * 100;
            return (
              <line
                key={`line-${keyframe.id}`}
                x1={`${x1}%`}
                y1="50%"
                x2={`${x2}%`}
                y2="50%"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};
