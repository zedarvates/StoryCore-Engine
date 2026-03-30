import React, { useEffect, useState, useCallback } from 'react';
import { Box, Wrench, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

interface RunResult {
  success: boolean;
  data?: unknown;
  error?: string;
}


interface MCPToolsViewerProps {
  serverId: string;
  serverName: string;
  trigger?: React.ReactNode;
}

export function MCPToolsViewer({ serverId, serverName, trigger }: MCPToolsViewerProps) {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [runningTool, setRunningTool] = useState<string | null>(null);
  const [toolArgs, setToolArgs] = useState<string>('{}');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const { toast } = useToast();

  const loadTools = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electronAPI?.comfyui?.listTools) {
        const result = await window.electronAPI.comfyui.listTools(serverId);
        setTools(result || []);
      }
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load MCP tools for this server.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [serverId, toast]);

  useEffect(() => {
    if (isOpen) {
      loadTools();
      setRunningTool(null);
      setResult(null);
    }
  }, [isOpen, loadTools]);

  const handleRunTool = async (name: string) => {
    if (!window.electronAPI?.comfyui?.callTool) return;
    setIsExecuting(true);
    setResult(null);
    try {
      let args = {};
      try {
        args = JSON.parse(toolArgs);
      } catch (_e) {
        toast({ title: 'Error', description: 'Invalid JSON arguments', variant: 'destructive' });
        setIsExecuting(false);
        return;
      }

      const response = await window.electronAPI.comfyui.callTool(serverId, name, args);
      setResult({ success: true, data: response });
      toast({ title: 'Success', description: `Tool ${name} executed.` });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Execution failed';
      setResult({ success: false, error: errorMessage });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Wrench className="h-4 w-4" />
            View MCP Tools
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Box className="h-5 w-5 text-primary" />
            <DialogTitle>MCP Tools: {serverName}</DialogTitle>
          </div>
          <DialogDescription>
            Available Model Context Protocol tools exposed by this server.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4">
          {runningTool ? (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={() => setRunningTool(null)} className="mb-2">
                ← Back to tools
              </Button>
              <div className="p-4 border rounded-lg bg-accent/5">
                <h4 className="font-bold text-primary mb-2">Running: {runningTool}</h4>
                <div className="space-y-2">
                  <Label>JSON Arguments</Label>
                  <Textarea 
                    className="font-mono text-xs min-h-[100px]" 
                    value={toolArgs} 
                    onChange={(e) => setToolArgs(e.target.value)}
                  />
                </div>
                <Button 
                  className="mt-4 w-full" 
                  onClick={() => handleRunTool(runningTool)}
                  disabled={isExecuting}
                >
                  {isExecuting ? 'Executing...' : 'Run Tool'}
                </Button>
              </div>

              {result && (
                <div className={cn(
                  "p-4 border rounded-lg text-xs font-mono overflow-auto max-h-[200px]",
                  result.success ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"
                )}>
                  <p className="font-bold mb-2">{result.success ? 'Success!' : 'Error:'}</p>
                  <pre>{JSON.stringify(result.success ? result.data : result.error, null, 2)}</pre>
                </div>
              )}
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground animate-pulse">Fetching tools from server...</p>
            </div>
          ) : tools.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Wrench className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-sm text-muted-foreground">No tools exposed by this MCP server.</p>
            </div>
          ) : (
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {tools.map((tool) => (
                  <Card key={tool.name} className="overflow-hidden border-border/50 bg-accent/5 hover:bg-accent/10 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                              {tool.name}
                            </code>
                            <Badge variant="outline" className="text-[10px] h-4">TOOL</Badge>
                          </div>
                          {tool.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {tool.description}
                            </p>
                          )}
                          
                          {tool.inputSchema && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Schema</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.keys(tool.inputSchema.properties || {}).map(prop => (
                                  <Badge key={prop} variant="secondary" className="text-[9px] py-0 h-4">
                                    {prop}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 rounded-full" 
                          onClick={() => {
                            setRunningTool(tool.name);
                            setToolArgs(JSON.stringify(
                              Object.keys(tool.inputSchema?.properties || {}).reduce((acc: Record<string, unknown>, key) => {
                                acc[key] = "";
                                return acc;
                              }, {}), 
                              null, 
                              2
                            ));
                          }}
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>


        <div className="flex justify-end pt-4 border-t">
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
