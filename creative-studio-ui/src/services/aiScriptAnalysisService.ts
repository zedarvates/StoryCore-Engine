/**
 * AI Script Analysis Service
 * 
 * Provides script analysis and scene breakdown capabilities using the AI Script Analysis Engine.
 * Integrates with the existing service architecture and provides React hooks for UI integration.
 */

import { EventEmitter } from 'events';
import type { SceneType, CharacterRole, DialogueType, EmotionType } from '../../src/ai_script_analysis_engine';

// Script analysis data types
export interface ScriptAnalysis {
  id: string;
  title: string;
  content: string;
  analysis: ScriptAnalysisResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScriptAnalysisResult {
  characters: CharacterAnalysis[];
  scenes: SceneAnalysis[];
  dialogues: DialogueAnalysis[];
  storyStructure: StoryStructure;
  metrics: ScriptMetrics;
  recommendations: string[];
  qualityScore: number;
}

export interface CharacterAnalysis {
  id: string;
  name: string;
  role: CharacterRole;
  screenTimePercentage: number;
  dialogueCount: number;
  emotionalRange: EmotionType[];
  characterArcs: string[];
  relationships: Record<string, string>;
  keyTraits: string[];
  motivations: string[];
  conflicts: string[];
}

export interface SceneAnalysis {
  id: string;
  sceneNumber: number;
  sceneType: SceneType;
  location: string;
  timeOfDay: string;
  characters: string[];
  durationEstimated: number;
  emotionalTone: EmotionType;
  plotSignificance: number;
  conflictLevel: number;
  keyEvents: string[];
  dialogueCount: number;
  actionDescriptions: string[];
}

export interface DialogueAnalysis {
  id: string;
  speaker: string;
  listener: string;
  dialogueType: DialogueType;
  emotion: EmotionType;
  wordCount: number;
  sentimentScore: number;
  subtextLevel: number;
  purpose: string;
  keyPhrases: string[];
  emotionalImpact: number;
}

export interface StoryStructure {
  acts: string[];
  plotPoints: PlotPoint[];
  pacingAnalysis: Record<string, number>;
  tensionCurve: number[];
  characterDevelopment: Record<string, string[]>;
  themeAnalysis: string[];
  genreIndicators: string[];
}

export interface PlotPoint {
  name: string;
  scene: number;
  description: string;
}

export interface ScriptMetrics {
  totalScenes: number;
  totalCharacters: number;
  totalDialogueLines: number;
  estimatedRuntimeMinutes: number;
  averageSceneLength: number;
  dialogueToActionRatio: number;
  emotionalDiversityScore: number;
  conflictDensity: number;
  characterInteractionComplexity: number;
}

export interface ScriptAnalysisConfig {
  analysisDepth: 'basic' | 'standard' | 'comprehensive';
  focusAreas: string[];
  genreHint?: string;
  targetAudience?: string;
  runtimeTarget?: number;
  sensitivityFilter: boolean;
}

// Service events
export interface ScriptAnalysisServiceEvents {
  'analysis:started': (scriptId: string) => void;
  'analysis:progress': (scriptId: string, progress: number) => void;
  'analysis:completed': (analysis: ScriptAnalysis) => void;
  'analysis:failed': (scriptId: string, error: string) => void;
  'recommendations:updated': (scriptId: string, recommendations: string[]) => void;
}

class AIScriptAnalysisService extends EventEmitter {
  private analyses: Map<string, ScriptAnalysis> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the script analysis service
   */
  async initialize(): Promise<boolean> {
    try {
      // Load analyses from storage
      await this.loadAnalyses();
      this.isInitialized = true;
      console.log('AI Script Analysis Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Script Analysis Service:', error);
      return false;
    }
  }

  /**
   * Analyze a script using AI
   */
  async analyzeScript(
    title: string, 
    content: string, 
    config: ScriptAnalysisConfig
  ): Promise<ScriptAnalysis> {
    if (!this.isInitialized) {
      throw new Error('Script analysis service not initialized');
    }

    const scriptId = `script_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Emit analysis started event
      this.emit('analysis:started', scriptId);

      // Simulate AI analysis with progress updates
      const analysis = await this.simulateScriptAnalysis(scriptId, content, config);
      
      // Store analysis
      this.analyses.set(scriptId, analysis);
      await this.saveAnalyses();
      
      // Emit completion event
      this.emit('analysis:completed', analysis);
      
      return analysis;
    } catch (error) {
      console.error('Failed to analyze script:', error);
      this.emit('analysis:failed', scriptId, error.message);
      throw error;
    }
  }

  /**
   * Get analysis by ID
   */
  getAnalysis(id: string): ScriptAnalysis | undefined {
    return this.analyses.get(id);
  }

  /**
   * Get all analyses
   */
  getAllAnalyses(): ScriptAnalysis[] {
    return Array.from(this.analyses.values());
  }

  /**
   * Update analysis configuration and re-analyze
   */
  async updateAnalysis(
    scriptId: string, 
    config: Partial<ScriptAnalysisConfig>
  ): Promise<ScriptAnalysis> {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    // Update configuration
    const updatedConfig: ScriptAnalysisConfig = {
      ...analysis.analysis as any,
      ...config
    };

    // Re-analyze
    const updatedAnalysis = await this.simulateScriptAnalysis(scriptId, analysis.content, updatedConfig);
    
    this.analyses.set(scriptId, updatedAnalysis);
    await this.saveAnalyses();
    
    this.emit('analysis:completed', updatedAnalysis);
    return updatedAnalysis;
  }

  /**
   * Get character analysis summary
   */
  getCharacterSummary(scriptId: string): CharacterSummary {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const characters = analysis.analysis.characters;
    
    return {
      protagonistCount: characters.filter(c => c.role === CharacterRole.PROTAGONIST).length,
      antagonistCount: characters.filter(c => c.role === CharacterRole.ANTAGONIST).length,
      supportingCount: characters.filter(c => c.role === CharacterRole.SUPPORTING).length,
      averageScreenTime: characters.reduce((sum, c) => sum + c.screenTimePercentage, 0) / characters.length,
      emotionalDiversity: this.calculateEmotionalDiversity(characters),
      relationshipComplexity: this.calculateRelationshipComplexity(characters)
    };
  }

  /**
   * Get scene analysis summary
   */
  getSceneSummary(scriptId: string): SceneSummary {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const scenes = analysis.analysis.scenes;
    
    return {
      totalScenes: scenes.length,
      expositionScenes: scenes.filter(s => s.sceneType === SceneType.EXPOSITION).length,
      risingActionScenes: scenes.filter(s => s.sceneType === SceneType.RISING_ACTION).length,
      climaxScenes: scenes.filter(s => s.sceneType === SceneType.CLIMAX).length,
      fallingActionScenes: scenes.filter(s => s.sceneType === SceneType.FALLING_ACTION).length,
      resolutionScenes: scenes.filter(s => s.sceneType === SceneType.RESOLUTION).length,
      averageSceneDuration: scenes.reduce((sum, s) => sum + s.durationEstimated, 0) / scenes.length,
      averageConflictLevel: scenes.reduce((sum, s) => sum + s.conflictLevel, 0) / scenes.length
    };
  }

  /**
   * Get dialogue analysis summary
   */
  getDialogueSummary(scriptId: string): DialogueSummary {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const dialogues = analysis.analysis.dialogues;
    
    return {
      totalLines: dialogues.length,
      expositionLines: dialogues.filter(d => d.dialogueType === DialogueType.EXPOSITION).length,
      conflictLines: dialogues.filter(d => d.dialogueType === DialogueType.CONFLICT).length,
      revelationLines: dialogues.filter(d => d.dialogueType === DialogueType.REVELATION).length,
      averageWordCount: dialogues.reduce((sum, d) => sum + d.wordCount, 0) / dialogues.length,
      averageSentiment: dialogues.reduce((sum, d) => sum + d.sentimentScore, 0) / dialogues.length,
      emotionalImpactScore: dialogues.reduce((sum, d) => sum + d.emotionalImpact, 0) / dialogues.length
    };
  }

  /**
   * Get story structure analysis
   */
  getStoryStructure(scriptId: string): StoryStructure {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    return analysis.analysis.storyStructure;
  }

  /**
   * Get script metrics
   */
  getScriptMetrics(scriptId: string): ScriptMetrics {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    return analysis.analysis.metrics;
  }

  /**
   * Get recommendations for script improvement
   */
  getRecommendations(scriptId: string): string[] {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    return analysis.analysis.recommendations;
  }

  /**
   * Generate specific recommendations based on focus areas
   */
  generateFocusedRecommendations(
    scriptId: string, 
    focusAreas: string[]
  ): Recommendation[] {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const recommendations: Recommendation[] = [];

    if (focusAreas.includes('characters')) {
      recommendations.push(...this.generateCharacterRecommendations(analysis));
    }

    if (focusAreas.includes('scenes')) {
      recommendations.push(...this.generateSceneRecommendations(analysis));
    }

    if (focusAreas.includes('dialogue')) {
      recommendations.push(...this.generateDialogueRecommendations(analysis));
    }

    return recommendations;
  }

  /**
   * Export analysis results
   */
  exportAnalysis(scriptId: string, format: 'json' | 'xml' | 'pdf' = 'json'): string {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    if (format === 'json') {
      return JSON.stringify(analysis, null, 2);
    } else if (format === 'xml') {
      return this.convertToXML(analysis);
    } else {
      // PDF export - generate a formatted text representation
      return this.convertToPDF(analysis);
    }
  }

  /**
   * Import analysis results
   */
  async importAnalysis(data: string, format: 'json' | 'xml' = 'json'): Promise<ScriptAnalysis> {
    let analysisData: unknown;

    if (format === 'json') {
      analysisData = JSON.parse(data);
    } else {
      analysisData = this.parseXML(data);
    }

    const analysis: ScriptAnalysis = {
      ...analysisData,
      createdAt: new Date(analysisData.createdAt),
      updatedAt: new Date(analysisData.updatedAt)
    };

    this.analyses.set(analysis.id, analysis);
    await this.saveAnalyses();
    
    return analysis;
  }

  /**
   * Delete analysis
   */
  async deleteAnalysis(scriptId: string): Promise<void> {
    const analysis = this.analyses.get(scriptId);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    this.analyses.delete(scriptId);
    await this.saveAnalyses();
  }

  // Private methods

  private async simulateScriptAnalysis(
    scriptId: string, 
    content: string, 
    config: ScriptAnalysisConfig
  ): Promise<ScriptAnalysis> {
    // Simulate AI analysis with progress updates
    const totalSteps = 10;
    
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 200));
      const progress = (i / totalSteps) * 100;
      this.emit('analysis:progress', scriptId, progress);
    }

    // Generate mock analysis results
    const characters = this.generateMockCharacters(content);
    const scenes = this.generateMockScenes(content);
    const dialogues = this.generateMockDialogues(content);
    const storyStructure = this.generateMockStoryStructure();
    const metrics = this.generateMockMetrics(characters, scenes, dialogues);
    const recommendations = this.generateMockRecommendations(characters, scenes, dialogues);

    return {
      id: scriptId,
      title: config.genreHint || 'Untitled Script',
      content,
      analysis: {
        characters,
        scenes,
        dialogues,
        storyStructure,
        metrics,
        recommendations,
        qualityScore: Math.random() * 0.4 + 0.5 // 0.5 to 0.9
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private generateMockCharacters(content: string): CharacterAnalysis[] {
    const characterNames = this.extractCharacterNames(content);
    const characters: CharacterAnalysis[] = [];

    characterNames.forEach((name, index) => {
      characters.push({
        id: `char_${index}`,
        name,
        role: index === 0 ? CharacterRole.PROTAGONIST : 
              index === 1 ? CharacterRole.ANTAGONIST : 
              CharacterRole.SUPPORTING,
        screenTimePercentage: Math.random() * 30 + 10,
        dialogueCount: Math.floor(Math.random() * 50) + 5,
        emotionalRange: [EmotionType.HAPPINESS, EmotionType.ANGER, EmotionType.FEAR],
        characterArcs: ['Introduction', 'Development', 'Resolution'],
        relationships: { 'protagonist': 'friend', 'antagonist': 'enemy' },
        keyTraits: ['brave', 'loyal', 'determined'],
        motivations: ['save the world', 'find love', 'achieve success'],
        conflicts: ['internal struggle', 'external threat', 'moral dilemma']
      });
    });

    return characters;
  }

  private generateMockScenes(content: string): SceneAnalysis[] {
    const sceneCount = Math.floor(content.split('\n').length / 20) + 1;
    const scenes: SceneAnalysis[] = [];

    for (let i = 0; i < sceneCount; i++) {
      scenes.push({
        id: `scene_${i}`,
        sceneNumber: i + 1,
        sceneType: i < 3 ? SceneType.EXPOSITION : 
                   i < sceneCount * 0.7 ? SceneType.RISING_ACTION :
                   i < sceneCount * 0.9 ? SceneType.CLIMAX : SceneType.RESOLUTION,
        location: `Location ${i + 1}`,
        timeOfDay: i % 2 === 0 ? 'Day' : 'Night',
        characters: [`Character ${i % 3}`, `Character ${(i + 1) % 3}`],
        durationEstimated: Math.random() * 5 + 2,
        emotionalTone: EmotionType.HAPPINESS,
        plotSignificance: Math.floor(Math.random() * 8) + 2,
        conflictLevel: Math.floor(Math.random() * 8) + 2,
        keyEvents: [`Event ${i + 1}`, `Event ${i + 2}`],
        dialogueCount: Math.floor(Math.random() * 10) + 2,
        actionDescriptions: [`Action ${i + 1}`, `Action ${i + 2}`]
      });
    }

    return scenes;
  }

  private generateMockDialogues(content: string): DialogueAnalysis[] {
    const lines = content.split('\n').filter(line => line.trim());
    const dialogues: DialogueAnalysis[] = [];

    lines.forEach((line, index) => {
      if (line.includes(':')) {
        const [speaker, text] = line.split(':');
        dialogues.push({
          id: `dialogue_${index}`,
          speaker: speaker.trim(),
          listener: 'Other',
          dialogueType: DialogueType.EXPOSITION,
          emotion: EmotionType.HAPPINESS,
          wordCount: text.split(' ').length,
          sentimentScore: Math.random() * 0.6 + 0.2,
          subtextLevel: Math.floor(Math.random() * 4) + 1,
          purpose: 'Character development',
          keyPhrases: ['key phrase 1', 'key phrase 2'],
          emotionalImpact: Math.random() * 0.5 + 0.3
        });
      }
    });

    return dialogues;
  }

  private generateMockStoryStructure(): StoryStructure {
    return {
      acts: ['Act 1: Setup', 'Act 2: Confrontation', 'Act 3: Resolution'],
      plotPoints: [
        { name: 'Inciting Incident', scene: 3, description: 'Main conflict introduced' },
        { name: 'Plot Point 1', scene: 10, description: 'First major turning point' },
        { name: 'Midpoint', scene: 20, description: 'Major revelation or reversal' },
        { name: 'Plot Point 2', scene: 30, description: 'Second major turning point' },
        { name: 'Climax', scene: 35, description: 'Final confrontation' },
        { name: 'Resolution', scene: 40, description: 'Story conclusion' }
      ],
      pacingAnalysis: {
        setupPace: 0.8,
        confrontationPace: 1.2,
        resolutionPace: 0.9
      },
      tensionCurve: [0.2, 0.3, 0.5, 0.7, 0.9, 1.0, 0.8, 0.6, 0.4, 0.1],
      characterDevelopment: {
        protagonist: ['Introduction', 'Challenge', 'Growth', 'Transformation'],
        antagonist: ['Introduction', 'Conflict', 'Escalation', 'Defeat']
      },
      themeAnalysis: ['Hero\'s journey', 'Good vs evil', 'Personal growth'],
      genreIndicators: ['Action', 'Drama', 'Adventure']
    };
  }

  private generateMockMetrics(
    characters: CharacterAnalysis[], 
    scenes: SceneAnalysis[], 
    dialogues: DialogueAnalysis[]
  ): ScriptMetrics {
    return {
      totalScenes: scenes.length,
      totalCharacters: characters.length,
      totalDialogueLines: dialogues.length,
      estimatedRuntimeMinutes: scenes.length * 2.5 + dialogues.length * 0.1,
      averageSceneLength: dialogues.length / Math.max(1, scenes.length),
      dialogueToActionRatio: dialogues.length / Math.max(1, scenes.length * 5),
      emotionalDiversityScore: 0.7,
      conflictDensity: 0.6,
      characterInteractionComplexity: 0.8
    };
  }

  private generateMockRecommendations(
    characters: CharacterAnalysis[], 
    scenes: SceneAnalysis[], 
    dialogues: DialogueAnalysis[]
  ): string[] {
    const recommendations: string[] = [];

    if (characters.length < 3) {
      recommendations.push('Consider adding more characters for richer interactions');
    }

    if (scenes.filter(s => s.conflictLevel > 7).length === 0) {
      recommendations.push('Add more high-conflict scenes to maintain tension');
    }

    if (dialogues.filter(d => d.sentimentScore < 0.3).length === 0) {
      recommendations.push('Include more negative or conflicted dialogue for balance');
    }

    recommendations.push('Review dialogue for natural flow and character consistency');
    recommendations.push('Ensure each scene advances the plot or develops characters');
    recommendations.push('Consider pacing - avoid scenes that are too long or too short');

    return recommendations;
  }

  private extractCharacterNames(content: string): string[] {
    const nameRegex = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
    const matches = content.match(nameRegex) || [];
    const uniqueNames = [...new Set(matches)];
    return uniqueNames.slice(0, 10); // Limit to 10 characters
  }

  private calculateEmotionalDiversity(characters: CharacterAnalysis[]): number {
    const emotions = new Set();
    characters.forEach(c => c.emotionalRange.forEach(e => emotions.add(e)));
    return emotions.size / Object.keys(EmotionType).length;
  }

  private calculateRelationshipComplexity(characters: CharacterAnalysis[]): number {
    const totalRelationships = characters.reduce((sum, c) => sum + Object.keys(c.relationships).length, 0);
    return Math.min(1.0, totalRelationships / (characters.length * 3));
  }

  private generateCharacterRecommendations(analysis: ScriptAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const protagonistCount = analysis.analysis.characters.filter(c => c.role === CharacterRole.PROTAGONIST).length;
    if (protagonistCount === 0) {
      recommendations.push({
        type: 'character',
        priority: 'high',
        description: 'Consider developing a clearer protagonist for audience connection',
        suggestion: 'Create a main character with clear goals and motivations'
      });
    }

    return recommendations;
  }

  private generateSceneRecommendations(analysis: ScriptAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const climaxScenes = analysis.analysis.scenes.filter(s => s.sceneType === SceneType.CLIMAX);
    if (climaxScenes.length === 0) {
      recommendations.push({
        type: 'scene',
        priority: 'high',
        description: 'Ensure your script has a clear climax scene',
        suggestion: 'Add a scene with maximum tension and conflict resolution'
      });
    }

    return recommendations;
  }

  private generateDialogueRecommendations(analysis: ScriptAnalysis): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    const conflictLines = analysis.analysis.dialogues.filter(d => d.dialogueType === DialogueType.CONFLICT);
    if (conflictLines.length === 0) {
      recommendations.push({
        type: 'dialogue',
        priority: 'medium',
        description: 'Add more conflict-driven dialogue',
        suggestion: 'Include arguments, disagreements, or tense exchanges'
      });
    }

    return recommendations;
  }

  // Storage methods
  private async loadAnalyses(): Promise<void> {
    try {
      const saved = localStorage.getItem('ai_script_analyses');
      if (saved) {
        const analyses = JSON.parse(saved);
        analyses.forEach((analysis: unknown) => {
          this.analyses.set(analysis.id, {
            ...analysis,
            createdAt: new Date(analysis.createdAt),
            updatedAt: new Date(analysis.updatedAt)
          });
        });
      }
    } catch (error) {
      console.error('Failed to load analyses:', error);
    }
  }

  private async saveAnalyses(): Promise<void> {
    try {
      const analyses = Array.from(this.analyses.values());
      localStorage.setItem('ai_script_analyses', JSON.stringify(analyses));
    } catch (error) {
      console.error('Failed to save analyses:', error);
    }
  }

  private convertToXML(analysis: ScriptAnalysis): string {
    return `<script_analysis id="${analysis.id}">
  <title>${analysis.title}</title>
  <metrics>
    <total_scenes>${analysis.analysis.metrics.totalScenes}</total_scenes>
    <total_characters>${analysis.analysis.metrics.totalCharacters}</total_characters>
    <quality_score>${analysis.analysis.qualityScore}</quality_score>
  </metrics>
</script_analysis>`;
  }

  /**
   * Convert analysis to PDF-friendly format
   * Returns a structured text representation that can be used with PDF libraries
   */
  private convertToPDF(analysis: ScriptAnalysis): string {
    const lines = [
      '================================',
      '     SCRIPT ANALYSIS REPORT     ',
      '================================',
      '',
      `ID: ${analysis.id}`,
      `Title: ${analysis.title}`,
      '',
      '--- METRICS ---',
      `Total Scenes: ${analysis.analysis.metrics.totalScenes}`,
      `Total Characters: ${analysis.analysis.metrics.totalCharacters}`,
      `Total Dialogue Lines: ${analysis.analysis.metrics.totalDialogueLines}`,
      `Average Scene Length: ${analysis.analysis.metrics.averageSceneLength.toFixed(1)} pages`,
      `Quality Score: ${(analysis.analysis.qualityScore * 100).toFixed(1)}%`,
      '',
      '--- CHARACTERS ---',
      ...analysis.analysis.characters.slice(0, 10).map((char, i) => 
        `${i + 1}. ${char.name} (${char.role}) - ${char.dialogueCount} dialogues`
      ),
      '',
      '--- SCENES ---',
      ...analysis.analysis.scenes.slice(0, 10).map((scene, i) => 
        `${i + 1}. Scene ${scene.sceneNumber}: ${scene.location} (${scene.sceneType})`
      ),
      '',
      '--- STORY STRUCTURE ---',
      `Acts: ${analysis.analysis.storyStructure.acts.length}`,
      `Plot Points: ${analysis.analysis.storyStructure.plotPoints.length}`,
      '',
      '--- RECOMMENDATIONS ---',
      ...analysis.analysis.recommendations.map(rec => `• ${rec}`),
      '',
      `Created: ${analysis.createdAt.toISOString()}`,
      `Updated: ${analysis.updatedAt.toISOString()}`,
      '================================'
    ];
    return lines.join('\n');
  }

  private parseXML(xml: string): unknown {
    // Parse XML script analysis data
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parse error: ${parseError.textContent}`);
      }

      const analysisElement = doc.querySelector('script_analysis');
      if (!analysisElement) {
        throw new Error('Invalid script analysis XML: missing script_analysis root element');
      }

      const id = analysisElement.getAttribute('id') || '';
      const title = analysisElement.querySelector('title')?.textContent || '';
      const totalScenes = parseInt(analysisElement.querySelector('total_scenes')?.textContent || '0', 10);
      const totalCharacters = parseInt(analysisElement.querySelector('total_characters')?.textContent || '0', 10);
      const qualityScore = parseFloat(analysisElement.querySelector('quality_score')?.textContent || '0');

      // Return a partial analysis object that can be merged
      return {
        id,
        title,
        content: '',
        analysis: {
          characters: [],
          scenes: [],
          dialogues: [],
          storyStructure: {
            acts: [],
            plotPoints: [],
            pacingAnalysis: {},
            tensionCurve: [],
            characterDevelopment: {}
          },
          metrics: {
            totalScenes,
            totalCharacters,
            totalDialogues: 0,
            totalPages: 0,
            averageSceneLength: 0,
            averageDialogueLength: 0,
            emotionalIntensity: 0,
            pacingScore: 0
          },
          recommendations: [],
          qualityScore
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AIScriptAnalysisService] Failed to parse XML:', error);
      throw new Error(`Failed to parse script analysis XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Type definitions for return values
interface CharacterSummary {
  protagonistCount: number;
  antagonistCount: number;
  supportingCount: number;
  averageScreenTime: number;
  emotionalDiversity: number;
  relationshipComplexity: number;
}

interface SceneSummary {
  totalScenes: number;
  expositionScenes: number;
  risingActionScenes: number;
  climaxScenes: number;
  fallingActionScenes: number;
  resolutionScenes: number;
  averageSceneDuration: number;
  averageConflictLevel: number;
}

interface DialogueSummary {
  totalLines: number;
  expositionLines: number;
  conflictLines: number;
  revelationLines: number;
  averageWordCount: number;
  averageSentiment: number;
  emotionalImpactScore: number;
}

interface Recommendation {
  type: 'character' | 'scene' | 'dialogue' | 'structure';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestion: string;
}

// Export singleton instance
export const aiScriptAnalysisService = new AIScriptAnalysisService();

// Export types for React hooks
export type { 
  ScriptAnalysis, ScriptAnalysisResult, CharacterAnalysis, SceneAnalysis, DialogueAnalysis,
  StoryStructure, ScriptMetrics, ScriptAnalysisConfig, CharacterSummary, SceneSummary,
  DialogueSummary, Recommendation 
};


