/**
 * ShotFrameViewer Component - View and edit individual shot frames
 * 
 * Part of Task 7.5 - Shot Frame Viewer (57% → 100%)
 * 
 * @module components/shot/ShotFrameViewer
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from './ui/tooltip';
import { 
  Play, 
  SkipBack, 
  SkipForward, 
  Copy, 
  Trash2, 
  Image, 
  MessageSquare, 
  X, 
  Plus 
} from 'lucide-react';
import './ShotFrameViewer.css';

// ============================================
// Types
// ============================================

export interface ShotFrame {
  id: string;
  name: string;
  type: ShotType;
  camera: CameraType;
  duration: number; // in seconds
  startFrame: number;
  endFrame: number;
  description: string;
  thumbnail?: string;
  metadata: Record<string, unknown>;
  notes: string[];
  tags: string[];
}

export type ShotType = 
  | 'establishing'
  | 'wide'
  | 'medium'
  | 'close_up'
  | 'extreme_close_up'
  | 'action'
  | 'reaction'
  | 'transition'
  | '插入'
  | 'POV'
  | 'over_the_shoulder'
  | 'low_angle'
  | 'high_angle'
  | 'drone'
  | 'static';

export type CameraType = 
  | 'wide'
  | 'tracking'
  | 'dynamic'
  | 'static'
  | 'handheld'
  | 'steadicam'
  | 'dolly'
  | 'crane'
  | 'zoom'
  | 'pan'
  | 'tilt'
  | 'push'
  | 'pull';

export interface ShotFrameViewerProps {
  /** The shot frame to display/edit */
  shot: ShotFrame;
  
  /** Current playback time in seconds */
  currentTime: number;
  
  /** Frame rate for calculations */
  frameRate: number;
  
  /** Whether the viewer is in read-only mode */
  readOnly?: boolean;
  
  /** Whether to show preview thumbnail */
  showPreview?: boolean;
  
  /** Callback when shot is modified */
  onChange: (shot: ShotFrame) => void;
  
  /** Callback when seeking to a specific time */
  onSeek: (time: number) => void;
  
  /** Callback when adding a note */
  onAddNote: (note: string) => void;
  
  /** Callback when removing a note */
  onRemoveNote: (noteIndex: number) => void;
  
  /** Callback when adding a tag */
  onAddTag: (tag: string) => void;
  
  /** Callback when removing a tag */
  onRemoveTag: (tagIndex: number) => void;
  
  /** Callback when deleting the shot */
  onDelete?: () => void;
  
  /** Callback when duplicating the shot */
  onDuplicate?: () => void;
  
  /** Custom CSS class */
  className?: string;
}

// ============================================
// Constants
// ============================================

const SHOT_TYPES: { value: ShotType; label: string; icon: string }[] = [
  { value: 'establishing', label: 'Establishing', icon: '🌆' },
  { value: 'wide', label: 'Wide Shot', icon: '🏔️' },
  { value: 'medium', label: 'Medium Shot', icon: '👤' },
  { value: 'close_up', label: 'Close-Up', icon: '👁️' },
  { value: 'extreme_close_up', label: 'Extreme Close-Up', icon: '🔍' },
  { value: 'action', label: 'Action', icon: '⚡' },
  { value: 'reaction', label: 'Reaction', icon: '😮' },
  { value: 'transition', label: 'Transition', icon: '🔄' },
  { value: '插入', label: '插入 (Insert)', icon: '📍' },
  { value: 'POV', label: 'POV', icon: '👓' },
  { value: 'over_the_shoulder', label: 'Over the Shoulder', icon: '👥' },
  { value: 'low_angle', label: 'Low Angle', icon: '⬆️' },
  { value: 'high_angle', label: 'High Angle', icon: '⬇️' },
  { value: 'drone', label: 'Drone', icon: '🚁' },
  { value: 'static', label: 'Static', icon: '📸' },
];

const CAMERA_TYPES: { value: CameraType; label: string }[] = [
  { value: 'wide', label: 'Wide' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'static', label: 'Static' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'steadicam', label: 'Steadicam' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'crane', label: 'Crane' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'pan', label: 'Pan' },
  { value: 'tilt', label: 'Tilt' },
  { value: 'push', label: 'Push In' },
  { value: 'pull', label: 'Pull Back' },
];

const DURATION_PRESETS = [
  { label: '2s', value: 2 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '8s', value: 8 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
];

// ============================================
// Component
// ============================================

export const ShotFrameViewer: React.FC<ShotFrameViewerProps> = ({
  shot,
  currentTime,
  frameRate = 30,
  readOnly = false,
  showPreview = true,
  onChange,
  onSeek,
  onAddNote,
  onRemoveNote,
  onAddTag,
  onRemoveTag,
  onDelete,
  onDuplicate,
  className,
}) => {
  // Local state
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState(shot.description);
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'notes' | 'metadata'>('info');
  
  // Computed values
  const currentFrame = Math.floor(currentTime * frameRate);
  const shotDuration = shot.endFrame - shot.startFrame;
  const progressPercent = Math.min(100, Math.max(0, 
    ((currentFrame - shot.startFrame) / shotDuration) * 100
  ));
  
  // Format timecode
  const formatTimecode = (frame: number) => {
    const totalSeconds = Math.floor(frame / frameRate);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const f = frame % frameRate;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${f.toString().padStart(2, '0')}`;
  };
  
  // Handlers
  const handleTypeChange = useCallback((value: string) => {
    onChange({ ...shot, type: value as ShotType });
  }, [shot, onChange]);
  
  const handleCameraChange = useCallback((value: string) => {
    onChange({ ...shot, camera: value as CameraType });
  }, [shot, onChange]);
  
  const handleDurationChange = useCallback((value: number[]) => {
    onChange({ 
      ...shot, 
      duration: value[0],
      endFrame: shot.startFrame + Math.floor(value[0] * frameRate)
    });
  }, [shot, frameRate, onChange]);
  
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...shot, name: e.target.value });
  }, [shot, onChange]);
  
  const handleDescriptionSave = useCallback(() => {
    onChange({ ...shot, description: descriptionInput });
    setIsEditingDescription(false);
  }, [shot, descriptionInput, onChange]);
  
  const handleAddNote = useCallback(() => {
    if (newNote.trim()) {
      onAddNote(newNote.trim());
      setNewNote('');
    }
  }, [newNote, onAddNote]);
  
  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !shot.tags.includes(newTag.trim())) {
      onAddTag(newTag.trim());
      setNewTag('');
    }
  }, [newTag, shot.tags, onAddTag]);
  
  const handleSeekToStart = useCallback(() => {
    onSeek(shot.startFrame / frameRate);
  }, [shot.startFrame, frameRate, onSeek]);
  
  const handleSeekToEnd = useCallback(() => {
    onSeek((shot.endFrame - 1) / frameRate);
  }, [shot.endFrame, frameRate, onSeek]);
  
  // Get shot type info
  const shotTypeInfo = useMemo(() => 
    SHOT_TYPES.find(st => st.value === shot.type) || SHOT_TYPES[0],
    [shot.type]
  );
  
  // Render preview thumbnail
  const renderPreview = (): React.ReactNode => {
    if (!showPreview) return null;
    
    return (
      <div className="shot-frame-viewer-preview">
        <div className="shot-frame-thumbnail">
          {shot.thumbnail ? (
            <img src={shot.thumbnail} alt={shot.name} />
          ) : (
            <div className="shot-frame-thumbnail-placeholder">
              <Image size={48} />
              <span>No Preview</span>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="shot-frame-progress">
          <div 
            className="shot-frame-progress-bar" 
            style={{ width: `${progressPercent}%` }}
          />
          <span className="shot-frame-progress-text">
            {formatTimecode(currentFrame)} / {formatTimecode(shot.endFrame - 1)}
          </span>
        </div>
        
        {/* Seek buttons */}
        <div className="shot-frame-seek-controls">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleSeekToStart}>
                  <SkipBack size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to start</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button variant="default" size="sm" onClick={() => onSeek(currentTime)}>
            <Play size={16} /> Play
          </Button>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={handleSeekToEnd}>
                  <SkipForward size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to end</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  };
  
  // Render info tab
  const renderInfoTab = (): React.ReactNode => (
    <div className="shot-frame-info-tab">
      {/* Name */}
      <div className="shot-frame-field">
        <label>Name</label>
        <Input
          value={shot.name}
          onChange={handleNameChange}
          disabled={readOnly}
          placeholder="Enter shot name..."
        />
      </div>
      
      {/* Type and Camera */}
      <div className="shot-frame-row">
        <div className="shot-frame-field">
          <label>Shot Type</label>
          <Select value={shot.type} onValueChange={handleTypeChange} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Select shot type" />
            </SelectTrigger>
            <SelectContent>
              {SHOT_TYPES.map(st => (
                <SelectItem key={st.value} value={st.value}>
                  {st.icon} {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="shot-frame-field">
          <label>Camera</label>
          <Select value={shot.camera} onValueChange={handleCameraChange} disabled={readOnly}>
            <SelectTrigger>
              <SelectValue placeholder="Select camera type" />
            </SelectTrigger>
            <SelectContent>
              {CAMERA_TYPES.map(ct => (
                <SelectItem key={ct.value} value={ct.value}>
                  {ct.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Duration */}
      <div className="shot-frame-field">
        <label>Duration ({shot.duration.toFixed(2)}s / {Math.ceil(shot.duration * frameRate)} frames)</label>
        <div className="shot-frame-duration-control">
          <Slider
            min={0.5}
            max={30}
            step={0.5}
            value={[shot.duration]}
            onValueChange={handleDurationChange}
            disabled={readOnly}
          />
          <div className="shot-frame-duration-presets">
            {DURATION_PRESETS.map(preset => (
              <Button
                key={preset.value}
                variant={Math.abs(shot.duration - preset.value) < 0.25 ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => onChange({ 
                  ...shot, 
                  duration: preset.value,
                  endFrame: shot.startFrame + Math.floor(preset.value * frameRate)
                })}
                disabled={readOnly}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Description */}
      <div className="shot-frame-field">
        <label>Description</label>
        {isEditingDescription ? (
          <div className="shot-frame-description-edit">
            <textarea
              value={descriptionInput}
              onChange={(e) => setDescriptionInput(e.target.value)}
              placeholder="Enter description..."
              rows={4}
            />
            <div className="shot-frame-description-actions">
              <Button variant="ghost" size="sm" onClick={() => setIsEditingDescription(false)}>
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleDescriptionSave}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="shot-frame-description-display"
            onClick={() => !readOnly && setIsEditingDescription(true)}
          >
            {shot.description || <em>No description</em>}
          </div>
        )}
      </div>
      
      {/* Tags */}
      <div className="shot-frame-field">
        <label>Tags</label>
        <div className="shot-frame-tags">
          {shot.tags.map((tag, index) => (
            <Badge key={index} variant="secondary">
              {tag}
              {!readOnly && (
                <button
                  className="tag-remove"
                  onClick={() => onRemoveTag(index)}
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={12} />
                </button>
              )}
            </Badge>
          ))}
          {!readOnly && (
            <div className="shot-frame-tag-input">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tag..."
                onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button variant="ghost" size="sm" onClick={handleAddTag}>
                <Plus size={16} />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  // Render notes tab
  const renderNotesTab = (): React.ReactNode => (
    <div className="shot-frame-notes-tab">
      <div className="shot-frame-notes-list">
        {shot.notes.length === 0 ? (
        <div className="shot-frame-notes-empty">
            <MessageSquare size={32} />
            <p>No notes yet</p>
          </div>
        ) : (
          shot.notes.map((note, index) => (
            <div key={index} className="shot-frame-note">
              <p>{note}</p>
              {!readOnly && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onRemoveNote(index)}
                  className="shot-frame-note-delete"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          ))
        )}
      </div>
      
      {!readOnly && (
        <div className="shot-frame-note-input">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleAddNote();
              }
            }}
          />
          <Button 
            variant="default" 
            onClick={handleAddNote}
            disabled={!newNote.trim()}
          >
            Add Note
          </Button>
        </div>
      )}
    </div>
  );
  
  // Render metadata tab
  const renderMetadataTab = (): React.ReactNode => (
    <div className="shot-frame-metadata-tab">
      <div className="shot-frame-metadata-grid">
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">ID</span>
          <span className="shot-frame-metadata-value">{shot.id}</span>
        </div>
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">Start Frame</span>
          <span className="shot-frame-metadata-value">{shot.startFrame}</span>
        </div>
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">End Frame</span>
          <span className="shot-frame-metadata-value">{shot.endFrame}</span>
        </div>
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">Frame Rate</span>
          <span className="shot-frame-metadata-value">{frameRate} fps</span>
        </div>
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">Total Frames</span>
          <span className="shot-frame-metadata-value">{shotDuration}</span>
        </div>
        <div className="shot-frame-metadata-item">
          <span className="shot-frame-metadata-label">Timecode</span>
          <span className="shot-frame-metadata-value">
            {formatTimecode(shot.startFrame)} - {formatTimecode(shot.endFrame - 1)}
          </span>
        </div>
      </div>
      
      {/* Custom metadata */}
      {Object.keys(shot.metadata).length > 0 && (
        <>
          <h4>Custom Metadata</h4>
          <div className="shot-frame-metadata-grid">
            {Object.entries(shot.metadata).map(([key, value]) => (
              <div key={key} className="shot-frame-metadata-item">
                <span className="shot-frame-metadata-label">{key}</span>
                <span className="shot-frame-metadata-value">{String(value)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
  
  return (
    <div className={`shot-frame-viewer ${className || ''}`}>
      {/* Header */}
      <div className="shot-frame-viewer-header">
        <div className="shot-frame-viewer-title">
          <span className="shot-frame-type-icon">{shotTypeInfo.icon}</span>
          <h3>{shot.name}</h3>
          <Badge variant="secondary">{formatTimecode(shot.startFrame)}</Badge>
        </div>
        
        <div className="shot-frame-viewer-actions">
          {onDuplicate && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onDuplicate}>
                    <Copy size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Duplicate shot</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onDelete} className="danger">
                    <Trash2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete shot</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      {/* Preview */}
      {renderPreview()}
      
      {/* Tabs */}
      <div className="shot-frame-viewer-tabs">
        <button
          className={'shot-frame-tab' + (activeTab === 'info' ? ' active' : '')}
          onClick={() => setActiveTab('info')}
        >
          Info
        </button>
        <button
          className={'shot-frame-tab' + (activeTab === 'notes' ? ' active' : '')}
          onClick={() => setActiveTab('notes')}
        >
          Notes ({shot.notes.length})
        </button>
        <button
          className={'shot-frame-tab' + (activeTab === 'metadata' ? ' active' : '')}
          onClick={() => setActiveTab('metadata')}
        >
          Metadata
        </button>
      </div>
      
      {/* Tab content */}
      <div className="shot-frame-viewer-content">
        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'notes' && renderNotesTab()}
        {activeTab === 'metadata' && renderMetadataTab()}
      </div>
    </div>
  );
};

export default ShotFrameViewer;

