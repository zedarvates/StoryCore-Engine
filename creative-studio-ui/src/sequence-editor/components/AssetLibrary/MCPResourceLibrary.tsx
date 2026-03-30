import React, { useEffect, useState, useCallback } from 'react';
import { Box, Download, Search, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getComfyUIServersService } from '@/services/comfyuiServersService';
import { cn } from '@/lib/utils';

interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export function MCPResourceLibrary() {
  const [resources, setResources] = useState<Record<string, MCPResource[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const loadAllResources = useCallback(async () => {
    setLoading(true);
    const service = getComfyUIServersService();
    const servers = service.getAllServers().filter(s => s.authentication.type === 'mcp' && s.status === 'connected');
    
    if (servers.length === 0) {
      setResources({});
      setLoading(false);
      return;
    }

    const newResources: Record<string, MCPResource[]> = {};
    
    await Promise.all(servers.map(async (server) => {
      try {
        if (window.electronAPI?.comfyui?.listResources) {
          const result = await window.electronAPI.comfyui.listResources(server.id);
          newResources[server.name] = result || [];
        }
      } catch (error) {
        console.error(`Failed to load resources for ${server.name}:`, error);
      }
    }));

    setResources(newResources);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAllResources();
  }, [loadAllResources]);

  const handleImport = async (serverId: string, resourceUri: string) => {
    try {
      if (window.electronAPI?.comfyui?.readResource) {
        await window.electronAPI.comfyui.readResource(serverId, resourceUri);
        // Handle the imported resource (e.g., save to project assets)
        toast({
          title: 'Resource Imported',
          description: `Successfully imported from ${resourceUri}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Import Failed',
        description: String(error),
        variant: 'destructive',
      });
    }
  };

  const filteredServers = Object.entries(resources).map(([serverName, serverResources]) => {
    const filtered = serverResources.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    return { name: serverName, resources: filtered };
  }).filter(s => s.resources.length > 0);

  return (
    <div className="mcp-resource-library h-full flex flex-col">
      <div className="p-4 border-b border-border/50 bg-black/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Box className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Remote App Resources (MCP)</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={loadAllResources} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </Button>
      </div>

      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search remote resources..."
            className="pl-9 h-9 bg-accent/20"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-8">
          {filteredServers.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Box className="w-12 h-12 mx-auto mb-4" />
              <p className="text-sm">No remote resources found.</p>
              <p className="text-xs">Connect an MCP-enabled server to browse its direct assets.</p>
            </div>
          ) : (
            filteredServers.map((server) => (
              <div key={server.name} className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <div className="h-4 w-1 bg-primary rounded-full" />
                  <h4 className="text-xs font-bold text-white/60 uppercase tracking-widest">{server.name}</h4>
                  <Badge variant="outline" className="text-[9px] h-4 py-0">{server.resources.length}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {server.resources.map((resource) => (
                    <Card key={resource.uri} className="bg-accent/5 hover:bg-accent/10 border-border/40 transition-all group">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{resource.name}</p>
                            {resource.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                                {resource.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <code className="text-[9px] text-primary/70 truncate bg-primary/5 px-1 rounded">
                                {resource.uri}
                              </code>
                              {resource.mimeType && (
                                <Badge variant="secondary" className="text-[8px] h-3 py-0">
                                  {resource.mimeType.split('/').pop()}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="icon" 
                            variant="secondary" 
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const s = getComfyUIServersService().getAllServers().find(srv => srv.name === server.name);
                              if (s) handleImport(s.id, resource.uri);
                            }}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    />
  );
}
