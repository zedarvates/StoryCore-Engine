import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Edit, Clock, AlertTriangle, GripVertical, MapPin, User, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { Act, Scene } from '@/types/sequencePlan';
import { useWorldById, useStore } from '@/store';

interface Step4ScenePlanningProps {
  scenes: Scene[];
  acts: Act[];
  onScenesChange: (scenes: Scene[]) => void;
  validationErrors: Record<string, string>;
  worldId: string;
}

export function ScenePlanningInterface({
  scenes,
  acts,
  onScenesChange,
  validationErrors,
  worldId,
}: Step4ScenePlanningProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [draggedScene, setDraggedScene] = useState<Scene | null>(null);

  // Get world and characters data
  const world = useWorldById(worldId);
  const characters = useStore(state => state.characters);
  const allCharacters = characters || [];

  // Calculate scene totals per act
  const scenesByAct = useMemo(() => {
    const grouped: Record<string, Scene[]> = {};
    acts.forEach(act => {
      grouped[act.id] = scenes.filter(scene => scene.actId === act.id);
    });
    return grouped;
  }, [scenes, acts]);

  const handleAddScene = (actId: string) => {
    const newScene: Scene = {
      id: `scene-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      actId,
      number: (scenesByAct[actId] || []).length + 1,
      title: '',
      description: '',
      locationId: '',
      characterIds: [],
      estimatedShotCount: 5, // Default estimate
      shotIds: [],
      beats: [],
      assetTemplates: [],
    };
    setEditingScene(newScene);
    setIsAddDialogOpen(true);
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene({ ...scene });
    setIsAddDialogOpen(true);
  };

  const handleDeleteScene = (sceneId: string) => {
    const updatedScenes = scenes.filter(scene => scene.id !== sceneId);
    // Renumber scenes within each act
    const renumberedScenes = updatedScenes.map(scene => {
      const actScenes = updatedScenes.filter(s => s.actId === scene.actId);
      const newNumber = actScenes.findIndex(s => s.id === scene.id) + 1;
      return { ...scene, number: newNumber };
    });
    onScenesChange(renumberedScenes);
  };

  const handleSaveScene = (sceneData: Partial<Scene>) => {
    if (!editingScene) return;

    let updatedScenes: Scene[];
    const existingIndex = scenes.findIndex(scene => scene.id === editingScene.id);

    if (existingIndex >= 0) {
      // Update existing scene
      updatedScenes = [...scenes];
      updatedScenes[existingIndex] = { ...editingScene, ...sceneData };
    } else {
      // Add new scene
      updatedScenes = [...scenes, { ...editingScene, ...sceneData }];
    }

    // Renumber scenes within the act
    const actScenes = updatedScenes.filter(s => s.actId === editingScene.actId).sort((a, b) => a.number - b.number);
    actScenes.forEach((scene, index) => {
      scene.number = index + 1;
    });

    onScenesChange(updatedScenes);
    setEditingScene(null);
    setIsAddDialogOpen(false);
  };

  const handleReorderScenes = (actId: string, fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const actScenes = scenesByAct[actId] || [];
    const reorderedScenes = [...actScenes];
    const [movedScene] = reorderedScenes.splice(fromIndex, 1);
    reorderedScenes.splice(toIndex, 0, movedScene);

    // Update scene numbers and merge back
    const updatedScenes = reorderedScenes.map((scene, index) => ({
      ...scene,
      number: index + 1,
    }));

    const otherScenes = scenes.filter(scene => scene.actId !== actId);
    onScenesChange([...otherScenes, ...updatedScenes]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Scene Planning</h2>
        <p className="text-gray-600">
          Plan the specific scenes that will bring your narrative acts to life.
        </p>
      </div>

      {/* Validation Errors */}
      {validationErrors.scenes && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{validationErrors.scenes}</AlertDescription>
        </Alert>
      )}

      {/* Acts with Scenes */}
      <div className="space-y-8">
        {acts.map((act) => (
          <ActScenesSection
            key={act.id}
            act={act}
            scenes={scenesByAct[act.id] || []}
            locations={world?.locations || []}
            allCharacters={allCharacters}
            onAddScene={() => handleAddScene(act.id)}
            onEditScene={handleEditScene}
            onDeleteScene={handleDeleteScene}
            onReorderScenes={(fromIndex, toIndex) => handleReorderScenes(act.id, fromIndex, toIndex)}
            onDragStart={(scene) => setDraggedScene(scene)}
            onDragEnd={() => setDraggedScene(null)}
            draggedScene={draggedScene}
          />
        ))}
      </div>

      {/* Scene Editor Dialog */}
      <SceneEditorDialog
        scene={editingScene}
        isOpen={isAddDialogOpen}
        onClose={() => {
          setEditingScene(null);
          setIsAddDialogOpen(false);
        }}
        onSave={handleSaveScene}
        locations={world?.locations || []}
        allCharacters={allCharacters}
      />
    </div>
  );
}

// Act Scenes Section Component
interface ActScenesSectionProps {
  act: Act;
  scenes: Scene[];
  locations: unknown[];
  allCharacters: unknown[];
  onAddScene: () => void;
  onEditScene: (scene: Scene) => void;
  onDeleteScene: (sceneId: string) => void;
  onReorderScenes: (fromIndex: number, toIndex: number) => void;
  onDragStart: (scene: Scene) => void;
  onDragEnd: () => void;
  draggedScene: Scene | null;
}

function ActScenesSection({
  act,
  scenes,
  locations,
  allCharacters,
  onAddScene,
  onEditScene,
  onDeleteScene,
  onReorderScenes,
  onDragStart,
  onDragEnd,
  draggedScene,
}: ActScenesSectionProps) {
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedScene && draggedScene.actId === act.id) {
      const draggedIndex = scenes.findIndex(s => s.id === draggedScene.id);
      if (draggedIndex !== index) {
        onReorderScenes(draggedIndex, index);
      }
    }
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      {/* Act Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Act {act.number}: {act.title}
          </h3>
          <p className="text-sm text-gray-600 mt-1">{act.description}</p>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(act.targetDuration)}
            </span>
            <span>{scenes.length} scene{scenes.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <Button onClick={onAddScene} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </div>

      {/* Scenes List */}
      <div className="space-y-3">
        {scenes.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-gray-400 mb-4">
              <FileText className="h-8 w-8 mx-auto" />
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">No scenes in this act yet</h4>
            <p className="text-xs text-gray-600 mb-4">Break down this act into specific scenes.</p>
            <Button variant="outline" size="sm" onClick={onAddScene}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Scene
            </Button>
          </div>
        ) : (
          scenes.map((scene, index) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              index={index}
              locations={locations}
              allCharacters={allCharacters}
              onEdit={() => onEditScene(scene)}
              onDelete={() => onDeleteScene(scene.id)}
              onDragStart={() => onDragStart(scene)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={onDragEnd}
              isDraggedOver={draggedScene?.id === scene.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Scene Card Component
interface SceneCardProps {
  scene: Scene;
  index: number;
  locations: unknown[];
  allCharacters: unknown[];
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDraggedOver: boolean;
}

function SceneCard({
  scene,
  index: _index,
  locations,
  allCharacters,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDraggedOver,
}: SceneCardProps) {
  const location = locations.find(loc => loc.id === scene.locationId);
  const sceneCharacters = allCharacters.filter(char => scene.characterIds.includes(char.character_id));

  return (
    <div
      className={cn(
        'border rounded-lg p-4 bg-gray-50 transition-all cursor-move',
        isDraggedOver && 'border-blue-500 bg-blue-50 shadow-lg'
      )}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-4">
        {/* Drag Handle & Number */}
        <div className="flex items-center gap-2">
          <GripVertical className="h-5 w-5 text-gray-400" />
          <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
            {scene.number}
          </div>
        </div>

        {/* Scene Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{scene.title || 'Untitled Scene'}</h4>
              {scene.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{scene.description}</p>
              )}

              {/* Scene Details */}
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {location.name}
                  </span>
                )}
                {sceneCharacters.length > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {sceneCharacters.length} character{sceneCharacters.length !== 1 ? 's' : ''}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {scene.estimatedShotCount} shot{scene.estimatedShotCount !== 1 ? 's' : ''}
                </span>
                {scene.beats.length > 0 && (
                  <Badge variant="outline" className="text-xs border-gray-600 text-gray-700 bg-gray-50">
                    {scene.beats.length} beat{scene.beats.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scene Editor Dialog Component
interface SceneEditorDialogProps {
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sceneData: Partial<Scene>) => void;
  locations: unknown[];
  allCharacters: unknown[];
}

function SceneEditorDialog({
  scene,
  isOpen,
  onClose,
  onSave,
  locations,
  allCharacters,
}: SceneEditorDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    locationId: '',
    characterIds: [] as string[],
    estimatedShotCount: 5,
    beats: [] as string[],
    assetTemplates: [] as string[],
  });

  const [newBeat, setNewBeat] = useState('');

  React.useEffect(() => {
    if (scene) {
      setFormData({
        title: scene.title,
        description: scene.description,
        locationId: scene.locationId,
        characterIds: scene.characterIds,
        estimatedShotCount: scene.estimatedShotCount,
        beats: scene.beats,
        assetTemplates: scene.assetTemplates,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        locationId: '',
        characterIds: [],
        estimatedShotCount: 5,
        beats: [],
        assetTemplates: [],
      });
    }
  }, [scene]);

  const handleSave = () => {
    if (!formData.title.trim()) return;

    onSave({
      title: formData.title.trim(),
      description: formData.description.trim(),
      locationId: formData.locationId,
      characterIds: formData.characterIds,
      estimatedShotCount: formData.estimatedShotCount,
      beats: formData.beats,
      assetTemplates: formData.assetTemplates,
    });
  };

  const addBeat = () => {
    if (newBeat.trim()) {
      setFormData(prev => ({
        ...prev,
        beats: [...prev.beats, newBeat.trim()],
      }));
      setNewBeat('');
    }
  };

  const removeBeat = (index: number) => {
    setFormData(prev => ({
      ...prev,
      beats: prev.beats.filter((_, i) => i !== index),
    }));
  };

  const toggleCharacter = (characterId: string) => {
    setFormData(prev => ({
      ...prev,
      characterIds: prev.characterIds.includes(characterId)
        ? prev.characterIds.filter(id => id !== characterId)
        : [...prev.characterIds, characterId],
    }));
  };

  if (!scene) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {scene.id ? 'Edit Scene' : 'Add New Scene'}
          </DialogTitle>
          <DialogDescription>
            Define the details, location, characters, and beats for this scene.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="scene-title">Title *</Label>
            <Input
              id="scene-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., The Confrontation"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="scene-description">Description</Label>
            <Textarea
              id="scene-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what happens in this scene..."
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="scene-location">Location</Label>
            <Select
              value={formData.locationId}
              onValueChange={(value) => setFormData(prev => ({ ...prev, locationId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a location..." />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {locations.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Characters */}
          <div className="space-y-2">
            <Label>Characters in Scene</Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border rounded p-2">
              {allCharacters.map(character => (
                <label key={character.character_id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.characterIds.includes(character.character_id)}
                    onChange={() => toggleCharacter(character.character_id)}
                    className="rounded"
                  />
                  <span className="text-sm">{character.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Estimated Shot Count */}
          <div className="space-y-2">
            <Label htmlFor="scene-shots">Estimated Shot Count</Label>
            <Input
              id="scene-shots"
              type="number"
              min="1"
              value={formData.estimatedShotCount}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                estimatedShotCount: parseInt(e.target.value) || 1
              }))}
            />
          </div>

          {/* Beats */}
          <div className="space-y-2">
            <Label>Scene Beats</Label>
            <div className="space-y-2">
              {formData.beats.map((beat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={beat} readOnly className="flex-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBeat(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newBeat}
                  onChange={(e) => setNewBeat(e.target.value)}
                  placeholder="Add a new beat..."
                  onKeyPress={(e) => e.key === 'Enter' && addBeat()}
                />
                <Button variant="outline" size="sm" onClick={addBeat}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title.trim()}>
            {scene.id ? 'Update Scene' : 'Add Scene'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

