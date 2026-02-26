// ============================================================================
// Comic Generator API Service
// Communicates with the Python backend addon REST API
// ============================================================================

import type {
  ComicStyleType,
  ComicState,
  ComicPage,
  ComicHistoryResponse,
  GeneratePageRequest,
  GeneratePageResponse,
  ExportResponse,
} from './types';

const API_BASE = '/api/addons/comic_generator';

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Network error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Comic Generator Service
// ============================================================================

export const comicGeneratorService = {
  /**
   * Check addon health/status.
   */
  async getStatus(): Promise<{
    addon: string;
    version: string;
    status: string;
    supported_styles: ComicStyleType[];
  }> {
    return apiCall('/status');
  },

  /**
   * Get the current comic state for a project.
   */
  async getState(projectId: string): Promise<ComicState | null> {
    const result = await apiCall<{ exists: boolean } & Partial<ComicState>>(
      `/state/${encodeURIComponent(projectId)}`
    );
    if (!result.exists) return null;
    return result as ComicState;
  },

  /**
   * Generate the next comic page.
   */
  async generatePage(req: GeneratePageRequest): Promise<GeneratePageResponse> {
    return apiCall<GeneratePageResponse>('/generate', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  /**
   * Regenerate a single panel with a new seed.
   */
  async regeneratePanel(params: {
    project_id: string;
    page_id: string;
    chapter_id: string;
    page_number: number;
    panel_index: number;
    generate_image?: boolean;
  }): Promise<{ success: boolean; new_image_path: string | null }> {
    return apiCall('/regenerate_panel', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Get full generation history for a project.
   */
  async getHistory(projectId: string): Promise<ComicHistoryResponse> {
    return apiCall<ComicHistoryResponse>(`/history/${encodeURIComponent(projectId)}`);
  },

  /**
   * Export comic to JSON or PDF.
   */
  async exportComic(params: {
    project_id: string;
    format: 'json' | 'pdf';
    output_path?: string;
  }): Promise<ExportResponse> {
    return apiCall<ExportResponse>('/export', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Get the image URL for a panel's generated image.
   */
  getPanelImageUrl(imagePath: string): string {
    return `${API_BASE}/panel_image?image_path=${encodeURIComponent(imagePath)}`;
  },
};

export default comicGeneratorService;
