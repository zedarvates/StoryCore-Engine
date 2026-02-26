/**
 * Sprite Canvas Component
 * 
 * Canvas component for rendering animated sprites with effects
 * in the video editor preview area.
 */

import React, { useEffect, useRef, useState } from 'react';

import { AnimatedSprite, SpriteTransform } from '@/types/sprite';
import { AnimeEffect } from '@/types/animeEffect';
import { animeEffectRenderer, RenderContext } from '@/services/sprite/AnimeEffectRenderer';

// ============================================================================
// Types
// ============================================================================

interface SpriteCanvasProps {
  /** Width of the canvas */
  width: number;
  /** Height of the canvas */
  height: number;
  /** Sprites to render */
  sprites: Array<{
    sprite: AnimatedSprite;
    transform: SpriteTransform;
    effects: AnimeEffect[];
  }>;
  /** Background color */
  backgroundColor?: string;
  /** Whether to show grid */
  showGrid?: boolean;
  /** Grid size */
  gridSize?: number;
  /** Class name */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const SpriteCanvas: React.FC<SpriteCanvasProps> = ({
  width,
  height,
  sprites,
  backgroundColor = 'transparent',
  showGrid = false,
  gridSize = 32,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // ==========================================================================
  // Render Loop
  // ==========================================================================

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = (timestamp: number) => {
      // Calculate delta time
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      timeRef.current += deltaTime;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Draw background
      if (backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, width, height);
      }

      // Draw grid
      if (showGrid) {
        drawGrid(ctx, width, height, gridSize);
      }

      // Sort sprites by z-index
      const sortedSprites = [...sprites].sort((a, b) => {
        const aZ = a.transform.position.z || 0;
        const bZ = b.transform.position.z || 0;
        return aZ - bZ;
      });

      // Render each sprite
      for (const { sprite, transform, effects } of sortedSprites) {
        // Save context
        ctx.save();

        // Apply transform
        ctx.globalAlpha = transform.opacity;
        ctx.translate(transform.position.x, transform.position.y);
        ctx.rotate(transform.rotation * Math.PI / 180);
        ctx.scale(
          transform.flipH ? -transform.scale.x : transform.scale.x,
          transform.flipV ? -transform.scale.y : transform.scale.y
        );

        // Draw sprite placeholder (actual sprite would be rendered here)
        if (sprite.source.url) {
          // Would load and draw the image
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
        } else {
          // Placeholder
          ctx.fillStyle = '#4a5568';
          ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
          ctx.strokeStyle = '#718096';
          ctx.strokeRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
        }

        ctx.restore();

        // Render effects
        for (const effect of effects) {
          if (!effect.enabled) continue;

          const effectContext: RenderContext = {
            ctx,
            width,
            height,
            time: timeRef.current,
            deltaTime
          };

          animeEffectRenderer.render(effectContext, effect, {
            x: transform.position.x,
            y: transform.position.y
          });
        }
      }

      // Continue animation loop
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start render loop
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, sprites, backgroundColor, showGrid, gridSize]);

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;
  }, [width, height]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width,
        height,
        imageRendering: 'pixelated'
      }}
    />
  );
};

// ============================================================================
// Helper Functions
// ============================================================================

function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let x = 0; x <= width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  // Horizontal lines
  for (let y = 0; y <= height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  ctx.restore();
}

// ============================================================================
// Sprite Preview Component
// ============================================================================

interface SpritePreviewProps {
  sprite: AnimatedSprite | null;
  width?: number;
  height?: number;
  className?: string;
}

export const SpritePreview: React.FC<SpritePreviewProps> = ({
  sprite,
  width = 200,
  height = 200,
  className
}) => {
  const [transform] = useState<SpriteTransform>({
    position: { x: width / 2, y: height / 2 },
    scale: { x: 1, y: 1 },
    rotation: 0,
    flipH: false,
    flipV: false,
    opacity: 1
  });

  if (!sprite) {
    return (
      <div 
        className={`bg-slate-800 flex items-center justify-center ${className || ''}`}
        style={{ width, height }}
      >
        <span className="text-slate-500 text-sm">Aucun sprite</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <SpriteCanvas
        width={width}
        height={height}
        sprites={[{ sprite, transform, effects: [] }]}
        backgroundColor="#1e293b"
        showGrid
      />
    </div>
  );
};

export default SpriteCanvas;