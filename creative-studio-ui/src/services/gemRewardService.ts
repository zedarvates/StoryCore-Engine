import axios from 'axios';

const GEM_SERVICE_URL = 'http://localhost:8001/v1/gems';

export interface TaskCategory {
  id: string;
  display_name: string;
  base_cost: number;
  min_vram_gb: number;
}

export interface WorkerNode {
  id: string;
  name: string;
  vram_gb: number;
  status: 'online' | 'busy' | 'offline';
  capabilities: string[];
  last_seen: string;
}

export interface GemEscrow {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  status: 'pending' | 'released' | 'cancelled';
  reason: string;
  task_type: string;
  created_at: string;
}

export interface AgentNode {
  agent_id: string;
  agent_name: string;
  platform: string;
  model: string;
  operator_id: string;
  total_contributions: number;
  total_gems_earned: number;
  avg_quality_score: number;
  reputation_factor: number;
}

export const gemRewardService = {
  getWorkers: async (): Promise<WorkerNode[]> => {
    const response = await axios.get(`${GEM_SERVICE_URL}/workers`);
    return response.data;
  },

  getTaskCategories: async (): Promise<TaskCategory[]> => {
    const response = await axios.get(`${GEM_SERVICE_URL}/task-categories`);
    return response.data;
  },

  getEscrows: async (): Promise<GemEscrow[]> => {
    const response = await axios.get(`${GEM_SERVICE_URL}/escrows`);
    return response.data;
  },

  seedTasks: async () => {
    const response = await axios.post(`${GEM_SERVICE_URL}/tasks/seed`);
    return response.data;
  },

  registerWorker: async (userId: string, name: string, vramGb: number, capabilities: string[]) => {
    const response = await axios.post(`${GEM_SERVICE_URL}/worker/register`, {
      user_id: userId,
      name,
      vram_gb: vramGb,
      capabilities
    });
    return response.data;
  },

  sendHeartbeat: async (workerId: string) => {
    const response = await axios.post(`${GEM_SERVICE_URL}/worker/heartbeat/${workerId}`);
    return response.data;
  },

  analyzeContribution: async (appId: string, contributorId: string, text: string, type: string) => {
    const response = await axios.post(`${GEM_SERVICE_URL}/ai/analyze-contribution`, {
      app_id: appId,
      contributor_id: contributorId,
      contribution_text: text,
      contribution_type: type
    });
    return response.data;
  },

  getAgents: async (): Promise<{ agents: AgentNode[], total_registered: number }> => {
    const response = await axios.get(`${GEM_SERVICE_URL}/ai/agents`);
    return response.data;
  }
};
