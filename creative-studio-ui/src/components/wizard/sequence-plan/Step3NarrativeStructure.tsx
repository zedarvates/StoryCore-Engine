import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Clock, AlertTriangle, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Act } from '@/types/sequencePlan';

interface Step3NarrativeStructureProps {
  acts: Act[];
  onActsChange: (acts: Act[]) => void;
  targetDuration: number;
  validationErrors: Record<string, string>;
}

export function Step3NarrativeStructure({
  acts,
  onActsChange,
  targetDuration,
  validationErrors,
}: Step3NarrativeStructureProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAct, setEditingAct] = useState<Act | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Calculate totals and validation
  const actsTotalDuration = useMemo(() => {
    return acts.reduce((sum, act) => sum + act.targetDuration, 0);
  }, [acts]);

  const durationDifference = actsTotalDuration - targetDuration;
  const isDurationValid = durationDifference <= 0;
  const durationVariancePercent = targetDuration > 0 ? (durationDifference / targetDuration) * 100 : 0;

  const narrativePurposes = [
    'Setup',
    'Rising Action',
    'Conflict',
    'Crisis',
    'Falling Action',
    'Resolution',
    'Climax',
    'Inciting Incident',
    'Development',
    'Conclusion',
  ];

  const handleAddAct = () => {
    const newAct: Act = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: acts.length + 1,
      title: '',
      description: '',
      targetDuration: 60, // Default 1 minute
      narrativePurpose: '',
      sceneIds: [],
    };
    setEditingAct(newAct);
    setIsAddDialogOpen(true);
  };

  const handleEditAct = (act: Act) => {
    setEditingAct({ ...act });
    setIsAddDialogOpen(true);
  };

  const handleDeleteAct = (actId: string) => {
    const updatedActs = acts.filter(act => act.id !== actId).map((act, index) => ({
      ...act,
      number: index + 1, // Renumber acts
    }));
    onActsChange(updatedActs);
  };

  const handleSaveAct = (actData: Partial<Act>) => {
    if (!editingAct) return;

    let updatedActs: Act[];
    const existingIndex = acts.findIndex(act => act.id === editingAct.id);

    if (existingIndex >= 0) {
      // Update existing act
      updatedActs = [...acts];
      updatedActs[existingIndex] = { ...editingAct, ...actData };
    } else {
      // Add new act
      updatedActs = [...acts, { ...editingAct, ...actData }];
    }

    // Renumber acts based on their order
    updatedActs = updatedActs.map((act, index) => ({
      ...act,
      number: index + 1,
    }));

    onActsChange(updatedActs);
    setEditingAct(null);
    setIsAddDialogOpen(false);
  };

  const handleReorderActs = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const reorderedActs = [...acts];
    const [movedAct] = reorderedActs.splice(fromIndex, 1);
    reorderedActs.splice(toIndex, 0, movedAct);

    // Renumber acts based on new order
    const renumberedActs = reorderedActs.map((act, index) => ({
      ...act,
      number: index + 1,
    }));

    onActsChange(renumberedActs);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    handleReorderActs(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Narrative Structure</h2>
        <p className="text-gray-600">
          Define the acts that form the backbone of your sequence's narrative arc.
        </p>
      </div>

      <div className="bg-primary/5 p-4 rounded-lg border border-primary/30 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-primary neon-text uppercase tracking-wider text-xs">Pacing & Duration Summary</h3>
          <Badge variant={isDurationValid ? "secondary" : "destructive"} className="bg-primary/20 text-primary-foreground border-primary/40">
            {formatDuration(actsTotalDuration)} / {formatDuration(targetDuration)}
          </Badge>
        </div>
        <div className="text-sm text-primary-foreground/70 font-mono">
          <div className="flex justify-between"><span>ACTS TOTAL:</span> <span className="font-medium text-primary">{formatDuration(actsTotalDuration)}</span></div>
          <div className="flex justify-between"><span>SEQUENCE TARGET:</span> <span className="font-medium">{formatDuration(targetDuration)}</span></div>
          {!isDurationValid && (
            <div className="text-destructive mt-1 border-t border-destructive/20 pt-1">
              ⚠️ OVERFLOW: +{formatDuration(Math.abs(durationDifference))}
              ({Math.abs(durationVariancePercent).toFixed(1)}%)
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.acts && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationErrors.acts}</AlertDescription>
        </Alert>
      )}

      {/* Acts List */}
      <div className="space-y-4">
        {acts.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <Clock className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No acts defined yet</h3>
            <p className="text-gray-600 mb-4">Start building your narrative structure by adding acts.</p>
            <Button onClick={handleAddAct} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add First Act
            </Button>
          </div>
        ) : (
          <>
            {acts.map((act, index) => (
              <ActCard
                key={act.id}
                act={act}
                index={index}
                onEdit={() => handleEditAct(act)}
                onDelete={() => handleDeleteAct(act.id)}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                isDraggedOver={draggedIndex === index}
              />
            ))}

            {/* Add Act Button */}
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={handleAddAct} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="h-4 w-4 mr-2" />
                Add Act
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Act Editor Dialog */}
      <ActEditorDialog
        act={editingAct}
        isOpen={isAddDialogOpen}
        onClose={() => {
          setEditingAct(null);
          setIsAddDialogOpen(false);
        }}
        onSave={handleSaveAct}
        narrativePurposes={narrativePurposes}
      />
    </div>
  );
}

// Act Card Component
interface ActCardProps {
  act: Act;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDraggedOver: boolean;
}

function ActCard({
  act,
  index,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDraggedOver,
}: ActCardProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 bg-white transition-all',
        isDraggedOver && 'border-blue-500 bg-blue-50 shadow-lg'
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle */}
        <div className="flex items-center pt-1">
          <GripVertical className="h-5 w-5 text-gray-400 cursor-grab active:cursor-grabbing" />
        </div>

        {/* Act Number */}
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
            {act.number}
          </div>
        </div>

        {/* Act Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">{act.title || 'Untitled Act'}</h3>
              {act.narrativePurpose && (
                <Badge variant="outline" className="mt-1 border-blue-600 text-blue-700 bg-blue-50">
                  {act.narrativePurpose}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary" className="flex items-center gap-1 bg-gray-200 text-gray-900">
                <Clock className="h-3 w-3" />
                {formatDuration(act.targetDuration)}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete} className="bg-red-600 hover:bg-red-700 text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {act.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{act.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span>{act.sceneIds.length} scene{act.sceneIds.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Act Editor Dialog Component
interface ActEditorDialogProps {
  act: Act | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (actData: Partial<Act>) => void;
  narrativePurposes: string[];
}

function ActEditorDialog({
  act,
  isOpen,
  onClose,
  onSave,
  narrativePurposes,
}: ActEditorDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetDuration: 60,
    narrativePurpose: '',
  });

  React.useEffect(() => {
    if (act) {
      setFormData({
        title: act.title,
        description: act.description,
        targetDuration: act.targetDuration,
        narrativePurpose: act.narrativePurpose,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        targetDuration: 60,
        narrativePurpose: '',
      });
    }
  }, [act]);

  const handleSave = () => {
    if (!formData.title.trim()) return;

    onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      targetDuration: formData.targetDuration,
      narrativePurpose: formData.narrativePurpose,
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseDurationString = (durationStr: string): number => {
    const mmssMatch = durationStr.match(/^(\d{1,3}):(\d{2})$/);
    if (mmssMatch) {
      const minutes = parseInt(mmssMatch[1], 10);
      const seconds = parseInt(mmssMatch[2], 10);
      if (seconds < 60) {
        return minutes * 60 + seconds;
      }
    }
    const secondsMatch = durationStr.match(/^(\d+)$/);
    if (secondsMatch) {
      return parseInt(secondsMatch[1], 10);
    }
    return formData.targetDuration;
  };

  if (!act) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {act.id ? 'Edit Act' : 'Add New Act'}
          </DialogTitle>
          <DialogDescription>
            Define the narrative purpose and timing for this act.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="act-title">Title *</Label>
            <Input
              id="act-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Act 1: The Setup"
            />
          </div>

          {/* Narrative Purpose */}
          <div className="space-y-2">
            <Label htmlFor="act-purpose">Narrative Purpose</Label>
            <Select
              value={formData.narrativePurpose}
              onValueChange={(value) => setFormData(prev => ({ ...prev, narrativePurpose: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select narrative purpose..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {narrativePurposes.map(purpose => (
                  <SelectItem key={purpose} value={purpose}>
                    {purpose}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target Duration */}
          <div className="space-y-2">
            <Label htmlFor="act-duration">Target Duration</Label>
            <Input
              id="act-duration"
              value={formatDuration(formData.targetDuration)}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                targetDuration: parseDurationString(e.target.value)
              }))}
              placeholder="MM:SS or seconds"
            />
            <p className="text-xs text-gray-500">
              Current: {formatDuration(formData.targetDuration)}
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="act-description">Description</Label>
            <Textarea
              id="act-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what happens in this act..."
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title.trim()} className="bg-blue-600 hover:bg-blue-700 text-white">
            {act.id ? 'Update Act' : 'Add Act'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
