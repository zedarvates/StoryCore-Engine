import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import { WizardStep } from '@/types/wizard';
import { ShotWizardState } from '@/types/wizard';
import { ShotTemplate } from '@/types/template';
import { ProductionShot } from '@/types/shot';

// Services
import { templateManager } from '@/services/templateManager';
import { draftStorage } from '@/services/draftStorage';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a ShotTemplate to a base ProductionShot
 */
function templateToBaseProductionShot(template: ShotTemplate): Partial<ProductionShot> {
  const config = template.configuration as Partial<ProductionShot>;
  return {
    ...config,
    notes: `New ${template.name}`,
    tags: template.tags,
  };
}

// ============================================================================
// Shot Wizard Steps Configuration
// ============================================================================

const SHOT_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Type Selection',
    description: 'Choose shot type and apply template',
    icon: '🎬',
  },
  {
    number: 2,
    title: 'Composition',
    description: 'Set up characters, environment, and framing',
    icon: '🎭',
  },
  {
    number: 3,
    title: 'Camera Setup',
    description: 'Configure camera angle, movement, and framing',
    icon: '📹',
  },
  {
    number: 4,
    title: 'Timing',
    description: 'Set duration, transitions, and timing',
    icon: '⏱️',
  },
  {
    number: 5,
    title: 'Generation Settings',
    description: 'Configure AI model, prompts, and parameters',
    icon: '⚙️',
  },
  {
    number: 6,
    title: 'Preview',
    description: 'Review configuration and generation estimates',
    icon: '👁️',
  },
  {
    number: 7,
    title: 'Finalize',
    description: 'Save shot or generate immediately',
    icon: '✅',
  },
];

// ============================================================================
// Shot Wizard Component
// ============================================================================

interface ShotWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (shot: ProductionShot) => void;
  sequenceId?: string;
  sceneId?: string;
  shotNumber?: number;
  initialTemplateId?: string;
  existingShot?: ProductionShot;
  quickMode?: boolean;
}

export function ShotWizard({
  isOpen,
  onClose,
  onComplete,
  sequenceId,
  sceneId,
  shotNumber,
  initialTemplateId,
  existingShot,
  quickMode = false,
}: ShotWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [wizardState, setWizardState] = useState<ShotWizardState>(() => ({
    currentStep: 0,
    formData: existingShot ? { ...existingShot } : {},
    selectedTemplate: undefined,
    generatedPrompt: '',
    validationErrors: {},
    previewData: {
      thumbnailUrl: undefined,
      estimatedDuration: 0,
      estimatedCost: 0,
      qualityScore: 0,
    },
    isDirty: false,
    lastSaved: 0,
    quickMode,
  }));

  const [availableTemplates, setAvailableTemplates] = useState<ShotTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Initialization Effects
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen, initialTemplateId, existingShot]);

  const initializeWizard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load available templates
      const templates = await templateManager.getAllShotTemplates();
      setAvailableTemplates(templates);

      // Initialize state based on props
      let initialState: ShotWizardState = {
        currentStep: 0,
        formData: {},
        selectedTemplate: undefined,
        generatedPrompt: '',
        validationErrors: {},
        previewData: {
          thumbnailUrl: undefined,
          estimatedDuration: 0,
          estimatedCost: 0,
          qualityScore: 0,
        },
        isDirty: false,
        lastSaved: 0,
        quickMode,
      };

      if (existingShot) {
        // Editing existing shot
        initialState.formData = { ...existingShot };
        initialState.currentStep = 0; // Start at first step for review
      } else if (initialTemplateId) {
        // Starting with a template
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          initialState.selectedTemplate = template;
          initialState.formData = templateToBaseProductionShot(template);
        }
      }

      // Set context information
      if (sequenceId) initialState.formData.sequencePlanId = sequenceId;
      if (sceneId) initialState.formData.sceneId = sceneId;
      if (shotNumber) initialState.formData.number = shotNumber;

      // Try to load draft if no existing shot
      if (!existingShot) {
        const drafts = await draftStorage.listDrafts('shot');
        if (drafts.length > 0) {
          // Load the most recent draft
          const mostRecentDraft = drafts[0];
          const draft = await draftStorage.loadDraft('shot', mostRecentDraft.id);
          if (draft) {
            initialState = { ...initialState, ...draft };
          }
        }
      }

      setWizardState(initialState);
    } catch (err) {
      console.error('Failed to initialize wizard:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize wizard');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // Auto-save Effect
  // ============================================================================

  useEffect(() => {
    if (wizardState.isDirty && !existingShot) {
      const saveDraft = async () => {
        try {
          // Create a temporary full production shot for draft saving
          const draftShot: ProductionShot = {
            id: wizardState.formData.id || `draft-${Date.now()}`,
            sequencePlanId: wizardState.formData.sequencePlanId || '',
            sceneId: wizardState.formData.sceneId || '',
            number: wizardState.formData.number || 1,
            type: wizardState.formData.type || 'medium',
            category: wizardState.formData.category || 'establishing',
            composition: wizardState.formData.composition || {
              characterIds: [],
              characterPositions: [],
              environmentId: '',
              props: [],
              lightingMood: '',
              timeOfDay: '',
            },
            camera: wizardState.formData.camera || {
              framing: 'medium',
              angle: 'eye-level',
              movement: { type: 'static' },
            },
            timing: wizardState.formData.timing || {
              duration: 0,
              inPoint: 0,
              outPoint: 0,
              transition: 'cut',
              transitionDuration: 0,
            },
            generation: wizardState.formData.generation || {
              aiProvider: '',
              model: '',
              prompt: wizardState.generatedPrompt || '',
              negativePrompt: '',
              comfyuiPreset: '',
              parameters: {
                width: 1920,
                height: 1080,
                steps: 20,
                cfgScale: 7,
                sampler: 'euler',
                scheduler: 'normal',
              },
              styleReferences: [],
            },
            status: 'planned',
            thumbnailUrl: undefined,
            generatedAssetUrl: undefined,
            notes: '',
            tags: wizardState.formData.tags || [],
            templates: wizardState.formData.templates || [],
          };

          await draftStorage.saveDraft('shot', draftShot);
          setWizardState(prev => ({
            ...prev,
            lastSaved: Date.now(),
            isDirty: false,
          }));
        } catch (err) {
          console.error('Failed to auto-save draft:', err);
        }
      };

      const timer = setTimeout(saveDraft, 30000); // Auto-save every 30 seconds
      return () => clearTimeout(timer);
    }
  }, [wizardState.isDirty, wizardState.formData, existingShot]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const updateFormData = useCallback((updates: Partial<ProductionShot>) => {
    setWizardState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
      isDirty: true,
    }));
  }, []);

  const updateGeneratedPrompt = useCallback((prompt: string) => {
    setWizardState(prev => ({
      ...prev,
      generatedPrompt: prompt,
      isDirty: true,
    }));
  }, []);

  const updatePreviewData = useCallback((previewData: Partial<ShotWizardState['previewData']>) => {
    setWizardState(prev => ({
      ...prev,
      previewData: { ...prev.previewData, ...previewData },
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < SHOT_STEPS.length) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < SHOT_STEPS.length - 1) {
      goToStep(wizardState.currentStep + 1);
    }
  }, [wizardState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // ============================================================================
  // Quick Mode Logic
  // ============================================================================

  const getEffectiveSteps = useCallback(() => {
    if (!wizardState.quickMode) return SHOT_STEPS;

    // In quick mode, skip steps 4 (Timing) and 6 (Preview) as they are optional
    return SHOT_STEPS.filter(step => step.number !== 4 && step.number !== 6);
  }, [wizardState.quickMode]);

  const getActualStepIndex = useCallback((displayStep: number) => {
    const effectiveSteps = getEffectiveSteps();
    return effectiveSteps.findIndex(step => step.number === displayStep);
  }, [getEffectiveSteps]);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleComplete = useCallback(async () => {
    try {
      setIsLoading(true);

      // Create final production shot
      const finalShot: ProductionShot = {
        id: wizardState.formData.id || `shot_${Date.now()}`,
        sequencePlanId: wizardState.formData.sequencePlanId || '',
        sceneId: wizardState.formData.sceneId || '',
        number: wizardState.formData.number || 1,
        type: wizardState.formData.type || 'medium',
        category: wizardState.formData.category || 'establishing',
        composition: wizardState.formData.composition || {
          characterIds: [],
          characterPositions: [],
          environmentId: '',
          props: [],
          lightingMood: '',
          timeOfDay: '',
        },
        camera: wizardState.formData.camera || {
          framing: 'medium',
          angle: 'eye-level',
          movement: { type: 'static' },
        },
        timing: wizardState.formData.timing || {
          duration: 0,
          inPoint: 0,
          outPoint: 0,
          transition: 'cut',
          transitionDuration: 0,
        },
        generation: {
          ...wizardState.formData.generation,
          prompt: wizardState.generatedPrompt || wizardState.formData.generation?.prompt || '',
        } as any, // Temporary fix for type issues
        status: 'planned',
        thumbnailUrl: undefined,
        generatedAssetUrl: undefined,
        notes: '',
        tags: wizardState.formData.tags || [],
        templates: wizardState.formData.templates || [],
      };

      // Clear any draft
      if (!existingShot) {
        await draftStorage.clearAllDrafts('shot');
      }

      onComplete(finalShot);
      onClose();
    } catch (err) {
      console.error('Failed to complete shot:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete shot');
    } finally {
      setIsLoading(false);
    }
  }, [wizardState, existingShot, onComplete, onClose]);

  // ============================================================================
  // Cancel Handler with Confirmation
  // ============================================================================

  const handleCancel = useCallback(() => {
    if (wizardState.isDirty) {
      // Show confirmation dialog (would be implemented with a proper dialog)
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to cancel?'
      );
      if (!confirmed) return;
    }

    // Clear draft if cancelling
    if (!existingShot) {
      draftStorage.clearAllDrafts('shot').catch(console.error);
    }

    onClose();
  }, [wizardState.isDirty, existingShot, onClose]);

  // ============================================================================
  // Context Header Component
  // ============================================================================

  const ContextHeader = () => {
    const contextSequenceId = sequenceId || wizardState.formData.sequencePlanId;
    const contextSceneId = sceneId || wizardState.formData.sceneId;
    const contextShotNumber = shotNumber || wizardState.formData.number;

    if (!contextSequenceId && !contextSceneId && !contextShotNumber) return null;

    return (
      <div className="bg-blue-50 border-b px-6 py-3">
        <div className="text-sm text-blue-800">
          <span className="font-medium">Context:</span>
          {contextSequenceId && <span className="ml-2">Sequence {contextSequenceId}</span>}
          {contextSceneId && <span className="ml-2">• Scene {contextSceneId}</span>}
          {contextShotNumber && <span className="ml-2">• Shot {contextShotNumber}</span>}
          {wizardState.quickMode && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Quick Mode
            </span>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // Step Content Renderer (Shell - placeholders for now)
  // ============================================================================

  const renderStepContent = () => {
    const currentStepNumber = getEffectiveSteps()[wizardState.currentStep].number;

    switch (currentStepNumber) {
      case 1:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Type Selection</h3>
            <p className="text-gray-600">Shot type selection component will be implemented here.</p>
          </div>
        );

      case 2:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Composition</h3>
            <p className="text-gray-600">Composition configuration component will be implemented here.</p>
          </div>
        );

      case 3:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Camera Setup</h3>
            <p className="text-gray-600">Camera setup component will be implemented here.</p>
          </div>
        );

      case 4:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Timing</h3>
            <p className="text-gray-600">Timing configuration component will be implemented here.</p>
          </div>
        );

      case 5:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Generation Settings</h3>
            <p className="text-gray-600">Generation settings component will be implemented here.</p>
          </div>
        );

      case 6:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Preview</h3>
            <p className="text-gray-600">Preview component will be implemented here.</p>
          </div>
        );

      case 7:
        return (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium mb-4">Finalize</h3>
            <p className="text-gray-600">Finalize component will be implemented here.</p>
            <button
              onClick={handleComplete}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Complete Shot Wizard
            </button>
          </div>
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  const effectiveSteps = getEffectiveSteps();

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Shot</DialogTitle>
        </DialogHeader>

        {/* Context Header */}
        <ContextHeader />

        <div className="flex-1 overflow-hidden">
          <ProductionWizardContainer
            title="Shot Wizard"
            steps={effectiveSteps}
            onCancel={handleCancel}
            onComplete={wizardState.currentStep === effectiveSteps.length - 1 ? handleComplete : nextStep}
            allowJumpToStep={false} // Can be enabled later if needed
            showAutoSaveIndicator={!existingShot}
            className="h-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-red-600">
                  <p className="mb-4">{error}</p>
                  <button
                    onClick={initializeWizard}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              renderStepContent()
            )}
          </ProductionWizardContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}