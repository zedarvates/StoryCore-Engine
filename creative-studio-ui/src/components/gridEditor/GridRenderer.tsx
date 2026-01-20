import React, { useRef, useEffect, useCallback } from 'react';
import { Panel, ViewportState } from '../../types/gridEditor';

interface GridRendererProps {
  panels: Panel[];
  selectedPanelIds: string[];
  viewport: ViewportState;
  onPanelClick: (panelId: string, event: React.MouseEvent) => void;
  onPanelDoubleClick?: (panelId: string, event: React.MouseEvent) => void;
}

/**
 * GridRenderer - Canvas-based renderer for the 3x3 grid layout
 * 
 * Responsibilities:
 * - Render 3x3 grid with equal-sized cells
 * - Render individual panels with images
 * - Handle layer composition
 * - Draw grid lines and panel boundaries
 * - Handle DPI scaling for crisp rendering
 */
export const GridRenderer: React.FC<GridRendererProps> = ({
  panels,
  selectedPanelIds,
  viewport,
  onPanelClick,
  onPanelDoubleClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Constants for grid layout
  const GRID_SIZE = 3; // 3x3 grid
  const GRID_LINE_WIDTH = 2;
  const GRID_LINE_COLOR = '#e0e0e0';
  const PANEL_BORDER_COLOR = '#cccccc';
  const SELECTED_BORDER_COLOR = '#2196f3';
  const SELECTED_BORDER_WIDTH = 3;

  /**
   * Set up canvas with proper DPI handling for crisp rendering
   */
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get device pixel ratio for high-DPI displays
    const dpr = window.devicePixelRatio || 1;

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Set canvas size accounting for DPI
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Set display size (CSS pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Scale context to account for DPI
    ctx.scale(dpr, dpr);

    return { ctx, width, height };
  }, []);

  /**
   * Calculate panel bounds for a given row and column
   */
  const getPanelBounds = useCallback((row: number, col: number, canvasWidth: number, canvasHeight: number) => {
    const cellWidth = canvasWidth / GRID_SIZE;
    const cellHeight = canvasHeight / GRID_SIZE;

    return {
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    };
  }, []);

  /**
   * Load image and cache it
   */
  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    // Check cache first
    const cached = imageCache.current.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Load new image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Handle CORS
      img.onload = () => {
        imageCache.current.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  /**
   * Render a single layer with proper aspect ratio preservation
   * Supports layer composition with z-order, opacity, and blend modes
   * Requirements: 5.2, 5.8
   */
  const renderLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: any,
    bounds: { x: number; y: number; width: number; height: number },
    transform: any
  ) => {
    // Skip invisible layers
    if (!layer.visible) return;

    ctx.save();

    // Apply layer opacity (Requirements: 5.8)
    ctx.globalAlpha = layer.opacity;

    // Apply blend mode (Requirements: 5.8)
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'darken': 'darken',
      'lighten': 'lighten',
    };
    ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over';

    // Render based on layer type
    if (layer.type === 'image' && layer.content.type === 'image') {
      const img = imageCache.current.get(layer.content.url);
      if (!img) {
        ctx.restore();
        return;
      }

      // Calculate image dimensions preserving aspect ratio
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const boundsAspect = bounds.width / bounds.height;

      let drawWidth = bounds.width;
      let drawHeight = bounds.height;
      let drawX = bounds.x;
      let drawY = bounds.y;

      // Preserve aspect ratio - fit image within bounds
      if (imgAspect > boundsAspect) {
        // Image is wider - fit to width
        drawHeight = bounds.width / imgAspect;
        drawY = bounds.y + (bounds.height - drawHeight) / 2;
      } else {
        // Image is taller - fit to height
        drawWidth = bounds.height * imgAspect;
        drawX = bounds.x + (bounds.width - drawWidth) / 2;
      }

      // Apply transform if present
      if (transform) {
        ctx.translate(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        ctx.rotate((transform.rotation * Math.PI) / 180);
        ctx.scale(transform.scale.x, transform.scale.y);
        ctx.translate(-(bounds.x + bounds.width / 2), -(bounds.y + bounds.height / 2));
        ctx.translate(transform.position.x, transform.position.y);
      }

      // Draw the image
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
    } else if (layer.type === 'annotation' && layer.content.type === 'annotation') {
      // Render annotation layer (drawings and text)
      const annotationContent = layer.content;

      // Render drawings
      annotationContent.drawings?.forEach((drawing: any) => {
        ctx.save();
        ctx.strokeStyle = drawing.style.strokeColor || '#000000';
        ctx.lineWidth = drawing.style.strokeWidth || 2;
        ctx.globalAlpha = drawing.style.opacity || 1;

        if (drawing.style.fillColor) {
          ctx.fillStyle = drawing.style.fillColor;
        }

        if (drawing.type === 'path' && drawing.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(bounds.x + drawing.points[0].x * bounds.width, bounds.y + drawing.points[0].y * bounds.height);
          for (let i = 1; i < drawing.points.length; i++) {
            ctx.lineTo(bounds.x + drawing.points[i].x * bounds.width, bounds.y + drawing.points[i].y * bounds.height);
          }
          ctx.stroke();
        } else if (drawing.type === 'rectangle') {
          const rect = {
            x: bounds.x + drawing.points[0].x * bounds.width,
            y: bounds.y + drawing.points[0].y * bounds.height,
            width: (drawing.points[1].x - drawing.points[0].x) * bounds.width,
            height: (drawing.points[1].y - drawing.points[0].y) * bounds.height,
          };
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          if (drawing.style.fillColor) {
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }
        } else if (drawing.type === 'ellipse' && drawing.points.length >= 2) {
          const centerX = bounds.x + drawing.points[0].x * bounds.width;
          const centerY = bounds.y + drawing.points[0].y * bounds.height;
          const radiusX = Math.abs(drawing.points[1].x - drawing.points[0].x) * bounds.width / 2;
          const radiusY = Math.abs(drawing.points[1].y - drawing.points[0].y) * bounds.height / 2;
          
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          if (drawing.style.fillColor) {
            ctx.fill();
          }
        } else if (drawing.type === 'line' && drawing.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(bounds.x + drawing.points[0].x * bounds.width, bounds.y + drawing.points[0].y * bounds.height);
          ctx.lineTo(bounds.x + drawing.points[1].x * bounds.width, bounds.y + drawing.points[1].y * bounds.height);
          ctx.stroke();
        }

        ctx.restore();
      });

      // Render text annotations
      annotationContent.textAnnotations?.forEach((textAnnotation: any) => {
        ctx.save();
        ctx.font = `${textAnnotation.style.fontSize}px ${textAnnotation.style.fontFamily}`;
        ctx.fillStyle = textAnnotation.style.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const textX = bounds.x + textAnnotation.position.x * bounds.width;
        const textY = bounds.y + textAnnotation.position.y * bounds.height;

        // Draw background if specified
        if (textAnnotation.style.backgroundColor) {
          const metrics = ctx.measureText(textAnnotation.text);
          const padding = 4;
          ctx.fillStyle = textAnnotation.style.backgroundColor;
          ctx.fillRect(
            textX - padding,
            textY - padding,
            metrics.width + padding * 2,
            textAnnotation.style.fontSize + padding * 2
          );
          ctx.fillStyle = textAnnotation.style.color || '#000000';
        }

        ctx.fillText(textAnnotation.text, textX, textY);
        ctx.restore();
      });
    } else if (layer.type === 'effect' && layer.content.type === 'effect') {
      // Render effect layer (visual effects like blur, brightness, etc.)
      // For now, we'll just indicate the effect is present
      // In a real implementation, this would apply canvas filters or WebGL shaders
      ctx.save();
      ctx.fillStyle = 'rgba(100, 100, 255, 0.1)';
      ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
      ctx.fillStyle = '#6666ff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Effect: ${layer.content.effectType}`,
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      );
      ctx.restore();
    }

    ctx.restore();
  }, []);

  /**
   * Render a single panel with all its layers
   * Renders layers in correct z-order (bottom to top)
   * Requirements: 5.2, 5.8
   */
  const renderPanel = useCallback((
    ctx: CanvasRenderingContext2D,
    panel: Panel,
    bounds: { x: number; y: number; width: number; height: number },
    isSelected: boolean
  ) => {
    // Draw panel background
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Render layers in correct z-order (Requirements: 5.2)
    // Layers are stored bottom-to-top, so render in order
    const visibleLayers = panel.layers.filter(layer => layer.visible);
    
    if (visibleLayers.length === 0) {
      // Draw placeholder for empty panel
      ctx.save();
      ctx.fillStyle = '#999999';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `Panel ${panel.position.row * GRID_SIZE + panel.position.col + 1}`,
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2
      );
      ctx.restore();
    } else {
      // Render each visible layer in z-order (bottom to top)
      // Index 0 = bottom layer, last index = top layer
      visibleLayers.forEach(layer => {
        renderLayer(ctx, layer, bounds, panel.transform);
      });
    }

    // Draw panel border
    ctx.strokeStyle = isSelected ? SELECTED_BORDER_COLOR : PANEL_BORDER_COLOR;
    ctx.lineWidth = isSelected ? SELECTED_BORDER_WIDTH : 1;
    ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw selection indicator
    if (isSelected) {
      ctx.save();
      ctx.strokeStyle = SELECTED_BORDER_COLOR;
      ctx.lineWidth = SELECTED_BORDER_WIDTH;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        bounds.x + SELECTED_BORDER_WIDTH,
        bounds.y + SELECTED_BORDER_WIDTH,
        bounds.width - SELECTED_BORDER_WIDTH * 2,
        bounds.height - SELECTED_BORDER_WIDTH * 2
      );
      ctx.restore();
    }
  }, [renderLayer]);

  /**
   * Render the complete 3x3 grid
   */
  const renderGrid = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Render all panels
    panels.forEach(panel => {
      const bounds = getPanelBounds(panel.position.row, panel.position.col, width, height);
      const isSelected = selectedPanelIds.includes(panel.id);
      renderPanel(ctx, panel, bounds, isSelected);
    });

    // Draw grid lines
    ctx.strokeStyle = GRID_LINE_COLOR;
    ctx.lineWidth = GRID_LINE_WIDTH;

    const cellWidth = width / GRID_SIZE;
    const cellHeight = height / GRID_SIZE;

    // Vertical lines
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellWidth, 0);
      ctx.lineTo(i * cellWidth, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellHeight);
      ctx.lineTo(width, i * cellHeight);
      ctx.stroke();
    }
  }, [panels, selectedPanelIds, getPanelBounds, renderPanel]);

  /**
   * Main render effect
   */
  useEffect(() => {
    const result = setupCanvas();
    if (!result) return;

    const { ctx, width, height } = result;

    // Load all images first
    const imageUrls = panels.flatMap(panel =>
      panel.layers
        .filter(layer => layer.type === 'image' && layer.content.type === 'image')
        .map(layer => (layer.content as any).url)
    );

    Promise.all(imageUrls.map(url => loadImage(url).catch(() => null)))
      .then(() => {
        renderGrid(ctx, width, height);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panels, selectedPanelIds, viewport]);

  /**
   * Handle canvas click to detect panel selection
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Determine which panel was clicked
    const cellWidth = rect.width / GRID_SIZE;
    const cellHeight = rect.height / GRID_SIZE;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    // Find the panel at this position
    const panel = panels.find(
      p => p.position.row === row && p.position.col === col
    );

    if (panel) {
      onPanelClick(panel.id, event);
    }
  }, [panels, onPanelClick]);

  /**
   * Handle canvas double-click to trigger focus mode
   * Requirements: 2.5
   */
  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPanelDoubleClick) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Determine which panel was double-clicked
    const cellWidth = rect.width / GRID_SIZE;
    const cellHeight = rect.height / GRID_SIZE;

    const col = Math.floor(x / cellWidth);
    const row = Math.floor(y / cellHeight);

    // Find the panel at this position
    const panel = panels.find(
      p => p.position.row === row && p.position.col === col
    );

    if (panel) {
      onPanelDoubleClick(panel.id, event);
    }
  }, [panels, onPanelDoubleClick]);

  /**
   * Handle window resize
   */
  useEffect(() => {
    const handleResize = () => {
      const result = setupCanvas();
      if (!result) return;
      const { ctx, width, height } = result;
      renderGrid(ctx, width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        style={{
          display: 'block',
          cursor: 'pointer',
        }}
      />
    </div>
  );
};
