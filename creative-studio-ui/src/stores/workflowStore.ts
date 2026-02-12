/**
 * Workflow Store - Zustand store for high-level creative journey orchestration
 * 
 * Tracks the user's progress through the end-to-end filmmaking workflow:
 * 1. Pre-production (Wizards: World, Characters)
 * 2. Storytelling (Script, Sequences, Shots)
 * 3. Generation (AI Assets: Images, Videos, Audio)
 * 4. Post-production (Review, Adjustments, Regeneration)
 * 5. Export (Final Film)
 */

import { create } from 'zustand';

export type WorkflowStage =
    | 'preparation'   // World building, character creation
    | 'storytelling'  // Plot, sequence planning, shot listing
    | 'generation'    // AI asset generation
    | 'post_prod'     // Review, edit, regenerate
    | 'delivery';     // Final export

export interface StageProgress {
    percentage: number;
    status: 'todo' | 'in_progress' | 'completed';
    requiredTasks: string[];
    completedTasks: string[];
}

interface WorkflowState {
    currentStage: WorkflowStage;
    stageProgress: Record<WorkflowStage, StageProgress>;
    lastCheckpoint: number; // Timestamp
    globalProgress: number; // 0-100

    // Actions
    setStage: (stage: WorkflowStage) => void;
    updateStageProgress: (stage: WorkflowStage, updates: Partial<StageProgress>) => void;
    completeTask: (stage: WorkflowStage, taskId: string) => void;
    uncompleteTask: (stage: WorkflowStage, taskId: string) => void;
    resetWorkflow: () => void;
    calculateGlobalProgress: () => void;
}

const INITIAL_STAGES: Record<WorkflowStage, StageProgress> = {
    preparation: {
        percentage: 0,
        status: 'todo',
        requiredTasks: ['create_world', 'create_main_character'],
        completedTasks: [],
    },
    storytelling: {
        percentage: 0,
        status: 'todo',
        requiredTasks: ['generate_story', 'plan_sequences', 'list_shots'],
        completedTasks: [],
    },
    generation: {
        percentage: 0,
        status: 'todo',
        requiredTasks: ['generate_images', 'generate_videos', 'generate_audio'],
        completedTasks: [],
    },
    post_prod: {
        percentage: 0,
        status: 'todo',
        requiredTasks: ['review_shots', 'adjust_timing'],
        completedTasks: [],
    },
    delivery: {
        percentage: 0,
        status: 'todo',
        requiredTasks: ['render_final', 'export_file'],
        completedTasks: [],
    },
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
    currentStage: 'preparation',
    stageProgress: INITIAL_STAGES,
    lastCheckpoint: Date.now(),
    globalProgress: 0,

    setStage: (stage) => set({ currentStage: stage, lastCheckpoint: Date.now() }),

    updateStageProgress: (stage, updates) =>
        set((state) => {
            const newStageProgress = {
                ...state.stageProgress,
                [stage]: { ...state.stageProgress[stage], ...updates }
            };

            // Auto-update status based on percentage
            if (newStageProgress[stage].percentage >= 100) {
                newStageProgress[stage].status = 'completed';
            } else if (newStageProgress[stage].percentage > 0) {
                newStageProgress[stage].status = 'in_progress';
            }

            return { stageProgress: newStageProgress };
        }),

    completeTask: (stage, taskId) =>
        set((state) => {
            const stageData = state.stageProgress[stage];
            if (stageData.completedTasks.includes(taskId)) return state;

            const completedTasks = [...stageData.completedTasks, taskId];
            const percentage = Math.round((completedTasks.length / stageData.requiredTasks.length) * 100);

            const newStageProgress = {
                ...state.stageProgress,
                [stage]: {
                    ...stageData,
                    completedTasks,
                    percentage,
                    status: percentage >= 100 ? 'completed' : 'in_progress',
                }
            };

            return { stageProgress: newStageProgress };
        }),

    uncompleteTask: (stage, taskId) =>
        set((state) => {
            const stageData = state.stageProgress[stage];
            const completedTasks = stageData.completedTasks.filter(id => id !== taskId);
            const percentage = Math.round((completedTasks.length / stageData.requiredTasks.length) * 100);

            const newStageProgress = {
                ...state.stageProgress,
                [stage]: {
                    ...stageData,
                    completedTasks,
                    percentage,
                    status: percentage === 0 ? 'todo' : 'in_progress',
                }
            };

            return { stageProgress: newStageProgress };
        }),

    calculateGlobalProgress: () =>
        set((state) => {
            const stages = Object.values(state.stageProgress);
            const totalProgress = stages.reduce((acc, stage) => acc + stage.percentage, 0);
            const globalProgress = Math.round(totalProgress / stages.length);
            return { globalProgress };
        }),

    resetWorkflow: () => set({
        currentStage: 'preparation',
        stageProgress: INITIAL_STAGES,
        globalProgress: 0,
        lastCheckpoint: Date.now()
    }),
}));
