import { useState } from 'react';
import { Plus, Trash2, Sparkles, Box } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World, WorldObject } from '@/types/world';
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
// Step 4: Key Objects
// ============================================================================

export function Step4KeyObjects() {
    const { formData, updateFormData } = useWizard<World>();
    const [expandedObjectId, setExpandedObjectId] = useState<string | null>(null);
    const { llmConfigured } = useServiceStatus();
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

        const systemPrompt = 'You are a creative world-building assistant. Generate unique, influential objects or artifacts.';

        const prompt = `Generate 3-5 key objects/artifacts for "${context.worldName}" (${context.genre.join(', ')}):
Format as JSON array with: name, type, description, influence (how it affects the story/world).`;

        await generate({
            prompt,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 1000,
        });
    };

    return (
        <WizardFormLayout
            title="Key Objects & Artifacts"
            description="Define objects that have a significant influence on the story or world"
        >
            {/* LLM Generation Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold">AI-Assisted Generation</h3>
                        <p className="text-xs text-gray-500 mt-1">
                            Generate significant object suggestions
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateObjects}
                        disabled={isLoading || !formData.name || !llmConfigured}
                        className="gap-2"
                    >
                        <Sparkles className="h-4 w-4" />
                        {isLoading ? 'Generating...' : 'Generate Objects'}
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
                    <LLMLoadingState message="Generating key objects..." showProgress />
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
                title="Objects"
                description="Add and describe key objects"
            >
                <div className="space-y-4">
                    {objects.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg">
                            <Box className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600 mb-4">
                                No objects added yet.
                            </p>
                            <Button onClick={handleAddObject} variant="outline" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add First Object
                            </Button>
                        </div>
                    ) : (
                        <>
                            {objects.map((object) => {
                                const isExpanded = expandedObjectId === object.id;

                                return (
                                    <Card key={object.id} className="border-2">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-4">
                                                <button
                                                    onClick={() => toggleObjectExpanded(object.id)}
                                                    className="flex-1 text-left"
                                                >
                                                    <CardTitle className="text-base flex items-center gap-2">
                                                        <Box className="h-4 w-4" />
                                                        {object.name || 'Unnamed Object'}
                                                    </CardTitle>
                                                    {object.description && !isExpanded && (
                                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                            {object.description}
                                                        </p>
                                                    )}
                                                </button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRemoveObject(object.id)}
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </CardHeader>

                                        {isExpanded && (
                                            <CardContent className="space-y-4">
                                                {/* Name */}
                                                <FormField
                                                    label="Object Name"
                                                    name={`object-${object.id}-name`}
                                                    required
                                                >
                                                    <Input
                                                        value={object.name}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { name: e.target.value })
                                                        }
                                                        placeholder="e.g., The Bellium"
                                                    />
                                                </FormField>

                                                {/* Type */}
                                                <FormField
                                                    label="Type"
                                                    name={`object-${object.id}-type`}
                                                    helpText="Artifact, Resource, Relic, etc."
                                                >
                                                    <Input
                                                        value={object.type}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { type: e.target.value })
                                                        }
                                                        placeholder="e.g., Divine Artifact"
                                                    />
                                                </FormField>

                                                {/* Description */}
                                                <FormField
                                                    label="Description"
                                                    name={`object-${object.id}-description`}
                                                    required
                                                >
                                                    <Textarea
                                                        value={object.description}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { description: e.target.value })
                                                        }
                                                        placeholder="Describe the object..."
                                                        rows={3}
                                                    />
                                                </FormField>

                                                {/* Influence */}
                                                <FormField
                                                    label="Story Influence"
                                                    name={`object-${object.id}-influence`}
                                                    helpText="How does this object affect the world or story?"
                                                    required
                                                >
                                                    <Textarea
                                                        value={object.influence}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { influence: e.target.value })
                                                        }
                                                        placeholder="e.g., Whoever holds it commands the legions of..."
                                                        rows={3}
                                                    />
                                                </FormField>

                                                {/* Rules */}
                                                <FormField
                                                    label="Specific Rules"
                                                    name={`object-${object.id}-rules`}
                                                    helpText="Any special rules or limitations?"
                                                >
                                                    <Input
                                                        value={object.rules || ''}
                                                        onChange={(e) =>
                                                            handleUpdateObject(object.id, { rules: e.target.value })
                                                        }
                                                        placeholder="e.g., Can only be touched by..."
                                                    />
                                                </FormField>
                                            </CardContent>
                                        )}
                                    </Card>
                                );
                            })}

                            <Button
                                variant="outline"
                                onClick={handleAddObject}
                                className="w-full gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Another Object
                            </Button>
                        </>
                    )}
                </div>
            </FormSection>
        </WizardFormLayout>
    );
}
