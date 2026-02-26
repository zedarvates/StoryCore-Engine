/**
 * Anime Effect Renderer Service
 * 
 * Renders anime-style visual effects including speed lines, impact frames,
 * motion trails, and emotion effects using Canvas 2D API.
 */

import {
  AnimeEffect,
  SpeedLinesEffect,
  ImpactFrameEffect,
  MotionTrailEffect,
  EmotionEffect,
  MangaPanelEffect,
  AuraEffect
} from '@/types/animeEffect';

import { Point2D } from '@/types/sprite';

// ============================================================================
// Types
// ============================================================================

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  time: number;
  deltaTime: number;
}

export interface EffectRenderResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Anime Effect Renderer Class
// ============================================================================

export class AnimeEffectRenderer {
  private trailHistory: Map<string, ImageData[]> = new Map();
  private particleSystems: Map<string, Particle[]> = new Map();
  
  // ==========================================================================
  // Main Render Method
  // ==========================================================================

  /**
   * Render an effect to the canvas
   */
  render(
    context: RenderContext,
    effect: AnimeEffect,
    position: Point2D
  ): EffectRenderResult {
    if (!effect.enabled) {
      return { success: true };
    }

    try {
      switch (effect.type) {
        case 'speed_lines':
          return this.renderSpeedLines(context, effect, position);
        case 'impact_frame':
          return this.renderImpactFrame(context, effect, position);
        case 'motion_trail':
          return this.renderMotionTrail(context, effect, position);
        case 'emotion':
          return this.renderEmotion(context, effect, position);
        case 'manga_panel':
          return this.renderMangaPanel(context, effect, position);
        case 'aura':
          return this.renderAura(context, effect, position);
        default:
          return { success: false, error: `Unknown effect type: ${(effect as any).type}` };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown render error'
      };
    }
  }

  // ==========================================================================
  // Speed Lines Renderer
  // ==========================================================================

  private renderSpeedLines(
    context: RenderContext,
    effect: SpeedLinesEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, width, height, time } = context;
    const {
      lineCount,
      lineLength,
      lineThickness,
      thicknessVariation,
      lineColor,
      lineOpacity,
      useGradient,
      gradientEndColor,
      direction,
      angle,
      focalPoint,
      spiralTightness,
      style,
      lineCap,
      taperLines,
      glowEffect,
      glowColor,
      glowBlur,
      animated,
      animationSpeed,
      intensity
    } = effect;

    ctx.save();
    
    // Apply intensity
    ctx.globalAlpha = lineOpacity * intensity;

    // Setup glow if enabled
    if (glowEffect && glowColor) {
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = glowBlur || 5;
    }

    // Calculate animation offset
    const animOffset = animated ? (time * animationSpeed * 0.001) % 1 : 0;

    // Generate lines based on direction type
    for (let i = 0; i < lineCount; i++) {
      const lineProgress = (i / lineCount + animOffset) % 1;
      
      let startX: number, startY: number, endX: number, endY: number;
      
      switch (direction) {
        case 'linear':
          // Linear lines in a direction
          const linearAngle = (angle * Math.PI) / 180;
          const spreadY = (height * 0.8) * (i / lineCount - 0.5);
          startX = -lineLength * 0.5;
          startY = position.y + spreadY;
          endX = startX + lineLength;
          endY = startY;
          
          // Rotate around center
          const cos = Math.cos(linearAngle);
          const sin = Math.sin(linearAngle);
          const cx = position.x;
          const cy = position.y;
          const rx1 = cos * (startX - cx) - sin * (startY - cy) + cx;
          const ry1 = sin * (startX - cx) + cos * (startY - cy) + cy;
          const rx2 = cos * (endX - cx) - sin * (endY - cy) + cx;
          const ry2 = sin * (endX - cx) + cos * (endY - cy) + cy;
          startX = rx1; startY = ry1;
          endX = rx2; endY = ry2;
          break;

        case 'radial':
          // Radial lines from focal point
          const radialAngle = (2 * Math.PI * i) / lineCount;
          const fx = position.x + (focalPoint.x - 0.5) * width;
          const fy = position.y + (focalPoint.y - 0.5) * height;
          startX = fx;
          startY = fy;
          endX = fx + Math.cos(radialAngle) * lineLength * lineProgress;
          endY = fy + Math.sin(radialAngle) * lineLength * lineProgress;
          break;

        case 'spiral':
          // Spiral lines
          const spiralAngle = (2 * Math.PI * i) / lineCount + animOffset * 2 * Math.PI;
          const spiralRadius = lineLength * lineProgress * spiralTightness;
          startX = position.x;
          startY = position.y;
          endX = startX + Math.cos(spiralAngle) * spiralRadius;
          endY = startY + Math.sin(spiralAngle) * spiralRadius;
          break;

        default:
          startX = position.x;
          startY = position.y - lineLength / 2;
          endX = position.x;
          endY = position.y + lineLength / 2;
      }

      // Calculate thickness with variation
      const thickness = lineThickness * (1 + (Math.random() - 0.5) * thicknessVariation * 2);

      // Draw the line
      ctx.beginPath();
      ctx.lineCap = lineCap;
      ctx.lineWidth = taperLines ? thickness * (1 - lineProgress * 0.5) : thickness;

      // Apply gradient if enabled
      if (useGradient && gradientEndColor) {
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY);
        gradient.addColorStop(0, lineColor);
        gradient.addColorStop(1, gradientEndColor);
        ctx.strokeStyle = gradient;
      } else {
        ctx.strokeStyle = lineColor;
      }

      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Impact Frame Renderer
  // ==========================================================================

  private renderImpactFrame(
    context: RenderContext,
    effect: ImpactFrameEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, width, height, time } = context;
    const {
      impactType,
      impactSize,
      impactShape,
      flashColor,
      flashDuration,
      flashIntensity,
      glowRadius,
      screenShake,
      particles,
      radiatingLines,
      radiatingLineCount,
      radiatingLineColor,
      intensity
    } = effect;

    const progress = Math.min(1, time / (effect.duration || 200));
    const flashProgress = Math.min(1, time / flashDuration);

    ctx.save();

    // Apply screen shake
    if (screenShake.enabled && progress < 0.5) {
      const shakeAmount = screenShake.intensity * 20 * (1 - progress * 2);
      ctx.translate(
        (Math.random() - 0.5) * shakeAmount,
        (Math.random() - 0.5) * shakeAmount
      );
    }

    // Draw flash
    if (flashProgress < 1) {
      const flashAlpha = flashIntensity * (1 - flashProgress) * intensity;
      ctx.fillStyle = flashColor;
      ctx.globalAlpha = flashAlpha;
      ctx.fillRect(0, 0, width, height);
    }

    // Draw impact shape
    ctx.globalAlpha = intensity * (1 - progress * 0.5);
    const centerX = position.x;
    const centerY = position.y;
    const size = impactSize * 50 * (1 + progress * 0.5);

    // Draw radiating lines
    if (radiatingLines) {
      ctx.strokeStyle = radiatingLineColor;
      ctx.lineWidth = 2;
      
      for (let i = 0; i < radiatingLineCount; i++) {
        const angle = (2 * Math.PI * i) / radiatingLineCount;
        const lineLength = size * (1.5 + progress);
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + Math.cos(angle) * lineLength,
          centerY + Math.sin(angle) * lineLength
        );
        ctx.stroke();
      }
    }

    // Draw impact shape
    switch (impactShape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = intensity * (1 - progress);
        ctx.fill();
        break;

      case 'star':
        this.drawStar(ctx, centerX, centerY, 5, size, size * 0.5, flashColor, intensity * (1 - progress));
        break;

      case 'burst':
        this.drawBurst(ctx, centerX, centerY, size, 12, flashColor, intensity * (1 - progress));
        break;

      case 'diamond':
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX + size, centerY);
        ctx.lineTo(centerX, centerY + size);
        ctx.lineTo(centerX - size, centerY);
        ctx.closePath();
        ctx.fillStyle = flashColor;
        ctx.globalAlpha = intensity * (1 - progress);
        ctx.fill();
        break;
    }

    // Draw particles
    if (particles.enabled && progress < 0.8) {
      this.drawParticles(ctx, effect, centerX, centerY, time, progress);
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Motion Trail Renderer
  // ==========================================================================

  private renderMotionTrail(
    context: RenderContext,
    effect: MotionTrailEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, time } = context;
    const {
      trailLength,
      trailOpacity,
      trailColor,
      trailBlur,
      fadeMode,
      persistence,
      style,
      outlineThickness,
      outlineColor,
      colorShift,
      intensity
    } = effect;

    // This is a simplified implementation
    // A full implementation would capture sprite frames
    
    ctx.save();
    ctx.globalAlpha = trailOpacity * intensity;

    // Draw trail segments
    for (let i = 0; i < trailLength; i++) {
      const segmentProgress = i / trailLength;
      let alpha: number;
      
      switch (fadeMode) {
        case 'linear':
          alpha = 1 - segmentProgress;
          break;
        case 'ease':
          alpha = 1 - Math.pow(segmentProgress, 2);
          break;
        case 'exponential':
          alpha = Math.pow(1 - segmentProgress, 2);
          break;
        case 'step':
          alpha = Math.floor(segmentProgress * 4) / 4;
          break;
        default:
          alpha = 1 - segmentProgress;
      }

      ctx.globalAlpha = alpha * trailOpacity * intensity * persistence;
      
      // Placeholder: draw ghost positions
      const offset = (i - trailLength / 2) * 5;
      ctx.fillStyle = trailColor;
      ctx.fillRect(
        position.x + offset,
        position.y - 20,
        40,
        40
      );
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Emotion Effect Renderer
  // ==========================================================================

  private renderEmotion(
    context: RenderContext,
    effect: EmotionEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, time, deltaTime } = context;
    const {
      symbolType,
      symbolSize,
      symbolColor,
      symbolCount,
      positionVariation,
      animationType,
      animationDuration,
      intensity
    } = effect;

    const progress = (time % animationDuration) / animationDuration;

    ctx.save();
    ctx.globalAlpha = intensity;

    for (let i = 0; i < symbolCount; i++) {
      const symbolProgress = (progress + i / symbolCount) % 1;
      
      // Calculate position based on animation type
      let x = position.x + (Math.random() - 0.5) * positionVariation;
      let y = position.y;
      let scale = 1;
      let alpha = 1;

      switch (animationType) {
        case 'pop':
          scale = Math.sin(symbolProgress * Math.PI);
          alpha = 1 - symbolProgress;
          break;
        case 'float':
          y = position.y - symbolProgress * 50;
          alpha = 1 - symbolProgress;
          break;
        case 'bounce':
          y = position.y - Math.abs(Math.sin(symbolProgress * Math.PI * 2)) * 30;
          break;
        case 'shake':
          x += (Math.random() - 0.5) * 10;
          y += (Math.random() - 0.5) * 10;
          break;
        case 'pulse':
          scale = 1 + Math.sin(symbolProgress * Math.PI * 4) * 0.2;
          break;
        case 'spiral':
          const angle = symbolProgress * Math.PI * 4;
          x = position.x + Math.cos(angle) * 30 * symbolProgress;
          y = position.y + Math.sin(angle) * 30 * symbolProgress - symbolProgress * 50;
          alpha = 1 - symbolProgress;
          break;
      }

      ctx.globalAlpha = alpha * intensity;
      
      // Draw the symbol
      this.drawEmotionSymbol(ctx, symbolType, x, y, symbolSize * scale, symbolColor);
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Manga Panel Renderer
  // ==========================================================================

  private renderMangaPanel(
    context: RenderContext,
    effect: MangaPanelEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, width, height, time } = context;
    const {
      panelShape,
      size,
      borderWidth,
      borderColor,
      borderOpacity,
      backgroundFill,
      backgroundColor,
      backgroundOpacity,
      screenTone,
      screenToneIntensity,
      screenToneColor,
      focusEffect,
      focusPoint,
      focusSize,
      focusFeather,
      vignetteIntensity,
      sfxText,
      sfxStyle,
      intensity
    } = effect;

    ctx.save();
    ctx.globalAlpha = intensity;

    // Draw panel background
    const panelX = position.x - size.width / 2;
    const panelY = position.y - size.height / 2;

    // Background
    if (backgroundFill !== 'transparent') {
      ctx.globalAlpha = backgroundOpacity * intensity;
      ctx.fillStyle = backgroundColor;
      
      // Draw shape based on panel shape
      switch (panelShape) {
        case 'rectangle':
          ctx.fillRect(panelX, panelY, size.width, size.height);
          break;
        case 'rounded':
          this.roundRect(ctx, panelX, panelY, size.width, size.height, 10);
          break;
        case 'jagged':
          this.drawJaggedRect(ctx, panelX, panelY, size.width, size.height);
          break;
        case 'burst':
          this.drawBurst(ctx, position.x, position.y, size.width / 2, 8, backgroundColor, backgroundOpacity);
          break;
      }
    }

    // Draw screen tone
    if (screenTone !== 'gradient') {
      ctx.globalAlpha = screenToneIntensity * intensity;
      this.drawScreenTone(ctx, panelX, panelY, size.width, size.height, screenTone, screenToneColor);
    }

    // Draw border
    ctx.globalAlpha = borderOpacity * intensity;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;

    switch (panelShape) {
      case 'rectangle':
        ctx.strokeRect(panelX, panelY, size.width, size.height);
        break;
      case 'rounded':
        this.roundRect(ctx, panelX, panelY, size.width, size.height, 10, false, true);
        break;
    }

    // Draw SFX text
    if (sfxText && sfxStyle) {
      ctx.globalAlpha = intensity;
      ctx.font = `${sfxStyle.fontWeight} ${sfxStyle.fontSize}px ${sfxStyle.fontFamily}`;
      ctx.fillStyle = sfxStyle.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      if (sfxStyle.outlineColor && sfxStyle.outlineWidth) {
        ctx.strokeStyle = sfxStyle.outlineColor;
        ctx.lineWidth = sfxStyle.outlineWidth;
        ctx.strokeText(sfxText, position.x, position.y);
      }
      
      ctx.fillText(sfxText, position.x, position.y);
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Aura Effect Renderer
  // ==========================================================================

  private renderAura(
    context: RenderContext,
    effect: AuraEffect,
    position: Point2D
  ): EffectRenderResult {
    const { ctx, time } = context;
    const {
      auraType,
      color,
      secondaryColor,
      size,
      innerRadius,
      outerRadius,
      opacity,
      layers,
      layerOffset,
      animationSpeed,
      wobble,
      wobbleIntensity,
      pulse,
      pulseSpeed,
      pulseIntensity,
      intensity
    } = effect;

    const progress = (time * animationSpeed * 0.001) % 1;

    ctx.save();

    for (let layer = 0; layer < layers; layer++) {
      const layerProgress = (progress + layer * layerOffset) % 1;
      const layerAlpha = opacity * intensity * (1 - layer * 0.2);
      
      ctx.globalAlpha = layerAlpha;

      // Calculate radius with pulse
      let radius = innerRadius + (outerRadius - innerRadius) * layerProgress;
      if (pulse) {
        radius *= 1 + Math.sin(progress * Math.PI * 2 * pulseSpeed) * pulseIntensity;
      }

      // Add wobble
      let offsetX = 0, offsetY = 0;
      if (wobble) {
        offsetX = Math.sin(time * 0.003 + layer) * wobbleIntensity * 10;
        offsetY = Math.cos(time * 0.004 + layer) * wobbleIntensity * 10;
      }

      // Create gradient
      const gradient = ctx.createRadialGradient(
        position.x + offsetX,
        position.y + offsetY,
        0,
        position.x + offsetX,
        position.y + offsetY,
        radius * size * 50
      );

      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, secondaryColor || color);
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        position.x + offsetX,
        position.y + offsetY,
        radius * size * 50,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.restore();
    return { success: true };
  }

  // ==========================================================================
  // Helper Drawing Methods
  // ==========================================================================

  private drawStar(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    points: number,
    outerRadius: number,
    innerRadius: number,
    color: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawBurst(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number,
    size: number,
    points: number,
    color: string,
    alpha: number
  ): void {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? size : size * 0.3;
      const angle = (Math.PI * 2 * i) / (points * 2);
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawJaggedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number
  ): void {
    const jaggedness = 5;
    ctx.beginPath();
    
    // Top edge
    for (let i = 0; i <= width; i += 10) {
      const jy = y + (Math.random() - 0.5) * jaggedness;
      if (i === 0) ctx.moveTo(x + i, jy);
      else ctx.lineTo(x + i, jy);
    }
    
    // Right edge
    for (let i = 0; i <= height; i += 10) {
      const jx = x + width + (Math.random() - 0.5) * jaggedness;
      ctx.lineTo(jx, y + i);
    }
    
    // Bottom edge
    for (let i = width; i >= 0; i -= 10) {
      const jy = y + height + (Math.random() - 0.5) * jaggedness;
      ctx.lineTo(x + i, jy);
    }
    
    // Left edge
    for (let i = height; i >= 0; i -= 10) {
      const jx = x + (Math.random() - 0.5) * jaggedness;
      ctx.lineTo(jx, y + i);
    }
    
    ctx.closePath();
    ctx.fill();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    radius: number,
    fill: boolean = true,
    stroke: boolean = false
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  private drawScreenTone(
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    width: number, height: number,
    pattern: string,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;

    switch (pattern) {
      case 'dots':
        const dotSpacing = 4;
        for (let dx = 0; dx < width; dx += dotSpacing) {
          for (let dy = 0; dy < height; dy += dotSpacing) {
            ctx.beginPath();
            ctx.arc(x + dx, y + dy, 1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
      case 'lines':
        for (let dy = 0; dy < height; dy += 3) {
          ctx.fillRect(x, y + dy, width, 1);
        }
        break;
      case 'crosshatch':
        for (let d = 0; d < Math.max(width, height); d += 4) {
          ctx.fillRect(x + d, y, 1, height);
          ctx.fillRect(x, y + d, width, 1);
        }
        break;
    }

    ctx.restore();
  }

  private drawEmotionSymbol(
    ctx: CanvasRenderingContext2D,
    type: string,
    x: number, y: number,
    size: number,
    color: string
  ): void {
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    switch (type) {
      case 'exclamation':
        ctx.fillRect(x - size * 0.15, y - size * 0.5, size * 0.3, size * 0.7);
        ctx.beginPath();
        ctx.arc(x, y + size * 0.35, size * 0.1, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'question':
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', x, y);
        break;

      case 'heart':
        ctx.font = `${size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤', x, y);
        break;

      case 'sparkle':
        this.drawStar(ctx, x, y, 4, size * 0.5, size * 0.25, color, 1);
        break;

      case 'sweat_drop':
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.3);
        ctx.quadraticCurveTo(x + size * 0.4, y, x, y + size * 0.4);
        ctx.quadraticCurveTo(x - size * 0.4, y, x, y - size * 0.3);
        ctx.fill();
        break;

      case 'anger_vein':
        ctx.beginPath();
        ctx.moveTo(x - size * 0.3, y);
        ctx.lineTo(x, y - size * 0.3);
        ctx.lineTo(x + size * 0.3, y);
        ctx.lineTo(x, y + size * 0.3);
        ctx.closePath();
        ctx.stroke();
        break;

      default:
        ctx.beginPath();
        ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
  }

  private drawParticles(
    ctx: CanvasRenderingContext2D,
    effect: ImpactFrameEffect,
    cx: number, cy: number,
    time: number,
    progress: number
  ): void {
    const { particles } = effect;
    const count = particles.count;

    ctx.save();
    ctx.fillStyle = particles.color;

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count + (particles.spreadAngle === 360 ? 0 : -Math.PI / 4);
      const speed = particles.speedRange[0] + Math.random() * (particles.speedRange[1] - particles.speedRange[0]);
      const size = particles.sizeRange[0] + Math.random() * (particles.sizeRange[1] - particles.sizeRange[0]);
      
      const distance = speed * progress;
      const x = cx + Math.cos(angle) * distance;
      const y = cy + Math.sin(angle) * distance + particles.gravity * progress * progress * 0.5;

      ctx.globalAlpha = 1 - progress;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// ============================================================================
// Particle Interface
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const animeEffectRenderer = new AnimeEffectRenderer();

export default AnimeEffectRenderer;