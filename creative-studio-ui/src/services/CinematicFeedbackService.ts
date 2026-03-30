/**
 * Cinematic Feedback Service
 * 
 * Provides AI-driven directorial recommendations, tension metrics, and pacing analysis.
 * Based on March 2026 Production Roadmap (Phase 4).
 */

export interface CinematicMetric {
  label: string;
  value: number; // 0 to 100
  status: 'optimal' | 'warning' | 'critical';
  feedback: string;
}

export interface TensionPoint {
  shotId: string;
  time: number;
  tension: number; // 0.0 to 1.0
}

export interface DirectorialRecommendation {
  id: string;
  category: 'pacing' | 'composition' | 'lighting' | 'narrative';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestion: string;
  actionLabel?: string;
}

export interface CinematicAuditReport {
  overallScore: number;
  metrics: CinematicMetric[];
  tensionCurve: TensionPoint[];
  recommendations: DirectorialRecommendation[];
}

export class CinematicFeedbackService {
  private static instance: CinematicFeedbackService;

  public static getInstance() {
    if (!CinematicFeedbackService.instance) {
      CinematicFeedbackService.instance = new CinematicFeedbackService();
    }
    return CinematicFeedbackService.instance;
  }

  /**
   * Performs a comprehensive cinematic audit of a sequence
   */
  public analyzeSequence(shots: any[], genre: string = 'action'): CinematicAuditReport {
    const metrics: CinematicMetric[] = [];
    const recommendations: DirectorialRecommendation[] = [];
    const tensionCurve: TensionPoint[] = [];

    // 1. Pacing Analysis
    const avgDuration = shots.reduce((acc, s) => acc + (s.duration || 5), 0) / (shots.length || 1);
    const pacingScore = this.calculatePacingScore(avgDuration, genre);
    metrics.push({
      label: 'Cinematic Pacing',
      value: pacingScore,
      status: pacingScore < 40 ? 'critical' : pacingScore < 70 ? 'warning' : 'optimal',
      feedback: pacingScore < 50 ? 'Rythme trop lent pour le genre sÃ©lectionnÃ©.' : 'Le rythme est bien équilibré.'
    });

    if (pacingScore < 60) {
      recommendations.push({
        id: 'rec_pacing_01',
        category: 'pacing',
        priority: 'high',
        message: 'Progression narrative stagnante.',
        suggestion: 'RÃ©duisez la durÃ©e des plans de transition pour augmenter la tension.',
        actionLabel: 'Compresser la Timeline'
      });
    }

    // 2. Shot Variety Analysis
    const shotTypes = shots.map(s => s.metadata?.cameraAngle || 'Medium');
    const varietyScore = this.calculateVarietyScore(shotTypes);
    metrics.push({
      label: 'Shot Variety',
      value: varietyScore,
      status: varietyScore < 50 ? 'warning' : 'optimal',
      feedback: varietyScore < 60 ? 'Trop de rÃ©pÃ©tition dans les angles de camÃ©ra.' : 'Excellente alternance des plans.'
    });

    if (varietyScore < 60) {
      recommendations.push({
        id: 'rec_variety_01',
        category: 'composition',
        priority: 'medium',
        message: 'Monotonie visuelle dÃ©tectÃ©e.',
        suggestion: 'Alternez entre Plans Larges et Gros Plans pour dynamiser la mise en scÃ¨ne.',
        actionLabel: 'Randomiser les Angles'
      });
    }

    // 3. Tension Curve Generation
    let currentTime = 0;
    shots.forEach((shot, i) => {
      const tension = this.calculateShotTension(shot, i, shots.length);
      tensionCurve.push({
        shotId: shot.id,
        time: currentTime,
        tension
      });
      currentTime += shot.duration || 5;
    });

    return {
      overallScore: Math.round((pacingScore + varietyScore) / 2),
      metrics,
      tensionCurve,
      recommendations
    };
  }

  private calculatePacingScore(avg: number, genre: string): number {
    if (genre === 'action') {
      return avg <= 3 ? 100 : avg <= 6 ? 70 : 40;
    }
    return avg >= 4 && avg <= 8 ? 100 : 60;
  }

  private calculateVarietyScore(types: string[]): number {
    if (types.length < 2) return 100;
    let repeats = 0;
    for (let i = 1; i < types.length; i++) {
      if (types[i] === types[i-1]) repeats++;
    }
    return Math.max(0, 100 - (repeats * 20));
  }

  private calculateShotTension(shot: any, index: number, total: number): number {
    // Basic model: tension increases towards the end of a sequence
    const baseline = (index / total) * 0.7;
    const typeModifier = shot.metadata?.cameraAngle === 'Close Up' ? 0.3 : 0.1;
    return Math.min(1.0, baseline + typeModifier);
  }
}

export const cinematicFeedbackService = CinematicFeedbackService.getInstance();
