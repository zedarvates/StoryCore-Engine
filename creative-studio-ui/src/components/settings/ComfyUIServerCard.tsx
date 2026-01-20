/**
 * ComfyUI Server Card Component
 * 
 * Displays a single ComfyUI server with status and actions
 */

import { useState } from 'react';
import { Server, Check, AlertCircle, Loader2, Edit, Trash2, Radio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ComfyUIServer } from '@/types/comfyuiServers';

export interface ComfyUIServerCardProps {
  server: ComfyUIServer;
  isActive: boolean;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => Promise<void>;
}

export function ComfyUIServerCard({
  server,
  isActive,
  onSetActive,
  onEdit,
  onDelete,
  onTest,
}: ComfyUIServerCardProps) {
  const [isTesting, setIsTesting] = useState(false);

  const handleTest = async () => {
    setIsTesting(true);
    try {
      await onTest();
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusBadge = () => {
    if (isTesting || server.status === 'testing') {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Testing
        </Badge>
      );
    }

    switch (server.status) {
      case 'connected':
        return (
          <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
            <Check className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case 'disconnected':
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Server className="h-3 w-3" />
            Disconnected
          </Badge>
        );
    }
  };

  return (
    <Card className={cn(
      'transition-all',
      isActive && 'ring-2 ring-primary'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Radio Button */}
          <button
            onClick={onSetActive}
            className="mt-1 flex-shrink-0"
            aria-label={`Set ${server.name} as active server`}
          >
            <Radio
              className={cn(
                'h-5 w-5',
                isActive ? 'fill-primary text-primary' : 'text-muted-foreground'
              )}
            />
          </button>

          {/* Server Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium truncate">{server.name}</h4>
              {getStatusBadge()}
            </div>
            
            <p className="text-sm text-muted-foreground truncate mb-2">
              {server.serverUrl}
            </p>

            {/* Server Details */}
            {server.serverInfo && (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {server.serverInfo.version && (
                  <span>v{server.serverInfo.version}</span>
                )}
                {server.serverInfo.system?.vram && (
                  <span>VRAM: {Math.round(server.serverInfo.system.vram / 1024)}GB</span>
                )}
                {server.serverInfo.models && (
                  <span>{server.serverInfo.models.length} models</span>
                )}
              </div>
            )}

            {server.lastConnected && (
              <p className="text-xs text-muted-foreground mt-1">
                Last connected: {new Date(server.lastConnected).toLocaleString()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleTest}
              disabled={isTesting}
              title="Test connection"
            >
              {isTesting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Server className="h-4 w-4" />
              )}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              title="Edit server"
            >
              <Edit className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              disabled={isActive}
              title={isActive ? 'Cannot delete active server' : 'Delete server'}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
