/**
 * ComfyUI Server Modal Component
 * 
 * Modal for adding or editing a ComfyUI server
 */

import { useState, useEffect } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ComfyUIServer, CreateComfyUIServerInput } from '@/types/comfyuiServers';
import type { AuthenticationType } from '@/services/comfyuiService';

export interface ComfyUIServerModalProps {
  server?: ComfyUIServer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateComfyUIServerInput) => void;
}

export function ComfyUIServerModal({
  server,
  isOpen,
  onClose,
  onSave,
}: ComfyUIServerModalProps) {
  const isEditing = !!server;

  // Form state
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [authType, setAuthType] = useState<AuthenticationType>('none');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  
  // Advanced settings
  const [maxQueueSize, setMaxQueueSize] = useState(10);
  const [timeout, setTimeout] = useState(300000);
  const [vramLimit, setVramLimit] = useState<number | undefined>(undefined);
  const [modelsPath, setModelsPath] = useState('');
  const [workflowsPath, setWorkflowsPath] = useState('');
  const [autoStart, setAutoStart] = useState(false);
  const [corsHeaders, setCorsHeaders] = useState(false);

  // Performance settings
  const [batchSize, setBatchSize] = useState(1);
  const [precision, setPrecision] = useState<'FP16' | 'FP32' | 'FP8'>('FP16');
  const [steps, setSteps] = useState(20);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75);

  // Workflows
  const [imgGenWorkflow, setImgGenWorkflow] = useState('');
  const [vidGenWorkflow, setVidGenWorkflow] = useState('');
  const [upscaleWorkflow, setUpscaleWorkflow] = useState('');
  const [inpaintWorkflow, setInpaintWorkflow] = useState('');
  const [charGenWorkflow, setCharGenWorkflow] = useState('');

  // Models
  const [prefCheckpoint, setPrefCheckpoint] = useState('');
  const [prefVAE, setPrefVAE] = useState('');
  const [prefCLIP, setPrefCLIP] = useState('');

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load server data when editing
  useEffect(() => {
    const initializeForm = () => {
      if (server) {
        setName(server.name);
        setServerUrl(server.serverUrl);
        setAuthType(server.authentication.type);
        setUsername(server.authentication.username || '');
        setPassword(server.authentication.password || '');
        setToken(server.authentication.token || '');
        setMaxQueueSize(server.maxQueueSize || 10);
        setTimeout(server.timeout || 300000);
        setVramLimit(server.vramLimit);
        setModelsPath(server.modelsPath || '');
        setWorkflowsPath(server.workflowsPath || '');
        setAutoStart(server.autoStart || false);
        setCorsHeaders(server.corsHeaders || false);
        
        // Load performance
        setBatchSize(server.performance?.batchSize || 1);
        setPrecision(server.performance?.precision || 'FP16');
        setSteps(server.performance?.steps || 20);
        setDenoisingStrength(server.performance?.denoisingStrength || 0.75);
        
        // Load workflows
        setImgGenWorkflow(server.workflows?.imageGeneration || '');
        setVidGenWorkflow(server.workflows?.videoGeneration || '');
        setUpscaleWorkflow(server.workflows?.upscaling || '');
        setInpaintWorkflow(server.workflows?.inpainting || '');
        setCharGenWorkflow(server.workflows?.characterGeneration || '');
        
        // Load models
        setPrefCheckpoint(server.models?.preferredCheckpoint || '');
        setPrefVAE(server.models?.preferredVAE || '');
        setPrefCLIP(server.models?.preferredCLIP || '');
      } else {
        // Reset form for new server
        setName('');
        setServerUrl('http://127.0.0.1:8000');
        setAuthType('none');
        setUsername('');
        setPassword('');
        setToken('');
        setMaxQueueSize(10);
        setTimeout(300000);
        setVramLimit(undefined);
        setModelsPath('');
        setWorkflowsPath('');
        setAutoStart(false);
        setCorsHeaders(false);
        setBatchSize(1);
        setPrecision('FP16');
        setSteps(20);
        setDenoisingStrength(0.75);
        setImgGenWorkflow('');
        setVidGenWorkflow('');
        setUpscaleWorkflow('');
        setInpaintWorkflow('');
        setCharGenWorkflow('');
        setPrefCheckpoint('');
        setPrefVAE('');
        setPrefCLIP('');
      }
      setErrors({});
    };

    if (isOpen) {
      initializeForm();
    }
  }, [server, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Server name is required';
    }

    if (!serverUrl.trim()) {
      newErrors.serverUrl = 'Server URL is required';
    } else {
      try {
        const url = new URL(serverUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          newErrors.serverUrl = 'URL must use HTTP or HTTPS protocol';
        }
      } catch {
        newErrors.serverUrl = 'Invalid URL format';
      }
    }

    if (authType === 'basic') {
      if (!username.trim()) {
        newErrors.username = 'Username is required for Basic auth';
      }
      if (!password.trim()) {
        newErrors.password = 'Password is required for Basic auth';
      }
    }

    if ((authType === 'bearer' || authType === 'api-key') && !token.trim()) {
      newErrors.token = 'Token is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const input: CreateComfyUIServerInput = {
      name: name.trim(),
      serverUrl: serverUrl.trim(),
      authentication: {
        type: authType,
        ...(authType === 'basic' && { username, password }),
        ...(authType === 'bearer' && { token }),
        ...(authType === 'api-key' && { token }),
      },
      maxQueueSize,
      timeout,
      vramLimit,
      modelsPath: modelsPath.trim() || undefined,
      workflowsPath: workflowsPath.trim() || undefined,
      autoStart,
      corsHeaders,
      performance: {
        batchSize,
        precision,
        steps,
        denoisingStrength,
      },
      workflows: {
        imageGeneration: imgGenWorkflow || undefined,
        videoGeneration: vidGenWorkflow || undefined,
        upscaling: upscaleWorkflow || undefined,
        inpainting: inpaintWorkflow || undefined,
        characterGeneration: charGenWorkflow || undefined,
      },
      models: {
        preferredCheckpoint: prefCheckpoint || undefined,
        preferredVAE: prefVAE || undefined,
        preferredCLIP: prefCLIP || undefined,
      },
    };

    onSave(input);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit ComfyUI Server' : 'Add ComfyUI Server'}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="auth">Auth</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
            </TabsList>

            {/* General Tab */}
            <TabsContent value="general" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Server Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Local Dev, Production, GPU Server 1"
                  className={cn(errors.name && 'border-destructive')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="serverUrl">
                  Server URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serverUrl"
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://127.0.0.1:8000"
                  className={cn(errors.serverUrl && 'border-destructive')}
                />
                {errors.serverUrl && (
                  <p className="text-sm text-destructive">{errors.serverUrl}</p>
                )}
              </div>
            </TabsContent>

            {/* Auth Tab */}
            <TabsContent value="auth" className="space-y-4 pt-4">
              <div className="space-y-3">
                <Label>Authentication Method</Label>
                <RadioGroup value={authType} onValueChange={(value) => setAuthType(value as AuthenticationType)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="auth-none" />
                    <Label htmlFor="auth-none" className="font-normal cursor-pointer">None</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="basic" id="auth-basic" />
                    <Label htmlFor="auth-basic" className="font-normal cursor-pointer">Basic (Username/Password)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bearer" id="auth-bearer" />
                    <Label htmlFor="auth-bearer" className="font-normal cursor-pointer">Bearer Token</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="api-key" id="auth-api-key" />
                    <Label htmlFor="auth-api-key" className="font-normal cursor-pointer">API Key</Label>
                  </div>
                </RadioGroup>

                {authType === 'basic' && (
                  <div className="space-y-3 mt-4 border-t pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={cn(errors.username && 'border-destructive')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {(authType === 'bearer' || authType === 'api-key') && (
                  <div className="space-y-2 mt-4 border-t pt-4">
                    <Label htmlFor="token">Token / key</Label>
                    <div className="relative">
                      <Input
                        id="token"
                        type={showToken ? 'text' : 'password'}
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowToken(!showToken)}
                      >
                        {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Performance Tab */}
            <TabsContent value="performance" className="space-y-6 pt-4">
              <div className="space-y-3">
                <Label htmlFor="batchSize">Batch Size: {batchSize}</Label>
                <Slider
                  id="batchSize"
                  min={1}
                  max={10}
                  step={1}
                  value={[batchSize]}
                  onValueChange={([value]) => setBatchSize(value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precision">Computation Precision</Label>
                <Select value={precision} onValueChange={(val: 'FP16' | 'FP32' | 'FP8') => setPrecision(val)}>
                  <SelectTrigger id="precision">
                    <SelectValue placeholder="Select precision" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FP16">FP16 (Recommended for RTX)</SelectItem>
                    <SelectItem value="FP32">FP32 (High Quality/Legacy)</SelectItem>
                    <SelectItem value="FP8">FP8 (Low VRAM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="steps">Default Generation Steps: {steps}</Label>
                <Slider
                  id="steps"
                  min={1}
                  max={100}
                  step={1}
                  value={[steps]}
                  onValueChange={([value]) => setSteps(value)}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="denoisingStrength">Denoising Strength: {denoisingStrength.toFixed(2)}</Label>
                <Slider
                  id="denoisingStrength"
                  min={0}
                  max={1}
                  step={0.05}
                  value={[denoisingStrength]}
                  onValueChange={([value]) => setDenoisingStrength(value)}
                />
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-6 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoStart" className="text-sm">Auto-start</Label>
                    <p className="text-[10px] text-muted-foreground">Experiment</p>
                  </div>
                  <Switch
                    id="autoStart"
                    checked={autoStart}
                    onCheckedChange={setAutoStart}
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="corsHeaders" className="text-sm">CORS Headers</Label>
                    <p className="text-[10px] text-muted-foreground">Force enable</p>
                  </div>
                  <Switch
                    id="corsHeaders"
                    checked={corsHeaders}
                    onCheckedChange={setCorsHeaders}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="maxQueueSize">Max Queue Size: {maxQueueSize} jobs</Label>
                <Slider
                  id="maxQueueSize"
                  min={1}
                  max={50}
                  step={1}
                  value={[maxQueueSize]}
                  onValueChange={([value]) => setMaxQueueSize(value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vramLimit">VRAM Limit (GB)</Label>
                  <Input
                    id="vramLimit"
                    type="number"
                    value={vramLimit || ''}
                    onChange={(e) => setVramLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Auto"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelsPath">Models Path</Label>
                <Input
                  id="modelsPath"
                  value={modelsPath}
                  onChange={(e) => setModelsPath(e.target.value)}
                  placeholder="/path/to/ComfyUI/models"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="workflowsPath">Workflows Path</Label>
                <Input
                  id="workflowsPath"
                  value={workflowsPath}
                  onChange={(e) => setWorkflowsPath(e.target.value)}
                  placeholder="/path/to/ComfyUI/workflows"
                />
              </div>
            </TabsContent>

            {/* Workflows & Models Tab */}
            <TabsContent value="workflows" className="space-y-6 pt-4">
              {server?.serverInfo ? (
                <>
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium border-b pb-2">Workflow Preferences</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Image Generation</Label>
                        <Select value={imgGenWorkflow} onValueChange={setImgGenWorkflow}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Internal</SelectItem>
                            {server.serverInfo.availableWorkflows
                              .filter(w => w.type === 'image')
                              .map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Video Generation</Label>
                        <Select value={vidGenWorkflow} onValueChange={setVidGenWorkflow}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Internal</SelectItem>
                            {server.serverInfo.availableWorkflows
                              .filter(w => w.type === 'video')
                              .map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Upscaling</Label>
                        <Select value={upscaleWorkflow} onValueChange={setUpscaleWorkflow}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Internal</SelectItem>
                            {server.serverInfo.availableWorkflows
                              .filter(w => w.type === 'upscale')
                              .map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Inpainting</Label>
                        <Select value={inpaintWorkflow} onValueChange={setInpaintWorkflow}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Internal</SelectItem>
                            {server.serverInfo.availableWorkflows
                              .filter(w => w.type === 'inpaint')
                              .map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Character Casting</Label>
                        <Select value={charGenWorkflow} onValueChange={setCharGenWorkflow}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select workflow..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Default Internal</SelectItem>
                            {server.serverInfo.availableWorkflows
                              .filter(w => w.type === 'image')
                              .map(w => (
                                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className="text-sm font-medium border-b pb-2">Model Preferences</h3>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Preferred Checkpoint</Label>
                        <Select value={prefCheckpoint} onValueChange={setPrefCheckpoint}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select checkpoint..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect</SelectItem>
                            {server.serverInfo.availableModels
                              .filter(m => m.type === 'checkpoint')
                              .map(m => (
                                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Preferred VAE</Label>
                        <Select value={prefVAE} onValueChange={setPrefVAE}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select VAE..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect</SelectItem>
                            {server.serverInfo.availableModels
                              .filter(m => m.type === 'vae')
                              .map(m => (
                                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 border-2 border-dashed rounded-lg">
                  <div className="bg-muted p-3 rounded-full">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium">No Capability Data</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px]">
                      Test the connection to this server to discover available workflows and models.
                    </p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEditing ? 'Save Changes' : 'Add Server'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
