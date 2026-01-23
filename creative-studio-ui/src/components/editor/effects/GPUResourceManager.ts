import { Effect, EffectParameter } from './EffectsLibrary';

interface AppliedEffect extends Effect {
  enabled: boolean;
  order: number;
}

interface GPUResourceLimits {
  maxTextureSize: number;
  maxViewportDims: [number, number];
  maxRenderbufferSize: number;
  maxTextureUnits: number;
  maxFragmentUniformVectors: number;
  maxVertexUniformVectors: number;
}

interface GPUMemoryUsage {
  textures: number;
  framebuffers: number;
  shaders: number;
  buffers: number;
  totalMB: number;
}

interface PerformanceProfile {
  name: string;
  targetFPS: number;
  maxEffects: number;
  textureSize: number;
  shaderComplexity: 'low' | 'medium' | 'high';
  enableAntialiasing: boolean;
  powerPreference: 'low-power' | 'high-performance';
}

export class GPUResourceManager {
  private static instance: GPUResourceManager;
  private gl: WebGLRenderingContext | null = null;
  private limits: GPUResourceLimits | null = null;
  private memoryUsage: GPUMemoryUsage = {
    textures: 0,
    framebuffers: 0,
    shaders: 0,
    buffers: 0,
    totalMB: 0,
  };

  private performanceProfiles: PerformanceProfile[] = [
    {
      name: 'ultra-low',
      targetFPS: 15,
      maxEffects: 2,
      textureSize: 512,
      shaderComplexity: 'low',
      enableAntialiasing: false,
      powerPreference: 'low-power',
    },
    {
      name: 'low',
      targetFPS: 24,
      maxEffects: 4,
      textureSize: 720,
      shaderComplexity: 'low',
      enableAntialiasing: false,
      powerPreference: 'low-power',
    },
    {
      name: 'medium',
      targetFPS: 30,
      maxEffects: 6,
      textureSize: 1080,
      shaderComplexity: 'medium',
      enableAntialiasing: false,
      powerPreference: 'low-power',
    },
    {
      name: 'high',
      targetFPS: 45,
      maxEffects: 8,
      textureSize: 1440,
      shaderComplexity: 'medium',
      enableAntialiasing: true,
      powerPreference: 'high-performance',
    },
    {
      name: 'ultra-high',
      targetFPS: 60,
      maxEffects: 12,
      textureSize: 2160,
      shaderComplexity: 'high',
      enableAntialiasing: true,
      powerPreference: 'high-performance',
    },
  ];

  private currentProfile: PerformanceProfile = this.performanceProfiles[1]; // Default to 'low'
  private activeEffects: AppliedEffect[] = [];
  private resourcePool: Map<string, WebGLTexture | WebGLFramebuffer | WebGLProgram | WebGLBuffer> = new Map();

  private constructor() {}

  static getInstance(): GPUResourceManager {
    if (!GPUResourceManager.instance) {
      GPUResourceManager.instance = new GPUResourceManager();
    }
    return GPUResourceManager.instance;
  }

  initialize(gl: WebGLRenderingContext): boolean {
    this.gl = gl;

    // Get GPU limits
    this.limits = {
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS),
      maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
      maxTextureUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
      maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
      maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
    };

    // Auto-detect optimal performance profile based on GPU capabilities
    this.detectOptimalProfile();

    console.log('GPU Resource Manager initialized:', {
      limits: this.limits,
      profile: this.currentProfile.name,
      memoryUsage: this.memoryUsage,
    });

    return true;
  }

  private detectOptimalProfile(): void {
    if (!this.limits) return;

    const { maxTextureSize, maxFragmentUniformVectors } = this.limits;

    // Conservative approach for shared GPU usage with ComfyUI
    if (maxTextureSize >= 4096 && maxFragmentUniformVectors >= 256) {
      this.currentProfile = this.performanceProfiles.find(p => p.name === 'medium')!;
    } else if (maxTextureSize >= 2048 && maxFragmentUniformVectors >= 128) {
      this.currentProfile = this.performanceProfiles.find(p => p.name === 'low')!;
    } else {
      this.currentProfile = this.performanceProfiles.find(p => p.name === 'ultra-low')!;
    }

    // Force low-power mode when ComfyUI might be running
    this.currentProfile.powerPreference = 'low-power';
    this.currentProfile.enableAntialiasing = false;
  }

  getOptimalWebGLContextAttributes(): WebGLContextAttributes {
    return {
      alpha: false,
      depth: false,
      stencil: false,
      antialias: this.currentProfile.enableAntialiasing,
      powerPreference: this.currentProfile.powerPreference,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
    };
  }

  canHandleEffects(effects: AppliedEffect[]): boolean {
    const enabledEffects = effects.filter(e => e.enabled);
    return enabledEffects.length <= this.currentProfile.maxEffects;
  }

  optimizeEffectsForGPU(effects: AppliedEffect[]): AppliedEffect[] {
    const enabledEffects = effects.filter(e => e.enabled);

    if (enabledEffects.length <= this.currentProfile.maxEffects) {
      return effects;
    }

    // Disable excess effects to stay within GPU limits
    const optimizedEffects = [...effects];
    let excessCount = enabledEffects.length - this.currentProfile.maxEffects;

    for (let i = optimizedEffects.length - 1; i >= 0 && excessCount > 0; i--) {
      if (optimizedEffects[i].enabled) {
        optimizedEffects[i] = { ...optimizedEffects[i], enabled: false };
        excessCount--;
      }
    }

    return optimizedEffects;
  }

  getShaderComplexityLevel(): 'low' | 'medium' | 'high' {
    return this.currentProfile.shaderComplexity;
  }

  getMaxTextureSize(): number {
    return Math.min(this.limits?.maxTextureSize || 2048, this.currentProfile.textureSize);
  }

  allocateTexture(key: string, width: number, height: number): WebGLTexture | null {
    if (!this.gl) return null;

    // Check memory limits
    const textureSizeMB = (width * height * 4) / (1024 * 1024); // RGBA bytes
    if (this.memoryUsage.totalMB + textureSizeMB > 256) { // 256MB limit
      console.warn('GPU memory limit reached, cannot allocate texture');
      return null;
    }

    const texture = this.gl.createTexture();
    if (texture) {
      this.resourcePool.set(key, texture);
      this.memoryUsage.textures++;
      this.memoryUsage.totalMB += textureSizeMB;
    }

    return texture;
  }

  allocateFramebuffer(key: string): WebGLFramebuffer | null {
    if (!this.gl) return null;

    if (this.memoryUsage.framebuffers >= 8) { // Limit framebuffers
      console.warn('Maximum framebuffers reached');
      return null;
    }

    const framebuffer = this.gl.createFramebuffer();
    if (framebuffer) {
      this.resourcePool.set(key, framebuffer);
      this.memoryUsage.framebuffers++;
      this.memoryUsage.totalMB += 0.1; // Rough estimate
    }

    return framebuffer;
  }

  allocateShader(key: string, program: WebGLProgram): void {
    this.resourcePool.set(key, program);
    this.memoryUsage.shaders++;
    this.memoryUsage.totalMB += 0.5; // Rough estimate for shader
  }

  deallocateResource(key: string): void {
    const resource = this.resourcePool.get(key);
    if (!resource || !this.gl) return;

    if (resource instanceof WebGLTexture) {
      this.gl.deleteTexture(resource);
      this.memoryUsage.textures = Math.max(0, this.memoryUsage.textures - 1);
      this.memoryUsage.totalMB -= 2; // Rough estimate
    } else if (resource instanceof WebGLFramebuffer) {
      this.gl.deleteFramebuffer(resource);
      this.memoryUsage.framebuffers = Math.max(0, this.memoryUsage.framebuffers - 1);
      this.memoryUsage.totalMB -= 0.1;
    } else if (resource instanceof WebGLProgram) {
      this.gl.deleteProgram(resource);
      this.memoryUsage.shaders = Math.max(0, this.memoryUsage.shaders - 1);
      this.memoryUsage.totalMB -= 0.5;
    } else if (resource instanceof WebGLBuffer) {
      this.gl.deleteBuffer(resource);
      this.memoryUsage.buffers = Math.max(0, this.memoryUsage.buffers - 1);
      this.memoryUsage.totalMB -= 0.1;
    }

    this.resourcePool.delete(key);
  }

  getMemoryUsage(): GPUMemoryUsage {
    return { ...this.memoryUsage };
  }

  getPerformanceProfile(): PerformanceProfile {
    return { ...this.currentProfile };
  }

  setPerformanceProfile(profileName: string): boolean {
    const profile = this.performanceProfiles.find(p => p.name === profileName);
    if (profile) {
      this.currentProfile = profile;
      return true;
    }
    return false;
  }

  cleanup(): void {
    if (!this.gl) return;

    // Clean up all resources
    for (const [key, resource] of this.resourcePool) {
      this.deallocateResource(key);
    }

    this.resourcePool.clear();
    this.memoryUsage = {
      textures: 0,
      framebuffers: 0,
      shaders: 0,
      buffers: 0,
      totalMB: 0,
    };
  }

  // Monitor GPU performance
  monitorPerformance(callback: (metrics: {
    fps: number;
    memoryUsage: GPUMemoryUsage;
    profile: PerformanceProfile;
  }) => void): () => void {
    let lastTime = performance.now();
    let frameCount = 0;

    const monitor = () => {
      frameCount++;
      const currentTime = performance.now();

      if (currentTime - lastTime >= 1000) { // Update every second
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        callback({
          fps,
          memoryUsage: this.getMemoryUsage(),
          profile: this.getPerformanceProfile(),
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(monitor);
    };

    const animationId = requestAnimationFrame(monitor);

    return () => cancelAnimationFrame(animationId);
  }
}

// Export singleton instance
export const gpuResourceManager = GPUResourceManager.getInstance();