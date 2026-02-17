import React, { useCallback, useEffect, useState } from 'react';
import { WizardProvider, useWizard } from '@/contexts/WizardContext';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import type { WizardStep } from '../WizardStepIndicator';
import type { World } from '@/types/world';
import { createEmptyWorld } from '@/types/world';
import { useStore } from '@/store';
import { useWorldPersistence } from '@/hooks/useWorldPersistence';
import { llmConfigService } from '@/services/llmConfigService';
import { Step1BasicInformation } from './Step1BasicInformation';
import { Step2WorldRules } from './Step2WorldRules';
import { Step3Locations } from './Step3Locations';
import { Step4KeyObjects } from './Step4KeyObjects';
import { Step4CulturalElements } from './Step4CulturalElements';
import { Step5ReviewFinalize } from './Step5ReviewFinalize';
import { WizardChainOptions, WizardChainOption } from '../WizardChainOptions';
import { Loader2, CheckCircle2 } from 'lucide-react';
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
    title: 'Basic Info',
    description: 'Name, genre, and tone',
  },
  {
    number: 2,
    title: 'World Rules',
    description: 'Laws and systems',
  },
  {
    number: 3,
    title: 'Locations',
    description: 'Key places',
  },
  {
    number: 4,
    title: 'Key Objects',
    description: 'Artifacts & Items',
  },
  {
    number: 5,
    title: 'Culture',
    description: 'Cultural elements',
  },
  {
    number: 6,
    title: 'Review',
    description: 'Finalize world',
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
      title="World Builder"
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
        case 1: // Basic Information
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

        case 2: // World Rules
          // Optional validation - rules can be empty
          break;

        case 3: // Locations
          // Optional validation - locations can be empty
          if (data.locations && data.locations.length > 0) {
            data.locations.forEach((location, index) => {
              if (!location.name || location.name.trim() === '') {
                errors[`location-${index}-name`] = ['Location name is required'];
              }
            });
          }
          break;

        case 4: // Key Objects
          // Optional validation - objects can be empty
          if (data.keyObjects && data.keyObjects.length > 0) {
            data.keyObjects.forEach((object, index) => {
              if (!object.name || object.name.trim() === '') {
                errors[`object-${index}-name`] = ['Object name is required'];
              }
            });
          }
          break;

        case 5: // Cultural Elements
          // Optional validation - cultural elements can be empty
          break;

        case 6: // Review
          // Final validation - ensure all required fields are present
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
        technology: data.technology || '',
        magic: data.magic || '',
        conflicts: data.conflicts || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add to store (which also persists to localStorage and updates project)
      addWorld(world);

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
    switch (currentStep) {
      case 1:
        return <Step1BasicInformation />;
      case 2:
        return <Step2WorldRules />;
      case 3:
        return <Step3Locations />;
      case 4:
        return <Step4KeyObjects />;
      case 5:
        return <Step4CulturalElements />;
      case 6:
        return <Step5ReviewFinalize />;
      default:
        return null;
    }
  };

  // Create a simple no-arg callback for WizardContainer
  // The actual world data is handled by handleSubmit (passed to WizardProvider.onSubmit)
  const handleWizardComplete = useCallback(() => {
    // This callback is called after submitWizard() completes successfully
    // The world has already been created and onComplete(world) was called by handleSubmit
    // This is just a notification that the wizard finished
  }, []);

  // ============================================================================
  // Render Loading/Error States
  // ============================================================================

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initializing services...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <p className="text-sm text-red-500">Failed to initialize: {initError}</p>
        <button
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
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
        >
          Retry
        </button>
      </div>
    );
  }

  if (isSuccess && createdWorld) {
    const chainOptions: WizardChainOption[] = [
      {
        wizardType: 'create-character',
        label: 'Create Character',
        description: 'Populate your world with characters',
        icon: 'UserPlus'
      },
      {
        wizardType: 'create-location',
        label: 'Add More Locations',
        description: 'Detail specific places in your world',
        icon: 'MapPin'
      }
    ];

    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-6 h-full">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold">World Created Successfully!</h2>
          <p className="text-gray-600 max-w-md">
            "{createdWorld.name}" has been saved and is ready to use.
          </p>
        </div>

        <div className="w-full max-w-md border-t pt-6">
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

