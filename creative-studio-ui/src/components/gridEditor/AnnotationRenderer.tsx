/**
 * AnnotationRenderer Component - Renders annotations from annotation layers
 * 
 * Renders:
 * - Drawing elements (paths, shapes)
 * - Text annotations
 * - Respects layer visibility and opacity
 * 
 * Requirements: 12.2, 12.4, 12.7
 */

import React from 'react';
import type { 
  Panel, 
  Layer,
  AnnotationContent,
  DrawingElement,
  TextAnnotation,
  Point
} from '../../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnnotationRendererProps {
  /**
   * The panel containing annotations
   */
  panel: Panel;
  
  /**
   * Panel bounds in screen space
   */
  panelBounds: { x: number; y: number; width: number; height: number };
  
  /**
   * Whether annotations are visible (global toggle)
   */
  annotationsVisible?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const AnnotationRenderer: React.FC<AnnotationRendererProps> = ({
  panel,
  panelBounds,
  annotationsVisible = true,
}) => {
  // Get annotation layers
  const annotationLayers = panel.layers.filter(
    (layer) => layer.type === 'annotation' && layer.visible
  );

  if (!annotationsVisible || annotationLayers.length === 0) {
    return null;
  }

  /**
   * Convert panel-relative coordinates (0-1) to screen coordinates
   */
  const panelToScreen = (panelPoint: Point): Point => {
    return {
      x: panelPoint.x * panelBounds.width + panelBounds.x,
      y: panelPoint.y * panelBounds.height + panelBounds.y,
    };
  };

  /**
   * Render a single drawing element
   */
  const renderDrawing = (drawing: DrawingElement, layerOpacity: number) => {
    const screenPoints = drawing.points.map(panelToScreen);
    const opacity = drawing.style.opacity * layerOpacity;

    switch (drawing.type) {
      case 'path':
        // Freehand path
        const pathData = screenPoints
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
          .join(' ');
        return (
          <path
            key={drawing.id}
            d={pathData}
            stroke={drawing.style.strokeColor}
            strokeWidth={drawing.style.strokeWidth}
            fill="none"
            opacity={opacity}
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
              key={drawing.id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={drawing.style.strokeColor}
              strokeWidth={drawing.style.strokeWidth}
              opacity={opacity}
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
              key={drawing.id}
              x={x}
              y={y}
              width={width}
              height={height}
              stroke={drawing.style.strokeColor}
              strokeWidth={drawing.style.strokeWidth}
              fill={drawing.style.fillColor || 'none'}
              opacity={opacity}
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
              key={drawing.id}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              stroke={drawing.style.strokeColor}
              strokeWidth={drawing.style.strokeWidth}
              fill={drawing.style.fillColor || 'none'}
              opacity={opacity}
            />
          );
        }
        return null;

      default:
        return null;
    }
  };

  /**
   * Render a single text annotation
   */
  const renderText = (text: TextAnnotation, layerOpacity: number) => {
    const screenPos = panelToScreen(text.position);
    
    return (
      <g key={text.id}>
        {/* Background rectangle if specified */}
        {text.style.backgroundColor && (
          <rect
            x={screenPos.x - 4}
            y={screenPos.y - text.style.fontSize}
            width={text.text.length * text.style.fontSize * 0.6 + 8}
            height={text.style.fontSize + 8}
            fill={text.style.backgroundColor}
            opacity={layerOpacity * 0.8}
            rx={2}
          />
        )}
        
        {/* Text */}
        <text
          x={screenPos.x}
          y={screenPos.y}
          fontSize={text.style.fontSize}
          fontFamily={text.style.fontFamily}
          fill={text.style.color}
          opacity={layerOpacity}
          style={{ userSelect: 'none' }}
        >
          {text.text}
        </text>
      </g>
    );
  };

  /**
   * Render all annotations from a layer
   */
  const renderLayer = (layer: Layer) => {
    const content = layer.content as AnnotationContent;
    
    return (
      <g key={layer.id} opacity={layer.opacity}>
        {/* Render all drawings */}
        {content.drawings.map((drawing) => renderDrawing(drawing, layer.opacity))}
        
        {/* Render all text annotations */}
        {content.textAnnotations.map((text) => renderText(text, layer.opacity))}
      </g>
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      {annotationLayers.map(renderLayer)}
    </svg>
  );
};

export default AnnotationRenderer;
