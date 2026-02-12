/**
 * Three.js Service for StoryCore
 * 
 * Centralized Three.js scene management service that provides:
 * - Scene initialization and disposal
 * - Model loading and management
 * - Camera control and animation
 * - Rendering capabilities
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ThreeJsSceneConfig,
  CameraConfig,
  ModelConfig,
  ModelLoadResult,
  AnimationConfig,
  CameraAnimationConfig,
  CameraKeyframe,
  EasingType,
  ThreeJsState,
  ThreeJsActions,
  ThreeJsEventMap
} from './ThreeJsTypes';

// ============================================================================
// Event Emitter for Three.js Service
// ============================================================================

type EventCallback<T extends keyof ThreeJsEventMap> =
  ThreeJsEventMap[T] extends []
  ? () => void
  : ThreeJsEventMap[T] extends [infer T1]
  ? (arg1: T1) => void
  : never;

class ThreeJsEventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on<K extends keyof ThreeJsEventMap>(event: K, callback: EventCallback<K>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off<K extends keyof ThreeJsEventMap>(event: K, callback: EventCallback<K>): void {
    this.events.get(event)?.delete(callback);
  }

  emit<K extends keyof ThreeJsEventMap>(event: K, ...args: ThreeJsEventMap[K]): void {
    this.events.get(event)?.forEach(callback => {
      (callback as Function)(...args);
    });
  }
}

// ============================================================================
// Easing Functions
// ============================================================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  elastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  smoothstep: (t: number) => t * t * (3 - 2 * t),
  smootherstep: (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
};

// ============================================================================
// Three.js Service Implementation
// ============================================================================

class ThreeJsService implements ThreeJsActions {
  private state: ThreeJsState;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private models: Map<string, { result: ModelLoadResult; actions: Map<string, THREE.AnimationAction> }> = new Map();
  private animationMixers: Map<string, THREE.AnimationMixer> = new Map();
  private lights: Map<string, THREE.Light> = new Map();
  private clock: THREE.Clock;
  private animationFrameId: number | null = null;
  private cameraAnimationFrameId: number | null = null;
  private cameraAnimationStartTime: number = 0;
  private currentCameraAnimation: CameraAnimationConfig | null = null;
  private eventEmitter: ThreeJsEventEmitter;
  private isInitialized: boolean = false;

  constructor() {
    this.state = {
      sceneConfig: null,
      models: new Map(),
      cameraConfig: null,
      activeAnimation: null,
      isReady: false,
      isRendering: false,
      error: null
    };
    this.clock = new THREE.Clock();
    this.eventEmitter = new ThreeJsEventEmitter();
  }

  // ==========================================================================
  // Event Handling
  // ==========================================================================

  on<K extends keyof ThreeJsEventMap>(event: K, callback: EventCallback<K>): void {
    this.eventEmitter.on(event, callback);
  }

  off<K extends keyof ThreeJsEventMap>(event: K, callback: EventCallback<K>): void {
    this.eventEmitter.off(event, callback);
  }

  private emit<K extends keyof ThreeJsEventMap>(event: K, ...args: ThreeJsEventMap[K]): void {
    this.eventEmitter.emit(event, ...args);
  }

  // ==========================================================================
  // Scene Initialization
  // ==========================================================================

  async initializeScene(config: ThreeJsSceneConfig): Promise<void> {
    try {
      // Dispose existing scene if any
      this.disposeScene();

      // Create scene
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(config.backgroundColor);

      // Create camera
      this.camera = new THREE.PerspectiveCamera(
        config.width > 0 ? 60 : 75,
        config.width / (config.height || 1),
        0.1,
        1000
      );
      this.camera.position.set(0, 0, 5);

      // Create renderer
      this.renderer = new THREE.WebGLRenderer({
        antialias: config.antialias,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      this.renderer.setSize(config.width, config.height);
      this.renderer.setPixelRatio(config.pixelRatio);
      this.renderer.shadowMap.enabled = config.shadows;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1;

      // Add default lighting
      this.addDefaultLighting();

      // Update state
      this.state.sceneConfig = config;
      this.state.cameraConfig = {
        type: 'perspective',
        fov: 60,
        near: 0.1,
        far: 1000,
        position: [0, 0, 5],
        lookAt: [0, 0, 0],
        enableControls: config.enableControls !== false
      };

      // Initialize controls if enabled
      if (this.state.cameraConfig.enableControls && this.camera && this.renderer) {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.addEventListener('change', () => {
          if (this.state.cameraConfig) {
            this.state.cameraConfig.position = [
              this.camera!.position.x,
              this.camera!.position.y,
              this.camera!.position.z
            ];
            this.state.cameraConfig.lookAt = [
              this.controls!.target.x,
              this.controls!.target.y,
              this.controls!.target.z
            ];
          }
        });
      }

      this.state.isReady = true;
      this.state.error = null;

      this.emit('scene:ready');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.error = errorMessage;
      this.emit('scene:error', errorMessage);
      throw error;
    }
  }

  private addDefaultLighting(): void {
    if (!this.scene) return;

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.lights.set('ambient', ambientLight);
    this.scene.add(ambientLight);

    // Main directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.lights.set('directional', directionalLight);
    this.scene.add(directionalLight);

    // Fill light
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    fillLight.position.set(-10, 0, 10);
    this.lights.set('fill', fillLight);
    this.scene.add(fillLight);
  }

  disposeScene(): void {
    // Stop all animations
    this.stopRendering();
    this.animationMixers.forEach(mixer => mixer.stopAllAction());
    this.animationMixers.clear();

    // Dispose controls
    this.controls?.dispose();
    this.controls = null;

    // Dispose models
    this.models.forEach(({ result }) => {
      result.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
    });
    this.models.clear();

    // Dispose lights
    this.lights.forEach(light => light.dispose());
    this.lights.clear();

    // Dispose renderer
    this.renderer?.dispose();
    this.renderer = null;

    // Dispose scene
    this.scene = null;

    // Reset camera
    this.camera = null;

    // Reset state
    this.state.isReady = false;
    this.state.isRendering = false;
    this.state.sceneConfig = null;
    this.state.cameraConfig = null;
    this.state.activeAnimation = null;

    this.isInitialized = false;
  }

  // ==========================================================================
  // Model Loading
  // ==========================================================================

  async loadModel(id: string, config: ModelConfig): Promise<ModelLoadResult> {
    if (!this.scene) {
      throw new Error('Scene not initialized');
    }

    try {
      // Create a placeholder geometry for now
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const group = new THREE.Group();
      group.add(mesh);
      group.scale.setScalar(config.scale);
      group.position.set(...config.position);
      group.rotation.set(...config.rotation);

      const boundingBox = new THREE.Box3().setFromObject(group);

      const result: ModelLoadResult = {
        scene: group,
        animations: [],
        boundingBox,
        success: true
      };

      this.scene.add(group);
      this.models.set(id, { result, actions: new Map() });

      this.emit('model:loaded', id, result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('model:error', id, errorMessage);
      return {
        scene: new THREE.Group(),
        animations: [],
        boundingBox: new THREE.Box3(),
        success: false,
        error: errorMessage
      };
    }
  }

  unloadModel(id: string): void {
    const modelData = this.models.get(id);
    if (modelData) {
      this.scene?.remove(modelData.result.scene);
      modelData.result.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach(m => m.dispose());
          } else {
            object.material?.dispose();
          }
        }
      });
      this.animationMixers.delete(id);
      this.models.delete(id);
    }
  }

  // ==========================================================================
  // Animation
  // ==========================================================================

  playAnimation(modelId: string, config: AnimationConfig): void {
    const modelData = this.models.get(modelId);
    if (!modelData) return;

    // Stop existing animation
    this.stopAnimation(modelId);

    // Create animation mixer
    const mixer = this.animationMixers.get(modelId) || new THREE.AnimationMixer(modelData.result.scene);
    this.animationMixers.set(modelId, mixer);

    // Create a simple rotation animation
    const times = [0, 1];
    const values = [0, Math.PI * 2];
    const track = new THREE.NumberKeyframeTrack('.rotation[y]', times, values);
    const clip = new THREE.AnimationClip('rotation', 1, [track]);

    const action = mixer.clipAction(clip);
    action.loop = config.loop ? THREE.LoopRepeat : THREE.LoopOnce;
    action.clampWhenFinished = !config.loop;
    action.play();

    this.state.activeAnimation = config.animationName;
    this.emit('animation:started', modelId, config.animationName);
  }

  stopAnimation(modelId: string): void {
    const mixer = this.animationMixers.get(modelId);
    if (mixer) {
      mixer.stopAllAction();
      this.emit('animation:ended', modelId, this.state.activeAnimation || '');
    }
    this.state.activeAnimation = null;
  }

  // ==========================================================================
  // Camera Animation
  // ==========================================================================

  animateCamera(config: CameraAnimationConfig): void {
    if (!this.camera) return;

    this.stopCameraAnimation();
    this.currentCameraAnimation = config;
    this.cameraAnimationStartTime = Date.now();

    const animate = () => {
      if (!this.currentCameraAnimation || !this.camera) return;

      const elapsed = (Date.now() - this.cameraAnimationStartTime) / 1000;
      const progress = Math.min(elapsed / config.duration, 1);

      const { position, target } = this.interpolateCameraKeyframes(
        config.keyframes,
        progress,
        config.duration
      );

      this.camera.position.set(position[0], position[1], position[2]);
      this.camera.lookAt(target[0], target[1], target[2]);

      this.emit('camera:animating', progress);

      if (progress < 1) {
        this.cameraAnimationFrameId = requestAnimationFrame(animate);
      } else if (config.loop) {
        this.cameraAnimationStartTime = Date.now();
        this.cameraAnimationFrameId = requestAnimationFrame(animate);
      }
    };

    this.cameraAnimationFrameId = requestAnimationFrame(animate);
  }

  private interpolateCameraKeyframes(
    keyframes: CameraKeyframe[],
    progress: number,
    duration: number
  ): { position: number[]; target: number[] } {
    if (keyframes.length === 0) {
      return { position: [0, 0, 5], target: [0, 0, 0] };
    }

    // Find surrounding keyframes
    const time = progress * duration;
    let startKeyframe = keyframes[0];
    let endKeyframe = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        startKeyframe = keyframes[i];
        endKeyframe = keyframes[i + 1];
        break;
      }
    }

    // Calculate interpolation factor
    const keyframeDuration = endKeyframe.time - startKeyframe.time;
    const keyframeProgress = keyframeDuration > 0
      ? (time - startKeyframe.time) / keyframeDuration
      : 0;

    const easedProgress = easingFunctions[startKeyframe.easing](keyframeProgress);

    // Interpolate position
    const position: number[] = [];
    for (let i = 0; i < 3; i++) {
      position.push(
        startKeyframe.position[i] +
        (endKeyframe.position[i] - startKeyframe.position[i]) * easedProgress
      );
    }

    // Interpolate target
    const target: number[] = [];
    for (let i = 0; i < 3; i++) {
      target.push(
        startKeyframe.target[i] +
        (endKeyframe.target[i] - startKeyframe.target[i]) * easedProgress
      );
    }

    return { position, target };
  }

  stopCameraAnimation(): void {
    if (this.cameraAnimationFrameId !== null) {
      cancelAnimationFrame(this.cameraAnimationFrameId);
      this.cameraAnimationFrameId = null;
    }
    this.currentCameraAnimation = null;
  }

  updateCameraPosition(position: [number, number, number]): void {
    if (this.camera) {
      this.camera.position.set(position[0], position[1], position[2]);
    }
  }

  updateEffects(config: Partial<import('./ThreeJsTypes').EffectComposerConfig>): void {
    // Post-processing effects are handled externally or via EffectComposer
    // This is a placeholder for future post-processing implementation
  }

  // ==========================================================================
  // Rendering
  // ==========================================================================

  renderFrame(): void {
    if (!this.scene || !this.camera || !this.renderer) return;

    const delta = this.clock.getDelta();

    // Update animation mixers
    this.animationMixers.forEach(mixer => mixer.update(delta));

    // Update controls
    if (this.controls) {
      this.controls.update();
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    this.emit('frame:rendered', 0);
  }

  startRendering(): void {
    if (this.state.isRendering) return;

    this.state.isRendering = true;

    const animate = () => {
      if (!this.state.isRendering) return;

      this.renderFrame();
      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  stopRendering(): void {
    this.state.isRendering = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  // ==========================================================================
  // Getters
  // ==========================================================================

  getScene(): THREE.Scene | null {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera | null {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  getState(): ThreeJsState {
    return { ...this.state, models: new Map(this.state.models) };
  }

  getModel(id: string): ModelLoadResult | undefined {
    return this.models.get(id)?.result;
  }

  isReady(): boolean {
    return this.state.isReady;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const threeJsService = new ThreeJsService();

// ============================================================================
// Default Configurations
// ============================================================================

export const defaultSceneConfig: ThreeJsSceneConfig = {
  width: 1920,
  height: 1080,
  backgroundColor: '#000000',
  antialias: true,
  shadows: true,
  pixelRatio: 1
};

export const defaultCameraConfig: CameraConfig = {
  type: 'perspective',
  fov: 60,
  near: 0.1,
  far: 1000,
  position: [0, 0, 5],
  lookAt: [0, 0, 0],
  enableControls: true
};

export const defaultCameraAnimationConfig: CameraAnimationConfig = {
  keyframes: [
    {
      time: 0,
      position: [0, 0, 5],
      target: [0, 0, 0],
      easing: 'easeOut'
    }
  ],
  duration: 5,
  loop: false,
  autoStart: false
};

export { THREE };
