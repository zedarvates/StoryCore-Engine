import React from 'react';
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SceneReference } from '../types';

interface SceneImpactViewProps {
  affectedScenes: SceneReference[];
  characterId: string;
  characterName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function SceneImpactView({
  affectedScenes,
  characterId,
  characterName,
  onConfirm,
  onCancel,
  isProcessing = false
}: SceneImpactViewProps) {
  const sceneCount = affectedScenes.length;

  return (
    <div className="space-y-6">
      {/* Warning Header */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-medium text-amber-800 dark:text-amber-200">
            Actor Change Impact
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            Changing the actor for <strong>{characterName}</strong> will affect{' '}
            <strong>{sceneCount}</strong> scene{sceneCount !== 1 ? 's' : ''}.
            The story generation system will need to regenerate these scenes with the new actor.
          </p>
        </div>
      </div>

      {/* Affected Scenes List */}
      <div className="space-y-4">
        <h4 className="font-medium">Affected Scenes</h4>

        {sceneCount === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">No scenes affected</p>
              <p className="text-sm text-green-700 dark:text-green-300">
                This character doesn't appear in any scenes yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {affectedScenes.map((scene) => (
              <SceneItem key={scene.sceneId} scene={scene} />
            ))}
          </div>
        )}
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <div>
            <p className="font-medium text-blue-800 dark:text-blue-200">Processing changes...</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Updating scene references and preparing for regeneration.
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Confirm Change'}
        </Button>
      </div>
    </div>
  );
}

interface SceneItemProps {
  scene: SceneReference;
}

function SceneItem({ scene }: SceneItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Scene {scene.sceneId}</span>
          {scene.sceneTitle && (
            <span className="text-xs text-muted-foreground">• {scene.sceneTitle}</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Character appears in this scene
        </p>
      </div>

      <div className="text-xs text-muted-foreground">
        Will be marked for regeneration
      </div>
    </div>
  );
}