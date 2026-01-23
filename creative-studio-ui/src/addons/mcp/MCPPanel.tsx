// ============================================================================
// MCP Panel Component
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
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Settings, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Server,
  Globe,
  Activity,
  Zap,
  Shield,
  Database,
  MessageSquare,
  BarChart3,
  Info,
} from 'lucide-react';

interface MCPPanelProps {
  className?: string;
}

export function MCPPanel({ className }: MCPPanelProps) {
  const { 
    addon, 
    isLoading, 
    error, 
    enable, 
    disable,
    servers,
    selectedServer,
    testServer,
    setSelectedServer,
  } = useMCPAddon();
  
  const { clearError } = useMCPError();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTestingServer, setIsTestingServer] = useState<string | null>(null);

  const handleTestServer = async (serverId: string) => {
    setIsTestingServer(serverId);
    try {
      await testServer(serverId);
    } catch (error) {
      console.error('Failed to test server:', error);
    } finally {
      setIsTestingServer(null);
    }
  };

  const getStatusIcon = (status: MCPServerConfig['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'connecting':
        return <Activity className="h-4 w-4 text-blue-500 animate-pulse" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: MCPServerConfig['status']) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'connecting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const connectedServers = servers.filter(s => s.status === 'connected');
  const totalRequests = connectedServers.length * 100; // Mock data
  const avgLatency = connectedServers.length > 0 
    ? Math.round(connectedServers.reduce((sum, s) => sum + (s.lastConnected ? 50 : 0), 0) / connectedServers.length)
    : 0;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6" />
            MCP Server Integration
          </h2>
          <p className="text-gray-600">
            Model Context Protocol server management
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>MCP Server Settings</DialogTitle>
                <DialogDescription>
                  Configure your MCP server connections and integration settings
                </DialogDescription>
              </DialogHeader>
              <MCPSettingsContent />
            </DialogContent>
          </Dialog>
        </div>
      </div>

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

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="servers" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            Servers
          </TabsTrigger>
          <TabsTrigger value="capabilities" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Capabilities
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Addon Status</CardTitle>
                {addon.enabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{addon.enabled ? 'Enabled' : 'Disabled'}</div>
                <p className="text-xs text-gray-600">
                  MCP Server Integration
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Servers</CardTitle>
                <Server className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{servers.length}</div>
                <p className="text-xs text-gray-600">
                  {connectedServers.length} connected
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalRequests}</div>
                <p className="text-xs text-gray-600">
                  Last 24 hours
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
                <Zap className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgLatency}ms</div>
                <p className="text-xs text-gray-600">
                  Across all servers
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Addon Control */}
          <Card>
            <CardHeader>
              <CardTitle>Addon Control</CardTitle>
              <CardDescription>
                Enable or disable the MCP server integration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">MCP Server Integration</h4>
                  <p className="text-sm text-gray-600">
                    {addon.enabled 
                      ? 'Integration is active and processing requests' 
                      : 'Integration is disabled. Enable to start using MCP servers.'
                    }
                  </p>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Servers Tab */}
        <TabsContent value="servers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Connections</CardTitle>
              <CardDescription>
                Manage your MCP server connections and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Server className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No servers configured</p>
                  <p className="text-sm">Go to Settings to add your first MCP server</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {servers.map((server) => (
                    <div
                      key={server.id}
                      className={`p-4 border rounded-lg ${getStatusColor(server.status)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(server.status)}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{server.name}</h4>
                              <Badge variant="outline">
                                {server.endpoint}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-4 mt-1">
                              <span>Timeout: {server.timeout}ms</span>
                              <span>Retries: {server.maxRetries}</span>
                              {server.lastConnected && (
                                <span>
                                  Last connected: {new Date(server.lastConnected).toLocaleString()}
                                </span>
                              )}
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
                            onClick={() => handleTestServer(server.id)}
                            disabled={isTestingServer === server.id || isLoading}
                          >
                            {isTestingServer === server.id ? (
                              <Activity className="h-4 w-4 animate-spin" />
                            ) : (
                              <Activity className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capabilities Tab */}
        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Capabilities</CardTitle>
              <CardDescription>
                Available features and capabilities from connected MCP servers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-blue-500" />
                    <h4 className="font-medium">Text Processing</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Natural language understanding, text generation, and content analysis
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Database className="h-5 w-5 text-green-500" />
                    <h4 className="font-medium">Data Management</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Database operations, data storage, and retrieval capabilities
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Shield className="h-5 w-5 text-purple-500" />
                    <h4 className="font-medium">Security</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Authentication, authorization, and data protection features
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                    <h4 className="font-medium">Performance</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    High-speed processing, caching, and optimization features
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Performance metrics and usage statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalRequests}</div>
                  <div className="text-sm text-gray-600">Total Requests</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{avgLatency}ms</div>
                  <div className="text-sm text-gray-600">Average Latency</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{connectedServers.length}</div>
                  <div className="text-sm text-gray-600">Active Servers</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper component for settings content
function MCPSettingsContent() {
  return (
    <div className="space-y-6">
      <p>Settings content would be implemented here with forms and configuration options.</p>
    </div>
  );
}