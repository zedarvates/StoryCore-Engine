/**
 * CineProductionAPI Service
 * 
 * Communication with the High-Fidelity Cinematic Production API.
 * Handles workflows like Image -> Video -> Audio with context-aware prompting.
 */

import { BACKEND_URL } from '../config/apiConfig';

export type CineChainType = 'generate_scene' | 'music_pro' | 'one_character' | 'storyboard_only' | 'audio_remix';

export interface CineProductionRequest {
    projectId: string;
    chainType: CineChainType;
    sceneDescription: string;
    imagePrompt?: string;
    videoPrompt?: string;
    audioPrompt?: string;
    genre?: string;
    style?: string;
    tone?: string;
    overrides?: Record<string, any>;
}

export interface CineProductionJob {
    jobId: string;
    request: CineProductionRequest;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    results: Array<{
        step: string;
        output: any;
    }>;
    error?: string;
    startTime: string;
    endTime?: string;
}

export interface WorkflowInfo {
    id: string;
    name: string;
    description: string;
    isCustom: boolean;
}

class CineProductionAPI {
    private baseUrl: string;

    constructor() {
        this.baseUrl = (import.meta.env.VITE_BACKEND_URL || BACKEND_URL) + '/api/cine-production';
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Start a new production job
     */
    async startProduction(request: CineProductionRequest): Promise<{ jobId: string }> {
        return this.request<{ jobId: string }>('/start', {
            method: 'POST',
            body: JSON.stringify(request),
        });
    }

    /**
     * Get production job status and results
     */
    async getJob(jobId: string): Promise<CineProductionJob> {
        return this.request<CineProductionJob>(`/job/${jobId}`);
    }

    /**
     * Get list of available production workflows
     */
    async listWorkflows(): Promise<WorkflowInfo[]> {
        return this.request<WorkflowInfo[]>('/workflows');
    }

    /**
     * Monitor a job until completion
     */
    async monitorJob(
        jobId: string,
        onProgress?: (progress: number, step?: string) => void,
        intervalMs: number = 2000
    ): Promise<CineProductionJob> {
        return new Promise((resolve, reject) => {
            const poll = async () => {
                try {
                    const job = await this.getJob(jobId);

                    if (onProgress) {
                        const lastStep = job.results.length > 0 ? job.results[job.results.length - 1].step : undefined;
                        onProgress(job.progress, lastStep);
                    }

                    if (job.status === 'completed') {
                        resolve(job);
                    } else if (job.status === 'failed') {
                        reject(new Error(job.results.find(r => r.step === 'error')?.output || 'Job failed'));
                    } else {
                        setTimeout(poll, intervalMs);
                    }
                } catch (error) {
                    reject(error);
                }
            };
            poll();
        });
    }
}

export const cineProductionAPI = new CineProductionAPI();
export default cineProductionAPI;
