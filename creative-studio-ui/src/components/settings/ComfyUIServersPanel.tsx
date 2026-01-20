/**
 * ComfyUI Servers Panel Component
 * 
 * Main panel for managing multiple ComfyUI servers
 */

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Download, Upload, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ComfyUIServerCard } from './ComfyUIServerCard';
import { ComfyUIServerModal } from './ComfyUIServerModal';
import { getComfyUIServersService } from '@/services/comfyuiServersService';
import type { ComfyUIServer, CreateComfyUIServerInput } from '@/types/comfyuiServers';
import { useToast } from '@/hooks/use-toast';

export interface ComfyUIServersPanelProps {
  className?: string;
}

export function ComfyUIServersPanel({ className }: ComfyUIServersPanelProps) {
  const service = getComfyUIServersService();
  const { toast } = useToast();

  // State
  const [servers, setServers] = useState<ComfyUIServer[]>([]);
  const [activeServerId, setActiveServerId] = useState<string | null>(null);
  const [autoSwitch, setAutoSwitch] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingServer, setEditingServer] = useState<ComfyUIServer | null>(null);
  const [isTestingAll, setIsTestingAll] = useState(false);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = () => {
    setServers(service.getAllServers());
    setActiveServerId(service.getActiveServerId());
    setAutoSwitch(service.getAutoSwitchOnFailure());
  };

  const handleAddServer = (input: CreateComfyUIServerInput) => {
    try {
      service.addServer(input);
      loadServers();
      toast({
        title: 'Server Added',
        description: `${input.name} has been added successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add server. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEditServer = (input: CreateComfyUIServerInput) => {
    if (!editingServer) return;

    try {
      service.updateServer(editingServer.id, input);
      loadServers();
      toast({
        title: 'Server Updated',
        description: `${input.name} has been updated successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update server. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteServer = (id: string) => {
    const server = service.getServer(id);
    if (!server) return;

    if (confirm(`Are you sure you want to delete "${server.name}"?`)) {
      try {
        service.deleteServer(id);
        loadServers();
        toast({
          title: 'Server Deleted',
          description: `${server.name} has been deleted.`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete server. Please try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleSetActive = (id: string) => {
    try {
      service.setActiveServer(id);
      loadServers();
      const server = service.getServer(id);
      toast({
        title: 'Active Server Changed',
        description: `${server?.name} is now the active server.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to set active server. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTestServer = async (id: string) => {
    try {
      const success = await service.testServer(id);
      loadServers();
      
      const server = service.getServer(id);
      if (success) {
        toast({
          title: 'Connection Successful',
          description: `Successfully connected to ${server?.name}.`,
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: `Failed to connect to ${server?.name}.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleTestAll = async () => {
    setIsTestingAll(true);
    try {
      const results = await service.testAllServers();
      loadServers();
      
      const successCount = Array.from(results.values()).filter(Boolean).length;
      toast({
        title: 'Connection Tests Complete',
        description: `${successCount} of ${results.size} servers connected successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to test connections. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTestingAll(false);
    }
  };

  const handleAutoSwitchChange = (enabled: boolean) => {
    service.setAutoSwitchOnFailure(enabled);
    setAutoSwitch(enabled);
    toast({
      title: 'Auto-Switch Updated',
      description: `Auto-switch on failure is now ${enabled ? 'enabled' : 'disabled'}.`,
    });
  };

  const handleExport = () => {
    try {
      const config = service.exportConfig();
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comfyui-servers-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Configuration Exported',
        description: 'Server configuration has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export configuration.',
        variant: 'destructive',
      });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const success = service.importConfig(text);
        
        if (success) {
          loadServers();
          toast({
            title: 'Configuration Imported',
            description: 'Server configuration has been imported successfully.',
          });
        } else {
          toast({
            title: 'Import Failed',
            description: 'Invalid configuration file.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to import configuration.',
          variant: 'destructive',
        });
      }
    };
    
    input.click();
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ComfyUI Servers</CardTitle>
              <CardDescription>
                Manage multiple ComfyUI server connections
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestAll}
                disabled={isTestingAll || servers.length === 0}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isTestingAll ? 'animate-spin' : ''}`} />
                Test All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={servers.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import
              </Button>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Server
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Auto-Switch Setting */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="autoSwitch">Auto-switch on Failure</Label>
              <p className="text-sm text-muted-foreground">
                Automatically switch to another server if the active one fails
              </p>
            </div>
            <Switch
              id="autoSwitch"
              checked={autoSwitch}
              onCheckedChange={handleAutoSwitchChange}
            />
          </div>

          {/* Server List */}
          {servers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No servers configured. Click "Add Server" to get started.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {servers.map((server) => (
                <ComfyUIServerCard
                  key={server.id}
                  server={server}
                  isActive={server.id === activeServerId}
                  onSetActive={() => handleSetActive(server.id)}
                  onEdit={() => setEditingServer(server)}
                  onDelete={() => handleDeleteServer(server.id)}
                  onTest={() => handleTestServer(server.id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <ComfyUIServerModal
        server={editingServer}
        isOpen={showAddModal || !!editingServer}
        onClose={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
        onSave={editingServer ? handleEditServer : handleAddServer}
      />
    </div>
  );
}
