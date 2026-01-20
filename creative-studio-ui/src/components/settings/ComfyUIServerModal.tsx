/**
 * ComfyUI Server Modal Component
 * 
 * Modal for adding or editing a ComfyUI server
 */

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxQueueSize, setMaxQueueSize] = useState(10);
  const [timeout, setTimeout] = useState(300000);
  const [vramLimit, setVramLimit] = useState<number | undefined>(undefined);
  const [modelsPath, setModelsPath] = useState('');
  const [autoStart, setAutoStart] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load server data when editing
  useEffect(() => {
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
      setAutoStart(server.autoStart || false);
    } else {
      // Reset form for new server
      setName('');
      setServerUrl('http://localhost:8188');
      setAuthType('none');
      setUsername('');
      setPassword('');
      setToken('');
      setMaxQueueSize(10);
      setTimeout(300000);
      setVramLimit(undefined);
      setModelsPath('');
      setAutoStart(false);
    }
    setErrors({});
    setShowAdvanced(false);
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
      autoStart,
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

        <div className="space-y-4 py-4">
          {/* Server Name */}
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

          {/* Server URL */}
          <div className="space-y-2">
            <Label htmlFor="serverUrl">
              Server URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="serverUrl"
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://localhost:8188"
              className={cn(errors.serverUrl && 'border-destructive')}
            />
            {errors.serverUrl && (
              <p className="text-sm text-destructive">{errors.serverUrl}</p>
            )}
          </div>

          {/* Authentication */}
          <div className="space-y-3">
            <Label>Authentication</Label>
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

            {/* Basic Auth Fields */}
            {authType === 'basic' && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={cn(errors.username && 'border-destructive')}
                  />
                  {errors.username && (
                    <p className="text-sm text-destructive">{errors.username}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={cn(errors.password && 'border-destructive')}
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
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
              </div>
            )}

            {/* Token Fields */}
            {(authType === 'bearer' || authType === 'api-key') && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="token">Token</Label>
                <div className="relative">
                  <Input
                    id="token"
                    type={showToken ? 'text' : 'password'}
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className={cn(errors.token && 'border-destructive')}
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
                {errors.token && (
                  <p className="text-sm text-destructive">{errors.token}</p>
                )}
              </div>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-start"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Settings
            </Button>

            {showAdvanced && (
              <div className="space-y-4 pl-6">
                {/* Auto-start */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="autoStart">Auto-start ComfyUI</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically start server when application launches
                    </p>
                  </div>
                  <Switch
                    id="autoStart"
                    checked={autoStart}
                    onCheckedChange={setAutoStart}
                  />
                </div>

                {/* Max Queue Size */}
                <div className="space-y-2">
                  <Label htmlFor="maxQueueSize">Max Queue Size: {maxQueueSize}</Label>
                  <Slider
                    id="maxQueueSize"
                    min={1}
                    max={50}
                    step={1}
                    value={[maxQueueSize]}
                    onValueChange={([value]) => setMaxQueueSize(value)}
                  />
                </div>

                {/* Timeout */}
                <div className="space-y-2">
                  <Label htmlFor="timeout">Request Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeout(parseInt(e.target.value) || 300000)}
                    min={1000}
                    step={1000}
                  />
                </div>

                {/* VRAM Limit */}
                <div className="space-y-2">
                  <Label htmlFor="vramLimit">VRAM Limit (GB)</Label>
                  <Input
                    id="vramLimit"
                    type="number"
                    value={vramLimit || ''}
                    onChange={(e) => setVramLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Leave empty for auto-detect"
                    min={1}
                  />
                </div>

                {/* Models Path */}
                <div className="space-y-2">
                  <Label htmlFor="modelsPath">Models Path</Label>
                  <Input
                    id="modelsPath"
                    value={modelsPath}
                    onChange={(e) => setModelsPath(e.target.value)}
                    placeholder="/path/to/ComfyUI/models"
                  />
                </div>
              </div>
            )}
          </div>
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
