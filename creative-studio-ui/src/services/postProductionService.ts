import { CineProductionJob } from './cineProductionAPI';
import { BACKEND_URL } from '../config/apiConfig';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || BACKEND_URL) + '/api/post-production';
const CINE_API_BASE_URL = (import.meta.env.VITE_BACKEND_URL || BACKEND_URL) + '/api/cine-production';

export interface FrameExtractionResult {
    job_id: string;
    frames: string[];
}

class PostProductionService {
    /**
     * Extracts frames from a video
     */
    async extractFrames(videoFilename: string, fps: number = 1.0): Promise<FrameExtractionResult> {
        const response = await fetch(`${API_BASE_URL}/extract-frames`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                video_filename: videoFilename,
                fps
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to extract frames' }));
            throw new Error(error.detail || 'Failed to extract frames');
        }

        return response.json();
    }

    /**
     * Starts an audio remix (regeneration) job
     */
    async startAudioRemix(params: {
        projectId: string;
        sceneId: string;
        audioPrompt?: string;
        genre?: string;
        style?: string;
        tone?: string;
    }): Promise<{ job_id: string }> {
        const response = await fetch(`${CINE_API_BASE_URL}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chain_type: 'audio_remix',
                project_id: params.projectId,
                scene_id: params.sceneId,
                audio_prompt: params.audioPrompt,
                genre: params.genre,
                style: params.style,
                tone: params.tone
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Failed to start audio remix' }));
            throw new Error(error.detail || 'Failed to start audio remix');
        }

        const result = await response.json();
        // Backend returns jobId, frontend expects job_id or jobId? 
        // Let's check cine_production_api.py: response_model=str (returns just job_id as string) or JSON?
        // Wait, cine_production_api.py returns job_id as string.
        return typeof result === 'string' ? { job_id: result } : result;
    }

    /**
     * Monitor a cine production job (for audio remix)
     */
    async monitorJob(jobId: string, onProgress?: (p: number) => void): Promise<CineProductionJob> {
        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const response = await fetch(`${CINE_API_BASE_URL}/status/${jobId}`, {
                        headers: { 'Content-Type': 'application/json' }
                    });

                    if (!response.ok) throw new Error('Failed to get job status');

                    const job: CineProductionJob = await response.json();
                    if (onProgress) onProgress(job.progress || 0);

                    if (job.status === 'completed') {
                        resolve(job);
                    } else if (job.status === 'failed') {
                        reject(new Error(job.error || 'Job failed'));
                    } else {
                        setTimeout(checkStatus, 2000);
                    }
                } catch (err) {
                    reject(err);
                }
            };
            checkStatus();
        });
    }
}

export const postProductionService = new PostProductionService();
