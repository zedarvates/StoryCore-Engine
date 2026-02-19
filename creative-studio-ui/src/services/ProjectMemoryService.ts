/**
 * Project Memory Service
 * Inspired by davegoldblatt/total-recall
 * 
 * Logic for the "Write Gate" and "Active Recall" synthesis.
 */

import { ollamaClient } from './llm/OllamaClient';
import { useMemoryStore, MemoryInsight } from '@/stores/memoryStore';

export class ProjectMemoryService {
    private static instance: ProjectMemoryService;

    private constructor() { }

    public static getInstance() {
        if (!ProjectMemoryService.instance) {
            ProjectMemoryService.instance = new ProjectMemoryService();
        }
        return ProjectMemoryService.instance;
    }

    /**
     * Analyzes a piece of content (chat, advice, result) to see if it should pass the "Write Gate".
     * If high confidence, it auto-logs it.
     */
    public async analyzeForMemory(text: string, source: string): Promise<void> {
        const store = useMemoryStore.getState();

        const systemPrompt = `You are a Memory Management Agent. 
        Analyze the following text to extract "Stable Project Insights".
        
        CRITERIA FOR MEMORY:
        1. Is it a style preference? (e.g., "Use high contrast")
        2. Is it a key decision? (e.g., "Character X is actually a spy")
        3. Is it a correction of a previous error?
        4. Is it a stable fact about the world?

        If it matches, output a JSON array of insights: [{ "text": "...", "category": "CREATIVE_STYLE" | "CHARACTER_INSIGHT" | "PRODUCTION_RULE" | "PROJECT_LORE" | "TECHNICAL_CONSTRAINT" | "USER_PREFERENCE", "confidence": 0.9 }]
        If no insight found, output exactly: []`;

        try {
            const response = await ollamaClient.generate('llama3', `${systemPrompt}\n\nText to analyze: ${text}`, { temperature: 0.1 });
            const jsonStr = response.match(/\[.*\]/s)?.[0];

            if (jsonStr) {
                const results = JSON.parse(jsonStr);
                results.forEach((res: any) => {
                    store.addInsight({
                        text: res.text,
                        category: res.category,
                        confidence: res.confidence,
                        isPermanent: false,
                        source
                    });
                });
            }
        } catch (e) {
            console.error('[MemoryService] Failed to analyze text for memory:', e);
        }
    }

    /**
     * Distills permanent insights and recent logs into a new Working Context.
     * Equivalent to updating the "CLAUDE.local.md" in Total Recall.
     */
    public async refreshWorkingContext(): Promise<void> {
        const store = useMemoryStore.getState();
        const importantInsights = store.insights.filter(i => i.isPermanent || i.confidence > 0.8);

        if (importantInsights.length === 0) return;

        const systemPrompt = `Synthesize these disconnected project memory points into a 
        concise "Living Project Protocol". This protocol will be used to guide the next production steps.
        
        Format: Markdown list. Be extremely dense and specific.`;

        const inputs = importantInsights.map(i => `[${i.category}] ${i.text}`).join('\n');

        try {
            const summary = await ollamaClient.generate('llama3', `${systemPrompt}\n\nInsights:\n${inputs}`, { temperature: 0.3 });
            store.updateWorkingContext(summary);
        } catch (e) {
            console.error('[MemoryService] Failed to refresh working context:', e);
        }
    }

    /**
     * Gets a subset of insights relevant to a specific query/topic.
     * Useful for targeted recall when the protocol is too broad.
     */
    public async getRelevantInsights(query: string, limit: number = 5): Promise<MemoryInsight[]> {
        const store = useMemoryStore.getState();
        const allInsights = store.insights;

        if (allInsights.length === 0) return [];

        const systemPrompt = `You are a Retrieval Augmented Memory Agent.
        Given the user's query and a list of project insights, identify the ${limit} most relevant ones.
        
        QUERY: ${query}
        
        Output only a JSON array of the original insight text strings.`;

        const inputs = allInsights.map(i => i.text).join('\n---\n');

        try {
            const response = await ollamaClient.generate('llama3', `${systemPrompt}\n\nInsights:\n${inputs}`, { temperature: 0.1 });
            const jsonStr = response.match(/\[.*\]/s)?.[0];

            if (jsonStr) {
                const relevantTexts = JSON.parse(jsonStr);
                return allInsights.filter(i => relevantTexts.includes(i.text)).slice(0, limit);
            }
        } catch (e) {
            console.error('[MemoryService] Failed to retrieve relevant insights:', e);
        }

        return allInsights.slice(0, limit); // Fallback
    }
}

export const projectMemory = ProjectMemoryService.getInstance();
