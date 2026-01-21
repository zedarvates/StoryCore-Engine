import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Panel, Layer, AnnotationContent, EffectContent } from '../../types/gridEditor';

interface PanelRendererProps {
  panel: Panel;
  width: number;
  height: number;
  isSelected?: boolean;
  isHovered?: boolean;
  onLoad?: () => void;
}

/**
 * PanelRenderer - Renders an individual panel with all its layers
 * 
 * Responsibilities:
 * - Render individual panel with all layers
 * - Handle empty panel state with placeholder
 * - Implement layer blending with opacity and blend modes
 * - Add hover state highlighting
 * - Preserve image aspect ratios
 */
export const PanelRenderer: React.FC<PanelRendererProps> = ({
  panel,
  width,
  height,
  isSelected = false,
  isHovered = false,
  onLoad,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Style constants
  const BORDER_COLOR = '#cccccc';
  const SELECTED_BORDER_COLOR = '#2196f3';
  const HOVER_BORDER_COLOR = '#64b5f6';
  const SELECTED_BORDER_WIDTH = 3;
  const HOVER_BORDER_WIDTH = 2;
  const PLACEHOLDER_COLOR = '#999999';
  const PLACEHOLDER_BG_COLOR = '#f5f5f5';

  /**
   * Load an image and cache it
   */
  const loadImage = useCallback((url: string): Promise<HTMLImageElement> => {
    const cached = imageCache.current.get(url);
    if (cached) {
      return Promise.resolve(cached);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageCache.current.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }, []);

  /**
   * Render a single layer with proper blending and opacity
   */
  const renderLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    layer: Layer,
    bounds: { x: number; y: number; width: number; height: number }
  ) => {
    if (!layer.visible) return;

    ctx.save();

    // Apply layer opacity
    ctx.globalAlpha = layer.opacity;

    // Apply blend mode
    const blendModeMap: Record<string, GlobalCompositeOperation> = {
      normal: 'source-over',
      multiply: 'multiply',
      screen: 'screen',
      overlay: 'overlay',
      darken: 'darken',
      lighten: 'lighten',
    };
    ctx.globalCompositeOperation = blendModeMap[layer.blendMode] || 'source-over';

    // Render based on layer type
    if (layer.type === 'image' && layer.content.type === 'image') {
      const img = imageCache.current.get(layer.content.url);
      if (img) {
        renderImageLayer(ctx, img, bounds, panel.transform, panel.crop);
      }
    } else if (layer.type === 'annotation' && layer.content.type === 'annotation') {
      renderAnnotationLayer(ctx, layer.content, bounds);
    } else if (layer.type === 'effect' && layer.content.type === 'effect') {
      renderEffectLayer(ctx, layer.content, bounds);
    }

    ctx.restore();
  }, [panel.transform, panel.crop]);

  /**
   * Render an image layer with aspect ratio preservation
   */
  const renderImageLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    bounds: { x: number; y: number; width: number; height: number },
    transform: any,
    crop: any
  ) => {
    // Calculate source rectangle (crop region)
    let srcX = 0;
    let srcY = 0;
    let srcWidth = img.naturalWidth;
    let srcHeight = img.naturalHeight;

    if (crop) {
      srcX = crop.x * img.naturalWidth;
      srcY = crop.y * img.naturalHeight;
      srcWidth = crop.width * img.naturalWidth;
      srcHeight = crop.height * img.naturalHeight;
    }

    // Calculate destination rectangle preserving aspect ratio
    const srcAspect = srcWidth / srcHeight;
    const boundsAspect = bounds.width / bounds.height;

    let drawWidth = bounds.width;
    let drawHeight = bounds.height;
    let drawX = bounds.x;
    let drawY = bounds.y;

    // Fit image within bounds while preserving aspect ratio
    if (srcAspect > boundsAspect) {
      // Image is wider - fit to width
      drawHeight = bounds.width / srcAspect;
      drawY = bounds.y + (bounds.height - drawHeight) / 2;
    } else {
      // Image is taller - fit to height
      drawWidth = bounds.height * srcAspect;
      drawX = bounds.x + (bounds.width - drawWidth) / 2;
    }

    // Apply transform if present
    if (transform) {
      const centerX = bounds.x + bounds.width / 2;
      const centerY = bounds.y + bounds.height / 2;

      ctx.translate(centerX, centerY);
      ctx.rotate((transform.rotation * Math.PI) / 180);
      ctx.scale(transform.scale.x, transform.scale.y);
      ctx.translate(-centerX, -centerY);
      ctx.translate(transform.position.x, transform.position.y);
    }

    // Draw the image
    ctx.drawImage(
      img,
      srcX, srcY, srcWidth, srcHeight,
      drawX, drawY, drawWidth, drawHeight
    );
  }, []);

  /**
   * Render annotation layer (drawings and text)
   */
  const renderAnnotationLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    content: AnnotationContent,
    bounds: { x: number; y: number; width: number; height: number }
  ) => {
    // Render drawings
    if (content.drawings) {
      content.drawings.forEach((drawing: any) => {
        ctx.save();
        ctx.strokeStyle = drawing.style.strokeColor || '#000000';
        ctx.lineWidth = drawing.style.strokeWidth || 2;
        ctx.globalAlpha = drawing.style.opacity || 1;

        if (drawing.style.fillColor) {
          ctx.fillStyle = drawing.style.fillColor;
        }

        if (drawing.type === 'path' && drawing.points.length > 0) {
          ctx.beginPath();
          ctx.moveTo(
            bounds.x + drawing.points[0].x * bounds.width,
            bounds.y + drawing.points[0].y * bounds.height
          );
          for (let i = 1; i < drawing.points.length; i++) {
            ctx.lineTo(
              bounds.x + drawing.points[i].x * bounds.width,
              bounds.y + drawing.points[i].y * bounds.height
            );
          }
          ctx.stroke();
        } else if (drawing.type === 'rectangle') {
          const rect = {
            x: bounds.x + drawing.points[0].x * bounds.width,
            y: bounds.y + drawing.points[0].y * bounds.height,
            width: (drawing.points[1].x - drawing.points[0].x) * bounds.width,
            height: (drawing.points[1].y - drawing.points[0].y) * bounds.height,
          };
          if (drawing.style.fillColor) {
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
          }
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        } else if (drawing.type === 'ellipse') {
          const centerX = bounds.x + drawing.points[0].x * bounds.width;
          const centerY = bounds.y + drawing.points[0].y * bounds.height;
          const radiusX = Math.abs(drawing.points[1].x - drawing.points[0].x) * bounds.width / 2;
          const radiusY = Math.abs(drawing.points[1].y - drawing.points[0].y) * bounds.height / 2;
          
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          if (drawing.style.fillColor) {
            ctx.fill();
          }
          ctx.stroke();
        }

        ctx.restore();
      });
    }

    // Render text annotations
    if (content.textAnnotations) {
      content.textAnnotations.forEach((text: any) => {
        ctx.save();
        ctx.font = `${text.style.fontSize || 16}px ${text.style.fontFamily || 'sans-serif'}`;
        ctx.fillStyle = text.style.color || '#000000';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        const x = bounds.x + text.position.x * bounds.width;
        const y = bounds.y + text.position.y * bounds.height;

        // Draw background if specified
        if (text.style.backgroundColor) {
          const metrics = ctx.measureText(text.text);
          const padding = 4;
          ctx.fillStyle = text.style.backgroundColor;
          ctx.fillRect(
            x - padding,
            y - padding,
            metrics.width + padding * 2,
            (text.style.fontSize || 16) + padding * 2
          );
          ctx.fillStyle = text.style.color || '#000000';
        }

        ctx.fillText(text.text, x, y);
        ctx.restore();
      });
    }
  }, []);

  /**
   * Render effect layer (placeholder for future effects)
   */
  const renderEffectLayer = useCallback((
    ctx: CanvasRenderingContext2D,
    content: EffectContent,
    bounds: { x: number; y: number; width: number; height: number }
  ) => {
    // Placeholder for effect rendering
    // Effects could include filters, adjustments, etc.
    // For now, this is a no-op
    ;
  }, []);

  /**
   * Render empty panel placeholder
   */
  const renderPlaceholder = useCallback((
    ctx: CanvasRenderingContext2D,
    bounds: { x: number; y: number; width: number; height: number }
  ) => {
    // Draw background
    ctx.fillStyle = PLACEHOLDER_BG_COLOR;
    ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);

    // Draw placeholder text
    ctx.save();
    ctx.fillStyle = PLACEHOLDER_COLOR;
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const panelNumber = panel.position.row * 3 + panel.position.col + 1;
    ctx.fillText(
      `Panel ${panelNumber}`,
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2 - 10
    );
    
    ctx.font = '12px sans-serif';
    ctx.fillText(
      'Empty',
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2 + 10
    );
    ctx.restore();
  }, [panel.position]);

  /**
   * Main render function
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with DPI handling
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const bounds = { x: 0, y: 0, width, height };

    // Check if panel has visible layers
    const visibleLayers = panel.layers.filter(layer => layer.visible && !layer.locked);

    if (visibleLayers.length === 0) {
      // Render placeholder for empty panel
      renderPlaceholder(ctx, bounds);
    } else {
      // Render all visible layers in order (bottom to top)
      visibleLayers.forEach(layer => {
        renderLayer(ctx, layer, bounds);
      });
    }

    // Draw border
    let borderColor = BORDER_COLOR;
    let borderWidth = 1;

    if (isSelected) {
      borderColor = SELECTED_BORDER_COLOR;
      borderWidth = SELECTED_BORDER_WIDTH;
    } else if (isHovered) {
      borderColor = HOVER_BORDER_COLOR;
      borderWidth = HOVER_BORDER_WIDTH;
    }

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(0, 0, width, height);

    // Draw hover highlight
    if (isHovered && !isSelected) {
      ctx.save();
      ctx.fillStyle = 'rgba(100, 181, 246, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }, [width, height, panel, isSelected, isHovered, renderLayer, renderPlaceholder]);

  /**
   * Load all images and render
   */
  useEffect(() => {
    const imageUrls = panel.layers
      .filter(layer => layer.type === 'image' && layer.content.type === 'image')
      .map(layer => (layer.content as any).url);

    if (imageUrls.length === 0) {
      setImagesLoaded(true);
      render();
      onLoad?.();
      return;
    }

    Promise.all(imageUrls.map(url => loadImage(url).catch(() => null)))
      .then(() => {
        setImagesLoaded(true);
        render();
        onLoad?.();
      });
  }, [panel, loadImage, render, onLoad]);

  /**
   * Re-render when state changes
   */
  useEffect(() => {
    if (imagesLoaded) {
      render();
    }
  }, [imagesLoaded, isSelected, isHovered, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  );
};
