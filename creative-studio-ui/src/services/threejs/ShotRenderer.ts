/**
 * Shot Renderer Service
 * 
 * Handles capturing renders from the Three.js viewport to be used as 
 * reference images for AI generation (img2img, img2video).
 */

import { threeJsService } from './ThreeJsService';

export interface RenderOptions {
    width?: number;
    height?: number;
    format?: 'image/png' | 'image/jpeg' | 'image/webp';
    quality?: number;
    mode?: 'color' | 'depth' | 'wireframe';
}

export class ShotRenderer {
    /**
     * Captures the current frame from the Three.js renderer
     * @param options Rendering options
     * @returns Data URL of the captured frame
     */
    static captureFrame(options: RenderOptions = {}): string {
        const renderer = threeJsService.getRenderer();
        const scene = threeJsService.getScene();
        const camera = threeJsService.getCamera();

        if (!renderer || !scene || !camera) {
            throw new Error('Three.js service not fully initialized for capture');
        }

        // Ensure we render the latest frame before capturing
        renderer.render(scene, camera);

        const canvas = renderer.domElement;
        const format = options.format || 'image/png';
        const quality = options.quality || 0.92;

        return canvas.toDataURL(format, quality);
    }

    /**
     * Captures the current frame as a Blob
     * Useful for uploading to a server or ComfyUI
     * @param options Rendering options
     * @returns Promise resolving to a Blob
     */
    static async captureBlob(options: RenderOptions = {}): Promise<Blob> {
        const renderer = threeJsService.getRenderer();
        const scene = threeJsService.getScene();
        const camera = threeJsService.getCamera();

        if (!renderer || !scene || !camera) {
            throw new Error('Three.js service not fully initialized for capture');
        }

        // Ensure we render the latest frame before capturing
        renderer.render(scene, camera);

        const canvas = renderer.domElement;
        const format = options.format || 'image/png';
        const quality = options.quality || 0.92;

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to create blob from canvas'));
                }
            }, format, quality);
        });
    }

    /**
     * Generates a "Depth Map" render for ControlNet
     * This is a simplified version - proper depth rendering requires a separate shader/render pass
     * but for the MVP, we can simulate it or just use the color render.
     * @returns Data URL of the depth map (placeholder)
     */
    static captureDepthMap(): string {
        // For now, reuse captureFrame. 
        // real depth would require scene.overrideMaterial = new MeshDepthMaterial()
        return this.captureFrame();
    }
}
