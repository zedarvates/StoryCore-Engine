/**
 * World Builder Wizard
 * 
 * Refined 3-step wizard with:
 * - Modular architecture (separate step components)
 * - Enhanced visuals (glassmorphism, gradients)
 * - Robust state management
 */

import React, { useState, useCallback, useMemo } from 'react';
import { X, Save, ArrowRight, ArrowLeft, Check, Shield } from 'lucide-react';
import { WizardErrorBoundary } from '../WizardErrorBoundary';
import { WizardStepIndicator, WizardStep } from '../WizardStepIndicator';
import { useStore } from '@/store';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { saveWizardState } from '@/utils/wizardStorage';
import type { World, Location, WorldRule, WorldObject } from '@/types/world';

// Subcomponents
import { QuickSetupStep } from './steps/QuickSetupStep';
import { LocationsRulesStep } from './steps/LocationsRulesStep';
import { CultureReviewStep } from './steps/CultureReviewStep';
import { WorldPreset } from './presets';
import { WizardVoiceAssistant } from '../WizardVoiceAssistant';

export interface WorldBuilderWizardProps {
  onComplete: (world: World) => void;
  onCancel: () => void;
  initialData?: Partial<World>;
}

export function WorldBuilderWizard({
  onComplete,
  onCancel,
  initialData,
}: WorldBuilderWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Partial<World>>({
    name: '',
    genre: [],
    tone: [],
    locations: [],
    rules: [],
    keyObjects: [],
    culturalElements: {
      languages: [],
      religions: [],
      traditions: [],
      historicalEvents: [],
      culturalConflicts: [],
    },
    ...initialData,
  });
  const [lastSaved, setLastSaved] = useState<Date | undefined>();

  const addWorld = useStore((state) => state.addWorld);
  const { saveWorld } = useWorldPersistence();

  // Steps definition
  const steps: WizardStep[] = [
    { number: 1, title: 'Foundations', description: 'Presets & identity' },
    { number: 2, title: 'Architecture', description: 'Places, laws & objects' },
    { number: 3, title: 'Fabric', description: 'Culture & review' },
  ];

  // Data update
  const updateData = useCallback((newData: Partial<World>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Location management
  const addLocation = useCallback(() => {
    const newLocation: Location = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      significance: '',
      atmosphere: '',
      location_type: 'exterior',
    };
    updateData({
      locations: [...(data.locations || []), newLocation],
    });
  }, [data.locations, updateData]);

  const removeLocation = useCallback((id: string) => {
    updateData({
      locations: (data.locations || []).filter((l) => l.id !== id),
    });
  }, [data.locations, updateData]);

  // Rule management
  const addRule = useCallback(() => {
    const newRule: WorldRule = {
      id: crypto.randomUUID(),
      category: 'physical',
      rule: '',
      implications: '',
    };
    updateData({
      rules: [...(data.rules || []), newRule],
    });
  }, [data.rules, updateData]);

  const removeRule = useCallback((id: string) => {
    updateData({
      rules: (data.rules || []).filter((r) => r.id !== id),
    });
  }, [data.rules, updateData]);

  // Object management
  const addKeyObject = useCallback(() => {
    const newObject: WorldObject = {
      id: crypto.randomUUID(),
      name: '',
      type: '',
      description: '',
      influence: '',
    };
    updateData({
      keyObjects: [...(data.keyObjects || []), newObject],
    });
  }, [data.keyObjects, updateData]);

  const removeKeyObject = useCallback((id: string) => {
    updateData({
      keyObjects: (data.keyObjects || []).filter((o) => o.id !== id),
    });
  }, [data.keyObjects, updateData]);

  // Apply preset
  const applyPreset = useCallback((preset: WorldPreset) => {
    setData((prev) => ({
      ...prev,
      name: prev.name || preset.name,
      genre: preset.genre,
      tone: preset.tone,
      locations: (preset.locations || []).map(l => ({
        id: crypto.randomUUID(),
        name: l.name || '',
        description: l.description || '',
        significance: l.significance || '',
        atmosphere: l.atmosphere || '',
        location_type: 'exterior',
      })),
      rules: (preset.rules || []).map(r => ({
        id: crypto.randomUUID(),
        category: r.category || 'physical',
        rule: r.rule || '',
        implications: r.implications || '',
      })),
      keyObjects: (preset.keyObjects || []).map(o => ({
        id: crypto.randomUUID(),
        name: o.name || '',
        type: o.type || '',
        description: o.description || '',
        influence: o.influence || '',
      })),
      culturalElements: {
        languages: preset.culturalElements.languages || [],
        religions: preset.culturalElements.religions || [],
        traditions: preset.culturalElements.traditions || [],
        historicalEvents: [],
        culturalConflicts: [],
      },
    }));
  }, []);

  const handleFinish = useCallback(async () => {
    const finalWorld: World = {
      ...data,
      id: data.id || crypto.randomUUID(),
      name: data.name || 'Unnamed World',
      genre: data.genre || [],
      tone: data.tone || [],
      locations: data.locations || [],
      rules: data.rules || [],
      culturalElements: data.culturalElements || {
        languages: [], religions: [], traditions: [], historicalEvents: [], culturalConflicts: []
      },
      timePeriod: data.timePeriod || '',
      atmosphere: data.atmosphere || '',
      technology: data.technology || '',
      magic: data.magic || '',
      conflicts: data.conflicts || [],
      keyObjects: data.keyObjects || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Store globally
    addWorld(finalWorld);
    
    // Persist locally/DB
    try {
      if (saveWorld) {
        await saveWorld(finalWorld);
      }
    } catch (error) {
      console.error('Failed to persist world:', error);
    }

    onComplete(finalWorld);
  }, [data, addWorld, saveWorld, onComplete]);

  // Render current step content
  const stepContent = useMemo(() => {
    switch (currentStep) {
      case 1:
        return (
          <QuickSetupStep 
            data={data} 
            onUpdate={updateData} 
            onApplyPreset={applyPreset} 
          />
        );
      case 2:
        return (
          <LocationsRulesStep 
            data={data} 
            onUpdate={updateData}
            onAddLocation={addLocation}
            onRemoveLocation={removeLocation}
            onAddRule={addRule}
            onRemoveRule={removeRule}
            onAddKeyObject={addKeyObject}
            onRemoveKeyObject={removeKeyObject}
          />
        );
      case 3:
        return (
          <CultureReviewStep 
            data={data} 
            onUpdate={updateData} 
          />
        );
      default:
        return null;
    }
  }, [currentStep, data, updateData, applyPreset, addLocation, removeLocation, addRule, removeRule, addKeyObject, removeKeyObject]);

  const isStepValid = useMemo(() => {
    if (currentStep === 1) return !!data.name?.trim() && (data.genre?.length || 0) > 0;
    if (currentStep === 2) return (data.locations?.length || 0) > 0;
    return true;
  }, [currentStep, data]);

  return (
    <WizardErrorBoundary wizardType="world">
      <div className="flex flex-col h-full max-w-7xl mx-auto bg-white/5 dark:bg-gray-950/40 backdrop-blur-xl border border-white/10 dark:border-white/5 rounded-3xl shadow-2xl overflow-hidden">
        {/* Plasma Plex Header Area */}
        <div className="px-10 pt-10 pb-6 relative overflow-hidden">
          {/* Animated Background Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/20 blur-[100px] -z-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 blur-[80px] -z-10" />
          
          <div className="flex justify-between items-start mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                  World Genesis
                  <span className="text-[10px] font-bold uppercase py-1 px-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full tracking-widest shadow-sm">v3.0</span>
                </h2>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium ml-12">
                Sculpting the foundations of a new reality.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <WizardVoiceAssistant
                entityType="location"
                onFieldChange={(section, field, value) => {
                  if (section === 'culturalElements') {
                    updateData({
                      culturalElements: {
                        ...(data.culturalElements || {}),
                        [field]: value
                      }
                    } as Partial<World>);
                  } else {
                    updateData({ [field]: value } as Partial<World>);
                  }
                }}
                onTabChange={(tabId) => {
                  const stepMap: Record<string, number> = {
                    'foundations': 1, 'presets': 1,
                    'architecture': 2, 'locations': 2, 'rules': 2,
                    'fabric': 3, 'culture': 3, 'review': 3
                  };
                  if (stepMap[tabId.toLowerCase()]) {
                    setCurrentStep(stepMap[tabId.toLowerCase()]);
                  }
                }}
                onDashboard={onCancel}
              />
              <button 
                onClick={onCancel}
                className="group flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-all rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/50"
              >
                <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                Abort Genesis
              </button>
            </div>
          </div>

          <WizardStepIndicator 
            steps={steps} 
            currentStep={currentStep} 
          />
        </div>

        {/* Content Area with Glassmorphism */}
        <div className="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar relative">
          <div className="max-w-5xl mx-auto pb-12">
            {stepContent}
          </div>
        </div>

        {/* Plasma Plex Navigation Area */}
        <div className="px-10 py-8 border-t border-gray-100/10 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-2xl">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${lastSaved ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-700'}`} />
              <span className="text-xs font-medium text-gray-400">
                {lastSaved ? `Evolution saved: ${lastSaved.toLocaleTimeString()}` : 'Divergence pending...'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep((s) => s - 1)}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-all rounded-2xl active:scale-95 border border-transparent hover:border-gray-300 dark:hover:border-gray-700"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous Phase
                </button>
              )}
              
              <button
                onClick={() => {
                  const success = saveWizardState('world', currentStep, data);
                  if (success) setLastSaved(new Date());
                }}
                className="p-3 text-gray-500 hover:text-indigo-500 bg-gray-100 dark:bg-gray-800/50 rounded-2xl transition-all active:scale-90"
                title="Save Draft"
              >
                <Save className="w-5 h-5" />
              </button>

              {currentStep < steps.length ? (
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setCurrentStep((s) => s + 1)}
                    disabled={!isStepValid}
                    className={`flex items-center gap-2 px-8 py-3 text-sm font-bold rounded-2xl transition-all active:scale-95 shadow-lg ${
                      isStepValid 
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5' 
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Continue Evolution
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  {!isStepValid && currentStep === 1 && (
                    <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 animate-pulse uppercase tracking-wider pr-2">
                      Designation & Archetype required
                    </span>
                  )}
                  {!isStepValid && currentStep === 2 && (
                    <span className="text-[10px] font-bold text-amber-500 dark:text-amber-400 animate-pulse uppercase tracking-wider pr-2">
                      Record at least one site
                    </span>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-10 py-3 text-sm font-black bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5"
                >
                  Finalize Reality
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </WizardErrorBoundary>
  );
}

