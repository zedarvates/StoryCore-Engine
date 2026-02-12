import { useState } from 'react';
import { Plus, Trash2, Sparkles, MapPin, Image as ImageIcon } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World, Location } from '@/types/world';
import { createEmptyLocation } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { saveLocationToProject, createLocationFromWizardData } from '@/utils/locationStorage';
import { useLocationStore } from '@/stores/locationStore';
import { useEditorStore } from '@/stores/editorStore';
import LocationImageGenerator from '../../location/editor/LocationImageGenerator';

// ============================================================================
// Step 3: Locations
// ============================================================================

export function Step3Locations() {
  const { formData, updateFormData } = useWizard<World>();
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const [imageGeneratorLocationId, setImageGeneratorLocationId] = useState<string | null>(null);
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  
  // Get project path for saving locations
  const projectPath = useEditorStore.getState().projectPath;
  const { fetchProjectLocations } = useLocationStore();

  const locations = formData.locations || [];

  // ============================================================================
  // Location Management
  // ============================================================================
  
  // Helper to save a location to the project's lieux folder
  const saveLocationToFile = async (location: Location) => {
    if (!projectPath) {
      console.warn('[Step3Locations] No project path available, skipping save');
      return;
    }
    
    const projectId = projectPath.split(/[/\\]/).pop() || 'unknown';
    if (projectId === 'unknown') return;
    
    try {
      // Cast location to any to access extended properties
      const locAny = location as any;
      const locationData = createLocationFromWizardData(
        location.id,
        {
          name: location.name,
          type: locAny.type || 'generic',
          description: location.description || '',
        },
        { projectId, worldId: formData.id || undefined }
      );
      
      // Add extended metadata if available
      if (locAny.significance) {
        (locationData.metadata as any).significance = locAny.significance;
      }
      if (locAny.atmosphere) {
        (locationData.metadata as any).atmosphere = locAny.atmosphere;
      }
      if (locAny.tile_image_path) {
        (locationData.metadata as any).tile_image_path = locAny.tile_image_path;
      }
      
      await saveLocationToProject(projectId, location.id, locationData);
    } catch (error) {
      console.error('[Step3Locations] Failed to save location:', error);
    }
  };

  const handleAddLocation = () => {
    const newLocation = createEmptyLocation();
    updateFormData({ locations: [...locations, newLocation] });
    setExpandedLocationId(newLocation.id);
  };

  const handleRemoveLocation = (locationId: string) => {
    updateFormData({ locations: locations.filter((l) => l.id !== locationId) });
    if (expandedLocationId === locationId) {
      setExpandedLocationId(null);
    }
  };

  const handleUpdateLocation = (locationId: string, updates: Partial<Location>) => {
    updateFormData({
      locations: locations.map((l) => (l.id === locationId ? { ...l, ...updates } : l)),
    });
    
    // Save updated location to file
    const updatedLocation = locations.find(l => l.id === locationId);
    if (updatedLocation) {
      saveLocationToFile({ ...updatedLocation, ...updates });
    }
  };

  const toggleLocationExpanded = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  // ============================================================================
  // LLM Generation - Helper Functions
  // ============================================================================

  const parseLLMLocations = (response: string): Location[] => {
    try {
      console.log('[Step3Locations] Parsing LLM response for locations');
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const parsedLocations = parsed.map((item: unknown) => ({
              id: crypto.randomUUID(),
              name: item.name || '',
              description: item.description || '',
              significance: item.significance || '',
              atmosphere: item.atmosphere || item.mood || '',
            })).filter((loc: unknown) => loc.name);
            
            if (parsedLocations.length > 0) {
              console.log('[Step3Locations] Successfully parsed', parsedLocations.length, 'locations from JSON');
              return parsedLocations;
            }
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      console.log('[Step3Locations] Falling back to text parsing');
      const parsedLocations: Location[] = [];
      const lines = response.split('\n');
      
      let currentLocation: Partial<Location> | null = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const nameMatch = trimmed.match(/^(?:\d+\.|[-*•])\s*(?:Name:?\s*)?(.+?)(?:\s*[-–—]\s*|$)/i);
        if (nameMatch && nameMatch[1].length > 2 && nameMatch[1].length < 50) {
          if (currentLocation && currentLocation.name) {
            parsedLocations.push({
              id: crypto.randomUUID(),
              name: currentLocation.name,
              description: currentLocation.description || '',
              significance: currentLocation.significance || '',
              atmosphere: currentLocation.atmosphere || '',
            });
          }
          currentLocation = { name: nameMatch[1].trim() };
          continue;
        }
        
        if (currentLocation && /description:/i.test(trimmed)) {
          currentLocation.description = trimmed.replace(/description:\s*/i, '').trim();
          continue;
        }
        
        if (currentLocation && /significance:/i.test(trimmed)) {
          currentLocation.significance = trimmed.replace(/significance:\s*/i, '').trim();
          continue;
        }
        
        if (currentLocation && /(atmosphere|mood):/i.test(trimmed)) {
          currentLocation.atmosphere = trimmed.replace(/(atmosphere|mood):\s*/i, '').trim();
          continue;
        }
        
        if (currentLocation && currentLocation.name && !currentLocation.description && trimmed.length > 20) {
          currentLocation.description = trimmed;
        }
      }
      
      if (currentLocation && currentLocation.name) {
        parsedLocations.push({
          id: crypto.randomUUID(),
          name: currentLocation.name,
          description: currentLocation.description || '',
          significance: currentLocation.significance || '',
          atmosphere: currentLocation.atmosphere || '',
        });
      }
      
      if (parsedLocations.length > 0) {
        console.log('[Step3Locations] Successfully parsed', parsedLocations.length, 'locations from text');
        return parsedLocations;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any locations from response');
    return [];
  };

  const handleGenerateLocations = async () => {
    clearError?.();

    const context = {
      worldName: formData.name || 'the world',
      genre: formData.genre || [],
      timePeriod: formData.timePeriod || '',
      tone: formData.tone || [],
    };

    const systemPrompt = 'You are a creative world-building assistant. Generate vivid, memorable locations.';

    const prompt = `Generate 3-5 key locations for "${context.worldName}":
- Genre: ${context.genre.join(', ')}
- Time Period: ${context.timePeriod}
- Tone: ${context.tone.join(', ')}

Format as JSON array with: name, description, significance, atmosphere`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1200,
    });
  };

  // ============================================================================
  // LLM Generation Hook
  // ============================================================================

  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: async (response) => {
      const generatedLocations = parseLLMLocations(response.content);
      if (generatedLocations.length > 0) {
        updateFormData({ locations: [...locations, ...generatedLocations] });
        
        const projectId = projectPath?.split(/[/\\]/).pop() || 'unknown';
        if (projectPath && projectId !== 'unknown') {
          for (const location of generatedLocations) {
            await saveLocationToFile(location);
          }
          await fetchProjectLocations(projectId);
        }
      }
    },
  });

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <WizardFormLayout
      title="Key Locations"
      description="Define the important places in your world"
    >
      {/* LLM Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate location suggestions
            </p>
          </div>
          <Button
            onClick={handleGenerateLocations}
            disabled={isLoading || !formData.name || !llmConfigured}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? 'Generating...' : 'Generate Locations'}
          </Button>
        </div>

        {!llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
            className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          />
        )}

        {isLoading && (
          <LLMLoadingState message="Generating key locations..." showProgress />
        )}

        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateLocations}
            onDismiss={() => clearError?.()}
          />
        )}
      </div>

      {/* Locations List */}
      <FormSection
        title="Locations"
        description="Add and describe the key locations"
      >
        <div className="space-y-4">
          {locations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                No locations added yet.
              </p>
              <Button onClick={handleAddLocation} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add First Location
              </Button>
            </div>
          ) : (
            <>
              {locations.map((location) => {
                const isExpanded = expandedLocationId === location.id;

                return (
                  <Card key={location.id} className="border-2">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          onClick={() => toggleLocationExpanded(location.id)}
                          className="flex-1 text-left"
                        >
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {location.name || 'Unnamed Location'}
                          </CardTitle>
                          {location.description && !isExpanded && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {location.description}
                            </p>
                          )}
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLocation(location.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          aria-label="Delete location"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    {isExpanded && (
                      <CardContent className="space-y-4">
                        {/* Name */}
                        <FormField
                          label="Location Name"
                          name={`location-${location.id}-name`}
                          required
                        >
                          <Input
                            value={location.name}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, { name: e.target.value })
                            }
                            placeholder="e.g., The Crystal Spire"
                          />
                        </FormField>

                        {/* Description */}
                        <FormField
                          label="Description"
                          name={`location-${location.id}-description`}
                          required
                          helpText="Vivid description"
                        >
                          <Textarea
                            value={location.description}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, { description: e.target.value })
                            }
                            placeholder="Describe the location..."
                            rows={3}
                          />
                        </FormField>

                        {/* Significance */}
                        <FormField
                          label="Significance"
                          name={`location-${location.id}-significance`}
                          helpText="Why is this location important?"
                        >
                          <Textarea
                            value={(location as any).significance || ''}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, { significance: e.target.value })
                            }
                            placeholder="..."
                            rows={2}
                          />
                        </FormField>

                        {/* Atmosphere */}
                        <FormField
                          label="Atmosphere"
                          name={`location-${location.id}-atmosphere`}
                          helpText="The mood of this place"
                        >
                          <Input
                            value={(location as any).atmosphere || ''}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, { atmosphere: e.target.value })
                            }
                            placeholder="e.g., Eerie and foreboding"
                          />
                        </FormField>

                        {/* Tile Image Preview */}
                        <FormField
                          label="Tile Image"
                          name={`location-${location.id}-tile-image`}
                          helpText="Visual representation of the location"
                        >
                          <div className="space-y-3">
                            {(location as any).tile_image_path ? (
                              <div className="relative inline-block">
                                <img
                                  src={(location as any).tile_image_path}
                                  alt={`Tile image for ${location.name}`}
                                  className="w-32 h-32 object-cover rounded-lg border"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                                  onClick={() => handleUpdateLocation(location.id, { tile_image_path: undefined })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : null}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setImageGeneratorLocationId(
                                imageGeneratorLocationId === location.id ? null : location.id
                              )}
                              className="gap-2"
                            >
                              <ImageIcon className="h-4 w-4" />
                              {imageGeneratorLocationId === location.id ? 'Hide Generator' : 'Generate Tile Image'}
                            </Button>
                          </div>
                        </FormField>

                        {/* Image Generator */}
                        {imageGeneratorLocationId === location.id && (
                          <LocationImageGenerator
                            location={{
                              id: location.id,
                              name: location.name,
                              metadata: {
                                description: location.description,
                                atmosphere: (location as any).atmosphere,
                                significance: (location as any).significance,
                              }
                            }}
                            onImageGenerated={(imageUrl) => {
                              handleUpdateLocation(location.id, { tile_image_path: imageUrl });
                              setImageGeneratorLocationId(null);
                            }}
                          />
                        )}
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              <Button
                variant="outline"
                onClick={handleAddLocation}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Location
              </Button>
            </>
          )}
        </div>
      </FormSection>
    </WizardFormLayout>
  );
}



