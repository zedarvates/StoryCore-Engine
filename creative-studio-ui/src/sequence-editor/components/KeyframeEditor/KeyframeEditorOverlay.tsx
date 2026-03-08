import React from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { setActiveKeyframeEditor, addKeyframe, removeKeyframe, updateKeyframe } from '../../store/slices/timelineSlice';
import { KeyframeEditor } from './KeyframeEditor';
import type { TimelineKeyframe } from '../../types';
import './keyframeEditor.css';

export const KeyframeEditorOverlay: React.FC = () => {
  const dispatch = useAppDispatch();
  const activeEditor = useAppSelector(state => state.timeline.activeKeyframeEditor);
  const shots = useAppSelector(state => state.timeline.shots);

  if (!activeEditor) return null;

  const { shotId, layerId, property } = activeEditor;
  const shot = shots.find(s => s.id === shotId);
  const layer = shot?.layers.find(l => l.id === layerId);
  const keyframes = layer?.animations?.[property] || [];

  const handleClose = () => {
    dispatch(setActiveKeyframeEditor(undefined));
  };

  const handleUpdateKeyframe = (id: string, updates: Partial<TimelineKeyframe>) => {
    dispatch(updateKeyframe({ shotId, layerId, property, id, updates }));
  };

  const handleAddKeyframe = (time: number, value: number) => {
    // Generate an ID for the new keyframe
    const keyframe: TimelineKeyframe = { id: '', time, value, easing: 'linear' };
    dispatch(addKeyframe({ shotId, layerId, property, keyframe }));
  };

  const handleRemoveKeyframe = (id: string) => {
    dispatch(removeKeyframe({ shotId, layerId, property, id }));
  };

  return (
    <div className="keyframe-editor-overlay">
      <div className="keyframe-editor-modal">
        <div className="keyframe-editor-header">
          <h3>Keyframe Editor: {property}</h3>
          <button className="close-button" onClick={handleClose}>×</button>
        </div>
        <div className="keyframe-editor-content">
          <KeyframeEditor
            keyframes={keyframes as any}
            onUpdateKeyframe={handleUpdateKeyframe as any}
            onAddKeyframe={handleAddKeyframe}
            onRemoveKeyframe={handleRemoveKeyframe}
            propertyName={property}
          />
        </div>
      </div>
    </div>
  );
};
