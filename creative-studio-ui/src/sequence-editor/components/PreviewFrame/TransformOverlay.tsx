import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store';
import { updateLayer } from '../../store/slices/timelineSlice';
import type { Shot, Layer, Transform } from '../../types';
import './transformOverlay.css';

interface TransformOverlayProps {
    shot: Shot;
    layer: Layer;
    canvasWidth: number;
    canvasHeight: number;
    zoom: number;
    pan: { x: number; y: number };
}

export const TransformOverlay: React.FC<TransformOverlayProps> = ({
    shot,
    layer,
    canvasWidth,
    canvasHeight,
    zoom,
    pan,
}) => {
    const dispatch = useAppDispatch();
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<'move' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br' | 'rotate' | null>(null);
    const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
    const [initialTransform, setInitialTransform] = useState<Transform | null>(null);

    const transform = (layer.data as any).transform as Transform || {
        position: { x: 0, y: 0 },
        scale: { x: 1, y: 1 },
        rotation: 0,
        anchor: { x: 0.5, y: 0.5 },
    };

    // Convert normalized coordinates to pixel coordinates
    const posX = (transform.position.x + 0.5) * canvasWidth;
    const posY = (transform.position.y + 0.5) * canvasHeight;
    const width = transform.scale.x * canvasWidth;
    const height = transform.scale.y * canvasHeight;

    const handleMouseDown = (e: React.MouseEvent, mode: typeof dragMode) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragMode(mode);
        setInitialMousePos({ x: e.clientX, y: e.clientY });
        setInitialTransform({ ...transform });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !initialTransform || !dragMode) return;

        const dx = (e.clientX - initialMousePos.x) / zoom;
        const dy = (e.clientY - initialMousePos.y) / zoom;

        let newTransform = { ...initialTransform };

        if (dragMode === 'move') {
            newTransform.position = {
                x: initialTransform.position.x + dx / canvasWidth,
                y: initialTransform.position.y + dy / canvasHeight,
            };
        } else if (dragMode.startsWith('scale')) {
            // Simple scaling logic (fixed aspect ratio could be added)
            const scaleDx = dx / canvasWidth;
            const scaleDy = dy / canvasHeight;

            if (dragMode === 'scale-br') {
                newTransform.scale = {
                    x: Math.max(0.1, initialTransform.scale.x + scaleDx * 2),
                    y: Math.max(0.1, initialTransform.scale.y + scaleDy * 2),
                };
            }
            // TODO: Implement other corners
        } else if (dragMode === 'rotate') {
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            newTransform.rotation = initialTransform.rotation + angle;
        }

        dispatch(updateLayer({
            shotId: shot.id,
            layerId: layer.id,
            updates: {
                data: {
                    ...layer.data,
                    transform: newTransform,
                },
            },
        }));
    }, [isDragging, initialTransform, dragMode, initialMousePos, zoom, canvasWidth, canvasHeight, dispatch, shot.id, layer.id]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
        setDragMode(null);
    }, []);

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const overlayStyle: React.CSSProperties = {
        position: 'absolute',
        left: posX - width / 2,
        top: posY - height / 2,
        width: width,
        height: height,
        transform: `rotate(${transform.rotation}deg)`,
        border: '2px solid var(--primary-color, #4A90E2)',
        boxSizing: 'border-box',
        cursor: 'move',
        pointerEvents: 'all',
    };

    if (layer.locked) return null;

    return (
        <div
            className="transform-overlay"
            style={overlayStyle}
            onMouseDown={(e) => handleMouseDown(e, 'move')}
        >
            {/* Resizing handles */}
            <div className="handle tl" onMouseDown={(e) => handleMouseDown(e, 'scale-tl')}></div>
            <div className="handle tr" onMouseDown={(e) => handleMouseDown(e, 'scale-tr')}></div>
            <div className="handle bl" onMouseDown={(e) => handleMouseDown(e, 'scale-bl')}></div>
            <div className="handle br" onMouseDown={(e) => handleMouseDown(e, 'scale-br')}></div>

            {/* Rotation handle */}
            <div className="rotate-handle" onMouseDown={(e) => handleMouseDown(e, 'rotate')}>
                <div className="rotate-line"></div>
                <div className="rotate-knob"></div>
            </div>
        </div>
    );
};
