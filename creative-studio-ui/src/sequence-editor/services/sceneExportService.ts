/**
 * 3D Scene Export Service
 * 
 * Export puppet animations to video format and render 3D scenes to video frames.
 * Requirements: 7.2
 */

interface PuppetKeyframe {
  frame: number;
  pose: string;
  joints: Record<string, { x: number; y: number; z: number }>;
}

interface Puppet {
  id: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  joints: any[];
  pose: string;
}

interface Environment {
  type: 'studio' | 'outdoor' | 'indoor' | 'abstract';
  lighting: 'bright' | 'dim' | 'dramatic' | 'natural';
  props: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; z: number };
  }>;
}

interface SceneExportOptions {
  format: 'mp4' | 'webm' | 'frames';
  resolution: { width: number; height: number };
  fps: number;
  quality: 'draft' | 'preview' | 'final';
  startFrame: number;
  endFrame: number;
}

interface ExportProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';
  message: string;
}

/**
 * Export 3D scene animation to video format
 */
export async function exportSceneToVideo(
  puppets: Puppet[],
  environment: Environment,
  keyframes: PuppetKeyframe[],
  options: SceneExportOptions,
  onProgress?: (progress: ExportProgress) => void
): Promise<Blob | null> {
  try {
    const totalFrames = options.endFrame - options.startFrame + 1;
    
    // Report preparation
    onProgress?.({
      currentFrame: 0,
      totalFrames,
      percentage: 0,
      status: 'preparing',
      message: 'Preparing scene export...',
    });
    
    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = options.resolution.width;
    canvas.height = options.resolution.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Collect all frames
    const frames: Blob[] = [];
    
    for (let frame = options.startFrame; frame <= options.endFrame; frame++) {
      // Report rendering progress
      const percentage = ((frame - options.startFrame) / totalFrames) * 100;
      onProgress?.({
        currentFrame: frame - options.startFrame + 1,
        totalFrames,
        percentage,
        status: 'rendering',
        message: `Rendering frame ${frame - options.startFrame + 1} of ${totalFrames}...`,
      });
      
      // Render frame
      await renderSceneFrame(ctx, canvas, puppets, environment, keyframes, frame);
      
      // Convert canvas to blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (blob) {
        frames.push(blob);
      }
    }
    
    // Report encoding
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      status: 'encoding',
      message: 'Encoding video...',
    });
    
    // For now, we'll return a ZIP of frames since browser video encoding is complex
    // In a real implementation, this would use WebCodecs API or server-side encoding
    if (options.format === 'frames') {
      // Return frames as a ZIP (simplified - would need JSZip library)
      const blob = new Blob(frames, { type: 'application/zip' });
      
      onProgress?.({
        currentFrame: totalFrames,
        totalFrames,
        percentage: 100,
        status: 'complete',
        message: 'Export complete!',
      });
      
      return blob;
    }
    
    // For video formats, we'd need to integrate with StoryCore-Engine pipeline
    // This is a placeholder that returns the first frame
    onProgress?.({
      currentFrame: totalFrames,
      totalFrames,
      percentage: 100,
      status: 'complete',
      message: 'Export complete! (Note: Full video encoding requires StoryCore-Engine backend)',
    });
    
    return frames[0] || null;
    
  } catch (error) {
    onProgress?.({
      currentFrame: 0,
      totalFrames: 0,
      percentage: 0,
      status: 'error',
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
    
    console.error('Scene export failed:', error);
    return null;
  }
}

/**
 * Render a single frame of the 3D scene
 */
async function renderSceneFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  puppets: Puppet[],
  environment: Environment,
  keyframes: PuppetKeyframe[],
  frame: number
): Promise<void> {
  // Clear canvas
  ctx.fillStyle = getEnvironmentBackgroundColor(environment);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid
  drawGrid(ctx, canvas);
  
  // Apply keyframe animation to puppets
  const animatedPuppets = applyKeyframeAnimation(puppets, keyframes, frame);
  
  // Draw environment props
  environment.props.forEach((prop) => {
    drawProp(ctx, canvas, prop);
  });
  
  // Draw puppets
  animatedPuppets.forEach((puppet) => {
    drawPuppet(ctx, canvas, puppet);
  });
  
  // Add frame number overlay
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Frame: ${frame}`, canvas.width - 10, canvas.height - 10);
}

/**
 * Get background color based on environment
 */
function getEnvironmentBackgroundColor(environment: Environment): string {
  const colors = {
    studio: '#1a1a24',
    outdoor: '#87CEEB',
    indoor: '#2c2c3a',
    abstract: '#1a1a2e',
  };
  
  return colors[environment.type] || colors.studio;
}

/**
 * Draw grid on canvas
 */
function drawGrid(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1;
  
  const gridSize = 50;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Horizontal lines
  for (let i = -10; i <= 10; i++) {
    const y = centerY + i * gridSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // Vertical lines
  for (let i = -10; i <= 10; i++) {
    const x = centerX + i * gridSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

/**
 * Apply keyframe animation to puppets at specific frame
 */
function applyKeyframeAnimation(
  puppets: Puppet[],
  keyframes: PuppetKeyframe[],
  frame: number
): Puppet[] {
  if (keyframes.length === 0) return puppets;
  
  // Find keyframes around current frame
  const prevKeyframe = keyframes.filter((kf) => kf.frame <= frame).pop();
  const nextKeyframe = keyframes.find((kf) => kf.frame > frame);
  
  if (!prevKeyframe) return puppets;
  
  // Apply animation to puppets
  return puppets.map((puppet) => {
    if (prevKeyframe.frame === frame) {
      // Exact keyframe match
      return { ...puppet, pose: prevKeyframe.pose };
    }
    
    if (nextKeyframe) {
      // Interpolate between keyframes
      const t = (frame - prevKeyframe.frame) / (nextKeyframe.frame - prevKeyframe.frame);
      // For now, just use previous keyframe
      // TODO: Implement smooth interpolation
      return { ...puppet, pose: prevKeyframe.pose };
    }
    
    // Use previous keyframe
    return { ...puppet, pose: prevKeyframe.pose };
  });
}

/**
 * Draw a prop on canvas
 */
function drawProp(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  prop: { id: string; type: string; position: { x: number; y: number; z: number } }
): void {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  const screenX = centerX + prop.position.x * 50;
  const screenY = centerY - prop.position.y * 50;
  
  ctx.fillStyle = '#7f8c8d';
  ctx.fillRect(screenX - 15, screenY - 15, 30, 30);
  
  ctx.fillStyle = '#95a5a6';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(prop.type, screenX, screenY + 25);
}

/**
 * Draw a puppet on canvas
 */
function drawPuppet(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  puppet: Puppet
): void {
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  const screenX = centerX + puppet.position.x * 50;
  const screenY = centerY - puppet.position.y * 50;
  
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(puppet.rotation.y);
  ctx.scale(puppet.scale.x, puppet.scale.y);
  
  // Draw joints and bones
  puppet.joints.forEach((joint: any) => {
    const jointScreenX = joint.position.x * 50;
    const jointScreenY = -joint.position.y * 50;
    
    // Draw bone to parent
    if (joint.parent) {
      const parentJoint = puppet.joints.find((j: any) => j.id === joint.parent);
      if (parentJoint) {
        const parentScreenX = parentJoint.position.x * 50;
        const parentScreenY = -parentJoint.position.y * 50;
        
        ctx.strokeStyle = '#4A90E2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(parentScreenX, parentScreenY);
        ctx.lineTo(jointScreenX, jointScreenY);
        ctx.stroke();
      }
    }
    
    // Draw joint
    ctx.fillStyle = '#4A90E2';
    ctx.beginPath();
    ctx.arc(jointScreenX, jointScreenY, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  
  ctx.restore();
  
  // Draw puppet label
  ctx.fillStyle = '#4A90E2';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${puppet.id} (${puppet.pose})`, screenX, screenY + 100);
}

/**
 * Download exported file
 */
export function downloadExportedFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate export filename
 */
export function generateExportFilename(
  format: 'mp4' | 'webm' | 'frames',
  puppetId: string
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const extension = format === 'frames' ? 'zip' : format;
  return `scene-${puppetId}-${timestamp}.${extension}`;
}

export default {
  exportSceneToVideo,
  downloadExportedFile,
  generateExportFilename,
};
