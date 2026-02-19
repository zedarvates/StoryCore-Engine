// ============================================================================
// Video Scenario Generation Service
// ============================================================================
// This service handles generation of video scenarios from stories
// including dialogues, sequences, shots, and production elements
// ============================================================================

import type { Story, StoryPart } from '../types/story';
import type { VideoScenario, Sequence, Shot, Dialogue, ProductionElement } from '../types/videoScenario';

// ============================================================================
// Type Definitions
// ============================================================================

export interface VideoScenarioGenerationParams {
    story: Story;
    includeDialogues: boolean;
    includeSequences: boolean;
    includeShots: boolean;
    includeLyrics: boolean;
    shotStyle: 'cinematic' | 'documentary' | 'animation' | 'mixed';
    dialogueStyle: 'natural' | 'dramatic' | 'minimal';
}

// ============================================================================
// Video Scenario Generation Service
// ============================================================================

export class VideoScenarioService {
    /**
     * Generate complete video scenario from story
     */
    async generateVideoScenario(
        params: VideoScenarioGenerationParams,
        onProgress?: (progress: { stage: string; progress: number; currentTask: string }) => void
    ): Promise<VideoScenario> {
        const { story } = params;
        const sequences: Sequence[] = [];
        const dialogues: Dialogue[] = [];
        const productionElements: ProductionElement[] = [];

        // 1. Generate sequences from story parts
        onProgress?.({
            stage: 'generating_sequences',
            progress: 20,
            currentTask: 'Analyzing story structure...'
        });

        const storySequences = await this.generateSequencesFromStory(story, params);
        sequences.push(...storySequences);

        // 2. Generate dialogues if requested
        if (params.includeDialogues) {
            onProgress?.({
                stage: 'generating_dialogues',
                progress: 40,
                currentTask: 'Creating character dialogues...'
            });

            const storyDialogues = await this.generateDialoguesFromStory(story, params);
            dialogues.push(...storyDialogues);
        }

        // 3. Generate shots for each sequence
        if (params.includeShots) {
            onProgress?.({
                stage: 'generating_shots',
                progress: 60,
                currentTask: 'Planning camera shots...'
            });

            for (let i = 0; i < sequences.length; i++) {
                const sequence = sequences[i];
                const sequenceShots = await this.generateShotsForSequence(sequence, params);
                sequence.shots = sequenceShots;
            }
        }

        // 4. Generate production elements
        onProgress?.({
            stage: 'generating_elements',
            progress: 80,
            currentTask: 'Planning production elements...'
        });

        const elements = await this.generateProductionElements(story, params);
        productionElements.push(...elements);

        // 5. Complete
        onProgress?.({
            stage: 'complete',
            progress: 100,
            currentTask: 'Video scenario generation complete!'
        });

        return {
            id: crypto.randomUUID(),
            title: `${story.title} - Video Scenario`,
            storyId: story.id,
            sequences,
            dialogues,
            productionElements,
            metadata: {
                includeDialogues: params.includeDialogues,
                includeSequences: params.includeSequences,
                includeShots: params.includeShots,
                includeLyrics: params.includeLyrics,
                shotStyle: params.shotStyle,
                dialogueStyle: params.dialogueStyle,
                generatedAt: Date.now(),
            }
        };
    }

    /**
     * Generate sequences from story parts
     */
    private async generateSequencesFromStory(
        story: Story,
        params: VideoScenarioGenerationParams
    ): Promise<Sequence[]> {
        const sequences: Sequence[] = [];

        if (story.parts && story.parts.length > 0) {
            // Convert each story part to a sequence
            for (let i = 0; i < story.parts.length; i++) {
                const part = story.parts[i];
                const sequence = await this.createSequenceFromPart(part, i + 1, params);
                sequences.push(sequence);
            }
        } else {
            // Create a single sequence from the main content
            const sequence = await this.createSequenceFromContent(story, 1, params);
            sequences.push(sequence);
        }

        return sequences;
    }

    /**
     * Create sequence from story part
     */
    private async createSequenceFromPart(
        part: StoryPart,
        order: number,
        params: VideoScenarioGenerationParams
    ): Promise<Sequence> {
        const prompt = this.buildSequencePrompt(part, params);

        try {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1000,
            });

            return this.parseSequenceResponse(response, part, order);
        } catch (error) {
            console.error('[VideoScenarioService] Failed to generate sequence:', error);
            return this.createFallbackSequence(part, order);
        }
    }

    /**
     * Create sequence from story content
     */
    private async createSequenceFromContent(
        story: Story,
        order: number,
        params: VideoScenarioGenerationParams
    ): Promise<Sequence> {
        const prompt = this.buildContentSequencePrompt(story, params);

        try {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1500,
            });

            return this.parseContentSequenceResponse(response, story, order);
        } catch (error) {
            console.error('[VideoScenarioService] Failed to generate content sequence:', error);
            return this.createFallbackContentSequence(story, order);
        }
    }

    /**
     * Generate dialogues from story
     */
    private async generateDialoguesFromStory(
        story: Story,
        params: VideoScenarioGenerationParams
    ): Promise<Dialogue[]> {
        const dialogues: Dialogue[] = [];

        const prompt = this.buildDialoguePrompt(story, params);

        try {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(prompt, {
                temperature: 0.8,
                maxTokens: 2000,
            });

            return this.parseDialogueResponse(response, story);
        } catch (error) {
            console.error('[VideoScenarioService] Failed to generate dialogues:', error);
            return [];
        }
    }

    /**
     * Generate shots for a sequence
     */
    private async generateShotsForSequence(
        sequence: Sequence,
        params: VideoScenarioGenerationParams
    ): Promise<Shot[]> {
        const prompt = this.buildShotPrompt(sequence, params);

        try {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1500,
            });

            return this.parseShotResponse(response, sequence);
        } catch (error) {
            console.error('[VideoScenarioService] Failed to generate shots:', error);
            return [];
        }
    }

    /**
     * Generate production elements
     */
    private async generateProductionElements(
        story: Story,
        params: VideoScenarioGenerationParams
    ): Promise<ProductionElement[]> {
        const prompt = this.buildProductionElementPrompt(story, params);

        try {
            const { getLLMService } = await import('./llmService');
            const llmService = getLLMService();

            const response = await llmService.generateText(prompt, {
                temperature: 0.7,
                maxTokens: 1000,
            });

            return this.parseProductionElementResponse(response, story);
        } catch (error) {
            console.error('[VideoScenarioService] Failed to generate production elements:', error);
            return [];
        }
    }

    // ============================================================================
    // Prompt Builders
    // ============================================================================

    private buildSequencePrompt(part: StoryPart, params: VideoScenarioGenerationParams): string {
        return `
Convert this story part into a video sequence plan:

Story Part: ${part.title}
Content: ${part.content.substring(0, 1000)}

Characters: ${part.type === 'intro' ? 'Introduction characters' : 'Main characters'}
Location: ${part.type === 'intro' ? 'Starting location' : 'Current location'}

Generate a sequence with:
- Sequence number and title
- Location description
- Time of day
- Main action/scene description
- Key visual elements
- Mood/atmosphere

Format as JSON with fields: sequenceNumber, title, location, timeOfDay, description, visualElements, mood
`;
    }

    private buildContentSequencePrompt(story: Story, params: VideoScenarioGenerationParams): string {
        return `
Convert this story into a video sequence plan:

Story: ${story.title}
Content: ${story.content.substring(0, 1500)}

Characters: ${story.charactersUsed.map(c => c.name).join(', ')}
Locations: ${story.locationsUsed.map(l => l.name).join(', ')}

Generate a sequence with:
- Sequence number and title
- Location description
- Time of day
- Main action/scene description
- Key visual elements
- Mood/atmosphere

Format as JSON with fields: sequenceNumber, title, location, timeOfDay, description, visualElements, mood
`;
    }

    private buildDialoguePrompt(story: Story, params: VideoScenarioGenerationParams): string {
        const style = params.dialogueStyle === 'natural' ? 'natural, realistic dialogue' :
            params.dialogueStyle === 'dramatic' ? 'dramatic, theatrical dialogue' :
                'minimal, essential dialogue';

        return `
Generate ${style} dialogues for this story:

Story: ${story.title}
Characters: ${story.charactersUsed.map(c => `${c.name} (${c.role})`).join(', ')}
Content: ${story.content.substring(0, 1500)}

Generate dialogues with:
- Character name
- Dialogue text
- Context/emotion
- Scene reference

Format as JSON array with fields: character, text, emotion, sceneReference

${params.includeLyrics ? 'Include song lyrics if appropriate for the story.' : ''}
`;
    }

    private buildShotPrompt(sequence: Sequence, params: VideoScenarioGenerationParams): string {
        const style = params.shotStyle === 'cinematic' ? 'cinematic, film-like shots' :
            params.shotStyle === 'documentary' ? 'documentary-style shots' :
                params.shotStyle === 'animation' ? 'animated shots' :
                    'mixed style shots';

        return `
Plan ${style} shots for this sequence:

Sequence: ${sequence.title}
Location: ${sequence.location}
Description: ${sequence.description}

Generate shots with:
- Shot number
- Shot type (wide, medium, close-up, etc.)
- Camera movement
- Framing
- Focus point
- Duration
- Purpose/meaning

Format as JSON array with fields: shotNumber, type, cameraMovement, framing, focusPoint, duration, purpose
`;
    }

    private buildProductionElementPrompt(story: Story, params: VideoScenarioGenerationParams): string {
        return `
Generate production elements for this video story:

Story: ${story.title}
Genre: ${story.genre.join(', ')}
Tone: ${story.tone.join(', ')}
Characters: ${story.charactersUsed.map(c => c.name).join(', ')}

Generate production elements with:
- Element type (music, sound effect, visual effect, etc.)
- Description
- Timing/scene reference
- Purpose/impact

Format as JSON array with fields: type, description, timing, purpose
`;
    }

    // ============================================================================
    // Response Parsers
    // ============================================================================

    private parseSequenceResponse(response: string, part: StoryPart, order: number): Sequence {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    id: crypto.randomUUID(),
                    sequenceNumber: parsed.sequenceNumber || order,
                    title: parsed.title || part.title,
                    location: parsed.location || 'Unknown Location',
                    timeOfDay: parsed.timeOfDay || 'Day',
                    description: parsed.description || part.summary || '',
                    visualElements: parsed.visualElements || [],
                    mood: parsed.mood || '',
                    shots: [],
                    duration: 0,
                    order,
                };
            }
        } catch (error) {
            console.error('[VideoScenarioService] Failed to parse sequence response:', error);
        }

        return this.createFallbackSequence(part, order);
    }

    private parseContentSequenceResponse(response: string, story: Story, order: number): Sequence {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    id: crypto.randomUUID(),
                    sequenceNumber: parsed.sequenceNumber || order,
                    title: parsed.title || story.title,
                    location: parsed.location || 'Unknown Location',
                    timeOfDay: parsed.timeOfDay || 'Day',
                    description: parsed.description || story.summary || '',
                    visualElements: parsed.visualElements || [],
                    mood: parsed.mood || '',
                    shots: [],
                    duration: 0,
                    order,
                };
            }
        } catch (error) {
            console.error('[VideoScenarioService] Failed to parse content sequence response:', error);
        }

        return this.createFallbackContentSequence(story, order);
    }

    private parseDialogueResponse(response: string, story: Story): Dialogue[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((d: any) => ({
                    id: crypto.randomUUID(),
                    character: d.character || 'Unknown',
                    text: d.text || '',
                    emotion: d.emotion || '',
                    sceneReference: d.sceneReference || '',
                    timestamp: '',
                }));
            }
        } catch (error) {
            console.error('[VideoScenarioService] Failed to parse dialogue response:', error);
        }

        return [];
    }

    private parseShotResponse(response: string, sequence: Sequence): Shot[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((s: any, index: number) => ({
                    id: crypto.randomUUID(),
                    shotNumber: s.shotNumber || index + 1,
                    type: s.type || 'medium',
                    cameraMovement: s.cameraMovement || '',
                    framing: s.framing || '',
                    focusPoint: s.focusPoint || '',
                    duration: s.duration || 5,
                    purpose: s.purpose || '',
                    sequenceId: sequence.id,
                }));
            }
        } catch (error) {
            console.error('[VideoScenarioService] Failed to parse shot response:', error);
        }

        return [];
    }

    private parseProductionElementResponse(response: string, story: Story): ProductionElement[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.map((e: any) => ({
                    id: crypto.randomUUID(),
                    type: e.type || 'visual',
                    description: e.description || '',
                    timing: e.timing || '',
                    purpose: e.purpose || '',
                    storyId: story.id,
                }));
            }
        } catch (error) {
            console.error('[VideoScenarioService] Failed to parse production element response:', error);
        }

        return [];
    }

    // ============================================================================
    // Fallback Generators
    // ============================================================================

    private createFallbackSequence(part: StoryPart, order: number): Sequence {
        return {
            id: crypto.randomUUID(),
            sequenceNumber: order,
            title: part.title,
            location: 'Unknown Location',
            timeOfDay: 'Day',
            description: part.summary || '',
            visualElements: [],
            mood: '',
            shots: [],
            duration: 0,
            order,
        };
    }

    private createFallbackContentSequence(story: Story, order: number): Sequence {
        return {
            id: crypto.randomUUID(),
            sequenceNumber: order,
            title: story.title,
            location: 'Unknown Location',
            timeOfDay: 'Day',
            description: story.summary || '',
            visualElements: [],
            mood: '',
            shots: [],
            duration: 0,
            order,
        };
    }
}

export const videoScenarioService = new VideoScenarioService();
