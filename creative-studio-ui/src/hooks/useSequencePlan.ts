/**
 * React Hook for Sequence Plan Service
 * 
 * Provides real-time synchronization with SequencePlanService
 * using the Observer pattern.
 */

import { useState, useEffect, useCallback } from 'react';
import { sequencePlanService, type SequencePlanData } from '@/services/sequencePlanService';
import type { SequencePlan } from '@/types/sequencePlan';

// ============================================================================
// Hook: useSequencePlan
// ============================================================================

export interface UseSequencePlanReturn {
  plans: SequencePlan[];
  currentPlan: SequencePlanData | null;
  isAutoSaveEnabled: boolean;
  lastSaveTime: number | null;
  loadPlan: (planId: string) => Promise<void>;
  createPlan: (name: string, description?: string) => Promise<SequencePlanData>;
  updatePlan: (planId: string, updates: Partial<SequencePlanData>) => Promise<SequencePlanData>;
  deletePlan: (planId: string) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<SequencePlanData>;
  refresh: () => Promise<void>;
}

/**
 * Hook for managing sequence plans with real-time synchronization
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { plans, currentPlan, loadPlan, createPlan } = useSequencePlan();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => createPlan('New Plan')}>Create</button>
 *       {plans.map(plan => (
 *         <div key={plan.id} onClick={() => loadPlan(plan.id)}>
 *           {plan.name}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSequencePlan(): UseSequencePlanReturn {
  const [plans, setPlans] = useState<SequencePlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<SequencePlanData | null>(null);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  // Load initial plans
  useEffect(() => {
    const loadInitialPlans = async () => {
      const initialPlans = await sequencePlanService.listSequencePlans();
      setPlans(initialPlans);
    };
    loadInitialPlans();
  }, []);

  // Subscribe to plan list updates
  useEffect(() => {
    const unsubscribe = sequencePlanService.subscribeToPlanList((updatedPlans) => {
      setPlans(updatedPlans);
    });

    return unsubscribe;
  }, []);

  // Subscribe to plan updates
  useEffect(() => {
    const unsubscribe = sequencePlanService.subscribeToPlanUpdates((planId, updatedPlan) => {
      
      // Update current plan if it's the one that changed
      if (currentPlan && currentPlan.id === planId) {
        setCurrentPlan(updatedPlan);
      }
    });

    return unsubscribe;
  }, [currentPlan]);

  // Subscribe to auto-save status
  useEffect(() => {
    const unsubscribe = sequencePlanService.subscribeToAutoSaveStatus((enabled, lastSave) => {
      setIsAutoSaveEnabled(enabled);
      setLastSaveTime(lastSave);
    });

    return unsubscribe;
  }, []);

  // Load a specific plan
  const loadPlan = useCallback(async (planId: string) => {
    const plan = await sequencePlanService.loadSequencePlan(planId);
    setCurrentPlan(plan);
  }, []);

  // Create a new plan
  const createPlan = useCallback(async (name: string, description?: string) => {
    const plan = await sequencePlanService.createSequencePlan(name, description);
    setCurrentPlan(plan);
    return plan;
  }, []);

  // Update a plan
  const updatePlan = useCallback(async (planId: string, updates: Partial<SequencePlanData>) => {
    const updatedPlan = await sequencePlanService.updateSequencePlan(planId, updates);
    return updatedPlan;
  }, []);

  // Delete a plan
  const deletePlan = useCallback(async (planId: string) => {
    await sequencePlanService.deleteSequencePlan(planId);
    
    // Clear current plan if it was deleted
    if (currentPlan && currentPlan.id === planId) {
      setCurrentPlan(null);
    }
  }, [currentPlan]);

  // Duplicate a plan
  const duplicatePlan = useCallback(async (planId: string) => {
    const duplicated = await sequencePlanService.duplicateSequencePlan(planId);
    return duplicated;
  }, []);

  // Refresh plans
  const refresh = useCallback(async () => {
    const updatedPlans = await sequencePlanService.listSequencePlans();
    setPlans(updatedPlans);
  }, []);

  return {
    plans,
    currentPlan,
    isAutoSaveEnabled,
    lastSaveTime,
    loadPlan,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    refresh,
  };
}

// ============================================================================
// Hook: useSequencePlanList (Lightweight version)
// ============================================================================

export interface UseSequencePlanListReturn {
  plans: SequencePlan[];
  refresh: () => Promise<void>;
}

/**
 * Lightweight hook for just listing sequence plans
 * Use this when you don't need full plan management
 */
export function useSequencePlanList(): UseSequencePlanListReturn {
  const [plans, setPlans] = useState<SequencePlan[]>([]);

  // Load initial plans
  useEffect(() => {
    const loadInitialPlans = async () => {
      const initialPlans = await sequencePlanService.listSequencePlans();
      setPlans(initialPlans);
    };
    loadInitialPlans();
  }, []);

  // Subscribe to plan list updates
  useEffect(() => {
    const unsubscribe = sequencePlanService.subscribeToPlanList(setPlans);
    return unsubscribe;
  }, []);

  // Refresh plans
  const refresh = useCallback(async () => {
    const updatedPlans = await sequencePlanService.listSequencePlans();
    setPlans(updatedPlans);
  }, []);

  return {
    plans,
    refresh,
  };
}

// ============================================================================
// Hook: useAutoSaveStatus
// ============================================================================

export interface UseAutoSaveStatusReturn {
  isEnabled: boolean;
  lastSaveTime: number | null;
  enable: (intervalMs?: number) => void;
  disable: () => void;
}

/**
 * Hook for managing auto-save status
 */
export function useAutoSaveStatus(): UseAutoSaveStatusReturn {
  const [isEnabled, setIsEnabled] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  // Subscribe to auto-save status
  useEffect(() => {
    const unsubscribe = sequencePlanService.subscribeToAutoSaveStatus((enabled, lastSave) => {
      setIsEnabled(enabled);
      setLastSaveTime(lastSave);
    });

    return unsubscribe;
  }, []);

  const enable = useCallback((intervalMs?: number) => {
    sequencePlanService.enableAutoSave(intervalMs);
  }, []);

  const disable = useCallback(() => {
    sequencePlanService.disableAutoSave();
  }, []);

  return {
    isEnabled,
    lastSaveTime,
    enable,
    disable,
  };
}
