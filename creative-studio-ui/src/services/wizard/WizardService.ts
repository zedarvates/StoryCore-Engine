/**
 * Wizard Service
 *
 * Handles launching wizards from the UI by executing CLI commands
 */

import { WizardDefinition } from '../../types/configuration';
import { getComfyUIServersService } from '../comfyuiServersService';
import { testComfyUIConnection } from '../comfyuiService';

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
    options: Record<string, any> = {}
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
      console.error(`Failed to launch wizard ${wizardId}:`, error);
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
  private getWizardCommand(wizardId: string, options: Record<string, any>): string | null {
    const commands: Record<string, string> = {
      'project-init': 'storycore init',
      'world-building': 'storycore world-wizard',
      'character-creation': 'storycore character-wizard',
      'shot-planning': 'storycore shot-planning',
      'shot-reference-wizard': this.buildShotReferenceCommand(options),
      'dialogue-wizard': this.buildDialogueCommand(options),
      'scene-generator': 'storycore scene-generator',
      'storyboard-creator': 'storycore storyboard-creator',
      'style-transfer': 'storycore style-transfer'
    };

    return commands[wizardId] || null;
  }

  /**
   * Build shot reference wizard command with options
   */
  private buildShotReferenceCommand(options: Record<string, any>): string {
    let command = 'storycore shot-reference-wizard';

    if (options.style) {
      command += ` --style ${options.style}`;
    }

    if (options.quality) {
      command += ` --quality ${options.quality}`;
    }

    if (options.shots && Array.isArray(options.shots)) {
      command += ` --shots ${options.shots.join(' ')}`;
    }

    if (options.preview) {
      command += ' --preview';
    }

    return command;
  }

  /**
   * Build dialogue wizard command with options
   */
  private buildDialogueCommand(options: Record<string, any>): string {
    let command = 'storycore dialogue-wizard';

    if (options.quick && options.characters && options.topic) {
      command += ` --quick --characters ${options.characters.join(' ')} --topic "${options.topic}"`;
    } else if (options.interactive) {
      command += ' --interactive';
    } else {
      // Default to interactive mode
      command += ' --interactive';
    }

    if (options.tone) {
      command += ` --tone ${options.tone}`;
    }

    if (options.purpose) {
      command += ` --purpose ${options.purpose}`;
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
      console.error('Command execution error:', error);
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
    try {
      // Try to connect to Ollama API
      const response = await fetch('http://localhost:11434/api/tags', {
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
          endpoint: 'http://localhost:11434'
        };
      } else {
        return {
          connected: false,
          service: 'ollama',
          endpoint: 'http://localhost:11434',
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }
    } catch (error) {
      return {
        connected: false,
        service: 'ollama',
        endpoint: 'http://localhost:11434',
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
        console.log('[WizardService] Using active ComfyUI server:', availableServer.serverUrl);
        
        // Test the connection using the ComfyUI service
        const testResult = await testComfyUIConnection({
          serverUrl: availableServer.serverUrl,
          authentication: availableServer.authentication,
          timeout: availableServer.timeout,
        });
        
        if (testResult.success) {
          console.log('[WizardService] ComfyUI connection successful using configured server:', availableServer.serverUrl);
          return {
            connected: true,
            service: 'comfyui',
            endpoint: availableServer.serverUrl
          };
        } else {
          console.log('[WizardService] ComfyUI connection failed:', testResult.message);
          return {
            connected: false,
            service: 'comfyui',
            endpoint: availableServer.serverUrl,
            error: testResult.message
          };
        }
      } else {
        // No servers configured - return disconnected without attempting connection
        console.log('[WizardService] No ComfyUI server configured');
        return {
          connected: false,
          service: 'comfyui',
          endpoint: '',
          error: 'No ComfyUI server configured. Please configure a server in settings.'
        };
      }
    } catch (error) {
      console.error('[WizardService] Error checking ComfyUI connection:', error instanceof Error ? error.message : 'Unknown error');
      
      return {
        connected: false,
        service: 'comfyui',
        endpoint: 'http://localhost:8188',
        error: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  /**
   * Get available wizard options for a specific wizard
   */
  getWizardOptions(wizardId: string): Record<string, any> {
    const options: Record<string, Record<string, any>> = {
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
      }
    };

    return options[wizardId] || {};
  }

  /**
   * Validate wizard launch parameters
   */
  validateWizardLaunch(wizard: WizardDefinition, projectPath?: string, projectData?: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if project path is required and provided
    if (wizard.requiresCharacters || wizard.requiresShots) {
      if (!projectPath) {
        errors.push('Project path is required for this wizard');
      }
    }

    // Check project data requirements
    if (projectData) {
      if (wizard.requiresCharacters && (!projectData.characters || projectData.characters.length === 0)) {
        errors.push('This wizard requires at least one character. Please create characters first.');
      }

      if (wizard.requiresShots && (!projectData.shots || projectData.shots.length === 0)) {
        errors.push('This wizard requires shot planning data. Please create shots first.');
      }
    }

    // Wizard-specific validation
    if (wizard.id === 'shot-reference-wizard' && projectPath) {
      // Check if shot planning exists
      // This would be checked by the CLI command itself
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if a wizard can be launched with current dependencies
   */
  canLaunchWizard(wizard: WizardDefinition, availableConfig: string[], projectData?: any): boolean {
    // Check configuration requirements
    const configMet = wizard.requiredConfig?.every(req => availableConfig.includes(req)) || !wizard.requiredConfig;

    // Check project data requirements
    const charactersMet = !wizard.requiresCharacters || (projectData?.characters && projectData.characters.length > 0);
    const shotsMet = !wizard.requiresShots || (projectData?.shots && projectData.shots.length > 0);

    return configMet && charactersMet && shotsMet;
  }

  /**
   * Save wizard output to the project directory
   */
  async saveWizardOutput(output: any, projectPath: string): Promise<void> {
    // Implementation would save wizard output to files
    // For now, this is a placeholder
  }

  /**
   * Update project data with wizard results
   */
  async updateProjectData(projectPath: string, output: any): Promise<void> {
    // Implementation would update project.json with new references
    // For now, this is a placeholder
  }
}

// Convenience function to get a WizardService instance
export function getWizardService(): WizardService {
  return new WizardService();
}