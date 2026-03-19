/**
 * Recursive Language Model (RLM) Service for StoryCore
 * Inspired by alexzhang13/rlm
 * 
 * This service enables the LLM to recursively call itself, manage sub-tasks,
 * and interact with a virtual sandbox context to handle complex cinematic logic.
 */

import { ollamaClient } from './llm/OllamaClient';
import { useMemoryStore } from '@/stores/memoryStore';
import { BACKEND_URL } from '@/config/apiConfig';

export interface RLMVariable {
    id: string;
    value: unknown;
    description: string;
}

export interface RLMTrajectoryStep {
    depth: number;
    task: string;
    thought?: string;
    action?: string;
    result?: string;
    timestamp: number;
}

export interface RLMSession {
    id: string;
    sandbox: Record<string, RLMVariable>;
    trajectory: RLMTrajectoryStep[];
    maxDepth: number;
}

export interface LoreNode {
    name: string;
    type: string;
    attributes: Record<string, unknown>;
}

export interface LoreEdge {
    source: string;
    relation: string;
    target: string;
    scene_context?: string;
}

export interface LoreGraph {
    nodes: LoreNode[];
    edges: LoreEdge[];
    stats: Record<string, number>;
}

export class RecursiveReasoningService {
    private static instance: RecursiveReasoningService;

    private constructor() { }

    public static getInstance() {
        if (!RecursiveReasoningService.instance) {
            RecursiveReasoningService.instance = new RecursiveReasoningService();
        }
        return RecursiveReasoningService.instance;
    }

    /**
     * Executes a recursive reasoning task.
     * The LLM can use specific tags to manage state or call sub-tasks.
     * 
     * Tags supported:
     * <reasoning> logic details </reasoning>
     * <sandbox_set key="K" value="V" desc="D"/>
     * <sandbox_get key="K"/>
     * <subtask task="T" input="I"/>
     */
    public async executeTask(
        task: string,
        model: string | null = null,
        session?: RLMSession,
        depth: number = 0
    ): Promise<{ response: string; trajectory: RLMTrajectoryStep[] }> {
        const currentSession = session || this.createSession();
        const modelToUse = model || await ollamaClient.getBestAvailableModel('storytelling');

        if (depth > currentSession.maxDepth) {
            return {
                response: "ERROR: Recursive depth exceeded.",
                trajectory: currentSession.trajectory
            };
        }

        // Build prompt with sandbox awareness
        const sandboxState = Object.entries(currentSession.sandbox)
            .map(([k, v]) => `- ${k}: ${JSON.stringify(v.value)} (${v.description})`)
            .join('\n');

        const workingContext = useMemoryStore.getState().workingContext;

        const systemPrompt = `You are a Recursive Language Model (RLM) Agent for StoryCore.
Current Depth: ${depth} / ${currentSession.maxDepth}

[RECURSIVE PROTOCOLS]
1. <reasoning>...</reasoning>: Internal thought process.
2. <sandbox_set key="K" value="V" desc="D"/>: Store information for future sub-calls.
3. <sandbox_get key="K"/>: Request the value of an existing variable.
4. <subtask task="T" input="I"/>: Delegate a specific part of the problem to a sub-call.

[PROJECT PROTOCOLS / MEMORY]
${workingContext || "No specific protocols established yet."}

[SANDBOX STATE]
${sandboxState || "Sandbox is empty."}

Analyze the task. You can solve it immediately or use sub-tasks.
If you use a <subtask>, the execution will halt and resume with the result.`;

        const response = await ollamaClient.generate(modelToUse, `${systemPrompt}\n\nTask: ${task}`, { temperature: 0.7 });

        // Handle Subtasks and Sandbox updates
        const processedResponse = await this.processResponse(response, modelToUse, currentSession, depth, task);
        return { response: processedResponse, trajectory: currentSession.trajectory };
    }

    private async processResponse(
        content: string,
        model: string,
        session: RLMSession,
        depth: number,
        originalTask: string
    ): Promise<string> {
        // Log the reasoning
        const thought = content.match(/<reasoning>([\s\S]*?)<\/reasoning>/)?.[1] || "No explicit reasoning tags used.";

        // 1. Check for sandbox updates
        const setMatches = content.matchAll(/<sandbox_set key="([^"]+)" value="([^"]+)" desc="([^"]+)"\/>/g);
        for (const match of setMatches) {
            session.sandbox[match[1]] = {
                id: match[1],
                value: match[2],
                description: match[3]
            };
        }

        // 2. Check for subtasks
        const subtaskMatch = content.match(/<subtask task="([^"]+)" input="([^"]+)"\/>/);
        if (subtaskMatch) {
            const subTaskTitle = subtaskMatch[1];
            const subTaskInput = subtaskMatch[2];

            session.trajectory.push({
                depth,
                task: originalTask,
                thought,
                action: `Delegating: ${subTaskTitle}`,
                timestamp: Date.now()
            });

            const { response: subResult } = await this.executeTask(
                `Subtask: ${subTaskTitle}. Input: ${subTaskInput}`,
                model,
                session,
                depth + 1
            );

            // Re-feed the result to the LLM to finalize
            const finalPrompt = `Original Task context: ${content}\n\nSubtask result for "${subTaskTitle}": ${subResult}\n\nPlease provide the final answer to the original task based on this new information.`;
            const finalResponse = await ollamaClient.generate(model, finalPrompt, { temperature: 0.5 });

            session.trajectory.push({
                depth,
                task: originalTask,
                result: finalResponse,
                timestamp: Date.now()
            });

            return finalResponse;
        }

        session.trajectory.push({
            depth,
            task: originalTask,
            thought,
            result: content,
            timestamp: Date.now()
        });

        return content;
    }

    private createSession(): RLMSession {
        return {
            id: crypto.randomUUID(),
            sandbox: {},
            trajectory: [],
            maxDepth: 3
        };
    }

    /**
     * Calls the backend Python RLM Engine.
     * This leverages the full AST sandbox and GraphRAG.
     */
    public async generateRLM(
        prompt: string, 
        massiveContext: string = "",
        llmProvider?: string,
        llmModel?: string
    ): Promise<{ final_answer: string; steps: any[] }> {
        const response = await fetch(`${BACKEND_URL}/api/v1/generate/rlm/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt,
                massive_context: massiveContext,
                llm_provider: llmProvider,
                llm_model: llmModel
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.detail || 'RLM Engine Error');
        }

        const data = await response.json();
        return {
            final_answer: data.final_answer,
            steps: data.steps || []
        };
    }

    /**
     * Fetches the full Story Knowledge Graph.
     */
    public async getLoreGraph(): Promise<LoreGraph> {
        const response = await fetch(`${BACKEND_URL}/api/v1/generate/rlm/graph`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch Knowledge Graph');
        }

        return await response.json();
    }

    /**
     * Fetches the narrative timeline from the Knowledge Graph.
     */
    public async getTimeline(): Promise<{ timeline: string }> {
        const response = await fetch(`${BACKEND_URL}/api/v1/generate/rlm/graph/timeline`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch timeline');
        }

        return await response.json();
    }

    /**
     * Fetches a specific character's narrative arc.
     */
    public async getCharacterArc(characterName: string): Promise<{ arc: string }> {
        const response = await fetch(`${BACKEND_URL}/api/v1/generate/rlm/graph/arc/${encodeURIComponent(characterName)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch arc for ${characterName}`);
        }

        return await response.json();
    }
}

export const rlmService = RecursiveReasoningService.getInstance();
