/**
 * Recursive Language Model (RLM) Service for StoryCore
 * Inspired by alexzhang13/rlm
 * 
 * This service enables the LLM to recursively call itself, manage sub-tasks,
 * and interact with a virtual sandbox context to handle complex cinematic logic.
 */

import { ollamaClient } from './llm/OllamaClient';
import { useStore } from '@/store';
import { useAppStore } from '@/stores/useAppStore';
import { useMemoryStore } from '@/stores/memoryStore';

export interface RLMVariable {
    id: string;
    value: any;
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
        model: string = 'llama3',
        session?: RLMSession,
        depth: number = 0
    ): Promise<{ response: string; trajectory: RLMTrajectoryStep[] }> {
        const currentSession = session || this.createSession();

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

        const response = await ollamaClient.generate(model, `${systemPrompt}\n\nTask: ${task}`, { temperature: 0.7 });

        // Handle Subtasks and Sandbox updates
        const processedResponse = await this.processResponse(response, model, currentSession, depth, task);
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
}

export const rlmService = RecursiveReasoningService.getInstance();
