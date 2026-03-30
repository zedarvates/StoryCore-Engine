import React from 'react';
import { Search, Plus, Server, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DiscoveredServer } from '@/types/comfyuiServers';

interface DiscoveredServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: DiscoveredServer[];
  onAdd: (server: DiscoveredServer) => void;
  isScanning: boolean;
}

export function DiscoveredServersModal({
  isOpen,
  onClose,
  servers,
  onAdd,
  isScanning
}: DiscoveredServersModalProps) {
  const [addedUrls, setAddedUrls] = React.useState<Set<string>>(new Set());

  const handleAdd = (server: DiscoveredServer) => {
    onAdd(server);
    setAddedUrls(prev => new Set(prev).add(server.url));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <DialogTitle>Network Discovery</DialogTitle>
          </div>
          <DialogDescription>
            Scanning your local network for ComfyUI and MCP servers.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Scanning local network...</p>
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">No servers found on the local network.</p>
              <p className="text-xs text-muted-foreground mt-1">Make sure your servers are running and accessible.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3">
                {servers.map((server, index) => (
                  <div 
                    key={`${server.url}-${index}`}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <Server className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{server.name || 'Unknown Server'}</p>
                        <p className="text-xs text-muted-foreground truncate">{server.url}</p>
                        <div className="flex gap-1 mt-1">
                          <Badge variant={server.type === 'mcp' ? 'secondary' : 'outline'} className="text-[10px] py-0">
                            {server.type.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0 text-green-500 border-green-500/20">
                            ONLINE
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant={addedUrls.has(server.url) ? "ghost" : "outline"}
                      onClick={() => handleAdd(server)}
                      disabled={addedUrls.has(server.url)}
                    >
                      {addedUrls.has(server.url) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
