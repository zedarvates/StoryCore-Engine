import { useState } from 'react';
import { Plus, Trash2, Sparkles, MapPin } from 'lucide-react';
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

// ============================================================================
// Step 3: Locations
// ============================================================================

export function Step3Locations() {
  const { formData, updateFormData } = useWizard<World>();
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
  const { llmConfigured } = useServiceStatus();
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  const {
    generate,
    isLoading,
    error: llmError,
    clearError,
  } = useLLMGeneration({
    onSuccess: (response) => {
      const generatedLocations = parseLLMLocations(response.content);
      if (generatedLocations.length > 0) {
        updateFormData({ locations: [...locations, ...generatedLocations] });
      }
    },
  });

  const locations = formData.locations || [];

  // ============================================================================
  // Location Management
  // ============================================================================

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
  };

  const toggleLocationExpanded = (locationId: string) => {
    setExpandedLocationId(expandedLocationId === locationId ? null : locationId);
  };

  // ============================================================================
  // LLM Generation
  // ============================================================================

  const handleGenerateLocations = async () => {
    clearError();

    const context = {
      worldName: formData.name || 'the world',
      genre: formData.genre || [],
      timePeriod: formData.timePeriod || '',
      tone: formData.tone || [],
    };

    const systemPrompt = 'You are a creative world-building assistant. Generate vivid, memorable locations that fit the world\'s genre and tone.';

    const prompt = `Generate 3-5 key locations for a story world called "${context.worldName}" with these characteristics:
- Genre: ${context.genre.join(', ')}
- Time Period: ${context.timePeriod}
- Tone: ${context.tone.join(', ')}

For each location, provide:
1. Name (evocative and fitting)
2. Description (vivid, 2-3 sentences)
3. Significance (why this location matters to the story)
4. Atmosphere (the feeling/mood of this place)

Format as JSON array with objects containing: name, description, significance, atmosphere

Example:
[
  {
    "name": "The Crystal Spire",
    "description": "A towering structure of translucent crystal that pierces the clouds, refracting sunlight into rainbow patterns across the city below. Ancient runes glow faintly within its depths.",
    "significance": "The seat of magical power and where the Council of Mages convenes",
    "atmosphere": "Awe-inspiring yet intimidating, filled with ancient power"
  }
]`;

    await generate({
      prompt,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 1200,
    });
  };

  const parseLLMLocations = (response: string): Location[] => {
    try {
      ;
      
      // Try JSON parsing first
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed)) {
            const locations = parsed.map((item: any) => ({
              id: crypto.randomUUID(),
              name: item.name || '',
              description: item.description || '',
              significance: item.significance || '',
              atmosphere: item.atmosphere || item.mood || '',
            })).filter(loc => loc.name); // Only keep locations with names
            
            if (locations.length > 0) {
              ;
              return locations;
            }
          }
        } catch (jsonError) {
          console.warn('JSON parsing failed, trying text parsing');
        }
      }
      
      // Fallback: Parse as structured text
      ;
      const locations: Location[] = [];
      const lines = response.split('\n');
      
      let currentLocation: Partial<Location> | null = null;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        // Look for location name (often starts with number or dash)
        const nameMatch = trimmed.match(/^(?:\d+\.|[-*•])\s*(?:Name:?\s*)?(.+?)(?:\s*[-–—]\s*|$)/i);
        if (nameMatch && nameMatch[1].length > 2 && nameMatch[1].length < 50) {
          // Save previous location if exists
          if (currentLocation && currentLocation.name) {
            locations.push({
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
        
        // Look for description
        if (currentLocation && /description:/i.test(trimmed)) {
          currentLocation.description = trimmed.replace(/description:\s*/i, '').trim();
          continue;
        }
        
        // Look for significance
        if (currentLocation && /significance:/i.test(trimmed)) {
          currentLocation.significance = trimmed.replace(/significance:\s*/i, '').trim();
          continue;
        }
        
        // Look for atmosphere/mood
        if (currentLocation && /(atmosphere|mood):/i.test(trimmed)) {
          currentLocation.atmosphere = trimmed.replace(/(atmosphere|mood):\s*/i, '').trim();
          continue;
        }
        
        // If we have a location name but no description yet, and this is a substantial line
        if (currentLocation && currentLocation.name && !currentLocation.description && trimmed.length > 20) {
          currentLocation.description = trimmed;
        }
      }
      
      // Add the last location
      if (currentLocation && currentLocation.name) {
        locations.push({
          id: crypto.randomUUID(),
          name: currentLocation.name,
          description: currentLocation.description || '',
          significance: currentLocation.significance || '',
          atmosphere: currentLocation.atmosphere || '',
        });
      }
      
      if (locations.length > 0) {
        ;
        return locations;
      }
      
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.error('Response was:', response);
    }
    
    console.warn('Could not parse any locations from response');
    return [];
  };

  return (
    <WizardFormLayout
      title="Key Locations"
      description="Define the important places in your world where stories unfold"
    >
      {/* LLM Generation Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
            <p className="text-xs text-gray-500 mt-1">
              Generate location suggestions based on your world
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

        {/* Service Warning */}
        {!llmConfigured && (
          <ServiceWarning
            service="llm"
            variant="inline"
            onConfigure={() => setShowLLMSettings(true)}
            className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <LLMLoadingState message="Generating key locations..." showProgress />
        )}

        {/* Error Display */}
        {llmError && (
          <LLMErrorDisplay
            error={llmError}
            onRetry={handleGenerateLocations}
            onDismiss={clearError}
          />
        )}
      </div>

      {/* Locations List */}
      <FormSection
        title="Locations"
        description="Add and describe the key locations in your world"
      >
        <div className="space-y-4">
          {locations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <MapPin className="h-12 w-12 mx-auto text-gray-400 mb-3" />
              <p className="text-sm text-gray-600 mb-4">
                No locations added yet. Generate suggestions or add manually.
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
                            placeholder="e.g., The Crystal Spire, Neo-Tokyo Downtown"
                          />
                        </FormField>

                        {/* Description */}
                        <FormField
                          label="Description"
                          name={`location-${location.id}-description`}
                          required
                          helpText="Vivid description of what this location looks and feels like"
                        >
                          <Textarea
                            value={location.description}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, {
                                description: e.target.value,
                              })
                            }
                            placeholder="Describe the location in detail..."
                            rows={3}
                          />
                        </FormField>

                        {/* Significance */}
                        <FormField
                          label="Significance"
                          name={`location-${location.id}-significance`}
                          helpText="Why is this location important to your story?"
                        >
                          <Textarea
                            value={location.significance}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, {
                                significance: e.target.value,
                              })
                            }
                            placeholder="e.g., Where the final battle takes place..."
                            rows={2}
                          />
                        </FormField>

                        {/* Atmosphere */}
                        <FormField
                          label="Atmosphere"
                          name={`location-${location.id}-atmosphere`}
                          helpText="The mood and feeling of this place"
                        >
                          <Input
                            value={location.atmosphere}
                            onChange={(e) =>
                              handleUpdateLocation(location.id, {
                                atmosphere: e.target.value,
                              })
                            }
                            placeholder="e.g., Eerie and foreboding, Bustling and vibrant"
                          />
                        </FormField>
                      </CardContent>
                    )}
                  </Card>
                );
              })}

              {/* Add Location Button */}
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
