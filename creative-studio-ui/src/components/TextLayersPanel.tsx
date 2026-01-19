import { useStore, useSelectedShot } from '../store';
import type { TextLayer } from '../types';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  TypeIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  SparklesIcon,
} from 'lucide-react';
import { useState } from 'react';
import { TextTemplates } from './TextTemplates';

// ============================================================================
// TextLayersPanel Component
// ============================================================================

export function TextLayersPanel() {
  const selectedShot = useSelectedShot();
  const addTextLayer = useStore((state) => state.addTextLayer);
  const selectTextLayer = useStore((state) => state.selectTextLayer);
  const selectedTextLayerId = useStore((state) => state.selectedTextLayerId);
  const [showTemplates, setShowTemplates] = useState(false);

  if (!selectedShot) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <TypeIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">No Shot Selected</h3>
        <p className="text-sm text-muted-foreground">
          Select a shot to manage text layers
        </p>
      </div>
    );
  }

  const handleAddTextLayer = () => {
    const newLayer: TextLayer = {
      id: `text-layer-${Date.now()}`,
      content: 'New Text',
      font: 'Arial',
      fontSize: 48,
      color: '#ffffff',
      position: { x: 50, y: 50 }, // Center of shot
      alignment: 'center',
      startTime: 0,
      duration: selectedShot.duration,
      style: {
        bold: false,
        italic: false,
        underline: false,
      },
    };
    addTextLayer(selectedShot.id, newLayer);
    selectTextLayer(newLayer.id);
  };

  const textLayers = selectedShot.textLayers || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TypeIcon className="h-4 w-4" />
            Text Layers
          </h3>
          <Badge variant="secondary">{textLayers.length}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Add and manage text overlays for this shot
        </p>
      </div>

      <Separator />

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleAddTextLayer} className="flex-1" size="sm">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Text Layer
        </Button>
        <Button
          onClick={() => setShowTemplates(!showTemplates)}
          variant={showTemplates ? 'default' : 'outline'}
          size="sm"
          className="flex-1"
        >
          <SparklesIcon className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </div>

      {/* Text Templates Section */}
      {showTemplates && (
        <>
          <Separator />
          <TextTemplates
            shotId={selectedShot.id}
            onTemplateApply={() => {
              // Optionally close templates after applying
              // setShowTemplates(false);
            }}
          />
          <Separator />
        </>
      )}

      {/* Text Layers List */}
      {textLayers.length > 0 ? (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Layers</Label>
          <div className="space-y-2">
            {textLayers.map((layer) => (
              <TextLayerItem
                key={layer.id}
                layer={layer}
                shotId={selectedShot.id}
                isSelected={layer.id === selectedTextLayerId}
                onSelect={() => selectTextLayer(layer.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg bg-muted/50">
          <div className="rounded-full bg-primary/10 p-3 mb-3">
            <TypeIcon className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium mb-1">No Text Layers</p>
          <p className="text-xs text-muted-foreground text-center">
            Add a text layer to display titles, captions, or annotations
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// TextLayerItem Component
// ============================================================================

interface TextLayerItemProps {
  layer: TextLayer;
  shotId: string;
  isSelected: boolean;
  onSelect: () => void;
}

function TextLayerItem({ layer, shotId, isSelected, onSelect }: TextLayerItemProps) {
  const deleteTextLayer = useStore((state) => state.deleteTextLayer);
  const [isVisible, setIsVisible] = useState(true);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteTextLayer(shotId, layer.id);
  };

  const handleToggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(!isVisible);
    // In a real implementation, this would update the layer's visibility property
  };

  // Format timing display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  return (
    <div
      className={`
        group relative p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-muted/50 hover:bg-muted'}
      `}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVerticalIcon className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex items-start gap-3 pl-4">
        {/* Icon */}
        <div className="rounded-md bg-primary/10 p-2 mt-0.5">
          <TypeIcon className="h-4 w-4 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-sm font-medium truncate">
              {layer.content || 'Empty Text'}
            </p>
            {isSelected && (
              <Badge variant="default" className="text-xs">
                Selected
              </Badge>
            )}
          </div>

          {/* Layer Info */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono">
              {formatTime(layer.startTime)} - {formatTime(layer.startTime + layer.duration)}
            </span>
            <span>•</span>
            <span>{layer.font}</span>
            <span>•</span>
            <span>{layer.fontSize}px</span>
          </div>

          {/* Style Indicators */}
          <div className="flex items-center gap-2 mt-2">
            {layer.style.bold && (
              <Badge variant="outline" className="text-xs">
                Bold
              </Badge>
            )}
            {layer.style.italic && (
              <Badge variant="outline" className="text-xs">
                Italic
              </Badge>
            )}
            {layer.style.underline && (
              <Badge variant="outline" className="text-xs">
                Underline
              </Badge>
            )}
            {layer.animation && (
              <Badge variant="secondary" className="text-xs">
                {layer.animation.type}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={handleToggleVisibility}
          >
            {isVisible ? (
              <EyeIcon className="h-4 w-4" />
            ) : (
              <EyeOffIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            onClick={handleDelete}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
