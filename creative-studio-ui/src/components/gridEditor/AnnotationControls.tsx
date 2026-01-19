/**
 * AnnotationControls Component - UI controls for annotation tools
 * 
 * Provides:
 * - Annotation mode toggle
 * - Color picker for stroke and fill
 * - Stroke width controls
 * - Annotation visibility toggle
 * - Delete annotation button
 * 
 * Requirements: 12.1, 12.5, 12.6
 */

import React, { useState } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import type { AnnotationToolType } from './AnnotationTools';
import type { Panel, AnnotationContent } from '../../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface AnnotationControlsProps {
  /**
   * Currently selected panel (if any)
   */
  selectedPanel?: Panel;
  
  /**
   * Active annotation tool
   */
  activeTool: AnnotationToolType;
  
  /**
   * Callback when tool changes
   */
  onToolChange: (tool: AnnotationToolType) => void;
  
  /**
   * Drawing style
   */
  style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  };
  
  /**
   * Callback when style changes
   */
  onStyleChange: (style: {
    strokeColor: string;
    strokeWidth: number;
    fillColor?: string;
    opacity: number;
  }) => void;
  
  /**
   * Text style
   */
  textStyle: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  };
  
  /**
   * Callback when text style changes
   */
  onTextStyleChange: (style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    backgroundColor?: string;
  }) => void;
  
  /**
   * Whether annotations are visible
   */
  annotationsVisible: boolean;
  
  /**
   * Callback when visibility changes
   */
  onVisibilityChange: (visible: boolean) => void;
}

// ============================================================================
// Tool Configuration
// ============================================================================

interface ToolButtonConfig {
  id: AnnotationToolType;
  label: string;
  icon: string;
  title: string;
}

const ANNOTATION_TOOLS: ToolButtonConfig[] = [
  { id: 'pen', label: 'Pen', icon: '✏️', title: 'Freehand Drawing' },
  { id: 'line', label: 'Line', icon: '📏', title: 'Draw Line' },
  { id: 'rectangle', label: 'Rect', icon: '▭', title: 'Draw Rectangle' },
  { id: 'ellipse', label: 'Ellipse', icon: '⬭', title: 'Draw Ellipse' },
  { id: 'text', label: 'Text', icon: 'T', title: 'Add Text' },
];

// ============================================================================
// Preset Colors
// ============================================================================

const PRESET_COLORS = [
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FFFFFF', // White
  '#000000', // Black
  '#FFA500', // Orange
  '#800080', // Purple
];

// ============================================================================
// Component
// ============================================================================

export const AnnotationControls: React.FC<AnnotationControlsProps> = ({
  selectedPanel,
  activeTool,
  onToolChange,
  style,
  onStyleChange,
  textStyle,
  onTextStyleChange,
  annotationsVisible,
  onVisibilityChange,
}) => {
  const removeLayer = useGridStore((state) => state.removeLayer);
  
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);

  // Get annotation layer from selected panel
  const annotationLayer = selectedPanel?.layers.find(
    (layer) => layer.type === 'annotation'
  );

  const hasAnnotations = annotationLayer && 
    ((annotationLayer.content as AnnotationContent).drawings.length > 0 ||
     (annotationLayer.content as AnnotationContent).textAnnotations.length > 0);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleDeleteAnnotations = () => {
    if (!selectedPanel || !annotationLayer) return;
    
    if (window.confirm('Delete all annotations from this panel?')) {
      removeLayer(selectedPanel.id, annotationLayer.id);
    }
  };

  const handleStrokeColorChange = (color: string) => {
    onStyleChange({ ...style, strokeColor: color });
    setShowColorPicker(false);
  };

  const handleFillColorChange = (color: string) => {
    onStyleChange({ ...style, fillColor: color });
    setShowFillColorPicker(false);
  };

  const handleStrokeWidthChange = (width: number) => {
    onStyleChange({ ...style, strokeWidth: width });
  };

  const handleOpacityChange = (opacity: number) => {
    onStyleChange({ ...style, opacity });
  };

  const handleTextColorChange = (color: string) => {
    onTextStyleChange({ ...textStyle, color });
  };

  const handleFontSizeChange = (fontSize: number) => {
    onTextStyleChange({ ...textStyle, fontSize });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '16px',
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        color: '#ccc',
        minWidth: '250px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '8px',
          borderBottom: '1px solid #444',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>
          Annotation Tools
        </h3>
        
        {/* Visibility Toggle */}
        <button
          type="button"
          onClick={() => onVisibilityChange(!annotationsVisible)}
          title={annotationsVisible ? 'Hide Annotations' : 'Show Annotations'}
          style={{
            padding: '4px 8px',
            backgroundColor: annotationsVisible ? '#4a90e2' : '#3a3a3a',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          {annotationsVisible ? '👁️ Visible' : '👁️‍🗨️ Hidden'}
        </button>
      </div>

      {/* Tool Selection */}
      <div>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
          Drawing Tool
        </label>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {ANNOTATION_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => onToolChange(tool.id)}
              title={tool.title}
              style={{
                flex: '1 1 45%',
                padding: '8px',
                backgroundColor: activeTool === tool.id ? '#4a90e2' : '#3a3a3a',
                color: '#fff',
                border: activeTool === tool.id ? '2px solid #5aa3ff' : '1px solid #555',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: activeTool === tool.id ? '600' : '400',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '16px' }}>{tool.icon}</span>
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Drawing Style Controls */}
      {activeTool !== 'text' && (
        <>
          {/* Stroke Color */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Stroke Color
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: style.strokeColor,
                  border: '2px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#fff',
                  textShadow: '0 0 2px #000',
                  fontWeight: '500',
                }}
              >
                {style.strokeColor}
              </button>
              
              {showColorPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    padding: '8px',
                    backgroundColor: '#3a3a3a',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px',
                    zIndex: 1000,
                  }}
                >
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleStrokeColorChange(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: color === style.strokeColor ? '2px solid #fff' : '1px solid #555',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fill Color (for shapes) */}
          {(activeTool === 'rectangle' || activeTool === 'ellipse') && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
                Fill Color (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowFillColorPicker(!showFillColorPicker)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: style.fillColor || 'transparent',
                    border: '2px solid #555',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#fff',
                    textShadow: '0 0 2px #000',
                    fontWeight: '500',
                  }}
                >
                  {style.fillColor || 'None'}
                </button>
                
                {showFillColorPicker && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '4px',
                      padding: '8px',
                      backgroundColor: '#3a3a3a',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '4px',
                      zIndex: 1000,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleFillColorChange('')}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: 'transparent',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                      title="No Fill"
                    >
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                        width: '100%',
                        height: '2px',
                        backgroundColor: '#f00',
                      }} />
                    </button>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => handleFillColorChange(color)}
                        style={{
                          width: '32px',
                          height: '32px',
                          backgroundColor: color,
                          border: color === style.fillColor ? '2px solid #fff' : '1px solid #555',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Stroke Width */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Stroke Width: {style.strokeWidth}px
            </label>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={style.strokeWidth}
              onChange={(e) => handleStrokeWidthChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Opacity */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Opacity: {Math.round(style.opacity * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={style.opacity}
              onChange={(e) => handleOpacityChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {/* Text Style Controls */}
      {activeTool === 'text' && (
        <>
          {/* Text Color */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Text Color
            </label>
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowColorPicker(!showColorPicker)}
                style={{
                  width: '100%',
                  padding: '8px',
                  backgroundColor: textStyle.color,
                  border: '2px solid #555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  color: '#fff',
                  textShadow: '0 0 2px #000',
                  fontWeight: '500',
                }}
              >
                {textStyle.color}
              </button>
              
              {showColorPicker && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    padding: '8px',
                    backgroundColor: '#3a3a3a',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '4px',
                    zIndex: 1000,
                  }}
                >
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => handleTextColorChange(color)}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: color,
                        border: color === textStyle.color ? '2px solid #fff' : '1px solid #555',
                        borderRadius: '4px',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Font Size */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500' }}>
              Font Size: {textStyle.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="72"
              step="2"
              value={textStyle.fontSize}
              onChange={(e) => handleFontSizeChange(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}

      {/* Delete Annotations Button */}
      {hasAnnotations && (
        <button
          type="button"
          onClick={handleDeleteAnnotations}
          style={{
            padding: '8px 16px',
            backgroundColor: '#d32f2f',
            color: '#fff',
            border: '1px solid #b71c1c',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            marginTop: '8px',
          }}
        >
          🗑️ Delete All Annotations
        </button>
      )}
    </div>
  );
};

export default AnnotationControls;
