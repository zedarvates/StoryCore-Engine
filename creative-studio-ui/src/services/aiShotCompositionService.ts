/**
 * AI Shot Composition Service
 * 
 * Provides intelligent shot composition suggestions using the AI Shot Composition Engine.
 * Integrates with the existing service architecture and provides React hooks for UI integration.
 */

import { EventEmitter } from 'events';
import type { CompositionRule, ShotType, CameraMovement, LightingStyle, VisualBalance } from '../../src/ai_shot_composition_engine';

// Shot composition data types
export interface ShotComposition {
  id: string;
  sceneId: string;
  shotNumber: number;
  composition: ShotCompositionResult;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShotCompositionResult {
  shotType: ShotType;
  cameraMovement: CameraMovement;
  compositionRules: CompositionRule[];
  lightingStyle: LightingStyle;
  visualBalance: VisualBalance;
  suggestedSettings: CameraSettings;
  emotionalImpact: number;
  technicalScore: number;
  recommendations: string[];
  alternatives: ShotCompositionAlternative[];
}

export interface CameraSettings {
  focalLength: number;
  aperture: number;
  shutterSpeed: number;
  iso: number;
  whiteBalance: string;
  focusDistance: number;
  depthOfField: number;
}

export interface ShotCompositionAlternative {
  shotType: ShotType;
  cameraMovement: CameraMovement;
  compositionRules: CompositionRule[];
  lightingStyle: LightingStyle;
  emotionalImpact: number;
  technicalScore: number;
  reason: string;
}

export interface ShotCompositionConfig {
  sceneContext: string;
  emotionalTone: string;
  characterEmotion: string;
  timeOfDay: string;
  locationType: string;
  budgetConstraints: 'low' | 'medium' | 'high';
  technicalComplexity: 'simple' | 'moderate' | 'complex';
  artisticStyle: string;
  targetPlatform: string;
}

export interface CompositionAnalysis {
  ruleCompliance: Record<CompositionRule, boolean>;
  balanceScore: number;
  visualFlow: number;
  focalPointEffectiveness: number;
  depthUtilization: number;
  movementDynamics: number;
  lightingHarmony: number;
}

// Service events
export interface ShotCompositionServiceEvents {
  'composition:started': (shotId: string) => void;
  'composition:analyzed': (shotId: string, analysis: CompositionAnalysis) => void;
  'composition:completed': (composition: ShotComposition) => void;
  'composition:failed': (shotId: string, error: string) => void;
  'alternatives:generated': (shotId: string, alternatives: ShotCompositionAlternative[]) => void;
}

class AIShotCompositionService extends EventEmitter {
  private compositions: Map<string, ShotComposition> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    super();
  }

  /**
   * Initialize the shot composition service
   */
  async initialize(): Promise<boolean> {
    try {
      // Load compositions from storage
      await this.loadCompositions();
      this.isInitialized = true;
      console.log('AI Shot Composition Service initialized');
      return true;
    } catch (error) {
      console.error('Failed to initialize AI Shot Composition Service:', error);
      return false;
    }
  }

  /**
   * Generate shot composition using AI
   */
  async generateComposition(
    sceneId: string, 
    shotNumber: number, 
    config: ShotCompositionConfig
  ): Promise<ShotComposition> {
    if (!this.isInitialized) {
      throw new Error('Shot composition service not initialized');
    }

    const shotId = `shot_${sceneId}_${shotNumber}_${Date.now()}`;
    
    try {
      // Emit composition started event
      this.emit('composition:started', shotId);

      // Simulate AI composition generation with progress updates
      const composition = await this.simulateCompositionGeneration(shotId, config);
      
      // Store composition
      this.compositions.set(shotId, composition);
      await this.saveCompositions();
      
      // Emit completion event
      this.emit('composition:completed', composition);
      
      return composition;
    } catch (error) {
      console.error('Failed to generate shot composition:', error);
      this.emit('composition:failed', shotId, error.message);
      throw error;
    }
  }

  /**
   * Get composition by ID
   */
  getComposition(id: string): ShotComposition | undefined {
    return this.compositions.get(id);
  }

  /**
   * Get all compositions for a scene
   */
  getSceneCompositions(sceneId: string): ShotComposition[] {
    return Array.from(this.compositions.values()).filter(c => c.sceneId === sceneId);
  }

  /**
   * Get all compositions
   */
  getAllCompositions(): ShotComposition[] {
    return Array.from(this.compositions.values());
  }

  /**
   * Analyze existing composition
   */
  async analyzeComposition(shotId: string): Promise<CompositionAnalysis> {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    const analysis = await this.simulateCompositionAnalysis(composition);
    this.emit('composition:analyzed', shotId, analysis);
    return analysis;
  }

  /**
   * Generate alternative compositions
   */
  async generateAlternatives(
    shotId: string, 
    config: Partial<ShotCompositionConfig>
  ): Promise<ShotCompositionAlternative[]> {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    const alternatives = await this.simulateAlternativeGeneration(composition, config);
    this.emit('alternatives:generated', shotId, alternatives);
    return alternatives;
  }

  /**
   * Update composition settings
   */
  async updateComposition(
    shotId: string, 
    settings: Partial<CameraSettings>
  ): Promise<ShotComposition> {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    composition.composition.suggestedSettings = {
      ...composition.composition.suggestedSettings,
      ...settings
    };
    composition.updatedAt = new Date();

    await this.saveCompositions();
    this.emit('composition:completed', composition);
    return composition;
  }

  /**
   * Get composition recommendations
   */
  getCompositionRecommendations(shotId: string): string[] {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    return composition.composition.recommendations;
  }

  /**
   * Calculate composition score
   */
  calculateCompositionScore(shotId: string): number {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    return (composition.composition.emotionalImpact + composition.composition.technicalScore) / 2;
  }

  /**
   * Export composition
   */
  exportComposition(shotId: string, format: 'json' | 'xml' | 'pdf' = 'json'): string {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    if (format === 'json') {
      return JSON.stringify(composition, null, 2);
    } else if (format === 'xml') {
      return this.convertToXML(composition);
    } else {
      // PDF export - generate a formatted text representation
      // In a browser environment, this would typically use a PDF library like jsPDF
      // For now, we return a structured text format that can be converted to PDF
      return this.convertToPDF(composition);
    }
  }

  /**
   * Import composition
   */
  async importComposition(data: string, format: 'json' | 'xml' = 'json'): Promise<ShotComposition> {
    let compositionData: unknown;

    if (format === 'json') {
      compositionData = JSON.parse(data);
    } else {
      compositionData = this.parseXML(data);
    }

    const composition: ShotComposition = {
      ...compositionData,
      createdAt: new Date(compositionData.createdAt),
      updatedAt: new Date(compositionData.updatedAt)
    };

    this.compositions.set(composition.id, composition);
    await this.saveCompositions();
    
    return composition;
  }

  /**
   * Delete composition
   */
  async deleteComposition(shotId: string): Promise<void> {
    const composition = this.compositions.get(shotId);
    if (!composition) {
      throw new Error('Composition not found');
    }

    this.compositions.delete(shotId);
    await this.saveCompositions();
  }

  // Private methods

  private async simulateCompositionGeneration(
    shotId: string, 
    config: ShotCompositionConfig
  ): Promise<ShotComposition> {
    // Simulate AI generation with progress updates
    const totalSteps = 8;
    
    for (let i = 1; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 150));
      const progress = (i / totalSteps) * 100;
      // Note: progress events would be emitted here in a real implementation
    }

    // Generate mock composition result
    const shotType = this.selectShotType(config);
    const cameraMovement = this.selectCameraMovement(config);
    const compositionRules = this.selectCompositionRules(config);
    const lightingStyle = this.selectLightingStyle(config);
    const visualBalance = this.calculateVisualBalance(compositionRules);

    return {
      id: shotId,
      sceneId: config.sceneContext,
      shotNumber: 1,
      composition: {
        shotType,
        cameraMovement,
        compositionRules,
        lightingStyle,
        visualBalance,
        suggestedSettings: this.generateCameraSettings(shotType, lightingStyle),
        emotionalImpact: Math.random() * 0.4 + 0.5,
        technicalScore: Math.random() * 0.3 + 0.6,
        recommendations: this.generateRecommendations(shotType, cameraMovement, lightingStyle),
        alternatives: this.generateAlternatives(shotType, cameraMovement, config)
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private async simulateCompositionAnalysis(
    composition: ShotComposition
  ): Promise<CompositionAnalysis> {
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const ruleCompliance: Record<CompositionRule, boolean> = {};
    composition.composition.compositionRules.forEach(rule => {
      ruleCompliance[rule] = Math.random() > 0.3; // 70% compliance rate
    });

    return {
      ruleCompliance,
      balanceScore: Math.random() * 0.4 + 0.5,
      visualFlow: Math.random() * 0.3 + 0.6,
      focalPointEffectiveness: Math.random() * 0.5 + 0.4,
      depthUtilization: Math.random() * 0.4 + 0.5,
      movementDynamics: Math.random() * 0.3 + 0.6,
      lightingHarmony: Math.random() * 0.4 + 0.5
    };
  }

  private async simulateAlternativeGeneration(
    composition: ShotComposition, 
    config: Partial<ShotCompositionConfig>
  ): Promise<ShotCompositionAlternative[]> {
    // Simulate alternative generation delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const alternatives: ShotCompositionAlternative[] = [];

    // Generate 3 alternatives
    for (let i = 0; i < 3; i++) {
      alternatives.push({
        shotType: this.selectAlternativeShotType(composition.composition.shotType),
        cameraMovement: this.selectAlternativeCameraMovement(composition.composition.cameraMovement),
        compositionRules: this.selectAlternativeCompositionRules(composition.composition.compositionRules),
        lightingStyle: this.selectAlternativeLightingStyle(composition.composition.lightingStyle),
        emotionalImpact: Math.random() * 0.4 + 0.5,
        technicalScore: Math.random() * 0.3 + 0.6,
        reason: this.generateAlternativeReason(i)
      });
    }

    return alternatives;
  }

  private selectShotType(config: ShotCompositionConfig): ShotType {
    const emotionalTone = config.emotionalTone.toLowerCase();
    
    if (emotionalTone.includes('intense') || emotionalTone.includes('dramatic')) {
      return ShotType.CLOSE_UP;
    } else if (emotionalTone.includes('epic') || emotionalTone.includes('grand')) {
      return ShotType.WIDE_SHOT;
    } else if (emotionalTone.includes('intimate') || emotionalTone.includes('personal')) {
      return ShotType.MEDIUM_SHOT;
    } else {
      return ShotType.MEDIUM_CLOSE_UP;
    }
  }

  private selectCameraMovement(config: ShotCompositionConfig): CameraMovement {
    const sceneContext = config.sceneContext.toLowerCase();
    
    if (sceneContext.includes('action') || sceneContext.includes('chase')) {
      return CameraMovement.DOLLY;
    } else if (sceneContext.includes('reveal') || sceneContext.includes('discovery')) {
      return CameraMovement.PAN;
    } else if (sceneContext.includes('tension') || sceneContext.includes('suspense')) {
      return CameraMovement.STEADICAM;
    } else {
      return CameraMovement.STATIC;
    }
  }

  private selectCompositionRules(config: ShotCompositionConfig): CompositionRule[] {
    const rules: CompositionRule[] = [];
    
    // Always include rule of thirds for basic composition
    rules.push(CompositionRule.RULE_OF_THIRDS);
    
    if (config.artisticStyle.includes('symmetrical')) {
      rules.push(CompositionRule.SYMMETRICAL_BALANCE);
    }
    
    if (config.timeOfDay === 'golden hour') {
      rules.push(CompositionRule.GOLDEN_RATIO);
    }
    
    if (config.locationType.includes('architecture')) {
      rules.push(CompositionRule.LEADING_LINES);
    }
    
    return rules;
  }

  private selectLightingStyle(config: ShotCompositionConfig): LightingStyle {
    const timeOfDay = config.timeOfDay.toLowerCase();
    
    if (timeOfDay.includes('night') || timeOfDay.includes('dark')) {
      return LightingStyle.LOW_KEY;
    } else if (timeOfDay.includes('day') || timeOfDay.includes('bright')) {
      return LightingStyle.HIGH_KEY;
    } else if (config.emotionalTone.includes('dramatic') || config.emotionalTone.includes('mysterious')) {
      return LightingStyle.CHIAOSCURO;
    } else {
      return LightingStyle.NATURAL;
    }
  }

  private calculateVisualBalance(rules: CompositionRule[]): VisualBalance {
    let balanceScore = 0.5;
    
    rules.forEach(rule => {
      switch (rule) {
        case CompositionRule.RULE_OF_THIRDS:
          balanceScore += 0.2;
          break;
        case CompositionRule.SYMMETRICAL_BALANCE:
          balanceScore += 0.3;
          break;
        case CompositionRule.GOLDEN_RATIO:
          balanceScore += 0.25;
          break;
        case CompositionRule.LEADING_LINES:
          balanceScore += 0.15;
          break;
      }
    });
    
    return {
      horizontalBalance: Math.min(1.0, balanceScore),
      verticalBalance: Math.min(1.0, balanceScore - 0.1),
      depthBalance: Math.min(1.0, balanceScore - 0.05),
      overallBalance: balanceScore
    };
  }

  private generateCameraSettings(shotType: ShotType, lightingStyle: LightingStyle): CameraSettings {
    const baseSettings: CameraSettings = {
      focalLength: 50,
      aperture: 2.8,
      shutterSpeed: 1/125,
      iso: 400,
      whiteBalance: 'daylight',
      focusDistance: 10,
      depthOfField: 0.5
    };

    // Adjust settings based on shot type
    switch (shotType) {
      case ShotType.CLOSE_UP:
        baseSettings.focalLength = 85;
        baseSettings.aperture = 1.8;
        baseSettings.depthOfField = 0.2;
        break;
      case ShotType.WIDE_SHOT:
        baseSettings.focalLength = 24;
        baseSettings.aperture = 8.0;
        baseSettings.depthOfField = 0.8;
        break;
      case ShotType.MEDIUM_SHOT:
        baseSettings.focalLength = 50;
        baseSettings.aperture = 4.0;
        baseSettings.depthOfField = 0.4;
        break;
    }

    // Adjust settings based on lighting
    switch (lightingStyle) {
      case LightingStyle.LOW_KEY:
        baseSettings.iso = 800;
        baseSettings.aperture = 2.0;
        break;
      case LightingStyle.HIGH_KEY:
        baseSettings.iso = 200;
        baseSettings.aperture = 5.6;
        break;
      case LightingStyle.CHIAOSCURO:
        baseSettings.iso = 400;
        baseSettings.aperture = 2.8;
        break;
    }

    return baseSettings;
  }

  private generateRecommendations(
    shotType: ShotType, 
    cameraMovement: CameraMovement, 
    lightingStyle: LightingStyle
  ): string[] {
    const recommendations: string[] = [];

    if (shotType === ShotType.CLOSE_UP) {
      recommendations.push('Use shallow depth of field to isolate subject');
      recommendations.push('Pay attention to eye contact and facial expressions');
    }

    if (cameraMovement === CameraMovement.DOLLY) {
      recommendations.push('Ensure smooth dolly movement for professional look');
      recommendations.push('Consider dolly zoom for dramatic effect');
    }

    if (lightingStyle === LightingStyle.LOW_KEY) {
      recommendations.push('Use precise lighting control to maintain contrast');
      recommendations.push('Consider rim lighting for subject separation');
    }

    recommendations.push('Monitor exposure to avoid blown highlights or crushed shadows');
    recommendations.push('Use focus puller for precise focus transitions');

    return recommendations;
  }

  private generateAlternatives(
    shotType: ShotType, 
    cameraMovement: CameraMovement, 
    config: ShotCompositionConfig
  ): ShotCompositionAlternative[] {
    const alternatives: ShotCompositionAlternative[] = [];

    // Alternative 1: Different shot type
    const altShotType = shotType === ShotType.CLOSE_UP ? ShotType.MEDIUM_SHOT : ShotType.CLOSE_UP;
    alternatives.push({
      shotType: altShotType,
      cameraMovement,
      compositionRules: [CompositionRule.RULE_OF_THIRDS],
      lightingStyle: LightingStyle.NATURAL,
      emotionalImpact: 0.6,
      technicalScore: 0.7,
      reason: 'Alternative framing for different narrative emphasis'
    });

    // Alternative 2: Different camera movement
    const altMovement = cameraMovement === CameraMovement.STATIC ? CameraMovement.PAN : CameraMovement.STATIC;
    alternatives.push({
      shotType,
      cameraMovement: altMovement,
      compositionRules: [CompositionRule.GOLDEN_RATIO],
      lightingStyle: LightingStyle.HIGH_KEY,
      emotionalImpact: 0.5,
      technicalScore: 0.8,
      reason: 'Static vs moving camera for different pacing'
    });

    // Alternative 3: Different lighting
    const altLighting = config.timeOfDay === 'day' ? LightingStyle.LOW_KEY : LightingStyle.HIGH_KEY;
    alternatives.push({
      shotType,
      cameraMovement,
      compositionRules: [CompositionRule.SYMMETRICAL_BALANCE],
      lightingStyle: altLighting,
      emotionalImpact: 0.7,
      technicalScore: 0.6,
      reason: 'Different lighting mood and atmosphere'
    });

    return alternatives;
  }

  private selectAlternativeShotType(currentType: ShotType): ShotType {
    const types = Object.values(ShotType);
    const currentIndex = types.indexOf(currentType);
    const nextIndex = (currentIndex + 1) % types.length;
    return types[nextIndex];
  }

  private selectAlternativeCameraMovement(currentMovement: CameraMovement): CameraMovement {
    const movements = Object.values(CameraMovement);
    const currentIndex = movements.indexOf(currentMovement);
    const nextIndex = (currentIndex + 1) % movements.length;
    return movements[nextIndex];
  }

  private selectAlternativeCompositionRules(currentRules: CompositionRule[]): CompositionRule[] {
    const allRules = Object.values(CompositionRule);
    const randomRule = allRules[Math.floor(Math.random() * allRules.length)];
    return [randomRule];
  }

  private selectAlternativeLightingStyle(currentStyle: LightingStyle): LightingStyle {
    const styles = Object.values(LightingStyle);
    const currentIndex = styles.indexOf(currentStyle);
    const nextIndex = (currentIndex + 1) % styles.length;
    return styles[nextIndex];
  }

  private generateAlternativeReason(index: number): string {
    const reasons = [
      'Different narrative perspective',
      'Alternative technical approach',
      'Creative variation for director',
      'Budget-friendly option',
      'Technical simplicity'
    ];
    return reasons[index % reasons.length];
  }

  // Storage methods
  private async loadCompositions(): Promise<void> {
    try {
      const saved = localStorage.getItem('ai_shot_compositions');
      if (saved) {
        const compositions = JSON.parse(saved);
        compositions.forEach((composition: unknown) => {
          this.compositions.set(composition.id, {
            ...composition,
            createdAt: new Date(composition.createdAt),
            updatedAt: new Date(composition.updatedAt)
          });
        });
      }
    } catch (error) {
      console.error('Failed to load compositions:', error);
    }
  }

  private async saveCompositions(): Promise<void> {
    try {
      const compositions = Array.from(this.compositions.values());
      localStorage.setItem('ai_shot_compositions', JSON.stringify(compositions));
    } catch (error) {
      console.error('Failed to save compositions:', error);
    }
  }

  private convertToXML(composition: ShotComposition): string {
    return `<shot_composition id="${composition.id}">
  <scene_id>${composition.sceneId}</scene_id>
  <shot_type>${composition.composition.shotType}</shot_type>
  <camera_movement>${composition.composition.cameraMovement}</camera_movement>
  <emotional_impact>${composition.composition.emotionalImpact}</emotional_impact>
</shot_composition>`;
  }

  /**
   * Convert composition to PDF-friendly format
   * Returns a structured text representation that can be used with PDF libraries
   */
  private convertToPDF(composition: ShotComposition): string {
    const lines = [
      '================================',
      '     SHOT COMPOSITION REPORT    ',
      '================================',
      '',
      `ID: ${composition.id}`,
      `Scene ID: ${composition.sceneId}`,
      `Shot Number: ${composition.shotNumber}`,
      '',
      '--- COMPOSITION DETAILS ---',
      `Shot Type: ${composition.composition.shotType}`,
      `Camera Movement: ${composition.composition.cameraMovement}`,
      `Lighting Style: ${composition.composition.lightingStyle}`,
      '',
      '--- CAMERA SETTINGS ---',
      `Focal Length: ${composition.composition.suggestedSettings.focalLength}mm`,
      `Aperture: f/${composition.composition.suggestedSettings.aperture}`,
      `Shutter Speed: 1/${composition.composition.suggestedSettings.shutterSpeed}s`,
      `ISO: ${composition.composition.suggestedSettings.iso}`,
      `White Balance: ${composition.composition.suggestedSettings.whiteBalance}`,
      '',
      '--- SCORES ---',
      `Emotional Impact: ${(composition.composition.emotionalImpact * 100).toFixed(1)}%`,
      `Technical Score: ${(composition.composition.technicalScore * 100).toFixed(1)}%`,
      '',
      '--- COMPOSITION RULES ---',
      ...composition.composition.compositionRules.map(rule => `• ${rule}`),
      '',
      '--- RECOMMENDATIONS ---',
      ...composition.composition.recommendations.map(rec => `• ${rec}`),
      '',
      '--- ALTERNATIVES ---',
      ...composition.composition.alternatives.map((alt, i) => 
        `${i + 1}. ${alt.shotType} - ${alt.reason}`
      ),
      '',
      `Created: ${composition.createdAt.toISOString()}`,
      `Updated: ${composition.updatedAt.toISOString()}`,
      '================================'
    ];
    return lines.join('\n');
  }

  private parseXML(xml: string): unknown {
    // Parse XML composition data
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml, 'text/xml');
      
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        throw new Error(`XML parse error: ${parseError.textContent}`);
      }

      const compositionElement = doc.querySelector('shot_composition');
      if (!compositionElement) {
        throw new Error('Invalid composition XML: missing shot_composition root element');
      }

      const id = compositionElement.getAttribute('id') || '';
      const sceneId = compositionElement.querySelector('scene_id')?.textContent || '';
      const shotType = compositionElement.querySelector('shot_type')?.textContent || '';
      const cameraMovement = compositionElement.querySelector('camera_movement')?.textContent || '';
      const emotionalImpact = parseFloat(compositionElement.querySelector('emotional_impact')?.textContent || '0');

      // Return a partial composition object that can be merged
      return {
        id,
        sceneId,
        shotNumber: 0,
        composition: {
          shotType,
          cameraMovement,
          emotionalImpact,
          technicalScore: 0,
          compositionRules: [],
          lightingStyle: 'natural',
          visualBalance: { balance: 0.5, symmetry: 0.5, depth: 0.5 },
          suggestedSettings: {
            focalLength: 50,
            aperture: 2.8,
            shutterSpeed: 125,
            iso: 400,
            whiteBalance: 'daylight',
            focusDistance: 3,
            depthOfField: 0.5
          },
          recommendations: [],
          alternatives: []
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('[AIShotCompositionService] Failed to parse XML:', error);
      throw new Error(`Failed to parse composition XML: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const aiShotCompositionService = new AIShotCompositionService();

// Export types for React hooks
export type { 
  ShotComposition, ShotCompositionResult, CameraSettings, ShotCompositionAlternative,
  ShotCompositionConfig, CompositionAnalysis 
};


