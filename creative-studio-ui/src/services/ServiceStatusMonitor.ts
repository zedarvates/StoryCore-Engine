/**
 * Service Status Monitor
 * 
 * Periodically polls local AI services (Ollama, ComfyUI) to check their health
 * and updates the application store.
 */

import { useAppStore } from '@/stores/useAppStore';
import { ComfyUIService } from './comfyuiService';
import { llmConfigService } from './llmConfigService';
import { getInstalledOllamaModels } from '@/utils/ollamaModelDetection';

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
            // Check if Ollama is responsive
            const response = await fetch(`${endpoint}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });

            if (response.ok) {
                store.setOllamaStatus('connected');
            } else {
                store.setOllamaStatus('error');
            }
        } catch (error) {
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
            const { available } = await service.isAvailable();
            store.setComfyUIStatus(available ? 'connected' : 'disconnected');
        } catch (error) {
            store.setComfyUIStatus('disconnected');
        }
    }
}

export const serviceStatusMonitor = ServiceStatusMonitor.getInstance();
