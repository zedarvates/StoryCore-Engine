import { useRef, useEffect, useState } from 'react';
import { useDrag, useDrop, DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSequencePlanStore, useCurrentPlanShots, useSequencePlanActions } from '@/stores/sequencePlanStore';
import { useAppStore } from '@/stores/useAppStore';
import type { Shot } from '../types';
import { Clock, Play, Pause, SkipBack, SkipForward, FolderOpen, Layers, Plus } from 'lucide-react';

// Constants for timeline rendering
const PIXELS_PER_SECOND = 50; // 50 pixels = 1 second
const TIMELINE_HEIGHT = 200;
const SHOT_TRACK_HEIGHT = 60;
const AUDIO_TRACK_HEIGHT = 40;
const TIME_MARKER_HEIGHT = 30;
const PLAYHEAD_COLOR = '#ef4444'; // red-500

// DnD item types
const ItemTypes = {
  TIMELINE_SHOT: 'TIMELINE_SHOT',
};

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
  onDurationChange: (shotId: string, newDuration: number) => void;
  onSelect: (shotId: string, event: React.MouseEvent) => void;
  onContextMenu?: (shotId: string, x: number, y: number) => void;
}

// Timeline Shot Component with drag-and-drop
const TimelineShot: React.FC<TimelineShotProps> = ({
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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartWidth, setResizeStartWidth] = useState(0);

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

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStartX(e.clientX);
    setResizeStartWidth(width);
  };

  // Handle resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX;
      const newWidth = Math.max(PIXELS_PER_SECOND, resizeStartWidth + deltaX);
      const newDuration = newWidth / PIXELS_PER_SECOND;
      onDurationChange(shot.id, Math.round(newDuration * 10) / 10); // Round to 1 decimal
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStartX, resizeStartWidth, shot.id, onDurationChange]);

  // Determine border style based on selection state
  const getBorderStyle = () => {
    if (isMultiSelected) {
      return 'border-purple-400 border-2'; // Purple for multi-selection
    }
    if (isSelected) {
      return 'border-primary border-2'; // Primary for single selection
    }
    return 'border-blue-400'; // Default
  };

  // Determine ring style based on selection state
  const getRingStyle = () => {
    if (isMultiSelected) {
      return 'ring-2 ring-purple-400'; // Purple ring for multi-selection
    }
    if (isSelected) {
      return 'ring-2 ring-primary'; // Primary ring for single selection
    }
    return '';
  };

  return (
    <div ref={(node) => {
      drag(drop(node));
    }}>
      <div
        className={`absolute top-0 cursor-move group ${isDragging ? 'opacity-50' : ''} ${
          isOver ? 'ring-2 ring-blue-400' : ''
        } ${getRingStyle()}`}
        style={{
          left: startX,
          width: width,
          height: SHOT_TRACK_HEIGHT,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(shot.id, e);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (onContextMenu) {
            onContextMenu(shot.id, e.clientX, e.clientY);
          }
        }}
      >
        <div className={`h-full bg-blue-600 hover:bg-blue-500 border rounded overflow-hidden transition-colors relative ${getBorderStyle()}`}>
          {/* Thumbnail Background */}
          {shot.image && (
            <div className="absolute inset-0">
              <img
                src={shot.image}
                alt={shot.title}
                className="w-full h-full object-cover opacity-40"
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

          {/* Resize Handle */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onMouseDown={handleResizeStart}
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
};

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
  
  // Calculate total duration
  const totalDuration = shots.reduce((sum, shot) => {
    let duration = sum + shot.duration;
    if (shot.transitionOut) {
      duration += shot.transitionOut.duration;
    }
    return duration;
  }, 0);
  
  const totalWidth = Math.max(totalDuration * PIXELS_PER_SECOND, 1000);
  
  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Generate time markers (every 5 seconds)
  const generateTimeMarkers = () => {
    const markers: number[] = [];
    const interval = 5; // 5 second intervals
    for (let i = 0; i <= Math.ceil(totalDuration); i += interval) {
      markers.push(i);
    }
    return markers;
  };
  
  // Calculate shot positions
  const getShotPositions = () => {
    let currentPosition = 0;
    return shots.map((shot) => {
      const startX = currentPosition;
      const width = shot.duration * PIXELS_PER_SECOND;
      currentPosition += shot.duration;
      
      let transitionWidth = 0;
      if (shot.transitionOut) {
        transitionWidth = shot.transitionOut.duration * PIXELS_PER_SECOND;
        currentPosition += shot.transitionOut.duration;
      }
      
      return {
        shot,
        startX,
        width,
        transitionWidth,
      };
    });
  };
  
  const shotPositions = getShotPositions();
  
  // Handle shot reordering
  const handleShotReorder = async (dragIndex: number, hoverIndex: number) => {
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
  };
  
  // Handle duration change
  const handleDurationChange = async (shotId: string, newDuration: number) => {
    if (!currentPlanData) return;
    
    try {
      await updateShotInPlan(shotId, { duration: newDuration });
    } catch (error) {
      console.error('Failed to update shot duration:', error);
    }
  };
  
  // Handle shot selection
  const handleShotSelect = (shotId: string, event: React.MouseEvent) => {
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
  };
  
  // Handle timeline click to move playhead
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const time = x / PIXELS_PER_SECOND;
    setCurrentTime(Math.max(0, Math.min(time, totalDuration)));
  };

  // Handle context menu for timeline (insert shot)
  const handleTimelineContextMenu = (x: number, y: number) => {
    if (!timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = x - rect.left + timelineRef.current.scrollLeft;
    const time = relativeX / PIXELS_PER_SECOND;

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
  };

  // Handle context menu for shot
  const handleShotContextMenu = (shotId: string, x: number, y: number) => {
    setContextMenu({
      x,
      y,
      visible: true,
      type: 'shot',
      shotId,
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu(null);
  };

  // Handle context menu actions
  const handleInsertShot = async () => {
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
  };

  const handleSplitShot = async () => {
    if (!contextMenu || contextMenu.type !== 'shot' || !contextMenu.shotId) return;

    try {
      await splitShot(contextMenu.shotId, currentTime);
      closeContextMenu();
    } catch (error) {
      console.error('Failed to split shot:', error);
    }
  };

  const handleMergeShots = async () => {
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
  };
  
  // Handle playhead dragging
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };
  
  useEffect(() => {
    if (!isDraggingPlayhead) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const time = x / PIXELS_PER_SECOND;
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
  }, [isDraggingPlayhead, totalDuration, setCurrentTime]);
  
  // Auto-scroll to keep playhead visible
  useEffect(() => {
    if (!timelineRef.current || !isPlaying) return;
    
    const playheadX = currentTime * PIXELS_PER_SECOND;
    const scrollLeft = timelineRef.current.scrollLeft;
    const viewportWidth = timelineRef.current.clientWidth;
    
    // Scroll if playhead is near the right edge
    if (playheadX > scrollLeft + viewportWidth - 100) {
      timelineRef.current.scrollLeft = playheadX - viewportWidth + 100;
    }
  }, [currentTime, isPlaying]);
  
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
      firstShotStartX += shots[i].duration * PIXELS_PER_SECOND;
      if (shots[i].transitionOut) {
        firstShotStartX += shots[i].transitionOut!.duration * PIXELS_PER_SECOND;
      }
    }

    let lastShotEndX = firstShotStartX;
    for (let i = firstIndex; i <= lastIndex; i++) {
      lastShotEndX += shots[i].duration * PIXELS_PER_SECOND;
      if (shots[i].transitionOut) {
        lastShotEndX += shots[i].transitionOut!.duration * PIXELS_PER_SECOND;
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
  }, [selectedShotId, selectedShotIds, multiSelectMode, shots]);
  
  // Playback controls
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };
  
  const handleSkipBack = () => {
    setCurrentTime(Math.max(0, currentTime - 5));
  };
  
  const handleSkipForward = () => {
    setCurrentTime(Math.min(totalDuration, currentTime + 5));
  };
  
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
              onClick={() => openShotWizard({
                mode: 'create',
                sourceLocation: 'timeline',
                timelinePosition: currentTime,
              })}
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
            {generateTimeMarkers().map((time) => (
              <div
                key={time}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: time * PIXELS_PER_SECOND }}
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
                  const trackStartX = startX + (track.startTime * PIXELS_PER_SECOND);
                  const trackWidth = track.duration * PIXELS_PER_SECOND;
                  
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
              left: currentTime * PIXELS_PER_SECOND,
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
          className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 min-w-48"
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
              <span>+</span>
              Insert Shot Here
            </button>
          )}

          {contextMenu.type === 'shot' && (
            <>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                onClick={handleSplitShot}
              >
                <span>✂️</span>
                Split Shot Here
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-gray-700 flex items-center gap-2"
                onClick={handleMergeShots}
              >
                <span>🔗</span>
                Merge with Next
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
