import React, { useState, useEffect, useCallback } from 'react';
import { ComfyUIClient } from '@/services/wizard/ComfyUIClient';
import { backendApi } from '@/services/backendApiService';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  Clock,
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

interface ComfyUIProgressMonitorProps {
  executions: WorkflowExecution[];
  onExecutionUpdate?: (execution: WorkflowExecution) => void;
  onExecutionComplete?: (execution: WorkflowExecution) => void;
  className?: string;
}

export function ComfyUIProgressMonitor({
  executions,
  onExecutionUpdate,
  onExecutionComplete,
  className,
}: ComfyUIProgressMonitorProps) {
  const [activeExecutions, setActiveExecutions] = useState<WorkflowExecution[]>(executions);

  // Update executions when props change
  useEffect(() => {
    setActiveExecutions(executions);
  }, [executions]);

  // Format duration
  const formatDuration = (start: Date, end?: Date): string => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();

    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status color
  const getStatusColor = (status: WorkflowExecution['status']): string => {
    switch (status) {
      case 'queued': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Get status icon
  const getStatusIcon = (status: WorkflowExecution['status']) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4" />;
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      case 'cancelled':
        return <Square className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Cancel execution
  const cancelExecution = useCallback(async (executionId: string) => {
    const execution = activeExecutions.find(e => e.id === executionId);
    if (!execution) return;

    try {
      // Cancel via backend API if available, otherwise interrupt client
      await backendApi.cancelComfyUIWorkflow(execution.id);

      const updatedExecution: WorkflowExecution = {
        ...execution,
        status: 'cancelled',
        endTime: new Date(),
      };

      setActiveExecutions(prev =>
        prev.map(e => e.id === executionId ? updatedExecution : e)
      );

      onExecutionUpdate?.(updatedExecution);
      onExecutionComplete?.(updatedExecution);
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  }, [activeExecutions, onExecutionUpdate, onExecutionComplete]);

  // Monitor execution progress
  useEffect(() => {
    const activeIds = activeExecutions
      .filter(e => e.status === 'running' || e.status === 'queued')
      .map(e => e.id);

    if (activeIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const executionId of activeIds) {
        try {
          const response = await backendApi.getComfyUIStatus(executionId);

          if (response.success && response.data) {
            const statusData = response.data;

            setActiveExecutions(prev => prev.map(execution => {
              if (execution.id !== executionId) return execution;

              const updatedExecution: WorkflowExecution = {
                ...execution,
                status: statusData.status,
                progress: statusData.progress,
                currentNode: statusData.currentNode,
                totalNodes: statusData.totalNodes,
                completedNodes: statusData.completedNodes,
                outputs: statusData.outputs?.map(output => ({
                  type: output.type as 'image' | 'video' | 'audio',
                  url: output.url,
                  filename: output.filename,
                })),
              };

              // Mark as completed if status indicates completion
              if (statusData.status === 'completed' || statusData.status === 'failed') {
                updatedExecution.endTime = new Date();
                onExecutionComplete?.(updatedExecution);
              } else {
                onExecutionUpdate?.(updatedExecution);
              }

              return updatedExecution;
            }));
          }
        } catch (error) {
          console.error(`Failed to get status for execution ${executionId}:`, error);
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [activeExecutions, onExecutionUpdate, onExecutionComplete]);

  if (activeExecutions.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className || ''}`}>
        <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No active workflow executions</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Workflow Progress</h4>
        <span className="text-xs text-muted-foreground">
          {activeExecutions.filter(e => e.status === 'running').length} running
        </span>
      </div>

      <div className="space-y-3">
        {activeExecutions.map((execution) => (
          <div
            key={execution.id}
            className="border border-border rounded-lg p-4 bg-card"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className={getStatusColor(execution.status)}>
                  {getStatusIcon(execution.status)}
                </span>
                <span className="text-sm font-medium">
                  Workflow {execution.id.slice(-8)}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  execution.status === 'completed' ? 'bg-green-100 text-green-800' :
                  execution.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  execution.status === 'failed' ? 'bg-red-100 text-red-800' :
                  execution.status === 'queued' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {execution.status}
                </span>
              </div>

              {(execution.status === 'running' || execution.status === 'queued') && (
                <button
                  onClick={() => cancelExecution(execution.id)}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                  title="Cancel execution"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{Math.round(execution.progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    execution.status === 'completed' ? 'bg-green-500' :
                    execution.status === 'failed' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}
                  style={{ width: `${execution.progress}%` }}
                />
              </div>
            </div>

            {/* Node Progress */}
            {execution.currentNode && execution.totalNodes && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Current Node</span>
                  <span>
                    {execution.completedNodes || 0} / {execution.totalNodes}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {execution.currentNode}
                </div>
              </div>
            )}

            {/* Timing */}
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Duration: {formatDuration(execution.startTime, execution.endTime)}</span>
              {execution.outputs && execution.outputs.length > 0 && (
                <span>{execution.outputs.length} output{execution.outputs.length > 1 ? 's' : ''}</span>
              )}
            </div>

            {/* Error Display */}
            {execution.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="font-medium">Error:</span>
                </div>
                <div className="mt-1">{execution.error}</div>
              </div>
            )}

            {/* Outputs Preview */}
            {execution.outputs && execution.outputs.length > 0 && (
              <div className="mt-3">
                <div className="text-xs text-muted-foreground mb-2">Generated Files:</div>
                <div className="space-y-1">
                  {execution.outputs.slice(0, 3).map((output, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${
                        output.type === 'image' ? 'bg-green-500' :
                        output.type === 'video' ? 'bg-blue-500' :
                        'bg-purple-500'
                      }`} />
                      <span className="truncate">{output.filename}</span>
                    </div>
                  ))}
                  {execution.outputs.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{execution.outputs.length - 3} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}