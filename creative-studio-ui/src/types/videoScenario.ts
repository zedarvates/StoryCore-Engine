/**
 * Video Scenario Types
 * Type definitions for video scenario generation
 */

export interface Shot {
  id: string;
  shotNumber: number;
  type: string;
  cameraMovement: string;
  framing: string;
  focusPoint: string;
  duration: number;
  purpose: string;
  sequenceId: string;
}

export interface Sequence {
  id: string;
  sequenceNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  description: string;
  visualElements: string[];
  mood: string;
  shots: Shot[];
  duration: number;
  order: number;
}

export interface Dialogue {
  id: string;
  character: string;
  text: string;
  emotion: string;
  sceneReference: string;
  timestamp: string;
}

export interface ProductionElement {
  id: string;
  type: string;
  description: string;
  timing: string;
  purpose: string;
  storyId: string;
}

export interface VideoScenarioMetadata {
  includeDialogues: boolean;
  includeSequences: boolean;
  includeShots: boolean;
  includeLyrics: boolean;
  shotStyle: 'cinematic' | 'documentary' | 'animation' | 'mixed';
  dialogueStyle: 'natural' | 'dramatic' | 'minimal';
  generatedAt: number;
}

export interface VideoScenario {
  id: string;
  title: string;
  storyId: string;
  sequences: Sequence[];
  dialogues: Dialogue[];
  productionElements: ProductionElement[];
  metadata: VideoScenarioMetadata;
}
