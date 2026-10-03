/**
 * Step 8: Shot Planning (Plan & Séquence)
 * Allows users to plan individual shots for each scene with detailed camera work
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Camera, Film, BarChart3, AlertCircle } from 'lucide-react';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItemWithDescription,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-rich';
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
  ShotPlan,
  ShotType,
  CameraAngle,
  CameraMovement,
  Transition,
  SceneBreakdown,
} from '@/types/wizard';

// ============================================================================
// Shot Type Options
// ============================================================================

const SHOT_TYPE_OPTIONS: {
  value: ShotType;
  label: string;
  description: string;
}[] = [
  { value: 'extreme-wide', label: 'Extreme Wide Shot', description: 'Establishes environment' },
  { value: 'wide', label: 'Wide Shot', description: 'Shows full subject and surroundings' },
  { value: 'medium', label: 'Medium Shot', description: 'Waist up, conversational' },
  { value: 'close-up', label: 'Close-Up', description: 'Face or object detail' },
  { value: 'extreme-close-up', label: 'Extreme Close-Up', description: 'Intense detail focus' },
  { value: 'over-the-shoulder', label: 'Over-the-Shoulder', description: 'Dialogue perspective' },
  { value: 'pov', label: 'POV', description: "Character's point of view" },
];

// ============================================================================
// Camera Angle Options
// ============================================================================

const CAMERA_ANGLE_OPTIONS: {
  value: CameraAngle;
  label: string;
  description: string;
}[] = [
  { value: 'eye-level', label: 'Eye Level', description: 'Neutral, natural perspective' },
  { value: 'high-angle', label: 'High Angle', description: 'Looking down, diminishes subject' },
  { value: 'low-angle', label: 'Low Angle', description: 'Looking up, empowers subject' },
  { value: 'dutch-angle', label: 'Dutch Angle', description: 'Tilted, creates unease' },
  { value: 'birds-eye', label: "Bird's Eye", description: 'Directly overhead' },
  { value: 'worms-eye', label: "Worm's Eye", description: 'Directly below' },
];

// ============================================================================
// Camera Movement Options
// ============================================================================

const CAMERA_MOVEMENT_OPTIONS: {
  value: CameraMovement;
  label: string;
  description: string;
}[] = [
  { value: 'static', label: 'Static', description: 'Fixed position' },
  { value: 'pan', label: 'Pan', description: 'Horizontal rotation' },
  { value: 'tilt', label: 'Tilt', description: 'Vertical rotation' },
  { value: 'dolly', label: 'Dolly', description: 'Move toward/away' },
  { value: 'track', label: 'Track', description: 'Follow subject laterally' },
  { value: 'zoom', label: 'Zoom', description: 'Lens focal length change' },
  { value: 'handheld', label: 'Handheld', description: 'Dynamic, intimate feel' },
  { value: 'crane', label: 'Crane', description: 'Vertical movement' },
];

// ============================================================================
// Transition Options
// ============================================================================

const TRANSITION_OPTIONS: {
  value: Transition;
  label: string;
  description: string;
}[] = [
  { value: 'cut', label: 'Cut', description: 'Instant transition' },
  { value: 'fade', label: 'Fade', description: 'Gradual to/from black' },
  { value: 'dissolve', label: 'Dissolve', description: 'Blend between shots' },
  { value: 'wipe', label: 'Wipe', description: 'One shot replaces another' },
  { value: 'match-cut', label: 'Match Cut', description: 'Visual/thematic connection' },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step8_ShotPlanningProps {
  data: ShotPlan[] | null;
  onUpdate: (data: ShotPlan[]) => void;
  errors?: Record<string, string>;
  // Context from previous steps
  scenes?: SceneBreakdown[];
}

// ============================================================================
// Component
// ============================================================================

export function Step8_ShotPlanning({
  data,
  onUpdate,
  errors = {},
  scenes = [],
}: Step8_ShotPlanningProps) {
  // State
  const [shots, setShots] = useState<ShotPlan[]>(data || []);
  const [selectedSceneId, setSelectedSceneId] = useState<string>(
    scenes.length > 0 ? scenes[0].id : ''
  );
  const [isShotDialogOpen, setIsShotDialogOpen] = useState(false);
  const [editingShot, setEditingShot] = useState<ShotPlan | null>(null);

  // Shot form state
  const [shotForm, setShotForm] = useState<Partial<ShotPlan>>({
    shotNumber: 1,
    shotType: 'medium',
    cameraAngle: 'eye-level',
    cameraMovement: 'static',
    transition: 'cut',
    compositionNotes: '',
  });

  // Update parent when shots change
  useEffect(() => {
    onUpdate(shots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shots]); // Only depend on shots, not onUpdate

  // Get shots for selected scene
  const sceneShotsFiltered = shots.filter((shot) => shot.sceneId === selectedSceneId);
  const sortedSceneShots = [...sceneShotsFiltered].sort((a, b) => a.order - b.order);

  // Calculate statistics
  const totalShots = shots.length;
  const shotsPerScene = scenes.map((scene) => ({
    sceneId: scene.id,
    sceneName: scene.sceneName,
    sceneNumber: scene.sceneNumber,
    shotCount: shots.filter((shot) => shot.sceneId === scene.id).length,
  }));
  const scenesWithoutShots = shotsPerScene.filter((s) => s.shotCount === 0);

  // Handle scene selection
  const handleSceneChange = (sceneId: string) => {
    setSelectedSceneId(sceneId);
  };

  // Handle shot dialog open
  const handleAddShot = () => {
    if (!selectedSceneId) return;

    setEditingShot(null);
    const sceneShots = shots.filter((s) => s.sceneId === selectedSceneId);
    const nextShotNumber = sceneShots.length > 0 
      ? Math.max(...sceneShots.map(s => s.shotNumber)) + 1 
      : 1;
    
    setShotForm({
      shotNumber: nextShotNumber,
      shotType: 'medium',
      cameraAngle: 'eye-level',
      cameraMovement: 'static',
      transition: 'cut',
      compositionNotes: '',
    });
    setIsShotDialogOpen(true);
  };

  // Handle shot edit
  const handleEditShot = (shot: ShotPlan) => {
    setEditingShot(shot);
    setShotForm(shot);
    setIsShotDialogOpen(true);
  };

  // Handle shot save
  const handleSaveShot = () => {
    if (!selectedSceneId) return;

    const newShot: ShotPlan = {
      id: editingShot?.id || `shot-${Date.now()}`,
      sceneId: selectedSceneId,
      shotNumber: shotForm.shotNumber || 1,
      shotType: shotForm.shotType || 'medium',
      cameraAngle: shotForm.cameraAngle || 'eye-level',
      cameraMovement: shotForm.cameraMovement || 'static',
      transition: shotForm.transition || 'cut',
      compositionNotes: shotForm.compositionNotes || '',
      order: editingShot?.order || sceneShotsFiltered.length,
    };

    if (editingShot) {
      // Update existing shot
      setShots((prev) =>
        prev.map((s) => (s.id === editingShot.id ? newShot : s))
      );
    } else {
      // Add new shot
      setShots((prev) => [...prev, newShot]);
    }

    setIsShotDialogOpen(false);
    setShotForm({
      shotNumber: 1,
      shotType: 'medium',
      cameraAngle: 'eye-level',
      cameraMovement: 'static',
      transition: 'cut',
      compositionNotes: '',
    });
  };

  // Handle shot delete
  const handleDeleteShot = (shotId: string) => {
    setShots((prev) => prev.filter((s) => s.id !== shotId));
  };

  // Get scene name by ID
  const getSceneName = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    return scene ? `Scene ${scene.sceneNumber}: ${scene.sceneName}` : 'Unknown Scene';
  };

  // Get option label
  const getOptionLabel = (
    value: string,
    options: { value: string; label: string; description: string }[]
  ) => {
    return options.find((opt) => opt.value === value)?.label || value;
  };

  return (
    <WizardFormLayout
      title="Shot Planning (Plan & Séquence)"
      description="Plan individual shots for each scene with detailed camera work and composition"
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

      {/* Statistics Summary */}
      <div className="rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-lg text-blue-900 dark:text-blue-100">
                Shot Statistics
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {totalShots} total shots across {scenes.length} scenes
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {totalShots}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {scenes.length > 0 ? `~${Math.round(totalShots / scenes.length)} per scene` : 'No scenes'}
            </p>
          </div>
        </div>

        {/* Scenes without shots warning */}
        {scenesWithoutShots.length > 0 && (
          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                  Scenes Without Shots
                </p>
                <div className="flex flex-wrap gap-2">
                  {scenesWithoutShots.map((scene) => (
                    <Badge
                      key={scene.sceneId}
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900"
                      onClick={() => handleSceneChange(scene.sceneId)}
                    >
                      Scene {scene.sceneNumber}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scene Selector */}
      <FormSection
        title="Select Scene"
        description="Choose a scene to plan shots for"
      >
        {scenes.length > 0 ? (
          <div className="space-y-3">
            <Select value={selectedSceneId} onValueChange={handleSceneChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a scene" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
                {scenes.map((scene) => {
                  const shotCount = shots.filter((s) => s.sceneId === scene.id).length;
                  return (
                    <SelectItem key={scene.id} value={scene.id}>
                      <div className="flex items-center justify-between gap-4 w-full">
                        <span>Scene {scene.sceneNumber}: {scene.sceneName}</span>
                        <Badge variant="secondary" className="ml-2">
                          {shotCount} {shotCount === 1 ? 'shot' : 'shots'}
                        </Badge>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {/* Shot count per scene overview */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {shotsPerScene.map((scene) => (
                <Card
                  key={scene.sceneId}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedSceneId === scene.sceneId
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950'
                      : ''
                  }`}
                  onClick={() => handleSceneChange(scene.sceneId)}
                >
                  <CardContent className="p-3">
                    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      Scene {scene.sceneNumber}
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {scene.shotCount}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {scene.shotCount === 1 ? 'shot' : 'shots'}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
            <Film className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500 dark:text-gray-400">
              No scenes available. Please complete the Scene Breakdown step first.
            </p>
          </div>
        )}
      </FormSection>

      {/* Shot List for Selected Scene */}
      {selectedSceneId && (
        <FormSection
          title={`Shots for ${getSceneName(selectedSceneId)}`}
          description="Define camera work and composition for each shot"
        >
          {sortedSceneShots.length > 0 ? (
            <div className="space-y-3">
              {sortedSceneShots.map((shot) => (
                <Card key={shot.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Shot Number Badge */}
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {shot.shotNumber}
                          </span>
                        </div>
                      </div>

                      {/* Shot Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base mb-2">
                              Shot {shot.shotNumber}
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Type:</span>{' '}
                                <span className="font-medium">
                                  {getOptionLabel(shot.shotType, SHOT_TYPE_OPTIONS)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Angle:</span>{' '}
                                <span className="font-medium">
                                  {getOptionLabel(shot.cameraAngle, CAMERA_ANGLE_OPTIONS)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Movement:</span>{' '}
                                <span className="font-medium">
                                  {getOptionLabel(shot.cameraMovement, CAMERA_MOVEMENT_OPTIONS)}
                                </span>
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Transition:</span>{' '}
                                <span className="font-medium">
                                  {getOptionLabel(shot.transition, TRANSITION_OPTIONS)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditShot(shot)}
                              aria-label={`Edit shot ${shot.shotNumber}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteShot(shot.id)}
                              aria-label={`Delete shot ${shot.shotNumber}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Composition Notes */}
                        {shot.compositionNotes && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                              Composition Notes:
                            </p>
                            <p className="text-gray-700 dark:text-gray-300">
                              {shot.compositionNotes}
                            </p>
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
              <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No shots yet for this scene. Add your first shot to begin planning.
              </p>
            </div>
          )}

          {/* Add Shot Button */}
          <Button
            onClick={handleAddShot}
            variant="outline"
            className="w-full"
            type="button"
            disabled={!selectedSceneId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Shot
          </Button>
        </FormSection>
      )}

      {/* Shot Dialog */}
      <Dialog open={isShotDialogOpen} onOpenChange={setIsShotDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingShot ? 'Edit Shot' : 'Add Shot'}
            </DialogTitle>
            <DialogDescription>
              Define camera work and composition for this shot
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Shot Number */}
            <FormField
              label="Shot Number"
              name="shotNumber"
              required
              helpText="Sequential shot number within the scene"
            >
              <Input
                id="shotNumber"
                type="number"
                min="1"
                value={shotForm.shotNumber || 1}
                onChange={(e) =>
                  setShotForm((prev) => ({
                    ...prev,
                    shotNumber: parseInt(e.target.value) || 1,
                  }))
                }
              />
            </FormField>

            {/* Shot Type */}
            <FormField
              label="Shot Type"
              name="shotType"
              required
              helpText="The framing and distance of the shot"
            >
              <Select
                value={shotForm.shotType || 'medium'}
                onValueChange={(value) =>
                  setShotForm((prev) => ({ ...prev, shotType: value as ShotType }))
                }
              >
                <SelectTrigger id="shotType">
                  <SelectValue placeholder="Select shot type" />
                </SelectTrigger>
<SelectContent className="z-[9999]">
                  {SHOT_TYPE_OPTIONS.map((option) => (
                    <SelectItemWithDescription
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Camera Angle */}
            <FormField
              label="Camera Angle"
              name="cameraAngle"
              required
              helpText="The vertical perspective of the camera"
            >
              <Select
                value={shotForm.cameraAngle || 'eye-level'}
                onValueChange={(value) =>
                  setShotForm((prev) => ({ ...prev, cameraAngle: value as CameraAngle }))
                }
              >
                <SelectTrigger id="cameraAngle">
                  <SelectValue placeholder="Select camera angle" />
                </SelectTrigger>
<SelectContent className="z-[9999]">
                  {CAMERA_ANGLE_OPTIONS.map((option) => (
                    <SelectItemWithDescription
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Camera Movement */}
            <FormField
              label="Camera Movement"
              name="cameraMovement"
              required
              helpText="How the camera moves during the shot"
            >
              <Select
                value={shotForm.cameraMovement || 'static'}
                onValueChange={(value) =>
                  setShotForm((prev) => ({ ...prev, cameraMovement: value as CameraMovement }))
                }
              >
                <SelectTrigger id="cameraMovement">
                  <SelectValue placeholder="Select camera movement" />
                </SelectTrigger>
<SelectContent className="z-[9999]">
                  {CAMERA_MOVEMENT_OPTIONS.map((option) => (
                    <SelectItemWithDescription
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Transition */}
            <FormField
              label="Transition"
              name="transition"
              required
              helpText="How this shot transitions to the next"
            >
              <Select
                value={shotForm.transition || 'cut'}
                onValueChange={(value) =>
                  setShotForm((prev) => ({ ...prev, transition: value as Transition }))
                }
              >
                <SelectTrigger id="transition">
                  <SelectValue placeholder="Select transition" />
                </SelectTrigger>
<SelectContent className="z-[9999]">
                  {TRANSITION_OPTIONS.map((option) => (
                    <SelectItemWithDescription
                      key={option.value}
                      value={option.value}
                      label={option.label}
                      description={option.description}
                    />
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Composition Notes */}
            <FormField
              label="Composition Notes"
              name="compositionNotes"
              helpText="Visual composition details, lighting, focus, or special instructions"
            >
              <Textarea
                id="compositionNotes"
                value={shotForm.compositionNotes || ''}
                onChange={(e) =>
                  setShotForm((prev) => ({ ...prev, compositionNotes: e.target.value }))
                }
                placeholder="e.g., Rule of thirds, subject in left frame, soft lighting from window, shallow depth of field"
                rows={4}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsShotDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveShot} type="button">
              {editingShot ? 'Update Shot' : 'Add Shot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
