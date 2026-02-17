import cineProductionAPI, { CineProductionRequest, CineProductionJob } from './cineProductionAPI';

export interface WanGenerationParams {
    projectId: string;
    sceneId: string;
    sceneDescription: string;
    imagePrompt?: string;
    videoPrompt?: string;
    audioPrompt?: string;
    style?: string;
    width?: number;
    height?: number;
}

class WanVideoService {
    /**
     * Generates a cinematic sequence using Wan 2.1
     */
    async generateSequence(params: WanGenerationParams, onProgress?: (progress: number, step?: string) => void): Promise<CineProductionJob> {
        const request: CineProductionRequest = {
            projectId: params.projectId,
            chainType: 'generate_scene', // This triggers the Storyboard -> Wan -> Audio chain
            sceneDescription: params.sceneDescription,
            imagePrompt: params.imagePrompt,
            videoPrompt: params.videoPrompt,
            audioPrompt: params.audioPrompt,
            style: params.style || 'Photorealistic Cinematic',
            overrides: {
                width: params.width || 1280,
                height: params.height || 720
            }
        };

        const { jobId } = await cineProductionAPI.startProduction(request);
        return cineProductionAPI.monitorJob(jobId, onProgress);
    }

    /**
     * Generates just the video from an image using Wan 2.1 I2V
     */
    async generateVideoFromImage(
        projectId: string,
        imagePath: string,
        prompt: string,
        onProgress?: (progress: number, step?: string) => void
    ): Promise<CineProductionJob> {
        const request: CineProductionRequest = {
            projectId,
            chainType: 'generate_scene', // Or a more specific I2V chain if we define one
            sceneDescription: prompt,
            imagePrompt: prompt,
            videoPrompt: prompt,
            overrides: {
                image: imagePath
            }
        };

        const { jobId } = await cineProductionAPI.startProduction(request);
        return cineProductionAPI.monitorJob(jobId, onProgress);
    }
}

export const wanVideoService = new WanVideoService();
export default wanVideoService;
