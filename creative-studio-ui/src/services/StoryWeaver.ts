
import type { Story, StoryPart, StoryGenerationParams, GenerationProgress } from '../types/story';
import type { StoryMethodologyType, MethodologyState } from '../types/storyMethodology';
import { useMemoryStore } from '../stores/memoryStore';
import { storyReviewer } from './StoryReviewer';
import { generateStoryContent, generateStorySummary, retryWithBackoff } from './storyGenerationService';
import { methodologyFactory } from './MethodologyFactory';

/**
 * StoryWeaver service
 * Orchestrates multi-part story generation with iterative refinement
 * With fallback handling for when LLM is not available
 * Supports multiple story creation methodologies
 */
export class StoryWeaver {
    private methodology: MethodologyState | null = null;

    /**
     * Generate a complete story using the specified methodology
     * @param params Generation parameters
     * @param methodologyType The methodology to use for generation
     * @param methodologyOptions Options for the methodology
     * @param onProgress Progress callback
     * @returns The complete story
     */
    async weaveStory(
        params: StoryGenerationParams,
        methodologyType?: StoryMethodologyType,
        methodologyOptions?: Record<string, unknown>,
        onProgress?: (progress: GenerationProgress) => void
    ): Promise<Partial<Story>> {
        // If no methodology specified or sequential, use legacy approach
        if (!methodologyType || methodologyType === 'sequential') {
            return this.weaveStoryLegacy(params, onProgress);
        }

        // Create methodology instance
        const methodology = methodologyFactory.createMethodology(
            methodologyType,
            methodologyOptions
        );

        // Store methodology state
        this.methodology = methodology.getState();

        // Generate content using the methodology
        const state = methodology.getState();
        const phases = state.phases;

        // Generate each approved phase
        for (const phase of phases) {
            onProgress?.({
                stage: 'generating_intro',
                progress: (phases.indexOf(phase) / phases.length) * 100,
                currentTask: `Generating ${phase.phase}...`,
            });

            try {
                const result = await methodology.generateContent(phase.phase, params);
                methodology.completePhase(phase.phase, result);

                // Auto-approve for generation flow
                methodology.approvePhase(phase.phase);
            } catch (error) {
                console.error(`[StoryWeaver] Failed to generate ${phase.phase}:`, error);
            }
        }

        // Export the final story
        const story = await methodology.exportStory();

        return {
            title: params.totalTitle || 'Untitled Story',
            content: story.content,
            summary: story.summary,
            updatedAt: Date.now(),
        };
    }

    /**
     * Legacy story generation for backward compatibility
     * @deprecated Use weaveStory with methodology instead
     */
    async weaveStoryLegacy(
        params: StoryGenerationParams,
        onProgress?: (progress: GenerationProgress) => void
    ): Promise<Partial<Story>> {
        const parts: StoryPart[] = [];
        const numChapters = params.length === 'short' ? 1 : params.length === 'medium' ? 3 : 5;
        let runningSummaryData = '';

        // 1. Generate Intro
        onProgress?.({
            stage: 'generating_intro',
            progress: 10,
            currentTask: 'Generating story introduction...',
        });

        try {
            const intro = await this.generatePart({
                type: 'intro',
                params,
                previousSummary: '',
                order: 1,
            });
            parts.push(intro);
            runningSummaryData = intro.summary;
        } catch (error) {
            console.error('[StoryWeaver] Failed to generate intro:', error);
            const fallbackIntro = this.createFallbackPart('intro', params, 1);
            parts.push(fallbackIntro);
            runningSummaryData = fallbackIntro.summary;
        }

        // 2. Generate Chapters
        for (let i = 0; i < numChapters; i++) {
            const chapterNum = i + 1;
            const progressBase = 15 + (i / numChapters) * 60;

            onProgress?.({
                stage: 'generating_chapter',
                progress: progressBase,
                currentTask: `Generating chapter ${chapterNum} of ${numChapters}...`,
                currentChapter: chapterNum,
                totalChapters: numChapters,
            });

            try {
                const chapter = await this.generatePart({
                    type: 'chapter',
                    params,
                    previousSummary: runningSummaryData,
                    order: parts.length + 1,
                    partIndex: chapterNum,
                });
                parts.push(chapter);
                runningSummaryData = chapter.summary;
            } catch (error) {
                console.error(`[StoryWeaver] Failed to generate chapter ${chapterNum}:`, error);
                const fallbackChapter = this.createFallbackPart('chapter', params, parts.length + 1, chapterNum);
                parts.push(fallbackChapter);
                runningSummaryData = fallbackChapter.summary;
            }
        }

        // 3. Generate Ending
        onProgress?.({
            stage: 'generating_ending',
            progress: 85,
            currentTask: 'Generating story conclusion...',
        });

        try {
            const ending = await this.generatePart({
                type: 'ending',
                params,
                previousSummary: runningSummaryData,
                order: parts.length + 1,
            });
            parts.push(ending);
        } catch (error) {
            console.error('[StoryWeaver] Failed to generate ending:', error);
            const fallbackEnding = this.createFallbackPart('ending', params, parts.length + 1);
            parts.push(fallbackEnding);
        }

        // 4. Generate Final Summary
        onProgress?.({
            stage: 'reviewing',
            progress: 95,
            currentTask: 'Creating story summary...',
        });

        const fullContent = parts.map(p => `### ${p.title}\n\n${p.content}`).join('\n\n');

        let finalSummary = '';
        try {
            finalSummary = await generateStorySummary(fullContent);
        } catch (error) {
            console.warn('[StoryWeaver] Summary generation failed, using basic summary');
            finalSummary = this.createBasicSummary(parts, params);
        }

        // 5. Complete
        onProgress?.({
            stage: 'complete',
            progress: 100,
            currentTask: 'Story generation complete!',
        });

        return {
            title: params.totalTitle || 'Untitled Story',
            content: fullContent,
            summary: finalSummary,
            parts,
            updatedAt: Date.now(),
        };
    }

    /**
     * Get the current methodology state
     */
    getMethodologyState(): MethodologyState | null {
        return this.methodology;
    }

    /**
     * Create a fallback part when LLM generation fails
     */
    private createFallbackPart(
        type: 'intro' | 'chapter' | 'ending',
        params: StoryGenerationParams,
        order: number,
        partIndex?: number
    ): StoryPart {
        const charNames = params.characters?.map((c: any) => c.name).join(', ') || 'the characters';
        const locationNames = params.locations?.map((l: any) => l.name).join(', ') || 'the world';

        let content = '';
        let summary = '';

        if (type === 'intro') {
            content = `The story begins in ${locationNames}, where ${charNames} find themselves at the heart of the adventure.\n\nThe world of ${params.worldContext?.name || 'this realm'} is shaped by ${params.genre?.join(' and ') || 'fantasy'} traditions, with a ${params.tone?.join(', ') || 'adventurous'} atmosphere that permeates every corner of this tale.\n\nAs the narrative unfolds, the initial conflict emerges, setting the stage for what promises to be an epic journey.`;
            summary = 'The story begins with the main characters in their initial situation, establishing the setting and world.';
        } else if (type === 'chapter') {
            content = `Chapter ${partIndex}\n\nThe adventure continues in ${locationNames}. ${charNames} face new challenges and revelations that will shape the course of their journey.\n\nTensions rise as the plot thickens, bringing unexpected twists and deeper understanding of the world they inhabit.`;
            summary = `Chapter ${partIndex} develops the plot further, introducing new challenges and character development.`;
        } else {
            content = `The Conclusion\n\nAfter many trials and tribulations, ${charNames} find themselves at a crossroads. The climax of the story approaches, bringing resolution to the central conflict.\n\nIn the end, the lessons learned and the bonds forged will determine the fate of ${locationNames} and all who dwell within.`;
            summary = 'The story reaches its climax and provides a satisfying resolution to the main conflict.';
        }

        return {
            id: crypto.randomUUID(),
            type,
            title: type === 'intro' ? 'Introduction' : type === 'ending' ? 'Conclusion' : `Chapter ${partIndex}`,
            content,
            summary,
            reviewScore: { tension: 50, drama: 50, sense: 70, emotion: 50, overall: 55 },
            order,
        };
    }

    /**
     * Create a basic summary from parts without calling LLM
     */
    private createBasicSummary(parts: StoryPart[], params: StoryGenerationParams): string {
        const chapterCount = parts.filter(p => p.type === 'chapter').length;
        return `A ${params.length} ${params.genre?.join(', ') || 'fantasy'} story with ${params.tone?.join(', ') || 'adventurous'} tone. ` +
            `The story features ${chapterCount} chapters following the introduction and ending. ` +
            `Key themes and elements from the ${params.genre?.[0] || 'fantasy'} genre are explored.`;
    }

    /**
     * Generates a single story part
     */
    private async generatePart(options: {
        type: 'intro' | 'chapter' | 'ending';
        params: StoryGenerationParams;
        previousSummary: string;
        order: number;
        partIndex?: number;
    }): Promise<StoryPart> {
        const { type, params, previousSummary, order, partIndex } = options;

        const basePrompt = this.getPartPrompt(type, params, previousSummary, partIndex);

        let content = '';
        try {
            content = await retryWithBackoff(async () => {
                const { getLLMService } = await import('./llmService');
                const llmService = getLLMService();

                const response = await llmService.generateText(basePrompt, {
                    temperature: 0.8,
                    maxTokens: 1500,
                });

                if (!response || response.trim().length === 0) throw new Error('Empty response');
                return response.trim();
            }, 2);
        } catch (error) {
            console.error('[StoryWeaver] LLM generation failed for part:', type, error);
            throw error;
        }

        // Total Recall: Analyze for memory
        const { projectMemory } = await import('./ProjectMemoryService');
        projectMemory.analyzeForMemory(content, `Story Generation: ${type} ${partIndex || ''}`);

        let scores;
        try {
            scores = await storyReviewer.reviewPart(content, { genre: params.genre, tone: params.tone });
        } catch {
            scores = { tension: 50, drama: 50, sense: 70, emotion: 50, overall: 55 };
        }

        let summary = '';
        try {
            summary = await generateStorySummary(content);
        } catch {
            summary = content.substring(0, 200) + '...';
        }

        return {
            id: crypto.randomUUID(),
            type,
            title: type === 'intro' ? 'Introduction' : type === 'ending' ? 'Conclusion' : `Chapter ${partIndex}`,
            content,
            summary,
            reviewScore: scores,
            order,
        };
    }

    private getPartPrompt(type: string, params: StoryGenerationParams, previousSummary: string, partIndex?: number): string {
        const contextStr = previousSummary ? `\n\nPreviously in the story:\n${previousSummary}` : '';
        const workingContext = useMemoryStore.getState().workingContext;

        let instructions = '';
        if (type === 'intro') {
            instructions = 'Establish the setting, introduce characters, and set the initial conflict.';
        } else if (type === 'chapter') {
            instructions = `Develop the plot further (Chapter ${partIndex}). Escalate tension and evolve character relationships.`;
        } else if (type === 'ending') {
            instructions = 'Reach the climax and provide a satisfying resolution for the main conflict.';
        }

        return `
You are writing a story in the following style:
Genre: ${params.genre?.join(', ') || 'fantasy'}
Tone: ${params.tone?.join(', ') || 'adventurous'}

[LIVING PROJECT PROTOCOL]
${workingContext}

Instructions: ${instructions}${contextStr}

World Context:
${JSON.stringify(params.worldContext)}

Character Context:
${params.characters?.map((c: any) => `- ${c.name}: ${c.description || c.role}`).join('\n') || ''}

Location Context:
${params.locations?.map((l: any) => `- ${l.name}: ${l.description || l.type}`).join('\n') || ''}

Write the next part of the story. Output only the story content, no meta-commentary.
`;
    }
}

export const storyWeaver = new StoryWeaver();

