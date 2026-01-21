/**
 * AnnotationIntegration Example - Demonstrates annotation system integration
 * 
 * This example shows how to integrate the annotation system into the grid editor:
 * - AnnotationTools for drawing
 * - AnnotationRenderer for displaying annotations
 * - AnnotationControls for UI controls
 * 
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6, 12.7
 */

import React, { useState } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { AnnotationTools, AnnotationToolType } from './AnnotationTools';
import { AnnotationRenderer } from './AnnotationRenderer';
import { AnnotationControls } from './AnnotationControls';
import type { Panel } from '../../types/gridEditor';

// ============================================================================
// Example Component
// ============================================================================

export const AnnotationIntegrationExample: React.FC = () => {
  const panels = useGridStore((state) => state.config.panels);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const activeTool = useGridStore((state) => state.activeTool);

  // Annotation state
  const [annotationTool, setAnnotationTool] = useState<AnnotationToolType>('pen');
  const [annotationsVisible, setAnnotationsVisible] = useState(true);
  
  // Drawing style state
  const [drawingStyle, setDrawingStyle] = useState({
    strokeColor: '#FF0000',
    strokeWidth: 3,
    fillColor: undefined as string | undefined,
    opacity: 1.0,
  });
  
  // Text style state
  const [textStyle, setTextStyle] = useState({
    fontSize: 24,
    fontFamily: 'Arial, sans-serif',
    color: '#FFFFFF',
    backgroundColor: undefined as string | undefined,
  });

  // Get selected panel
  const selectedPanel = panels.find((p) => selectedPanelIds.includes(p.id));

  // Mock panel bounds for demonstration
  const getPanelBounds = (panel: Panel) => ({
    x: (panel.position.col * 400) + 50,
    y: (panel.position.row * 400) + 50,
    width: 380,
    height: 380,
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1a1a1a' }}>
      {/* Main Canvas Area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* Grid Display (simplified for example) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {panels.map((panel) => {
            const bounds = getPanelBounds(panel);
            const isSelected = selectedPanelIds.includes(panel.id);
            
            return (
              <div
                key={panel.id}
                style={{
                  position: 'absolute',
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                  border: isSelected ? '3px solid #4a90e2' : '1px solid #444',
                  backgroundColor: '#2a2a2a',
                  boxSizing: 'border-box',
                }}
              >
                {/* Panel content would go here */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '14px',
                  }}
                >
                  Panel {panel.position.row * 3 + panel.position.col + 1}
                </div>

                {/* Annotation Renderer - displays existing annotations */}
                <AnnotationRenderer
                  panel={panel}
                  panelBounds={bounds}
                  annotationsVisible={annotationsVisible}
                />

                {/* Annotation Tools - only for selected panel in annotate mode */}
                {isSelected && activeTool === 'annotate' && (
                  <AnnotationTools
                    panel={panel}
                    panelBounds={bounds}
                    activeTool={annotationTool}
                    style={drawingStyle}
                    textStyle={textStyle}
                    onAnnotationCreated={() => {
                      ;
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Annotation Controls Sidebar */}
      {activeTool === 'annotate' && (
        <div
          style={{
            width: '300px',
            padding: '16px',
            backgroundColor: '#1a1a1a',
            borderLeft: '1px solid #444',
            overflowY: 'auto',
          }}
        >
          <AnnotationControls
            selectedPanel={selectedPanel}
            activeTool={annotationTool}
            onToolChange={setAnnotationTool}
            style={drawingStyle}
            onStyleChange={(style) => setDrawingStyle({
              strokeColor: style.strokeColor,
              strokeWidth: style.strokeWidth,
              fillColor: style.fillColor,
              opacity: style.opacity,
            })}
            textStyle={textStyle}
            onTextStyleChange={(style) => setTextStyle({
              fontSize: style.fontSize,
              fontFamily: style.fontFamily,
              color: style.color,
              backgroundColor: style.backgroundColor,
            })}
            annotationsVisible={annotationsVisible}
            onVisibilityChange={setAnnotationsVisible}
          />

          {/* Usage Instructions */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              color: '#ccc',
              fontSize: '12px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600' }}>
              How to Use Annotations
            </h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li style={{ marginBottom: '8px' }}>
                Select a panel by clicking on it
              </li>
              <li style={{ marginBottom: '8px' }}>
                Choose an annotation tool (Pen, Line, Rectangle, Ellipse, or Text)
              </li>
              <li style={{ marginBottom: '8px' }}>
                Adjust colors, stroke width, and opacity as needed
              </li>
              <li style={{ marginBottom: '8px' }}>
                Draw on the selected panel
              </li>
              <li style={{ marginBottom: '8px' }}>
                Toggle visibility to show/hide all annotations
              </li>
              <li>
                Delete all annotations from a panel using the delete button
              </li>
            </ol>
          </div>

          {/* Keyboard Shortcuts */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: '#2a2a2a',
              borderRadius: '8px',
              color: '#ccc',
              fontSize: '12px',
            }}
          >
            <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600' }}>
              Keyboard Shortcuts
            </h4>
            <ul style={{ margin: 0, paddingLeft: '20px', listStyle: 'none' }}>
              <li style={{ marginBottom: '6px' }}>
                <kbd style={{ 
                  padding: '2px 6px', 
                  backgroundColor: '#3a3a3a', 
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}>
                  A
                </kbd> - Activate Annotate Tool
              </li>
              <li style={{ marginBottom: '6px' }}>
                <kbd style={{ 
                  padding: '2px 6px', 
                  backgroundColor: '#3a3a3a', 
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}>
                  Esc
                </kbd> - Cancel text input
              </li>
              <li>
                <kbd style={{ 
                  padding: '2px 6px', 
                  backgroundColor: '#3a3a3a', 
                  borderRadius: '3px',
                  fontFamily: 'monospace',
                }}>
                  Enter
                </kbd> - Confirm text input
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnotationIntegrationExample;
