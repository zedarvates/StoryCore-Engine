/**
 * Service Status Monitor
 * 
 * Periodically polls local AI services (Ollama, ComfyUI) to check their health
 * and updates the application store.
 */

import { useAppStore } from '@/stores/useAppStore';
import { ComfyUIService } from './comfyuiService';
import { llmConfigService } from './llmConfigService';

class ServiceStatusMonitor {
    private static instance: ServiceStatusMonitor;
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private pollInterval = 10000; // 10 seconds

    private constructor() { }

    public static getInstance(): ServiceStatusMonitor {
        if (!ServiceStatusMonitor.instance) {
            ServiceStatusMonitor.instance = new ServiceStatusMonitor();
        }
        return ServiceStatusMonitor.instance;
    }

    /**
     * Start monitoring services
     */
    public start(): void {
        if (this.intervalId) return;

        // Initial check
        this.checkAllServices();

        // Setup polling
        this.intervalId = setInterval(() => {
            this.checkAllServices();
        }, this.pollInterval);

        console.log('🛡️ [ServiceStatusMonitor] Monitoring started');
    }

    /**
     * Stop monitoring services
     */
    public stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Manually trigger a check
     */
    public async checkAllServices(): Promise<void> {
        await Promise.allSettled([
            this.checkOllamaStatus(),
            this.checkLmStudioStatus(),
            this.checkComfyUIStatus(),
        ]);
    }

    /**
     * Health check for Ollama
     */
    private async checkOllamaStatus(): Promise<void> {
        const store = useAppStore.getState();
        const config = llmConfigService.getConfig();
        const endpoint = config?.apiEndpoint || 'http://localhost:11434';

        try {
            // Try via Electron API first to avoid console noise
            if (window.electronAPI?.llm?.testConnection) {
                const result = await window.electronAPI.llm.testConnection({
                    id: 'ollama',
                    name: 'Ollama',
                    baseUrl: endpoint,
                    type: 'ollama'
                });
                store.setOllamaStatus(result.success ? 'connected' : 'disconnected');
                return;
            }

            // Fallback for browser (will show console error if down)
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });

            if (response.ok) {
                store.setOllamaStatus('connected');
            } else {
                store.setOllamaStatus('error');
            }
        } catch (_error) {
            store.setOllamaStatus('disconnected');
        }
    }

    /**
     * Health check for ComfyUI
     */
    private async checkComfyUIStatus(): Promise<void> {
        const store = useAppStore.getState();
        const service = ComfyUIService.getInstance();

        try {
            if (window.electronAPI?.comfyui?.testConnection) {
                const result = await window.electronAPI.comfyui.testConnection();
                store.setComfyUIStatus(result.success ? 'connected' : 'disconnected');
                return;
            }

            const { available } = await service.isAvailable();
            store.setComfyUIStatus(available ? 'connected' : 'disconnected');
        } catch (_error) {
            store.setComfyUIStatus('disconnected');
        }
    }

    /**
     * Health check for LM Studio
     */
    private async checkLmStudioStatus(): Promise<void> {
        const store = useAppStore.getState();
        const endpoint = 'http://localhost:1234';

        try {
            if (window.electronAPI?.llm?.testConnection) {
                const result = await window.electronAPI.llm.testConnection({
                    id: 'lmstudio',
                    name: 'LM Studio',
                    baseUrl: endpoint,
                    type: 'lmstudio'
                });
                store.setLmStudioStatus(result.success ? 'connected' : 'disconnected');
                return;
            }

            const response = await fetch(`${endpoint}/v1/models`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });
            store.setLmStudioStatus(response.ok ? 'connected' : 'disconnected');
        } catch (_error) {
            store.setLmStudioStatus('disconnected');
        }
    }
}

export const serviceStatusMonitor = ServiceStatusMonitor.getInstance();
