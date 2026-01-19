import type { Shot } from '../types';

/**
 * Scene type classification
 */
export type SceneType = 'dialogue' | 'action' | 'ambient' | 'music' | 'voiceover' | 'cinematic';

/**
 * Scene analysis result
 */
export interface SceneAnalysis {
  sceneType: SceneType;
  confidence: number; // 0-100
  keywords: string[];
  suggestedPreset: string;
  reasoning: string;
}

/**
 * Keyword patterns for scene type detection
 */
const SCENE_KEYWORDS: Record<SceneType, string[]> = {
  dialogue: [
    'conversation',
    'talking',
    'speaking',
    'dialogue',
    'interview',
    'discussion',
    'chat',
    'debate',
    'argument',
    'speech',
    'says',
    'tells',
    'asks',
    'responds',
    'replies',
    'character speaks',
    'voice',
    'words',
  ],
  action: [
    'explosion',
    'fight',
    'chase',
    'battle',
    'crash',
    'running',
    'jumping',
    'shooting',
    'combat',
    'intense',
    'fast-paced',
    'dynamic',
    'movement',
    'action',
    'impact',
    'collision',
    'punch',
    'kick',
    'attack',
  ],
  ambient: [
    'atmosphere',
    'ambient',
    'background',
    'environment',
    'nature',
    'wind',
    'rain',
    'forest',
    'ocean',
    'city sounds',
    'quiet',
    'peaceful',
    'calm',
    'serene',
    'subtle',
    'distant',
    'surrounding',
    'immersive',
  ],
  music: [
    'music',
    'song',
    'melody',
    'soundtrack',
    'score',
    'orchestra',
    'band',
    'performance',
    'concert',
    'singing',
    'instrumental',
    'beat',
    'rhythm',
    'harmony',
    'musical',
    'plays',
    'listening to',
  ],
  voiceover: [
    'narration',
    'narrator',
    'voiceover',
    'voice over',
    'commentary',
    'explains',
    'describes',
    'tells the story',
    'voice-over',
    'monologue',
    'internal thoughts',
    'thinking',
    'reflects',
    'remembers',
  ],
  cinematic: [
    'cinematic',
    'epic',
    'dramatic',
    'wide shot',
    'establishing',
    'panoramic',
    'sweeping',
    'grand',
    'majestic',
    'beautiful',
    'stunning',
    'breathtaking',
    'visual',
    'montage',
    'sequence',
  ],
};

/**
 * Analyze a shot's description to determine scene type
 * 
 * Requirements: 20.11
 */
export function analyzeScene(shot: Shot): SceneAnalysis {
  const text = `${shot.title} ${shot.description}`.toLowerCase();
  const words = text.split(/\s+/);

  // Count keyword matches for each scene type
  const scores: Record<SceneType, { count: number; keywords: string[] }> = {
    dialogue: { count: 0, keywords: [] },
    action: { count: 0, keywords: [] },
    ambient: { count: 0, keywords: [] },
    music: { count: 0, keywords: [] },
    voiceover: { count: 0, keywords: [] },
    cinematic: { count: 0, keywords: [] },
  };

  // Check for keyword matches
  for (const [sceneType, keywords] of Object.entries(SCENE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        scores[sceneType as SceneType].count++;
        scores[sceneType as SceneType].keywords.push(keyword);
      }
    }
  }

  // Find the scene type with the highest score
  let maxScore = 0;
  let detectedType: SceneType = 'cinematic'; // Default fallback

  for (const [sceneType, { count }] of Object.entries(scores)) {
    if (count > maxScore) {
      maxScore = count;
      detectedType = sceneType as SceneType;
    }
  }

  // Calculate confidence (0-100)
  const totalWords = words.length;
  const confidence = Math.min(100, Math.round((maxScore / Math.max(totalWords * 0.3, 1)) * 100));

  // Get matched keywords
  const matchedKeywords = scores[detectedType].keywords;

  // Map scene type to preset
  const presetMap: Record<SceneType, string> = {
    dialogue: 'dialogue',
    action: 'action',
    ambient: 'ambient',
    music: 'music',
    voiceover: 'voiceover',
    cinematic: 'cinematic',
  };

  const suggestedPreset = presetMap[detectedType];

  // Generate reasoning
  const reasoning = generateReasoning(detectedType, matchedKeywords, confidence);

  return {
    sceneType: detectedType,
    confidence,
    keywords: matchedKeywords,
    suggestedPreset,
    reasoning,
  };
}

/**
 * Generate human-readable reasoning for the scene analysis
 */
function generateReasoning(
  sceneType: SceneType,
  keywords: string[],
  confidence: number
): string {
  const keywordList = keywords.slice(0, 3).join(', ');

  const reasoningMap: Record<SceneType, string> = {
    dialogue: `Detected dialogue scene with keywords: ${keywordList}. Center-focused audio is recommended for clear speech.`,
    action: `Detected action scene with keywords: ${keywordList}. Full surround sound is recommended for immersive action.`,
    ambient: `Detected ambient scene with keywords: ${keywordList}. Surround-heavy audio is recommended for atmospheric immersion.`,
    music: `Detected music scene with keywords: ${keywordList}. Balanced stereo with subtle surround is recommended.`,
    voiceover: `Detected voiceover/narration with keywords: ${keywordList}. Center-only audio is recommended for clear narration.`,
    cinematic: `Detected cinematic scene with keywords: ${keywordList}. Wide soundstage is recommended for film-quality audio.`,
  };

  let reasoning = reasoningMap[sceneType];

  if (confidence < 50) {
    reasoning += ` (Low confidence: ${confidence}% - manual adjustment may be needed)`;
  } else if (confidence >= 80) {
    reasoning += ` (High confidence: ${confidence}%)`;
  }

  return reasoning;
}

/**
 * Analyze multiple shots and return aggregated scene type
 */
export function analyzeMultipleShots(shots: Shot[]): SceneAnalysis {
  if (shots.length === 0) {
    return {
      sceneType: 'cinematic',
      confidence: 0,
      keywords: [],
      suggestedPreset: 'cinematic',
      reasoning: 'No shots to analyze',
    };
  }

  if (shots.length === 1) {
    return analyzeScene(shots[0]);
  }

  // Analyze each shot
  const analyses = shots.map(analyzeScene);

  // Count scene types
  const typeCounts: Record<SceneType, number> = {
    dialogue: 0,
    action: 0,
    ambient: 0,
    music: 0,
    voiceover: 0,
    cinematic: 0,
  };

  for (const analysis of analyses) {
    typeCounts[analysis.sceneType]++;
  }

  // Find most common scene type
  let maxCount = 0;
  let dominantType: SceneType = 'cinematic';

  for (const [sceneType, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = sceneType as SceneType;
    }
  }

  // Calculate average confidence
  const avgConfidence = Math.round(
    analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length
  );

  // Collect all keywords
  const allKeywords = Array.from(
    new Set(analyses.flatMap((a) => a.keywords))
  ).slice(0, 5);

  // Map to preset
  const presetMap: Record<SceneType, string> = {
    dialogue: 'dialogue',
    action: 'action',
    ambient: 'ambient',
    music: 'music',
    voiceover: 'voiceover',
    cinematic: 'cinematic',
  };

  const suggestedPreset = presetMap[dominantType];

  const reasoning = `Analyzed ${shots.length} shots. Dominant scene type: ${dominantType} (${maxCount}/${shots.length} shots). Keywords: ${allKeywords.join(', ')}.`;

  return {
    sceneType: dominantType,
    confidence: avgConfidence,
    keywords: allKeywords,
    suggestedPreset,
    reasoning,
  };
}

/**
 * Get scene type description
 */
export function getSceneTypeDescription(sceneType: SceneType): string {
  const descriptions: Record<SceneType, string> = {
    dialogue: 'Conversation or speech-focused scene',
    action: 'High-energy action or movement scene',
    ambient: 'Atmospheric or environmental scene',
    music: 'Music or musical performance scene',
    voiceover: 'Narration or voiceover scene',
    cinematic: 'Cinematic or establishing scene',
  };

  return descriptions[sceneType];
}

/**
 * Get recommended surround mode for scene type
 */
export function getRecommendedMode(sceneType: SceneType): '5.1' | '7.1' {
  const modeMap: Record<SceneType, '5.1' | '7.1'> = {
    dialogue: '5.1',
    action: '7.1',
    ambient: '5.1',
    music: '5.1',
    voiceover: '5.1',
    cinematic: '7.1',
  };

  return modeMap[sceneType];
}
