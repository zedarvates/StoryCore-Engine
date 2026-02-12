/**
 * WebGL Transition Engine for StoryCore
 * GPU-accelerated shader-based transitions with performance optimization
 */

import {
  TransitionConfig,
  TransitionState,
  TransitionMetrics,
  ShaderProgram,
  ShaderUniforms,
  TransitionFrameData,
  TransitionCanvasOptions,
  GPUMode,
  PerformanceTier,
  TransitionPreset,
  TransitionCategory,
  FadeTransitionConfig,
  SlideTransitionConfig,
  ZoomTransitionConfig,
  WipeTransitionConfig,
  GlitchTransitionConfig,
  CustomTransitionConfig,
} from './TransitionTypes';

// ============================================
// WebGL Context Management
// ============================================

export class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private programs: Map<string, WebGLProgram> = new Map();
  private textures: Map<string, WebGLTexture> = new Map();
  private framebuffers: Map<string, WebGLFramebuffer> = new Map();
  private buffers: Map<string, WebGLBuffer> = new Map();
  private extentions: Map<string, any> = new Map();
  private width: number = 0;
  private height: number = 0;
  private gpuMode: GPUMode = 'auto';
  private performanceTier: PerformanceTier = 'high';
  private isInitialized: boolean = false;

  constructor(canvas: HTMLCanvasElement, options?: Partial<TransitionCanvasOptions>) {
    this.canvas = canvas;
    this.width = options?.width || canvas.width;
    this.height = options?.height || canvas.height;
    this.initializeContext(options?.glAttributes);
  }

  private initializeContext(attributes?: WebGLContextAttributes): void {
    if (!this.canvas) return;

    const defaultAttributes: WebGLContextAttributes = {
      antialias: attributes?.antialias ?? true,
      alpha: attributes?.alpha ?? false,
      depth: attributes?.depth ?? true,
      stencil: attributes?.stencil ?? false,
      preserveDrawingBuffer: attributes?.preserveDrawingBuffer ?? false,
      premultipliedAlpha: attributes?.premultipliedAlpha ?? false,
    };

    // Try WebGL2 first, fallback to WebGL1
    this.gl = (this.canvas.getContext('webgl2', defaultAttributes) ||
              this.canvas.getContext('webgl', defaultAttributes) ||
              this.canvas.getContext('experimental-webgl', defaultAttributes)) as WebGLRenderingContext | null;

    if (!this.gl) {
      console.warn('WebGL not supported, falling back to CSS transitions');
      this.gpuMode = 'disabled';
      return;
    }

    this.setupExtensions();
    this.setupBuffers();
    this.isInitialized = true;
  }

  private setupExtensions(): void {
    if (!this.gl) return;

    // Get commonly used extensions
    const ext = this.gl.getExtension('OES_texture_float');
    if (ext) this.extentions.set('OES_texture_float', ext);

    const extLinear = this.gl.getExtension('OES_texture_float_linear');
    if (extLinear) this.extentions.set('OES_texture_float_linear', extLinear);

    const extAnisotropic = this.gl.getExtension('EXT_texture_filter_anisotropic');
    if (extAnisotropic) this.extentions.set('EXT_texture_filter_anisotropic', extAnisotropic);
  }

  private setupBuffers(): void {
    if (!this.gl) return;

    // Create fullscreen quad buffer
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);

    const buffer = this.gl.createBuffer();
    if (buffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
      this.buffers.set('quad', buffer);
    }

    // Create index buffer for triangle strip
    const indices = new Uint16Array([0, 1, 2, 3]);
    const indexBuffer = this.gl.createBuffer();
    if (indexBuffer) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
      this.buffers.set('indices', indexBuffer);
    }
  }

  // ============================================
  // Shader Management
  // ============================================

  compileShader(type: number, source: string): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  createProgram(vertexShader: string, fragmentShader: string): WebGLProgram | null {
    if (!this.gl) return null;

    const vs = this.compileShader(this.gl.VERTEX_SHADER, vertexShader);
    const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShader);

    if (!vs || !fs) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vs);
    this.gl.attachShader(program, fs);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link error:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }

    return program;
  }

  useProgram(program: WebGLProgram | null): void {
    if (!this.gl) return;
    this.gl.useProgram(program);
  }

  getUniformLocation(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    if (!this.gl) return null;
    return this.gl.getUniformLocation(program, name);
  }

  getAttribLocation(program: WebGLProgram, name: string): number {
    if (!this.gl) return -1;
    return this.gl.getAttribLocation(program, name);
  }

  // ============================================
  // Texture Management
  // ============================================

  createTexture(
    source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
    id: string
  ): WebGLTexture | null {
    if (!this.gl) return null;

    const texture = this.gl.createTexture();
    if (!texture) return null;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      source
    );

    // Set texture parameters for smooth scaling
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    this.textures.set(id, texture);
    return texture;
  }

  updateTexture(
    source: HTMLCanvasElement | HTMLVideoElement | ImageBitmap,
    id: string
  ): void {
    if (!this.gl) return;

    const texture = this.textures.get(id);
    if (!texture) {
      this.createTexture(source, id);
      return;
    }

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      source
    );
  }

  bindTexture(texture: WebGLTexture, unit: number, id: string): void {
    if (!this.gl) return;

    this.gl.activeTexture(this.gl.TEXTURE0 + unit);
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.textures.set(id, texture);
  }

  deleteTexture(id: string): void {
    if (!this.gl) return;

    const texture = this.textures.get(id);
    if (texture) {
      this.gl.deleteTexture(texture);
      this.textures.delete(id);
    }
  }

  // ============================================
  // Framebuffer Management
  // ============================================

  createFramebuffer(id: string, width: number, height: number): WebGLFramebuffer | null {
    if (!this.gl) return null;

    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) return null;

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    // Create texture attachment
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      width,
      height,
      0,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      null
    );
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.COLOR_ATTACHMENT0,
      this.gl.TEXTURE_2D,
      texture,
      0
    );

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.framebuffers.set(id, framebuffer);

    return framebuffer;
  }

  bindFramebuffer(framebuffer: WebGLFramebuffer | null): void {
    if (!this.gl) return;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
  }

  // ============================================
  // Rendering
  // ============================================

  setViewport(width: number, height: number): void {
    if (!this.gl) return;
    this.gl.viewport(0, 0, width, height);
  }

  clear(color?: [number, number, number, number]): void {
    if (!this.gl) return;

    this.gl.clearColor(
      color ? color[0] : 0,
      color ? color[1] : 0,
      color ? color[2] : 0,
      color ? color[3] : 1
    );
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }

  drawQuad(): void {
    if (!this.gl) return;

    const buffer = this.buffers.get('quad');
    const indices = this.buffers.get('indices');

    if (!buffer || !indices) return;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indices);

    const positionLoc = 0; // Layout location in shader
    this.gl.enableVertexAttribArray(positionLoc);
    this.gl.vertexAttribPointer(positionLoc, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.drawElements(this.gl.TRIANGLE_STRIP, 4, this.gl.UNSIGNED_SHORT, 0);
  }

  // ============================================
  // Performance & Optimization
  // ============================================

  setGPUMode(mode: GPUMode): void {
    this.gpuMode = mode;
  }

  setPerformanceTier(tier: PerformanceTier): void {
    this.performanceTier = tier;

    // Adjust based on tier
    switch (tier) {
      case 'low':
        this.gl?.disable(this.gl.DITHER);
        break;
      case 'medium':
      case 'high':
      case 'ultra':
        this.gl?.enable(this.gl.DITHER);
        break;
    }
  }

  getGPUMemoryUsage(): number {
    // This is a simplified estimation
    // Real GPU memory tracking requires browser-specific APIs
    let totalMemory = 0;

    this.textures.forEach((texture) => {
      // Rough estimation: 4 bytes per pixel * texture size
      // This is an approximation
      totalMemory += 4 * 1024 * 1024; // Assume 1MB per texture
    });

    return totalMemory;
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    if (!this.gl) return;

    // Delete all programs
    this.programs.forEach((program) => this.gl?.deleteProgram(program));
    this.programs.clear();

    // Delete all textures
    this.textures.forEach((texture) => this.gl?.deleteTexture(texture));
    this.textures.clear();

    // Delete all framebuffers
    this.framebuffers.forEach((fb) => this.gl?.deleteFramebuffer(fb));
    this.framebuffers.clear();

    // Delete all buffers
    this.buffers.forEach((buffer) => this.gl?.deleteBuffer(buffer));
    this.buffers.clear();

    this.isInitialized = false;
  }

  // ============================================
  // Getters
  // ============================================

  getContext(): WebGLRenderingContext | null {
    return this.gl;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  isReady(): boolean {
    return this.isInitialized && this.gl !== null;
  }

  getGPUMode(): GPUMode {
    return this.gpuMode;
  }

  getPerformanceTier(): PerformanceTier {
    return this.performanceTier;
  }
}

// ============================================
// Transition Engine
// ============================================

export class TransitionEngine {
  private renderer: WebGLRenderer | null = null;
  private currentConfig: TransitionConfig | null = null;
  private currentState: TransitionState = this.createInitialState();
  private startTime: number = 0;
  private animationFrameId: number | null = null;
  private presets: Map<string, TransitionPreset> = new Map();
  private customShaders: Map<string, ShaderProgram> = new Map();
  private metrics: TransitionMetrics | null = null;
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;

  constructor(canvas: HTMLCanvasElement, options?: Partial<TransitionCanvasOptions>) {
    this.renderer = new WebGLRenderer(canvas, options);
    this.registerBuiltInPresets();
  }

  private createInitialState(): TransitionState {
    return {
      progress: 0,
      phase: 'idle',
      elapsed: 0,
      remaining: 0,
      isActive: false,
      currentFrame: 0,
      fps: 60,
      gpuMemoryUsage: 0,
    };
  }

  // ============================================
  // Shader Presets
  // ============================================

  private registerBuiltInPresets(): void {
    // Fade Presets
    this.presets.set('fade-black', {
      id: 'fade-black',
      name: 'Fade to Black',
      category: 'fade',
      description: 'Smooth fade transition to black',
      defaultConfig: {
        type: 'fade',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        fadeType: 'black',
      },
      tags: ['fade', 'black', 'classic'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('fade-white', {
      id: 'fade-white',
      name: 'Fade to White',
      category: 'fade',
      description: 'Smooth fade transition to white',
      defaultConfig: {
        type: 'fade',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        fadeType: 'white',
      },
      tags: ['fade', 'white', 'classic'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('fade-cross', {
      id: 'fade-cross',
      name: 'Cross Fade',
      category: 'fade',
      description: 'Smooth cross dissolve between clips',
      defaultConfig: {
        type: 'fade',
        duration: 600,
        easing: 'linear',
        gpuMode: 'auto',
        performanceTier: 'high',
        fadeType: 'cross',
      },
      tags: ['fade', 'cross', 'dissolve'],
      gpuSupported: true,
      performanceRating: 5,
    });

    // Slide Presets
    this.presets.set('slide-left', {
      id: 'slide-left',
      name: 'Slide Left',
      category: 'slide',
      description: 'Slide transition from right to left',
      defaultConfig: {
        type: 'slide',
        duration: 400,
        easing: 'easeOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        direction: 'left',
        overlap: 0.2,
      },
      tags: ['slide', 'left', 'motion'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('slide-right', {
      id: 'slide-right',
      name: 'Slide Right',
      category: 'slide',
      description: 'Slide transition from left to right',
      defaultConfig: {
        type: 'slide',
        duration: 400,
        easing: 'easeOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        direction: 'right',
        overlap: 0.2,
      },
      tags: ['slide', 'right', 'motion'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('slide-up', {
      id: 'slide-up',
      name: 'Slide Up',
      category: 'slide',
      description: 'Slide transition from bottom to top',
      defaultConfig: {
        type: 'slide',
        duration: 400,
        easing: 'easeOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        direction: 'up',
        overlap: 0.2,
      },
      tags: ['slide', 'up', 'motion'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('slide-down', {
      id: 'slide-down',
      name: 'Slide Down',
      category: 'slide',
      description: 'Slide transition from top to bottom',
      defaultConfig: {
        type: 'slide',
        duration: 400,
        easing: 'easeOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        direction: 'down',
        overlap: 0.2,
      },
      tags: ['slide', 'down', 'motion'],
      gpuSupported: true,
      performanceRating: 5,
    });

    // Zoom Presets
    this.presets.set('zoom-in', {
      id: 'zoom-in',
      name: 'Zoom In',
      category: 'zoom',
      description: 'Zoom into the next clip',
      defaultConfig: {
        type: 'zoom',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        zoomType: 'in',
        intensity: 1.5,
      },
      tags: ['zoom', 'in', 'scale'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('zoom-out', {
      id: 'zoom-out',
      name: 'Zoom Out',
      category: 'zoom',
      description: 'Zoom out of the current clip',
      defaultConfig: {
        type: 'zoom',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        zoomType: 'out',
        intensity: 0.5,
      },
      tags: ['zoom', 'out', 'scale'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('zoom-pulsar', {
      id: 'zoom-pulsar',
      name: 'Pulsar Zoom',
      category: 'zoom',
      description: 'Dynamic zoom with pulse effect',
      defaultConfig: {
        type: 'zoom',
        duration: 600,
        easing: 'elastic',
        gpuMode: 'auto',
        performanceTier: 'high',
        zoomType: 'pulsar',
        intensity: 2.0,
        rotation: true,
        rotationAngle: 15,
      },
      tags: ['zoom', 'pulsar', 'dynamic', 'rotation'],
      gpuSupported: true,
      performanceRating: 4,
    });

    // Wipe Presets
    this.presets.set('wipe-linear', {
      id: 'wipe-linear',
      name: 'Linear Wipe',
      category: 'wipe',
      description: 'Linear wipe transition',
      defaultConfig: {
        type: 'wipe',
        duration: 400,
        easing: 'linear',
        gpuMode: 'auto',
        performanceTier: 'high',
        wipeType: 'linear',
        direction: 'left',
        softness: 0.1,
      },
      tags: ['wipe', 'linear', 'classic'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('wipe-radial', {
      id: 'wipe-radial',
      name: 'Radial Wipe',
      category: 'wipe',
      description: 'Radial wipe from center',
      defaultConfig: {
        type: 'wipe',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        wipeType: 'radial',
        direction: 'left',
        softness: 0.2,
      },
      tags: ['wipe', 'radial', 'circle'],
      gpuSupported: true,
      performanceRating: 5,
    });

    this.presets.set('wipe-gradient', {
      id: 'wipe-gradient',
      name: 'Gradient Wipe',
      category: 'wipe',
      description: 'Gradient-based wipe transition',
      defaultConfig: {
        type: 'wipe',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'high',
        wipeType: 'gradient',
        direction: 'left',
        softness: 0.3,
        gradientStops: ['transparent', 'black'],
      },
      tags: ['wipe', 'gradient', 'smooth'],
      gpuSupported: true,
      performanceRating: 5,
    });

    // Glitch Presets
    this.presets.set('glitch-rgb', {
      id: 'glitch-rgb',
      name: 'RGB Glitch',
      category: 'glitch',
      description: 'RGB split glitch effect',
      defaultConfig: {
        type: 'glitch',
        duration: 300,
        easing: 'linear',
        gpuMode: 'auto',
        performanceTier: 'high',
        glitchType: 'rgbSplit',
        intensity: 0.5,
        rgbOffset: 5,
      },
      tags: ['glitch', 'rgb', 'digital', 'vhs'],
      gpuSupported: true,
      performanceRating: 4,
    });

    this.presets.set('glitch-noise', {
      id: 'glitch-noise',
      name: 'Noise Glitch',
      category: 'glitch',
      description: 'Digital noise glitch effect',
      defaultConfig: {
        type: 'glitch',
        duration: 400,
        easing: 'linear',
        gpuMode: 'auto',
        performanceTier: 'high',
        glitchType: 'noise',
        intensity: 0.7,
        blockCount: 10,
      },
      tags: ['glitch', 'noise', 'digital', 'static'],
      gpuSupported: true,
      performanceRating: 4,
    });

    this.presets.set('glitch-chromatic', {
      id: 'glitch-chromatic',
      name: 'Chromatic Aberration',
      category: 'glitch',
      description: 'Heavy chromatic aberration glitch',
      defaultConfig: {
        type: 'glitch',
        duration: 350,
        easing: 'linear',
        gpuMode: 'auto',
        performanceTier: 'high',
        glitchType: 'chromatic',
        intensity: 0.8,
        rgbOffset: 10,
      },
      tags: ['glitch', 'chromatic', 'aberration', 'digital'],
      gpuSupported: true,
      performanceRating: 4,
    });

    // Blur Presets
    this.presets.set('blur-in', {
      id: 'blur-in',
      name: 'Blur In',
      category: 'blur',
      description: 'Blur transition revealing new clip',
      defaultConfig: {
        type: 'blur',
        duration: 500,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'medium',
        direction: 'in',
        radius: 20,
        grayscale: false,
      },
      tags: ['blur', 'focus', 'depth'],
      gpuSupported: true,
      performanceRating: 4,
    });

    this.presets.set('blur-dissolve', {
      id: 'blur-dissolve',
      name: 'Blur Dissolve',
      category: 'dissolve',
      description: 'Blur combined with dissolve',
      defaultConfig: {
        type: 'dissolve',
        duration: 600,
        easing: 'easeInOut',
        gpuMode: 'auto',
        performanceTier: 'medium',
        pattern: 'random',
        particleSize: 4,
        noiseScale: 2,
      },
      tags: ['blur', 'dissolve', 'particles'],
      gpuSupported: true,
      performanceRating: 3,
    });
  }

  // ============================================
  // Transition Control
  // ============================================

  prepare(config: TransitionConfig): void {
    this.currentConfig = config;
    this.currentState = this.createInitialState();
    this.frameTimes = [];
    this.metrics = null;
  }

  start(): void {
    if (!this.currentConfig || this.currentState.isActive) return;

    this.startTime = performance.now();
    this.currentState.isActive = true;
    this.currentState.phase = 'running';

    // Call onStart callback
    this.currentConfig.onStart?.();

    this.animate();
  }

  private animate = (): void => {
    if (!this.currentConfig || !this.currentState.isActive) return;

    const currentTime = performance.now();
    const elapsed = currentTime - this.startTime;
    const progress = Math.min(elapsed / this.currentConfig.duration, 1);

    // Track frame times for FPS calculation
    if (this.lastFrameTime > 0) {
      const frameTime = currentTime - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > 60) this.frameTimes.shift();
    }
    this.lastFrameTime = currentTime;

    // Update state
    this.currentState.progress = progress;
    this.currentState.elapsed = elapsed;
    this.currentState.remaining = Math.max(0, this.currentConfig.duration - elapsed);
    this.currentState.currentFrame++;

    // Calculate FPS
    if (this.frameTimes.length > 0) {
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.currentState.fps = Math.round(1000 / avgFrameTime);
    }

    // Update GPU memory if available
    if (this.renderer) {
      this.currentState.gpuMemoryUsage = this.renderer.getGPUMemoryUsage();
    }

    // Call onUpdate callback
    this.currentConfig.onUpdate?.(progress);

    // Check for completion
    if (progress >= 1) {
      this.complete();
      return;
    }

    // Continue animation
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  private complete(): void {
    if (!this.currentConfig) return;

    this.currentState.isActive = false;
    this.currentState.phase = 'complete';
    this.currentState.progress = 1;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Calculate final metrics
    this.calculateMetrics();

    // Call onComplete callback
    this.currentConfig.onComplete?.();
  }

  private calculateMetrics(): void {
    if (!this.currentConfig) return;

    const totalTime = this.currentState.elapsed;
    const fpsValues = this.frameTimes.map((ft) => 1000 / ft);

    this.metrics = {
      totalTime,
      averageFPS: fpsValues.length > 0
        ? Math.round(fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length)
        : 60,
      minFPS: fpsValues.length > 0 ? Math.round(Math.min(...fpsValues)) : 60,
      maxFPS: fpsValues.length > 0 ? Math.round(Math.max(...fpsValues)) : 60,
      gpuMemoryPeak: this.currentState.gpuMemoryUsage || 0,
      frameDrops: fpsValues.filter((f) => f < 30).length,
      cpuTimePerFrame: this.frameTimes.length > 0
        ? this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length
        : 0,
      gpuTimePerFrame: this.frameTimes.length > 0
        ? (this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length) * 0.8
        : 0,
    };
  }

  cancel(): void {
    if (!this.currentState.isActive) return;

    this.currentState.isActive = false;
    this.currentState.phase = 'idle';
    this.currentState.progress = 0;

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ============================================
  // Rendering
  // ============================================

  async renderFrame(frameData: TransitionFrameData): Promise<void> {
    if (!this.renderer || !this.currentConfig) return;

    // Update textures
    if (frameData.source instanceof HTMLCanvasElement) {
      this.renderer.updateTexture(frameData.source, 'source');
    }

    // Render based on transition type
    switch (this.currentConfig.type) {
      case 'fade':
        this.renderFadeFrame(frameData);
        break;
      case 'slide':
        this.renderSlideFrame(frameData);
        break;
      case 'zoom':
        this.renderZoomFrame(frameData);
        break;
      case 'wipe':
        this.renderWipeFrame(frameData);
        break;
      case 'glitch':
        this.renderGlitchFrame(frameData);
        break;
      case 'custom':
        await this.renderCustomFrame(frameData);
        break;
      default:
        this.renderFadeFrame(frameData);
    }
  }

  private renderFadeFrame(frameData: TransitionFrameData): void {
    // CSS-based fallback for fade (simplified)
    const canvas = frameData.destination;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = frameData.progress;
    const config = frameData.config as FadeTransitionConfig;

    // Render with opacity blending
    ctx.globalAlpha = progress;
    // Additional fade rendering logic would go here
  }

  private renderSlideFrame(frameData: TransitionFrameData): void {
    // Slide transition rendering
    const canvas = frameData.destination;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = frameData.progress;
    const config = frameData.config as SlideTransitionConfig;

    // Render with position offset
    const offsetX = progress * canvas.width;
    const offsetY = progress * canvas.height;

    ctx.save();
    ctx.translate(-offsetX, -offsetY);
    // Additional slide rendering logic would go here
    ctx.restore();
  }

  private renderZoomFrame(frameData: TransitionFrameData): void {
    // Zoom transition rendering
    const canvas = frameData.destination;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = frameData.progress;
    const config = frameData.config as ZoomTransitionConfig;

    const scale = 1 + progress * (config.intensity || 1);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(
      (canvas.width / 2) * (1 - scale),
      (canvas.height / 2) * (1 - scale)
    );
    // Additional zoom rendering logic would go here
    ctx.restore();
  }

  private renderWipeFrame(frameData: TransitionFrameData): void {
    // Wipe transition rendering
    const canvas = frameData.destination;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = frameData.progress;
    const config = frameData.config as WipeTransitionConfig;

    // Create wipe mask
    ctx.save();
    ctx.beginPath();
    // Additional wipe rendering logic would go here
    ctx.clip();
    ctx.restore();
  }

  private renderGlitchFrame(frameData: TransitionFrameData): void {
    // Glitch transition rendering
    const canvas = frameData.destination;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const progress = frameData.progress;
    const config = frameData.config as GlitchTransitionConfig;

    // Apply glitch effect
    const intensity = config.intensity || 0.5;

    if (ctx instanceof CanvasRenderingContext2D) {
      // Add noise blocks
      const blockCount = config.blockCount || 10;
      for (let i = 0; i < blockCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const width = Math.random() * 100 * intensity;
        const height = Math.random() * 20 * intensity;

        ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
        ctx.fillRect(x, y, width, height);
      }
    }
  }

  private async renderCustomFrame(frameData: TransitionFrameData): Promise<void> {
    // Custom shader-based rendering
    const config = frameData.config as CustomTransitionConfig;

    if (config.shaderCode && this.renderer) {
      // Render using custom shader
      // This would compile and use the custom shader
    }
  }

  // ============================================
  // Preset Management
  // ============================================

  getPreset(id: string): TransitionPreset | undefined {
    return this.presets.get(id);
  }

  getAllPresets(): TransitionPreset[] {
    return Array.from(this.presets.values());
  }

  getPresetsByCategory(category: TransitionCategory): TransitionPreset[] {
    return Array.from(this.presets.values()).filter(
      (preset) => preset.category === category
    );
  }

  addCustomPreset(preset: TransitionPreset): void {
    this.presets.set(preset.id, preset);
  }

  removePreset(id: string): void {
    this.presets.delete(id);
  }

  // ============================================
  // Custom Shader Management
  // ============================================

  registerCustomShader(id: string, program: ShaderProgram): void {
    if (!this.renderer) return;

    const webglProgram = this.renderer.createProgram(
      program.vertexShader,
      program.fragmentShader
    );

    if (webglProgram) {
      this.customShaders.set(id, program);
    }
  }

  getCustomShader(id: string): ShaderProgram | undefined {
    return this.customShaders.get(id);
  }

  // ============================================
  // State & Metrics
  // ============================================

  getState(): TransitionState {
    return { ...this.currentState };
  }

  getMetrics(): TransitionMetrics | null {
    return this.metrics ? { ...this.metrics } : null;
  }

  // ============================================
  // Cleanup
  // ============================================

  destroy(): void {
    this.cancel();

    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }

    this.customShaders.clear();
    this.presets.clear();
  }
}

// ============================================
// Default Shaders
// ============================================

export const DEFAULT_VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = (a_position + 1.0) * 0.5;
    v_texCoord.y = 1.0 - v_texCoord.y;
  }
`;

export const DEFAULT_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  void main() {
    vec4 source = texture2D(u_source, v_texCoord);
    vec4 dest = texture2D(u_destination, v_texCoord);

    // Simple cross-fade
    gl_FragColor = mix(source, dest, u_progress);
  }
`;

export const FADE_BLACK_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;

  varying vec2 v_texCoord;

  void main() {
    vec4 source = texture2D(u_source, v_texCoord);
    vec4 dest = texture2D(u_destination, v_texCoord);

    // Fade to black
    vec4 black = vec4(0.0, 0.0, 0.0, 1.0);
    vec4 fadedSource = mix(source, black, u_progress);
    gl_FragColor = mix(fadedSource, dest, u_progress);
  }
`;

export const SLIDE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform vec2 u_direction;

  varying vec2 v_texCoord;

  void main() {
    vec2 sourceCoord = v_texCoord - u_direction * u_progress;
    vec2 destCoord = v_texCoord - u_direction * (u_progress - 1.0);

    vec4 source = texture2D(u_source, sourceCoord);
    vec4 dest = texture2D(u_destination, destCoord);

    // Blend based on position
    if (v_texCoord.x < u_progress) {
      gl_FragColor = dest;
    } else {
      gl_FragColor = source;
    }
  }
`;

export const ZOOM_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform vec2 u_origin;
  uniform float u_intensity;
  uniform float u_rotation;
  uniform float u_rotationAngle;

  varying vec2 v_texCoord;

  mat2 rotate2D(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  void main() {
    // Calculate zoom from origin
    vec2 dir = v_texCoord - u_origin;
    float scale = mix(1.0, u_intensity, u_progress);
    vec2 zoomedCoord = u_origin + dir / scale;

    // Apply rotation if enabled
    if (u_rotation > 0.5) {
      float angle = mix(0.0, u_rotationAngle * 3.14159 / 180.0, u_progress);
      zoomedCoord = u_origin + rotate2D(angle) * (zoomedCoord - u_origin);
    }

    // Sample textures
    vec4 source = texture2D(u_source, clamp(zoomedCoord, 0.0, 1.0));
    vec4 dest = texture2D(u_destination, v_texCoord);

    gl_FragColor = mix(source, dest, u_progress);
  }
`;

export const WIPE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform vec2 u_direction;
  uniform float u_softness;

  varying vec2 v_texCoord;

  void main() {
    // Calculate wipe position
    float wipePos = dot(v_texCoord, u_direction);
    float edge = u_progress;

    // Apply softness
    float alpha = smoothstep(edge - u_softness, edge, wipePos);

    vec4 source = texture2D(u_source, v_texCoord);
    vec4 dest = texture2D(u_destination, v_texCoord);

    gl_FragColor = mix(source, dest, alpha);
  }
`;

export const GLITCH_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform float u_intensity;
  uniform float u_rgbOffset;
  uniform int u_blockCount;

  varying vec2 v_texCoord;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = v_texCoord;

    // RGB split effect
    float splitAmount = u_progress * u_rgbOffset * u_intensity;

    vec4 source;
    source.r = texture2D(u_source, uv + vec2(splitAmount, 0.0)).r;
    source.g = texture2D(u_source, uv).g;
    source.b = texture2D(u_source, uv - vec2(splitAmount, 0.0)).b;
    source.a = 1.0;

    // Add noise blocks
    vec2 blockSize = 1.0 / vec2(float(u_blockCount), float(u_blockCount));
    vec2 blockUV = floor(uv / blockSize);

    if (rand(blockUV) < u_progress * u_intensity) {
      uv.x += (rand(blockUV + vec2(u_progress)) - 0.5) * 0.1;
    }

    vec4 dest = texture2D(u_destination, uv);

    gl_FragColor = mix(source, dest, u_progress);
  }
`;

export const RADIAL_WIPE_FRAGMENT_SHADER = `
  precision mediump float;

  uniform sampler2D u_source;
  uniform sampler2D u_destination;
  uniform float u_progress;
  uniform vec2 u_resolution;
  uniform vec2 u_center;
  uniform float u_softness;

  varying vec2 v_texCoord;

  void main() {
    // Calculate distance from center
    vec2 dir = v_texCoord - u_center;
    float dist = length(dir);
    float angle = atan(dir.y, dir.x);

    // Radial wipe based on progress
    float angleOffset = u_progress * 6.28318;
    float currentAngle = mod(angle + 3.14159 + angleOffset, 6.28318);

    float alpha = smoothstep(0.0, u_softness, currentAngle / (2.0 * 3.14159));

    vec4 source = texture2D(u_source, v_texCoord);
    vec4 dest = texture2D(u_destination, v_texCoord);

    gl_FragColor = mix(source, dest, alpha);
  }
`;
