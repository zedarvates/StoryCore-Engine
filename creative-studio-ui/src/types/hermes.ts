/**
 * Hermes AI Agent Type Definitions
 */

export interface HermesVoiceResponse {
  feedback: string;
  action?: string;
  params?: Record<string, unknown>;
  wizard?: string;
  question?: string;
  confidence: number;
}

export interface HermesShot {
  id: string;
  index: number;
  description: string;
  visualStyle?: string;
  technicalPrompt?: string;
  duration?: number;
  status: 'draft' | 'ready' | 'generating' | 'completed';
}

export interface HermesChapter {
  id: string;
  number: number;
  title: string;
  content: string;
  visualized: boolean;
  shots: HermesShot[];
}

export interface HermesProject {
  id: string;
  name: string;
  description?: string;
  genre?: string;
  chapters: HermesChapter[];
  worldBibleRef?: string;
  createdAt: number;
  modifiedAt: number;
}

export interface HermesAsset {
  id: string;
  name: string;
  type: 'character' | 'location' | 'object';
  description: string;
  visualRef?: string;
}
