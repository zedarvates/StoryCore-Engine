/**
 * Sequence Plan Store
 * 
 * Zustand store for managing sequence plan state:
 * - Current active plan
 * - List of all plans
 * - CRUD operations
 * - Integration with sequence plan service
 * 
 * Task 7.6.8: Real-time Sync
 */

import { useMemo } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SequencePlan } from '@/types/sequencePlan';
import type { SequencePlanData } from '@/services/sequencePlanService';
import { sequencePlanService } from '@/services/sequencePlanService';
import type { Shot } from '@/types';

interface SequencePlanState {
  // State
  plans: SequencePlan[];
  currentPlanId: string | null;
  currentPlanData: SequencePlanData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadPlans: () => Promise<void>;
  selectPlan: (planId: string) => Promise<void>;
  createPlan: (name: string, description?: string) => Promise<void>;
  duplicatePlan: (planId: string) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  exportPlan: (planId: string) => Promise<void>;
  updateCurrentPlan: (updates: Partial<SequencePlanData>) => Promise<void>;
  addShotToPlan: (shot: Shot) => Promise<void>;
  removeShotFromPlan: (shotId: string) => Promise<void>;
  updateShotInPlan: (shotId: string, updates: Partial<Shot>) => Promise<void>;
  reorderShotsInPlan: (shots: Shot[]) => Promise<void>;
  insertShotAtPosition: (shot: Shot, position: number) => Promise<void>;
  splitShot: (shotId: string, splitTime: number) => Promise<void>;
  mergeShots: (shotId1: string, shotId2: string) => Promise<void>;
  clearError: () => void;
}

export const useSequencePlanStore = create<SequencePlanState>()(
  devtools(
    (set, get) => ({
      // Initial state
      plans: [],
      currentPlanId: null,
      currentPlanData: null,
      isLoading: false,
      error: null,

      // Load all plans
      loadPlans: async () => {
        set({ isLoading: true, error: null });
        try {
          const plans = await sequencePlanService.listSequencePlans();
          set({ plans, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load plans',
            isLoading: false,
          });
        }
      },

      // Select a plan
      selectPlan: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          const planData = await sequencePlanService.loadSequencePlan(planId);
          if (!planData) {
            throw new Error('Plan not found');
          }
          set({
            currentPlanId: planId,
            currentPlanData: planData,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load plan',
            isLoading: false,
          });
        }
      },

      // Create a new plan
      createPlan: async (name: string, description?: string) => {
        set({ isLoading: true, error: null });
        try {
          const newPlan = await sequencePlanService.createSequencePlan(name, description);
          
          // Reload plans list
          const plans = await sequencePlanService.listSequencePlans();
          
          set({
            plans,
            currentPlanId: newPlan.id,
            currentPlanData: newPlan,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to create plan',
            isLoading: false,
          });
          throw error;
        }
      },

      // Duplicate a plan
      duplicatePlan: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          const duplicatedPlan = await sequencePlanService.duplicateSequencePlan(planId);
          
          // Reload plans list
          const plans = await sequencePlanService.listSequencePlans();
          
          set({
            plans,
            currentPlanId: duplicatedPlan.id,
            currentPlanData: duplicatedPlan,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to duplicate plan',
            isLoading: false,
          });
          throw error;
        }
      },

      // Delete a plan
      deletePlan: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          await sequencePlanService.deleteSequencePlan(planId);
          
          // Reload plans list
          const plans = await sequencePlanService.listSequencePlans();
          
          // If deleted plan was current, clear current plan
          const { currentPlanId } = get();
          const updates: Partial<SequencePlanState> = { plans, isLoading: false };
          
          if (currentPlanId === planId) {
            updates.currentPlanId = null;
            updates.currentPlanData = null;
          }
          
          set(updates);
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to delete plan',
            isLoading: false,
          });
          throw error;
        }
      },

      // Export a plan
      exportPlan: async (planId: string) => {
        set({ isLoading: true, error: null });
        try {
          const jsonData = await sequencePlanService.exportSequencePlan(planId);
          
          // Create download link
          const blob = new Blob([jsonData], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `sequence-plan-${planId}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          set({ isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to export plan',
            isLoading: false,
          });
          throw error;
        }
      },

      // Update current plan
      updateCurrentPlan: async (updates: Partial<SequencePlanData>) => {
        console.log('sequencePlanStore updateCurrentPlan called with updates:', Object.keys(updates));
        const { currentPlanId, currentPlanData } = get();
        if (!currentPlanId || !currentPlanData) {
          throw new Error('No plan selected');
        }

        set({ isLoading: true, error: null });
        try {
          const updatedPlan = await sequencePlanService.updateSequencePlan(
            currentPlanId,
            updates
          );

          // Reload plans list to update summary
          const plans = await sequencePlanService.listSequencePlans();

          console.log('sequencePlanStore setting state after updateCurrentPlan');
          set({
            plans,
            currentPlanData: updatedPlan,
            isLoading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update plan',
            isLoading: false,
          });
          throw error;
        }
      },

      // Add shot to current plan
      addShotToPlan: async (shot: Shot) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const updatedShots = [...currentPlanData.shots, shot];
        const totalDuration = updatedShots.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: updatedShots,
          totalDuration,
        });
      },

      // Remove shot from current plan
      removeShotFromPlan: async (shotId: string) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const updatedShots = currentPlanData.shots.filter((s) => s.id !== shotId);
        const totalDuration = updatedShots.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: updatedShots,
          totalDuration,
        });
      },

      // Update shot in current plan
      updateShotInPlan: async (shotId: string, updates: Partial<Shot>) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const updatedShots = currentPlanData.shots.map((s) =>
          s.id === shotId ? { ...s, ...updates } : s
        );
        const totalDuration = updatedShots.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: updatedShots,
          totalDuration,
        });
      },

      // Reorder shots in current plan
      reorderShotsInPlan: async (shots: Shot[]) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots,
          totalDuration,
        });
      },

      // Insert shot at specific position
      insertShotAtPosition: async (shot: Shot, position: number) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const updatedShots = [...currentPlanData.shots];
        updatedShots.splice(position, 0, shot);

        // Update positions for all shots
        const shotsWithUpdatedPositions = updatedShots.map((s, index) => ({
          ...s,
          position: index,
        }));

        const totalDuration = shotsWithUpdatedPositions.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: shotsWithUpdatedPositions,
          totalDuration,
        });
      },

      // Split shot at specific time
      splitShot: async (shotId: string, splitTime: number) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const shotIndex = currentPlanData.shots.findIndex(s => s.id === shotId);
        if (shotIndex === -1) {
          throw new Error('Shot not found');
        }

        const shot = currentPlanData.shots[shotIndex];
        if (splitTime <= 0 || splitTime >= shot.duration) {
          throw new Error('Split time must be within shot duration');
        }

        // Create first part of split shot
        const firstShot: Shot = {
          ...shot,
          id: `${shot.id}_part1`,
          title: `${shot.title} (Part 1)`,
          duration: splitTime,
          position: shot.position,
          // Split audio tracks at the split time
          audioTracks: shot.audioTracks.map(track => ({
            ...track,
            duration: Math.min(track.duration, splitTime - track.startTime),
          })).filter(track => track.duration > 0),
          // Keep all effects and text layers in first part
        };

        // Create second part of split shot
        const secondShot: Shot = {
          ...shot,
          id: `${shot.id}_part2`,
          title: `${shot.title} (Part 2)`,
          duration: shot.duration - splitTime,
          position: shot.position + 1,
          // Shift audio tracks for second part
          audioTracks: shot.audioTracks.map(track => ({
            ...track,
            startTime: Math.max(0, track.startTime - splitTime),
            duration: Math.max(0, (track.startTime + track.duration) - splitTime),
          })).filter(track => track.duration > 0),
          // Keep all effects and text layers in second part
        };

        // Replace original shot with two split shots
        const updatedShots = [...currentPlanData.shots];
        updatedShots.splice(shotIndex, 1, firstShot, secondShot);

        // Update positions for remaining shots
        const shotsWithUpdatedPositions = updatedShots.map((s, index) => ({
          ...s,
          position: index,
        }));

        const totalDuration = shotsWithUpdatedPositions.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: shotsWithUpdatedPositions,
          totalDuration,
        });
      },

      // Merge two adjacent shots
      mergeShots: async (shotId1: string, shotId2: string) => {
        const { currentPlanData } = get();
        if (!currentPlanData) {
          throw new Error('No plan selected');
        }

        const shot1Index = currentPlanData.shots.findIndex(s => s.id === shotId1);
        const shot2Index = currentPlanData.shots.findIndex(s => s.id === shotId2);

        if (shot1Index === -1 || shot2Index === -1) {
          throw new Error('One or both shots not found');
        }

        // Ensure shots are adjacent
        if (Math.abs(shot1Index - shot2Index) !== 1) {
          throw new Error('Shots must be adjacent to merge');
        }

        const shot1 = currentPlanData.shots[shot1Index];
        const shot2 = currentPlanData.shots[shot2Index];

        // Create merged shot
        const mergedShot: Shot = {
          ...shot1,
          id: `${shot1.id}_merged_${shot2.id}`,
          title: `${shot1.title} + ${shot2.title}`,
          description: `${shot1.description}\n\n${shot2.description}`,
          duration: shot1.duration + shot2.duration,
          position: Math.min(shot1.position, shot2.position),
          // Combine audio tracks
          audioTracks: [
            ...shot1.audioTracks,
            ...shot2.audioTracks.map(track => ({
              ...track,
              startTime: track.startTime + shot1.duration, // Shift start time
            })),
          ],
          // Combine effects (keep both)
          effects: [...shot1.effects, ...shot2.effects],
          // Combine text layers (keep both)
          textLayers: [...shot1.textLayers, ...shot2.textLayers],
          // Combine animations (keep both)
          animations: [...shot1.animations, ...shot2.animations],
          // Keep transition from second shot if it exists
          transitionOut: shot2.transitionOut,
          // Merge metadata
          metadata: { ...shot1.metadata, ...shot2.metadata },
        };

        // Remove both original shots and insert merged shot
        const updatedShots = [...currentPlanData.shots];
        const minIndex = Math.min(shot1Index, shot2Index);
        updatedShots.splice(minIndex, 2, mergedShot);

        // Update positions for remaining shots
        const shotsWithUpdatedPositions = updatedShots.map((s, index) => ({
          ...s,
          position: index,
        }));

        const totalDuration = shotsWithUpdatedPositions.reduce((sum, s) => sum + s.duration, 0);

        await get().updateCurrentPlan({
          shots: shotsWithUpdatedPositions,
          totalDuration,
        });
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    { name: 'SequencePlanStore' }
  )
);

// Stable empty array to prevent infinite re-renders
const EMPTY_SHOTS_ARRAY: Shot[] = [];

// Export selector hooks for common use cases
// These selectors are stable and won't cause re-renders
const selectCurrentPlan = (state: SequencePlanState) => state.currentPlanData;
const selectCurrentPlanShots = (state: SequencePlanState) => state.currentPlanData?.shots || EMPTY_SHOTS_ARRAY;
const selectPlans = (state: SequencePlanState) => state.plans;

export const useCurrentPlan = () => useSequencePlanStore(selectCurrentPlan);
export const useCurrentPlanShots = () => useSequencePlanStore(selectCurrentPlanShots);
export const usePlans = () => useSequencePlanStore(selectPlans);

// Add updatePlan function outside the hook
export const updatePlan = async (id: string, plan: SequencePlan) => {
  // Update via service - convert ProductionShot[] to Shot[]
  const updatedData = await sequencePlanService.updateSequencePlan(id, {
    name: plan.name,
    description: plan.description || '',
    shots: plan.shots as any, // Cast to avoid type mismatch for now
    totalDuration: plan.targetDuration || 0,
    frameRate: plan.frameRate || 24,
    resolution: plan.resolution,
    modifiedAt: plan.modifiedAt || Date.now(),
    metadata: {
      worldId: plan.worldId,
      templateId: plan.templateId,
      acts: plan.acts,
      scenes: plan.scenes,
      tags: plan.tags,
    },
  });

  // Reload plans list
  const plans = await sequencePlanService.listSequencePlans();

  // Update store using setState
  useSequencePlanStore.setState({
    plans,
    currentPlanData: updatedData,
    isLoading: false,
  });
};

export const useSequencePlanActions = () => {
  return useMemo(() => {
    const state = useSequencePlanStore.getState();
    return {
      loadPlans: state.loadPlans,
      selectPlan: state.selectPlan,
      createPlan: state.createPlan,
      duplicatePlan: state.duplicatePlan,
      deletePlan: state.deletePlan,
      exportPlan: state.exportPlan,
      updateCurrentPlan: state.updateCurrentPlan,
      addShotToPlan: state.addShotToPlan,
      removeShotFromPlan: state.removeShotFromPlan,
      updateShotInPlan: state.updateShotInPlan,
      reorderShotsInPlan: state.reorderShotsInPlan,
      insertShotAtPosition: state.insertShotAtPosition,
      splitShot: state.splitShot,
      mergeShots: state.mergeShots,
      updatePlan,
    };
  }, []);
};
