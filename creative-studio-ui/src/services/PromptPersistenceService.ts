/**
 * PromptPersistenceService
 * 
 * Handles saving/loading custom project prompts to the project's /prompts folder.
 */

import { logger } from '@/utils/logger';

export interface ProjectPrompt {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  content: string;
  tags: string[];
  createdAt: number;
}

export class PromptPersistenceService {
  private static instance: PromptPersistenceService;

  private constructor() {}

  static getInstance(): PromptPersistenceService {
    if (!PromptPersistenceService.instance) {
      PromptPersistenceService.instance = new PromptPersistenceService();
    }
    return PromptPersistenceService.instance;
  }

  /**
   * Save a single prompt to the project prompts folder
   */
  async saveProjectPrompt(prompt: ProjectPrompt, projectPath: string): Promise<boolean> {
    if (!window.electronAPI?.fs) {
      localStorage.setItem(`prompt-${prompt.id}`, JSON.stringify(prompt));
      return true;
    }

    try {
      const promptsDir = `${projectPath}/prompts`;
      const fileName = `prompt_${prompt.id.substring(0, 8)}.json`;
      const filePath = `${promptsDir}/${fileName}`;

      if (window.electronAPI.fs.mkdir) {
        await window.electronAPI.fs.mkdir(promptsDir, { recursive: true });
      }

      await window.electronAPI.fs.writeFile(filePath, JSON.stringify(prompt, null, 2));
      logger.info(`[PromptPersistenceService] Saved prompt ${prompt.id} to ${filePath}`);
      return true;
    } catch (error) {
      logger.error('[PromptPersistenceService] Failed to save prompt:', error);
      return false;
    }
  }

  /**
   * List all prompts in project
   */
  async listProjectPrompts(projectPath: string): Promise<ProjectPrompt[]> {
    if (!window.electronAPI?.fs) return [];

    try {
      const promptsDir = `${projectPath}/prompts`;
      const exists = await window.electronAPI.fs.exists(promptsDir);
      if (!exists) return [];

      const files = await window.electronAPI.fs.readdir(promptsDir);
      const prompts: ProjectPrompt[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await window.electronAPI.fs.readFile(`${promptsDir}/${file}`);
          const jsonString = new TextDecoder().decode(content);
          prompts.push(JSON.parse(jsonString) as ProjectPrompt);
        }
      }

      return prompts;
    } catch (error) {
      logger.error('[PromptPersistenceService] Failed to list prompts:', error);
      return [];
    }
  }
}

export const promptPersistenceService = PromptPersistenceService.getInstance();
