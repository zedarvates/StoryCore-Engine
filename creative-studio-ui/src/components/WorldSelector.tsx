import React from 'react';
import { useWorlds, useStore } from '@/store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Globe } from 'lucide-react';

// ============================================================================
// World Selector Component
// ============================================================================

export interface WorldSelectorProps {
  value?: string | null;
  onChange?: (worldId: string | null) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function WorldSelector({
  value,
  onChange,
  label = 'World Context',
  placeholder = 'Select a world...',
  disabled = false,
  className = '',
}: WorldSelectorProps) {
  const worlds = useWorlds();
  const selectedWorldId = useStore((state) => state.selectedWorldId);
  const selectWorld = useStore((state) => state.selectWorld);

  // Use controlled value if provided, otherwise use store's selected world
  const currentValue = value !== undefined ? value : selectedWorldId;

  const handleValueChange = (newValue: string) => {
    const worldId = newValue === 'none' ? null : newValue;
    
    // Call onChange if provided
    if (onChange) {
      onChange(worldId);
    } else {
      // Otherwise update store
      selectWorld(worldId);
    }
  };

  if (worlds.length === 0) {
    return (
      <div className={className}>
        {label && <Label className="text-sm text-muted-foreground">{label}</Label>}
        <div className="flex items-center gap-2 p-3 border border-dashed rounded-md text-sm text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>No worlds created yet. Create a world to add context to your generations.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <Label className="mb-2 block">{label}</Label>}
      <Select
        value={currentValue || 'none'}
        onValueChange={handleValueChange}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">No world context</span>
          </SelectItem>
          {worlds.map((world) => (
            <SelectItem key={world.id} value={world.id}>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <div>
                  <div className="font-medium">{world.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {world.genre.join(', ')} • {world.timePeriod}
                  </div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ============================================================================
// Compact World Selector (for inline use)
// ============================================================================

export interface CompactWorldSelectorProps {
  value?: string | null;
  onChange?: (worldId: string | null) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactWorldSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: CompactWorldSelectorProps) {
  const worlds = useWorlds();
  const selectedWorldId = useStore((state) => state.selectedWorldId);
  const selectWorld = useStore((state) => state.selectWorld);

  const currentValue = value !== undefined ? value : selectedWorldId;

  const handleValueChange = (newValue: string) => {
    const worldId = newValue === 'none' ? null : newValue;
    
    if (onChange) {
      onChange(worldId);
    } else {
      selectWorld(worldId);
    }
  };

  if (worlds.length === 0) {
    return null;
  }

  return (
    <Select
      value={currentValue || 'none'}
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={`w-[200px] ${className}`}>
        <Globe className="h-4 w-4 mr-2" />
        <SelectValue placeholder="Select world..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">No world</SelectItem>
        {worlds.map((world) => (
          <SelectItem key={world.id} value={world.id}>
            {world.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
