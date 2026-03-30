import React, { useState, useCallback, useEffect } from 'react';
import { useAppDispatch } from '../../store';
import { updateShotLayer } from '../../store/slices/timelineSlice';
import type { Shot, Layer, Transform } from '../../types';
import './transformOverlay.css';

type DragMode = 'move' | 'scale-tl' | 'scale-tr' | 'scale-bl' | 'scale-br' | 'rotate';

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
    pan: _pan,
}) => {
    const dispatch = useAppDispatch();
    const [isDragging, setIsDragging] = useState(false);
    const [dragMode, setDragMode] = useState<DragMode | null>(null);
    const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
    const [initialTransform, setInitialTransform] = useState<Transform | null>(null);

    const transform = (layer.data as unknown as { transform?: Transform }).transform as Transform || {
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

    const handleMouseDown = (e: React.MouseEvent, mode: DragMode) => {
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

        const newTransform = { ...initialTransform };

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

        dispatch(updateShotLayer({
            shotId: shot.id,
            layerId: layer.id,
            updates: {
                data: {
                    ...layer.data,
                    transform: newTransform,
                },
            },
        }));
    }, [isDragging, initialTransform, dragMode, initialMousePos, zoom, canvasWidth, canvasHeight, dispatch, shot.id, layer.id, layer.data]);

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

    const overlayRef = React.useRef<HTMLDivElement>(null);

    React.useLayoutEffect(() => {
        if (overlayRef.current) {
            overlayRef.current.style.setProperty('--posX', `${posX - width / 2}px`);
            overlayRef.current.style.setProperty('--posY', `${posY - height / 2}px`);
            overlayRef.current.style.setProperty('--width', `${width}px`);
            overlayRef.current.style.setProperty('--height', `${height}px`);
            overlayRef.current.style.setProperty('--rotation', `${transform.rotation}deg`);
        }
    }, [posX, posY, width, height, transform.rotation]);

    if (layer.locked) return null;

    return (
        <div
            ref={overlayRef}
            className="transform-overlay"
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
