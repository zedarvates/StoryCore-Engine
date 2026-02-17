/**
 * Wizard Service
 *
 * Handles launching wizards from the UI by executing CLI commands
 */

import { WizardDefinition } from '../../types/configuration';
import { getComfyUIServersService } from '../comfyuiServersService';
import { testComfyUIConnection } from '../comfyuiService';
import { OLLAMA_URL, COMFYUI_URL } from '../../config/apiConfig';
import { logger } from '@/utils/logger';
import {
  CharacterWizardInput,
  SceneGeneratorInput,
  StoryboardInput,
  DialogueInput,
  WorldBuildingInput,
  StyleTransferInput,
  WizardOutput
} from './types';

export interface WizardLaunchResult {
  success: boolean;
  message: string;
  output?: string;
  error?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  service: 'ollama' | 'comfyui';
  endpoint: string;
  error?: string;
}

export class WizardService {
  /**
   * Launch a wizard by executing its CLI command
   */
  async launchWizard(
    wizardId: string,
    projectPath?: string,
    options: Record<string, unknown> = {}
  ): Promise<WizardLaunchResult> {
    try {
      // Map wizard IDs to CLI commands
      const command = this.getWizardCommand(wizardId, options);

      if (!command) {
        return {
          success: false,
          message: `Unknown wizard: ${wizardId}`,
          error: 'Wizard not implemented'
        };
      }

      // Execute the command
      const result = await this.executeCommand(command, projectPath);

      return {
        success: result.success,
        message: result.success ? 'Wizard launched successfully' : 'Failed to launch wizard',
        output: result.output,
        error: result.error
      };

    } catch (error) {
      logger.error(`Failed to launch wizard ${wizardId}:`, error);
      return {
        success: false,
        message: 'Failed to launch wizard',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get the CLI command for a wizard
   */
  private getWizardCommand(wizardId: string, options: Record<string, unknown>): string | null {
    const commands: Record<string, string> = {
      'project-init': 'storycore init',
      'world-building': 'storycore world-wizard',
      'character-creation': 'storycore character-wizard',
      'shot-planning': 'storycore shot-planning',
      'shot-reference-wizard': this.buildShotReferenceCommand(options),
      'dialogue-wizard': this.buildDialogueCommand(options),
      'scene-generator': 'storycore scene-generator',
      'storyboard-creator': 'storycore storyboard-creator',
      'style-transfer-wizard': this.buildStyleTransferCommand(options),
      'style-transfer': 'storycore style-transfer'
    };

    return commands[wizardId] || null;
  }

  /**
   * Build shot reference wizard command with options
   */
  private buildShotReferenceCommand(options: Record<string, unknown>): string {
    let command = 'storycore shot-reference-wizard';

    if (options.style && typeof options.style === 'string') {
      command += ` --style ${options.style}`;
    }

    if (options.quality && typeof options.quality === 'string') {
      command += ` --quality ${options.quality}`;
    }

    if (options.shots && Array.isArray(options.shots)) {
      command += ` --shots ${(options.shots as string[]).join(' ')}`;
    }

    if (options.preview) {
      command += ' --preview';
    }

    return command;
  }

  /**
   * Build dialogue wizard command with options
   */
  private buildDialogueCommand(options: Record<string, unknown>): string {
    let command = 'storycore dialogue-wizard';

    if (options.quick && options.characters && options.topic) {
      const characters = Array.isArray(options.characters) ? options.characters : [options.characters];
      const topic = typeof options.topic === 'string' ? options.topic : String(options.topic);
      command += ` --quick --characters ${characters.join(' ')} --topic "${topic}"`;
    } else if (options.interactive) {
      command += ' --interactive';
    } else {
      // Default to interactive mode
      command += ' --interactive';
    }

    if (options.tone && typeof options.tone === 'string') {
      command += ` --tone ${options.tone}`;
    }

    if (options.purpose && typeof options.purpose === 'string') {
      command += ` --purpose ${options.purpose}`;
    }

    return command;
  }

  /**
   * Build style transfer wizard command with options
   */
  private buildStyleTransferCommand(options: Record<string, unknown>): string {
    let command = 'storycore style-transfer-wizard';

    // Mode selection
    if (options.mode) {
      command += ` --mode ${options.mode}`;
    }

    // Source image
    if (options.sourceImage) {
      command += ` --source "${options.sourceImage}"`;
    }

    // Style reference (for workflow mode)
    if (options.styleImage) {
      command += ` --style "${options.styleImage}"`;
    }

    // Prompt (for prompt mode)
    if (options.prompt) {
      command += ` --prompt "${options.prompt}"`;
    }

    // Configuration options
    if (options.steps) {
      command += ` --steps ${options.steps}`;
    }

    if (options.cfgScale) {
      command += ` --cfg ${options.cfgScale}`;
    }

    if (options.seed !== undefined && options.seed !== -1) {
      command += ` --seed ${options.seed}`;
    }

    if (options.outputPrefix) {
      command += ` --output "${options.outputPrefix}"`;
    }

    // Model configuration
    if (options.modelName) {
      command += ` --model "${options.modelName}"`;
    }

    return command;
  }

  /**
   * Execute a command via Electron API
   */
  private async executeCommand(command: string, projectPath?: string): Promise<WizardLaunchResult> {
    if (!window.electronAPI?.executeCommand) {
      return {
        success: false,
        message: 'Command execution not available',
        error: 'Electron API not available'
      };
    }

    try {
      // Change to project directory if specified
      const fullCommand = projectPath
        ? `cd "${projectPath}" && ${command}`
        : command;


      const result = await window.electronAPI.executeCommand({
        command: fullCommand,
        cwd: projectPath || process.cwd(),
        shell: true
      });

      return {
        success: result.success,
        message: result.success ? 'Command executed successfully' : 'Command failed',
        output: result.output,
        error: result.error
      };

    } catch (error) {
      logger.error('Command execution error:', error);
      return {
        success: false,
        message: 'Command execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check Ollama connection status
   */
  async checkOllamaConnection(): Promise<ConnectionStatus> {
    const ollamaEndpoint = OLLAMA_URL;
    try {
      // Try to connect to Ollama API
      const response = await fetch(`${ollamaEndpoint}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (response.ok) {
        return {
          connected: true,
          service: 'ollama',
          endpoint: ollamaEndpoint
        };
      } else {
        return {
          connected: false,
          service: 'ollama',
          endpoint: ollamaEndpoint,
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        connected: false,
        service: 'ollama',
        endpoint: ollamaEndpoint,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Check ComfyUI connection status using ComfyUI Servers Service
   */
  async checkComfyUIConnection(): Promise<ConnectionStatus> {
    try {
      // Get the ComfyUI Servers Service
      const comfyuiServersService = getComfyUIServersService();

      // Try to get an available server
      const availableServer = await comfyuiServersService.getAvailableServer();

      if (availableServer) {
        // Use the available server's URL
        logger.debug('[WizardService] Using active ComfyUI server:', availableServer.serverUrl);

        // Test the connection using the ComfyUI service
        const testResult = await testComfyUIConnection({
          serverUrl: availableServer.serverUrl,
          authentication: availableServer.authentication,
          timeout: availableServer.timeout,
        });

        if (testResult.success) {
          logger.debug('[WizardService] ComfyUI connection successful using configured server:', availableServer.serverUrl);
          return {
            connected: true,
            service: 'comfyui',
            endpoint: availableServer.serverUrl
          };
        } else {
          logger.debug('[WizardService] ComfyUI connection failed:', testResult.message);
          return {
            connected: false,
            service: 'comfyui',
            endpoint: availableServer.serverUrl,
            error: testResult.message
          };
        }
      } else {
        // No servers configured - return disconnected without attempting connection
        logger.debug('[WizardService] No ComfyUI server configured');
        return {
          connected: false,
          service: 'comfyui',
          endpoint: '',
          error: 'No ComfyUI server configured. Please configure a server in settings.'
        };
      }
    } catch (error) {
      logger.error('[WizardService] Error checking ComfyUI connection:', error instanceof Error ? error.message : 'Unknown error');

      return {
        connected: false,
        service: 'comfyui',
        endpoint: COMFYUI_URL,
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get available wizard options for a specific wizard
   */
  getWizardOptions(wizardId: string): Record<string, unknown> {
    const options: Record<string, Record<string, unknown>> = {
      'shot-reference-wizard': {
        styles: ['cinematic', 'storyboard', 'realistic', 'concept_art', 'technical'],
        qualities: ['draft', 'standard', 'high', 'maximum'],
        defaultStyle: 'cinematic',
        defaultQuality: 'standard'
      },
      'dialogue-wizard': {
        tones: ['natural', 'dramatic', 'comedic', 'intense', 'subtle'],
        purposes: ['exposition', 'conflict', 'character_development', 'comedy_relief', 'climax_building'],
        defaultTone: 'natural',
        defaultPurpose: 'character_development'
      },
      'style-transfer-wizard': {
        modes: ['workflow', 'prompt', 'video'],
        defaultMode: 'workflow',
        models: [
          'flux-2-klein-9b-fp8.safetensors',
          'flux-2-klein-base-9b-fp8.safetensors'
        ],
        defaultModel: 'flux-2-klein-9b-fp8.safetensors',
        stylePresets: [
          'photorealistic',
          'cinematic',
          'anime',
          'oil_painting',
          'cyberpunk',
          'watercolor',
          'sketch',
          'vintage',
          'noir',
          'fantasy'
        ],
        defaultSteps: 10,
        defaultCfgScale: 1.0,
        defaultWidth: 1024,
        defaultHeight: 1024
      }
    };

    return options[wizardId] || {};
  }

  /**
   * Validate wizard launch parameters
   */
  validateWizardLaunch(wizard: WizardDefinition, projectPath?: string, projectData?: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if project path is required and provided
    if (wizard.requiresCharacters || wizard.requiresShots) {
      if (!projectPath) {
        errors.push('Project path is required for this wizard');
      }
    }

    // Check project data requirements
    if (projectData && typeof projectData === 'object') {
      const data = projectData as Record<string, unknown>;
      if (wizard.requiresCharacters && (!data.characters || !Array.isArray(data.characters) || data.characters.length === 0)) {
        errors.push('This wizard requires at least one character. Please create characters first.');
      }

      if (wizard.requiresShots && (!data.shots || !Array.isArray(data.shots) || data.shots.length === 0)) {
        errors.push('This wizard requires shot planning data. Please create shots first.');
      }
    }

    // Wizard-specific validation
    if (wizard.id === 'shot-reference-wizard' && projectPath) {
      // Check if shot planning exists
      // This would be checked by the CLI command itself
    }

    if (wizard.id === 'style-transfer-wizard') {
      // Check if ComfyUI is available
      // This is handled by the backend
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a wizard can be launched with current dependencies
   */
  canLaunchWizard(wizard: WizardDefinition, availableConfig: string[], projectData?: unknown): boolean {
    // Check configuration requirements
    const configMet = wizard.requiredConfig?.every(req => availableConfig.includes(req)) || !wizard.requiredConfig;

    // Check project data requirements
    let charactersMet = true;
    let shotsMet = true;

    if (projectData && typeof projectData === 'object') {
      const data = projectData as Record<string, unknown>;
      const hasCharacters = Array.isArray(data.characters) && data.characters.length > 0;
      const hasShots = Array.isArray(data.shots) && data.shots.length > 0;
      charactersMet = !wizard.requiresCharacters || hasCharacters;
      shotsMet = !wizard.requiresShots || hasShots;
    } else {
      charactersMet = !wizard.requiresCharacters;
      shotsMet = !wizard.requiresShots;
    }

    return configMet && charactersMet && shotsMet;
  }

  /**
   * Save wizard output to the project directory
   * @param output - The wizard output data to save
   * @param projectPath - The project directory path
   * @param outputFileName - Optional custom filename for the output
   */
  async saveWizardOutput(output: unknown, projectPath: string, outputFileName?: string): Promise<void> {
    if (!window.electronAPI?.fs) {
      throw new Error('File system API not available for saving wizard output');
    }

    try {
      const fs = window.electronAPI.fs;
      const outputDir = `${projectPath}/wizard_outputs`;

      // Ensure output directory exists
      const dirExists = await fs.exists(outputDir).catch(() => false);
      if (!dirExists) {
        await fs.mkdir(outputDir).catch(() => { });
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = outputFileName || `wizard_output_${timestamp}.json`;
      const filePath = `${outputDir}/${fileName}`;

      // Write output to file
      const outputData = JSON.stringify(output, null, 2);
      await fs.writeFile(filePath, outputData);

      logger.debug(`[WizardService] Saved wizard output to: ${filePath}`);
    } catch (error) {
      logger.error('[WizardService] Failed to save wizard output:', error);
      throw error;
    }
  }

  /**
   * Update project data with wizard results
   * @param projectPath - The project directory path
   * @param output - The wizard output containing updates
   */
  async updateProjectData(projectPath: string, output: unknown): Promise<void> {
    if (!window.electronAPI?.fs) {
      throw new Error('File system API not available for updating project data');
    }

    try {
      const fs = window.electronAPI.fs;
      const projectFilePath = `${projectPath}/project.json`;

      // Check if project file exists
      const exists = await fs.exists(projectFilePath);
      if (!exists) {
        logger.warn('[WizardService] No project.json found to update');
        return;
      }

      // Read existing project data
      const buffer = await fs.readFile(projectFilePath);
      const projectData = JSON.parse(buffer.toString('utf-8'));

      // Merge wizard output based on type
      const wizardOutput = output as Record<string, unknown>;

      if (wizardOutput.characters && Array.isArray(wizardOutput.characters)) {
        projectData.characters = [...(projectData.characters || []), ...wizardOutput.characters];
      }

      if (wizardOutput.shots && Array.isArray(wizardOutput.shots)) {
        projectData.shots = [...(projectData.shots || []), ...wizardOutput.shots];
      }

      if (wizardOutput.sequences && Array.isArray(wizardOutput.sequences)) {
        projectData.sequences = [...(projectData.sequences || []), ...wizardOutput.sequences];
      }

      if (wizardOutput.references && Array.isArray(wizardOutput.references)) {
        projectData.references = [...(projectData.references || []), ...wizardOutput.references];
      }

      // Update metadata
      projectData.lastModified = new Date().toISOString();
      if (wizardOutput.wizardId) {
        projectData.lastWizardRun = wizardOutput.wizardId;
      }

      // Write updated project data
      await fs.writeFile(projectFilePath, JSON.stringify(projectData, null, 2));

      logger.debug(`[WizardService] Updated project data at: ${projectFilePath}`);
    } catch (error) {
      logger.error('[WizardService] Failed to update project data:', error);
      throw error;
    }
  }

  /**
   * Check all service connections
   */
  async checkAllConnections(): Promise<{ ollama: ConnectionStatus; comfyui: ConnectionStatus; allConnected: boolean }> {
    const ollama = await this.checkOllamaConnection();
    const comfyui = await this.checkComfyUIConnection();
    return {
      ollama,
      comfyui,
      allConnected: ollama.connected && comfyui.connected
    };
  }

  // ============================================================================
  // Execution Methods
  // ============================================================================

  async executeCharacterWizard(input: CharacterWizardInput): Promise<WizardOutput> {
    logger.warn('executeCharacterWizard not fully implemented, returning mock');
    return {
      type: 'character',
      data: { id: 'mock-char', name: input.name, created_at: new Date().toISOString() },
      files: [],
      metadata: { wizardType: 'character', generatedAt: new Date().toISOString() }
    };
  }

  async executeSceneGenerator(input: SceneGeneratorInput): Promise<WizardOutput> {
    logger.warn('executeSceneGenerator not fully implemented, returning mock');
    return {
      type: 'scene',
      data: { id: 'mock-scene', name: input.concept, shots: [] },
      files: [],
      metadata: { wizardType: 'scene', generatedAt: new Date().toISOString() }
    };
  }

  async executeStoryboardCreator(input: StoryboardInput): Promise<WizardOutput> {
    logger.warn('executeStoryboardCreator not fully implemented, returning mock');
    return {
      type: 'storyboard',
      data: { mode: input.mode, shots: [] },
      files: [],
      metadata: { wizardType: 'storyboard', generatedAt: new Date().toISOString() }
    };
  }

  async executeDialogueWriter(input: DialogueInput): Promise<WizardOutput> {
    logger.warn('executeDialogueWriter not fully implemented, returning mock');
    return {
      type: 'dialogue',
      data: {},
      files: [],
      metadata: { wizardType: 'dialogue', generatedAt: new Date().toISOString() }
    };
  }

  async executeWorldBuilder(input: WorldBuildingInput): Promise<WizardOutput> {
    logger.warn('executeWorldBuilder not fully implemented, returning mock');
    return {
      type: 'world',
      data: { id: 'mock-world', name: input.name },
      files: [],
      metadata: { wizardType: 'world', generatedAt: new Date().toISOString() }
    };
  }

  async executeStyleTransfer(input: StyleTransferInput): Promise<WizardOutput> {
    logger.warn('executeStyleTransfer not fully implemented, returning mock');
    return {
      type: 'style',
      data: { original_shot_id: input.shotId },
      files: [],
      metadata: { wizardType: 'style', generatedAt: new Date().toISOString() }
    };
  }
}

// Singleton instance
let instance: WizardService | null = null;

// Convenience function to get a WizardService instance
export function getWizardService(): WizardService {
  if (!instance) {
    instance = new WizardService();
  }
  return instance;
}

// Create a new WizardService instance
export function createWizardService(): WizardService {
  return new WizardService();
}

// Set the singleton instance
export function setWizardService(service: WizardService): void {
  instance = service;
}



