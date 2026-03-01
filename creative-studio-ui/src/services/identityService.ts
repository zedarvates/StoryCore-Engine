import axios, { AxiosInstance } from 'axios';

export interface VisualAttributes {
  face_shape: string;
  skin_tone: string;
  eye_color: string;
  hair_color: string;
  hair_style: string;
  hair_length: string;
  body_type: string;
  height: string;
  age_appearance: string;
  clothing_style: string;
  accessories: string[];
  distinctive_features: string[];
  scars_marks: string[];
  extraction_confidence: number;
  source_image_path: string;
}

export interface IdentityProfile {
  id: string;
  name: string;
  description: string;
  visual_attributes: VisualAttributes;
  base_prompt: string;
  variation_prompts: Record<string, string>;
  created_at: string;
  updated_at: string;
  project_id: string;
  is_locked: boolean;
}

export interface CreateIdentityRequest {
  name: string;
  description?: string;
  project_id: string;
  source_image_path?: string;
}

export interface ExtractionResponse {
  success: boolean;
  attributes: VisualAttributes;
  confidence: number;
  provider: string;
  model: string;
  extraction_time_ms: number;
  error_message?: string;
}

class IdentityService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/identity',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add interceptor for auth token if it exists in localStorage
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  async createIdentity(request: CreateIdentityRequest): Promise<IdentityProfile> {
    const response = await this.client.post('', request);
    return response.data;
  }

  async listIdentities(projectId?: string): Promise<{ identities: IdentityProfile[]; total: number }> {
    const response = await this.client.get('', {
      params: { project_id: projectId }
    });
    return response.data;
  }

  async getIdentity(identityId: string): Promise<IdentityProfile> {
    const response = await this.client.get(`/${identityId}`);
    return response.data;
  }

  async updateIdentity(identityId: string, updates: Partial<IdentityProfile>): Promise<IdentityProfile> {
    const response = await this.client.put(`/${identityId}`, updates);
    return response.data;
  }

  async deleteIdentity(identityId: string): Promise<void> {
    await this.client.delete(`/${identityId}`);
  }

  async extractAndLock(identityId: string, imagePath: string, useLlm: boolean = true): Promise<IdentityProfile> {
    const response = await this.client.post(`/${identityId}/extract`, {
      image_path: imagePath,
      use_llm: useLlm
    });
    return response.data;
  }

  async applyToPrompt(identityId: string, sceneDescription: string, sceneType: string = 'default'): Promise<{ prompt: string; identity_id: string; identity_name: string }> {
    const response = await this.client.post(`/${identityId}/apply`, {
      scene_description: sceneDescription,
      scene_type: sceneType
    });
    return response.data;
  }

  async extractOnly(imagePath: string): Promise<ExtractionResponse> {
    const response = await this.client.post('/extract', {
        image_path: imagePath,
        use_llm: true
    });
    return response.data;
  }

  async createAndExtract(request: { name: string; description: string; project_id: string; image_path: string }): Promise<IdentityProfile> {
    const response = await this.client.post('/create-and-extract', request);
    return response.data;
  }

  async unlockIdentity(identityId: string): Promise<IdentityProfile> {
    const response = await this.client.post(`/${identityId}/unlock`);
    return response.data;
  }
}

export const identityService = new IdentityService();
