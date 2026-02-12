/**
 * Workflow Orchestrator - Logic layer for end-to-end workflow synchronization
 * 
 * This service listens to multiple stores and updates the workflowStore
 * to provide a unified view of the project's progress.
 */

import { useWorkflowStore, WorkflowStage } from '../stores/workflowStore';
import { useAppStore } from '../stores/useAppStore';
import { useGenerationStore } from '../stores/generationStore';

export class WorkflowOrchestrator {
    private static instance: WorkflowOrchestrator;
    private unsubscribe: (() => void)[] = [];

    private constructor() {
        this.setupListeners();
    }

    public static getInstance(): WorkflowOrchestrator {
        if (!WorkflowOrchestrator.instance) {
            WorkflowOrchestrator.instance = new WorkflowOrchestrator();
        }
        return WorkflowOrchestrator.instance;
    }

    /**
     * Setup listeners for all relevant stores
     */
    private setupListeners() {
        // 1. Listen to AppStore (Wizards, Projects, Shots)
        const subApp = useAppStore.subscribe((state, prevState) => {
            // World creation check
            if (state.worlds.length > prevState.worlds.length) {
                this.completeTask('preparation', 'create_world');
            }

            // Character creation check
            if (state.characters.length > prevState.characters.length) {
                this.completeTask('preparation', 'create_main_character');
            }

            // Project setup
            if (state.project && !prevState.project) {
                this.completeTask('preparation', 'create_world'); // Assume project creation is part of world/setting
            }

            // Storyteller / Story generation
            // This is harder since we don't have a direct "story" type in AppStore yet (it's in StorytellerWizard)
            // We can check if shots are added
            if (state.shots.length > 0 && prevState.shots.length === 0) {
                this.completeTask('storytelling', 'generate_story');
                this.completeTask('storytelling', 'list_shots');
            }
        });

        // 2. Listen to GenerationStore (AI Assets)
        const subGen = useGenerationStore.subscribe((state, prevState) => {
            const { currentPipeline } = state;
            if (!currentPipeline) return;

            // Completion of generation stages
            if (currentPipeline.stages.image.status === 'completed') {
                this.completeTask('generation', 'generate_images');
            }
            if (currentPipeline.stages.video.status === 'completed') {
                this.completeTask('generation', 'generate_videos');
            }
            if (currentPipeline.stages.audio.status === 'completed') {
                this.completeTask('generation', 'generate_audio');
            }

            // Transition to post-prod when everything is generated once
            if (
                currentPipeline.stages.image.status === 'completed' &&
                currentPipeline.stages.audio.status === 'completed'
            ) {
                useWorkflowStore.getState().setStage('post_prod');
            }
        });

        this.unsubscribe.push(subApp, subGen);
    }

    /**
     * Helper to complete a task and recalculate progress
     */
    private completeTask(stage: WorkflowStage, taskId: string) {
        const store = useWorkflowStore.getState();
        store.completeTask(stage, taskId);
        store.calculateGlobalProgress();

        // Auto-advance stage if complete
        const stageData = store.stageProgress[stage];
        if (stageData.percentage === 100) {
            this.advanceToNextStage(stage);
        }
    }

    /**
     * Automatically advance to the next logical stage
     */
    private advanceToNextStage(currentStage: WorkflowStage) {
        const store = useWorkflowStore.getState();
        switch (currentStage) {
            case 'preparation':
                store.setStage('storytelling');
                break;
            case 'storytelling':
                store.setStage('generation');
                break;
            case 'generation':
                store.setStage('post_prod');
                break;
            case 'post_prod':
                // delivery is manual
                break;
        }
    }

    /**
     * Suggest the next best action for the user
     */
    public getNextAction(): { label: string; action: () => void } | null {
        const store = useWorkflowStore.getState();
        const appStore = useAppStore.getState();
        const current = store.currentStage;
        const progress = store.stageProgress[current];

        // Find the first incomplete task in current stage
        const nextTask = progress.requiredTasks.find(id => !progress.completedTasks.includes(id));

        if (!nextTask) return null;

        switch (nextTask) {
            case 'create_world':
                return { label: 'Bâtir le Monde', action: () => appStore.setShowWorldWizard(true) };
            case 'create_main_character':
                return { label: 'Créer un Personnage', action: () => appStore.setShowCharacterWizard(true) };
            case 'generate_story':
                return { label: 'Générer une Histoire', action: () => appStore.setShowStorytellerWizard(true) };
            case 'plan_sequences':
                return { label: 'Planifier les Séquences', action: () => appStore.openSequencePlanWizard() };
            case 'list_shots':
                return { label: 'Préparer les Plans', action: () => appStore.openShotWizard() };
            // Additionnal mappings...
        }

        return null;
    }

    public destroy() {
        this.unsubscribe.forEach(unsub => unsub());
        this.unsubscribe = [];
    }
}

// Hook for using the orchestrator in a React component (e.g., MainLayout)
export const useWorkflowOrchestration = () => {
    const orchestrator = WorkflowOrchestrator.getInstance();
    return orchestrator;
};
