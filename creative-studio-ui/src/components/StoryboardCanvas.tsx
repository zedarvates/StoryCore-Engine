import React, { useCallback, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useStore } from '../store';
import type { Shot } from '../types';
import { DND_ITEM_TYPES, type ShotDragItem } from '../constants/dnd';
import { ShotEditModal } from './ShotEditModal';

/**
 * StoryboardCanvas Component
 * 
 * Displays shots in a responsive grid layout with visual cards.
 * This is the main visual workspace where shots are arranged and edited.
 * 
 * Features:
 * - Responsive grid layout (adjusts columns based on screen size)
 * - Shot cards with thumbnails, titles, descriptions, and durations
 * - Empty state when no shots exist
 * - Selection support (click to select)
 * - Drag-and-drop reordering with visual feedback
 * - Snap-to-grid behavior
 * 
 * Requirements: 2.1, 2.2, 7.2, 7.3 (Storyboard Canvas with drag-and-drop)
 */

interface StoryboardCanvasProps {
  className?: string;
}

export const StoryboardCanvas: React.FC<StoryboardCanvasProps> = ({ className = '' }) => {
  const shots = useStore((state) => state.shots);
  const selectedShotId = useStore((state) => state.selectedShotId);
  const selectShot = useStore((state) => state.selectShot);
  const reorderShots = useStore((state) => state.reorderShots);
  
  const [editingShot, setEditingShot] = useState<Shot | null>(null);

  const handleShotClick = (shotId: string) => {
    selectShot(shotId);
  };

  const handleShotDoubleClick = (shot: Shot) => {
    setEditingShot(shot);
  };

  const handleCloseEditModal = () => {
    setEditingShot(null);
  };

  // Handle shot reordering via drag-and-drop
  const moveShot = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      const dragShot = shots[dragIndex];
      const newShots = [...shots];
      
      // Remove the dragged shot
      newShots.splice(dragIndex, 1);
      
      // Insert at the new position
      newShots.splice(hoverIndex, 0, dragShot);
      
      // Update positions
      const reorderedShots = newShots.map((shot, index) => ({
        ...shot,
        position: index,
      }));
      
      reorderShots(reorderedShots);
    },
    [shots, reorderShots]
  );

  // Set up drop target for the canvas
  const [{ isOver }, drop] = useDrop({
    accept: DND_ITEM_TYPES.SHOT,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Empty state when no shots exist
  if (shots.length === 0) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <div className="text-center p-8">
          <div className="mb-4">
            <svg
              className="mx-auto h-24 w-24 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No shots yet</h3>
          <p className="text-sm text-gray-500 mb-4">
            Get started by dragging assets from the library or using the chat assistant to create shots.
          </p>
          <div className="flex gap-2 justify-center text-xs text-gray-400">
            <span>💡 Tip: Drag images from the Asset Library to create shots</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={drop as any} className={`h-full overflow-auto bg-gray-50 ${className} ${isOver ? 'bg-blue-50' : ''}`}>
      <div className="p-6">
        {/* Grid container with responsive columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {shots.map((shot, index) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              index={index}
              isSelected={shot.id === selectedShotId}
              onClick={() => handleShotClick(shot.id)}
              onDoubleClick={() => handleShotDoubleClick(shot)}
              moveShot={moveShot}
            />
          ))}
        </div>
      </div>

      {/* Edit Modal */}
      {editingShot && (
        <ShotEditModal
          shot={editingShot}
          isOpen={true}
          onClose={handleCloseEditModal}
        />
      )}
    </div>
  );
};

/**
 * ShotCard Component
 * 
 * Displays a single shot with thumbnail, title, description, and metadata.
 * 
 * Features:
 * - Thumbnail image display (or placeholder if no image)
 * - Title and description
 * - Duration display
 * - Audio track indicators
 * - Visual selection indicator
 * - Hover effects
 * - Drag-and-drop support for reordering
 * - Double-click to edit
 * - Delete button
 */

interface ShotCardProps {
  shot: Shot;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  moveShot: (dragIndex: number, hoverIndex: number) => void;
}

const ShotCard: React.FC<ShotCardProps> = ({ shot, index, isSelected, onClick, onDoubleClick, moveShot }) => {
  const deleteShot = useStore((state) => state.deleteShot);
  const cardRef = React.useRef<HTMLDivElement>(null);
  
  const hasAudio = shot.audioTracks && shot.audioTracks.length > 0;
  const hasEffects = shot.effects && shot.effects.length > 0;
  const hasTextLayers = shot.textLayers && shot.textLayers.length > 0;

  // Set up drag source
  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPES.SHOT,
    item: (): ShotDragItem => ({
      type: DND_ITEM_TYPES.SHOT,
      shotId: shot.id,
      index,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Set up drop target
  const [{ isOver }, drop] = useDrop({
    accept: DND_ITEM_TYPES.SHOT,
    hover: (item: ShotDragItem, monitor) => {
      if (!cardRef.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = cardRef.current.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      if (!clientOffset) {
        return;
      }

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      moveShot(dragIndex, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drag and drop refs
  drag(drop(cardRef));

  // Handle double-click to edit
  const handleDoubleClick = () => {
    onDoubleClick();
  };

  // Handle delete
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    
    if (window.confirm(`Are you sure you want to delete "${shot.title || 'Untitled Shot'}"?`)) {
      deleteShot(shot.id);
    }
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onDoubleClick={handleDoubleClick}
      className={`
        relative bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer
        transition-all duration-200 hover:shadow-md
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-1 hover:ring-gray-300'}
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${isOver ? 'ring-2 ring-green-400' : ''}
      `}
      style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 hover:opacity-100 transition-opacity group-hover:opacity-100"
        title="Delete shot"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Thumbnail */}
      <div className="aspect-video bg-gray-200 relative overflow-hidden">
        {shot.image ? (
          <img
            src={shot.image}
            alt={shot.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="h-16 w-16 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
          {formatDuration(shot.duration)}
        </div>

        {/* Position indicator */}
        <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
          #{shot.position + 1}
        </div>
        
        {/* Status indicator */}
        {shot.status && (
          <div className="absolute top-2 right-12 bg-yellow-600 text-white text-xs font-semibold px-2 py-1 rounded">
            {shot.status}
          </div>
        )}

        {/* Drag indicator */}
        {isDragging && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
            <div className="bg-white rounded-lg px-3 py-2 shadow-lg">
              <span className="text-sm font-semibold text-gray-700">Moving...</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-sm text-gray-900 mb-1 line-clamp-1">
          {shot.title || 'Untitled Shot'}
        </h3>

        {/* Description */}
        {shot.description && (
          <p className="text-xs text-gray-600 mb-2 line-clamp-2">
            {shot.description}
          </p>
        )}

        {/* Metadata indicators */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {hasAudio && (
            <div className="flex items-center gap-1" title={`${shot.audioTracks.length} audio track(s)`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                />
              </svg>
              <span>{shot.audioTracks.length}</span>
            </div>
          )}

          {hasEffects && (
            <div className="flex items-center gap-1" title={`${shot.effects.length} effect(s)`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                />
              </svg>
              <span>{shot.effects.length}</span>
            </div>
          )}

          {hasTextLayers && (
            <div className="flex items-center gap-1" title={`${shot.textLayers.length} text layer(s)`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>{shot.textLayers.length}</span>
            </div>
          )}

          {shot.transitionOut && (
            <div className="flex items-center gap-1" title={`Transition: ${shot.transitionOut.type}`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              </svg>
            </div>
          )}
          
          {/* Progress indicator */}
          {shot.progress && shot.progress < 100 && (
            <div className="flex items-center gap-1" title={`Progress: ${shot.progress}%`}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{shot.progress}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Selection indicator overlay */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg" />
      )}
    </div>
  );
};

/**
 * Format duration in seconds to MM:SS format
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
