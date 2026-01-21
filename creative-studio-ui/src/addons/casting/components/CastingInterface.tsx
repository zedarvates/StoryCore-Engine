import { useState } from 'react';
import { Undo, Redo, BarChart3, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Character } from '@/types/character';
import type { Avatar } from '../types';
import { useCasting, useAvatarLoader, useCastingAnalytics } from '../hooks';
import { CastingManager } from '../CastingManager';
import { CharacterCard } from './CharacterCard';
import { AssetBrowser } from './AssetBrowser';
import { CastingAnalytics as AnalyticsDashboard } from './CastingAnalytics';

interface CastingInterfaceProps {
  characters: Character[];
  manager: CastingManager;
  onAnalyticsClick?: () => void;
}

export function CastingInterface({
  characters,
  manager,
  onAnalyticsClick
}: CastingInterfaceProps) {
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showAssetBrowser, setShowAssetBrowser] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const {
    assignments,
    assignActor,
    replaceActor,
    undo,
    redo,
    canUndo,
    canRedo,
    isLoading,
    error
  } = useCasting(manager);

  const {
    avatars,
    loadAvatars,
    isLoading: avatarsLoading,
    error: avatarsError
  } = useAvatarLoader(manager);

  const { analytics } = useCastingAnalytics(manager);

  // Load avatars on mount
  React.useEffect(() => {
    loadAvatars('./assets/avatars'); // TODO: Get actual path from project
  }, [loadAvatars]);

  const getAssignedAvatar = (characterId: string): Avatar | null => {
    const assignment = assignments.find(a => a.characterId === characterId);
    if (!assignment) return null;
    return avatars.find(a => a.id === assignment.avatarId) || null;
  };

  const handleCastOrReplace = async (character: Character) => {
    setSelectedCharacter(character);
    setShowAssetBrowser(true);
  };

  const handleAvatarSelect = async (avatar: Avatar) => {
    if (!selectedCharacter) return;

    const hasAssignment = assignments.some(a => a.characterId === selectedCharacter.character_id);

    try {
      if (hasAssignment) {
        await replaceActor(selectedCharacter.character_id, avatar.id);
      } else {
        await assignActor(selectedCharacter.character_id, avatar.id);
      }
    } catch (err) {
      console.error('Failed to assign avatar:', err);
    }

    setShowAssetBrowser(false);
    setSelectedCharacter(null);
  };

  const handleUndo = async () => {
    await undo();
  };

  const handleRedo = async () => {
    await redo();
  };

  const handleAnalyticsToggle = () => {
    setShowAnalytics(!showAnalytics);
    onAnalyticsClick?.();
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Character Casting</h2>
          <p className="text-muted-foreground">
            Assign avatar assets to character roles for consistent visual representation
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleUndo}
            disabled={!canUndo || isLoading}
          >
            <Undo className="w-4 h-4 mr-2" />
            Undo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedo}
            disabled={!canRedo || isLoading}
          >
            <Redo className="w-4 h-4 mr-2" />
            Redo
          </Button>

          {/* Analytics */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyticsToggle}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg text-destructive">
          {error}
        </div>
      )}

      {/* Character Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {characters.map((character) => (
          <CharacterCard
            key={character.character_id}
            character={character}
            assignedAvatar={getAssignedAvatar(character.character_id)}
            onCast={() => handleCastOrReplace(character)}
            onReplace={() => handleCastOrReplace(character)}
            isSelected={selectedCharacter?.character_id === character.character_id}
          />
        ))}
      </div>

      {/* Empty State */}
      {characters.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No Characters Available</h3>
          <p className="text-sm text-center max-w-md">
            Create characters using the Character Wizard first, then return here to assign actors.
          </p>
        </div>
      )}

      {/* Asset Browser Modal */}
      {showAssetBrowser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {selectedCharacter ? `Select Actor for ${selectedCharacter.name}` : 'Select Actor'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAssetBrowser(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-4">
              <AssetBrowser
                avatars={avatars}
                onAvatarSelect={handleAvatarSelect}
                isLoading={avatarsLoading}
                error={avatarsError}
              />
            </div>
          </div>
        </div>
      )}

      {/* Analytics Dashboard */}
      {showAnalytics && analytics && (
        <div className="mt-8">
          <AnalyticsDashboard analytics={analytics} />
        </div>
      )}
    </div>
  );
}
