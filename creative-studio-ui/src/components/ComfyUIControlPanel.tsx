import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { testComfyUIConnection, type ComfyUIConfig, type ComfyUIServerInfo } from '@/services/comfyuiService';
import { ComfyUIClient } from '@/services/wizard/ComfyUIClient';
import { backendApi } from '@/services/backendApiService';
import { ComfyUIMediaUpload } from '@/components/ComfyUIMediaUpload';
import { ComfyUIProgressMonitor } from '@/components/ComfyUIProgressMonitor';
import { ComfyUIParameterPanel } from '@/components/ComfyUIParameterPanel';
import {
  Server,
  Play,
  Square,
  Settings,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Monitor,
  Cpu,
  HardDrive,
} from 'lucide-react';

interface WorkflowExecution {
  id: string;
  client: ComfyUIClient;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentNode?: string;
  totalNodes?: number;
  completedNodes?: number;
  startTime: Date;
  endTime?: Date;
  error?: string;
  outputs?: Array<{
    type: 'image' | 'video' | 'audio';
    url: string;
    filename: string;
  }>;
}

interface ComfyUIControlPanelProps {
  className?: string;
}

export function ComfyUIControlPanel({ className }: ComfyUIControlPanelProps) {
  const { toast } = useToast();
  const project = useAppStore((state) => state.project);

  // ComfyUI state
  const [comfyConfig, setComfyConfig] = useState<ComfyUIConfig | null>(null);
  const [serverInfo, setServerInfo] = useState<ComfyUIServerInfo | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<{ pending: number; running: number } | null>(null);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [generationParams, setGenerationParams] = useState({
    prompt: '',
    negativePrompt: '',
    seed: -1,
    steps: 20,
    cfgScale: 7.0,
    sampler: 'euler',
    scheduler: 'normal',
    denoisingStrength: 1.0,
    width: 1024,
    height: 1024,
  });

  // Initialize ComfyUI configuration
  useEffect(() => {
    const config = backendApi.getComfyUIConfig();
    if (config) {
      setComfyConfig(config);
      testConnection(config);
    }
  }, []);

  // Test ComfyUI connection
  const testConnection = async (config: ComfyUIConfig) => {
    setIsTestingConnection(true);
    try {
      const result = await testComfyUIConnection(config);
      setConnectionStatus(result.success ? 'connected' : 'error');

      if (result.success && result.serverInfo) {
        setServerInfo(result.serverInfo);
        toast({
          title: 'ComfyUI Connected',
          description: `Server: ${result.serverInfo.version} | GPU: ${result.serverInfo.systemInfo.gpuName}`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      setConnectionStatus('error');
      toast({
        title: 'Connection Test Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Get queue status
  const getQueueStatus = async () => {
    if (!comfyConfig) return;

    try {
      const response = await backendApi.getComfyUIQueue();
      if (response.success && response.data) {
        setQueueStatus({
          pending: response.data.pending,
          running: response.data.running,
        });
      }
    } catch (error) {
      console.error('Failed to get queue status:', error);
    }
  };

  // Execute workflow
  const executeWorkflow = async (workflowType: 'image' | 'video' | 'upscale' | 'inpaint') => {
    if (!comfyConfig || !project) return;

    setActiveWorkflow(workflowType);
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create execution tracking
    const execution: WorkflowExecution = {
      id: executionId,
      client: new ComfyUIClient(comfyConfig),
      status: 'running',
      progress: 0,
      startTime: new Date(),
    };

    setExecutions(prev => [...prev, execution]);

    try {
      // Create basic workflow based on type
      let workflow: unknown = {};
      switch (workflowType) {
        case 'image':
          workflow = execution.client.getStoryboardFrameTemplate();
          break;
        case 'video':
          break;
        default:
          workflow = execution.client.getStoryboardFrameTemplate();
      }

      // Execute workflow
      const result = await execution.client.executeWorkflow(workflow);

      // Update execution with results
      setExecutions(prev => prev.map(e =>
        e.id === executionId
          ? {
              ...e,
              status: 'completed',
              progress: 100,
              endTime: new Date(),
              outputs: result.outputs.map(output => ({
                type: 'image' as const, // Assume image for now
                url: `/comfyui/view?filename=${output.filename}&subfolder=${output.subfolder}&type=${output.type}`,
                filename: output.filename,
              })),
            }
          : e
      ));

      toast({
        title: 'Workflow Completed',
        description: `Generated ${result.outputs.length} output(s)`,
      });

      // Refresh queue status
      getQueueStatus();

    } catch (error) {
      // Update execution with error
      setExecutions(prev => prev.map(e =>
        e.id === executionId
          ? {
              ...e,
              status: 'failed',
              endTime: new Date(),
              error: error instanceof Error ? error.message : 'Unknown error',
            }
          : e
      ));

      toast({
        title: 'Workflow Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setActiveWorkflow(null);
    }
  };

  // Refresh all status
  const refreshStatus = async () => {
    if (comfyConfig) {
      await testConnection(comfyConfig);
      await getQueueStatus();
    }
  };

  return (
    <div className={`h-full overflow-auto ${className || ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="w-5 h-5" />
            ComfyUI Control
          </h3>
          <button
            onClick={refreshStatus}
            className="p-2 hover:bg-muted rounded-md"
            title="Refresh status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'connecting' ? 'bg-yellow-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-500'
          }`} />
          <span className="capitalize">{connectionStatus}</span>
          {serverInfo && (
            <span className="text-muted-foreground">
              v{serverInfo.version}
            </span>
          )}
        </div>
      </div>

      {/* Server Info */}
      {serverInfo && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Server className="w-4 h-4" />
            Server Information
          </h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>GPU:</span>
              <span>{serverInfo.systemInfo.gpuName}</span>
            </div>
            <div className="flex justify-between">
              <span>VRAM:</span>
              <span>{serverInfo.systemInfo.vramTotal}MB total</span>
            </div>
            <div className="flex justify-between">
              <span>Free:</span>
              <span>{serverInfo.systemInfo.vramFree}MB free</span>
            </div>
          </div>
        </div>
      )}

      {/* Queue Status */}
      {queueStatus && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            Queue Status
          </h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Pending:</span>
              <span className="text-yellow-600">{queueStatus.pending}</span>
            </div>
            <div className="flex justify-between">
              <span>Running:</span>
              <span className="text-blue-600">{queueStatus.running}</span>
            </div>
          </div>
        </div>
      )}

      {/* Media Upload */}
      <div className="p-4 border-b border-border">
        <ComfyUIMediaUpload
          onFileUploaded={(file, uploadUrl) => {
            toast({
              title: 'Media Ready',
              description: `${file.name} can now be used in ComfyUI workflows`,
            });
          }}
        />
      </div>

      {/* Workflow Actions */}
      <div className="p-4">
        <h4 className="text-sm font-medium mb-3">Quick Workflows</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => executeWorkflow('image')}
            disabled={connectionStatus !== 'connected' || activeWorkflow === 'image'}
            className="p-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 text-xs"
          >
            {activeWorkflow === 'image' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            <span>Generate Image</span>
          </button>

          <button
            onClick={() => executeWorkflow('video')}
            disabled={connectionStatus !== 'connected' || activeWorkflow === 'video'}
            className="p-3 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 text-xs"
          >
            {activeWorkflow === 'video' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Generate Video</span>
          </button>

          <button
            onClick={() => executeWorkflow('upscale')}
            disabled={connectionStatus !== 'connected' || activeWorkflow === 'upscale'}
            className="p-3 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 text-xs"
          >
            {activeWorkflow === 'upscale' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
            <span>Upscale</span>
          </button>

          <button
            onClick={() => executeWorkflow('inpaint')}
            disabled={connectionStatus !== 'connected' || activeWorkflow === 'inpaint'}
            className="p-3 bg-muted text-muted-foreground rounded-md hover:bg-muted/90 disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1 text-xs"
          >
            {activeWorkflow === 'inpaint' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Cpu className="w-4 h-4" />
            )}
            <span>Inpaint</span>
          </button>
        </div>
      </div>

      {/* Parameter Panel */}
      <div className="p-4 border-t border-border">
        <ComfyUIParameterPanel
          parameters={generationParams}
          onParametersChange={setGenerationParams}
          onExecuteWorkflow={(params) => executeWorkflow('image')} // Default to image generation
        />
      </div>

      {/* Progress Monitor */}
      <div className="p-4 border-t border-border">
        <ComfyUIProgressMonitor
          executions={executions}
          onExecutionUpdate={(execution) => {
            setExecutions(prev => prev.map(e =>
              e.id === execution.id ? execution : e
            ));
          }}
          onExecutionComplete={(execution) => {
            toast({
              title: 'Workflow Complete',
              description: `Execution ${execution.id.slice(-8)} finished`,
            });
          }}
        />
      </div>

      {/* Connection Test */}
      <div className="p-4 border-t border-border">
        <button
          onClick={() => comfyConfig && testConnection(comfyConfig)}
          disabled={isTestingConnection}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isTestingConnection ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : connectionStatus === 'connected' ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <XCircle className="w-4 h-4" />
          )}
          <span>Test Connection</span>
        </button>
      </div>
    </div>
  );
}

