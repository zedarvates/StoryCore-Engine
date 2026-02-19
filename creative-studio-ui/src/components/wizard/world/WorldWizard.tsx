import React, { useCallback, useEffect, useState } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { World } from '@/types/world';
import { createEmptyWorld } from '@/types/world';
import { useStore } from '@/store';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { llmConfigService } from '@/services/llmConfigService';
import { Step1RealityAnchor } from './Step1RealityAnchor';
import { Step2OntologicalGovernance } from './Step2OntologicalGovernance';
import { Step3TopographicCartography } from './Step3TopographicCartography';
import { Step4RegistryOfRelics } from './Step4RegistryOfRelics';
import { Step5SocietalMatrix } from './Step5SocietalMatrix';
import { Step6GenesisVerification } from './Step6GenesisVerification';
import { WizardChainOptions, WizardChainOption } from '../WizardChainOptions';
import { Loader2, CheckCircle2, Globe, Shield, MapPin, Package, Users, ClipboardList, Zap, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// World Wizard Component
// ============================================================================

export interface WorldWizardProps {
  onComplete: (world: World, nextAction?: string) => void;
  onCancel: () => void;
  initialData?: Partial<World>;
}

const WIZARD_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Reality Anchor',
    description: 'Designation and temporal coordinates',
    icon: Globe,
  },
  {
    number: 2,
    title: 'Ontological Governance',
    description: 'Systemic laws and constraints',
    icon: Shield,
  },
  {
    number: 3,
    title: 'Topographic Cartography',
    description: 'Environmental node mapping',
    icon: MapPin,
  },
  {
    number: 4,
    title: 'Registry of Relics',
    description: 'Artifact registry and physical assets',
    icon: Package,
  },
  {
    number: 5,
    title: 'Societal Matrix',
    description: 'Cultural and social protocols',
    icon: Users,
  },
  {
    number: 6,
    title: 'Genesis Verification',
    description: 'Ontological synchronization',
    icon: ClipboardList,
  },
];

// ============================================================================
// World Wizard Content (uses wizard context)
// ============================================================================

interface WorldWizardContentProps {
  steps: WizardStep[];
  onCancel: () => void;
  renderStepContent: (step: number) => React.ReactNode;
  onComplete?: () => void;
}

function WorldWizardContent({ steps, onCancel, renderStepContent, onComplete }: WorldWizardContentProps) {
  const { currentStep, nextStep, previousStep, goToStep, isDirty, submitWizard } = useWizard<World>();

  const handleComplete = async () => {
    await submitWizard();
    onComplete?.();
  };

  return (
    <ProductionWizardContainer
      title="Genesis Engine"
      steps={steps}
      onCancel={onCancel}
      onComplete={handleComplete}
      allowJumpToStep={false}
      showAutoSaveIndicator={true}
      currentStep={currentStep}
      onNextStep={nextStep}
      onPreviousStep={previousStep}
      onGoToStep={goToStep}
      isDirty={isDirty}
    >
      {renderStepContent(currentStep)}
    </ProductionWizardContainer>
  );
}

export function WorldWizard({ onComplete, onCancel, initialData }: WorldWizardProps) {
  // Get store actions
  const addWorld = useStore((state) => state.addWorld);

  // Get world persistence hook
  const { saveWorld } = useWorldPersistence();

  // Local state for success view
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdWorld, setCreatedWorld] = useState<World | null>(null);

  // ============================================================================
  // LLM Service Initialization
  // ============================================================================

  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initializeServices = async () => {
      try {
        // Initialize llmConfigService if not already done
        if (!llmConfigService.isConfigured()) {
          await llmConfigService.initialize();
        }
        if (isMounted) {
          setIsInitializing(false);
        }
      } catch (error) {
        console.error('[WorldWizard] Failed to initialize LLM service:', error);
        if (isMounted) {
          setInitError(error instanceof Error ? error.message : 'Initialization failed');
          setIsInitializing(false);
        }
      }
    };

    initializeServices();

    return () => {
      isMounted = false;
    };
  }, []);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateStep = useCallback(
    async (step: number, data: Partial<World>): Promise<Record<string, string[]>> => {
      const errors: Record<string, string[]> = {};

      switch (step) {
        case 0: // Reality Anchor (Step 1)
          if (!data.name || data.name.trim() === '') {
            errors.name = ['World name is required'];
          }
          if (!data.timePeriod || data.timePeriod.trim() === '') {
            errors.timePeriod = ['Time period is required'];
          }
          if (!data.genre || data.genre.length === 0) {
            errors.genre = ['At least one genre must be selected'];
          }
          if (!data.tone || data.tone.length === 0) {
            errors.tone = ['At least one tone must be selected'];
          }
          break;

        case 1: // Ontological Systems (Step 2)
          break;

        case 2: // Environmental Nodes (Step 3)
          if (data.locations && data.locations.length > 0) {
            data.locations.forEach((location, index) => {
              if (!location.name || location.name.trim() === '') {
                errors[`location-${index}-name`] = ['Location name is required'];
              }
            });
          }
          break;

        case 3: // Artifact Registry (Step 4)
          if (data.keyObjects && data.keyObjects.length > 0) {
            data.keyObjects.forEach((object, index) => {
              if (!object.name || object.name.trim() === '') {
                errors[`object-${index}-name`] = ['Object name is required'];
              }
            });
          }
          break;

        case 4: // Societal Matrix (Step 5)
          break;

        case 5: // Genesis Verification (Step 6)
          if (!data.name || data.name.trim() === '') {
            errors.name = ['World name is required'];
          }
          break;
      }

      return errors;
    },
    []
  );

  // ============================================================================
  // Submission
  // ============================================================================

  const handleSubmit = useCallback(
    async (data: Partial<World>) => {
      // Create complete world object
      const world: World = {
        id: crypto.randomUUID(),
        name: data.name || '',
        genre: data.genre || [],
        timePeriod: data.timePeriod || '',
        tone: data.tone || [],
        locations: data.locations || [],
        rules: data.rules || [],
        keyObjects: data.keyObjects || [],
        atmosphere: data.atmosphere || '',
        culturalElements: data.culturalElements || {
          languages: [],
          religions: [],
          traditions: [],
          historicalEvents: [],
          culturalConflicts: [],
        },
        visualIntent: data.visualIntent || {
          colors: [],
          style: '',
          vibe: ''
        },
        technology: data.technology || '',
        magic: data.magic || '',
        conflicts: data.conflicts || [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      // Add to store (which also persists to localStorage and updates project)
      addWorld(world);

      // Total Recall: Analyze for memory
      const { projectMemory } = await import('@/services/ProjectMemoryService');
      projectMemory.analyzeForMemory(
        `WORLD CREATED: ${world.name}\nGenre: ${world.genre.join(', ')}\nAtmosphere: ${world.atmosphere}\nTime Period: ${world.timePeriod}\nRules: ${world.rules.map(r => r.rule + ': ' + r.implications).join('; ')}`,
        'World Genesis'
      );

      // Save to project directory if available
      try {
        await saveWorld(world);
      } catch (error) {
        console.warn('[WorldWizard] Failed to save world to project directory:', error);
        // World is already in store, so we continue
      }

      // Emit event for other components to subscribe to
      window.dispatchEvent(
        new CustomEvent('world-created', {
          detail: { world },
        })
      );

      // Store created world for chaining
      setCreatedWorld(world);
      setIsSuccess(true);
    },
    [addWorld, saveWorld]
  );

  const handleChainNext = useCallback((wizard: WizardChainOption) => {
    if (createdWorld) {
      onComplete(createdWorld, wizard.wizardType);
    }
  }, [createdWorld, onComplete]);

  const handleFinish = useCallback(() => {
    if (createdWorld) {
      onComplete(createdWorld);
    }
  }, [createdWorld, onComplete]);

  // ============================================================================
  // Render Step Content
  // ============================================================================

  const renderStepContent = (currentStep: number) => {
    // Steps are 0-indexed in the wizard context
    switch (currentStep) {
      case 0:
        return <Step1RealityAnchor />;
      case 1:
        return <Step2OntologicalGovernance />;
      case 2:
        return <Step3TopographicCartography />;
      case 3:
        return <Step4RegistryOfRelics />;
      case 4:
        return <Step5SocietalMatrix />;
      case 5:
        return <Step6GenesisVerification />;
      default:
        return null;
    }
  };

  const handleWizardComplete = useCallback(() => {
    // This callback is called after submitWizard() completes successfully
  }, []);

  // ============================================================================
  // Render Loading/Error States
  // ============================================================================

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6 h-[400px] border border-primary/10 rounded-xl bg-primary/5 backdrop-blur-sm">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
          <Database className="w-6 h-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-bold text-primary neon-text uppercase tracking-widest">Initializing Core</p>
          <p className="text-xs text-muted-foreground uppercase tracking-tighter">Synchronizing with Genesis Engine...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6 border border-red-500/20 rounded-xl bg-red-500/5 backdrop-blur-sm">
        <p className="text-sm text-red-400 font-mono">CRITICAL_INIT_FAILURE: {initError}</p>
        <Button
          onClick={() => {
            setInitError(null);
            setIsInitializing(true);
            llmConfigService.initialize().then(() => {
              setIsInitializing(false);
            }).catch((error) => {
              setInitError(error instanceof Error ? error.message : 'Initialization failed');
              setIsInitializing(false);
            });
          }}
          variant="outline"
          className="border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          Re-initialize System
        </Button>
      </div>
    );
  }

  if (isSuccess && createdWorld) {
    const chainOptions: WizardChainOption[] = [
      {
        wizardType: 'create-character',
        label: 'Initialize Persona Nodes',
        description: 'Populate reality with sentient character manifests',
        icon: 'UserPlus'
      },
      {
        wizardType: 'create-location',
        label: 'Detail Supplementary Nodes',
        description: 'Specify additional environmental data points',
        icon: 'MapPin'
      }
    ];

    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-8 h-full bg-primary/5 backdrop-blur-md border border-primary/20 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="flex flex-col items-center text-center space-y-4 relative z-10">
          <div className="w-24 h-24 bg-primary/20 rounded-2xl flex items-center justify-center mb-2 border border-primary/30 shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)] group">
            <CheckCircle2 className="w-14 h-14 text-primary neon-text group-hover:scale-110 transition-transform duration-500" />
          </div>
          <h2 className="text-4xl font-extrabold neon-text text-primary uppercase tracking-tighter">Genesis Complete</h2>
          <p className="text-primary-foreground/90 max-w-md text-lg leading-relaxed">
            The world of <span className="text-primary font-bold">"{createdWorld.name}"</span> has been successfully instantiated in the global registry.
          </p>
          <div className="flex items-center gap-2 text-primary/60 font-mono text-xs uppercase tracking-widest bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
            <Zap className="h-3 w-3" /> System Synchronized
          </div>
        </div>

        <div className="w-full max-w-lg border-t border-primary/10 pt-8 relative z-10">
          <WizardChainOptions
            isChained={true}
            triggeredWizards={chainOptions}
            currentChainIndex={0}
            onLaunchNext={handleChainNext}
            onSkipChain={handleFinish}
            onContinue={handleFinish}
          />
        </div>
      </div>
    );
  }

  return (
    <WizardProvider<World>
      wizardType="world"
      totalSteps={6}
      initialData={initialData || createEmptyWorld()}
      onSubmit={handleSubmit}
      onValidateStep={validateStep}
      autoSave={true}
      autoSaveDelay={2000}
    >
      <WorldWizardContent
        steps={WIZARD_STEPS}
        onCancel={onCancel}
        onComplete={handleWizardComplete}
        renderStepContent={renderStepContent}
      />
    </WizardProvider>
  );
}
