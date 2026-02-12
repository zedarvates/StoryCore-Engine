/**
 * Lottie Service
 * ME2: Lottie Integration - Support for Lottie animations
 */

import { 
  LottieAnimation, 
  LottiePlaybackSettings, 
  LottieLayer,
  LottieConfig 
} from '../types/lottie';

interface LottieServiceConfig {
  renderer: 'svg' | 'canvas' | 'html';
  progressiveLoad: boolean;
  hardwareAcceleration: boolean;
}

class LottieService {
  private config: LottieServiceConfig;
  private loadedAnimations: Map<string, LottieAnimation> = new Map();
  private animationInstances: Map<string, any> = new Map();

  constructor(config?: Partial<LottieServiceConfig>) {
    this.config = {
      renderer: 'svg',
      progressiveLoad: true,
      hardwareAcceleration: true,
      ...config,
    };
  }

  /**
   * Load a Lottie animation from a URL
   */
  async loadAnimation(url: string, id: string): Promise<LottieAnimation | null> {
    try {
      const response = await fetch(url);
      const data = await response.json();
      const animation = this.parseLottieJSON(data, id, url);
      
      this.loadedAnimations.set(id, animation);
      return animation;
    } catch (error) {
      console.error('Failed to load Lottie animation:', error);
      return null;
    }
  }

  /**
   * Parse Lottie JSON format into our internal representation
   */
  private parseLottieJSON(data: unknown, id: string, url: string): LottieAnimation {
    const layers = this.parseLayers(data.layers || []);
    const assets = this.parseAssets(data.assets || []);
    
    return {
      id,
      name: data.nm || 'Untitled Animation',
      description: '',
      url,
      width: data.w || 1920,
      height: data.h || 1080,
      duration: this.calculateDuration(data),
      frameRate: data.fr || 30,
      totalFrames: data.ip?.length || 0,
      layers,
      assets,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: data.copyright || 'Unknown',
        version: data.v || '1.0.0',
        keywords: [],
        category: 'custom',
      },
    };
  }

  private parseLayers(layersData: unknown[]): LottieLayer[] {
    return layersData.map((layer, index) => ({
      id: layer.refId || `layer-${index}`,
      name: layer.nm || `Layer ${index + 1}`,
      type: this.mapLayerType(layer.ty),
      startFrame: layer.ip?.[0] || 0,
      endFrame: layer.op?.[0] || 0,
      duration: layer.dd || 0,
      inPoint: layer.ip?.[0] || 0,
      outPoint: layer.op?.[0] || 0,
      transform: {
        anchorPoint: layer.ks?.a || [0, 0],
        position: layer.ks?.p || [0, 0],
        scale: layer.ks?.s || [100, 100],
        rotation: layer.ks?.r || 0,
      },
      opacity: layer.ks?.o?.k || 100,
      isEnabled: layer.hidden !== true,
      parentId: layer.parent,
    }));
  }

  private mapLayerType(type: number): LottieLayer['type'] {
    const typeMap: Record<number, LottieLayer['type']> = {
      0: 'precomposition',
      1: 'solid',
      2: 'shape',
      3: 'null',
      4: 'text',
      5: 'image',
      6: 'audio',
    };
    return typeMap[type] || 'null';
  }

  private parseAssets(assetsData: unknown[]): unknown[] {
    return assetsData.map((asset, index) => ({
      id: asset.id || `asset-${index}`,
      type: this.mapAssetType(asset.ty),
      url: asset.p || '',
      name: asset.nm || `Asset ${index + 1}`,
      width: asset.w,
      height: asset.h,
    }));
  }

  private mapAssetType(type: number): 'image' | 'audio' | 'precomposition' {
    const typeMap: Record<number, 'image' | 'audio' | 'precomposition'> = {
      2: 'image',
      6: 'audio',
      0: 'precomposition',
    };
    return typeMap[type] || 'image';
  }

  private calculateDuration(data: unknown): number {
    const frameRate = data.fr || 30;
    const totalFrames = (data.op?.[0] || 0) - (data.ip?.[0] || 0);
    return totalFrames / frameRate;
  }

  /**
   * Create a Lottie animation instance for rendering
   */
  createInstance(
    container: HTMLElement, 
    animation: LottieAnimation,
    config?: Partial<LottieConfig>
  ): unknown {
    // This would typically use lottie-web library
    // For now, return a mock instance
    const instance = {
      id: animation.id,
      container,
      animation,
      config: {
        animationId: animation.id,
        playback: {
          autoplay: true,
          loop: true,
          loopCount: 0,
          speed: 1,
          direction: 'forward',
          startFrame: 0,
          endFrame: animation.totalFrames,
          goToFrame: 0,
        },
        renderer: 'svg',
        renderingSettings: {
          preserveAspectRatio: 'xMidYMid meet',
          progressiveLoad: true,
          hardwareAcceleration: true,
        },
        ...config,
      },
      
      play: () => {},
      pause: () => {},
      stop: () => {},
      goToFrame: (frame: number) => {},
      setSpeed: (speed: number) => {},
      setDirection: (direction: 'forward' | 'reverse') => {},
      destroy: () => {},
    };
    
    this.animationInstances.set(animation.id, instance);
    return instance;
  }

  /**
   * Get loaded animation by ID
   */
  getAnimation(id: string): LottieAnimation | undefined {
    return this.loadedAnimations.get(id);
  }

  /**
   * Unload an animation
   */
  unloadAnimation(id: string): void {
    const instance = this.animationInstances.get(id);
    if (instance) {
      instance.destroy();
      this.animationInstances.delete(id);
    }
    this.loadedAnimations.delete(id);
  }

  /**
   * Get all loaded animations
   */
  getLoadedAnimations(): LottieAnimation[] {
    return Array.from(this.loadedAnimations.values());
  }

  /**
   * Export animation as JSON
   */
  exportAsJSON(animationId: string): string | null {
    const animation = this.loadedAnimations.get(animationId);
    if (!animation) return null;
    
    return JSON.stringify({
      v: animation.metadata.version,
      fr: animation.frameRate,
      ip: [0, animation.totalFrames],
      op: [animation.totalFrames, animation.totalFrames + 30],
      w: animation.width,
      h: animation.height,
      nm: animation.name,
      layers: animation.layers.map((layer, index) => ({
        refId: layer.id,
        nm: layer.name,
        ty: this.reverseMapLayerType(layer.type),
        ip: [layer.inPoint, layer.inPoint],
        op: [layer.outPoint, layer.outPoint + 30],
        ddd: 0,
        ks: {
          a: layer.transform.anchorPoint,
          p: layer.transform.position,
          s: layer.transform.scale,
          r: layer.transform.rotation,
          o: { k: layer.opacity },
        },
        parent: layer.parentId,
      })),
      assets: animation.assets,
    }, null, 2);
  }

  private reverseMapLayerType(type: LottieLayer['type']): number {
    const typeMap: Record<LottieLayer['type'], number> = {
      precomposition: 0,
      solid: 1,
      shape: 2,
      null: 3,
      text: 4,
      image: 5,
      audio: 6,
    };
    return typeMap[type] || 3;
  }
}

export const lottieService = new LottieService();
export default LottieService;


