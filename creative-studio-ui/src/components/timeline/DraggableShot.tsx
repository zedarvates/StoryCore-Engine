/**
 * DraggableShot Component - Enhanced Draggable Shot Item
 * 
 * Features:
 * - Integration with react-dnd
 * - Semi-transparent preview during drag
 * - Multiple selection support for group drag
 * - Animated transition to new position
 * 
 * Validates: Requirements 2.4, 2.5
 */

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { motion, useAnimation } from 'framer-motion';
import type { ProductionShot } from '../../types/shot';
import type { DraggableShotProps, Position } from '../../types/gridEditorAdvanced';
import { DND_ITEM_TYPES } from '../../constants/dnd';
import { useDragCopy, CopyModeIndicator } from '../../hooks/useDragCopy';
import { useDragCancel, CancelAnimation, CancelNotification } from '../../hooks/useDragCancel';

export function DraggableShot({
  shot,
  isSelected,
  onDragStart,
  onDragEnd,
}: DraggableShotProps) {
  const ref = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  // Copy mode hook
  const { isCopyMode, startDrag: startCopyDrag, createCopy } = useDragCopy({
    onCopy: (items) => items.map(item => createCopy(item)),
  });

  // Cancel drag hook
  const {
    isDragging: isCancelling,
    isCancelling: showCancelAnimation,
    initialPosition,
    currentPosition,
    startDrag: startCancelTracking,
    updatePosition,
    cancelDrag,
    endDrag: endCancelTracking,
  } = useDragCancel({
    onCancel: () => {
      // Reset any drag state
      controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, ease: 'easeOut' },
      });
    },
  });

  // Drag configuration
  const [{ isDragging }, drag] = useDrag({
    type: DND_ITEM_TYPES.SHOT,
    item: (monitor) => {
      const event = monitor.getInitialClientOffset();
      if (event) {
        startCopyDrag(new DragEvent('dragstart', {
          ctrlKey: isCopyMode,
        }));
        startCancelTracking({ x: event.x, y: event.y });
      }
      onDragStart?.(shot);
      return {
        type: DND_ITEM_TYPES.SHOT,
        shotId: shot.id,
        index: shot.number,
        shot,
        isSelected,
        isCopyMode,
      };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ position: Position; isCopyMode?: boolean }>();
      
      // Check if drag was cancelled
      if (showCancelAnimation) {
        endCancelTracking();
        return;
      }

      if (dropResult && dropResult.position) {
        // If copy mode, create a copy; otherwise move
        const finalShot = isCopyMode ? createCopy(shot) : shot;
        onDragEnd?.(finalShot, dropResult.position);
        
        // Animate to new position
        controls.start({
          scale: [1.05, 1],
          transition: { duration: 0.3, ease: 'easeOut' },
        });
      }

      endCancelTracking();
    },
  });

  // Drop configuration (for reordering)
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: DND_ITEM_TYPES.SHOT,
    drop: (item, monitor) => {
      const clientOffset = monitor.getClientOffset();
      if (clientOffset) {
        return {
          position: {
            x: clientOffset.x,
            y: clientOffset.y,
          },
        };
      }
      return undefined;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  // Combine drag and drop refs
  drag(drop(ref));

  // Animation variants
  const variants = {
    idle: {
      scale: 1,
      opacity: 1,
      boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    },
    dragging: {
      scale: 1.05,
      opacity: 0.6,
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    },
    hover: {
      scale: 1.02,
      boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
    },
    dropTarget: {
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
  };

  // Determine current animation state
  const getAnimationState = () => {
    if (isDragging) return 'dragging';
    if (isOver && canDrop) return 'dropTarget';
    return 'idle';
  };

  return (
    <>
      <CancelAnimation
        isVisible={showCancelAnimation}
        initialPosition={initialPosition}
        currentPosition={currentPosition}
      >
        <motion.div
          ref={ref}
          className="draggable-shot"
          variants={variants}
          initial="idle"
          animate={controls}
          whileHover={!isDragging ? 'hover' : undefined}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            position: 'relative',
            userSelect: 'none',
          }}
          data-shot-id={shot.id}
          data-selected={isSelected}
        >
      {/* Shot Content */}
      <div
        className={`shot-content ${isSelected ? 'selected' : ''}`}
        style={{
          padding: '12px',
          border: `2px solid ${isSelected ? '#3b82f6' : '#e5e7eb'}`,
          borderRadius: '8px',
          backgroundColor: 'white',
          transition: 'border-color 0.2s',
        }}
      >
        {/* Shot Number Badge */}
        <div
          style={{
            position: 'absolute',
            top: '-8px',
            left: '8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            borderRadius: '12px',
            padding: '2px 8px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {shot.number}
        </div>

        {/* Thumbnail */}
        {shot.thumbnailUrl && (
          <div
            style={{
              width: '100%',
              height: '120px',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px',
              backgroundColor: '#f3f4f6',
            }}
          >
            <img
              src={shot.thumbnailUrl}
              alt={`Shot ${shot.number}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Shot Info */}
        <div style={{ fontSize: '14px' }}>
          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
            {shot.type}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {shot.timing.duration} frames
          </div>
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '12px',
            }}
          >
            ✓
          </div>
        )}

        {/* Drop Indicator */}
        {isOver && canDrop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed #10b981',
              borderRadius: '8px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Drag Handle (optional) */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '4px',
          transform: 'translateY(-50%)',
          cursor: 'grab',
          opacity: 0.3,
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '0.3';
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5" />
          <circle cx="4" cy="8" r="1.5" />
          <circle cx="4" cy="12" r="1.5" />
          <circle cx="8" cy="4" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="12" r="1.5" />
        </svg>
      </div>

      {/* Copy Mode Indicator */}
      <CopyModeIndicator isVisible={isDragging && isCopyMode} itemCount={1} />
      
      {/* Cancel Notification */}
      <CancelNotification isVisible={showCancelAnimation} />
    </motion.div>
    </CancelAnimation>
    </>
  );
}

/**
 * DraggableShot with Multiple Selection Support
 * 
 * Validates: Requirement 2.5 - Group drag with visual counter
 */
interface DraggableShotGroupProps extends DraggableShotProps {
  selectedCount?: number;
}

export function DraggableShotGroup({
  shot,
  isSelected,
  selectedCount = 0,
  onDragStart,
  onDragEnd,
}: DraggableShotGroupProps) {
  return (
    <div style={{ position: 'relative' }}>
      <DraggableShot
        shot={shot}
        isSelected={isSelected}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />

      {/* Multiple Selection Counter */}
      {isSelected && selectedCount > 1 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          style={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            backgroundColor: '#ef4444',
            color: 'white',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            zIndex: 10,
          }}
        >
          {selectedCount}
        </motion.div>
      )}
    </div>
  );
}
