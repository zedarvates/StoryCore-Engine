import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import { Effect, EffectParameter } from './EffectsLibrary';
import { gpuResourceManager } from './GPUResourceManager';
import './EffectPreviewRenderer.css';

interface AppliedEffect extends Effect {
  enabled: boolean;
  order: number;
}

interface EffectPreviewRendererProps {
  videoSrc?: string;
  effects: AppliedEffect[];
  width?: number;
  height?: number;
  className?: string;
  onPerformanceMetrics?: (metrics: PerformanceMetrics) => void;
}

interface PerformanceMetrics {
  fps: number;
  gpuMemoryUsage: number;
  renderTime: number;
  effectCount: number;
}

interface WebGLEffect {
  program: WebGLProgram;
  uniforms: { [key: string]: WebGLUniformLocation };
  attributes: { [key: string]: number };
}

export const EffectPreviewRenderer: React.FC<EffectPreviewRendererProps> = ({
  videoSrc,
  effects,
  width = 640,
  height = 360,
  className = '',
  onPerformanceMetrics,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const animationFrameRef = useRef<number>();
  const effectsRef = useRef<WebGLEffect[]>([]);
  const textureRef = useRef<WebGLTexture | null>(null);
  const framebufferRef = useRef<WebGLFramebuffer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    gpuMemoryUsage: 0,
    renderTime: 0,
    effectCount: 0,
  });
  const [gpuProfile, setGpuProfile] = useState<string>('unknown');
  const [memoryWarning, setMemoryWarning] = useState(false);

  // Initialize WebGL context
  const initializeWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    // Get optimal WebGL context attributes from GPU manager
    const contextAttributes = gpuResourceManager.getOptimalWebGLContextAttributes();

    const gl = canvas.getContext('webgl', contextAttributes);

    if (!gl) {
      console.warn('WebGL not supported, falling back to Canvas 2D');
      return false;
    }

    // Initialize GPU resource manager
    const success = gpuResourceManager.initialize(gl);
    if (!success) {
      console.warn('Failed to initialize GPU resource manager');
      return false;
    }

    glRef.current = gl;

    // Basic WebGL setup with GPU optimizations
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Disable unnecessary features for performance
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.disable(gl.DITHER);

    // Allocate texture using GPU manager
    const maxTextureSize = gpuResourceManager.getMaxTextureSize();
    textureRef.current = gpuResourceManager.allocateTexture('video_texture', maxTextureSize, maxTextureSize);

    if (!textureRef.current) {
      console.warn('Failed to allocate video texture');
      return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Allocate framebuffer using GPU manager
    framebufferRef.current = gpuResourceManager.allocateFramebuffer('effect_framebuffer');

    if (!framebufferRef.current) {
      console.warn('Failed to allocate effect framebuffer');
      return false;
    }

    return true;
  }, []);

  // Create WebGL shader program
  const createShaderProgram = useCallback((vertexSource: string, fragmentSource: string): WebGLProgram | null => {
    const gl = glRef.current;
    if (!gl) return null;

    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    gl.shaderSource(vertexShader, vertexSource);
    gl.shaderSource(fragmentShader, fragmentSource);

    gl.compileShader(vertexShader);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error('Vertex shader compilation error:', gl.getShaderInfoLog(vertexShader));
      return null;
    }

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation error:', gl.getShaderInfoLog(fragmentShader));
      return null;
    }

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Shader program linking error:', gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }, []);

  // Get shader source for different effects
  const getShaderSource = useCallback((effect: AppliedEffect, complexity: 'low' | 'medium' | 'high' = 'medium'): { vertex: string; fragment: string } => {
    const vertexShader = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;

      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    let fragmentShader = `
      precision ${complexity === 'high' ? 'highp' : complexity === 'medium' ? 'mediump' : 'lowp'} float;
      uniform sampler2D u_texture;
      uniform vec2 u_resolution;
      uniform float u_time;
      varying vec2 v_texCoord;

      void main() {
        vec4 color = texture2D(u_texture, v_texCoord);
    `;

    // Apply effect-specific shader code with complexity optimization
    switch (effect.id) {
      case 'brightness':
        const brightness = effect.parameters.find(p => p.id === 'brightness')?.value || 0;
        fragmentShader += `
          color.rgb *= ${1 + brightness / 100}.0;
        `;
        break;

      case 'contrast':
        const contrast = effect.parameters.find(p => p.id === 'contrast')?.value || 0;
        fragmentShader += `
          color.rgb = (color.rgb - 0.5) * ${1 + contrast / 100}.0 + 0.5;
        `;
        break;

      case 'saturation':
        const saturation = effect.parameters.find(p => p.id === 'saturation')?.value || 0;
        if (complexity === 'low') {
          // Simplified version for low complexity
          fragmentShader += `
            float gray = dot(color.rgb, vec3(0.3, 0.59, 0.11));
            color.rgb = mix(vec3(gray), color.rgb, ${1 + saturation / 100}.0);
          `;
        } else {
          fragmentShader += `
            float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            color.rgb = mix(vec3(gray), color.rgb, ${1 + saturation / 100}.0);
          `;
        }
        break;

      case 'blur':
        const blurAmount = effect.parameters.find(p => p.id === 'amount')?.value || 0;
        if (complexity === 'low') {
          // Simple 3x3 blur for low complexity
          fragmentShader += `
            vec4 blur = vec4(0.0);
            float total = 0.0;
            for(float x = -1.0; x <= 1.0; x += 1.0) {
              for(float y = -1.0; y <= 1.0; y += 1.0) {
                blur += texture2D(u_texture, v_texCoord + vec2(x, y) / u_resolution * ${blurAmount / 10}.0);
                total += 1.0;
              }
            }
            color = blur / total;
          `;
        } else {
          // More sophisticated blur for higher complexity
          fragmentShader += `
            vec4 blur = vec4(0.0);
            float total = 0.0;
            for(float x = -${blurAmount / 10}.0; x <= ${blurAmount / 10}.0; x += 1.0) {
              for(float y = -${blurAmount / 10}.0; y <= ${blurAmount / 10}.0; y += 1.0) {
                blur += texture2D(u_texture, v_texCoord + vec2(x, y) / u_resolution);
                total += 1.0;
              }
            }
            color = blur / total;
          `;
        }
        break;

      case 'sepia':
        fragmentShader += `
          color.r = dot(color.rgb, vec3(0.393, 0.769, 0.189));
          color.g = dot(color.rgb, vec3(0.349, 0.686, 0.168));
          color.b = dot(color.rgb, vec3(0.272, 0.534, 0.131));
        `;
        break;

      case 'vintage':
        fragmentShader += `
          color.r *= 1.1;
          color.g *= 0.9;
          color.b *= 0.8;
          color.rgb *= 0.9;
        `;
        break;

      case 'scale':
        const scale = effect.parameters.find(p => p.id === 'scale')?.value || 100;
        fragmentShader += `
          vec2 center = vec2(0.5, 0.5);
          vec2 uv = (v_texCoord - center) / ${scale / 100}.0 + center;
          if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
            color = texture2D(u_texture, uv);
          } else {
            color = vec4(0.0, 0.0, 0.0, 1.0);
          }
        `;
        break;

      case 'rotation':
        const rotation = effect.parameters.find(p => p.id === 'angle')?.value || 0;
        const radianRotation = (rotation * 3.14159) / 180.0;
        fragmentShader += `
          vec2 center = vec2(0.5, 0.5);
          vec2 uv = v_texCoord - center;
          float cosA = cos(${radianRotation});
          float sinA = sin(${radianRotation});
          uv = vec2(uv.x * cosA - uv.y * sinA, uv.x * sinA + uv.y * cosA);
          uv += center;
          if (uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0) {
            color = texture2D(u_texture, uv);
          } else {
            color = vec4(0.0, 0.0, 0.0, 1.0);
          }
        `;
        break;

      // Default: passthrough
      default:
        break;
    }

    fragmentShader += `
        gl_FragColor = color;
      }
    `;

    return { vertex: vertexShader, fragment: fragmentShader };
  }, []);

  // Initialize effects
  const initializeEffects = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;

    // Check if GPU can handle current effects
    const optimizedEffects = gpuResourceManager.optimizeEffectsForGPU(effects);
    const shaderComplexity = gpuResourceManager.getShaderComplexityLevel();

    effectsRef.current = [];

    for (const effect of optimizedEffects) {
      if (!effect.enabled) continue;

      const shaderSource = getShaderSource(effect, shaderComplexity);
      const program = createShaderProgram(shaderSource.vertex, shaderSource.fragment);

      if (program) {
        // Register shader with GPU manager
        gpuResourceManager.allocateShader(`effect_${effect.id}`, program);

        const uniforms: { [key: string]: WebGLUniformLocation } = {};
        const attributes: { [key: string]: number } = {};

        // Get uniform locations
        uniforms.u_texture = gl.getUniformLocation(program, 'u_texture')!;
        uniforms.u_resolution = gl.getUniformLocation(program, 'u_resolution')!;
        uniforms.u_time = gl.getUniformLocation(program, 'u_time')!;

        // Get attribute locations
        attributes.a_position = gl.getAttribLocation(program, 'a_position');
        attributes.a_texCoord = gl.getAttribLocation(program, 'a_texCoord');

        effectsRef.current.push({ program, uniforms, attributes });
      }
    }
  }, [effects, createShaderProgram, getShaderSource]);

  // Render frame
  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!gl || !canvas || !video) return;

    const startTime = performance.now();

    // Update video texture
    gl.bindTexture(gl.TEXTURE_2D, textureRef.current);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

    // Set up geometry
    const positions = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    let currentTexture = textureRef.current;

    // Apply effects in chain
    for (let i = 0; i < effectsRef.current.length; i++) {
      const effect = effectsRef.current[i];
      const isLastEffect = i === effectsRef.current.length - 1;

      gl.useProgram(effect.program);

      // Set uniforms
      gl.uniform1i(effect.uniforms.u_texture, 0);
      gl.uniform2f(effect.uniforms.u_resolution, canvas.width, canvas.height);
      gl.uniform1f(effect.uniforms.u_time, currentTime);

      // Set attributes
      gl.enableVertexAttribArray(effect.attributes.a_position);
      gl.vertexAttribPointer(effect.attributes.a_position, 2, gl.FLOAT, false, 16, 0);
      gl.enableVertexAttribArray(effect.attributes.a_texCoord);
      gl.vertexAttribPointer(effect.attributes.a_texCoord, 2, gl.FLOAT, false, 16, 8);

      if (!isLastEffect) {
        // Render to framebuffer for chaining
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebufferRef.current);
        const tempTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tempTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tempTexture, 0);

        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        currentTexture = tempTexture;
      } else {
        // Render to canvas
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }

    const renderTime = performance.now() - startTime;

    // Update performance metrics
    const newMetrics: PerformanceMetrics = {
      fps: Math.round(1000 / renderTime),
      gpuMemoryUsage: effectsRef.current.length * 1024 * 1024, // Rough estimate
      renderTime,
      effectCount: effectsRef.current.length,
    };

    setPerformanceMetrics(newMetrics);
    onPerformanceMetrics?.(newMetrics);

    // Continue animation if playing
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(renderFrame);
    }
  }, [currentTime, isPlaying, onPerformanceMetrics]);

  // Initialize on mount
  useEffect(() => {
    const success = initializeWebGL();
    if (success) {
      setIsInitialized(true);
      initializeEffects();

      // Start GPU performance monitoring
      const stopMonitoring = gpuResourceManager.monitorPerformance((metrics) => {
        setPerformanceMetrics({
          fps: metrics.fps,
          gpuMemoryUsage: metrics.memoryUsage.totalMB,
          renderTime: 1000 / metrics.fps, // Approximate render time
          effectCount: effectsRef.current.length,
        });
        setGpuProfile(metrics.profile.name);

        // Check for memory warnings
        setMemoryWarning(metrics.memoryUsage.totalMB > 200); // 200MB threshold
      });

      return () => {
        stopMonitoring();
        gpuResourceManager.cleanup();
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeWebGL, initializeEffects]);

  // Update effects when they change
  useEffect(() => {
    if (isInitialized) {
      initializeEffects();
    }
  }, [effects, isInitialized, initializeEffects]);

  // Handle video events
  const handleVideoLoaded = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (video) {
      setCurrentTime(video.currentTime);
    }
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } else {
      video.play();
      setIsPlaying(true);
      renderFrame();
    }
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      setCurrentTime(time);
    }
  };

  const reset = () => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  return (
    <div className={`effect-preview-renderer ${className}`}>
      <div className="preview-container">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="preview-canvas"
        />

        {videoSrc && (
          <video
            ref={videoRef}
            src={videoSrc}
            onLoadedMetadata={handleVideoLoaded}
            onTimeUpdate={handleTimeUpdate}
            style={{ display: 'none' }}
            preload="metadata"
          />
        )}

        {!isInitialized && (
          <div className="fallback-message">
            <Settings size={24} />
            <p>Initialisation du rendu GPU...</p>
          </div>
        )}

        {memoryWarning && (
          <div className="memory-warning">
            <span>⚠️ Mémoire GPU élevée - ComfyUI peut être impacté</span>
          </div>
        )}

        <div className={`gpu-indicator ${performanceMetrics.fps >= 45 ? 'high-fps' : performanceMetrics.fps >= 24 ? 'medium-fps' : 'low-fps'}`}>
          GPU: {gpuProfile}
        </div>
      </div>

      <div className="preview-controls">
        <div className="playback-controls">
          <button
            className="control-btn"
            onClick={togglePlayback}
            disabled={!videoSrc}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          <button
            className="control-btn"
            onClick={reset}
            disabled={!videoSrc}
            aria-label="Reset preview"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        <div className="timeline-container">
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => seekTo(parseFloat(e.target.value))}
            className="timeline-slider"
            disabled={!videoSrc}
            aria-label="Video timeline"
          />
          <div className="time-display">
            {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}
          </div>
        </div>

        <div className="performance-info">
          <span>FPS: {performanceMetrics.fps}</span>
          <span>Effets: {performanceMetrics.effectCount}</span>
          <span>GPU: {performanceMetrics.gpuMemoryUsage.toFixed(1)}MB</span>
          <span>{performanceMetrics.renderTime.toFixed(1)}ms</span>
        </div>
      </div>
    </div>
  );
};