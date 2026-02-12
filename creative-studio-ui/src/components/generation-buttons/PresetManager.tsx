/**
 * Preset Manager Component
 * 
 * UI for managing generation parameter presets.
 * Provides list, save, load, delete, and rename functionality.
 * 
 * Requirements: 10.5
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Save,
  FolderOpen,
  Trash2,
  Edit2,
  Check,
  X,
  MoreVertical,
  Download,
  Upload,
} from 'lucide-react';
import {
  PresetManagementService,
  type Preset,
  type PresetType,
} from '../../services/PresetManagementService';

export interface PresetManagerProps {
  /**
   * Type of presets to manage
   */
  type: PresetType;
  
  /**
   * Current parameters to save as preset
   */
  currentParams: unknown;
  
  /**
   * Callback when preset is loaded
   */
  onLoadPreset: (preset: Preset) => void;
  
  /**
   * Optional className
   */
  className?: string;
}

/**
 * Preset Manager Component
 * 
 * Provides UI for saving, loading, and managing presets.
 */
export const PresetManager: React.FC<PresetManagerProps> = ({
  type,
  currentParams,
  onLoadPreset,
  className,
}) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // Load presets on mount and when type changes
  useEffect(() => {
    loadPresets();
  }, [type]);
  
  /**
   * Load presets from storage
   */
  const loadPresets = () => {
    const loaded = PresetManagementService.getPresets(type);
    setPresets(loaded);
  };
  
  /**
   * Save current parameters as preset
   */
  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      return;
    }
    
    try {
      const preset = PresetManagementService.savePreset({
        name: newPresetName.trim(),
        type,
        ...(type === 'prompt' ? { categories: currentParams } : { params: currentParams }),
      } as any);
      
      loadPresets();
      setShowSaveDialog(false);
      setNewPresetName('');
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  };
  
  /**
   * Load a preset
   */
  const handleLoadPreset = (preset: Preset) => {
    onLoadPreset(preset);
    setShowLoadDialog(false);
  };
  
  /**
   * Delete a preset
   */
  const handleDeletePreset = (id: string) => {
    if (confirm('Are you sure you want to delete this preset?')) {
      PresetManagementService.deletePreset(id);
      loadPresets();
    }
  };
  
  /**
   * Start editing preset name
   */
  const startEditingPreset = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setEditingName(preset.name);
  };
  
  /**
   * Save edited preset name
   */
  const saveEditedPresetName = () => {
    if (editingPresetId && editingName.trim()) {
      PresetManagementService.renamePreset(editingPresetId, editingName.trim());
      loadPresets();
      setEditingPresetId(null);
      setEditingName('');
    }
  };
  
  /**
   * Cancel editing
   */
  const cancelEditing = () => {
    setEditingPresetId(null);
    setEditingName('');
  };
  
  /**
   * Export presets
   */
  const handleExportPresets = () => {
    const json = PresetManagementService.exportPresets(type);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}-presets.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  /**
   * Import presets
   */
  const handleImportPresets = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const result = PresetManagementService.importPresets(text);
          alert(`Imported ${result.success} presets. ${result.failed} failed.`);
          loadPresets();
        } catch (error) {
          alert('Failed to import presets. Please check the file format.');
        }
      }
    };
    input.click();
  };
  
  return (
    <div className={className}>
      <div className="flex gap-2">
        {/* Save Preset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="flex-1"
        >
          <Save className="mr-2 h-4 w-4" />
          Save Preset
        </Button>
        
        {/* Load Preset Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowLoadDialog(true)}
          className="flex-1"
          disabled={presets.length === 0}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Load Preset
        </Button>
        
        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPresets} disabled={presets.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export Presets
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleImportPresets}>
              <Upload className="mr-2 h-4 w-4" />
              Import Presets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Save Preset Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Preset</DialogTitle>
            <DialogDescription>
              Give your preset a name to save the current parameters.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="presetName">Preset Name</Label>
              <Input
                id="presetName"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Enter preset name..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSavePreset();
                  }
                }}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!newPresetName.trim()}>
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Load Preset Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Load Preset</DialogTitle>
            <DialogDescription>
              Select a preset to load its parameters.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4 max-h-[400px] overflow-y-auto">
            {presets.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No presets saved yet.
              </div>
            ) : (
              presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-2 p-2 rounded-md border hover:bg-accent"
                >
                  {editingPresetId === preset.id ? (
                    <>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            saveEditedPresetName();
                          } else if (e.key === 'Escape') {
                            cancelEditing();
                          }
                        }}
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveEditedPresetName}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start"
                        onClick={() => handleLoadPreset(preset)}
                      >
                        <FolderOpen className="mr-2 h-4 w-4" />
                        {preset.name}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEditingPreset(preset)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePreset(preset.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

