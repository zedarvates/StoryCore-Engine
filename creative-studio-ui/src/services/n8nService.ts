/**
 * n8n Management Service
 */

export interface n8nStatus {
  status: 'online' | 'offline';
  message: string;
}

export interface n8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface n8nTemplate {
  name: string;
  filename: string;
  description?: string;
  tags?: string[];
}

class N8nService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta as unknown as { env: Record<string, string> }).env.VITE_API_URL || 'http://localhost:8080';
  }

  async getStatus(): Promise<n8nStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/status`);
      if (!response.ok) throw new Error('Failed to fetch n8n status');
      return await response.json() as n8nStatus;
    } catch (_error) {
      // Background check - log as info only
      console.debug('n8n getStatus: Service not reachable (expected if backend is down)');
      return { status: 'offline', message: 'n8n not reachable' };
    }
  }

  async listWorkflows(): Promise<n8nWorkflow[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/workflows`);
      if (!response.ok) throw new Error('Failed to fetch n8n workflows');
      const data = await response.json() as { workflows: n8nWorkflow[] };
      return data.workflows || [];
    } catch (_error) {
      // Background check - log as info only
      console.debug('n8n listWorkflows: Service not reachable (expected if backend is down)');
      return [];
    }
  }

  async triggerWorkflow(webhookId: string, payload: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/trigger/${webhookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error('Failed to trigger n8n workflow');
      return await response.json();
    } catch (error) {
      console.error('n8n triggerWorkflow error:', error);
      throw error;
    }
  }

  async createWorkflow(name: string, nodes: unknown[], connections: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/workflows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, nodes, connections }),
      });
      if (!response.ok) throw new Error('Failed to create n8n workflow');
      return await response.json();
    } catch (error) {
      console.error('n8n createWorkflow error:', error);
      throw error;
    }
  }

  async listTemplates(): Promise<n8nTemplate[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/templates`);
      if (!response.ok) throw new Error('Failed to fetch n8n templates');
      return await response.json() as n8nTemplate[];
    } catch (_error) {
      // Background check - log as info only
      console.debug('n8n listTemplates: Service not reachable (expected if backend is down)');
      return [];
    }
  }

  async importTemplate(filename: string): Promise<unknown> {
    try {
      const response = await fetch(`${this.baseUrl}/api/n8n/templates/import/${filename}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to import n8n template');
      return await response.json();
    } catch (error) {
      console.error('n8n importTemplate error:', error);
      throw error;
    }
  }

  getN8nUrl(): string {
    return (import.meta as unknown as { env: Record<string, string> }).env.VITE_N8N_URL || 'http://192.168.1.47:5678/home/workflows';
  }
}

export const n8nService = new N8nService();
export default n8nService;
