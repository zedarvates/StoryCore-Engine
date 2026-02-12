import type { StoryPart } from '../types/story';

/**
 * StoryReviewer service
 * Uses LLM to score story parts based on various criteria
 */
export class StoryReviewer {
    /**
     * Scores a story part
     * @param content The story content to review
     * @param context Additional context (genre, tone)
     * @returns Scores for different categories
     */
    async reviewPart(content: string, context: { genre: string[]; tone: string[] }): Promise<NonNullable<StoryPart['reviewScore']>> {
        const { getLLMService } = await import('./llmService');
        const llmService = getLLMService();

        const prompt = `
You are a professional literary critic and editor. Review the following story excerpt and provide scores (0-10) for the following criteria:

- **Tension**: How well does it build suspense or conflict?
- **Drama**: Are the stakes high and the emotions impactful?
- **Sense**: Does the logic hold up? Is it coherent with the established setting?
- **Emotion**: Does it evoke the intended feelings in the reader?

Genre: ${context.genre.join(', ')}
Tone: ${context.tone.join(', ')}

Content:
${content}

Output your review ONLY as a JSON object with the following structure:
{
  "tension": number,
  "drama": number,
  "sense": number,
  "emotion": number,
  "overall": number
}
`;

        try {
            const response = await llmService.generateText(prompt, {
                temperature: 0.3, // Lower temperature for more consistent evaluation
                maxTokens: 300,
            });

            // Extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Failed to parse reviewer response as JSON');
            }

            const scores = JSON.parse(jsonMatch[0]);

            // Ensure all fields are present and valid
            return {
                tension: this.validateScore(scores.tension),
                drama: this.validateScore(scores.drama),
                sense: this.validateScore(scores.sense),
                emotion: this.validateScore(scores.emotion),
                overall: this.validateScore(scores.overall),
            };
        } catch (error) {
            console.error('[StoryReviewer] Review failed:', error);
            // Return default middle scores on error to avoid blocking the workflow
            return {
                tension: 5,
                drama: 5,
                sense: 5,
                emotion: 5,
                overall: 5,
            };
        }
    }

    private validateScore(score: unknown): number {
        const n = Number(score);
        if (isNaN(n)) return 5;
        return Math.max(0, Math.min(10, n));
    }
}

export const storyReviewer = new StoryReviewer();

