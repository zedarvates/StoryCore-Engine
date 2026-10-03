/**
 * TimelineView - Displays shots in temporal sequence with drag-to-reorder
 * 
 * Features:
 * - Display shots in temporal sequence
 * - Show shot thumbnails and durations
 * - Implement drag-to-reorder functionality
 * - Add shot selection highlighting
 * - Update on storyboard changes
 * 
 * Requirements: 4.5, 5.6, 11.6, 12.2, 12.6
 */

import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Clock } from 'lucide-react';
import type { Shot } from '../../types';

export interface TimelineViewProps {
  shots: Shot[];
  selectedShotId: string | null;
  onShotSelect: (shotId: string) => void;
  onShotReorder: (shotIds: string[]) => void;
}

interface DragState {
  draggedIndex: number | null;
  dragOverIndex: number | null;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  shots,
  selectedShotId,
  onShotSelect,
  onShotReorder,
}) => {
  const [dragState, setDragState] = useState<DragState>({
    draggedIndex: null,
    dragOverIndex: null,
  });

  // Calculate total duration
  const totalDuration = shots.reduce((sum, shot) => sum + shot.duration, 0);

  // Format duration as MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDragState({
      draggedIndex: index,
      dragOverIndex: null,
    });
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (dragState.draggedIndex !== null && dragState.draggedIndex !== index) {
      setDragState(prev => ({
        ...prev,
        dragOverIndex: index,
      }));
    }
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragState(prev => ({
      ...prev,
      dragOverIndex: null,
    }));
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    
    const dragIndex = dragState.draggedIndex;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragState({ draggedIndex: null, dragOverIndex: null });
      return;
    }

    // Reorder shots
    const newShots = [...shots];
    const [draggedShot] = newShots.splice(dragIndex, 1);
    newShots.splice(dropIndex, 0, draggedShot);

    // Call reorder callback with new shot IDs order
    onShotReorder(newShots.map(shot => shot.id));

    // Reset drag state
    setDragState({ draggedIndex: null, dragOverIndex: null });
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDragState({ draggedIndex: null, dragOverIndex: null });
  };

  // Handle shot click
  const handleShotClick = (shotId: string) => {
    onShotSelect(shotId);
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300">Timeline</h3>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{shots.length} shot{shots.length !== 1 ? 's' : ''}</span>
          <span className="text-gray-600">•</span>
          <span>{formatDuration(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {shots.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-sm">No shots in timeline</p>
            <p className="text-xs mt-1">Create a shot to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {shots.map((shot, index) => {
              const isSelected = shot.id === selectedShotId;
              const isDragging = dragState.draggedIndex === index;
              const isDragOver = dragState.dragOverIndex === index;

              return (
                <div
                  key={shot.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleShotClick(shot.id)}
                  className={`
                    relative group cursor-pointer rounded-lg border-2 transition-all
                    ${isSelected 
                      ? 'border-blue-500 bg-blue-900 bg-opacity-30' 
                      : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }
                    ${isDragging ? 'opacity-50' : ''}
                    ${isDragOver ? 'border-blue-400 border-dashed' : ''}
                  `}
                >
                  {/* Drag Handle */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-gray-400 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Shot Content */}
                  <div className="flex items-center gap-3 pl-8 pr-3 py-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-12 bg-gray-700 rounded overflow-hidden">
                      {shot.image ? (
                        <img
                          src={shot.image}
                          alt={shot.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Shot Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono">
                          #{index + 1}
                        </span>
                        <h4 className="text-sm font-medium text-white truncate">
                          {shot.title}
                        </h4>
                      </div>
                      {shot.description && (
                        <p className="text-xs text-gray-400 truncate mt-1">
                          {shot.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-500">
                          {shot.duration}s
                        </span>
                        {shot.audioTracks && shot.audioTracks.length > 0 && (
                          <span className="text-xs text-green-400">
                            🔊 {shot.audioTracks.length} track{shot.audioTracks.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {shot.metadata?.status && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            shot.metadata.status === 'ready' ? 'bg-green-900 text-green-300' :
                            shot.metadata.status === 'generating' ? 'bg-yellow-900 text-yellow-300' :
                            shot.metadata.status === 'failed' ? 'bg-red-900 text-red-300' :
                            'bg-gray-700 text-gray-400'
                          }`}>
                            {shot.metadata.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Duration Badge */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs font-mono text-gray-400">
                        {formatDuration(shot.duration)}
                      </div>
                    </div>
                  </div>

                  {/* Drop Indicator */}
                  {isDragOver && (
                    <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-lg pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
