import { useRef, useEffect, useState, useCallback, useMemo, memo } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSequencePlanStore, useCurrentPlanShots, useSequencePlanActions } from '@/stores/sequencePlanStore';
import { useAppStore } from '@/stores/useAppStore';
import type { Shot } from '../types';
import { referenceInheritanceService } from '@/services/referenceInheritanceService';
import { consistencyEngine } from '@/services/consistencyEngine';
import type { ConsistencyScore, ConsistencyIssue } from '@/services/consistencyEngine';
import type { ShotReference, ConsistencyOverride } from '@/types/reference';
import {
  Clock, Play, Pause, SkipBack, SkipForward, FolderOpen, Layers,
  Plus, ZoomIn, ZoomOut, Grid3X3, MousePointer2, RefreshCw,
  CheckCircle, AlertTriangle, Eye, EyeOff, Link2, Link2Off,
  Copy, Clipboard, Wand2, Palette, Edit3, Settings, MessageSquare,
  Upload, Download, Trash2, Image, Scissors, Link, WandSparkles
} from 'lucide-react';
import { ShotThumbnail } from './timeline/ShotThumbnail';
import { PerformanceMonitor } from './timeline/PerformanceMonitor';

// Constants for timeline rendering
const BASE_PIXELS_PER_SECOND = 50; // 50 pixels = 1 second at zoom 1x
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const DEFAULT_ZOOM = 1;
const TIMELINE_HEIGHT = 200;
const SHOT_TRACK_HEIGHT = 60;
const AUDIO_TRACK_HEIGHT = 40;
const TIME_MARKER_HEIGHT = 30;
const PLAYHEAD_COLOR = '#ef4444'; // red-500
const SNAP_GRID_SIZE = 1; // Snap to 1 second intervals

// ============================================================================
// Timeline Context Menu Action Types
// ============================================================================

/**
 * Timeline action types for context menu operations
 */
type TimelineAction =
  | 'set_reference'
  | 'copy_references'
  | 'paste_references'
  | 'regenerate'
  | 'regenerate_variations'
  | 'regenerate_style_transfer'
  | 'edit_manually'
  | 'adjust_parameters'
  | 'add_comment'
  | 'replace_asset'
  | 'duplicate_asset'
  | 'export_asset'
  | 'delete_shot'
  | 'delete_asset_only';

/**
 * Context menu item interface
 */
interface ContextMenuItem {
  action: TimelineAction;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

// Calculate pixels per second based on zoom level
const getPixelsPerSecond = (zoom: number) => BASE_PIXELS_PER_SECOND * zoom;

// DnD item types
const ItemTypes = {
  TIMELINE_SHOT: 'TIMELINE_SHOT',
};

// ============================================================================
// Inheritance Status Types for Timeline Indicators
// ============================================================================

/**
 * Inheritance status for a shot displayed in the timeline
 */
interface InheritanceStatus {
  shotId: string;
  hasMasterRefs: boolean;
  hasSequenceRefs: boolean;
  localRefCount: number;
  inheritedRefCount: number;
  consistencyScore: number;
  hasOverrides: boolean;
  issueCount: number;
}

/**
 * Get color class based on consistency score
 */
function getConsistencyColorClass(score: number): string {
  if (score >= 90) return 'text-green-400';
  if (score >= 70) return 'text-yellow-400';
  if (score >= 50) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get border color class based on consistency score
 */
function getConsistencyBorderClass(score: number): string {
  if (score >= 90) return 'border-green-500';
  if (score >= 70) return 'border-yellow-500';
  if (score >= 50) return 'border-orange-500';
  return 'border-red-500';
}

/**
 * Get background color class based on consistency score
 */
function getConsistencyBgClass(score: number): string {
  if (score >= 90) return 'bg-green-500';
  if (score >= 70) return 'bg-yellow-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-500';
}

interface TimelineProps {
  className?: string;
  selectedShotId?: string | null;
  selectedShotIds?: string[];
  multiSelectMode?: boolean;
  onShotSelect?: (shotId: string | null) => void;
  onMultiShotSelect?: (shotIds: string[]) => void;
  onOpenPlansPanel?: () => void;
}

interface TimelineShotProps {
  shot: Shot;
  startX: number;
  width: number;
  transitionWidth: number;
  index: number;
  isSelected: boolean;
  isMultiSelected: boolean;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onDurationChange: (shotId: string, newDuration: number, trim?: { inPoint?: number; outPoint?: number }) => void;
  onSelect: (shotId: string, event: React.MouseEvent) => void;
  onContextMenu?: (shotId: string, x: number, y: number) => void;
}

// Timeline Shot Component with drag-and-drop (Optimized with React.memo)
const TimelineShot = memo<TimelineShotProps>(({
  shot,
  startX,
  width,
  transitionWidth,
  index,
  isSelected,
  isMultiSelected,
  onReorder,
  onDurationChange,
  onSelect,
  onContextMenu,
}) => {
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);
  const [resizeStartInPoint, setResizeStartInPoint] = useState(0);
  const [resizeStartOutPoint, setResizeStartOutPoint] = useState(0);

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.TIMELINE_SHOT,
    item: { id: shot.id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.TIMELINE_SHOT,
    hover: (item: { id: string; index: number }) => {
      if (item.index !== index) {
        onReorder(item.index, index);
        item.index = index;
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Handle resize start - memoized to prevent recreation
  const handleResizeStart = useCallback((e: React.MouseEvent, direction: 'left' | 'right') => {
    e.stopPropagation();
    setIsResizing(direction);
    setResizeStartX(e.clientX);
    setResizeStartWidth(width);
    setResizeStartInPoint(shot.metadata?.inPoint || 0);
    setResizeStartOutPoint(shot.metadata?.outPoint || shot.duration);
  }, [width, shot.metadata, shot.duration]);

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const pps = BASE_PIXELS_PER_SECOND;

      if (isResizing === 'right') {
        const newWidth = Math.max(pps, resizeStartWidth + deltaX);
        const newDuration = newWidth / pps;
        const newOutPoint = resizeStartInPoint + newDuration;

        onDurationChange(shot.id, Math.round(newDuration * 10) / 10, {
          outPoint: Math.round(newOutPoint * 10) / 10
        });
      } else if (isResizing === 'left') {
        const newWidth = Math.max(pps, resizeStartWidth - deltaX);
        const newDuration = newWidth / pps;
        const newInPoint = Math.max(0, resizeStartOutPoint - newDuration);

        onDurationChange(shot.id, Math.round(newDuration * 10) / 10, {
          inPoint: Math.round(newInPoint * 10) / 10
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth, resizeStartInPoint, resizeStartOutPoint, shot.id, onDurationChange]);

  // Memoize border style calculation
  const borderStyle = useMemo(() => {
    if (isMultiSelected) {
      return 'border-purple-400 border-2'; // Purple for multi-selection
    }
    if (isSelected) {
      return 'border-primary border-2'; // Primary for single selection
    }
    return 'border-blue-400'; // Default
  }, [isMultiSelected, isSelected]);

  // Memoize ring style calculation
  const ringStyle = useMemo(() => {
    if (isMultiSelected) {
      return 'ring-2 ring-purple-400'; // Purple ring for multi-selection
    }
    if (isSelected) {
      return 'ring-2 ring-primary'; // Primary ring for single selection
    }
    return '';
  }, [isMultiSelected, isSelected]);

  // Memoize click handler
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(shot.id, e);
  }, [shot.id, onSelect]);

  // Memoize context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onContextMenu) {
      onContextMenu(shot.id, e.clientX, e.clientY);
    }
  }, [shot.id, onContextMenu]);

  return (
    <div ref={(node) => {
      drag(drop(node));
    }}>
      <div
        className={`absolute top-0 cursor-move group ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-blue-400' : ''
          } ${ringStyle}`}
        style={{
          left: startX,
          width: width,
          height: SHOT_TRACK_HEIGHT,
        }}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className={`h-full bg-blue-600 hover:bg-blue-500 border rounded overflow-hidden transition-colors relative ${borderStyle}`}>
          {/* Thumbnail Background - Async loaded */}
          {shot.image && (
            <div className="absolute inset-0">
              <ShotThumbnail
                imageUrl={shot.image}
                videoUrl={undefined}
                timestamp={0}
                alt={shot.title}
                className="w-full h-full opacity-40"
              />
              {/* Gradient overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-transparent" />
            </div>
          )}

          {/* Content */}
          <div className="relative h-full flex flex-col justify-center px-2">
            <div className="text-xs font-semibold text-white truncate">{shot.title}</div>
            <div className="text-xs text-blue-100 truncate">{shot.duration}s</div>
            {shot.audioTracks.length > 0 && (
              <div className="text-xs text-blue-200">
                🔊 {shot.audioTracks.length} track{shot.audioTracks.length > 1 ? 's' : ''}
              </div>
            )}
          </div>

          {/* Multi-selection indicator badge */}
          {isMultiSelected && (
            <div className="absolute top-1 right-1 bg-purple-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
              ✓
            </div>
          )}

          {/* Inheritance Status Indicator - Bottom left corner badge */}
          {/* These dots show inheritance source (Master=Yellow, Sequence=Blue) */}
          <div className="absolute bottom-1 left-1 flex items-center gap-0.5 opacity-60">
            {/* Master reference indicator - yellow */}
            <div
              className="w-2 h-2 rounded-full bg-yellow-500"
              title="Master reference - inherited from project master sheet"
            />
            {/* Sequence reference indicator - blue */}
            <div
              className="w-2 h-2 rounded-full bg-blue-500"
              title="Sequence reference - inherited from sequence sheet"
            />
          </div>

          {/* Consistency indicator - Bottom right corner */}
          <div className="absolute bottom-1 right-1 opacity-60">
            <div
              className="w-2 h-2 rounded-full bg-green-500"
              title="Visual consistency score"
            />
          </div>

          {/* Resize Handles */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={(e) => handleResizeStart(e, 'left')}
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={(e) => handleResizeStart(e, 'right')}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Transition Indicator */}
      {shot.transitionOut && transitionWidth > 0 && (
        <div
          className="absolute top-0"
          style={{
            left: startX + width,
            width: transitionWidth,
            height: SHOT_TRACK_HEIGHT,
          }}
        >
          <div className="h-full bg-purple-600 border border-purple-400 rounded flex items-center justify-center">
            <span className="text-xs text-white font-semibold">{shot.transitionOut.type}</span>
          </div>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if these specific props change
  return (
    prevProps.shot.id === nextProps.shot.id &&
    prevProps.shot.title === nextProps.shot.title &&
    prevProps.shot.duration === nextProps.shot.duration &&
    prevProps.shot.image === nextProps.shot.image &&
    prevProps.shot.audioTracks.length === nextProps.shot.audioTracks.length &&
    prevProps.shot.transitionOut?.type === nextProps.shot.transitionOut?.type &&
    prevProps.startX === nextProps.startX &&
    prevProps.width === nextProps.width &&
    prevProps.transitionWidth === nextProps.transitionWidth &&
    prevProps.index === nextProps.index &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isMultiSelected === nextProps.isMultiSelected
  );
});

export const Timeline: React.FC<TimelineProps> = ({
  className = '',
  selectedShotId: externalSelectedShotId,
  selectedShotIds: externalSelectedShotIds,
  multiSelectMode = false,
  onShotSelect: externalOnShotSelect,
  onMultiShotSelect: externalOnMultiShotSelect,
  onOpenPlansPanel,
}) => {
  // Get shots from sequence plan store
  const shots = useCurrentPlanShots();
  const currentPlanData = useSequencePlanStore((state) => state.currentPlanData);
  const { updateShotInPlan, reorderShotsInPlan, insertShotAtPosition, splitShot, mergeShots, removeShotFromPlan } = useSequencePlanActions();

  // Get wizard actions from useAppStore
  const openShotWizard = useAppStore((state) => state.openShotWizard);

  // Local state for playback
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Use external selectedShotId if provided, otherwise use local state
  const [localSelectedShotId, setLocalSelectedShotId] = useState<string | null>(null);
  const selectedShotId = externalSelectedShotId !== undefined ? externalSelectedShotId : localSelectedShotId;

  // Multi-selection state
  const [localSelectedShotIds, setLocalSelectedShotIds] = useState<string[]>([]);
  const selectedShotIds = externalSelectedShotIds !== undefined ? externalSelectedShotIds : localSelectedShotIds;

  // Track last selected shot for shift-click range selection
  const [lastSelectedShotId, setLastSelectedShotId] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    visible: boolean;
    type: 'timeline' | 'shot';
    shotId?: string;
    insertPosition?: number;
  } | null>(null);

  // Trimming state
  const [trimMode, setTrimMode] = useState(false);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);

  // ============================================================================
  // Inheritance Status State
  // ============================================================================

  // Map of shot ID to inheritance status
  const [shotInheritanceStatus, setShotInheritanceStatus] = useState<Map<string, InheritanceStatus>>(new Map());

  // Sequence consistency score
  const [sequenceConsistencyScore, setSequenceConsistencyScore] = useState<number>(100);

  // Show inheritance view toggle
  const [showInheritanceView, setShowInheritanceView] = useState(false);

  // Loading states
  const [isValidating, setIsValidating] = useState(false);
  const [isPropagating, setIsPropagating] = useState(false);

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + 0.25, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - 0.25, MIN_ZOOM));
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoomLevel(DEFAULT_ZOOM);
  }, []);

  // ============================================================================
  // Inheritance Status Functions
  // ============================================================================

  /**
   * Load inheritance status for a single shot
   */
  const loadShotInheritanceStatus = useCallback(async (shotId: string): Promise<InheritanceStatus> => {
    try {
      // Get shot reference from inheritance service
      const shotRef = await referenceInheritanceService.getShotReference(shotId);

      if (!shotRef) {
        return {
          shotId,
          hasMasterRefs: false,
          hasSequenceRefs: false,
          localRefCount: 0,
          inheritedRefCount: 0,
          consistencyScore: 100,
          hasOverrides: false,
          issueCount: 0,
        };
      }

      // Get effective references for this shot
      const effectiveRefs = await referenceInheritanceService.getEffectiveReferencesForShot(shotId);

      // Calculate consistency score based on reference coverage
      const hasReferences = effectiveRefs.effective.length > 0;
      const localRefs = effectiveRefs.local.length;
      const inheritedRefs = effectiveRefs.inherited.length;

      // Score based on reference presence and ratio
      let score = 100;
      if (!hasReferences) {
        score = 50; // No references is a warning
      } else if (localRefs === 0 && inheritedRefs > 0) {
        score = 85; // Only inherited is good
      } else if (localRefs > 0 && inheritedRefs > 0) {
        score = 95; // Mix is best
      } else {
        score = 90; // Only local
      }

      return {
        shotId,
        hasMasterRefs: shotRef.inheritedFromMaster.length > 0,
        hasSequenceRefs: shotRef.inheritedFromSequence.length > 0,
        localRefCount: localRefs,
        inheritedRefCount: inheritedRefs,
        consistencyScore: score,
        hasOverrides: shotRef.consistencyOverrides.length > 0,
        issueCount: shotRef.consistencyOverrides.length,
      };
    } catch (error) {
      console.error(`Error loading inheritance status for shot ${shotId}:`, error);
      return {
        shotId,
        hasMasterRefs: false,
        hasSequenceRefs: false,
        localRefCount: 0,
        inheritedRefCount: 0,
        consistencyScore: 100,
        hasOverrides: false,
        issueCount: 0,
      };
    }
  }, []);

  /**
   * Load inheritance status for all shots in the sequence
   */
  const loadAllShotInheritanceStatus = useCallback(async () => {
    if (!currentPlanData || shots.length === 0) return;

    try {
      // Load all status in parallel for performance
      const statuses = await Promise.all(shots.map(shot => loadShotInheritanceStatus(shot.id)));

      const newStatusMap = new Map<string, InheritanceStatus>();
      let totalScore = 0;

      statuses.forEach(status => {
        newStatusMap.set(status.shotId, status);
        totalScore += status.consistencyScore;
      });

      setShotInheritanceStatus(newStatusMap);
      setSequenceConsistencyScore(shots.length > 0 ? Math.round(totalScore / shots.length) : 100);
    } catch (error) {
      console.error('Failed to load all shot inheritance status:', error);
    }
  }, [currentPlanData, shots, loadShotInheritanceStatus]);

  /**
   * Validate sequence consistency
   */
  const handleValidateSequenceConsistency = useCallback(async () => {
    if (!currentPlanData) return;

    setIsValidating(true);
    try {
      // Reload all shot inheritance status to get updated consistency scores
      await loadAllShotInheritanceStatus();
    } catch (error) {
      console.error('Error validating sequence consistency:', error);
    } finally {
      setIsValidating(false);
    }
  }, [currentPlanData, loadAllShotInheritanceStatus]);

  /**
   * Propagate references to all shots
   */
  const handlePropagateReferences = useCallback(async () => {
    if (!currentPlanData) return;

    setIsPropagating(true);
    try {
      await referenceInheritanceService.propagateSequenceChanges(currentPlanData.id);
      await loadAllShotInheritanceStatus();
    } catch (error) {
      console.error('Error propagating references:', error);
    } finally {
      setIsPropagating(false);
    }
  }, [currentPlanData, loadAllShotInheritanceStatus]);

  /**
   * Toggle inheritance view
   */
  const toggleInheritanceView = useCallback(() => {
    setShowInheritanceView(prev => !prev);
    if (!showInheritanceView) {
      loadAllShotInheritanceStatus();
    }
  }, [showInheritanceView, loadAllShotInheritanceStatus]);

  // Calculate pixels per second based on zoom level
  const pixelsPerSecond = useMemo(() => getPixelsPerSecond(zoomLevel), [zoomLevel]);

  // Calculate total duration - memoized to avoid recalculation on every render
  const totalDuration = useMemo(() => {
    return shots.reduce((sum, shot) => {
      let duration = sum + shot.duration;
      if (shot.transitionOut) {
        duration += shot.transitionOut.duration;
      }
      return duration;
    }, 0);
  }, [shots]);

  // Calculate total width - memoized
  const totalWidth = useMemo(() => {
    return Math.max(totalDuration * pixelsPerSecond, 1000);
  }, [totalDuration, pixelsPerSecond]);

  // Format time as MM:SS - memoized function
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Generate time markers (every 5 seconds) - memoized
  const timeMarkers = useMemo(() => {
    const markers: number[] = [];
    const interval = 5; // 5 second intervals
    for (let i = 0; i <= Math.ceil(totalDuration); i += interval) {
      markers.push(i);
    }
    return markers;
  }, [totalDuration]);

  // Calculate shot positions - memoized to avoid recalculation
  const shotPositions = useMemo(() => {
    let currentPosition = 0;
    return shots.map((shot) => {
      const startX = currentPosition;

      // Use duration directly (trimming not available in current type)
      const effectiveDuration = shot.duration;

      const width = effectiveDuration * pixelsPerSecond;
      currentPosition += effectiveDuration;

      let transitionWidth = 0;
      if (shot.transitionOut) {
        transitionWidth = shot.transitionOut.duration * pixelsPerSecond;
        currentPosition += shot.transitionOut.duration;
      }

      return {
        shot,
        startX,
        width,
        transitionWidth,
        effectiveDuration,
      };
    });
  }, [shots, pixelsPerSecond]);

  // Handle shot reordering - memoized callback
  const handleShotReorder = useCallback(async (dragIndex: number, hoverIndex: number) => {
    if (!currentPlanData) return;

    const newShots = [...shots];
    const [draggedShot] = newShots.splice(dragIndex, 1);
    newShots.splice(hoverIndex, 0, draggedShot);

    // Update positions
    const updatedShots = newShots.map((shot, index) => ({
      ...shot,
      position: index,
    }));

    // Update in sequence plan store
    try {
      await reorderShotsInPlan(updatedShots);
    } catch (error) {
      console.error('Failed to reorder shots:', error);
    }
  }, [currentPlanData, shots, reorderShotsInPlan]);

  // Handle duration change - memoized callback
  const handleDurationChange = useCallback(async (shotId: string, newDuration: number, trim?: { inPoint?: number; outPoint?: number }) => {
    if (!currentPlanData) return;

    try {
      const shot = shots.find(s => s.id === shotId);
      const metadata = { ...(shot?.metadata || {}), ...trim };
      await updateShotInPlan(shotId, { duration: newDuration, metadata });
    } catch (error) {
      console.error('Failed to update shot duration:', error);
    }
  }, [currentPlanData, shots, updateShotInPlan]);

  // Handle shot selection - memoized callback
  const handleShotSelect = useCallback((shotId: string, event: React.MouseEvent) => {
    if (multiSelectMode) {
      // Multi-selection mode
      if (event.ctrlKey || event.metaKey) {
        // Ctrl+Click: Toggle individual selection
        const newSelection = selectedShotIds.includes(shotId)
          ? selectedShotIds.filter(id => id !== shotId)
          : [...selectedShotIds, shotId];

        if (externalOnMultiShotSelect) {
          externalOnMultiShotSelect(newSelection);
        } else {
          setLocalSelectedShotIds(newSelection);
        }

        setLastSelectedShotId(shotId);
      } else if (event.shiftKey && lastSelectedShotId) {
        // Shift+Click: Range selection
        const lastIndex = shots.findIndex(s => s.id === lastSelectedShotId);
        const currentIndex = shots.findIndex(s => s.id === shotId);

        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = shots.slice(start, end + 1).map(s => s.id);

          // Merge with existing selection
          const newSelection = Array.from(new Set([...selectedShotIds, ...rangeIds]));

          if (externalOnMultiShotSelect) {
            externalOnMultiShotSelect(newSelection);
          } else {
            setLocalSelectedShotIds(newSelection);
          }
        }
      } else {
        // Regular click: Select single shot (replace selection)
        if (externalOnMultiShotSelect) {
          externalOnMultiShotSelect([shotId]);
        } else {
          setLocalSelectedShotIds([shotId]);
        }

        setLastSelectedShotId(shotId);
      }
    } else {
      // Single selection mode (backward compatibility)
      if (externalOnShotSelect) {
        externalOnShotSelect(shotId);
      } else {
        setLocalSelectedShotId(shotId);
      }
    }
  }, [multiSelectMode, selectedShotIds, lastSelectedShotId, shots, externalOnMultiShotSelect, externalOnShotSelect]);

  // Handle timeline click to move playhead - memoized callback
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / pixelsPerSecond;
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
  }, [totalDuration, pixelsPerSecond]);

  // Handle context menu for timeline (insert shot) - memoized callback
  const handleTimelineContextMenu = useCallback((x: number, y: number) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = x - rect.left + timelineRef.current.scrollLeft;
    const time = relativeX / pixelsPerSecond;

    // Find insertion position
    let insertPosition = 0;
    let accumulatedTime = 0;
    for (let i = 0; i < shots.length; i++) {
      if (time <= accumulatedTime + shots[i].duration / 2) {
        break;
      }
      insertPosition = i + 1;
      accumulatedTime += shots[i].duration;
      if (shots[i].transitionOut) {
        accumulatedTime += shots[i].transitionOut!.duration;
      }
    }

    setContextMenu({
      x,
      y,
      visible: true,
      type: 'timeline',
      insertPosition,
    });
  }, [shots]);

  // Handle context menu for shot - memoized callback
  const handleShotContextMenu = useCallback((shotId: string, x: number, y: number) => {
    setContextMenu({
      x,
      y,
      visible: true,
      type: 'shot',
      shotId,
    });
  }, []);

  // Close context menu - memoized callback
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Handle context menu actions - memoized callbacks
  const handleInsertShot = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'timeline' || contextMenu.insertPosition === undefined) return;

    const newShot: Shot = {
      id: `shot_${Date.now()}`,
      title: 'New Shot',
      description: 'New shot inserted',
      duration: 3.0, // 3 seconds default
      position: contextMenu.insertPosition,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
    };

    try {
      await insertShotAtPosition(newShot, contextMenu.insertPosition);
      closeContextMenu();
    } catch (error) {
      console.error('Failed to insert shot:', error);
    }
  }, [contextMenu, insertShotAtPosition, closeContextMenu]);

  const handleSplitShot = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    try {
      await splitShot(contextMenu.shotId, currentTime);
      closeContextMenu();
    } catch (error) {
      console.error('Failed to split shot:', error);
    }
  }, [contextMenu, currentTime, splitShot, closeContextMenu]);

  const handleMergeShots = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shotIndex = shots.findIndex(s => s.id === contextMenu.shotId);
    if (shotIndex === -1) return;

    // Try to merge with next shot
    if (shotIndex < shots.length - 1) {
      const nextShotId = shots[shotIndex + 1].id;
      try {
        await mergeShots(contextMenu.shotId, nextShotId);
        closeContextMenu();
      } catch (error) {
        console.error('Failed to merge shots:', error);
      }
    }
  }, [contextMenu, shots, mergeShots, closeContextMenu]);

  // ============================================================================
  // Reference Context Menu Actions
  // ============================================================================

  const handleSetAsReference = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    try {
      const shot = shots.find(s => s.id === contextMenu.shotId);
      if (shot) {
        // Mark shot as reference by storing in metadata
        await updateShotInPlan(contextMenu.shotId, {
          metadata: { ...shot.metadata, isReference: true, referenceTimestamp: Date.now() }
        });
        console.log('Shot marked as reference:', shot.id);
      }
      closeContextMenu();
    } catch (error) {
      console.error('Failed to set as reference:', error);
    }
  }, [contextMenu, shots, updateShotInPlan, closeContextMenu]);

  const handleCopyReferences = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    try {
      const shotRef = await referenceInheritanceService.getShotReference(contextMenu.shotId);
      if (shotRef && shotRef.localReferenceImages.length > 0) {
        // Copy reference URLs to clipboard
        const referenceUrls = shotRef.localReferenceImages.map((ref: { url: string }) => ref.url);
        await navigator.clipboard.writeText(JSON.stringify(referenceUrls));
        console.log('References copied to clipboard:', referenceUrls.length);
      } else {
        // Copy the shot image as reference
        const shot = shots.find(s => s.id === contextMenu.shotId);
        if (shot?.image) {
          await navigator.clipboard.writeText(shot.image);
          console.log('Shot image URL copied to clipboard');
        }
      }
      closeContextMenu();
    } catch (error) {
      console.error('Failed to copy references:', error);
    }
  }, [contextMenu, shots, closeContextMenu]);

  const handlePasteReferences = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    try {
      const text = await navigator.clipboard.readText();
      let referenceUrls: string[] = [];

      try {
        referenceUrls = JSON.parse(text);
        if (!Array.isArray(referenceUrls)) {
          referenceUrls = [text];
        }
      } catch {
        referenceUrls = [text];
      }

      if (referenceUrls.length > 0) {
        // Store references in shot metadata for now
        const shot = shots.find(s => s.id === contextMenu.shotId);
        if (shot) {
          const existingRefs = shot.metadata?.referenceUrls || [];
          await updateShotInPlan(contextMenu.shotId, {
            metadata: { ...shot.metadata, referenceUrls: [...existingRefs, ...referenceUrls] }
          });
          console.log('References pasted:', referenceUrls.length);
        }
      }
      closeContextMenu();
    } catch (error) {
      console.error('Failed to paste references:', error);
    }
  }, [contextMenu, shots, updateShotInPlan, closeContextMenu]);

  // ============================================================================
  // Regenerate Context Menu Actions
  // ============================================================================

  const handleRegenerateShot = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && openShotWizard) {
      // Use 'edit' mode with metadata to trigger regeneration
      openShotWizard({
        mode: 'edit',
        shotId: shot.id,
        initialData: { regenerate: true, variationMode: false, styleTransferMode: false }
      });
    }
    closeContextMenu();
  }, [contextMenu, shots, openShotWizard, closeContextMenu]);

  const handleRegenerateWithVariations = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && openShotWizard) {
      openShotWizard({
        mode: 'edit',
        shotId: shot.id,
        initialData: { regenerate: true, variationMode: true, styleTransferMode: false }
      });
    }
    closeContextMenu();
  }, [contextMenu, shots, openShotWizard, closeContextMenu]);

  const handleRegenerateWithStyleTransfer = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && openShotWizard) {
      openShotWizard({
        mode: 'edit',
        shotId: shot.id,
        initialData: { regenerate: true, variationMode: false, styleTransferMode: true }
      });
    }
    closeContextMenu();
  }, [contextMenu, shots, openShotWizard, closeContextMenu]);

  // ============================================================================
  // Edit Context Menu Actions
  // ============================================================================

  const handleEditManually = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && shot.image) {
      // Open image in external editor
      window.open(shot.image, '_blank');
    }
    closeContextMenu();
  }, [contextMenu, shots, closeContextMenu]);

  const handleAdjustParameters = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && openShotWizard) {
      openShotWizard({ mode: 'edit', shotId: shot.id });
    }
    closeContextMenu();
  }, [contextMenu, shots, openShotWizard, closeContextMenu]);

  const handleAddComment = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const comment = window.prompt('Enter your comment for AI-assisted generation:');
    if (comment) {
      try {
        // Store comment in shot metadata
        const shot = shots.find(s => s.id === contextMenu.shotId);
        if (shot) {
          const existingComments = shot.metadata?.comments || [];
          const newComment = {
            id: `comment_${Date.now()}`,
            content: comment,
            createdAt: new Date().toISOString(),
            resolved: false
          };
          await updateShotInPlan(contextMenu.shotId, {
            metadata: { ...shot.metadata, comments: [...existingComments, newComment] }
          });
          console.log('Comment added:', comment);
        }
      } catch (error) {
        console.error('Failed to add comment:', error);
      }
    }
    closeContextMenu();
  }, [contextMenu, shots, updateShotInPlan, closeContextMenu]);

  // ============================================================================
  // Asset Context Menu Actions
  // ============================================================================

  const handleReplaceAsset = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    // Trigger file upload dialog
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Handle file upload - would integrate with asset service
        console.log('Replace asset with:', file.name);
        // await assetService.uploadAsset(file, contextMenu.shotId);
      }
    };
    input.click();
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleDuplicateAsset = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    // This would open a dialog to select a source shot
    console.log('Duplicate asset from another shot:', contextMenu.shotId);
    closeContextMenu();
  }, [contextMenu, closeContextMenu]);

  const handleExportAsset = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const shot = shots.find(s => s.id === contextMenu.shotId);
    if (shot && shot.image) {
      // Trigger download
      const link = document.createElement('a');
      link.href = shot.image;
      link.download = `${shot.title || 'shot'}-${shot.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    closeContextMenu();
  }, [contextMenu, shots, closeContextMenu]);

  // ============================================================================
  // Delete Context Menu Actions
  // ============================================================================

  const handleDeleteShot = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const confirmed = window.confirm('Are you sure you want to delete this shot? This action cannot be undone.');
    if (confirmed) {
      try {
        await removeShotFromPlan(contextMenu.shotId!);
        console.log('Shot deleted:', contextMenu.shotId);
      } catch (error) {
        console.error('Failed to delete shot:', error);
      }
    }
    closeContextMenu();
  }, [contextMenu, removeShotFromPlan, closeContextMenu]);

  const handleDeleteAssetOnly = useCallback(async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    const confirmed = window.confirm('Delete only the asset? The shot will be kept for regeneration.');
    if (confirmed) {
      try {
        await updateShotInPlan(contextMenu.shotId!, { image: undefined });
        console.log('Asset deleted for shot:', contextMenu.shotId);
      } catch (error) {
        console.error('Failed to delete asset:', error);
      }
    }
    closeContextMenu();
  }, [contextMenu, updateShotInPlan, closeContextMenu]);

  // ============================================================================
  // Context Menu Action Handler
  // ============================================================================

  const handleContextMenuAction = useCallback((action: TimelineAction) => {
    switch (action) {
      case 'set_reference':
        handleSetAsReference();
        break;
      case 'copy_references':
        handleCopyReferences();
        break;
      case 'paste_references':
        handlePasteReferences();
        break;
      case 'regenerate':
        handleRegenerateShot();
        break;
      case 'regenerate_variations':
        handleRegenerateWithVariations();
        break;
      case 'regenerate_style_transfer':
        handleRegenerateWithStyleTransfer();
        break;
      case 'edit_manually':
        handleEditManually();
        break;
      case 'adjust_parameters':
        handleAdjustParameters();
        break;
      case 'add_comment':
        handleAddComment();
        break;
      case 'replace_asset':
        handleReplaceAsset();
        break;
      case 'duplicate_asset':
        handleDuplicateAsset();
        break;
      case 'export_asset':
        handleExportAsset();
        break;
      case 'delete_shot':
        handleDeleteShot();
        break;
      case 'delete_asset_only':
        handleDeleteAssetOnly();
        break;
      default:
        console.warn('Unknown context menu action:', action);
    }
  }, [
    handleSetAsReference,
    handleCopyReferences,
    handlePasteReferences,
    handleRegenerateShot,
    handleRegenerateWithVariations,
    handleRegenerateWithStyleTransfer,
    handleEditManually,
    handleAdjustParameters,
    handleAddComment,
    handleReplaceAsset,
    handleDuplicateAsset,
    handleExportAsset,
    handleDeleteShot,
    handleDeleteAssetOnly,
  ]);

  // Handle playhead dragging - memoized callback
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const time = x / pixelsPerSecond;
      setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, totalDuration, pixelsPerSecond, setCurrentTime]);

  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!timelineRef.current || !isPlaying) return;

    const playheadX = currentTime * pixelsPerSecond;
    const scrollLeft = timelineRef.current.scrollLeft;
    const viewportWidth = timelineRef.current.clientWidth;

    // Scroll if playhead is near the right edge
    if (playheadX > scrollLeft + viewportWidth - 100) {
      timelineRef.current.scrollLeft = playheadX - viewportWidth + 100;
    }
  }, [currentTime, isPlaying, pixelsPerSecond]);

  // Auto-scroll to selected shot(s)
  useEffect(() => {
    if (!timelineRef.current || shots.length === 0) return;

    // Determine which shots to scroll to
    const shotsToScrollTo = multiSelectMode && selectedShotIds.length > 0
      ? selectedShotIds
      : selectedShotId
        ? [selectedShotId]
        : [];

    if (shotsToScrollTo.length === 0) return;

    // Find the positions of all selected shots
    const selectedIndices = shotsToScrollTo
      .map(id => shots.findIndex(s => s.id === id))
      .filter(index => index !== -1)
      .sort((a, b) => a - b);

    if (selectedIndices.length === 0) return;

    // Calculate the first and last selected shot positions
    const firstIndex = selectedIndices[0];
    const lastIndex = selectedIndices[selectedIndices.length - 1];

    // Calculate positions
    let firstShotStartX = 0;
    for (let i = 0; i < firstIndex; i++) {
      firstShotStartX += shots[i].duration * pixelsPerSecond;
      if (shots[i].transitionOut) {
        firstShotStartX += shots[i].transitionOut!.duration * pixelsPerSecond;
      }
    }

    let lastShotEndX = firstShotStartX;
    for (let i = firstIndex; i <= lastIndex; i++) {
      lastShotEndX += shots[i].duration * pixelsPerSecond;
      if (shots[i].transitionOut) {
        lastShotEndX += shots[i].transitionOut!.duration * pixelsPerSecond;
      }
    }

    // Get viewport dimensions
    const viewportWidth = timelineRef.current.clientWidth;
    const currentScrollLeft = timelineRef.current.scrollLeft;

    // Calculate the span of selected shots
    const selectionWidth = lastShotEndX - firstShotStartX;

    // Check if all selected shots are visible
    const viewportLeft = currentScrollLeft;
    const viewportRight = currentScrollLeft + viewportWidth;

    const allVisible = firstShotStartX >= viewportLeft && lastShotEndX <= viewportRight;

    if (!allVisible) {
      // Calculate target scroll position
      let targetScrollLeft;

      if (selectionWidth <= viewportWidth) {
        // If selection fits in viewport, center it
        const selectionCenterX = (firstShotStartX + lastShotEndX) / 2;
        targetScrollLeft = selectionCenterX - viewportWidth / 2;
      } else {
        // If selection is larger than viewport, scroll to show the first shot
        targetScrollLeft = firstShotStartX - 50; // 50px padding
      }

      // Smooth scroll to target position
      timelineRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  }, [selectedShotId, selectedShotIds, multiSelectMode, shots, pixelsPerSecond]);

  // Playback controls - memoized callbacks
  const handlePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleSkipBack = useCallback(() => {
    setCurrentTime(Math.max(0, currentTime - 5));
  }, [currentTime]);

  const handleSkipForward = useCallback(() => {
    setCurrentTime(Math.min(totalDuration, currentTime + 5));
  }, [totalDuration, currentTime]);

  // Playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime((prev) => {
        const next = prev + 0.1; // Update every 100ms
        if (next >= totalDuration) {
          setIsPlaying(false);
          return totalDuration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, totalDuration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ': // Space - Play/Pause
          e.preventDefault();
          handlePlayPause();
          break;

        case 'ArrowLeft': // Left Arrow - Skip back 5s or previous shot
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Left: Select previous shot
            if (multiSelectMode) {
              // In multi-select mode, extend selection to previous shot
              const currentIndices = selectedShotIds
                .map(id => shots.findIndex(s => s.id === id))
                .filter(i => i !== -1)
                .sort((a, b) => a - b);

              if (currentIndices.length > 0) {
                const firstIndex = currentIndices[0];
                if (firstIndex > 0) {
                  const newSelection = [...selectedShotIds, shots[firstIndex - 1].id];
                  if (externalOnMultiShotSelect) {
                    externalOnMultiShotSelect(newSelection);
                  } else {
                    setLocalSelectedShotIds(newSelection);
                  }
                }
              }
            } else {
              // Single select mode
              const currentIndex = shots.findIndex(s => s.id === selectedShotId);
              if (currentIndex > 0) {
                handleShotSelect(shots[currentIndex - 1].id, { ctrlKey: false, metaKey: false, shiftKey: false } as React.MouseEvent);
              }
            }
          } else {
            handleSkipBack();
          }
          break;

        case 'ArrowRight': // Right Arrow - Skip forward 5s or next shot
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Right: Select next shot
            if (multiSelectMode) {
              // In multi-select mode, extend selection to next shot
              const currentIndices = selectedShotIds
                .map(id => shots.findIndex(s => s.id === id))
                .filter(i => i !== -1)
                .sort((a, b) => a - b);

              if (currentIndices.length > 0) {
                const lastIndex = currentIndices[currentIndices.length - 1];
                if (lastIndex < shots.length - 1) {
                  const newSelection = [...selectedShotIds, shots[lastIndex + 1].id];
                  if (externalOnMultiShotSelect) {
                    externalOnMultiShotSelect(newSelection);
                  } else {
                    setLocalSelectedShotIds(newSelection);
                  }
                }
              }
            } else {
              // Single select mode
              const currentIndex = shots.findIndex(s => s.id === selectedShotId);
              if (currentIndex >= 0 && currentIndex < shots.length - 1) {
                handleShotSelect(shots[currentIndex + 1].id, { ctrlKey: false, metaKey: false, shiftKey: false } as React.MouseEvent);
              }
            }
          } else {
            handleSkipForward();
          }
          break;

        case 'Home': // Home - Go to start
          e.preventDefault();
          setCurrentTime(0);
          break;

        case 'End': // End - Go to end
          e.preventDefault();
          setCurrentTime(totalDuration);
          break;

        case 'Enter': // Enter - Select shot at playhead
          e.preventDefault();
          if (shots.length > 0) {
            // Find shot at current time
            let accumulatedTime = 0;
            for (const shot of shots) {
              if (currentTime >= accumulatedTime && currentTime < accumulatedTime + shot.duration) {
                handleShotSelect(shot.id, { ctrlKey: false, metaKey: false, shiftKey: false } as React.MouseEvent);
                break;
              }
              accumulatedTime += shot.duration;
              if (shot.transitionOut) {
                accumulatedTime += shot.transitionOut.duration;
              }
            }
          }
          break;

        case 'Delete': // Delete - Remove selected shot(s)
        case 'Backspace': // Backspace - Remove selected shot(s)
          e.preventDefault();
          if (currentPlanData) {
            const shotsToDelete = multiSelectMode && selectedShotIds.length > 0
              ? selectedShotIds
              : selectedShotId
                ? [selectedShotId]
                : [];

            if (shotsToDelete.length > 0) {
              // Confirm deletion
              const message = shotsToDelete.length === 1
                ? 'Supprimer ce shot?'
                : `Supprimer ${shotsToDelete.length} shots?`;

              if (window.confirm(message)) {

                // Delete all selected shots
                Promise.all(shotsToDelete.map(id => removeShotFromPlan(id)))
                  .then(() => {
                    // Clear selection after deletion
                    if (multiSelectMode && externalOnMultiShotSelect) {
                      externalOnMultiShotSelect([]);
                    } else if (externalOnShotSelect) {
                      externalOnShotSelect(null);
                    } else {
                      setLocalSelectedShotIds([]);
                      setLocalSelectedShotId(null);
                    }
                  })
                  .catch(console.error);
              }
            }
          }
          break;

        case 'Escape': // Escape - Deselect shot(s)
          e.preventDefault();
          if (multiSelectMode && externalOnMultiShotSelect) {
            externalOnMultiShotSelect([]);
          } else if (externalOnShotSelect) {
            externalOnShotSelect(null);
          } else {
            setLocalSelectedShotIds([]);
            setLocalSelectedShotId(null);
          }
          setLastSelectedShotId(null);
          break;

        case 'a': // Ctrl+A - Select all shots
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (multiSelectMode && shots.length > 0) {
              const allShotIds = shots.map(s => s.id);
              if (externalOnMultiShotSelect) {
                externalOnMultiShotSelect(allShotIds);
              } else {
                setLocalSelectedShotIds(allShotIds);
              }
            }
          }
          break;

        case 'i': // I - Set in point
        case 'I':
          e.preventDefault();
          setInPoint(currentTime);
          break;

        case 'o': // O - Set out point
        case 'O':
          e.preventDefault();
          setOutPoint(currentTime);
          break;

        case 'x': // X - Split clip at current time
        case 'X':
          e.preventDefault();
          if (selectedShotId && currentPlanData) {
            // Find the selected shot and split it
            handleSplitShot();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, totalDuration, shots, selectedShotId, selectedShotIds, multiSelectMode, currentPlanData, handlePlayPause, handleSkipBack, handleSkipForward, handleShotSelect, externalOnShotSelect, externalOnMultiShotSelect]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex flex-col bg-gray-900 border-t border-gray-700 ${className}`}>
        {/* Playback Controls */}
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
          <button
            onClick={handleSkipBack}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Skip back 5s"
          >
            <SkipBack className="w-4 h-4 text-gray-300" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-gray-300" />
            ) : (
              <Play className="w-5 h-5 text-gray-300" />
            )}
          </button>

          <button
            onClick={handleSkipForward}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Skip forward 5s"
          >
            <SkipForward className="w-4 h-4 text-gray-300" />
          </button>

          <div className="flex items-center gap-2 ml-4 text-sm text-gray-300">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="text-gray-500">/</span>
            <span className="font-mono text-gray-400">{formatTime(totalDuration)}</span>
          </div>

          {/* Add Shot Button */}
          {currentPlanData && (
            <>
              <div className="h-6 w-px bg-gray-600 mx-2" />
              <button
                onClick={() => openShotWizard({ mode: 'create' })}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1"
                title="Ajouter un shot à la position actuelle"
              >
                <Plus className="w-4 h-4" />
                Ajouter Shot
              </button>
            </>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="ml-auto flex items-center gap-4 text-xs text-gray-400">
            <span className="hidden lg:inline" title="Lecture/Pause">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Space</kbd> Play/Pause
            </span>
            <span className="hidden lg:inline" title="Navigation">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">→</kbd> Navigate
            </span>
            <span className="hidden xl:inline" title="Edition">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">I</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">O</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">X</kbd> Trim/Split
            </span>
            <span className="hidden xl:inline" title="Sélection de shot">
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Shift</kbd>+
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">→</kbd> Select Shot
            </span>
            {multiSelectMode && (
              <span className="hidden xl:inline" title="Multi-sélection">
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded border border-gray-600">Ctrl</kbd>+Click Multi
              </span>
            )}
          </div>

          {/* Performance Monitor */}
          {shots.length > 0 && (
            <div className="ml-4">
              <PerformanceMonitor
                shotCount={shots.length}
                enabled={true}
                showWarnings={true}
              />
            </div>
          )}

          {/* Inheritance Controls */}
          <div className="ml-4 flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
            <button
              onClick={handleValidateSequenceConsistency}
              disabled={isValidating || shots.length === 0}
              className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              title="Validate Sequence Consistency"
            >
              {isValidating ? (
                <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 text-gray-300" />
              )}
            </button>

            <button
              onClick={handlePropagateReferences}
              disabled={isPropagating || shots.length === 0}
              className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              title="Propagate References"
            >
              {isPropagating ? (
                <RefreshCw className="w-4 h-4 text-gray-300 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 text-gray-300" />
              )}
            </button>

            <button
              onClick={toggleInheritanceView}
              className={`p-1 rounded transition-colors ${showInheritanceView ? 'bg-blue-600' : 'hover:bg-gray-600'}`}
              title="Toggle Inheritance View"
            >
              {showInheritanceView ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-300" />
              )}
            </button>
          </div>

          {/* Sequence Consistency Score */}
          {showInheritanceView && shots.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
              <span className="text-xs text-gray-400">Consistency:</span>
              <span className={`text-sm font-semibold ${getConsistencyColorClass(sequenceConsistencyScore)}`}>
                {sequenceConsistencyScore}%
              </span>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="ml-4 flex items-center gap-1 bg-gray-700 rounded-lg px-2 py-1">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-gray-300" />
            </button>

            <div className="flex flex-col items-center min-w-12">
              <span className="text-xs text-gray-300 font-medium">{Math.round(zoomLevel * 100)}%</span>
              <button
                onClick={handleZoomReset}
                className="text-[10px] text-gray-400 hover:text-gray-200 underline"
                title="Reset zoom to 100%"
              >
                Reset
              </button>
            </div>

            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="p-1 hover:bg-gray-600 rounded transition-colors disabled:opacity-50"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-gray-300" />
            </button>
          </div>
        </div>

        {/* Empty State - No Plan Selected */}
        {!currentPlanData || shots.length === 0 ? (
          <div className="flex-1 flex items-center justify-center bg-gray-900">
            <div className="text-center px-4 py-8 max-w-md">
              <div className="mb-4 flex justify-center">
                {!currentPlanData ? (
                  <FolderOpen className="w-16 h-16 text-gray-600" />
                ) : (
                  <Layers className="w-16 h-16 text-gray-600" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">
                {!currentPlanData ? 'Aucun plan sélectionné' : 'Aucun shot dans ce plan'}
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                {!currentPlanData
                  ? 'Sélectionnez un plan depuis l\'onglet Plans pour commencer à éditer votre séquence'
                  : 'Ce plan ne contient pas encore de shots. Ajoutez des shots pour commencer l\'édition'}
              </p>
              {!currentPlanData && onOpenPlansPanel && (
                <button
                  onClick={onOpenPlansPanel}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Ouvrir l'onglet Plans
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Timeline Container */
          <div
            ref={timelineRef}
            className="relative overflow-x-auto overflow-y-hidden flex-1"
            style={{ height: TIMELINE_HEIGHT }}
            onClick={handleTimelineClick}
            onContextMenu={(e) => {
              e.preventDefault();
              handleTimelineContextMenu(e.clientX, e.clientY);
            }}
          >
            <div
              className="relative"
              style={{ width: totalWidth, height: TIMELINE_HEIGHT }}
            >
              {/* Time Markers */}
              <div className="absolute top-0 left-0 right-0" style={{ height: TIME_MARKER_HEIGHT }}>
                {timeMarkers.map((time) => (
                  <div
                    key={time}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ left: time * pixelsPerSecond }}
                  >
                    <div className="w-px h-2 bg-gray-600" />
                    <span className="text-xs text-gray-400 mt-1">{formatTime(time)}</span>
                  </div>
                ))}
              </div>

              {/* Shot Track */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: TIME_MARKER_HEIGHT,
                  height: SHOT_TRACK_HEIGHT,
                }}
              >
                {shotPositions.map(({ shot, startX, width, transitionWidth }, index) => (
                  <TimelineShot
                    key={shot.id}
                    shot={shot}
                    startX={startX}
                    width={width}
                    transitionWidth={transitionWidth}
                    index={index}
                    isSelected={selectedShotId === shot.id}
                    isMultiSelected={multiSelectMode && selectedShotIds.includes(shot.id)}
                    onReorder={handleShotReorder}
                    onDurationChange={handleDurationChange}
                    onSelect={handleShotSelect}
                    onContextMenu={handleShotContextMenu}
                  />
                ))}
              </div>

              {/* Audio Tracks with Waveform Visualization */}
              <div
                className="absolute left-0 right-0 bg-gray-800"
                style={{
                  top: TIME_MARKER_HEIGHT + SHOT_TRACK_HEIGHT,
                  height: AUDIO_TRACK_HEIGHT,
                }}
              >
                {shotPositions.map(({ shot, startX }) => (
                  <div key={`audio-${shot.id}`}>
                    {shot.audioTracks.map((track, index) => {
                      const trackStartX = startX + (track.startTime * pixelsPerSecond);
                      const trackWidth = track.duration * pixelsPerSecond;

                      return (
                        <div
                          key={track.id}
                          className="absolute group"
                          style={{
                            left: trackStartX,
                            width: trackWidth,
                            top: index * 20,
                            height: 18,
                          }}
                        >
                          <div className="h-full bg-green-600 border border-green-400 rounded px-1 flex items-center relative overflow-hidden">
                            {/* Waveform Visualization */}
                            {track.waveformData && track.waveformData.length > 0 ? (
                              <div className="absolute inset-0 flex items-center justify-around px-0.5">
                                {track.waveformData.slice(0, Math.floor(trackWidth / 2)).map((amplitude, i) => (
                                  <div
                                    key={i}
                                    className="w-px bg-green-200 opacity-70"
                                    style={{
                                      height: `${Math.max(2, amplitude * 100)}%`,
                                    }}
                                  />
                                ))}
                              </div>
                            ) : (
                              // Placeholder waveform when no data available
                              <div className="absolute inset-0 flex items-center justify-around px-0.5">
                                {Array.from({ length: Math.min(20, Math.floor(trackWidth / 3)) }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="w-px bg-green-200 opacity-50"
                                    style={{
                                      height: `${20 + Math.random() * 60}%`,
                                    }}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Track Name */}
                            <span className="text-xs text-white truncate relative z-10 bg-green-600 bg-opacity-80 px-1 rounded">
                              {track.name}
                            </span>

                            {/* Volume Indicator */}
                            {!track.muted && track.volume < 100 && (
                              <span className="text-xs text-green-100 ml-auto relative z-10 bg-green-600 bg-opacity-80 px-1 rounded">
                                {track.volume}%
                              </span>
                            )}

                            {/* Muted Indicator */}
                            {track.muted && (
                              <span className="text-xs text-red-300 ml-auto relative z-10 bg-red-600 bg-opacity-80 px-1 rounded">
                                🔇
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: currentTime * pixelsPerSecond,
                  width: 2,
                  backgroundColor: PLAYHEAD_COLOR,
                  zIndex: 100,
                }}
              >
                {/* Playhead Handle */}
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 cursor-ew-resize pointer-events-auto"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: PLAYHEAD_COLOR,
                    borderRadius: '50%',
                    marginTop: -6,
                  }}
                  onMouseDown={handlePlayheadMouseDown}
                />
              </div>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu?.visible && (
          <div
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 min-w-56 max-w-xs"
            style={{
              left: contextMenu.x,
              top: contextMenu.y,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.type === 'timeline' && (
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                onClick={handleInsertShot}
              >
                <Plus className="w-4 h-4" />
                Insert Shot Here
              </button>
            )}

            {contextMenu.type === 'shot' && (
              <>
                {/* Reference Section */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Reference
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('set_reference')}
                >
                  <Link className="w-4 h-4" />
                  Set as Reference
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('copy_references')}
                >
                  <Copy className="w-4 h-4" />
                  Copy References
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('paste_references')}
                >
                  <Clipboard className="w-4 h-4" />
                  Paste References
                </button>

                {/* Divider */}
                <div className="border-t border-gray-600 my-1" />

                {/* Regenerate Section */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Regenerate
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('regenerate')}
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate Shot
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('regenerate_variations')}
                >
                  <Wand2 className="w-4 h-4" />
                  Regenerate with Variations
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('regenerate_style_transfer')}
                >
                  <WandSparkles className="w-4 h-4" />
                  Regenerate with Style Transfer
                </button>

                {/* Divider */}
                <div className="border-t border-gray-600 my-1" />

                {/* Edit Section */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Edit
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('edit_manually')}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Manually
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('adjust_parameters')}
                >
                  <Settings className="w-4 h-4" />
                  Adjust Parameters
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('add_comment')}
                >
                  <MessageSquare className="w-4 h-4" />
                  Add Comment
                </button>

                {/* Divider */}
                <div className="border-t border-gray-600 my-1" />

                {/* Asset Section */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Asset
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('replace_asset')}
                >
                  <Upload className="w-4 h-4" />
                  Replace Asset
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('duplicate_asset')}
                >
                  <Image className="w-4 h-4" />
                  Duplicate Asset
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('export_asset')}
                >
                  <Download className="w-4 h-4" />
                  Export Asset
                </button>

                {/* Divider */}
                <div className="border-t border-gray-600 my-1" />

                {/* Operations Section */}
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Operations
                </div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={handleSplitShot}
                >
                  <Scissors className="w-4 h-4" />
                  Split Shot Here
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={handleMergeShots}
                >
                  <Link className="w-4 h-4" />
                  Merge with Next
                </button>

                {/* Divider */}
                <div className="border-t border-gray-600 my-1" />

                {/* Delete Section */}
                <button
                  className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('delete_asset_only')}
                >
                  <Image className="w-4 h-4 text-yellow-400" />
                  Delete Asset Only
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
                  onClick={() => handleContextMenuAction('delete_shot')}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Shot
                </button>
              </>
            )}
          </div>
        )}

        {/* Context menu overlay to close on click */}
        {contextMenu?.visible && (
          <div
            className="fixed inset-0 z-40"
            onClick={closeContextMenu}
            onContextMenu={(e) => {
              e.preventDefault();
              closeContextMenu();
            }}
          />
        )}
      </div>
    </DndProvider>
  );
};
