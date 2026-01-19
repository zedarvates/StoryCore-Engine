/**
 * AnnotationTools Component - Drawing tools for annotations
 * 
 * Provides:
 * - Pen tool for freehand drawing
 * - Shape tools (rectangle, ellipse, line)
 * - Text annotation tool
 * - Stores annotations as separate layer type
 * 
 * Requirements: 12.1, 12.2, 12.3
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import type { 
  Panel, 
  Point, 
  DrawingElement, 
  TextAnnotation,
  AnnotationContent,
  Layer
} from '../../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

export type AnnotationToolType = 'pen' | 'rectangle' | 'ellipse' | 'line' | 'text';

export interface AnnotationToolsProps {
  /**
   * The panel to annotate
   */
  panel: Panel;
  
  /**
   * Panel bounds in screen space
   */
  panelBounds: { x: number; y: number; width: number; height: number };
  
  /**
   * Active annotation tool
   */
  activeTool: AnnotationToolType;
  
  /**
   * Drawing style settings
   */
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
  
  /**
   * Text style settings
   */
  textStyle: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
  
  /**
   * Callback when annotation is created
   */
  onAnnotationCreated?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export const AnnotationTools: React.FC<AnnotationToolsProps> = ({
  panel,
  panelBounds,
  activeTool,
  style,
  textStyle,
  onAnnotationCreated,
}) => {
  const addLayer = useGridStore((state) => state.addLayer);
  const updateLayer = useGridStore((state) => state.updateLayer);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [textInput, setTextInput] = useState<{ position: Point; visible: boolean }>({
    position: { x: 0, y: 0 },
    visible: false,
  });
  const [textValue, setTextValue] = useState('');
  
  const svgRef = useRef<SVGSVGElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Convert screen coordinates to panel-relative coordinates (0-1 normalized)
   */
  const screenToPanel = useCallback((screenPoint: Point): Point => {
    return {
      x: (screenPoint.x - panelBounds.x) / panelBounds.width,
      y: (screenPoint.y - panelBounds.y) / panelBounds.height,
    };
  }, [panelBounds]);

  /**
   * Convert panel-relative coordinates to screen coordinates
   */
  const panelToScreen = useCallback((panelPoint: Point): Point => {
    return {
      x: panelPoint.x * panelBounds.width + panelBounds.x,
      y: panelPoint.y * panelBounds.height + panelBounds.y,
    };
  }, [panelBounds]);

  /**
   * Get or create annotation layer for the panel
   */
  const getAnnotationLayer = useCallback((): Layer | null => {
    return panel.layers.find(
      (layer) => layer.type === 'annotation'
    ) || null;
  }, [panel.layers]);

  /**
   * Create a new annotation layer if it doesn't exist
   */
  const ensureAnnotationLayer = useCallback((): Layer => {
    let annotationLayer = getAnnotationLayer();
    
    if (!annotationLayer) {
      const newLayer: Layer = {
        id: `annotation-${Date.now()}`,
        name: 'Annotations',
        type: 'annotation',
        visible: true,
        locked: false,
        opacity: 1.0,
        blendMode: 'normal',
        content: {
          type: 'annotation',
          drawings: [],
          textAnnotations: [],
        },
      };
      
      addLayer(panel.id, newLayer);
      annotationLayer = newLayer;
    }
    
    return annotationLayer;
  }, [panel.id, getAnnotationLayer, addLayer]);

  /**
   * Add a drawing element to the annotation layer
   */
  const addDrawingElement = useCallback((element: DrawingElement) => {
    const layer = ensureAnnotationLayer();
    const content = layer.content as AnnotationContent;
    
    const updatedContent: AnnotationContent = {
      ...content,
      drawings: [...content.drawings, element],
    };
    
    updateLayer(panel.id, layer.id, { content: updatedContent });
    onAnnotationCreated?.();
  }, [panel.id, ensureAnnotationLayer, updateLayer, onAnnotationCreated]);

  /**
   * Add a text annotation to the annotation layer
   */
  const addTextAnnotation = useCallback((annotation: TextAnnotation) => {
    const layer = ensureAnnotationLayer();
    const content = layer.content as AnnotationContent;
    
    const updatedContent: AnnotationContent = {
      ...content,
      textAnnotations: [...content.textAnnotations, annotation],
    };
    
    updateLayer(panel.id, layer.id, { content: updatedContent });
    onAnnotationCreated?.();
  }, [panel.id, ensureAnnotationLayer, updateLayer, onAnnotationCreated]);

  // ============================================================================
  // Drawing Event Handlers
  // ============================================================================

  const handleMouseDown = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'text') {
      // Text tool - show input at click position
      const point = screenToPanel({ x: event.clientX, y: event.clientY });
      setTextInput({ position: point, visible: true });
      setTextValue('');
      return;
    }

    // Start drawing
    setIsDrawing(true);
    const point = screenToPanel({ x: event.clientX, y: event.clientY });
    setStartPoint(point);
    setCurrentPoints([point]);
  }, [activeTool, screenToPanel]);

  const handleMouseMove = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawing || !startPoint) return;

    const point = screenToPanel({ x: event.clientX, y: event.clientY });

    if (activeTool === 'pen') {
      // Freehand drawing - add points continuously
      setCurrentPoints((prev) => [...prev, point]);
    } else {
      // Shape tools - update end point
      setCurrentPoints([startPoint, point]);
    }
  }, [isDrawing, startPoint, activeTool, screenToPanel]);

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || currentPoints.length === 0) return;

    // Create drawing element based on tool type
    const element: DrawingElement = {
      id: `drawing-${Date.now()}`,
      type: activeTool === 'pen' ? 'path' : (activeTool === 'text' ? 'path' : activeTool),
      points: currentPoints,
      style: {
        strokeColor: style.strokeColor,
        strokeWidth: style.strokeWidth,
        fillColor: style.fillColor,
        opacity: style.opacity,
      },
    };

    addDrawingElement(element);

    // Reset drawing state
    setIsDrawing(false);
    setCurrentPoints([]);
    setStartPoint(null);
  }, [isDrawing, currentPoints, activeTool, style, addDrawingElement]);

  // ============================================================================
  // Text Input Handlers
  // ============================================================================

  const handleTextSubmit = useCallback(() => {
    if (!textValue.trim() || !textInput.visible) return;

    const annotation: TextAnnotation = {
      id: `text-${Date.now()}`,
      text: textValue,
      position: textInput.position,
      style: {
        fontSize: textStyle.fontSize,
        fontFamily: textStyle.fontFamily,
        color: textStyle.color,
        backgroundColor: textStyle.backgroundColor,
      },
    };

    addTextAnnotation(annotation);

    // Reset text input
    setTextInput({ position: { x: 0, y: 0 }, visible: false });
    setTextValue('');
  }, [textValue, textInput, textStyle, addTextAnnotation]);

  const handleTextKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleTextSubmit();
    } else if (event.key === 'Escape') {
      setTextInput({ position: { x: 0, y: 0 }, visible: false });
      setTextValue('');
    }
  }, [handleTextSubmit]);

  // Focus text input when it becomes visible
  useEffect(() => {
    if (textInput.visible && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInput.visible]);

  // ============================================================================
  // Render Preview
  // ============================================================================

  const renderPreview = () => {
    if (!isDrawing || currentPoints.length === 0) return null;

    const screenPoints = currentPoints.map(panelToScreen);

    switch (activeTool) {
      case 'pen':
        // Freehand path
        const pathData = screenPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <path
            d={pathData}
            stroke={style.strokeColor}
            strokeWidth={style.strokeWidth}
            fill="none"
            opacity={style.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );

      case 'line':
        // Straight line
        if (screenPoints.length >= 2) {
          const start = screenPoints[0];
          const end = screenPoints[screenPoints.length - 1];
          return (
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={style.strokeColor}
              strokeWidth={style.strokeWidth}
              opacity={style.opacity}
              strokeLinecap="round"
            />
          );
        }
        return null;

      case 'rectangle':
        // Rectangle
        if (screenPoints.length >= 2) {
          const start = screenPoints[0];
          const end = screenPoints[screenPoints.length - 1];
          const x = Math.min(start.x, end.x);
          const y = Math.min(start.y, end.y);
          const width = Math.abs(end.x - start.x);
          const height = Math.abs(end.y - start.y);
          return (
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              stroke={style.strokeColor}
              strokeWidth={style.strokeWidth}
              fill={style.fillColor || 'none'}
              opacity={style.opacity}
            />
          );
        }
        return null;

      case 'ellipse':
        // Ellipse
        if (screenPoints.length >= 2) {
          const start = screenPoints[0];
          const end = screenPoints[screenPoints.length - 1];
          const cx = (start.x + end.x) / 2;
          const cy = (start.y + end.y) / 2;
          const rx = Math.abs(end.x - start.x) / 2;
          const ry = Math.abs(end.y - start.y) / 2;
          return (
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              stroke={style.strokeColor}
              strokeWidth={style.strokeWidth}
              fill={style.fillColor || 'none'}
              opacity={style.opacity}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const textScreenPos = textInput.visible ? panelToScreen(textInput.position) : null;

  return (
    <>
      {/* SVG overlay for drawing */}
      <svg
        ref={svgRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'all',
          cursor: activeTool === 'text' ? 'text' : 'crosshair',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {renderPreview()}
      </svg>

      {/* Text input overlay */}
      {textInput.visible && textScreenPos && (
        <input
          ref={textInputRef}
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={handleTextKeyDown}
          onBlur={handleTextSubmit}
          style={{
            position: 'absolute',
            left: `${textScreenPos.x}px`,
            top: `${textScreenPos.y}px`,
            fontSize: `${textStyle.fontSize}px`,
            fontFamily: textStyle.fontFamily,
            color: textStyle.color,
            backgroundColor: textStyle.backgroundColor || 'transparent',
            border: '1px solid #4a90e2',
            outline: 'none',
            padding: '4px 8px',
            borderRadius: '2px',
            minWidth: '100px',
            zIndex: 1000,
          }}
        />
      )}
    </>
  );
};

export default AnnotationTools;
