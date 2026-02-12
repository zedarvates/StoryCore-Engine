/**
 * PipelineAwareLLM — Context-aware LLM service for StoryCore Assistant
 *
 * This service bridges the generation pipeline state with the LLM assistant,
 * enabling the assistant to provide context-aware suggestions, trigger
 * re-generation, and guide the user through the creative workflow.
 *
 * @module PipelineAwareLLM
 */

import { useGenerationStore } from '../../stores/generationStore';
import { useAppStore } from '../../stores/useAppStore';
import { useEditorStore } from '../../stores/editorStore';
import type { GenerationPipelineState, GeneratedAsset } from '../../types/generation';

// =============================================================================
// Types
// =============================================================================

export type GenerationAssetType = 'prompt' | 'image' | 'video' | 'audio';

export interface PipelineStatus {
    isActive: boolean;
    currentStage: GenerationAssetType | null;
    completedStages: GenerationAssetType[];
    failedStages: GenerationAssetType[];
    pendingStages: GenerationAssetType[];
    overallProgress: number; // 0-100
    queueLength: number;
    activeBatchCount: number;
}

export interface ProjectCompletionStatus {
    hasCharacters: boolean;
    hasShots: boolean;
    hasSequences: boolean;
    hasGeneratedImages: boolean;
    hasGeneratedVideos: boolean;
    hasGeneratedAudio: boolean;
    hasExportedFilm: boolean;
    completionPercentage: number;
    missingSteps: string[];
    nextAction: ContextualSuggestion | null;
}

export interface ContextualSuggestion {
    id: string;
    type: 'generate' | 'regenerate' | 'wizard' | 'export' | 'review';
    title: string;
    description: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    assetType?: GenerationAssetType;
    targetId?: string; // shot ID, character ID, etc.
    actionLabel: string;
}

export interface RegenerationRequest {
    type: GenerationAssetType;
    targetId: string;
    targetName: string;
    reason?: string;
    style?: string;
}

// =============================================================================
// PipelineAwareLLM Service
// =============================================================================

export class PipelineAwareLLM {
    /**
     * Get the current pipeline status from the generation store
     */
    static getPipelineStatus(): PipelineStatus {
        const store = useGenerationStore.getState();
        const pipeline = store.currentPipeline;

        if (!pipeline) {
            return {
                isActive: false,
                currentStage: null,
                completedStages: [],
                failedStages: [],
                pendingStages: ['prompt', 'image', 'video', 'audio'],
                overallProgress: 0,
                queueLength: store.queue.tasks.length,
                activeBatchCount: store.activeBatch ? 1 : 0,
            };
        }

        const stages: GenerationAssetType[] = ['prompt', 'image', 'video', 'audio'];
        const completedStages: GenerationAssetType[] = [];
        const failedStages: GenerationAssetType[] = [];
        const pendingStages: GenerationAssetType[] = [];
        let currentStage: GenerationAssetType | null = null;

        for (const stage of stages) {
            const stageState = pipeline.stages[stage];
            if (!stageState) {
                pendingStages.push(stage);
                continue;
            }
            switch (stageState.status) {
                case 'completed':
                    completedStages.push(stage);
                    break;
                case 'in_progress':
                    currentStage = stage;
                    break;
                case 'failed':
                    failedStages.push(stage);
                    break;
                default:
                    pendingStages.push(stage);
            }
        }

        const totalStages = stages.length;
        const overallProgress = Math.round(
            ((completedStages.length + (currentStage ? 0.5 : 0)) / totalStages) * 100
        );

        return {
            isActive: currentStage !== null,
            currentStage,
            completedStages,
            failedStages,
            pendingStages,
            overallProgress,
            queueLength: store.queue.tasks.length,
            activeBatchCount: store.activeBatch ? 1 : 0,
        };
    }

    /**
     * Analyze the project and return completion status with smart suggestions
     */
    static getProjectCompletionStatus(): ProjectCompletionStatus {
        const appState = useAppStore.getState();
        const genState = useGenerationStore.getState();
        const project = appState.project;

        const hasCharacters = Boolean(project?.characters && project.characters.length > 0);
        const hasShots = Boolean(project?.shots && project.shots.length > 0);
        const hasSequences = Boolean(project?.sequences && project.sequences.length > 0);

        // Check pipeline asset graph for generated content
        const assets = Array.from(genState.assetGraph.nodes.values());
        const hasGeneratedImages = assets.some((a) => a.type === 'image');
        const hasGeneratedVideos = assets.some((a) => a.type === 'video');
        const hasGeneratedAudio = assets.some((a) => a.type === 'audio');
        const hasExportedFilm = false; // TODO: connect to export state

        const missingSteps: string[] = [];
        if (!hasCharacters) missingSteps.push('Créer des personnages');
        if (!hasShots) missingSteps.push('Planifier les shots');
        if (!hasSequences) missingSteps.push('Organiser les séquences');
        if (!hasGeneratedImages) missingSteps.push('Générer les images des shots');
        if (!hasGeneratedVideos) missingSteps.push('Générer les vidéos');
        if (!hasGeneratedAudio) missingSteps.push('Générer l\'audio et les voix');
        if (!hasExportedFilm) missingSteps.push('Exporter le film final');

        const totalSteps = 7;
        const completedSteps = totalSteps - missingSteps.length;
        const completionPercentage = Math.round((completedSteps / totalSteps) * 100);

        // Determine the next logical action
        let nextAction: ContextualSuggestion | null = null;
        if (!hasCharacters) {
            nextAction = {
                id: 'create-characters',
                type: 'wizard',
                title: '👤 Créer des personnages',
                description: 'Commencez par définir vos personnages pour donner vie à votre histoire',
                priority: 'critical',
                actionLabel: 'Lancer le Wizard Personnages',
            };
        } else if (!hasShots) {
            nextAction = {
                id: 'plan-shots',
                type: 'wizard',
                title: '🎥 Planifier les shots',
                description: 'Transformez votre histoire en plans cinématiques',
                priority: 'critical',
                actionLabel: 'Lancer le Wizard Shots',
            };
        } else if (!hasGeneratedImages) {
            nextAction = {
                id: 'generate-images',
                type: 'generate',
                title: '🖼️ Générer les images',
                description: `${project?.shots?.length || 0} shots en attente de génération d'images`,
                priority: 'high',
                assetType: 'image',
                actionLabel: 'Générer les images',
            };
        } else if (!hasGeneratedAudio) {
            nextAction = {
                id: 'generate-audio',
                type: 'generate',
                title: '🔊 Générer l\'audio',
                description: 'Ajoutez les voix et effets sonores à vos shots',
                priority: 'high',
                assetType: 'audio',
                actionLabel: 'Générer l\'audio',
            };
        } else if (!hasGeneratedVideos) {
            nextAction = {
                id: 'generate-videos',
                type: 'generate',
                title: '🎬 Générer les vidéos',
                description: 'Animez vos images en vidéos pour chaque shot',
                priority: 'high',
                assetType: 'video',
                actionLabel: 'Générer les vidéos',
            };
        } else if (!hasExportedFilm) {
            nextAction = {
                id: 'export-film',
                type: 'export',
                title: '🎞️ Exporter le film',
                description: 'Assemblez le tout en un film final',
                priority: 'high',
                actionLabel: 'Exporter le film',
            };
        }

        return {
            hasCharacters,
            hasShots,
            hasSequences,
            hasGeneratedImages,
            hasGeneratedVideos,
            hasGeneratedAudio,
            hasExportedFilm,
            completionPercentage,
            missingSteps,
            nextAction,
        };
    }

    /**
     * Generate contextual suggestions based on current state
     */
    static getContextualSuggestions(): ContextualSuggestion[] {
        const pipelineStatus = this.getPipelineStatus();
        const projectStatus = this.getProjectCompletionStatus();
        const suggestions: ContextualSuggestion[] = [];

        // Failed stages → suggest retry
        for (const stage of pipelineStatus.failedStages) {
            suggestions.push({
                id: `retry-${stage}`,
                type: 'regenerate',
                title: `🔄 Relancer ${this.stageLabel(stage)}`,
                description: `La génération ${this.stageLabel(stage)} a échoué. Voulez-vous réessayer ?`,
                priority: 'critical',
                assetType: stage,
                actionLabel: 'Régénérer',
            });
        }

        // Completed stages → suggest next step
        if (
            pipelineStatus.completedStages.includes('prompt') &&
            !pipelineStatus.completedStages.includes('image')
        ) {
            suggestions.push({
                id: 'prompt-to-image',
                type: 'generate',
                title: '🖼️ Prompts prêts → Générer les images',
                description: 'Vos prompts sont générés, passez à la génération d\'images',
                priority: 'high',
                assetType: 'image',
                actionLabel: 'Générer les images',
            });
        }

        if (
            pipelineStatus.completedStages.includes('image') &&
            !pipelineStatus.completedStages.includes('video')
        ) {
            suggestions.push({
                id: 'image-to-video',
                type: 'generate',
                title: '🎬 Images prêtes → Générer les vidéos',
                description: 'Vos images sont générées, passez à l\'animation vidéo',
                priority: 'high',
                assetType: 'video',
                actionLabel: 'Générer les vidéos',
            });
        }

        if (
            pipelineStatus.completedStages.includes('video') &&
            !pipelineStatus.completedStages.includes('audio')
        ) {
            suggestions.push({
                id: 'video-to-audio',
                type: 'generate',
                title: '🔊 Vidéos prêtes → Ajouter l\'audio',
                description: 'Ajoutez les voix, musique et effets sonores',
                priority: 'high',
                assetType: 'audio',
                actionLabel: 'Générer l\'audio',
            });
        }

        // All stages complete → suggest export
        const allComplete = ['prompt', 'image', 'video', 'audio'].every((s) =>
            pipelineStatus.completedStages.includes(s as GenerationAssetType)
        );
        if (allComplete) {
            suggestions.push({
                id: 'export-film',
                type: 'export',
                title: '🎞️ Tout est prêt → Exporter le film !',
                description: 'Toutes les étapes sont terminées. Assemblez votre film final.',
                priority: 'critical',
                actionLabel: 'Exporter le film',
            });
        }

        // Next action from project completion
        if (projectStatus.nextAction && suggestions.length === 0) {
            suggestions.push(projectStatus.nextAction);
        }

        return suggestions;
    }

    /**
     * Build a context-aware system prompt for the LLM
     */
    static buildContextualSystemPrompt(): string {
        const appState = useAppStore.getState();
        const project = appState.project;
        const pipelineStatus = this.getPipelineStatus();
        const projectStatus = this.getProjectCompletionStatus();

        let prompt = `Tu es l'Assistant StoryCore, un expert IA en narration cinématique, design de personnages, et production vidéo.
Tu aides les utilisateurs à créer des films et vidéos avec le système StoryCore-Engine.

CONTEXTE DU PROJET:
- Nom: "${project?.project_name || 'Sans titre'}"
- Complétion: ${projectStatus.completionPercentage}%
- Personnages: ${project?.characters?.length || 0}
- Shots: ${project?.shots?.length || 0}
- Séquences: ${project?.sequences?.length || 0}

ÉTAT DU PIPELINE:
- Progression globale: ${pipelineStatus.overallProgress}%
- Étapes complétées: ${pipelineStatus.completedStages.map(s => this.stageLabel(s)).join(', ') || 'Aucune'}
- Étapes en échec: ${pipelineStatus.failedStages.map(s => this.stageLabel(s)).join(', ') || 'Aucune'}
- En cours: ${pipelineStatus.currentStage ? this.stageLabel(pipelineStatus.currentStage) : 'Rien'}
- File d'attente: ${pipelineStatus.queueLength} tâches`;

        if (projectStatus.missingSteps.length > 0) {
            prompt += `\n\nÉTAPES MANQUANTES:
${projectStatus.missingSteps.map(s => `- ${s}`).join('\n')}`;
        }

        prompt += `\n\nCOMPORTEMENT:
- Réponds de façon concise et utile en français
- Propose des actions concrètes basées sur l'état du projet
- Si l'utilisateur demande de régénérer quelque chose, guide-le vers le bon bouton
- Tu peux lancer des wizards, suggérer des générations, et guider l'export
- Utilise des emojis pour rendre tes réponses visuelles`;

        return prompt;
    }

    /**
     * Parse user intent from a message for generation-related commands
     */
    static parseGenerationIntent(message: string): RegenerationRequest | null {
        const lower = message.toLowerCase();

        // Detect re-generation requests
        const regenPatterns = [
            { pattern: /régénér?er?\s+(l[ea]'?\s*)?(image|portrait|photo)/i, type: 'image' as const },
            { pattern: /re-?génér?er?\s+(l[ea]'?\s*)?(image|portrait|photo)/i, type: 'image' as const },
            { pattern: /régénér?er?\s+(l[ea]'?\s*)?(vidéo|video|clip)/i, type: 'video' as const },
            { pattern: /re-?génér?er?\s+(l[ea]'?\s*)?(vidéo|video|clip)/i, type: 'video' as const },
            { pattern: /régénér?er?\s+(l[ea]'?\s*)?(audio|voix|son|musique)/i, type: 'audio' as const },
            { pattern: /re-?génér?er?\s+(l[ea]'?\s*)?(audio|voix|son|musique)/i, type: 'audio' as const },
            { pattern: /régénér?er?\s+(l[ea]'?\s*)?(prompt|texte|description)/i, type: 'prompt' as const },
            { pattern: /re-?génér?er?\s+(l[ea]'?\s*)?(prompt|texte|description)/i, type: 'prompt' as const },
            // English
            { pattern: /regenerate\s+(the\s+)?(image|portrait|photo)/i, type: 'image' as const },
            { pattern: /regenerate\s+(the\s+)?(video|clip)/i, type: 'video' as const },
            { pattern: /regenerate\s+(the\s+)?(audio|voice|sound|music)/i, type: 'audio' as const },
            { pattern: /regenerate\s+(the\s+)?(prompt|text|description)/i, type: 'prompt' as const },
        ];

        for (const { pattern, type } of regenPatterns) {
            if (pattern.test(message)) {
                // Try to extract target name
                const nameMatch = message.match(/(?:de|du|pour|of|for)\s+["']?([^"'\n]+)["']?/i);
                return {
                    type,
                    targetId: '', // would need UI context
                    targetName: nameMatch ? nameMatch[1].trim() : '',
                    reason: 'user_request',
                };
            }
        }

        return null;
    }

    /**
     * Format pipeline status as a readable message
     */
    static formatStatusMessage(): string {
        const status = this.getPipelineStatus();
        const project = this.getProjectCompletionStatus();

        let msg = `📊 **État du Projet** (${project.completionPercentage}%)\n\n`;

        // Pipeline progress
        const stages: { key: GenerationAssetType; emoji: string; label: string }[] = [
            { key: 'prompt', emoji: '✏️', label: 'Prompts' },
            { key: 'image', emoji: '🖼️', label: 'Images' },
            { key: 'video', emoji: '🎬', label: 'Vidéos' },
            { key: 'audio', emoji: '🔊', label: 'Audio' },
        ];

        msg += `**Pipeline de Génération:**\n`;
        for (const stage of stages) {
            let icon = '⬜';
            if (status.completedStages.includes(stage.key)) icon = '✅';
            else if (status.currentStage === stage.key) icon = '🔄';
            else if (status.failedStages.includes(stage.key)) icon = '❌';
            msg += `${icon} ${stage.emoji} ${stage.label}\n`;
        }

        if (status.queueLength > 0) {
            msg += `\n📋 ${status.queueLength} tâche(s) en file d'attente\n`;
        }

        // Missing steps
        if (project.missingSteps.length > 0) {
            msg += `\n**Prochaines étapes:**\n`;
            project.missingSteps.slice(0, 3).forEach((step) => {
                msg += `• ${step}\n`;
            });
        }

        return msg;
    }

    /**
     * Get notification badge data for the floating assistant
     */
    static getNotificationBadge(): { count: number; type: 'info' | 'warning' | 'success' | 'error' } {
        const status = this.getPipelineStatus();
        const suggestions = this.getContextualSuggestions();

        if (status.failedStages.length > 0) {
            return { count: status.failedStages.length, type: 'error' };
        }

        const criticalSuggestions = suggestions.filter((s) => s.priority === 'critical');
        if (criticalSuggestions.length > 0) {
            return { count: criticalSuggestions.length, type: 'warning' };
        }

        if (suggestions.length > 0) {
            return { count: suggestions.length, type: 'info' };
        }

        // All done!
        const allComplete = status.overallProgress === 100;
        if (allComplete) {
            return { count: 0, type: 'success' };
        }

        return { count: 0, type: 'info' };
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    private static stageLabel(stage: GenerationAssetType): string {
        const labels: Record<GenerationAssetType, string> = {
            prompt: 'Prompts',
            image: 'Images',
            video: 'Vidéos',
            audio: 'Audio',
        };
        return labels[stage] || stage;
    }
}
