/**
 * AI Tools Components - Phase 8: UI Integration
 * 
 * Export all AI-powered tools for StoryCore-Engine
 */

// Animation Presets - Drag & drop animation presets
export { AnimationPresetsPanel } from './AnimationPresetsPanel';

// Magic Mask - One-click subject isolation
export { MagicMaskTool } from './MagicMaskTool';

// Atmospheric Grading Studio - Cinematic color & volumetric lighting
export { AtmosphericGradingStudio } from './AtmosphericGradingStudio';

// Motion VFX Presets - Narrative-driven physics presets
export { MotionVFXPresets } from './MotionVFXPresets';

// Subtitle Editor - AI-powered subtitle generation
export { SubtitleEditor } from './SubtitleEditor';

// AI Foley Studio - Automated soundscapes & worldization
export { AIFoleyStudio } from './AIFoleyStudio';

// Dialogue Master Studio - Voice cloning & lip-sync
export { DialogueMasterStudio } from './DialogueMasterStudio';

/**
 * Usage Examples:
 * 
 * // Animation Presets
 * import { AnimationPresetsPanel } from '@/components/AITools';
 * <AnimationPresetsPanel
 *   inputPath="/path/to/image.jpg"
 *   onApply={(config) => console.log('Applied:', config)}
 * />
 * 
 * // Magic Mask
 * import { MagicMaskTool } from '@/components/AITools';
 * <MagicMaskTool
 *   inputPath="/path/to/image.jpg"
 *   onMaskGenerated={(result) => console.log('Mask:', result)}
 * />
 * 
 * // Subtitle Editor
 * import { SubtitleEditor } from '@/components/AITools';
 * <SubtitleEditor
 *   videoPath="/path/to/video.mp4"
 *   onSubtitlesGenerated={(srtPath) => console.log('SRT:', srtPath)}
 * />
 */