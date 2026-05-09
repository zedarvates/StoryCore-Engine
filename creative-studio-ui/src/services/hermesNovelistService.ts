import { Character } from '@/types/character';
import { Location } from '@/types/world';
import { backendApiService } from './backendApiService';

export interface HermesShot {
  angle: string;
  prompt: string;
  duration: number;
  status?: string;
  progress?: number;
  video_url?: string;
  job_id?: string;
}

export interface HermesQuestion {
  id: string;
  text: string;
  status: 'pending' | 'answered';
  answer?: string;
}

export interface HermesProject {
  id: string;
  title: string;
  seed: string;
  methodology: string;
  world: { content: string };
  characters: { content: string }[];
  outline: { content: string }[];
  chapters: { 
    index: number; 
    content: string; 
    created_at: string; 
    revisions?: { timestamp: number; critique: string }[];
    visualization?: HermesShot[];
  }[];
  state: { phase: string; iteration: number };
  questions?: HermesQuestion[];
}

export interface HermesProjectSummary {
  id: string;
  title: string;
  state: { phase: string; iteration: number };
}

class HermesNovelistService {
  async createProject(seed: string, title: string = "Untitled Novel", methodology: string = "3_act_structure"): Promise<string> {
    const response = await backendApiService.post<{ project_id: string }>('/hermes-novelist/projects', { seed, title, methodology });
    if (!response || !response.project_id) {
      throw new Error('Failed to create project');
    }
    return response.project_id;
  }

  async listProjects(): Promise<HermesProjectSummary[]> {
    const response = await backendApiService.get<HermesProjectSummary[]>('/hermes-novelist/projects');
    if (!response || !Array.isArray(response)) {
      throw new Error('Failed to list projects');
    }
    return response;
  }

  async getProject(projectId: string): Promise<HermesProject> {
    const response = await backendApiService.get<HermesProject>(`/hermes-novelist/projects/${projectId}`);
    if (!response || !response.id) {
      throw new Error('Failed to get project');
    }
    return response;
  }

  async runFoundation(projectId: string): Promise<void> {
    await backendApiService.post<void>(`/hermes-novelist/projects/${projectId}/foundation`, {});
  }

  async draftChapter(projectId: string, chapterIndex: number): Promise<void> {
    await backendApiService.post<void>(`/hermes-novelist/projects/${projectId}/chapters`, { chapter_index: chapterIndex });
  }

  async reviseChapter(projectId: string, chapterIndex: number): Promise<void> {
    await backendApiService.post<void>(`/hermes-novelist/projects/${projectId}/chapters/${chapterIndex}/revise`, {});
  }

  async visualizeChapter(projectId: string, chapterIndex: number): Promise<HermesShot[]> {
    const response = await backendApiService.post<{ shot_list: HermesShot[], error?: string }>(`/hermes-novelist/projects/${projectId}/chapters/${chapterIndex}/visualize`, {});
    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to visualize chapter');
    }
    return response.shot_list;
  }

  async generateClips(projectId: string, chapterIndex: number): Promise<string[]> {
    const response = await backendApiService.post<{ job_ids: string[], error?: string }>(`/hermes-novelist/projects/${projectId}/chapters/${chapterIndex}/generate-clips`, {});
    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to generate clips');
    }
    return response.job_ids;
  }

  async getClipsStatus(projectId: string, chapterIndex: number): Promise<HermesShot[]> {
    const response = await backendApiService.get<{ visualization: HermesShot[], error?: string }>(`/hermes-novelist/projects/${projectId}/chapters/${chapterIndex}/clips-status`);
    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to get clips status');
    }
    return response.visualization;
  }

  async answerQuestion(projectId: string, questionId: string, answer: string): Promise<HermesQuestion[]> {
    const response = await backendApiService.post<{ questions: HermesQuestion[], error?: string }>(`/hermes-novelist/projects/${projectId}/questions/${questionId}/answer?answer=${encodeURIComponent(answer)}`, {});
    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to answer question');
    }
    return response.questions;
  }

  async exportNovel(projectId: string): Promise<{ file_path: string; filename: string }> {
    const response = await backendApiService.post<{ file_path: string; filename: string }>(`/hermes-novelist/projects/${projectId}/export`, {});
    if (!response || !response.file_path) {
      throw new Error('Failed to export novel');
    }
    return response;
  }

  async extractAssets(projectId: string): Promise<{ characters: Character[], locations: Location[] }> {
    const response = await backendApiService.post<{ assets: { characters: Character[], locations: Location[] }, error?: string }>(`/hermes-novelist/projects/${projectId}/extract-assets`, {});
    if (!response || response.error) {
      throw new Error(response?.error || 'Failed to extract assets');
    }
    return response.assets;
  }
}

export const hermesNovelistService = new HermesNovelistService();
