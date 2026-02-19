import { useState } from 'react';
import { Plus, Trash2, Sparkles, MapPin, Image as ImageIcon } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World, Location } from '@/types/world';
import { createEmptyLocation } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { saveLocationToProject, createLocationFromWizardData } from '@/utils/locationStorage';
import { useLocationStore } from '@/stores/locationStore';
import { useEditorStore } from '@/stores/editorStore';
import { LocationImageGenerator } from '../../location/editor/LocationImageGenerator';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Interface for LLM-generated location items
 * Used for parsing JSON responses from the LLM
 */
interface LLMLocationItem {
    name?: string;
    description?: string;
    significance?: string;
    atmosphere?: string;
    mood?: string;
}

// ============================================================================
// Step 3: Topographic Cartography (Locations)
// ============================================================================

export function Step3TopographicCartography() {
    const { formData, updateFormData } = useWizard<World>();
    const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null);
    const [imageGeneratorLocationId, setImageGeneratorLocationId] = useState<string | null>(null);
    const { llmConfigured, llmChecking } = useServiceStatus();
    const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

    // Get project path for saving locations
    const projectPath = useEditorStore.getState().projectPath;
    const { fetchProjectLocations } = useLocationStore();

    const locations = formData.locations || [];

    // ============================================================================
    // Location Management
    // ============================================================================

    // Helper to save a location to the project's locations folder
    const saveLocationToFile = async (location: Location) => {
        if (!projectPath) {
            console.warn('[Step3TopographicCartography] No project path available, skipping save');
            return;
        }

        const projectId = projectPath.split(/[/\\]/).pop() || 'unknown';
        if (projectId === 'unknown') return;

        try {
            // Define a typed version of the location for the wizard data
            const loc = location as Location;
            const locationData = createLocationFromWizardData(
                location.id,
                {
                    name: location.name,
                    type: (loc.type as any) || 'generic',
                    description: location.description || '',
                    // Pass explicit location_type if set
                    location_type: location.location_type,
                },
                { projectId, worldId: formData.id || undefined }
            );

            // Add extended metadata if available
            if (loc.significance) {
                (locationData.metadata as unknown as Record<string, unknown>).significance = loc.significance;
            }
            if (loc.atmosphere) {
                (locationData.metadata as unknown as Record<string, unknown>).atmosphere = loc.atmosphere;
            }
            if (loc.tile_image_path) {
                (locationData.metadata as unknown as Record<string, unknown>).tile_image_path = loc.tile_image_path;
            }

            await saveLocationToProject(projectId, location.id, locationData);
        } catch (error) {
            console.error('[Step3TopographicCartography] Failed to save location:', error);
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
        const updatedLocations = locations.map((l) => (l.id === locationId ? { ...l, ...updates } : l));
        updateFormData({ locations: updatedLocations });

        // Auto-save when specific fields change
        const location = updatedLocations.find(l => l.id === locationId);
        if (location) {
            void saveLocationToFile(location);
        }
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

        const systemPrompt = "You are a Topographic Cartography Engine. Your mission is to map critical environmental nodes and define the experiential profile of specific geospatial sectors within the reality manifest. Use technical, high-tech terminology.";

        const prompt = `Generate 4-6 key environmental nodes for "${context.worldName}":
- Causal Framework: ${context.genre.join(', ')}
- Temporal Coordinates: ${context.timePeriod}
- Experiential Parameters: ${context.tone.join(', ')}

Provide:
1. Node Designation (Concise, technical name)
2. Environmental Log (Atmospheric and physical profile)
3. Narrative Criticality (Strategic significance)
4. Aesthetic Frequency (Environmental mood)

Format as JSON array with fields: name, description, significance, atmosphere`;

        await generate({
            prompt,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 1200,
        });
    };

    const parseLLMLocations = (response: string): Location[] => {
        try {
            const jsonRegex = /\[[\s\S]*\]/;
            const jsonMatch = jsonRegex.exec(response);

            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]) as LLMLocationItem[];
                    if (Array.isArray(parsed)) {
                        return parsed.map((item) => ({
                            id: crypto.randomUUID(),
                            name: item.name || '',
                            description: item.description || '',
                            significance: item.significance || '',
                            atmosphere: item.atmosphere || item.mood || '',
                        })).filter((loc) => loc.name);
                    }
                } catch {
                    console.warn('JSON parsing failed, trying text parsing');
                }
            }

            // Fallback: Parse as structured text
            return parseTextLocations(response);
        } catch (error) {
            console.error('Failed to parse locations:', error);
            return [];
        }
    };

    const parseTextLocations = (response: string): Location[] => {
        const parsedLocations: Location[] = [];
        const lines = response.split('\n');
        let currentLocation: Partial<Location> | null = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const name = parseLocationNameFromLine(trimmed);
            if (name) {
                if (currentLocation?.name) {
                    parsedLocations.push(createEmptyLocationFromPartial(currentLocation));
                }
                currentLocation = { name };
                continue;
            }

            if (currentLocation) {
                currentLocation = updateLocationField(currentLocation, trimmed);
            }
        }

        if (currentLocation?.name) {
            parsedLocations.push(createEmptyLocationFromPartial(currentLocation));
        }

        return parsedLocations;
    };

    const createEmptyLocationFromPartial = (partial: Partial<Location>): Location => {
        return {
            ...createEmptyLocation(),
            ...partial,
        } as Location;
    };

    const parseLocationNameFromLine = (line: string): string | null => {
        const nameRegex = /^(?:\d+\.|[-*•])\s*(?:Name:?\s*)?(.+?)(?:\s*[-–—]\s*|$)/i;
        const nameMatch = nameRegex.exec(line);
        if (nameMatch && nameMatch[1].length > 2 && nameMatch[1].length < 50) {
            return nameMatch[1].trim();
        }
        return null;
    };

    const updateLocationField = (currentLocation: Partial<Location>, line: string): Partial<Location> => {
        const trimmed = line.trim();
        if (/description:/i.test(trimmed)) {
            return { ...currentLocation, description: trimmed.replace(/description:\s*/i, '').trim() };
        }
        if (/significance:/i.test(trimmed)) {
            return { ...currentLocation, significance: trimmed.replace(/significance:\s*/i, '').trim() };
        }
        if (/(atmosphere|mood):/i.test(trimmed)) {
            return { ...currentLocation, atmosphere: trimmed.replace(/(atmosphere|mood):\s*/i, '').trim() };
        }
        if (currentLocation.name && !currentLocation.description && trimmed.length > 20) {
            return { ...currentLocation, description: trimmed };
        }
        return currentLocation;
    };

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

                const projectId = projectPath?.split(/[/\\]/).pop() || 'unknown';
                if (projectPath && projectId !== 'unknown') {
                    void (async () => {
                        for (const loc of generatedLocations) {
                            await saveLocationToFile(loc);
                        }
                        await fetchProjectLocations(projectId);
                    })();
                }
            }
        },
    });

    // ============================================================================
    // Render
    // ============================================================================

    return (
        <WizardFormLayout
            title="Topographic Cartography"
            description="Define the topographical landmarks and environmental profiles of the reality manifold"
        >
            {/* AI Generation Section */}
            <div className="space-y-4 mb-12 p-4 rounded-none border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-20">
                    <MapPin className="w-10 h-10 text-primary" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Topographic Synthesis Engine</h3>
                        <p className="text-[10px] text-primary/60 uppercase tracking-wider">
                            Synthesize key environmental nodes and atmospheric parameters
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateLocations}
                        disabled={isLoading || !formData.name || !llmConfigured}
                        className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        size="sm"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLoading ? 'Mapping...' : 'Synthesize Terrain'}</span>
                    </Button>
                </div>

                {!llmChecking && !llmConfigured && (
                    <ServiceWarning
                        service="llm"
                        variant="inline"
                        onConfigure={() => setShowLLMSettings(true)}
                        className="bg-red-500/10 border-red-500/20 text-red-400"
                    />
                )}

                {isLoading && (
                    <LLMLoadingState message="Synthesizing environmental data..." />
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
                title="Topographical Matrix"
                description="Initialize and describe the critical nodes within your world mapping"
            >
                <div className="space-y-6">
                    {locations.length === 0 ? (
                        <div className="text-center py-16 border border-primary/20 bg-primary/5 rounded-none backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <MapPin className="h-10 w-10 mx-auto text-primary/20 mb-3" />
                            <p className="text-[10px] text-primary/40 mb-6 uppercase tracking-[0.2em] font-mono">
                                No topographical nodes identified in current mapping.
                            </p>
                            <Button onClick={handleAddLocation} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 hover:bg-primary/10">
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Initialize First Node
                            </Button>
                        </div>
                    ) : (
                        <>
                            {locations.map((location) => {
                                const isExpanded = expandedLocationId === location.id;

                                return (
                                    <div key={location.id} className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative transition-all hover:border-primary/40">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-primary/5 transition-colors flex items-start justify-between gap-4"
                                            onClick={() => toggleLocationExpanded(location.id)}
                                        >
                                            <div className="flex-1 text-left pt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <MapPin className="h-3 w-3 text-primary/60" />
                                                    <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest font-mono">
                                // Node ID: {location.id.substring(0, 8).toUpperCase()}
                                                    </span>
                                                    {location.location_type && (
                                                        <Badge variant="outline" className="text-[9px] border-primary/20 py-0 font-mono text-primary/60 uppercase">
                                                            {location.location_type === 'interior' ? 'Enclosed Matrix' : 'Exposed Node'}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-black text-primary uppercase tracking-wider font-mono">
                                                    {location.name || 'UNNAMED_NODE'}
                                                </h4>
                                                {location.description && !isExpanded && (
                                                    <p className="text-[10px] text-primary/60 mt-1 line-clamp-1 font-mono italic">
                                                        {location.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveLocation(location.id);
                                                    }}
                                                    className="h-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
                                                    aria-label="Delete location"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {isExpanded && (
                                            <div className="p-4 pt-0 space-y-8 border-t border-primary/10 bg-[#050b10]/40">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                                                    {/* Name */}
                                                    <FormField
                                                        label="Node Designation"
                                                        name={`location-${location.id}-name`}
                                                        required
                                                    >
                                                        <Input
                                                            value={location.name}
                                                            onChange={(e) =>
                                                                handleUpdateLocation(location.id, { name: e.target.value })
                                                            }
                                                            placeholder="e.g., SECTOR_7_OUTPOST"
                                                            className="font-mono text-xs"
                                                        />
                                                    </FormField>

                                                    {/* Location Type - Interior/Exterior */}
                                                    <FormField
                                                        label="Geospatial Classification"
                                                        name={`location-${location.id}-location-type`}
                                                        helpText="Define structural containment parameters"
                                                    >
                                                        <div className="flex gap-2 p-1 bg-primary/5 rounded-none border border-primary/20 w-fit">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUpdateLocation(location.id, { location_type: 'exterior' })}
                                                                className={cn(
                                                                    "text-[9px] uppercase font-black tracking-widest px-3 py-1 h-7 transition-all font-mono",
                                                                    location.location_type !== 'interior'
                                                                        ? "bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                                                        : "text-primary/40 hover:text-primary hover:bg-primary/10"
                                                                )}
                                                            >
                                                                Exposed Node
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleUpdateLocation(location.id, { location_type: 'interior' })}
                                                                className={cn(
                                                                    "text-[9px] uppercase font-black tracking-widest px-3 py-1 h-7 transition-all font-mono",
                                                                    location.location_type === 'interior'
                                                                        ? "bg-primary text-black shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                                                                        : "text-primary/40 hover:text-primary hover:bg-primary/10"
                                                                )}
                                                            >
                                                                Enclosed Matrix
                                                            </Button>
                                                        </div>
                                                    </FormField>
                                                </div>

                                                {/* Description */}
                                                <FormField
                                                    label="Environmental Log"
                                                    name={`location-${location.id}-description`}
                                                    required
                                                    helpText="Primary environmental atmospheric parameters"
                                                >
                                                    <Textarea
                                                        value={location.description}
                                                        onChange={(e) =>
                                                            handleUpdateLocation(location.id, { description: e.target.value })
                                                        }
                                                        placeholder="Map the topographical and atmospheric profile..."
                                                        rows={3}
                                                        className="font-mono text-xs"
                                                    />
                                                </FormField>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    {/* Atmosphere */}
                                                    <FormField
                                                        label="Aesthetic Frequency"
                                                        name={`location-${location.id}-atmosphere`}
                                                        helpText="The environmental mood profile"
                                                    >
                                                        <Input
                                                            value={location.atmosphere || ''}
                                                            onChange={(e) =>
                                                                handleUpdateLocation(location.id, { atmosphere: e.target.value })
                                                            }
                                                            placeholder="e.g., NEON_HAZE_DENSE"
                                                            className="font-mono text-xs"
                                                        />
                                                    </FormField>

                                                    {/* Significance */}
                                                    <FormField
                                                        label="Narrative Criticality"
                                                        name={`location-${location.id}-significance`}
                                                        helpText="Strategic weight of this environmental node"
                                                    >
                                                        <Input
                                                            value={location.significance || ''}
                                                            onChange={(e) =>
                                                                handleUpdateLocation(location.id, { significance: e.target.value })
                                                            }
                                                            placeholder="State the importance within story causal chains..."
                                                            className="font-mono text-xs"
                                                        />
                                                    </FormField>
                                                </div>

                                                {/* Tile Image Preview */}
                                                <div className="pt-4 border-t border-primary/10">
                                                    <FormField
                                                        label="Neural Static Reconstruction (Visual Tile)"
                                                        name={`location-${location.id}-tile-image`}
                                                        helpText="Synthesize a visual sensory anchor for this node"
                                                    >
                                                        <div className="space-y-6">
                                                            {(location.metadata?.tile_image_path || location.tile_image_path) ? (
                                                                <div className="relative inline-block group border border-primary/20">
                                                                    <img
                                                                        src={location.metadata?.tile_image_path || location.tile_image_path}
                                                                        alt={location.name}
                                                                        className="w-full max-w-sm h-48 object-cover grayscale hover:grayscale-0 transition-all duration-500"
                                                                    />
                                                                    <div className="absolute inset-0 bg-primary/10 mix-blend-overlay group-hover:opacity-0 transition-opacity" />
                                                                    <Button
                                                                        variant="destructive"
                                                                        size="sm"
                                                                        className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-none opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        onClick={() => handleUpdateLocation(location.id, { tile_image_path: undefined, metadata: { ...location.metadata, tile_image_path: undefined } } as Partial<Location>)}
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="w-full max-w-sm h-48 border border-dashed border-primary/20 bg-primary/5 flex flex-col items-center justify-center gap-3">
                                                                    <ImageIcon className="h-8 w-8 text-primary/20" />
                                                                    <span className="text-[10px] font-mono text-primary/20 uppercase tracking-widest">No Visual Data Link</span>
                                                                </div>
                                                            )}

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => setImageGeneratorLocationId(
                                                                    imageGeneratorLocationId === location.id ? null : location.id
                                                                )}
                                                                className={cn(
                                                                    "gap-2 border border-primary/20 text-[10px] font-black uppercase tracking-widest font-mono",
                                                                    imageGeneratorLocationId === location.id ? "bg-primary text-black" : "text-primary/60 hover:text-primary hover:bg-primary/10"
                                                                )}
                                                            >
                                                                <ImageIcon className="h-3.5 w-3.5" />
                                                                {imageGeneratorLocationId === location.id ? '[ DEACTIVATE GENERATOR ]' : '[ ACTIVATE NEURAL LINK ]'}
                                                            </Button>
                                                        </div>
                                                    </FormField>

                                                    {/* Image Generator */}
                                                    {imageGeneratorLocationId === location.id && (
                                                        <div className="mt-6 p-6 bg-[#050b10] border border-primary/30 relative overflow-hidden">
                                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                                                            <LocationImageGenerator
                                                                location={{
                                                                    id: location.id,
                                                                    name: location.name,
                                                                    metadata: {
                                                                        description: location.description,
                                                                        atmosphere: location.atmosphere,
                                                                        significance: location.significance,
                                                                    },
                                                                }}
                                                                onImageGenerated={(path) => {
                                                                    handleUpdateLocation(location.id, { tile_image_path: path });
                                                                }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <Button
                                variant="ghost"
                                onClick={handleAddLocation}
                                className="w-full py-10 border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Initialize New Environmental Node
                            </Button>
                        </>
                    )}
                </div>
            </FormSection>
        </WizardFormLayout>
    );
}
