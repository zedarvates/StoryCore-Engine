import { TranslationRequest, TranslationTaskStatus } from './types';

const BASE_URL = '/api/addons/project_translator';

class ProjectTranslatorService {
  async getStatus(): Promise<unknown> {
    const res = await fetch(`${BASE_URL}/status`);
    if (!res.ok) throw new Error(`Status error: ${res.status}`);
    return res.json();
  }

  async startTranslation(req: TranslationRequest): Promise<{ success: boolean; task_id: string; message: string }> {
    const res = await fetch(`${BASE_URL}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async getTaskStatus(taskId: string): Promise<TranslationTaskStatus> {
    const res = await fetch(`${BASE_URL}/task/${taskId}`);
    if (!res.ok) throw new Error(`Task error: ${res.status}`);
    return res.json();
  }
}

export const projectTranslatorService = new ProjectTranslatorService();
export default projectTranslatorService;
