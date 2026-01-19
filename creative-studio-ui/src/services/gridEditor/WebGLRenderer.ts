/**
 * WebGLRenderer - GPU-accelerated rendering for panel transformations
 * 
 * Provides hardware-accelerated rendering for:
 * - Image scaling and rotation
 * - Transform operations
 * - Layer composition
 * 
 * Falls back to Canvas 2D if WebGL is unavailable
 * Requirements: 13.4
 */

import { Transform, CropRegion } from '../../types/gridEditor';

export interface WebGLRendererOptions {
  canvas: HTMLCanvasElement;
  fallbackToCanvas2D?: boolean;
}

export class WebGLRenderer {
  private gl: WebGLRenderingContext | null = null;
  private canvas: HTMLCanvasElement;
  private fallbackToCanvas2D: boolean;
  private isWebGLAvailable: boolean = false;
  
  // WebGL resources
  private program: WebGLProgram | null = null;
  private textureCache: Map<string, WebGLTexture> = new Map();
  private vertexBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;
  
  // Shader attribute/uniform locations
  private positionLocation: number = -1;
  private texCoordLocation: number = -1;
  private transformMatrixLocation: WebGLUniformLocation | null = null;
  private textureLocation: WebGLUniformLocation | null = null;
  private opacityLocation: WebGLUniformLocation | null = null;

  constructor(options: WebGLRendererOptions) {
    this.canvas = options.canvas;
    this.fallbackToCanvas2D = options.fallbackToCanvas2D ?? true;
    this.initialize();
  }

  /**
   * Initialize WebGL context and resources
   */
  private initialize(): void {
    try {
      // Try to get WebGL context
      this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!this.gl) {
        console.warn('WebGL not available, will use Canvas 2D fallback');
        this.isWebGLAvailable = false;
        return;
      }

      this.isWebGLAvailable = true;

      // Initialize shaders and program
      this.initializeShaders();
      
      // Initialize buffers
      this.initializeBuffers();

      // Enable blending for transparency
      this.gl.enable(this.gl.BLEND);
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    } catch (error) {
      console.error('Failed to initialize WebGL:', error);
      this.isWebGLAvailable = false;
    }
  }

  /**
   * Initialize vertex and fragment shaders
   */
  private initializeShaders(): void {
    if (!this.gl) return;

    // Vertex shader - handles position and texture coordinates
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform mat3 u_transformMatrix;
      varying vec2 v_texCoord;

      void main() {
        // Apply transformation matrix
        vec3 position = u_transformMatrix * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;

    // Fragment shader - handles texture sampling and opacity
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texCoord;
      uniform sampler2D u_texture;
      uniform float u_opacity;

      void main() {
        vec4 texColor = texture2D(u_texture, v_texCoord);
        gl_FragColor = vec4(texColor.rgb, texColor.a * u_opacity);
      }
    `;

    // Compile shaders
    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) {
      throw new Error('Failed to compile shaders');
    }

    // Create and link program
    this.program = this.gl.createProgram();
    if (!this.program) {
      throw new Error('Failed to create WebGL program');
    }

    this.gl.attachShader(this.program, vertexShader);
    this.gl.attachShader(this.program, fragmentShader);
    this.gl.linkProgram(this.program);

    if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      const info = this.gl.getProgramInfoLog(this.program);
      throw new Error('Failed to link program: ' + info);
    }

    // Get attribute and uniform locations
    this.positionLocation = this.gl.getAttribLocation(this.program, 'a_position');
    this.texCoordLocation = this.gl.getAttribLocation(this.program, 'a_texCoord');
    this.transformMatrixLocation = this.gl.getUniformLocation(this.program, 'u_transformMatrix');
    this.textureLocation = this.gl.getUniformLocation(this.program, 'u_texture');
    this.opacityLocation = this.gl.getUniformLocation(this.program, 'u_opacity');
  }

  /**
   * Compile a shader
   */
  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const info = this.gl.getShaderInfoLog(shader);
      console.error('Shader compilation error:', info);
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  /**
   * Initialize vertex and texture coordinate buffers
   */
  private initializeBuffers(): void {
    if (!this.gl) return;

    // Vertex positions (quad covering the viewport)
    const vertices = new Float32Array([
      -1.0, -1.0,
       1.0, -1.0,
      -1.0,  1.0,
       1.0,  1.0,
    ]);

    this.vertexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);

    // Texture coordinates
    const texCoords = new Float32Array([
      0.0, 1.0,
      1.0, 1.0,
      0.0, 0.0,
      1.0, 0.0,
    ]);

    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
  }

  /**
   * Check if WebGL is available
   */
  public isAvailable(): boolean {
    return this.isWebGLAvailable;
  }

  /**
   * Create or get cached WebGL texture from image
   */
  private getTexture(image: HTMLImageElement, url: string): WebGLTexture | null {
    if (!this.gl) return null;

    // Check cache
    const cached = this.textureCache.get(url);
    if (cached) return cached;

    // Create new texture
    const texture = this.gl.createTexture();
    if (!texture) return null;

    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // Set texture parameters
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // Upload image data
    this.gl.texImage2D(
      this.gl.TEXTURE_2D,
      0,
      this.gl.RGBA,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      image
    );

    // Cache texture
    this.textureCache.set(url, texture);

    return texture;
  }

  /**
   * Create transformation matrix from transform parameters
   */
  private createTransformMatrix(
    transform: Transform,
    bounds: { x: number; y: number; width: number; height: number },
    canvasWidth: number,
    canvasHeight: number
  ): Float32Array {
    // Convert canvas coordinates to clip space (-1 to 1)
    const x = (bounds.x / canvasWidth) * 2 - 1;
    const y = -((bounds.y / canvasHeight) * 2 - 1);
    const w = (bounds.width / canvasWidth) * 2;
    const h = (bounds.height / canvasHeight) * 2;

    // Create transformation matrix (3x3 for 2D transforms)
    const matrix = new Float32Array(9);

    // Translation
    const tx = x + w / 2 + (transform.position.x / canvasWidth) * 2;
    const ty = y - h / 2 - (transform.position.y / canvasHeight) * 2;

    // Rotation (in radians)
    const angle = (transform.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // Scale
    const sx = transform.scale.x * w / 2;
    const sy = transform.scale.y * h / 2;

    // Combined transformation matrix
    // [sx*cos, sx*sin, tx]
    // [-sy*sin, sy*cos, ty]
    // [0, 0, 1]
    matrix[0] = sx * cos;
    matrix[1] = -sy * sin;
    matrix[2] = 0;
    matrix[3] = sx * sin;
    matrix[4] = sy * cos;
    matrix[5] = 0;
    matrix[6] = tx;
    matrix[7] = ty;
    matrix[8] = 1;

    return matrix;
  }

  /**
   * Render an image with GPU acceleration
   */
  public renderImage(
    image: HTMLImageElement,
    imageUrl: string,
    bounds: { x: number; y: number; width: number; height: number },
    transform: Transform,
    opacity: number = 1.0,
    crop?: CropRegion
  ): boolean {
    if (!this.gl || !this.program || !this.isWebGLAvailable) {
      return false; // Fallback to Canvas 2D
    }

    try {
      // Get or create texture
      const texture = this.getTexture(image, imageUrl);
      if (!texture) return false;

      // Use shader program
      this.gl.useProgram(this.program);

      // Set up vertex positions
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
      this.gl.enableVertexAttribArray(this.positionLocation);
      this.gl.vertexAttribPointer(this.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

      // Set up texture coordinates (handle crop if present)
      if (crop) {
        // Adjust texture coordinates for crop region
        const texCoords = new Float32Array([
          crop.x, crop.y + crop.height,
          crop.x + crop.width, crop.y + crop.height,
          crop.x, crop.y,
          crop.x + crop.width, crop.y,
        ]);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.DYNAMIC_DRAW);
      } else {
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
      }
      this.gl.enableVertexAttribArray(this.texCoordLocation);
      this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

      // Set transformation matrix
      const matrix = this.createTransformMatrix(transform, bounds, this.canvas.width, this.canvas.height);
      this.gl.uniformMatrix3fv(this.transformMatrixLocation, false, matrix);

      // Set texture
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      this.gl.uniform1i(this.textureLocation, 0);

      // Set opacity
      this.gl.uniform1f(this.opacityLocation, opacity);

      // Draw
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);

      return true;
    } catch (error) {
      console.error('WebGL rendering error:', error);
      return false;
    }
  }

  /**
   * Clear the canvas
   */
  public clear(r: number = 1, g: number = 1, b: number = 1, a: number = 1): void {
    if (!this.gl) return;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * Resize the WebGL viewport
   */
  public resize(width: number, height: number): void {
    if (!this.gl) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  /**
   * Clean up WebGL resources
   */
  public dispose(): void {
    if (!this.gl) return;

    // Delete textures
    this.textureCache.forEach(texture => {
      this.gl?.deleteTexture(texture);
    });
    this.textureCache.clear();

    // Delete buffers
    if (this.vertexBuffer) {
      this.gl.deleteBuffer(this.vertexBuffer);
    }
    if (this.texCoordBuffer) {
      this.gl.deleteBuffer(this.texCoordBuffer);
    }

    // Delete program
    if (this.program) {
      this.gl.deleteProgram(this.program);
    }

    this.gl = null;
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): {
    isWebGLAvailable: boolean;
    textureCount: number;
    memoryEstimate: number;
  } {
    return {
      isWebGLAvailable: this.isWebGLAvailable,
      textureCount: this.textureCache.size,
      memoryEstimate: this.textureCache.size * 4 * 1024 * 1024, // Rough estimate: 4MB per texture
    };
  }
}
