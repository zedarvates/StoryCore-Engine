/**
 * Project Templates
 * Predefined project templates for different content types
 */
export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  settings: { targetDuration: number; frameRate: number; resolution: { width: number; height: number }; aspectRatio: string; };
  structure: { acts: number; scenesPerAct: number; shotsPerScene: number; avgShotDuration: number; };
  prompts: { world: string; character: string; style: string; };
  tags: string[];
}
export const projectTemplates: ProjectTemplate[] = [
  { id: 'short-film', name: 'Court-metrage', description: 'Template for short films 3-15 min', category: 'Narrative', settings: { targetDuration: 10, frameRate: 24, resolution: { width: 1920, height: 1080 }, aspectRatio: '16:9' }, structure: { acts: 3, scenesPerAct: 3, shotsPerScene: 5, avgShotDuration: 4 }, prompts: { world: 'Create a visually striking world', character: 'Develop complex characters', style: 'Cinematic lighting' }, tags: ['narrative', 'drama', 'cinematic'] },
  { id: 'series-episode', name: 'Episode de Serie', description: 'Template for TV series episodes', category: 'TV Series', settings: { targetDuration: 42, frameRate: 24, resolution: { width: 1920, height: 1080 }, aspectRatio: '16:9' }, structure: { acts: 4, scenesPerAct: 5, shotsPerScene: 6, avgShotDuration: 3 }, prompts: { world: 'Consistent world-building', character: 'Ensemble cast', style: 'TV production' }, tags: ['tv', 'series', 'ensemble'] },
  { id: 'animation', name: 'Animation', description: 'Template for animation projects', category: 'Animation', settings: { targetDuration: 5, frameRate: 30, resolution: { width: 1920, height: 1080 }, aspectRatio: '16:9' }, structure: { acts: 3, scenesPerAct: 4, shotsPerScene: 8, avgShotDuration: 2 }, prompts: { world: 'Stylized world', character: 'Expressive characters', style: 'Consistent art style' }, tags: ['animation', 'stylized', 'cartoon'] },
  { id: 'documentary', name: 'Documentaire', description: 'Template for documentary films', category: 'Documentary', settings: { targetDuration: 30, frameRate: 30, resolution: { width: 1920, height: 1080 }, aspectRatio: '16:9' }, structure: { acts: 3, scenesPerAct: 4, shotsPerScene: 4, avgShotDuration: 6 }, prompts: { world: 'Authentic locations', character: 'Real subjects', style: 'Cinematic documentary' }, tags: ['documentary', 'real', 'informational'] },
  { id: 'social-content', name: 'Contenu Social', description: 'Template for TikTok Reels Shorts', category: 'Social Media', settings: { targetDuration: 0.5, frameRate: 30, resolution: { width: 1080, height: 1920 }, aspectRatio: '9:16' }, structure: { acts: 1, scenesPerAct: 5, shotsPerScene: 2, avgShotDuration: 2 }, prompts: { world: 'Vertical-friendly', character: 'Direct-to-camera', style: 'Fast-paced' }, tags: ['social', 'vertical', 'tiktok', 'reels'] },
  { id: 'feature-film', name: 'Long Metrage', description: 'Template for feature films 90+ min', category: 'Feature Film', settings: { targetDuration: 120, frameRate: 24, resolution: { width: 3840, height: 2160 }, aspectRatio: '2.39:1' }, structure: { acts: 3, scenesPerAct: 10, shotsPerScene: 8, avgShotDuration: 4 }, prompts: { world: 'Epic world-building', character: 'Complex arcs', style: 'Feature film quality' }, tags: ['feature', 'epic', 'cinematic', '4k'] }
];
export const templateCategories = ['All', 'Narrative', 'TV Series', 'Animation', 'Documentary', 'Social Media', 'Feature Film'];
export function getTemplateById(id: string): ProjectTemplate | undefined { return projectTemplates.find(t => t.id === id); }
export function getTemplatesByCategory(category: string): ProjectTemplate[] { if (category === 'All') return projectTemplates; return projectTemplates.filter(t => t.category === category); }
export default projectTemplates;