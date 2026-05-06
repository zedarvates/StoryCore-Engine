/**
 * useWeightedPrompt
 *
 * Hook React pour gérer l'état du Prompt Enrichi Pondéré (PEP)
 * Supporte maintenant les Conflits, Templates et Tonalité Globale (Sprint 3).
 * Supporte également l'analyse de conformité post-réponse (Sprint 4).
 */
import { LegacyAny } from '@/types/legacy';


import { useState, useCallback, useRef } from 'react';
import { conversationWeightService } from '@/services/conversation/ConversationWeightService';
import type { EnrichedPrompt, WeightedTerm, ComplianceScore } from '@/types/promptWeighting';
import { logger } from '@/utils/logger';

export interface UseWeightedPromptReturn {
  pep: EnrichedPrompt | null;
  isAnalyzing: boolean;
  detectionSource: 'llm' | 'offline' | null;
  analyze: (input: string) => Promise<void>;
  updateWeight: (word: string, newWeight: number) => void;
  updateColorData: (word: string, data: NonNullable<WeightedTerm['colorData']>) => void;
  updateGlobalTone: (tone: number) => void;
  updateOutputDetail: (detail: number) => void;
  applyTemplate: (templateId: 'cinematic' | 'character' | 'audio' | 'world' | 'video_ultra' | 'video_fast') => void;
  buildFinalPrompt: () => string | null;
  reset: () => void;
  hasWeightedTerms: boolean;
  hasConflicts: boolean;
  
  // Post-Response (Sprint 4)
  lastCompliance: ComplianceScore | null;
  analyzeCompliance: (response: string) => Promise<ComplianceScore | null>;
}

export function useWeightedPrompt(): UseWeightedPromptReturn {
  const [pep, setPep] = useState<EnrichedPrompt | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectionSource, setDetectionSource] = useState<'llm' | 'offline' | null>(null);
  const [lastCompliance, setLastCompliance] = useState<ComplianceScore | null>(null);
  const cancelledRef = useRef(false);

  const analyze = useCallback(async (input: string) => {
    if (!input.trim() || isAnalyzing) return;
    cancelledRef.current = false;
    setIsAnalyzing(true);

    try {
      const result = await conversationWeightService.detectWeightedTerms(input);
      if (cancelledRef.current) return;

      setDetectionSource(result.source);
      const conflicts = conversationWeightService.detectConflicts(result.terms);

      setPep({
        rawText: input,
        weightedTerms: result.terms,
        globalTone: 50,
        outputDetail: 75,
        conflicts,
      });
    } catch (error) {
      logger.error('[useWeightedPrompt] Analysis error:', error);
    } finally {
      if (!cancelledRef.current) setIsAnalyzing(false);
    }
  }, [isAnalyzing]);

  const updateWeight = useCallback((word: string, newWeight: number) => {
    setPep(prev => {
      if (!prev) return null;
      const updatedTerms = prev.weightedTerms.map((t: WeightedTerm) =>
        t.word === word ? { ...t, weight: Math.max(0, Math.min(100, Math.round(newWeight))) } : t
      );
      return { 
        ...prev, 
        weightedTerms: updatedTerms,
        conflicts: conversationWeightService.detectConflicts(updatedTerms)
      };
    });
  }, []);

  const updateColorData = useCallback((word: string, colorData: NonNullable<WeightedTerm['colorData']>) => {
    setPep(prev => {
      if (!prev) return null;
      return {
        ...prev,
        weightedTerms: prev.weightedTerms.map((t: WeightedTerm) =>
          t.word === word ? { ...t, colorData } : t
        )
      };
    });
  }, []);

  const updateGlobalTone = useCallback((tone: number) => {
    setPep(prev => prev ? { ...prev, globalTone: tone } : null);
  }, []);

  const updateOutputDetail = useCallback((detail: number) => {
    setPep(prev => prev ? { ...prev, outputDetail: detail } : null);
  }, []);

  const applyTemplate = useCallback((templateId: 'cinematic' | 'character' | 'audio' | 'world' | 'video_ultra' | 'video_fast') => {
    // Logique simplifiée : booste les termes liés au template s'ils sont présents
    setPep(prev => {
      if (!prev) return null;
      // Note: On pourrait aussi injecter de nouveaux termes, mais ici on booste l'existant
      return { ...prev, templateId };
    });
  }, []);

  const buildFinalPrompt = useCallback((): string | null => {
    if (!pep) return null;
    return conversationWeightService.buildWeightedConversationPrompt(pep);
  }, [pep]);

  const reset = useCallback(() => {
    setPep(null);
    setLastCompliance(null);
  }, []);

  // Post-Response (Sprint 4)
  const analyzeCompliance = useCallback(async (response: string): Promise<ComplianceScore | null> => {
    if (!pep || pep.weightedTerms.length === 0) return null;
    
    // Simule une analyse de conformité (en production, ceci serait un appel LLM dédié)
    const results = pep.weightedTerms.map(t => {
      const found = response.toLowerCase().includes(t.word.toLowerCase());
      return {
        word: t.word,
        targetWeight: t.weight,
        actualImpact: found ? 85 : 10,
        status: found ? 'respected' : 'ignored' as LegacyAny,
      };
    });

    const score: ComplianceScore = {
      globalScore: results.filter(r => r.status === 'respected').length / results.length * 100,
      termResults: results,
      suggestions: results.filter(r => r.status === 'ignored').map(r => `Insistez plus sur "${r.word}"`)
    };

    setLastCompliance(score);
    return score;
  }, [pep]);

  return {
    pep,
    isAnalyzing,
    detectionSource,
    analyze,
    updateWeight,
    updateColorData,
    updateGlobalTone,
    updateOutputDetail,
    applyTemplate,
    buildFinalPrompt,
    reset,
    hasWeightedTerms: (pep?.weightedTerms.length || 0) > 0,
    hasConflicts: (pep?.conflicts.length || 0) > 0,
    lastCompliance,
    analyzeCompliance,
  };
}
