/**
 * Step 7: Scene Breakdown (Découpage)
 * Allows users to break down their story into individual scenes with metadata
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Clock, MapPin, Users, AlertTriangle, Film } from 'lucide-react';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type {
  SceneBreakdown,
  Location,
  CharacterProfile,
  ProjectTypeData,
} from '@/types/wizard';

// ============================================================================
// Time of Day Options
// ============================================================================

const TIME_OF_DAY_OPTIONS: {
  value: SceneBreakdown['timeOfDay'];
  label: string;
  icon: string;
}[] = [
  { value: 'dawn', label: 'Dawn', icon: '🌅' },
  { value: 'morning', label: 'Morning', icon: '🌄' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { value: 'evening', label: 'Evening', icon: '🌆' },
  { value: 'night', label: 'Night', icon: '🌙' },
  { value: 'unspecified', label: 'Unspecified', icon: '⏰' },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step7_SceneBreakdownProps {
  data: SceneBreakdown[] | null;
  onUpdate: (data: SceneBreakdown[]) => void;
  errors?: Record<string, string>;
  // Context from previous steps
  locations?: Location[];
  characters?: CharacterProfile[];
  projectType?: ProjectTypeData;
}

// ============================================================================
// Component
// ============================================================================

export function Step7_SceneBreakdown({
  data,
  onUpdate,
  errors = {},
  locations = [],
  characters = [],
  projectType,
}: Step7_SceneBreakdownProps) {
  // State
  const [scenes, setScenes] = useState<SceneBreakdown[]>(data || []);
  const [isSceneDialogOpen, setIsSceneDialogOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<SceneBreakdown | null>(null);
  const [draggedSceneId, setDraggedSceneId] = useState<string | null>(null);

  // Scene form state
  const [sceneForm, setSceneForm] = useState<Partial<SceneBreakdown>>({
    sceneNumber: 1,
    sceneName: '',
    durationMinutes: 0,
    locationId: '',
    characterIds: [],
    timeOfDay: 'unspecified',
    emotionalBeat: '',
    keyActions: [],
  });

  // Key action input
  const [keyActionInput, setKeyActionInput] = useState('');

  // Update parent when scenes change
  useEffect(() => {
    onUpdate(scenes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenes]); // Only depend on scenes, not onUpdate

  // Calculate total duration
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.durationMinutes, 0);
  const projectDuration = projectType?.durationMinutes || 0;
  const durationWarning = projectDuration > 0 && totalDuration > projectDuration;

  // Handle scene dialog open
  const handleAddScene = () => {
    setEditingScene(null);
    const nextSceneNumber = scenes.length > 0 
      ? Math.max(...scenes.map(s => s.sceneNumber)) + 1 
      : 1;
    setSceneForm({
      sceneNumber: nextSceneNumber,
      sceneName: '',
      durationMinutes: 0,
      locationId: locations.length > 0 ? locations[0].id : '',
      characterIds: [],
      timeOfDay: 'unspecified',
      emotionalBeat: '',
      keyActions: [],
    });
    setKeyActionInput('');
    setIsSceneDialogOpen(true);
  };

  // Handle scene edit
  const handleEditScene = (scene: SceneBreakdown) => {
    setEditingScene(scene);
    setSceneForm(scene);
    setKeyActionInput('');
    setIsSceneDialogOpen(true);
  };

  // Handle scene save
  const handleSaveScene = () => {
    if (!sceneForm.sceneName || !sceneForm.locationId || sceneForm.characterIds?.length === 0) {
      return;
    }

    const newScene: SceneBreakdown = {
      id: editingScene?.id || `scene-${Date.now()}`,
      sceneNumber: sceneForm.sceneNumber || 1,
      sceneName: sceneForm.sceneName || '',
      durationMinutes: sceneForm.durationMinutes || 0,
      locationId: sceneForm.locationId || '',
      characterIds: sceneForm.characterIds || [],
      timeOfDay: sceneForm.timeOfDay || 'unspecified',
      emotionalBeat: sceneForm.emotionalBeat || '',
      keyActions: sceneForm.keyActions || [],
      order: editingScene?.order || scenes.length,
    };

    if (editingScene) {
      // Update existing scene
      setScenes((prev) =>
        prev.map((s) => (s.id === editingScene.id ? newScene : s))
      );
    } else {
      // Add new scene
      setScenes((prev) => [...prev, newScene]);
    }

    setIsSceneDialogOpen(false);
    setSceneForm({
      sceneNumber: 1,
      sceneName: '',
      durationMinutes: 0,
      locationId: '',
      characterIds: [],
      timeOfDay: 'unspecified',
      emotionalBeat: '',
      keyActions: [],
    });
  };

  // Handle scene delete
  const handleDeleteScene = (sceneId: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  };

  // Handle key action add
  const handleAddKeyAction = () => {
    if (keyActionInput.trim() && !sceneForm.keyActions?.includes(keyActionInput.trim())) {
      setSceneForm((prev) => ({
        ...prev,
        keyActions: [...(prev.keyActions || []), keyActionInput.trim()],
      }));
      setKeyActionInput('');
    }
  };

  // Handle key action remove
  const handleRemoveKeyAction = (action: string) => {
    setSceneForm((prev) => ({
      ...prev,
      keyActions: (prev.keyActions || []).filter((a) => a !== action),
    }));
  };

  // Handle character selection toggle
  const handleToggleCharacter = (characterId: string) => {
    setSceneForm((prev) => {
      const currentIds = prev.characterIds || [];
      const newIds = currentIds.includes(characterId)
        ? currentIds.filter((id) => id !== characterId)
        : [...currentIds, characterId];
      return { ...prev, characterIds: newIds };
    });
  };

  // Drag and drop handlers
  const handleDragStart = (sceneId: string) => {
    setDraggedSceneId(sceneId);
  };

  const handleDragOver = (e: React.DragEvent, targetSceneId: string) => {
    e.preventDefault();
    if (!draggedSceneId || draggedSceneId === targetSceneId) return;

    const draggedIndex = scenes.findIndex((s) => s.id === draggedSceneId);
    const targetIndex = scenes.findIndex((s) => s.id === targetSceneId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newScenes = [...scenes];
    const [draggedScene] = newScenes.splice(draggedIndex, 1);
    newScenes.splice(targetIndex, 0, draggedScene);

    // Update order property
    const reorderedScenes = newScenes.map((scene, index) => ({
      ...scene,
      order: index,
    }));

    setScenes(reorderedScenes);
  };

  const handleDragEnd = () => {
    setDraggedSceneId(null);
  };

  // Get location name by ID
  const getLocationName = (locationId: string) => {
    return locations.find((loc) => loc.id === locationId)?.name || 'Unknown Location';
  };

  // Get character names by IDs
  const getCharacterNames = (characterIds: string[]) => {
    return characterIds
      .map((id) => characters.find((char) => char.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  // Sort scenes by order
  const sortedScenes = [...scenes].sort((a, b) => a.order - b.order);

  return (
    <WizardFormLayout
      title="Scene Breakdown (Découpage)"
      description="Break down your story into individual scenes with detailed metadata"
    >
      {/* Error Summary */}
      {Object.keys(errors).length > 0 && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Duration Warning */}
      {durationWarning && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Duration Warning
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Total scene duration (<strong>{totalDuration} minutes</strong>) exceeds project
                duration (<strong>{projectDuration} minutes</strong>). Consider adjusting scene
                durations or project type.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Duration Summary */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                Total Duration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {totalDuration} minutes across {scenes.length} scenes
              </p>
            </div>
          </div>
          {projectDuration > 0 && (
            <div className="text-right">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Project Target: {projectDuration} min
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {totalDuration > 0 
                  ? `${Math.round((totalDuration / projectDuration) * 100)}% of target`
                  : 'No scenes yet'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scene List */}
      <FormSection
        title="Scenes"
        description="Drag and drop to reorder scenes"
      >
        {sortedScenes.length > 0 ? (
          <div className="space-y-3">
            {sortedScenes.map((scene) => (
              <Card
                key={scene.id}
                className={`hover:shadow-md transition-shadow cursor-move ${
                  draggedSceneId === scene.id ? 'opacity-50' : ''
                }`}
                draggable
                onDragStart={() => handleDragStart(scene.id)}
                onDragOver={(e) => handleDragOver(e, scene.id)}
                onDragEnd={handleDragEnd}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="flex-shrink-0 cursor-grab active:cursor-grabbing">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                    </div>

                    {/* Scene Number Badge */}
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                          {scene.sceneNumber}
                        </span>
                      </div>
                    </div>

                    {/* Scene Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg mb-1">{scene.sceneName}</h4>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              <span>{getLocationName(scene.locationId)}</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              <span>{scene.durationMinutes} min</span>
                            </div>
                            <span>•</span>
                            <span>
                              {TIME_OF_DAY_OPTIONS.find((opt) => opt.value === scene.timeOfDay)?.icon}{' '}
                              {TIME_OF_DAY_OPTIONS.find((opt) => opt.value === scene.timeOfDay)?.label}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditScene(scene)}
                            aria-label={`Edit ${scene.sceneName}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteScene(scene.id)}
                            aria-label={`Delete ${scene.sceneName}`}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Characters */}
                      {scene.characterIds.length > 0 && (
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-gray-500" />
                          <div className="flex flex-wrap gap-1">
                            {scene.characterIds.map((charId) => {
                              const character = characters.find((c) => c.id === charId);
                              return character ? (
                                <Badge key={charId} variant="secondary" className="text-xs">
                                  {character.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Emotional Beat */}
                      {scene.emotionalBeat && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-2">
                          "{scene.emotionalBeat}"
                        </p>
                      )}

                      {/* Key Actions */}
                      {scene.keyActions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            Key Actions:
                          </p>
                          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            {scene.keyActions.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <span className="text-blue-500">•</span>
                                <span>{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <Film className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              No scenes yet. Add your first scene to begin the breakdown.
            </p>
          </div>
        )}

        {/* Add Scene Button */}
        <Button onClick={handleAddScene} variant="outline" className="w-full" type="button">
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </FormSection>

      {/* Scene Dialog */}
      <Dialog open={isSceneDialogOpen} onOpenChange={setIsSceneDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScene ? 'Edit Scene' : 'Add Scene'}
            </DialogTitle>
            <DialogDescription>
              Define the details and metadata for this scene
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Scene Number and Name */}
            <FormGrid columns={2}>
              <FormField
                label="Scene Number"
                name="sceneNumber"
                required
                helpText="Sequential scene number"
              >
                <Input
                  id="sceneNumber"
                  type="number"
                  min="1"
                  value={sceneForm.sceneNumber || 1}
                  onChange={(e) =>
                    setSceneForm((prev) => ({
                      ...prev,
                      sceneNumber: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </FormField>

              <FormField
                label="Duration (Minutes)"
                name="durationMinutes"
                required
                helpText="Estimated scene duration"
              >
                <Input
                  id="durationMinutes"
                  type="number"
                  min="0"
                  step="0.5"
                  value={sceneForm.durationMinutes || 0}
                  onChange={(e) =>
                    setSceneForm((prev) => ({
                      ...prev,
                      durationMinutes: parseFloat(e.target.value) || 0,
                    }))
                  }
                />
              </FormField>
            </FormGrid>

            <FormField
              label="Scene Name"
              name="sceneName"
              required
              helpText="Descriptive name for this scene"
            >
              <Input
                id="sceneName"
                value={sceneForm.sceneName || ''}
                onChange={(e) =>
                  setSceneForm((prev) => ({ ...prev, sceneName: e.target.value }))
                }
                placeholder="e.g., Hero's Call to Adventure, Final Confrontation"
              />
            </FormField>

            {/* Location and Time of Day */}
            <FormGrid columns={2}>
              <FormField
                label="Location"
                name="locationId"
                required
                helpText="Where does this scene take place?"
              >
                <Select
                  value={sceneForm.locationId || ''}
                  onValueChange={(value) =>
                    setSceneForm((prev) => ({ ...prev, locationId: value }))
                  }
                >
                  <SelectTrigger id="locationId">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {locations.length > 0 ? (
                      locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No locations defined
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField
                label="Time of Day"
                name="timeOfDay"
                required
                helpText="When does this scene occur?"
              >
                <Select
                  value={sceneForm.timeOfDay || 'unspecified'}
                  onValueChange={(value) =>
                    setSceneForm((prev) => ({
                      ...prev,
                      timeOfDay: value as SceneBreakdown['timeOfDay'],
                    }))
                  }
                >
                  <SelectTrigger id="timeOfDay">
                    <SelectValue placeholder="Select time of day" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {TIME_OF_DAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.icon} {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>

            {/* Characters */}
            <FormField
              label="Characters Present"
              name="characterIds"
              required
              helpText="Select all characters in this scene"
            >
              {characters.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {characters.map((character) => (
                    <Badge
                      key={character.id}
                      variant={
                        sceneForm.characterIds?.includes(character.id)
                          ? 'default'
                          : 'outline'
                      }
                      className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900"
                      onClick={() => handleToggleCharacter(character.id)}
                    >
                      {character.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No characters defined in previous steps</p>
              )}
            </FormField>

            {/* Emotional Beat */}
            <FormField
              label="Emotional Beat"
              name="emotionalBeat"
              helpText="The emotional tone or turning point of this scene"
            >
              <Input
                id="emotionalBeat"
                value={sceneForm.emotionalBeat || ''}
                onChange={(e) =>
                  setSceneForm((prev) => ({ ...prev, emotionalBeat: e.target.value }))
                }
                placeholder="e.g., Tension builds, Hope restored, Betrayal revealed"
              />
            </FormField>

            {/* Key Actions */}
            <FormField
              label="Key Actions"
              name="keyActions"
              helpText="Important events or actions that occur in this scene"
            >
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={keyActionInput}
                    onChange={(e) => setKeyActionInput(e.target.value)}
                    placeholder="e.g., Hero discovers the truth, Villain escapes"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyAction();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddKeyAction} variant="secondary">
                    Add
                  </Button>
                </div>
                {sceneForm.keyActions && sceneForm.keyActions.length > 0 && (
                  <ul className="space-y-1">
                    {sceneForm.keyActions.map((action, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded"
                      >
                        <span className="text-blue-500">•</span>
                        <span className="flex-1">{action}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveKeyAction(action)}
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSceneDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveScene}
              disabled={
                !sceneForm.sceneName ||
                !sceneForm.locationId ||
                !sceneForm.characterIds ||
                sceneForm.characterIds.length === 0
              }
              type="button"
            >
              {editingScene ? 'Update Scene' : 'Add Scene'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
