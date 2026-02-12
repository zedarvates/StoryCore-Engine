// ============================================================================
// MCP Settings Component
// ============================================================================

import React, { useState } from 'react';
import { useMCPAddon, useMCPError } from './hooks';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Trash2, 
  Plus, 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Server,
  Globe,
  Key,
  Timer,
  RefreshCw,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

// Server validation schema
const serverSchema = z.object({
  name: z.string().min(1, 'Server name is required').max(100, 'Server name is too long'),
  endpoint: z.string().url('Please enter a valid URL'),
  apiKey: z.string().optional(),
  timeout: z.number().min(1000, 'Timeout must be at least 1000ms').max(300000, 'Timeout must be less than 300000ms'),
  maxRetries: z.number().min(0, 'Max retries must be at least 0').max(10, 'Max retries must be less than 10'),
  enabled: z.boolean(),
});

type ServerFormData = z.infer<typeof serverSchema>;

interface MCPSettingsProps {
  className?: string;
}

export function MCPSettings({ className }: MCPSettingsProps) {
  const { 
    addon, 
    isLoading, 
    error, 
    enable, 
    disable, 
    updateConfig,
    servers,
    selectedServer,
    addServer,
    updateServer,
    removeServer,
    testServer,
    setSelectedServer,
  } = useMCPAddon();
  
  const { clearError } = useMCPError();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: '',
      endpoint: '',
      apiKey: '',
      timeout: 30000,
      maxRetries: 3,
      enabled: true,
    },
  });

  const handleSubmit = async (data: ServerFormData) => {
    try {
      if (editingServer) {
        await updateServer(editingServer.id, data);
      } else {
        await addServer(data);
      }
      setIsDialogOpen(false);
      setEditingServer(null);
      form.reset();
    } catch (error) {
      console.error('Failed to save server:', error);
    }
  };

  const handleEdit = (server: MCPServerConfig) => {
    setEditingServer(server);
    form.reset({
      name: server.name,
      endpoint: server.endpoint,
      apiKey: server.apiKey || '',
      timeout: server.timeout,
      maxRetries: server.maxRetries,
      enabled: server.enabled,
    });
    setIsDialogOpen(true);
  };

  const handleTest = async (serverId: string) => {
    setIsTesting(serverId);
    try {
      await testServer(serverId);
    } catch (error) {
      console.error('Failed to test server:', error);
    } finally {
      setIsTesting(null);
    }
  };

  const handleRemove = async (serverId: string) => {
    if (window.confirm('Are you sure you want to remove this server?')) {
      try {
        await removeServer(serverId);
      } catch (error) {
        console.error('Failed to remove server:', error);
      }
    }
  };

  const handleConfigChange = (key: string, value: unknown) => {
    updateConfig({ [key]: value });
  };

  const getStatusIcon = (status: MCPServerConfig['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: MCPServerConfig['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connecting':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Addon Toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              MCP Server Integration
            </CardTitle>
            <CardDescription>
              Enable Model Context Protocol server integration for enhanced AI capabilities
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={addon.enabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  enable();
                } else {
                  disable();
                }
              }}
              disabled={isLoading}
            />
            <Badge variant={addon.enabled ? 'default' : 'secondary'}>
              {addon.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Version:</span> {addon.version}
            </div>
            <div>
              <span className="font-medium">Author:</span> {addon.author}
            </div>
            <div>
              <span className="font-medium">Category:</span> {addon.metadata.category}
            </div>
            <div>
              <span className="font-medium">Last Updated:</span>{' '}
              {new Date(addon.metadata.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-800">
            {error}
            <button
              onClick={clearError}
              className="ml-2 underline text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* Server Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Servers</CardTitle>
              <CardDescription>
                Manage your MCP server connections
              </CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Server
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingServer ? 'Edit Server' : 'Add Server'}
                  </DialogTitle>
                  <DialogDescription>
                    Configure a new MCP server connection
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server Name</FormLabel>
                          <FormControl>
                            <Input placeholder="My MCP Server" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endpoint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endpoint URL</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="https://api.example.com/mcp" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            The URL of your MCP server endpoint
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="apiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter API key" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Authentication key for the MCP server
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="timeout"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Timeout (ms)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="maxRetries"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Retries</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="enabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Enabled</FormLabel>
                            <FormDescription>
                              Enable or disable this server connection
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsDialogOpen(false);
                          setEditingServer(null);
                          form.reset();
                        }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isLoading}>
                        {editingServer ? 'Update' : 'Add'} Server
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {servers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Server className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No servers configured</p>
              <p className="text-sm">Add your first MCP server to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {servers.map((server) => (
                <div
                  key={server.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    selectedServer === server.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(server.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{server.name}</h4>
                        <Badge className={getStatusColor(server.status)}>
                          {server.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {server.endpoint}
                        </span>
                        {server.apiKey && (
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3" />
                            ••••••••
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Timer className="h-3 w-3" />
                          {server.timeout}ms
                        </span>
                      </div>
                      {server.errorMessage && (
                        <p className="text-sm text-red-600 mt-1">
                          {server.errorMessage}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTest(server.id)}
                      disabled={isTesting === server.id || isLoading}
                    >
                      {isTesting === server.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(server)}
                      disabled={isLoading}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(server.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      {addon.enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>
              Advanced settings for MCP integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultTimeout">Default Timeout</Label>
                <Input
                  id="defaultTimeout"
                  type="number"
                  value={addon.config.defaultTimeout || 30000}
                  onChange={(e) => handleConfigChange('defaultTimeout', Number(e.target.value))}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="maxConcurrent">Max Concurrent Requests</Label>
                <Input
                  id="maxConcurrent"
                  type="number"
                  value={addon.config.maxConcurrent || 5}
                  onChange={(e) => handleConfigChange('maxConcurrent', Number(e.target.value))}
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
              <Input
                id="retryDelay"
                type="number"
                value={addon.config.retryDelay || 1000}
                onChange={(e) => handleConfigChange('retryDelay', Number(e.target.value))}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="logLevel">Log Level</Label>
              <Select
                value={addon.config.logLevel || 'info'}
                onValueChange={(value) => handleConfigChange('logLevel', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select log level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
