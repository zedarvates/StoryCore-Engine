// cspell:words lieux
import { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { ValidationErrorSummary } from '../ValidationErrorSummary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MapPin, Sparkles } from 'lucide-react';
import { useStore, useAppStore } from '@/store';
import type { LocationSelectionData, LocationCreationRequest, WorldContext, LocationReference } from '@/types/story';
import type { AppState } from '@/types';
import type { World, WorldRule } from '@/types/world';
import { createLocation } from '@/services/storyGenerationService';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
// Removed unused import
import { LLMErrorCategory, type ErrorRecoveryOptions } from '@/services/llmService';
import { saveLocationToProject, createLocationFromWizardData } from '@/utils/locationStorage';
import { useLocationStore } from '@/stores/locationStore';
import { useEditorStore } from '@/stores/editorStore';
// Removed unused import of RootState

// ============================================================================
// Location Card Component
// ============================================================================

interface LocationCardProps {
  readonly location: LocationReference;
  readonly isSelected: boolean;
  readonly onToggle: () => void;
}

function LocationCard({ location, isSelected, onToggle }: LocationCardProps) {
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 cursor-pointer transition-all
        ${isSelected
          ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }
      `}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}>
      <input
        type="checkbox"
        className="opacity-0 absolute inset-0"
        checked={isSelected}
        onChange={onToggle}
        aria-label={`Select ${location.name}`}
      />
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{location.name}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {location.type || 'Location'}
          </p>
          {location.significance && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {location.significance}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <div 
            className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
              isSelected 
                ? 'bg-green-500 border-green-500 text-white' 
                : 'border-gray-300 bg-white'
            }`}
            aria-hidden="true">
            {isSelected && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Location Selection
// ============================================================================

export function Step3LocationSelection(): JSX.Element {
  const { formData, updateFormData, validationErrors } = useWizard<LocationSelectionData>();
  const currentWorld = useStore((state: AppState) => state.worlds?.find((w: World) => w.id === state.selectedWorldId));
  const locations = currentWorld?.locations || [];
  
  // Get project path for saving locations
  const { projectPath } = useEditorStore();
  const { fetchProjectLocations } = useLocationStore();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<ErrorRecoveryOptions | null>(null);
  const [newLocation, setNewLocation] = useState<LocationCreationRequest>({
    name: '',
    type: '',
    description: '',
  });

  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  const selectedLocations = formData.selectedLocations || [];

  const handleToggleLocation = (location: LocationReference) => {
    const isSelected = selectedLocations.some(l => l.id === location.id);
    
    if (isSelected) {
      updateFormData({
        selectedLocations: selectedLocations.filter(l => l.id !== location.id),
      });
    } else {
      updateFormData({
        selectedLocations: [
          ...selectedLocations,
          {
            id: location.id,
            name: location.name,
            significance: location.significance || location.type || 'Location',
          },
        ],
      });
    }
  };

  const handleCreateLocation = async () => {
    // Refactored negated condition for clarity
    if (newLocation.name && newLocation.type) {
      // proceed with creation
    } else {
      setCreateError({
        message: 'Name and type are required',
        userMessage: 'Name and type are required',
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
        rules: (currentWorld.rules || []).map((rule: WorldRule) => ({
          id: rule.id,
          category: rule.category,
          rule: rule.rule,
          description: rule.implications || '', // Map implications to description
        })),
        culturalElements: currentWorld.culturalElements || {},
        atmosphere: currentWorld.atmosphere || '',
      } : undefined;

      // Call LLM service to create location (worldContext is optional)
      const createdLocation = await createLocation(newLocation, worldContext);

      // Get project ID from project path
      const projectId = projectPath?.split(/[/\\]/).pop() || 'unknown';

      // Save location to project's lieux folder as JSON file
      if (projectPath && projectId !== 'unknown') {
        const locationData = createLocationFromWizardData(
          createdLocation.id,
          {
            name: createdLocation.name,
            type: createdLocation.type || 'generic',
            description: createdLocation.description || newLocation.description || '',
          },
          { projectId, worldId: currentWorld?.id }
        );
        
        await saveLocationToProject(projectId, createdLocation.id, locationData);
        
        // Refresh project locations in the store
        await fetchProjectLocations(projectId);
      }

      // Add to world locations (update world in store)
      if (currentWorld) {
        const updateWorld = useStore.getState().updateWorld;
        updateWorld(currentWorld.id, {
          locations: [...locations, createdLocation],
        });
      }

      // Add to selected locations
      updateFormData({
        selectedLocations: [
          ...selectedLocations,
          {
            id: createdLocation.id,
            name: createdLocation.name,
            significance: createdLocation.significance || newLocation.type,
          },
        ],
      });

      // Close dialog and reset form
      setShowCreateDialog(false);
      setNewLocation({ name: '', type: '', description: '' });
    } catch (error) {
      console.error('Failed to create location:', error);
      setCreateError({
        message: error instanceof Error ? error.message : 'Failed to create location',
        userMessage: error instanceof Error ? error.message : 'Failed to create location',
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
      title="Select Locations"
      description="Choose locations for your story or create new ones"
    >
      {/* Validation Error Summary */}
      <ValidationErrorSummary errors={validationErrors} className="mb-6" />

      {/* Service Warning */}
      {llmConfigured ? null : (
        <ServiceWarning
          service="llm"
          variant="inline"
          onConfigure={() => setShowLLMSettings(true)}
          className="mb-6"
        />
      )}

      {/* Selected Count */}
      <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-md">
        <p className="text-sm text-green-900 dark:text-green-100">
          <strong>{selectedLocations.length}</strong> location{selectedLocations.length !== 1 ? 's' : ''} selected
        </p>
      </div>

      {/* Location Grid */}
      {locations.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              location={location}
              isSelected={selectedLocations.some(l => l.id === location.id)}
              onToggle={() => handleToggleLocation(location)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 mb-6">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No locations available. Create your first location to get started.
          </p>
        </div>
      )}

      {/* Create New Location Button */}
      <Button
        onClick={() => setShowCreateDialog(true)}
        variant="outline"
        className="w-full gap-2"
        disabled={!llmConfigured}
      >
        <Plus className="w-4 h-4" />
        Create New Location
      </Button>

      {/* Info Box */}
      <div className="mt-6 bg-amber-50 dark:bg-amber-950/20 p-4 rounded-md">
        <p className="text-sm text-amber-900 dark:text-amber-100">
          💡 <strong>Tip:</strong> You can select multiple locations or proceed without any. 
          The AI will use selected locations in the story or create new ones as needed.
        </p>
      </div>

      {/* Create Location Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              Create New Location
            </DialogTitle>
            <DialogDescription>
              Provide basic information and the AI will generate a complete location profile
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="new-location-name">
                Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-location-name"
                value={newLocation.name}
                onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                placeholder="e.g., The Crystal Caverns"
                disabled={isCreating}
              />
            </div>

            {/* Type */}
            <div className="space-y-2">
              <Label htmlFor="new-location-type">
                Type <span className="text-red-600">*</span>
              </Label>
              <Input
                id="new-location-type"
                value={newLocation.type}
                onChange={(e) => setNewLocation({ ...newLocation, type: e.target.value })}
                placeholder="e.g., Cave, City, Forest, Building"
                disabled={isCreating}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="new-location-description">
                Description <span className="text-muted-foreground ml-1">(Optional)</span>
              </Label>
              <Textarea
                id="new-location-description"
                value={newLocation.description}
                onChange={(e) => setNewLocation({ ...newLocation, description: e.target.value })}
                placeholder="Brief description of the location's atmosphere or significance"
                rows={3}
                disabled={isCreating}
              />
            </div>

            {/* Loading State */}
            {isCreating && (
              <LLMLoadingState message="Creating location with AI..." showProgress />
            )}

            {/* Error Display */}
            {createError && (
              <LLMErrorDisplay
                error={createError}
                onRetry={handleCreateLocation}
                onDismiss={() => setCreateError(null)}
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateDialog(false);
                setNewLocation({ name: '', type: '', description: '' });
                setCreateError(null);
              }}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLocation}
              disabled={isCreating || !newLocation.name || !newLocation.type || !llmConfigured}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Location'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
