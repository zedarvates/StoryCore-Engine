/**
 * ComfyUI Settings Panel Component
 * 
 * Provides UI for configuring ComfyUI backend connection including:
 * - Server URL input with validation
 * - Authentication configuration
 * - Workflow selection dropdowns
 * - Model preference selectors
 * - Server status display
 * 
 * Validates Requirements: 4.1, 4.2, 4.6
 */

import { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2, Info, Eye, EyeOff, Server, Cpu, HardDrive, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type {
  ComfyUIConfig,
  ComfyUIServerInfo,
  AuthenticationType,
} from '@/services/comfyuiService';
import {
  getDefaultComfyUIConfig,
  testComfyUIConnection,
  formatFileSize,
  formatVRAM,
} from '@/services/comfyuiService';

// ============================================================================
// Types
// ============================================================================

export interface ComfyUISettingsPanelProps {
  currentConfig?: Partial<ComfyUIConfig>;
  onSave: (config: ComfyUIConfig) => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
}

interface ConnectionStatus {
  state: 'idle' | 'testing' | 'success' | 'error';
  message?: string;
  serverInfo?: ComfyUIServerInfo;
}

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate server URL format
 */
function validateServerUrl(url: string): string | null {
  if (!url) {
    return 'Server URL is required';
  }

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return 'Server URL must use HTTP or HTTPS protocol';
    }
  } catch {
    return 'Invalid URL format. Please enter a valid server URL.';
  }

  return null;
}

/**
 * Get connection error guidance
 */
function getConnectionErrorGuidance(): string {
  return 'Check: 1) ComfyUI server is running, 2) URL is correct, 3) No firewall blocking, 4) Authentication is correct.';
}

// ============================================================================
// ComfyUI Settings Panel Component
// ============================================================================

export function ComfyUISettingsPanel({
  currentConfig,
  onSave,
  onCancel,
  className,
}: ComfyUISettingsPanelProps) {
  // ============================================================================
  // State
  // ============================================================================

  const defaultConfig = getDefaultComfyUIConfig();
  
  const [serverUrl, setServerUrl] = useState(currentConfig?.serverUrl || defaultConfig.serverUrl);
  const [authType, setAuthType] = useState<AuthenticationType>(
    currentConfig?.authentication?.type || 'none'
  );
  const [username, setUsername] = useState(currentConfig?.authentication?.username || '');
  const [password, setPassword] = useState(currentConfig?.authentication?.password || '');
  const [token, setToken] = useState(currentConfig?.authentication?.token || '');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

  // Server configuration
  const [autoStart, setAutoStart] = useState(currentConfig?.server?.autoStart || false);
  const [corsHeaders, setCorsHeaders] = useState(currentConfig?.server?.corsHeaders || false);
  const [gpuMemory, setGpuMemory] = useState<number | undefined>(currentConfig?.server?.gpuMemory);
  const [modelsPath, setModelsPath] = useState(currentConfig?.server?.modelsPath || '');
  const [workflowsPath, setWorkflowsPath] = useState(currentConfig?.server?.workflowsPath || '');

  const [imageWorkflow, setImageWorkflow] = useState(
    currentConfig?.workflows?.imageGeneration || ''
  );
  const [videoWorkflow, setVideoWorkflow] = useState(
    currentConfig?.workflows?.videoGeneration || ''
  );
  const [upscaleWorkflow, setUpscaleWorkflow] = useState(
    currentConfig?.workflows?.upscaling || ''
  );
  const [inpaintWorkflow, setInpaintWorkflow] = useState(
    currentConfig?.workflows?.inpainting || ''
  );

  const [checkpoint, setCheckpoint] = useState(
    currentConfig?.models?.preferredCheckpoint || ''
  );
  const [vae, setVae] = useState(currentConfig?.models?.preferredVAE || '');
  const [clipModel, setClipModel] = useState(currentConfig?.models?.preferredCLIP || '');
  const [loras, setLoras] = useState<string[]>(
    currentConfig?.models?.preferredLora || []
  );

  const [batchSize, setBatchSize] = useState(
    currentConfig?.performance?.batchSize || defaultConfig.performance.batchSize
  );
  const [timeout, setTimeout] = useState(
    currentConfig?.performance?.timeout || defaultConfig.performance.timeout
  );
  const [maxJobs, setMaxJobs] = useState(
    currentConfig?.performance?.maxConcurrentJobs || defaultConfig.performance.maxConcurrentJobs
  );
  const [precision, setPrecision] = useState<'FP16' | 'FP32' | 'FP8'>(
    currentConfig?.performance?.precision || defaultConfig.performance.precision || 'FP16'
  );
  const [steps, setSteps] = useState(
    currentConfig?.performance?.steps || defaultConfig.performance.steps || 20
  );
  const [denoisingStrength, setDenoisingStrength] = useState(
    currentConfig?.performance?.denoisingStrength || defaultConfig.performance.denoisingStrength || 0.75
  );

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ state: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ============================================================================
  // Effects
  // ============================================================================

  // Load settings on mount
  useEffect(() => {
    // Settings are loaded from props (currentConfig)
    // In a real implementation, you might load from secure storage here
    setIsLoading(false);
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const validateConfiguration = (): string | null => {
    // Validate server URL
    const urlError = validateServerUrl(serverUrl);
    if (urlError) {
      return urlError;
    }

    // Validate authentication
    if (authType === 'basic') {
      if (!username || !password) {
        return 'Username and password are required for basic authentication';
      }
    } else if (authType === 'token') {
      if (!token) {
        return 'Token is required for token authentication';
      }
    }

    // Validate performance settings
    if (batchSize < 1 || batchSize > 10) {
      return 'Batch size must be between 1 and 10';
    }

    if (timeout < 10000) {
      return 'Timeout must be at least 10000ms (10 seconds)';
    }

    if (maxJobs < 1 || maxJobs > 5) {
      return 'Max concurrent jobs must be between 1 and 5';
    }

    return null;
  };

  const handleTestConnection = async () => {
    // Validate before testing
    const validationError = validateConfiguration();
    if (validationError) {
      setConnectionStatus({
        state: 'error',
        message: validationError,
      });
      return;
    }

    setConnectionStatus({ state: 'testing', message: 'Testing connection to ComfyUI server...' });

    try {
      const config: Partial<ComfyUIConfig> = {
        serverUrl,
        authentication: {
          type: authType,
          username: authType === 'basic' ? username : undefined,
          password: authType === 'basic' ? password : undefined,
          token: authType === 'token' ? token : undefined,
        },
      };

      const result = await testComfyUIConnection(config);

      if (result.success) {
        setConnectionStatus({
          state: 'success',
          message: result.message,
          serverInfo: result.serverInfo,
        });
      } else {
        setConnectionStatus({
          state: 'error',
          message: `${result.message}. ${getConnectionErrorGuidance()}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection test failed';
      setConnectionStatus({
        state: 'error',
        message: `${errorMessage}. ${getConnectionErrorGuidance()}`,
      });
    }
  };

  const handleSave = async () => {
    // Validate before saving
    const validationError = validateConfiguration();
    if (validationError) {
      setConnectionStatus({
        state: 'error',
        message: validationError,
      });
      return;
    }

    // Require successful connection test
    if (connectionStatus.state !== 'success') {
      setConnectionStatus({
        state: 'error',
        message: 'Please test the connection before saving.',
      });
      return;
    }

    setIsSaving(true);

    try {
      const config: ComfyUIConfig = {
        serverUrl,
        authentication: {
          type: authType,
          username: authType === 'basic' ? username : undefined,
          password: authType === 'basic' ? password : undefined,
          token: authType === 'token' ? token : undefined,
        },
        server: {
          autoStart,
          corsHeaders,
          gpuMemory,
          modelsPath,
          workflowsPath,
        },
        workflows: {
          imageGeneration: imageWorkflow,
          videoGeneration: videoWorkflow,
          upscaling: upscaleWorkflow,
          inpainting: inpaintWorkflow,
        },
        models: {
          preferredCheckpoint: checkpoint,
          preferredVAE: vae,
          preferredCLIP: clipModel,
          preferredLora: loras,
        },
        performance: {
          batchSize,
          timeout,
          maxConcurrentJobs: maxJobs,
          precision,
          steps,
          denoisingStrength,
        },
        connectionStatus: 'connected',
        lastChecked: new Date(),
      };

      // Save configuration
      await onSave(config);

      // Show success message
      setConnectionStatus({
        state: 'success',
        message: 'ComfyUI settings saved successfully.',
        serverInfo: connectionStatus.serverInfo,
      });
    } catch (error) {
      setConnectionStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Failed to save settings',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isFormValid = () => {
    if (!serverUrl) return false;
    if (authType === 'basic' && (!username || !password)) return false;
    if (authType === 'token' && !token) return false;
    return true;
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Connection Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Connection Configuration</CardTitle>
          <CardDescription>
            Configure connection to your ComfyUI server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="serverUrl">Server URL</Label>
            <Input
              id="serverUrl"
              type="url"
              value={serverUrl}
              onChange={(e) => {
                setServerUrl(e.target.value);
                // Clear connection status when URL changes
                if (connectionStatus.state !== 'idle') {
                  setConnectionStatus({ state: 'idle' });
                }
              }}
              placeholder="http://localhost:8188"
              className={cn(
                serverUrl && validateServerUrl(serverUrl) && 'border-red-500 focus-visible:ring-red-500'
              )}
              aria-invalid={serverUrl ? !!validateServerUrl(serverUrl) : undefined}
              aria-describedby={serverUrl && validateServerUrl(serverUrl) ? 'serverUrl-error' : undefined}
            />
            <p className="text-xs text-muted-foreground">
              The URL where your ComfyUI server is running (default: http://localhost:8188)
            </p>
            {serverUrl && validateServerUrl(serverUrl) && (
              <p id="serverUrl-error" className="text-xs text-red-600 dark:text-red-400" role="alert">
                {validateServerUrl(serverUrl)}
              </p>
            )}
          </div>

          {/* Authentication Type */}
          <div className="space-y-3">
            <Label>Authentication</Label>
            <RadioGroup value={authType} onValueChange={(value) => {
              setAuthType(value as AuthenticationType);
              // Clear connection status when auth type changes
              if (connectionStatus.state !== 'idle') {
                setConnectionStatus({ state: 'idle' });
              }
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="auth-none" />
                <Label htmlFor="auth-none" className="font-normal cursor-pointer">
                  No Authentication
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="basic" id="auth-basic" />
                <Label htmlFor="auth-basic" className="font-normal cursor-pointer">
                  Basic Authentication
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="token" id="auth-token" />
                <Label htmlFor="auth-token" className="font-normal cursor-pointer">
                  Token Authentication
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Basic Authentication Fields */}
          {authType === 'basic' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (connectionStatus.state !== 'idle') {
                      setConnectionStatus({ state: 'idle' });
                    }
                  }}
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (connectionStatus.state !== 'idle') {
                        setConnectionStatus({ state: 'idle' });
                      }
                    }}
                    placeholder="Enter password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Token Authentication Field */}
          {authType === 'token' && (
            <div className="space-y-2">
              <Label htmlFor="token">Access Token</Label>
              <div className="relative">
                <Input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (connectionStatus.state !== 'idle') {
                      setConnectionStatus({ state: 'idle' });
                    }
                  }}
                  placeholder="Enter access token"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Connection Test */}
          <div className="space-y-2">
            <Button
              onClick={handleTestConnection}
              disabled={!isFormValid() || connectionStatus.state === 'testing'}
              variant="outline"
              className="w-full"
            >
              {connectionStatus.state === 'testing' && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Test Connection
            </Button>

            {connectionStatus.state !== 'idle' && (
              <div
                className={cn(
                  'flex items-start gap-2 p-3 rounded-lg text-sm',
                  connectionStatus.state === 'success' && 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
                  connectionStatus.state === 'error' && 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
                  connectionStatus.state === 'testing' && 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800'
                )}
                role="alert"
                aria-live="polite"
              >
                {connectionStatus.state === 'success' && <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {connectionStatus.state === 'error' && <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
                {connectionStatus.state === 'testing' && <Loader2 className="h-4 w-4 mt-0.5 flex-shrink-0 animate-spin" />}
                <div className="flex-1">
                  <p className="font-medium">{connectionStatus.message}</p>
                  {connectionStatus.state === 'error' && (
                    <p className="mt-1 text-xs opacity-90">
                      {getConnectionErrorGuidance()}
                    </p>
                  )}
                </div>
              </div>
            )}

            {connectionStatus.state === 'success' && (
              <p className="text-xs text-muted-foreground">
                ✓ Connection verified. You can now configure workflows and models.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Server Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Server Configuration</CardTitle>
          <CardDescription>
            Advanced server settings and paths
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto-start */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="autoStart">Auto-start ComfyUI</Label>
              <p className="text-xs text-muted-foreground">
                Automatically start ComfyUI server when application launches
              </p>
            </div>
            <Switch
              id="autoStart"
              checked={autoStart}
              onCheckedChange={setAutoStart}
            />
          </div>

          <Separator />

          {/* CORS Headers */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="corsHeaders">Enable CORS Headers</Label>
              <p className="text-xs text-muted-foreground">
                Allow cross-origin requests (useful for development)
              </p>
            </div>
            <Switch
              id="corsHeaders"
              checked={corsHeaders}
              onCheckedChange={setCorsHeaders}
            />
          </div>

          <Separator />

          {/* GPU Memory */}
          <div className="space-y-2">
            <Label htmlFor="gpuMemory" className="flex items-center gap-2">
              GPU Memory Allocation (GB)
              <TooltipInfo content="Manual GPU memory allocation. Leave empty for auto-detection." />
            </Label>
            <Input
              id="gpuMemory"
              type="number"
              min={1}
              max={48}
              value={gpuMemory || ''}
              onChange={(e) => setGpuMemory(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Auto-detect"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to let ComfyUI auto-detect available VRAM
            </p>
          </div>

          {/* Models Path */}
          <div className="space-y-2">
            <Label htmlFor="modelsPath">Models Directory</Label>
            <div className="flex gap-2">
              <Input
                id="modelsPath"
                type="text"
                value={modelsPath}
                onChange={(e) => setModelsPath(e.target.value)}
                placeholder="/path/to/ComfyUI/models"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  // In a real implementation, this would open an Electron file dialog
                  alert('File browser would open here (Electron dialog)');
                }}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Path to ComfyUI models directory
            </p>
          </div>

          {/* Workflows Path */}
          <div className="space-y-2">
            <Label htmlFor="workflowsPath">Workflows Directory</Label>
            <div className="flex gap-2">
              <Input
                id="workflowsPath"
                type="text"
                value={workflowsPath}
                onChange={(e) => setWorkflowsPath(e.target.value)}
                placeholder="/path/to/workflows"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  // In a real implementation, this would open an Electron file dialog
                  alert('File browser would open here (Electron dialog)');
                }}
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Path to custom workflows directory
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Server Status */}
      {connectionStatus.serverInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Server Status
            </CardTitle>
            <CardDescription>
              Information about your ComfyUI server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Version */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <Badge variant="outline">{connectionStatus.serverInfo.version}</Badge>
            </div>

            <Separator />

            {/* System Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                System Information
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">GPU</span>
                  <span className="font-mono">{connectionStatus.serverInfo.systemInfo.gpuName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">VRAM Total</span>
                  <span className="font-mono">{formatVRAM(connectionStatus.serverInfo.systemInfo.vramTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">VRAM Free</span>
                  <span className="font-mono text-green-600 dark:text-green-400">
                    {formatVRAM(connectionStatus.serverInfo.systemInfo.vramFree)}
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Available Resources */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Workflows</span>
                <Badge>{connectionStatus.serverInfo.availableWorkflows.length}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Available Models</span>
                <Badge>{connectionStatus.serverInfo.availableModels.length}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Selection */}
      {connectionStatus.serverInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Workflow Selection</CardTitle>
            <CardDescription>
              Choose workflows for different generation tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Image Generation Workflow */}
            <div className="space-y-2">
              <Label htmlFor="imageWorkflow">Image Generation</Label>
              <Select value={imageWorkflow} onValueChange={setImageWorkflow}>
                <SelectTrigger id="imageWorkflow">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableWorkflows
                    .filter(w => w.type === 'image')
                    .map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {imageWorkflow && (
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.serverInfo.availableWorkflows.find(w => w.id === imageWorkflow)?.description}
                </p>
              )}
            </div>

            {/* Video Generation Workflow */}
            <div className="space-y-2">
              <Label htmlFor="videoWorkflow">Video Generation</Label>
              <Select value={videoWorkflow} onValueChange={setVideoWorkflow}>
                <SelectTrigger id="videoWorkflow">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableWorkflows
                    .filter(w => w.type === 'video')
                    .map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {videoWorkflow && (
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.serverInfo.availableWorkflows.find(w => w.id === videoWorkflow)?.description}
                </p>
              )}
            </div>

            {/* Upscaling Workflow */}
            <div className="space-y-2">
              <Label htmlFor="upscaleWorkflow">Upscaling</Label>
              <Select value={upscaleWorkflow} onValueChange={setUpscaleWorkflow}>
                <SelectTrigger id="upscaleWorkflow">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableWorkflows
                    .filter(w => w.type === 'upscale')
                    .map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {upscaleWorkflow && (
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.serverInfo.availableWorkflows.find(w => w.id === upscaleWorkflow)?.description}
                </p>
              )}
            </div>

            {/* Inpainting Workflow */}
            <div className="space-y-2">
              <Label htmlFor="inpaintWorkflow">Inpainting</Label>
              <Select value={inpaintWorkflow} onValueChange={setInpaintWorkflow}>
                <SelectTrigger id="inpaintWorkflow">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableWorkflows
                    .filter(w => w.type === 'inpaint')
                    .map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {inpaintWorkflow && (
                <p className="text-xs text-muted-foreground">
                  {connectionStatus.serverInfo.availableWorkflows.find(w => w.id === inpaintWorkflow)?.description}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Model Preferences */}
      {connectionStatus.serverInfo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Model Preferences
            </CardTitle>
            <CardDescription>
              Select your preferred models for generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Checkpoint Model */}
            <div className="space-y-2">
              <Label htmlFor="checkpoint">Checkpoint Model</Label>
              <Select value={checkpoint} onValueChange={setCheckpoint}>
                <SelectTrigger id="checkpoint">
                  <SelectValue placeholder="Select checkpoint" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableModels
                    .filter(m => m.type === 'checkpoint')
                    .map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.loaded && (
                            <Badge variant="outline" className="text-xs">Loaded</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {checkpoint && (
                <p className="text-xs text-muted-foreground">
                  Size: {formatFileSize(
                    connectionStatus.serverInfo.availableModels.find(m => m.id === checkpoint)?.size || 0
                  )}
                </p>
              )}
            </div>

            {/* VAE Model */}
            <div className="space-y-2">
              <Label htmlFor="vae">VAE Model</Label>
              <Select value={vae} onValueChange={setVae}>
                <SelectTrigger id="vae">
                  <SelectValue placeholder="Select VAE" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableModels
                    .filter(m => m.type === 'vae')
                    .map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.loaded && (
                            <Badge variant="outline" className="text-xs">Loaded</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {vae && (
                <p className="text-xs text-muted-foreground">
                  Size: {formatFileSize(
                    connectionStatus.serverInfo.availableModels.find(m => m.id === vae)?.size || 0
                  )}
                </p>
              )}
            </div>

            {/* CLIP Model */}
            <div className="space-y-2">
              <Label htmlFor="clipModel">CLIP Model</Label>
              <Select value={clipModel} onValueChange={setClipModel}>
                <SelectTrigger id="clipModel">
                  <SelectValue placeholder="Select CLIP model" />
                </SelectTrigger>
                <SelectContent>
                  {connectionStatus.serverInfo.availableModels
                    .filter(m => m.type === 'clip')
                    .map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.loaded && (
                            <Badge variant="outline" className="text-xs">Loaded</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {clipModel && (
                <p className="text-xs text-muted-foreground">
                  Size: {formatFileSize(
                    connectionStatus.serverInfo.availableModels.find(m => m.id === clipModel)?.size || 0
                  )}
                </p>
              )}
            </div>

            {/* LoRA Models */}
            <div className="space-y-2">
              <Label>LoRA Models (Optional)</Label>
              <div className="space-y-2">
                {connectionStatus.serverInfo.availableModels
                  .filter(m => m.type === 'lora')
                  .map((model) => (
                    <div key={model.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`lora-${model.id}`}
                        checked={loras.includes(model.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setLoras([...loras, model.id]);
                          } else {
                            setLoras(loras.filter(id => id !== model.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor={`lora-${model.id}`} className="font-normal cursor-pointer flex items-center gap-2">
                        {model.name}
                        {model.loaded && (
                          <Badge variant="outline" className="text-xs">Loaded</Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          ({formatFileSize(model.size)})
                        </span>
                      </Label>
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Settings</CardTitle>
          <CardDescription>
            Configure batch processing, precision, and generation parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Precision */}
          <div className="space-y-2">
            <Label htmlFor="precision" className="flex items-center gap-2">
              Model Precision
              <TooltipInfo content="FP16 is faster and uses less VRAM. FP32 is more accurate. FP8 is experimental and very fast." />
            </Label>
            <Select value={precision} onValueChange={(value) => setPrecision(value as 'FP16' | 'FP32' | 'FP8')}>
              <SelectTrigger id="precision">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FP16">FP16 (Recommended)</SelectItem>
                <SelectItem value="FP32">FP32 (High Precision)</SelectItem>
                <SelectItem value="FP8">FP8 (Experimental)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {precision === 'FP16' && 'Balanced speed and quality'}
              {precision === 'FP32' && 'Maximum quality, slower generation'}
              {precision === 'FP8' && 'Fastest, experimental support'}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <Label htmlFor="steps" className="flex items-center gap-2">
              Generation Steps
              <TooltipInfo content="Number of denoising steps. More steps = better quality but slower generation. 20-30 is typical." />
            </Label>
            <Input
              id="steps"
              type="number"
              min={1}
              max={150}
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value) || 20)}
            />
            <p className="text-xs text-muted-foreground">
              Recommended: 20-30 steps for most use cases
            </p>
          </div>

          {/* Denoising Strength */}
          <div className="space-y-2">
            <Label htmlFor="denoisingStrength" className="flex items-center gap-2">
              Denoising Strength: {denoisingStrength.toFixed(2)}
              <TooltipInfo content="Controls how much the image is altered. 0.0 = no change, 1.0 = complete regeneration." />
            </Label>
            <Slider
              id="denoisingStrength"
              min={0}
              max={1}
              step={0.05}
              value={[denoisingStrength]}
              onValueChange={(value) => setDenoisingStrength(value[0])}
              className="py-4"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Subtle (0.0)</span>
              <span>Moderate (0.5)</span>
              <span>Strong (1.0)</span>
            </div>
          </div>

          <Separator />

          {/* Batch Size */}
          <div className="space-y-2">
            <Label htmlFor="batchSize" className="flex items-center gap-2">
              Batch Size
              <TooltipInfo content="Number of images to generate in a single batch. Higher values may be faster but use more VRAM." />
            </Label>
            <Input
              id="batchSize"
              type="number"
              min={1}
              max={10}
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Timeout */}
          <div className="space-y-2">
            <Label htmlFor="timeout" className="flex items-center gap-2">
              Timeout (ms)
              <TooltipInfo content="Maximum time to wait for generation to complete before timing out." />
            </Label>
            <Input
              id="timeout"
              type="number"
              min={10000}
              max={600000}
              step={10000}
              value={timeout}
              onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
            />
            <p className="text-xs text-muted-foreground">
              {(timeout / 1000).toFixed(0)} seconds
            </p>
          </div>

          {/* Max Concurrent Jobs */}
          <div className="space-y-2">
            <Label htmlFor="maxJobs" className="flex items-center gap-2">
              Max Concurrent Jobs
              <TooltipInfo content="Maximum number of generation jobs that can run simultaneously." />
            </Label>
            <Input
              id="maxJobs"
              type="number"
              min={1}
              max={5}
              value={maxJobs}
              onChange={(e) => setMaxJobs(parseInt(e.target.value) || 1)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        {/* Validation message */}
        {!isFormValid() && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Configuration incomplete</p>
              <p className="text-xs mt-1 opacity-90">
                {validateConfiguration() || 'Please fill in all required fields'}
              </p>
            </div>
          </div>
        )}

        {/* Connection test reminder */}
        {isFormValid() && connectionStatus.state !== 'success' && (
          <div className="flex items-start gap-2 p-3 rounded-lg text-sm bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>Please test the connection before saving to ensure your settings are correct.</p>
          </div>
        )}

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleSave} 
            disabled={!isFormValid() || isSaving || connectionStatus.state !== 'success'}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tooltip Info Component
// ============================================================================

interface TooltipInfoProps {
  content: string;
}

function TooltipInfo({ content }: TooltipInfoProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="text-muted-foreground hover:text-foreground"
        aria-label="More information"
      >
        <Info className="h-3 w-3" />
      </button>
      {isOpen && (
        <div className="absolute z-50 w-64 p-2 text-xs bg-popover text-popover-foreground border rounded-md shadow-md left-0 top-full mt-1">
          {content}
        </div>
      )}
    </div>
  );
}
