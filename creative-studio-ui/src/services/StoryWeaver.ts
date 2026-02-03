import type { Story, StoryPart, StoryGenerationParams, GenerationProgress } from '../types/story';
import { storyReviewer } from './StoryReviewer';
import { generateStoryContent, generateStorySummary, retryWithBackoff } from './storyGenerationService';

/**
 * StoryWeaver service
 * Orchestrates multi-part story generation with iterative refinement
 */
export class StoryWeaver {
    /**
     * Generates a complete story iteratively
     * @param params Generation parameters
     * @param onProgress Progress callback
     * @returns The complete story
     */
    async weaveStory(
        params: StoryGenerationParams,
        onProgress?: (progress: GenerationProgress) => void
    ): Promise<Partial<Story>> {
        const parts: StoryPart[] = [];
        const numChapters = params.length === 'short' ? 1 : params.length === 'medium' ? 3 : 5;
        let runningSummaryData = '';

        // 1. Generate Intro
        onProgress?.({
            stage: 'generating_intro',
            progress: 5,
            currentTask: 'Generating story introduction...',
        });

        const intro = await this.generatePart({
            type: 'intro',
            params,
            previousSummary: '',
            order: 1,
        });
        parts.push(intro);
        runningSummaryData = intro.summary;

        // 2. Generate Chapters
        for (let i = 0; i < numChapters; i++) {
            const chapterNum = i + 1;
            const progressBase = 10 + (i / numChapters) * 70;

            onProgress?.({
                stage: 'generating_chapter',
                progress: progressBase,
                currentTask: `Generating chapter ${chapterNum} of ${numChapters}...`,
                currentChapter: chapterNum,
                totalChapters: numChapters,
            });

            const chapter = await this.generatePart({
                type: 'chapter',
                params,
                previousSummary: runningSummaryData,
                order: parts.length + 1,
                partIndex: chapterNum,
            });
            parts.push(chapter);
            runningSummaryData = chapter.summary;
        }

        // 3. Generate Ending
        onProgress?.({
            stage: 'generating_ending',
            progress: 90,
            currentTask: 'Generating story conclusion...',
        });

        const ending = await this.generatePart({
            type: 'ending',
            params,
            previousSummary: runningSummaryData,
            order: parts.length + 1,
        });
        parts.push(ending);

        // Final Story Object
        const fullContent = parts.map(p => `### ${p.title}\n\n${p.content}`).join('\n\n');
        const finalSummary = await generateStorySummary(fullContent);

        return {
            title: params.totalTitle || 'Untitled Story',
            content: fullContent,
            summary: finalSummary,
            parts,
            updatedAt: new Date(),
        };
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

        // Generate content
        const content = await retryWithBackoff(async () => {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(basePrompt, {
                temperature: 0.8,
                maxTokens: 1500,
            });

            if (!response || response.trim().length === 0) throw new Error('Empty response');
            return response.trim();
        });

        // Review content
        const scores = await storyReviewer.reviewPart(content, { genre: params.genre, tone: params.tone });

        // Generate summary of this part for next part context
        const summary = await generateStorySummary(content);

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
Genre: ${params.genre.join(', ')}
Tone: ${params.tone.join(', ')}

Instructions: ${instructions}${contextStr}

World Context:
${JSON.stringify(params.worldContext)}

Character Context:
${params.characters.map((c: any) => `- ${c.name}: ${c.description || c.role}`).join('\n')}

Location Context:
${params.locations.map((l: any) => `- ${l.name}: ${l.description || l.type}`).join('\n')}

Write the next part of the story. Output only the story content, no meta-commentary.
`;
    }
}

export const storyWeaver = new StoryWeaver();
