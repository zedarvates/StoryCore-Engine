import React, { useState } from 'react';
import { Plus, X, Sparkles, History, Zap, Globe } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useLLMGeneration } from '@/hooks/useLLMGeneration';
import { LLMErrorDisplay, LLMLoadingState } from '../LLMErrorDisplay';
import { ServiceWarning, useServiceStatus } from '@/components/ui/service-warning';
import { useAppStore } from '@/stores/useAppStore';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Cultural Elements Type
// ============================================================================

interface CulturalElements {
    languages: string[];
    religions: string[];
    traditions: string[];
    historicalEvents: string[];
    culturalConflicts: string[];
}

// ============================================================================
// Step 5: Societal Matrix (Cultural Elements)
// ============================================================================

export function Step5SocietalMatrix() {
    const { formData, updateFormData } = useWizard<World>();
    const { llmConfigured, llmChecking } = useServiceStatus();
    const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
    const { toast } = useToast();

    const [languageInput, setLanguageInput] = useState('');
    const [religionInput, setReligionInput] = useState('');
    const [traditionInput, setTraditionInput] = useState('');
    const [historicalEventInput, setHistoricalEventInput] = useState('');
    const [conflictInput, setConflictInput] = useState('');

    const culturalElements: CulturalElements = formData.culturalElements || {
        languages: [],
        religions: [],
        traditions: [],
        historicalEvents: [],
        culturalConflicts: [],
    };

    const {
        generate,
        isLoading,
        error: llmError,
        clearError,
    } = useLLMGeneration({
        onSuccess: (response) => {
            const generated = parseLLMCulturalElements(response.content);
            updateFormData({
                culturalElements: {
                    languages: [...culturalElements.languages, ...generated.languages].slice(0, 10),
                    religions: [...culturalElements.religions, ...generated.religions].slice(0, 10),
                    traditions: [...culturalElements.traditions, ...generated.traditions].slice(0, 10),
                    historicalEvents: [...culturalElements.historicalEvents, ...generated.historicalEvents].slice(0, 10),
                    culturalConflicts: [...culturalElements.culturalConflicts, ...generated.culturalConflicts].slice(0, 10),
                },
            });
        },
    });

    // ============================================================================
    // Array Management Helpers
    // ============================================================================

    const addToArray = (key: keyof CulturalElements, value: string) => {
        if (!value.trim()) return;

        const currentArray = culturalElements[key] || [];
        if (currentArray.includes(value.trim())) return;

        updateFormData({
            culturalElements: {
                ...culturalElements,
                [key]: [...currentArray, value.trim()],
            },
        });
    };

    const removeFromArray = (key: keyof CulturalElements, index: number) => {
        const currentArray = culturalElements[key] || [];
        updateFormData({
            culturalElements: {
                ...culturalElements,
                [key]: currentArray.filter((_, i) => i !== index),
            },
        });
    };

    // ============================================================================
    // Individual Add Handlers
    // ============================================================================

    const handleAddLanguage = () => {
        addToArray('languages', languageInput);
        setLanguageInput('');
    };

    const handleAddReligion = () => {
        addToArray('religions', religionInput);
        setReligionInput('');
    };

    const handleAddTradition = () => {
        addToArray('traditions', traditionInput);
        setTraditionInput('');
    };

    const handleAddHistoricalEvent = () => {
        addToArray('historicalEvents', historicalEventInput);
        setHistoricalEventInput('');
    };

    const handleAddConflict = () => {
        addToArray('culturalConflicts', conflictInput);
        setConflictInput('');
    };

    // ============================================================================
    // LLM Generation
    // ============================================================================

    const handleGenerateCulturalElements = async () => {
        clearError();

        if (!formData.name) {
            toast({
                title: 'Registry Incomplete',
                description: 'Please define a reality designation before synthesizing cultural parameters.',
                variant: 'warning',
            });
            return;
        }

        const context = {
            worldName: formData.name || 'the world',
            genre: formData.genre || [],
            timePeriod: formData.timePeriod || '',
            tone: formData.tone || [],
        };

        const systemPrompt = "You are a Societal Architect. Your mission is to synthesize the complex matrix of cultural protocols, historical datasets, and systemic dissonances that define the societal layer of this reality manifold.";

        const prompt = `Generate societal matrix parameters for "${context.worldName}":
- Framework: ${context.genre.join(', ')}
- Temporal Coordinates: ${context.timePeriod}
- Experiential Parameters: ${context.tone.join(', ')}

Provide:
1. Linguistic Protocols (Array of technical language/binary designations)
2. Belief Architectures (Array of religions/ideologies)
3. Social Subroutines (Array of traditions/customs)
4. Temporal Logs (Array of historical events)
5. Systemic Dissonance (Array of cultural conflicts)

Format as JSON with arrays of strings: languages, religions, traditions, historicalEvents, culturalConflicts.`;

        await generate({
            prompt,
            systemPrompt,
            temperature: 0.8,
            maxTokens: 1000,
        });
    };

    const parseLLMCulturalElements = (response: string): CulturalElements => {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    languages: Array.isArray(parsed.languages) ? parsed.languages.map(String) : [],
                    religions: Array.isArray(parsed.religions) ? parsed.religions.map(String) : [],
                    traditions: Array.isArray(parsed.traditions) ? parsed.traditions.map(String) : [],
                    historicalEvents: Array.isArray(parsed.historicalEvents) ? parsed.historicalEvents.map(String) : [],
                    culturalConflicts: Array.isArray(parsed.culturalConflicts) ? parsed.culturalConflicts.map(String) : [],
                };
            }
        } catch (e) {
            console.error('Failed to parse cultural elements', e);
        }
        return { languages: [], religions: [], traditions: [], historicalEvents: [], culturalConflicts: [] };
    };

    return (
        <WizardFormLayout
            title="Societal Matrix"
            description="Define the cultural richness and historical datasets that comprise the societal layer of this reality manifold"
        >
            {/* AI Generation Section */}
            <div className="space-y-4 mb-12 p-4 rounded-none border border-primary/20 bg-primary/5 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-1 opacity-20">
                    <Globe className="w-10 h-10 text-primary" />
                </div>
                <div className="flex items-center justify-between relative z-10">
                    <div>
                        <h3 className="text-base font-bold text-primary neon-text uppercase tracking-widest text-[10px] font-mono mb-1">// Societal Architect</h3>
                        <p className="text-[10px] text-primary/60 uppercase tracking-wider">
                            Synthesize societal matrix parameters and historical datasets
                        </p>
                    </div>
                    <Button
                        onClick={handleGenerateCulturalElements}
                        disabled={isLoading || !formData.name || !llmConfigured}
                        className="gap-2 btn-neon bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                        size="sm"
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isLoading ? 'Architecting...' : 'Synthesize Culture'}</span>
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
                    <LLMLoadingState message="Compiling cultural nodes..." />
                )}

                {llmError && (
                    <LLMErrorDisplay
                        error={llmError}
                        onRetry={handleGenerateCulturalElements}
                        onDismiss={() => clearError?.()}
                    />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Languages */}
                <FormSection title="Linguistic Protocols">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={languageInput}
                                onChange={(e) => setLanguageInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLanguage())}
                                placeholder="e.g., BINARY_ENCRYPTION"
                                className="font-mono text-xs"
                            />
                            <Button onClick={handleAddLanguage} size="sm" variant="ghost" className="border border-primary/20 text-primary hover:bg-primary/10">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {culturalElements.languages.map((lang, index) => (
                                <Badge key={index} variant="outline" className="border-primary/20 bg-primary/5 text-primary/80 font-mono text-[9px] uppercase tracking-wider">
                                    {lang}
                                    <button onClick={() => removeFromArray('languages', index)} className="ml-2 hover:text-red-400">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FormSection>

                {/* Religions */}
                <FormSection title="Belief Architectures">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={religionInput}
                                onChange={(e) => setReligionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddReligion())}
                                placeholder="e.g., THE_CHURCH_OF_CORES"
                                className="font-mono text-xs"
                            />
                            <Button onClick={handleAddReligion} size="sm" variant="ghost" className="border border-primary/20 text-primary hover:bg-primary/10">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {culturalElements.religions.map((rel, index) => (
                                <Badge key={index} variant="outline" className="border-primary/20 bg-primary/5 text-primary/80 font-mono text-[9px] uppercase tracking-wider">
                                    {rel}
                                    <button onClick={() => removeFromArray('religions', index)} className="ml-2 hover:text-red-400">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FormSection>

                {/* Traditions */}
                <FormSection title="Social Subroutines">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={traditionInput}
                                onChange={(e) => setTraditionInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTradition())}
                                placeholder="e.g., ANNUAL_REBOOT"
                                className="font-mono text-xs"
                            />
                            <Button onClick={handleAddTradition} size="sm" variant="ghost" className="border border-primary/20 text-primary hover:bg-primary/10">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {culturalElements.traditions.map((trad, index) => (
                                <Badge key={index} variant="outline" className="border-primary/20 bg-primary/5 text-primary/80 font-mono text-[9px] uppercase tracking-wider">
                                    {trad}
                                    <button onClick={() => removeFromArray('traditions', index)} className="ml-2 hover:text-red-400">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </div>
                </FormSection>

                {/* Historical Events */}
                <FormSection title="Temporal Logs">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input
                                value={historicalEventInput}
                                onChange={(e) => setHistoricalEventInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHistoricalEvent())}
                                placeholder="e.g., THE_GREAT_CRASH_2048"
                                className="font-mono text-xs"
                            />
                            <Button onClick={handleAddHistoricalEvent} size="sm" variant="ghost" className="border border-primary/20 text-primary hover:bg-primary/10">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="space-y-1">
                            {culturalElements.historicalEvents.map((event, index) => (
                                <div key={index} className="flex items-center gap-3 p-2 border border-primary/10 bg-primary/5 text-[10px] font-mono text-primary/60 uppercase tracking-tight">
                                    <History className="h-3 w-3 text-primary/40" />
                                    <span className="flex-1">{event}</span>
                                    <button onClick={() => removeFromArray('historicalEvents', index)} className="hover:text-red-400 transition-colors">
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </FormSection>
            </div>

            {/* Cultural Conflicts */}
            <FormSection title="Systemic Dissonance" className="mt-12">
                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            value={conflictInput}
                            onChange={(e) => setConflictInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddConflict())}
                            placeholder="e.g., MAGI_VS_TECHNOCRATS"
                            className="font-mono text-xs"
                        />
                        <Button onClick={handleAddConflict} size="sm" variant="ghost" className="border border-primary/20 text-primary hover:bg-primary/10 px-4">
                            <Plus className="h-4 w-4 mr-2" />
                            <span className="text-[10px] font-black uppercase tracking-widest font-mono">Inject Conflict</span>
                        </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {culturalElements.culturalConflicts.map((conflict, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 border border-red-500/20 bg-red-500/5 group hover:border-red-500/40 transition-colors">
                                <Zap className="h-3.5 w-3.5 text-red-500/60" />
                                <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-red-500/80 font-mono italic">{conflict}</span>
                                <button onClick={() => removeFromArray('culturalConflicts', index)} className="text-red-500/30 hover:text-red-500 group-hover:scale-110 transition-all">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </FormSection>

            {/* Atmospheric Overrides */}
            <FormSection title="Environmental Overview" className="mt-12">
                <FormField
                    label="Aesthetic Calibration"
                    name="atmosphere"
                    helpText="Define the overarching experiential profile of the world's society"
                >
                    <div className="relative group">
                        <Globe className="absolute left-3 top-3 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors" />
                        <Textarea
                            value={formData.atmosphere || ''}
                            onChange={(e) => updateFormData({ atmosphere: e.target.value })}
                            placeholder="Describe the societal atmosphere and environmental mood..."
                            rows={4}
                            className="pl-10 font-mono text-xs text-white"
                        />
                    </div>
                </FormField>
            </FormSection>
        </WizardFormLayout>
    );
}
