import { useState } from 'react';
import { Plus, Trash2, Sparkles, Box } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World, WorldObject } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';

// ============================================================================
// Step 4: Registry of Relics (Key Objects)
// ============================================================================

export function Step4RegistryOfRelics() {
    const { formData, updateFormData } = useWizard<World>();
    const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);
    const { llmConfigured, llmChecking } = useServiceStatus();
    const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

    const objects = formData.keyObjects || [];

    const createEmptyObject = (): WorldObject => ({
        id: crypto.randomUUID(),
        name: '',
        type: '',
        description: '',
        influence: '',
        rules: '',
    });

    const handleAddObject = () => {
        const newObject = createEmptyObject();
        updateFormData({ keyObjects: [...objects, newObject] });
        setExpandedObjectId(newObject.id);
    };

    const handleRemoveObject = (objectId: string) => {
        updateFormData({ keyObjects: objects.filter((o) => o.id !== objectId) });
        if (expandedObjectId === objectId) {
            setExpandedObjectId(null);
        }
    };

    const handleUpdateObject = (objectId: string, updates: Partial<WorldObject>) => {
        updateFormData({
            keyObjects: objects.map((o) => (o.id === objectId ? { ...o, ...updates } : o)),
        });
    };

    const toggleObjectExpanded = (objectId: string) => {
        setExpandedObjectId(expandedObjectId === objectId ? null : objectId);
    };

    // ============================================================================
    // LLM Generation
    // ============================================================================

    const {
        generate,
        isLoading,
        error: llmError,
        clearError,
    } = useLLMGeneration({
        onSuccess: (response) => {
            try {
                const jsonMatch = response.content.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    const generatedObjects = JSON.parse(jsonMatch[0]) as Partial<WorldObject>[];
                    const newObjects = generatedObjects.map(obj => ({
                        ...createEmptyObject(),
                        ...obj
                    }));
                    updateFormData({ keyObjects: [...objects, ...newObjects] });
                }
            } catch (e) {
                console.error('Failed to parse generated objects', e);
            }
        },
    });

    const handleGenerateObjects = async () => {
        clearError?.();

        const context = {
            worldName: formData.name || 'the world',
            genre: formData.genre || [],
            tone: formData.tone || [],
        };

        const systemPrompt = "You are a Relic Synthesis Engine. Your protocol is to register influential artifacts and physical assets that maintain ontological presence within the reality manifold. Use technical, evocative designations.";

        const prompt = `Generate 3-5 unique physical/metaphysical assets for "${context.worldName}":
- Framework: ${context.genre.join(', ')}
- Experiential Parameters: ${context.tone.join(', ')}

Provide:
1. Registry Designation (Concise name, technical feel)
2. Ontological Class (Classification)
3. Physical/Metaphysical Synthesis (Description)
4. Causal Nexus Impact (Influence on the story arc)

Format as JSON array with fields: name, type, description, influence.`;

        await generate({
            prompt,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 1000,
        });
    };

    return (
        <WizardFormLayout
            title="Registry of Relics"
            description="Register objects of significance that maintain ontological presence within this reality manifold"
        >
            {/* AI Generation Section */}
            <div className="space-y-4 mb-12 p-4 rounded-none border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-20">
                    <Box className="w-10 h-10 text-primary" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Relic Synthesis Engine</h3>
                        <p className="text-[10px] text-primary/60 uppercase tracking-wider">
                            Synthesize unique influential artifacts and proprietary technologies
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateObjects}
                        disabled={isLoading || !formData.name || !llmConfigured}
                        className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        size="sm"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLoading ? 'Synthesizing...' : 'Synthesize Artifacts'}</span>
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
                    <LLMLoadingState message="Extracting artifact data..." />
                )}

                {llmError && (
                    <LLMErrorDisplay
                        error={llmError}
                        onRetry={handleGenerateObjects}
                        onDismiss={() => clearError?.()}
                    />
                )}
            </div>

            {/* Objects List */}
            <FormSection
                title="Active Artifacts"
                description="Catalogue and describe registered artifacts of influence"
            >
                <div className="space-y-6">
                    {objects.length === 0 ? (
                        <div className="text-center py-16 border border-primary/20 bg-primary/5 rounded-none backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Box className="h-12 w-12 mx-auto text-primary/20 mb-3" />
                            <p className="text-[10px] text-primary/40 mb-6 uppercase tracking-[0.2em] font-mono">
                                No physical assets identified in registry.
                            </p>
                            <Button onClick={handleAddObject} variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 hover:bg-primary/10">
                                <Plus className="h-3.5 w-3.5 mr-2" />
                                Initialize Registry Node
                            </Button>
                        </div>
                    ) : (
                        <>
                            {objects.map((object) => {
                                const isExpanded = expandedObjectId === object.id;

                                return (
                                    <div key={object.id} className="border border-primary/20 bg-primary/5 backdrop-blur-sm overflow-hidden relative transition-all hover:border-primary/40">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-primary/5 transition-colors flex items-start justify-between gap-4"
                                            onClick={() => toggleObjectExpanded(object.id)}
                                        >
                                            <div className="flex-1 text-left pt-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Box className="h-3 w-3 text-primary/60" />
                                                    <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest font-mono">
                                                        // RELIC_ID: {object.id.substring(0, 8).toUpperCase()}
                                                    </span>
                                                    {object.type && (
                                                        <Badge variant="outline" className="text-[9px] border-primary/20 py-0 font-mono text-primary/60 uppercase">
                                                            {object.type}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="text-sm font-black text-primary uppercase tracking-wider font-mono">
                                                    {object.name || 'UNIDENTIFIED_ARTIFACT'}
                                                </h4>
                                                {object.description && !isExpanded && (
                                                    <p className="text-[10px] text-primary/60 mt-1 line-clamp-1 font-mono italic">
                                                        {object.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveObject(object.id);
                                                    }}
                                                    className="h-7 text-red-500/40 hover:text-red-500 hover:bg-red-500/10"
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
                                                        label="Registry Designation"
                                                        name={`object-${object.id}-name`}
                                                        required
                                                    >
                                                        <Input
                                                            value={object.name}
                                                            onChange={(e) =>
                                                                handleUpdateObject(object.id, { name: e.target.value })
                                                            }
                                                            placeholder="e.g., THE_BELLIUM_CORE"
                                                            className="font-mono text-xs text-white"
                                                        />
                                                    </FormField>

                                                    {/* Type */}
                                                    <FormField
                                                        label="Ontological Class"
                                                        name={`object-${object.id}-type`}
                                                        helpText="Artifact, Resource, Relic, Nexus Point, etc."
                                                    >
                                                        <Input
                                                            value={object.type}
                                                            onChange={(e) =>
                                                                handleUpdateObject(object.id, { type: e.target.value })
                                                            }
                                                            placeholder="e.g., RELIC_CLASS_A"
                                                            className="font-mono text-xs text-white"
                                                        />
                                                    </FormField>
                                                </div>

                                                {/* Description */}
                                                <FormField
                                                    label="Physical/Metaphysical Synthesis"
                                                    name={`object-${object.id}-description`}
                                                    required
                                                >
                                                    <Textarea
                                                        value={object.description}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { description: e.target.value })
                                                        }
                                                        placeholder="Describe the artifact's physical and metaphysical form..."
                                                        rows={3}
                                                        className="font-mono text-xs text-white"
                                                    />
                                                </FormField>

                                                {/* Influence */}
                                                <FormField
                                                    label="Causal Nexus Impact"
                                                    name={`object-${object.id}-influence`}
                                                    helpText="Influence factors on the story arc"
                                                    required
                                                >
                                                    <Textarea
                                                        value={object.influence}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { influence: e.target.value })
                                                        }
                                                        placeholder="Explain how this artifact affects the causal timeline..."
                                                        rows={2}
                                                        className="font-mono text-xs text-white"
                                                    />
                                                </FormField>

                                                {/* Rules */}
                                                <FormField
                                                    label="Operational Protocols"
                                                    name={`object-${object.id}-rules`}
                                                    helpText="Unique ontological constraints"
                                                >
                                                    <Input
                                                        value={object.rules || ''}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { rules: e.target.value })
                                                        }
                                                        placeholder="Define unique constraints or activation protocols..."
                                                        className="font-mono text-xs text-white"
                                                    />
                                                </FormField>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            <Button
                                variant="ghost"
                                onClick={handleAddObject}
                                className="w-full py-10 border border-dashed border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Initialize New Registry Item
                            </Button>
                        </>
                    )}
                </div>
            </FormSection>
        </WizardFormLayout>
    );
}
