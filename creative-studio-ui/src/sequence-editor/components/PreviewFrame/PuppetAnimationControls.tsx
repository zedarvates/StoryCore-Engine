/**
 * Puppet Animation Controls Component
 * 
 * Timeline-synced puppet animation with keyframe markers and pose presets.
 * Requirements: 9.1, 9.2
 */

import React, { useState, useCallback } from 'react';
import './puppetAnimationControls.css';

interface PuppetKeyframe {
  frame: number;
  pose: string;
  joints: Record<string, { x: number; y: number; z: number }>;
}

interface PuppetAnimationControlsProps {
  currentFrame: number;
  puppetId: string;
  onKeyframeAdd: (keyframe: PuppetKeyframe) => void;
  onKeyframeRemove: (frame: number) => void;
  keyframes: PuppetKeyframe[];
}

const POSE_PRESETS = {
  idle: {
    description: 'Neutral standing pose',
    joints: {
      'left-shoulder': { x: 0, y: 0, z: 0 },
      'right-shoulder': { x: 0, y: 0, z: 0 },
      'left-elbow': { x: 0, y: 0, z: 0 },
      'right-elbow': { x: 0, y: 0, z: 0 },
    },
  },
  walking: {
    description: 'Walking forward motion',
    joints: {
      'left-shoulder': { x: 0.3, y: 0, z: 0 },
      'right-shoulder': { x: -0.3, y: 0, z: 0 },
      'left-hip': { x: -0.2, y: 0, z: 0 },
      'right-hip': { x: 0.2, y: 0, z: 0 },
    },
  },
  running: {
    description: 'Running motion',
    joints: {
      'left-shoulder': { x: 0.5, y: 0, z: 0 },
      'right-shoulder': { x: -0.5, y: 0, z: 0 },
      'left-hip': { x: -0.4, y: 0, z: 0 },
      'right-hip': { x: 0.4, y: 0, z: 0 },
    },
  },
  sitting: {
    description: 'Sitting position',
    joints: {
      'left-hip': { x: 0, y: -0.5, z: 0 },
      'right-hip': { x: 0, y: -0.5, z: 0 },
      'left-knee': { x: 0.5, y: 0, z: 0 },
      'right-knee': { x: 0.5, y: 0, z: 0 },
    },
  },
  waving: {
    description: 'Waving hand gesture',
    joints: {
      'right-shoulder': { x: 0, y: 0.8, z: 0 },
      'right-elbow': { x: 0, y: 0.5, z: 0 },
      'right-hand': { x: 0, y: 0.3, z: 0 },
    },
  },
  pointing: {
    description: 'Pointing forward',
    joints: {
      'right-shoulder': { x: 0, y: 0.3, z: 0 },
      'right-elbow': { x: 0, y: 0, z: 0 },
      'right-hand': { x: 0, y: 0, z: 0.5 },
    },
  },
  thinking: {
    description: 'Thinking pose with hand on chin',
    joints: {
      'right-shoulder': { x: 0, y: 0.5, z: 0 },
      'right-elbow': { x: 0.3, y: 0, z: 0 },
      'head': { x: 0, y: 0.2, z: 0 },
    },
  },
  celebrating: {
    description: 'Celebrating with arms raised',
    joints: {
      'left-shoulder': { x: 0, y: 1.2, z: 0 },
      'right-shoulder': { x: 0, y: 1.2, z: 0 },
      'left-elbow': { x: 0, y: 0.5, z: 0 },
      'right-elbow': { x: 0, y: 0.5, z: 0 },
    },
  },
};

const ANIMATION_TEMPLATES = [
  {
    id: 'walk-cycle',
    name: 'Walk Cycle',
    description: '4-frame walking animation',
    frames: [
      { frame: 0, pose: 'walking' },
      { frame: 6, pose: 'idle' },
      { frame: 12, pose: 'walking' },
      { frame: 18, pose: 'idle' },
    ],
  },
  {
    id: 'wave-hello',
    name: 'Wave Hello',
    description: 'Friendly waving gesture',
    frames: [
      { frame: 0, pose: 'idle' },
      { frame: 6, pose: 'waving' },
      { frame: 12, pose: 'idle' },
    ],
  },
  {
    id: 'sit-down',
    name: 'Sit Down',
    description: 'Sitting down animation',
    frames: [
      { frame: 0, pose: 'idle' },
      { frame: 12, pose: 'sitting' },
    ],
  },
];

export const PuppetAnimationControls: React.FC<PuppetAnimationControlsProps> = ({
  currentFrame,
  puppetId,
  onKeyframeAdd,
  onKeyframeRemove,
  keyframes,
}) => {
  const [selectedPose, setSelectedPose] = useState<string>('idle');
  const [showTemplates, setShowTemplates] = useState(false);
  const [expressionIntensity, setExpressionIntensity] = useState(50);
  const [selectedExpression, setSelectedExpression] = useState<string>('neutral');
  
  // Check if there's a keyframe at current frame
  const currentKeyframe = keyframes.find((kf) => kf.frame === currentFrame);
  
  // Add keyframe at current frame
  const handleAddKeyframe = useCallback(() => {
    const poseData = POSE_PRESETS[selectedPose as keyof typeof POSE_PRESETS];
    if (!poseData) return;
    
    const keyframe: PuppetKeyframe = {
      frame: currentFrame,
      pose: selectedPose,
      joints: poseData.joints,
    };
    
    onKeyframeAdd(keyframe);
  }, [currentFrame, selectedPose, onKeyframeAdd]);
  
  // Remove keyframe at current frame
  const handleRemoveKeyframe = useCallback(() => {
    if (currentKeyframe) {
      onKeyframeRemove(currentKeyframe.frame);
    }
  }, [currentKeyframe, onKeyframeRemove]);
  
  // Apply animation template
  const handleApplyTemplate = useCallback((templateId: string) => {
    const template = ANIMATION_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    
    template.frames.forEach((frameData) => {
      const poseData = POSE_PRESETS[frameData.pose as keyof typeof POSE_PRESETS];
      if (poseData) {
        const keyframe: PuppetKeyframe = {
          frame: currentFrame + frameData.frame,
          pose: frameData.pose,
          joints: poseData.joints,
        };
        onKeyframeAdd(keyframe);
      }
    });
    
    setShowTemplates(false);
  }, [currentFrame, onKeyframeAdd]);
  
  return (
    <div className="puppet-animation-controls">
      <h4>Animation Controls</h4>
      
      {/* Keyframe Controls */}
      <div className="control-section">
        <label className="section-label">Keyframe at Frame {currentFrame}</label>
        <div className="keyframe-buttons">
          {currentKeyframe ? (
            <>
              <div className="keyframe-info">
                <span className="keyframe-indicator">●</span>
                <span className="keyframe-pose">{currentKeyframe.pose}</span>
              </div>
              <button
                className="keyframe-btn remove"
                onClick={handleRemoveKeyframe}
                title="Remove keyframe"
              >
                Remove Keyframe
              </button>
            </>
          ) : (
            <button
              className="keyframe-btn add"
              onClick={handleAddKeyframe}
              title="Add keyframe at current frame"
            >
              + Add Keyframe
            </button>
          )}
        </div>
      </div>
      
      {/* Pose Presets */}
      <div className="control-section">
        <label className="section-label">Pose Preset</label>
        <select
          className="pose-preset-select"
          value={selectedPose}
          onChange={(e) => setSelectedPose(e.target.value)}
        >
          {Object.entries(POSE_PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {key.charAt(0).toUpperCase() + key.slice(1)} - {preset.description}
            </option>
          ))}
        </select>
      </div>
      
      {/* Animation Templates */}
      <div className="control-section">
        <label className="section-label">Animation Templates</label>
        <button
          className="template-toggle-btn"
          onClick={() => setShowTemplates(!showTemplates)}
        >
          {showTemplates ? 'Hide Templates' : 'Show Templates'}
        </button>
        
        {showTemplates && (
          <div className="template-list">
            {ANIMATION_TEMPLATES.map((template) => (
              <div key={template.id} className="template-item">
                <div className="template-info">
                  <span className="template-name">{template.name}</span>
                  <span className="template-description">{template.description}</span>
                </div>
                <button
                  className="template-apply-btn"
                  onClick={() => handleApplyTemplate(template.id)}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Facial Expression Controls */}
      <div className="control-section">
        <label className="section-label">Facial Expression</label>
        <select
          className="expression-select"
          value={selectedExpression}
          onChange={(e) => setSelectedExpression(e.target.value)}
        >
          <option value="neutral">Neutral</option>
          <option value="happy">Happy</option>
          <option value="sad">Sad</option>
          <option value="angry">Angry</option>
          <option value="surprised">Surprised</option>
          <option value="confused">Confused</option>
          <option value="excited">Excited</option>
        </select>
        
        <div className="expression-intensity">
          <label>Intensity:</label>
          <input
            type="range"
            min="0"
            max="100"
            value={expressionIntensity}
            onChange={(e) => setExpressionIntensity(parseInt(e.target.value))}
          />
          <span className="intensity-value">{expressionIntensity}%</span>
        </div>
      </div>
      
      {/* Keyframe Timeline */}
      <div className="control-section">
        <label className="section-label">Keyframes ({keyframes.length})</label>
        <div className="keyframe-timeline">
          {keyframes.length === 0 ? (
            <div className="no-keyframes">No keyframes yet</div>
          ) : (
            <div className="keyframe-list">
              {keyframes.map((kf) => (
                <div
                  key={kf.frame}
                  className={`keyframe-item ${kf.frame === currentFrame ? 'current' : ''}`}
                >
                  <span className="keyframe-frame">Frame {kf.frame}</span>
                  <span className="keyframe-pose-name">{kf.pose}</span>
                  <button
                    className="keyframe-remove-btn"
                    onClick={() => onKeyframeRemove(kf.frame)}
                    title="Remove keyframe"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PuppetAnimationControls;
