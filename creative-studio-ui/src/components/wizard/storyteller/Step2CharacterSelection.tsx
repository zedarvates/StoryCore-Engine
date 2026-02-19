import { useState, useCallback } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Sparkles, Users, Bookmark } from 'lucide-react';
import { useStore } from '@/store';
import type { CharacterSelectionData, CharacterCreationRequest, WorldContext } from '@/types/story';
import type { Character } from '@/types/character';
import { createCharacter } from '@/services/storyGenerationService';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { LLMErrorCategory, type ErrorRecoveryOptions } from '@/services/llmService';
import { CharacterList } from '@/components/character/CharacterList';
import { eventEmitter } from '@/services/eventEmitter';
import {
  getCharacterTemplatesByGenre,
  characterTemplateToReference,
  type CharacterTemplate
} from '@/services/globalTemplatesService';

// ============================================================================
// Step 2: Character Selection
// ============================================================================

export function Step2CharacterSelection() {
  const { formData, updateFormData, validationErrors } = useWizard<CharacterSelectionData>();
  const addCharacter = useStore((state) => state.addCharacter);
  const currentWorld = useStore((state) => state.worlds?.find(w => w.id === state.selectedWorldId));

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<ErrorRecoveryOptions | null>(null);
  const [newCharacter, setNewCharacter] = useState<CharacterCreationRequest>({
    name: '',
    role: '',
    description: '',
  });

  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Get character templates based on selected genre (from global templates)
  const genreFromWizard = (formData as any).genre || [];
  const characterTemplates = getCharacterTemplatesByGenre(genreFromWizard);

  // Get selected character IDs from form data
  const selectedCharacterIds = (formData.selectedCharacters || []).map(c => c.id);

  /**
   * Handle selecting a template character
   */
  const handleSelectTemplate = useCallback((template: CharacterTemplate) => {
    const templateRef = characterTemplateToReference(template);

    // Check if already selected
    if (selectedCharacterIds.includes(template.id)) {
      return;
    }

    // Add to selected characters
    updateFormData({
      selectedCharacters: [
        ...(formData.selectedCharacters || []),
        templateRef
      ]
    });
  }, [selectedCharacterIds, formData.selectedCharacters, updateFormData]);

  /**
   * Handle character selection changes
   * Requirements: 4.2, 4.5
   */
  const handleSelectionChange = useCallback((ids: string[]) => {
    // Get all characters from store
    const allCharacters = useStore.getState().characters || [];

    // Map IDs to character summary objects
    const selectedCharacters = ids.map(id => {
      const character = allCharacters.find(c => c.character_id === id);
      if (!character) return null;

      return {
        id: character.character_id,
        name: character.name,
        role: character.role?.archetype || 'Character',
      };
    }).filter(Boolean) as Array<{ id: string; name: string; role: string }>;

    updateFormData({
      selectedCharacters,
    });
  }, [updateFormData]);

  /**
   * Handle character creation from story context
   * Requirements: 3.2, 3.5
   */
  const handleCreateCharacter = async () => {
    if (!newCharacter.name || !newCharacter.role) {
      setCreateError({
        message: 'Name and role are required',
        userMessage: 'Name and role are required',
        actions: [],
        retryable: false,
        category: LLMErrorCategory.INVALID_REQUEST,
      });
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // Build world context - map WorldRule to story WorldRule format
      const worldContext: WorldContext | undefined = currentWorld ? {
        id: currentWorld.id,
        name: currentWorld.name,
        genre: currentWorld.genre || [],
        tone: currentWorld.tone || [],
        rules: (currentWorld.rules || []).map(rule => ({
          id: rule.id,
          category: rule.category,
          rule: rule.rule,
          description: rule.implications || '', // Map implications to description
        })),
        culturalElements: currentWorld.culturalElements || {},
        atmosphere: currentWorld.atmosphere || '',
      } : undefined;

      // Call LLM service to create character (worldContext is optional)
      const createdCharacter = await createCharacter(newCharacter, worldContext);

      // Add to store
      addCharacter(createdCharacter);

      // Emit character-created event for real-time updates
      // Requirement: 3.4, 12.1
      eventEmitter.emit('character-created', {
        character: createdCharacter,
        source: 'wizard',
        timestamp: new Date(),
      });

      // Auto-select the newly created character
      // Requirement: 3.5
      const newSelectedIds = [...selectedCharacterIds, createdCharacter.character_id];
      handleSelectionChange(newSelectedIds);

      // Close dialog and reset form
      setShowCreateDialog(false);
      setNewCharacter({ name: '', role: '', description: '' });
    } catch (error) {
      console.error('Failed to create character:', error);
      setCreateError({
        message: error instanceof Error ? error.message : 'Failed to create character',
        userMessage: error instanceof Error ? error.message : 'Failed to create character',
        actions: [],
        retryable: true,
        category: LLMErrorCategory.UNKNOWN,
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <WizardFormLayout
      title="Select Characters"
      description="Choose characters for your story or create new ones"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* Service Warning */}
      {!llmConfigured && (
        <ServiceWarning
          service="llm"
          variant="inline"
          onConfigure={() => setShowLLMSettings(true)}
          className="mb-6"
        />
      )}

      {/* Selected Count */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>{selectedCharacterIds.length}</strong> character{selectedCharacterIds.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Character List with Selection Mode */}
      {/* Requirements: 4.1, 4.2, 4.3 */}
      <div className="mb-6">
        <CharacterList
          selectable={true}
          selectedIds={selectedCharacterIds}
          onSelectionChange={handleSelectionChange}
          showActions={false}
        />
      </div>

      {/* Global Templates Section */}
      {characterTemplates.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Bookmark className="w-4 h-4 text-purple-500" />
            <Label className="text-sm font-semibold">Quick Start Templates</Label>
            <span className="text-xs text-muted-foreground">(Outside project - click to add)</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {characterTemplates.map((template) => {
              const isSelected = selectedCharacterIds.includes(template.id);
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  disabled={isSelected}
                  className={`p-3 rounded-lg border text-left transition-all ${isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-950/20 cursor-default'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 cursor-pointer'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{template.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{template.role}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Create New Character Button */}
      {/* Requirements: 3.2 */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        variant="outline"
        className="w-full gap-2"
        disabled={!llmConfigured}
      >
        <Plus className="w-4 h-4" />
        Create New Character
      </Button>

      {/* Info Box */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          💡 <strong>Tip:</strong> You can select multiple characters or proceed without any.
          The AI will use selected characters in the story or create new ones as needed.
        </p>
      </div>

      {/* Create Character Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              Create New Character
            </DialogTitle>
            <DialogDescription>
              Provide basic information and the AI will generate a complete character profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="new-character-name">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-character-name"
                value={newCharacter.name}
                onChange={(e) => setNewCharacter({ ...newCharacter, name: e.target.value })}
                placeholder="e.g., Aria Stormwind"
                disabled={isCreating}
              />
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="new-character-role">
                Role <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-character-role"
                value={newCharacter.role}
                onChange={(e) => setNewCharacter({ ...newCharacter, role: e.target.value })}
                placeholder="e.g., Protagonist, Mentor, Villain"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="new-character-description">
                Description
                <span className="text-muted-foreground ml-1">(Optional)</span>
              </Label>
              <Textarea
                id="new-character-description"
                value={newCharacter.description}
                onChange={(e) => setNewCharacter({ ...newCharacter, description: e.target.value })}
                placeholder="Brief description of the character's personality or background"
                rows={3}
                disabled={isCreating}
              />
            </div>

            {/* Loading State */}
            {isCreating && (
              <LLMLoadingState message="Creating character with AI..." showProgress />
            )}

            {/* Error Display */}
            {createError && (
              <LLMErrorDisplay
                error={createError}
                onRetry={handleCreateCharacter}
                onDismiss={() => setCreateError(null)}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewCharacter({ name: '', role: '', description: '' });
                setCreateError(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCharacter}
              disabled={isCreating || !newCharacter.name || !newCharacter.role || !llmConfigured}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Character'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
