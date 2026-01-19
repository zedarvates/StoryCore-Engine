/**
 * Wizard Service
 * 
 * Main service class for wizard backend integration.
 * Handles connection management, wizard execution, and output processing.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 1.7, 3.1-3.7, 4.1-4.7, 5.1-5.7, 6.1-6.7, 7.1-7.6, 8.1-8.6
 */

import type {
  ConnectionStatus,
  CharacterWizardInput,
  SceneGeneratorInput,
  StoryboardInput,
  DialogueInput,
  WorldBuildingInput,
  StyleTransferInput,
  WizardOutput,
} from './types';
import { WizardError } from './types';
import { getLogger } from './logger';
import { OllamaClient, getOllamaClient } from './OllamaClient';
import { ComfyUIClient, getComfyUIClient } from './ComfyUIClient';
import { ComfyUIInstanceManager } from './ComfyUIInstanceManager';
import { joinPath } from './pathUtils';

/**
 * Connection retry configuration
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Wizard Service Class
 * 
 * Provides connection management and wizard execution capabilities.
 */
export class WizardService {
  private logger = getLogger();
  private retryConfig: RetryConfig;
  private ollamaEndpoint: string;
  private comfyuiEndpoint: string;
  private instanceManager?: ComfyUIInstanceManager;

  constructor(
    ollamaEndpoint: string = 'http://localhost:11434',
    comfyuiEndpoint: string = 'http://localhost:8188',
    retryConfig?: Partial<RetryConfig>,
    instanceManager?: ComfyUIInstanceManager
  ) {
    this.ollamaEndpoint = ollamaEndpoint;
    this.comfyuiEndpoint = comfyuiEndpoint;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
    this.instanceManager = instanceManager;
  }

  /**
   * Check Ollama connection
   * Pings http://localhost:11434/api/tags to verify service availability
   * 
   * Requirements: 1.1
   */
  async checkOllamaConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    const endpoint = `${this.ollamaEndpoint}/api/tags`;

    this.logger.debug('connection', 'Checking Ollama connection', { endpoint });

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const error = `Ollama service returned ${response.status}: ${response.statusText}`;
        this.logger.warn('connection', 'Ollama connection check failed', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
        });

        return {
          connected: false,
          service: 'ollama',
          endpoint: this.ollamaEndpoint,
          error,
          latency,
        };
      }

      // Try to parse response to get model information
      let metadata: Record<string, any> = {};
      try {
        const data = await response.json();
        metadata = {
          models: data.models || [],
          modelCount: data.models?.length || 0,
        };
      } catch {
        // If parsing fails, connection is still valid
      }

      this.logger.info('connection', 'Ollama connection successful', {
        endpoint,
        latency,
        ...metadata,
      });

      return {
        connected: true,
        service: 'ollama',
        endpoint: this.ollamaEndpoint,
        latency,
        metadata,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('connection', 'Ollama connection failed', error as Error, {
        endpoint,
        latency,
      });

      return {
        connected: false,
        service: 'ollama',
        endpoint: this.ollamaEndpoint,
        error: `Cannot reach Ollama service: ${errorMessage}`,
        latency,
      };
    }
  }

  /**
   * Check ComfyUI connection
   * Pings http://localhost:8188/system_stats to verify service availability
   * 
   * Requirements: 1.2
   */
  async checkComfyUIConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    const endpoint = `${this.comfyuiEndpoint}/system_stats`;

    this.logger.debug('connection', 'Checking ComfyUI connection', { endpoint });

    try {
      const response = await fetch(endpoint, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        const error = `ComfyUI service returned ${response.status}: ${response.statusText}`;
        this.logger.warn('connection', 'ComfyUI connection check failed', {
          endpoint,
          status: response.status,
          statusText: response.statusText,
        });

        return {
          connected: false,
          service: 'comfyui',
          endpoint: this.comfyuiEndpoint,
          error,
          latency,
        };
      }

      // Try to parse system stats
      let metadata: Record<string, any> = {};
      try {
        const data = await response.json();
        metadata = {
          system: data.system || {},
          devices: data.devices || [],
        };
      } catch {
        // If parsing fails, connection is still valid
      }

      this.logger.info('connection', 'ComfyUI connection successful', {
        endpoint,
        latency,
        ...metadata,
      });

      return {
        connected: true,
        service: 'comfyui',
        endpoint: this.comfyuiEndpoint,
        latency,
        metadata,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('connection', 'ComfyUI connection failed', error as Error, {
        endpoint,
        latency,
      });

      return {
        connected: false,
        service: 'comfyui',
        endpoint: this.comfyuiEndpoint,
        error: `Cannot reach ComfyUI service: ${errorMessage}`,
        latency,
      };
    }
  }

  /**
   * Check connection with retry logic and exponential backoff
   * 
   * @param checkFn - Connection check function to retry
   * @param serviceName - Name of service for logging
   * @returns Connection status after retries
   */
  async checkConnectionWithRetry(
    checkFn: () => Promise<ConnectionStatus>,
    serviceName: string
  ): Promise<ConnectionStatus> {
    let lastStatus: ConnectionStatus | null = null;
    let delayMs = this.retryConfig.initialDelayMs;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      this.logger.debug('connection', `Connection attempt ${attempt}/${this.retryConfig.maxAttempts}`, {
        service: serviceName,
        attempt,
      });

      lastStatus = await checkFn();

      if (lastStatus.connected) {
        this.logger.info('connection', `Connection successful on attempt ${attempt}`, {
          service: serviceName,
          attempt,
        });
        return lastStatus;
      }

      // Don't delay after last attempt
      if (attempt < this.retryConfig.maxAttempts) {
        this.logger.debug('connection', `Retrying after ${delayMs}ms`, {
          service: serviceName,
          attempt,
          delayMs,
        });

        await this.delay(delayMs);

        // Exponential backoff with max delay cap
        delayMs = Math.min(
          delayMs * this.retryConfig.backoffMultiplier,
          this.retryConfig.maxDelayMs
        );
      }
    }

    this.logger.warn('connection', `Connection failed after ${this.retryConfig.maxAttempts} attempts`, {
      service: serviceName,
      attempts: this.retryConfig.maxAttempts,
    });

    return lastStatus!;
  }

  /**
   * Check Ollama connection with retry logic
   * 
   * Requirements: 1.1
   */
  async checkOllamaConnectionWithRetry(): Promise<ConnectionStatus> {
    return this.checkConnectionWithRetry(
      () => this.checkOllamaConnection(),
      'ollama'
    );
  }

  /**
   * Check ComfyUI connection with retry logic
   * 
   * Requirements: 1.2
   */
  async checkComfyUIConnectionWithRetry(): Promise<ConnectionStatus> {
    return this.checkConnectionWithRetry(
      () => this.checkComfyUIConnection(),
      'comfyui'
    );
  }

  /**
   * Check both services and return combined status
   * 
   * Requirements: 1.1, 1.2
   */
  async checkAllConnections(): Promise<{
    ollama: ConnectionStatus;
    comfyui: ConnectionStatus;
    allConnected: boolean;
  }> {
    this.logger.info('connection', 'Checking all service connections');

    const [ollama, comfyui] = await Promise.all([
      this.checkOllamaConnection(),
      this.checkComfyUIConnection(),
    ]);

    const allConnected = ollama.connected && comfyui.connected;

    this.logger.info('connection', 'All connection checks complete', {
      ollamaConnected: ollama.connected,
      comfyuiConnected: comfyui.connected,
      allConnected,
    });

    return {
      ollama,
      comfyui,
      allConnected,
    };
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update Ollama endpoint
   */
  setOllamaEndpoint(endpoint: string): void {
    this.ollamaEndpoint = endpoint;
    this.logger.info('connection', 'Ollama endpoint updated', { endpoint });
  }

  /**
   * Update ComfyUI endpoint
   */
  setComfyUIEndpoint(endpoint: string): void {
    this.comfyuiEndpoint = endpoint;
    this.logger.info('connection', 'ComfyUI endpoint updated', { endpoint });
  }

  /**
   * Get current Ollama endpoint
   */
  getOllamaEndpoint(): string {
    return this.ollamaEndpoint;
  }

  /**
   * Get current ComfyUI endpoint
   */
  getComfyUIEndpoint(): string {
    return this.comfyuiEndpoint;
  }

  /**
   * Update retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    this.logger.info('connection', 'Retry configuration updated', this.retryConfig);
  }

  /**
   * Get current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Get ComfyUI client for operations
   * Uses instance manager if available, otherwise falls back to singleton
   */
  private getComfyUIClient(): ComfyUIClient {
    if (this.instanceManager) {
      const instance = this.instanceManager.getHealthyInstance();
      if (instance?.client) {
        return instance.client;
      }
      // If no healthy instance, fall back to singleton
    }
    return getComfyUIClient();
  }

  /**
   * Set the instance manager
   */
  setInstanceManager(instanceManager: ComfyUIInstanceManager): void {
    this.instanceManager = instanceManager;
    this.logger.info('wizard', 'ComfyUI instance manager updated');
  }

  /**
   * Get the current instance manager
   */
  getInstanceManager(): ComfyUIInstanceManager | undefined {
    return this.instanceManager;
  }

  // ============================================================================
  // Wizard Execution Methods
  // ============================================================================

  /**
   * Execute Character Wizard
   * Generates character profile with Ollama, then creates reference image with ComfyUI
   * 
   * Requirements: 3.1-3.7
   */
  async executeCharacterWizard(
    input: CharacterWizardInput,
    ollamaClient?: OllamaClient,
    comfyuiClient?: ComfyUIClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing Character Wizard', { characterName: input.name });

    const ollama = ollamaClient || getOllamaClient();
    const comfyui = comfyuiClient || this.getComfyUIClient();

    try {
      // Step 1: Generate character profile with Ollama
      this.logger.debug('wizard', 'Generating character profile with Ollama');
      
      const characterPromptData = {
        name: input.name,
        description: input.description,
        personality: input.personality.join(', '),
        visual_attributes: input.visualAttributes,
      };

      const profileResponse = await ollama.generateWithTemplate(
        'character',
        characterPromptData
      );

      const characterProfile = ollama.parseJSONResponse(profileResponse);

      // Step 2: Generate reference image with ComfyUI
      this.logger.debug('wizard', 'Generating character reference image with ComfyUI');

      const visualDescription = `${input.visualAttributes.appearance}, ${input.visualAttributes.age} years old, ${input.visualAttributes.gender}, wearing ${input.visualAttributes.clothing}, high quality, detailed, character reference sheet`;

      const workflow = comfyui.buildWorkflow('character_reference', {
        character_description: visualDescription,
      });

      const { promptId, outputs } = await comfyui.executeWorkflow(workflow);

      // Step 3: Prepare output
      const characterId = `char_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const output: WizardOutput = {
        type: 'character',
        data: {
          id: characterId,
          name: input.name,
          description: input.description,
          personality: input.personality,
          visual_attributes: input.visualAttributes,
          ...characterProfile,
          created_at: timestamp,
        },
        files: outputs.map((img) => ({
          path: `characters/${characterId}_reference.png`,
          filename: `${characterId}_reference.png`,
          type: 'image',
          url: `${comfyui.getEndpoint()}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`,
        })),
        metadata: {
          wizardType: 'character',
          generatedAt: timestamp,
          modelUsed: ollama.getModel(),
          parameters: {
            ollamaOptions: ollama.getDefaultOptions(),
            comfyuiPromptId: promptId,
          },
        },
      };

      this.logger.info('wizard', 'Character Wizard completed successfully', {
        characterId,
        characterName: input.name,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'Character Wizard failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute Scene Generator
   * Generates shot breakdown with Ollama
   * 
   * Requirements: 4.1-4.7
   */
  async executeSceneGenerator(
    input: SceneGeneratorInput,
    ollamaClient?: OllamaClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing Scene Generator', { concept: input.concept });

    const ollama = ollamaClient || getOllamaClient();

    try {
      // Generate scene breakdown with Ollama
      this.logger.debug('wizard', 'Generating scene breakdown with Ollama');

      const scenePromptData = {
        concept: input.concept,
        mood: input.mood,
        duration: input.duration,
        characters: input.characters.join(', '),
        location: input.location,
      };

      const sceneResponse = await ollama.generateWithTemplate(
        'scene',
        scenePromptData
      );

      const sceneBreakdown = ollama.parseJSONResponse(sceneResponse);

      // Prepare output
      const sceneId = `scene_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const output: WizardOutput = {
        type: 'scene',
        data: {
          id: sceneId,
          name: sceneBreakdown.scene_title || input.concept,
          concept: input.concept,
          mood: input.mood,
          duration: input.duration,
          location: input.location,
          characters: input.characters,
          shots: sceneBreakdown.shots || [],
          created_at: timestamp,
        },
        files: [
          {
            path: `scenes/${sceneId}.json`,
            filename: `${sceneId}.json`,
            type: 'json',
          },
        ],
        metadata: {
          wizardType: 'scene',
          generatedAt: timestamp,
          modelUsed: ollama.getModel(),
          parameters: {
            ollamaOptions: ollama.getDefaultOptions(),
            shotCount: sceneBreakdown.shots?.length || 0,
          },
        },
      };

      this.logger.info('wizard', 'Scene Generator completed successfully', {
        sceneId,
        shotCount: sceneBreakdown.shots?.length || 0,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'Scene Generator failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute Storyboard Creator
   * Generates shot sequence with Ollama, then creates images for each shot with ComfyUI
   * 
   * Requirements: 5.1-5.7
   */
  async executeStoryboardCreator(
    input: StoryboardInput,
    ollamaClient?: OllamaClient,
    comfyuiClient?: ComfyUIClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing Storyboard Creator', {
      scriptLength: input.scriptText.length,
      mode: input.mode,
    });

    const ollama = ollamaClient || getOllamaClient();
    const comfyui = comfyuiClient || this.getComfyUIClient();

    try {
      // Step 1: Generate storyboard with Ollama
      this.logger.debug('wizard', 'Generating storyboard with Ollama');

      const storyboardPromptData = {
        script: input.scriptText,
        visual_style: input.visualStyle,
        pacing: input.pacing,
      };

      const storyboardResponse = await ollama.generateWithTemplate(
        'storyboard',
        storyboardPromptData
      );

      const storyboard = ollama.parseJSONResponse(storyboardResponse);

      // Step 2: Generate images for each shot with ComfyUI
      this.logger.debug('wizard', 'Generating storyboard frames with ComfyUI', {
        shotCount: storyboard.shots?.length || 0,
      });

      const shots = storyboard.shots || [];
      const generatedFiles = [];

      for (let i = 0; i < shots.length; i++) {
        const shot = shots[i];
        const shotId = `shot_${Date.now()}_${i}`;

        this.logger.debug('wizard', `Generating frame for shot ${i + 1}/${shots.length}`);

        const workflow = comfyui.buildWorkflow('storyboard_frame', {
          shot_description: shot.visual_prompt || shot.description,
        });

        const { outputs } = await comfyui.executeWorkflow(workflow);

        if (outputs.length > 0) {
          const img = outputs[0];
          generatedFiles.push({
            path: `shots/${shotId}_frame.png`,
            filename: `${shotId}_frame.png`,
            type: 'image' as const,
            url: `${comfyui.getEndpoint()}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`,
          });

          // Update shot with generated image reference
          shot.id = shotId;
          shot.frame_path = `shots/${shotId}_frame.png`;
        }
      }

      // Prepare output
      const storyboardId = `storyboard_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const output: WizardOutput = {
        type: 'storyboard',
        data: {
          id: storyboardId,
          title: storyboard.title || 'Storyboard',
          total_duration: storyboard.total_duration || 0,
          visual_style: input.visualStyle,
          shots: shots,
          mode: input.mode,
          created_at: timestamp,
        },
        files: [
          {
            path: `storyboards/${storyboardId}.json`,
            filename: `${storyboardId}.json`,
            type: 'json',
          },
          ...generatedFiles,
        ],
        metadata: {
          wizardType: 'storyboard',
          generatedAt: timestamp,
          modelUsed: ollama.getModel(),
          parameters: {
            ollamaOptions: ollama.getDefaultOptions(),
            shotCount: shots.length,
            mode: input.mode,
          },
        },
      };

      this.logger.info('wizard', 'Storyboard Creator completed successfully', {
        storyboardId,
        shotCount: shots.length,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'Storyboard Creator failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute Dialogue Writer
   * Generates dialogue with Ollama and parses speaker labels
   * 
   * Requirements: 6.1-6.7
   */
  async executeDialogueWriter(
    input: DialogueInput,
    ollamaClient?: OllamaClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing Dialogue Writer', {
      characters: input.characters,
      tone: input.tone,
    });

    const ollama = ollamaClient || getOllamaClient();

    try {
      // Generate dialogue with Ollama
      this.logger.debug('wizard', 'Generating dialogue with Ollama');

      const dialoguePromptData = {
        scene_context: input.sceneContext,
        characters: input.characters.join(', '),
        tone: input.tone,
      };

      const dialogueResponse = await ollama.generateWithTemplate(
        'dialogue',
        dialoguePromptData
      );

      const dialogue = ollama.parseJSONResponse(dialogueResponse);

      // Prepare output
      const dialogueId = `dialogue_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const output: WizardOutput = {
        type: 'dialogue',
        data: {
          id: dialogueId,
          scene_context: input.sceneContext,
          characters: input.characters,
          tone: input.tone,
          dialogue_tracks: dialogue.dialogue_tracks || [],
          created_at: timestamp,
        },
        files: [
          {
            path: `dialogue/${dialogueId}_dialogue.json`,
            filename: `${dialogueId}_dialogue.json`,
            type: 'json',
          },
        ],
        metadata: {
          wizardType: 'dialogue',
          generatedAt: timestamp,
          modelUsed: ollama.getModel(),
          parameters: {
            ollamaOptions: ollama.getDefaultOptions(),
            trackCount: dialogue.dialogue_tracks?.length || 0,
          },
        },
      };

      this.logger.info('wizard', 'Dialogue Writer completed successfully', {
        dialogueId,
        trackCount: dialogue.dialogue_tracks?.length || 0,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'Dialogue Writer failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute World Builder
   * Generates world documentation with Ollama
   * 
   * Requirements: 7.1-7.6
   */
  async executeWorldBuilder(
    input: WorldBuildingInput,
    ollamaClient?: OllamaClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing World Builder', { worldName: input.name });

    const ollama = ollamaClient || getOllamaClient();

    try {
      // Generate world documentation with Ollama
      this.logger.debug('wizard', 'Generating world documentation with Ollama');

      const worldPromptData = {
        name: input.name,
        setting: input.setting,
        time_period: input.timePeriod,
        locations: input.locations.join(', '),
      };

      const worldResponse = await ollama.generateWithTemplate(
        'world',
        worldPromptData
      );

      const world = ollama.parseJSONResponse(worldResponse);

      // Prepare output
      const worldId = `world_${Date.now()}`;
      const timestamp = new Date().toISOString();

      const output: WizardOutput = {
        type: 'world',
        data: {
          id: worldId,
          name: input.name,
          setting: input.setting,
          time_period: input.timePeriod,
          locations: world.locations || [],
          rules: world.rules || [],
          lore: world.lore || '',
          culture: world.culture || {},
          technology_magic: world.technology_magic || '',
          threats: world.threats || [],
          created_at: timestamp,
        },
        files: [
          {
            path: `world/world_definition.json`,
            filename: 'world_definition.json',
            type: 'json',
          },
        ],
        metadata: {
          wizardType: 'world',
          generatedAt: timestamp,
          modelUsed: ollama.getModel(),
          parameters: {
            ollamaOptions: ollama.getDefaultOptions(),
          },
        },
      };

      this.logger.info('wizard', 'World Builder completed successfully', {
        worldId,
        worldName: input.name,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'World Builder failed', error as Error);
      throw error;
    }
  }

  /**
   * Execute Style Transfer
   * Applies style to existing shot using ComfyUI
   * 
   * Requirements: 8.1-8.6
   */
  async executeStyleTransfer(
    input: StyleTransferInput,
    comfyuiClient?: ComfyUIClient
  ): Promise<WizardOutput> {
    this.logger.info('wizard', 'Executing Style Transfer', { shotId: input.shotId });

    const comfyui = comfyuiClient || this.getComfyUIClient();

    try {
      // Generate styled image with ComfyUI
      this.logger.debug('wizard', 'Applying style transfer with ComfyUI');

      const styleDescription = typeof input.styleReference === 'string' 
        ? input.styleReference 
        : 'Apply artistic style';

      const sourceImage = typeof input.styleReference === 'string'
        ? input.shotId // Use shot ID as source image reference
        : input.styleReference.name;

      const workflow = comfyui.buildWorkflow('style_transfer', {
        style_description: styleDescription,
        source_image: sourceImage,
      });

      const { promptId, outputs } = await comfyui.executeWorkflow(workflow);

      // Prepare output
      const timestamp = new Date().toISOString();
      const styledShotId = `${input.shotId}_styled`;

      const output: WizardOutput = {
        type: 'style',
        data: {
          original_shot_id: input.shotId,
          styled_shot_id: styledShotId,
          style_reference: typeof input.styleReference === 'string' 
            ? input.styleReference 
            : input.styleReference.name,
          created_at: timestamp,
        },
        files: outputs.map((img) => ({
          path: `shots/${styledShotId}.png`,
          filename: `${styledShotId}.png`,
          type: 'image',
          url: `${comfyui.getEndpoint()}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`,
        })),
        metadata: {
          wizardType: 'style',
          generatedAt: timestamp,
          parameters: {
            comfyuiPromptId: promptId,
            originalShotId: input.shotId,
          },
        },
      };

      this.logger.info('wizard', 'Style Transfer completed successfully', {
        originalShotId: input.shotId,
        styledShotId,
      });

      return output;
    } catch (error) {
      this.logger.error('wizard', 'Style Transfer failed', error as Error);
      throw error;
    }
  }

  // ============================================================================
  // Output Processing and File Saving
  // ============================================================================

  /**
   * Validate Data Contract v1 compliance
   * 
   * Requirements: 1.7, 14.1, 14.3, 14.7
   */
  validateDataContract(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check schema_version
    if (!data.schema_version || data.schema_version !== '1.0') {
      errors.push('Missing or invalid schema_version (must be "1.0")');
    }

    // Check project_name
    if (!data.project_name || typeof data.project_name !== 'string') {
      errors.push('Missing or invalid project_name');
    }

    // Check capabilities object
    if (!data.capabilities || typeof data.capabilities !== 'object') {
      errors.push('Missing or invalid capabilities object');
    } else {
      const requiredCapabilities = [
        'grid_generation',
        'promotion_engine',
        'qa_engine',
        'autofix_engine',
      ];

      for (const cap of requiredCapabilities) {
        if (typeof data.capabilities[cap] !== 'boolean') {
          errors.push(`Missing or invalid capability: ${cap}`);
        }
      }
    }

    // Check generation_status object
    if (!data.generation_status || typeof data.generation_status !== 'object') {
      errors.push('Missing or invalid generation_status object');
    } else {
      const requiredStatuses = ['grid', 'promotion'];
      const validStatusValues = ['pending', 'done', 'failed', 'passed'];

      for (const status of requiredStatuses) {
        if (!validStatusValues.includes(data.generation_status[status])) {
          errors.push(`Invalid generation_status.${status} (must be one of: ${validStatusValues.join(', ')})`);
        }
      }
    }

    const valid = errors.length === 0;

    if (!valid) {
      this.logger.warn('validation', 'Data Contract v1 validation failed', { errors });
    }

    return { valid, errors };
  }

  /**
   * Save wizard output to project directory
   * 
   * Requirements: 1.6, 1.7, 3.4, 3.5, 4.6, 5.4, 5.7, 6.5, 7.3, 8.3
   */
  async saveWizardOutput(
    output: WizardOutput,
    projectPath: string
  ): Promise<void> {
    this.logger.info('wizard', 'Saving wizard output', {
      wizardType: output.type,
      projectPath,
      fileCount: output.files.length,
    });

    try {
      // Validate data before saving
      const validation = this.validateDataContract({
        schema_version: '1.0',
        project_name: projectPath.split('/').pop() || 'project',
        capabilities: {
          grid_generation: false,
          promotion_engine: false,
          qa_engine: false,
          autofix_engine: false,
          wizard_generation: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
          wizard: 'done',
        },
        ...output.data,
      });

      if (!validation.valid) {
        throw new WizardError(
          'Generated data does not comply with Data Contract v1',
          'datacontract',
          false,
          false,
          {
            errors: validation.errors,
            wizardType: output.type,
          }
        );
      }

      // Save main data file
      const mainDataFile = output.files.find((f) => f.type === 'json');
      if (mainDataFile) {
        const filePath = joinPath(projectPath, mainDataFile.path);
        const dataStr = JSON.stringify(output.data, null, 2);

        this.logger.debug('wizard', 'Saving main data file', {
          path: filePath,
          size: dataStr.length,
        });

        // In browser environment, we'll use localStorage or trigger download
        // In a real implementation with file system access, this would write to disk
        try {
          localStorage.setItem(`wizard_output_${output.type}_${Date.now()}`, dataStr);
          this.logger.info('wizard', 'Data saved to localStorage', { path: filePath });
        } catch (storageError) {
          this.logger.warn('wizard', 'Failed to save to localStorage, triggering download', {
            error: storageError,
          });

          // Fallback: trigger download
          const blob = new Blob([dataStr], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = mainDataFile.filename;
          link.click();
          URL.revokeObjectURL(url);
        }
      }

      // Log image files (actual download would happen separately)
      const imageFiles = output.files.filter((f) => f.type === 'image');
      if (imageFiles.length > 0) {
        this.logger.info('wizard', 'Image files generated', {
          count: imageFiles.length,
          files: imageFiles.map((f) => f.filename),
        });
      }

      this.logger.info('wizard', 'Wizard output saved successfully', {
        wizardType: output.type,
        fileCount: output.files.length,
      });
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('wizard', 'Failed to save wizard output', error as Error);

      throw new WizardError(
        `Failed to save wizard output: ${errorMessage}`,
        'filesystem',
        true,
        true,
        {
          originalError: error,
          wizardType: output.type,
          projectPath,
        }
      );
    }
  }

  /**
   * Load project data from project.json
   * 
   * Requirements: 14.1, 14.3, 14.7
   */
  async loadProjectData(projectPath: string): Promise<any> {
    this.logger.info('wizard', 'Loading project data', { projectPath });

    try {
      // In browser environment, try to load from localStorage
      const storageKey = `project_${projectPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const stored = localStorage.getItem(storageKey);

      if (stored) {
        const data = JSON.parse(stored);
        this.logger.info('wizard', 'Project data loaded from localStorage', {
          projectPath,
        });
        return data;
      }

      // If not in storage, return default structure
      this.logger.warn('wizard', 'Project data not found, returning default structure', {
        projectPath,
      });

      return {
        schema_version: '1.0',
        project_name: projectPath.split('/').pop() || 'project',
        capabilities: {
          grid_generation: false,
          promotion_engine: false,
          qa_engine: false,
          autofix_engine: false,
          wizard_generation: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
          wizard: 'pending',
        },
        storyboard: [],
        assets: [],
        characters: [],
        scenes: [],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('wizard', 'Failed to load project data', error as Error);

      throw new WizardError(
        `Failed to load project data: ${errorMessage}`,
        'filesystem',
        true,
        true,
        {
          originalError: error,
          projectPath,
        }
      );
    }
  }

  /**
   * Update project.json with wizard output references
   * 
   * Requirements: 1.6, 12.7
   */
  async updateProjectData(
    projectPath: string,
    output: WizardOutput
  ): Promise<void> {
    this.logger.info('wizard', 'Updating project data', {
      projectPath,
      wizardType: output.type,
    });

    try {
      // Load existing project data
      const projectData = await this.loadProjectData(projectPath);

      // Update based on wizard type
      switch (output.type) {
        case 'character':
          if (!projectData.characters) {
            projectData.characters = [];
          }
          projectData.characters.push({
            id: output.data.id,
            name: output.data.name,
            reference_path: output.files.find((f) => f.type === 'image')?.path,
          });
          break;

        case 'scene':
          if (!projectData.scenes) {
            projectData.scenes = [];
          }
          projectData.scenes.push({
            id: output.data.id,
            name: output.data.name,
            shot_ids: output.data.shots?.map((s: any) => s.id) || [],
          });
          break;

        case 'storyboard':
          if (!projectData.storyboard) {
            projectData.storyboard = [];
          }
          
          if (output.data.mode === 'replace') {
            projectData.storyboard = output.data.shots || [];
          } else {
            projectData.storyboard.push(...(output.data.shots || []));
          }
          break;

        case 'dialogue':
          // Dialogue is typically associated with scenes/shots
          // Store reference in project metadata
          if (!projectData.dialogue) {
            projectData.dialogue = [];
          }
          projectData.dialogue.push({
            id: output.data.id,
            scene_context: output.data.scene_context,
          });
          break;

        case 'world':
          projectData.world = {
            id: output.data.id,
            name: output.data.name,
            definition_path: output.files.find((f) => f.type === 'json')?.path,
          };
          break;

        case 'style':
          // Update shot metadata with styled version
          if (projectData.storyboard) {
            const shotIndex = projectData.storyboard.findIndex(
              (s: any) => s.id === output.data.original_shot_id
            );
            if (shotIndex !== -1) {
              projectData.storyboard[shotIndex].styled_version = output.data.styled_shot_id;
              projectData.storyboard[shotIndex].styled_path = output.files[0]?.path;
            }
          }
          break;
      }

      // Update generation status
      projectData.generation_status.wizard = 'done';

      // Update capabilities
      projectData.capabilities.wizard_generation = true;

      // Validate updated data
      const validation = this.validateDataContract(projectData);
      if (!validation.valid) {
        throw new WizardError(
          'Updated project data does not comply with Data Contract v1',
          'datacontract',
          false,
          false,
          {
            errors: validation.errors,
          }
        );
      }

      // Save updated project data
      const storageKey = `project_${projectPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(storageKey, JSON.stringify(projectData, null, 2));

      this.logger.info('wizard', 'Project data updated successfully', {
        projectPath,
        wizardType: output.type,
      });
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('wizard', 'Failed to update project data', error as Error);

      throw new WizardError(
        `Failed to update project data: ${errorMessage}`,
        'filesystem',
        true,
        true,
        {
          originalError: error,
          projectPath,
          wizardType: output.type,
        }
      );
    }
  }
}

/**
 * Singleton instance
 */
let wizardServiceInstance: WizardService | null = null;

/**
 * Get the singleton wizard service instance
 */
export function getWizardService(): WizardService {
  if (!wizardServiceInstance) {
    wizardServiceInstance = new WizardService();
  }
  return wizardServiceInstance;
}

/**
 * Create a new wizard service instance with custom configuration
 */
export function createWizardService(
  ollamaEndpoint?: string,
  comfyuiEndpoint?: string,
  retryConfig?: Partial<RetryConfig>,
  instanceManager?: ComfyUIInstanceManager
): WizardService {
  return new WizardService(ollamaEndpoint, comfyuiEndpoint, retryConfig, instanceManager);
}

/**
 * Set the singleton wizard service instance
 */
export function setWizardService(service: WizardService): void {
  wizardServiceInstance = service;
}
