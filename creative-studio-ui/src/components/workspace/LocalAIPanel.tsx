import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { llmConfigService } from '@/services/llmConfigService';
import { ComfyUIService } from '@/services/comfyuiService';
import { serviceStatusMonitor } from '@/services/ServiceStatusMonitor';
import { getModelNames } from '@/utils/ollamaModelDetection';
import {
    Cpu,
    RefreshCw,
    Settings,
    CheckCircle2,
    AlertCircle,
    Wifi,
    WifiOff,
    Database,
    Terminal,
    Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const LocalAIPanel = () => {
    const {
        ollamaStatus,
        comfyuiStatus,
        setOllamaStatus,
        setComfyUIStatus
    } = useAppStore();

    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [currentModel, setCurrentModel] = useState<string>('');

    useEffect(() => {
        const config = llmConfigService.getConfig();
        if (config) {
            setCurrentModel(config.model);
        }

        // Initial fetch
        fetchModels();
    }, []);

    const fetchModels = async () => {
        const config = llmConfigService.getConfig();
        const endpoint = config?.apiEndpoint || 'http://localhost:11434';
        const models = await getModelNames(endpoint);
        setOllamaModels(models);
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await serviceStatusMonitor.checkAllServices();
        await fetchModels();
        setIsRefreshing(false);
    };

    const currentLLMConfig = llmConfigService.getConfig();

    return (
        <div className="p-6 space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Local AI Engine</h1>
                    <p className="text-muted-foreground">Manage your local generation services and model configurations.</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                >
                    <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                    Refresh Status
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Ollama Status (LLM) */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <Database className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Ollama (LLM)</CardTitle>
                                    <CardDescription>Local Language Model Service</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={ollamaStatus} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Active Model</span>
                                <div className="font-medium flex items-center gap-1.5">
                                    <Cpu className="w-3.5 h-3.5 text-blue-500" />
                                    {currentLLMConfig?.model || 'None'}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Endpoint</span>
                                <div className="font-medium truncate text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                    {currentLLMConfig?.apiEndpoint || 'http://localhost:11434'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Available Models</span>
                            <div className="flex flex-wrap gap-2">
                                {ollamaModels.length > 0 ? (
                                    ollamaModels.map(model => (
                                        <Badge
                                            key={model}
                                            variant={model === currentLLMConfig?.model ? "default" : "secondary"}
                                            className="cursor-default"
                                        >
                                            {model}
                                        </Badge>
                                    ))
                                ) : (
                                    <span className="text-xs text-muted-foreground italic">No models detected</span>
                                )}
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex gap-2">
                            <Button variant="ghost" size="sm" className="w-full text-xs gap-1.5" onClick={() => window.dispatchEvent(new CustomEvent('open-llm-settings'))}>
                                <Settings className="w-3.5 h-3.5" />
                                Configure
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ComfyUI Status (Image/Video) */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                                    <Server className="w-5 h-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">ComfyUI</CardTitle>
                                    <CardDescription>Local Image & Video Engine</CardDescription>
                                </div>
                            </div>
                            <StatusBadge status={comfyuiStatus} />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Active Server</span>
                                <div className="font-medium flex items-center gap-1.5">
                                    <Wifi className="w-3.5 h-3.5 text-orange-500" />
                                    Local Instance 1
                                </div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-muted-foreground">Endpoint</span>
                                <div className="font-medium truncate text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">
                                    {ComfyUIService.getInstance().getBaseUrl()}
                                </div>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                            <div className="flex items-center gap-2 mb-2">
                                <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium uppercase text-muted-foreground tracking-wider">Capabilities</span>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                <Capability label="Flux.1 Support" active={true} />
                                <Capability label="Video (Stable Video)" active={true} />
                                <Capability label="Character LoRA" active={true} />
                                <Capability label="ControlNet" active={false} />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-border/50 flex gap-2">
                            <Button variant="ghost" size="sm" className="w-full text-xs gap-1.5" onClick={() => window.dispatchEvent(new CustomEvent('open-comfyui-settings'))}>
                                <Settings className="w-3.5 h-3.5" />
                                Configure
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    switch (status) {
        case 'connected':
            return (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                </Badge>
            );
        case 'error':
            return (
                <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Issue Detected
                </Badge>
            );
        case 'connecting':
            return (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Checking...
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 gap-1.5">
                    <WifiOff className="w-3.5 h-3.5" />
                    Offline
                </Badge>
            );
    }
};

const Capability = ({ label, active }: { label: string; active: boolean }) => (
    <div className="flex items-center justify-between text-[11px]">
        <span className={active ? "text-foreground" : "text-muted-foreground/60"}>{label}</span>
        {active ? (
            <CheckCircle2 className="w-2.5 h-2.5 text-green-500" />
        ) : (
            <div className="w-2.5 h-2.5 rounded-full border border-muted-foreground/30" />
        )}
    </div>
);
