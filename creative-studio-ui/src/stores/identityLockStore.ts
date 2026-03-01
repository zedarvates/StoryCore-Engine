import { create } from 'zustand';
import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

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

interface IdentityLockState {
  identities: IdentityProfile[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchIdentities: (projectId?: string) => Promise<void>;
  createIdentity: (name: string, description: string, projectId: string, sourceImagePath?: string) => Promise<IdentityProfile>;
  updateIdentity: (id: string, updates: Partial<IdentityProfile>) => Promise<void>;
  deleteIdentity: (id: string) => Promise<void>;
  extractAndLock: (id: string, imagePath: string, useLlm?: boolean) => Promise<void>;
  applyIdentity: (id: string, sceneDescription: string, sceneType?: string) => Promise<string>;
  unlockIdentity: (id: string) => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8001') + '/api/identity';

export const useIdentityLockStore = create<IdentityLockState>((set, get) => ({
  identities: [],
  loading: false,
  error: null,

  fetchIdentities: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}${projectId ? `?project_id=${projectId}` : ''}`);
      set({ identities: response.data.identities, loading: false });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
    }
  },

  createIdentity: async (name, description, projectId, sourceImagePath) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post(API_BASE_URL, {
        name,
        description,
        project_id: projectId,
        source_image_path: sourceImagePath
      });
      const newIdentity = response.data;
      set(state => ({ 
        identities: [...state.identities, newIdentity],
        loading: false 
      }));
      return newIdentity;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
      throw err;
    }
  },

  updateIdentity: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      await axios.put(`${API_BASE_URL}/${id}`, updates);
      await get().fetchIdentities(); // Refresh
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
    }
  },

  deleteIdentity: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      set(state => ({
        identities: state.identities.filter(i => i.id !== id),
        loading: false
      }));
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
    }
  },

  extractAndLock: async (id, imagePath, useLlm = true) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/${id}/extract`, {
        image_path: imagePath,
        use_llm: useLlm
      });
      await get().fetchIdentities();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
    }
  },

  applyIdentity: async (id, sceneDescription, sceneType = 'default') => {
    try {
      const response = await axios.post(`${API_BASE_URL}/${id}/apply`, {
        scene_description: sceneDescription,
        scene_type: sceneType
      });
      return response.data.prompt;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message });
      } else {
        set({ error: String(err) });
      }
      throw err;
    }
  },

  unlockIdentity: async (id) => {
    set({ loading: true, error: null });
    try {
      await axios.post(`${API_BASE_URL}/${id}/unlock`);
      await get().fetchIdentities();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        set({ error: err.message, loading: false });
      } else {
        set({ error: String(err), loading: false });
      }
    }
  }
}));
