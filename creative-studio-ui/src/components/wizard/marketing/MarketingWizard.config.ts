/**
 * MarketingWizard Configuration
 * 
 * Configuration file for Marketing Wizard constants and utilities
 */

import {
  MarketingContentType,
  VisualStyle,
  TargetPlatform,
  MusicMood,
  SequenceConfig,
  ExportSettings
} from './MarketingWizard';

// ============================================================================
// AI PROMPT GENERATION TEMPLATES
// ============================================================================

export const AI_PROMPT_TEMPLATES = {
  trailer: {
    intro: (projectName: string, style: VisualStyle) =>
      `Create a cinematic intro for "${projectName}". Style: ${style}. Include title animation and logo reveal. Duration: 5-8 seconds.`,
    
    main: (projectName: string, summary: string, style: VisualStyle) =>
      `Create the main content sequence for "${projectName}". 
       Story summary: ${summary}
       Style: ${style}. 
       Create engaging highlights that capture the essence of the story.
       Include character moments and key plot points.`,
       
    outro: (projectName: string, style: VisualStyle) =>
      `Create a compelling outro for "${projectName}" with:
       - Call-to-action text
       - Social media handles
       - Logo animation
       - Release date/availability info
       Style: ${style}. Duration: 5-8 seconds.`
  },
  
  teaser: {
    hook: (projectName: string, style: VisualStyle) =>
      `Create a powerful opening hook for "${projectName}". 
       Style: ${style}. 
       Use dramatic tension and intrigue to grab attention immediately.
       Duration: 3-5 seconds.`,
       
    reveal: (projectName: string, style: VisualStyle) =>
      `Create a teaser reveal for "${projectName}". 
       Style: ${style}. 
       Show glimpses and hints without revealing too much.
       Build anticipation. Duration: 10-20 seconds.`,
       
    brand: (projectName: string, style: VisualStyle) =>
      `Add branding elements for "${projectName}" teaser.
       Style: ${style}.
       Include title card with release date.
       Duration: 2-3 seconds.`
  },
  
  clip: {
    highlight: (projectName: string, style: VisualStyle) =>
      `Create an exciting highlight clip for "${projectName}".
       Style: ${style}.
       Focus on the most engaging moments.
       Fast-paced editing appropriate for social media.
       Duration: 15-60 seconds.`,
       
    social: (projectName: string, platform: TargetPlatform, style: VisualStyle) =>
      `Create a social media optimized clip for "${projectName}".
       Platform: ${platform}
       Style: ${style}.
       Optimized for silent autoplay with captions.
       Include text overlays for key information.`
  },
  
  thumbnail: {
    main: (projectName: string, style: VisualStyle) =>
      `Create an eye-catching YouTube thumbnail for "${projectName}".
       Style: ${style}.
       High contrast, bold text placement.
       Expressive character faces or dramatic moments.
       Resolution: 1280x720.`
  }
};

// ============================================================================
// DURATION PRESETS
// ============================================================================

export const DURATION_PRESETS = {
  youtube: {
    trailer: [30, 60, 90, 120, 180],
    teaser: [15, 30],
    clip: [30, 60],
    thumbnail: [0]
  },
  instagram: {
    trailer: [30, 60],
    teaser: [15, 30],
    clip: [15, 30, 60],
    thumbnail: [0]
  },
  tiktok: {
    trailer: [15, 30],
    teaser: [15],
    clip: [15, 30, 60],
    thumbnail: [0]
  },
  facebook: {
    trailer: [30, 60, 120],
    teaser: [15, 30],
    clip: [30, 60],
    thumbnail: [0]
  },
  twitter: {
    trailer: [30],
    teaser: [15],
    clip: [30],
    thumbnail: [0]
  },
  linkedin: {
    trailer: [60, 120],
    teaser: [30],
    clip: [60],
    thumbnail: [0]
  }
};

// ============================================================================
// EXPORT SETTINGS PRESETS
// ============================================================================

export const EXPORT_PRESETS: Record<TargetPlatform, ExportSettings> = {
  youtube: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '16:9'
  },
  instagram: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '1:1'
  },
  tiktok: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '9:16'
  },
  facebook: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '16:9'
  },
  twitter: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '16:9'
  },
  linkedin: {
    resolution: '1080p',
    format: 'mp4',
    quality: 'high',
    aspectRatio: '16:9'
  }
};

// ============================================================================
// STYLE MAPPING TO COLORS
// ============================================================================

export const STYLE_COLORS: Record<VisualStyle, { primary: string; secondary: string }> = {
  dynamic: { primary: '#FF6B35', secondary: '#F7C59F' },
  dramatic: { primary: '#1A1A2E', secondary: '#16213E' },
  humorous: { primary: '#FFD93D', secondary: '#FF9F1C' },
  elegant: { primary: '#2C3E50', secondary: '#E8D5B7' },
  minimaliste: { primary: '#2C3E50', secondary: '#ECF0F1' },
  energetic: { primary: '#E74C3C', secondary: '#F39C12' }
};

// ============================================================================
// MUSIC RECOMMENDATIONS
// ============================================================================

export const MUSIC_RECOMMENDATIONS: Record<MusicMood, { genre: string; bpm: string; examples: string[] }> = {
  epic: {
    genre: 'Cinematic/Orchestral',
    bpm: '60-80',
    examples: ['Hans Zimmer style', 'Epic orchestral trailers', 'Adventure scores']
  },
  soft: {
    genre: 'Acoustic/Acoustic Folk',
    bpm: '80-100',
    examples: ['Acoustic guitar', 'Piano ballads', 'Ambient backgrounds']
  },
  tense: {
    genre: 'Electronic/Horror',
    bpm: 'Variable',
    examples: ['Dark ambient', 'Suspense strings', 'Industrial beats']
  },
  happy: {
    genre: 'Pop/Upbeat',
    bpm: '110-130',
    examples: ['Upbeat pop', 'Indie rock', 'Feel-good tracks']
  },
  mysterious: {
    genre: 'Ambient/Electronic',
    bpm: '70-90',
    examples: ['Ambient pads', 'Mystery scores', 'Atmospheric synths']
  },
  neutral: {
    genre: 'Background/Lo-fi',
    bpm: '80-100',
    examples: ['Lo-fi beats', 'Corporate background', 'Study music']
  }
};

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateMarketingPlan(plan: Partial<{
  type: MarketingContentType;
  duration: number;
  platform: TargetPlatform;
  style: VisualStyle;
  musicMood: MusicMood;
}>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!plan.type) {
    errors.push('Le type de contenu est requis');
  }
  
  if (!plan.duration || plan.duration < 5) {
    errors.push('La durée doit être d\'au moins 5 secondes');
  }
  
  if (!plan.platform) {
    errors.push('La plateforme cible est requise');
  }
  
  if (!plan.style) {
    errors.push('Le style visuel est requis');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ============================================================================
// SEQUENCE GENERATOR
// ============================================================================

export function generateSequences(
  type: MarketingContentType,
  duration: number,
  style: VisualStyle,
  projectName: string,
  projectSummary?: string
): SequenceConfig[] {
  const sequences: SequenceConfig[] = [];
  
  if (type === 'thumbnail') {
    sequences.push({
      id: `seq-${Date.now()}-1`,
      name: 'Thumbnail',
      duration: 0,
      description: 'Image fixe pour vignette',
      aiPrompt: AI_PROMPT_TEMPLATES.thumbnail.main(projectName, style),
      order: 1
    });
  } else {
    const introRatio = type === 'teaser' ? 0.2 : 0.15;
    const outroRatio = type === 'teaser' ? 0.15 : 0.15;
    const introDuration = Math.max(3, Math.floor(duration * introRatio));
    const outroDuration = Math.max(3, Math.floor(duration * outroRatio));
    const mainDuration = duration - introDuration - outroDuration;
    
    if (type === 'trailer') {
      sequences.push({
        id: `seq-${Date.now()}-intro`,
        name: 'Intro',
        duration: introDuration,
        description: 'Sequence d\'ouverture',
        aiPrompt: AI_PROMPT_TEMPLATES.trailer.intro(projectName, style),
        order: 1
      });
    } else if (type === 'teaser') {
      sequences.push({
        id: `seq-${Date.now()}-hook`,
        name: 'Hook',
        duration: introDuration,
        description: 'Accroche initiale',
        aiPrompt: AI_PROMPT_TEMPLATES.teaser.hook(projectName, style),
        order: 1
      });
    } else {
      sequences.push({
        id: `seq-${Date.now()}-highlight`,
        name: 'Highlights',
        duration: introDuration,
        description: 'Moments forts',
        aiPrompt: AI_PROMPT_TEMPLATES.clip.highlight(projectName, style),
        order: 1
      });
    }
    
    sequences.push({
      id: `seq-${Date.now()}-main`,
      name: 'Corps principal',
      duration: mainDuration,
      description: 'Contenu principal',
      aiPrompt: type === 'teaser' 
        ? AI_PROMPT_TEMPLATES.teaser.reveal(projectName, style)
        : AI_PROMPT_TEMPLATES.trailer.main(projectName, projectSummary || '', style),
      order: 2
    });
    
    sequences.push({
      id: `seq-${Date.now()}-outro`,
      name: 'Outro',
      duration: outroDuration,
      description: 'Appel à l\'action',
      aiPrompt: type === 'teaser'
        ? AI_PROMPT_TEMPLATES.teaser.brand(projectName, style)
        : AI_PROMPT_TEMPLATES.trailer.outro(projectName, style),
      order: 3
    });
  }
  
  return sequences;
}

// ============================================================================
// PLATFORM OPTIMIZATION TIPS
// ============================================================================

export const PLATFORM_TIPS: Record<TargetPlatform, string[]> = {
  youtube: [
    'Les 15 premières secondes sont cruciales pour la rétention',
    'Ajoutez des cartes et des écrans de fin pour l\'engagement',
    'Les miniatures personnalisées augmentent les clics'
  ],
  instagram: [
    'Privilégiez les formats carrés 1:1 ou verticaux',
    'Les premières 3 secondes doivent accrocher',
    'Utilisez des hashtags pertinents'
  ],
  tiktok: [
    'Captions are essential - many users watch on mute',
    'Hook dans les 2 premières secondes',
    'Les trends et défis augmentent la visibilité'
  ],
  facebook: [
    'Les vidéos natives ont meilleur أداء',
    'Les sous-titres sont recommandés',
    '直播 (Live) génère plus d\'engagement'
  ],
  twitter: [
    'Format court et percutant requis',
    'Les GIFs et vidéos courtes performent bien',
    'Intégrez des hashtags stratégiques'
  ],
  linkedin: [
    'Contenu professionnel et informatif',
    'Les vidéos LinkedIn ont une bonne portée organique',
    'Appelez à l\'action clairs'
  ]
};

export default {
  AI_PROMPT_TEMPLATES,
  DURATION_PRESETS,
  EXPORT_PRESETS,
  STYLE_COLORS,
  MUSIC_RECOMMENDATIONS,
  validateMarketingPlan,
  generateSequences,
  PLATFORM_TIPS
};
