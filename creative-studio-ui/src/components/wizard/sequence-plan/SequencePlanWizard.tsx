import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductionWizardContainer } from '../production-wizards/ProductionWizardContainer';
import { WizardStep } from '@/types/wizard';
import { SequencePlanWizardState } from '@/types/wizard';
import { SequenceTemplate } from '@/types/template';
import { SequencePlan, Act, Scene } from '@/types/sequencePlan';
import { ProductionShot } from '@/types/shot';

// Step Components
import { Step1TemplateSelection } from './Step1TemplateSelection';
import { Step2BasicInformation } from './Step2BasicInformation';
import { Step3NarrativeStructure } from './Step3NarrativeStructure';
import { ScenePlanningInterface } from './Step4ScenePlanning';
import { Step5ShotPreview } from './Step5ShotPreview';
import { Step6ReviewFinalize } from './Step6ReviewFinalize';





const Step4ScenePlanning = ({ scenes, acts, onScenesChange, validationErrors, worldId }: any) => (
  <ScenePlanningInterface scenes={scenes} acts={acts} onScenesChange={onScenesChange} validationErrors={validationErrors} worldId={worldId} />
);

// Services
import { templateManager } from '@/services/templateManager';
import { draftStorage } from '@/services/draftStorage';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert a SequenceTemplate to a base SequencePlan
 */
function templateToBaseSequencePlan(template: SequenceTemplate): Partial<SequencePlan> {
  return {
    name: `New ${template.name}`,
    description: template.description,
    worldId: '', // To be filled by user
    templateId: template.id,
    targetDuration: template.defaults.targetDuration,
    frameRate: template.defaults.frameRate,
    resolution: { ...template.defaults.resolution },
    acts: template.structure.acts.map(act => ({
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      number: act.number,
      title: act.title,
      description: act.description,
      targetDuration: act.targetDuration,
      narrativePurpose: act.narrativePurpose,
      sceneIds: [],
    })),
    scenes: [],
    shots: [],
    createdAt: Date.now(),
    modifiedAt: Date.now(),
    status: 'draft',
    tags: [...template.tags],
  };
}

// ============================================================================
// Sequence Plan Wizard Steps Configuration
// ============================================================================

const SEQUENCE_PLAN_STEPS: WizardStep[] = [
  {
    number: 1,
    title: 'Template Selection',
    description: 'Choose a template or start from scratch',
    icon: '📋',
  },
  {
    number: 2,
    title: 'Basic Information',
    description: 'Set name, world, duration, and resolution',
    icon: 'ℹ️',
  },
  {
    number: 3,
    title: 'Narrative Structure',
    description: 'Define acts and their narrative purpose',
    icon: '🎬',
  },
  {
    number: 4,
    title: 'Scene Planning',
    description: 'Plan locations, characters, and beats for each scene',
    icon: '🎭',
  },
  {
    number: 5,
    title: 'Shot Preview',
    description: 'Timeline preview of your sequence plan',
    icon: '👁️',
  },
  {
    number: 6,
    title: 'Review & Finalize',
    description: 'Review your plan and save to project',
    icon: '✅',
  },
];

// ============================================================================
// Sequence Plan Wizard Component
// ============================================================================

interface SequencePlanWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sequencePlan: SequencePlan) => void;
  initialTemplateId?: string;
  existingSequencePlan?: SequencePlan;
}

export function SequencePlanWizard({
  isOpen,
  onClose,
  onComplete,
  initialTemplateId,
  existingSequencePlan,
}: SequencePlanWizardProps) {
  // ============================================================================
  // State Management
  // ============================================================================

  const [wizardState, setWizardState] = useState<SequencePlanWizardState>(() => ({
    currentStep: 0,
    formData: existingSequencePlan ? { ...existingSequencePlan } : {},
    selectedTemplate: undefined,
    validationErrors: {},
    isDirty: false,
    lastSaved: 0,
  }));

  const [availableTemplates, setAvailableTemplates] = useState<SequenceTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Initialization Effects
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen, initialTemplateId, existingSequencePlan]);

  const initializeWizard = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load available templates
      const templates = await templateManager.getAllSequenceTemplates();
      setAvailableTemplates(templates);

      // Initialize state based on props
      let initialState: SequencePlanWizardState = {
        currentStep: 0,
        formData: {},
        selectedTemplate: undefined,
        validationErrors: {},
        isDirty: false,
        lastSaved: 0,
      };

      if (existingSequencePlan) {
        // Editing existing sequence plan
        initialState.formData = { ...existingSequencePlan };
        initialState.currentStep = 0; // Start at first step for review
      } else if (initialTemplateId) {
        // Starting with a template
        const template = templates.find(t => t.id === initialTemplateId);
        if (template) {
          initialState.selectedTemplate = template;
          initialState.formData = templateToBaseSequencePlan(template);
        }
      }

      // Try to load draft if no existing plan
      if (!existingSequencePlan) {
        const drafts = await draftStorage.listDrafts('sequence-plan');
        if (drafts.length > 0) {
          // Load the most recent draft
          const mostRecentDraft = drafts[0];
          const draft = await draftStorage.loadDraft('sequence-plan', mostRecentDraft.id);
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
    if (wizardState.isDirty && !existingSequencePlan) {
      const saveDraft = async () => {
        try {
          // Create a temporary full sequence plan for draft saving
          const draftSequencePlan: SequencePlan = {
            id: wizardState.formData.id || `draft-${Date.now()}`,
            name: wizardState.formData.name || 'Draft Sequence Plan',
            description: wizardState.formData.description || '',
            worldId: wizardState.formData.worldId || '',
            templateId: wizardState.selectedTemplate?.id,
            targetDuration: wizardState.formData.targetDuration || 0,
            frameRate: wizardState.formData.frameRate || 24,
            resolution: wizardState.formData.resolution || { width: 1920, height: 1080 },
            acts: wizardState.formData.acts || [],
            scenes: wizardState.formData.scenes || [],
            shots: wizardState.formData.shots || [],
            createdAt: wizardState.formData.createdAt || Date.now(),
            modifiedAt: Date.now(),
            status: 'draft',
            tags: wizardState.formData.tags || [],
          };

          await draftStorage.saveDraft('sequence-plan', draftSequencePlan);
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
  }, [wizardState.isDirty, wizardState.formData, existingSequencePlan]);

  // ============================================================================
  // Navigation Handlers
  // ============================================================================

  const updateFormData = useCallback((updates: Partial<SequencePlan>) => {
    setWizardState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
      isDirty: true,
    }));
  }, []);

  const goToStep = useCallback((stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < SEQUENCE_PLAN_STEPS.length) {
      setWizardState(prev => ({
        ...prev,
        currentStep: stepIndex,
      }));
    }
  }, []);

  const nextStep = useCallback(() => {
    if (wizardState.currentStep < SEQUENCE_PLAN_STEPS.length - 1) {
      goToStep(wizardState.currentStep + 1);
    }
  }, [wizardState.currentStep, goToStep]);

  const previousStep = useCallback(() => {
    if (wizardState.currentStep > 0) {
      goToStep(wizardState.currentStep - 1);
    }
  }, [wizardState.currentStep, goToStep]);

  // ============================================================================
  // Completion Handler
  // ============================================================================

  const handleComplete = useCallback(async () => {
    try {
      setIsLoading(true);

      // Create final sequence plan
      const finalSequencePlan: SequencePlan = {
        id: wizardState.formData.id || `seq_${Date.now()}`,
        name: wizardState.formData.name || 'Unnamed Sequence',
        description: wizardState.formData.description || '',
        worldId: wizardState.formData.worldId || '',
        templateId: wizardState.selectedTemplate?.id,
        targetDuration: wizardState.formData.targetDuration || 0,
        frameRate: wizardState.formData.frameRate || 24,
        resolution: wizardState.formData.resolution || { width: 1920, height: 1080 },
        acts: wizardState.formData.acts || [],
        scenes: wizardState.formData.scenes || [],
        shots: wizardState.formData.shots || [],
        createdAt: wizardState.formData.createdAt || Date.now(),
        modifiedAt: Date.now(),
        status: 'completed',
        tags: wizardState.formData.tags || [],
      };

      // Clear any draft
      if (!existingSequencePlan) {
        await draftStorage.clearAllDrafts('sequence-plan');
      }

      onComplete(finalSequencePlan);
      onClose();
    } catch (err) {
      console.error('Failed to complete sequence plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete sequence plan');
    } finally {
      setIsLoading(false);
    }
  }, [wizardState, existingSequencePlan, onComplete, onClose]);

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
    if (!existingSequencePlan) {
      draftStorage.clearAllDrafts('sequence-plan').catch(console.error);
    }

    onClose();
  }, [wizardState.isDirty, existingSequencePlan, onClose]);

  // ============================================================================
  // Step Content Renderer
  // ============================================================================

  const renderStepContent = () => {
    const currentStepNumber = SEQUENCE_PLAN_STEPS[wizardState.currentStep].number;

    switch (currentStepNumber) {
      case 1:
        return (
          <Step1TemplateSelection
            selectedTemplate={wizardState.selectedTemplate}
            availableTemplates={availableTemplates}
            onTemplateSelect={(template) => {
              setWizardState(prev => ({
                ...prev,
                selectedTemplate: template,
                formData: template ? templateToBaseSequencePlan(template) : {},
                isDirty: true,
              }));
            }}
          />
        );

      case 2:
        return (
          <Step2BasicInformation
            formData={wizardState.formData}
            onChange={updateFormData}
            validationErrors={wizardState.validationErrors}
          />
        );

      case 3:
        return (
          <Step3NarrativeStructure
            acts={wizardState.formData.acts || []}
            onActsChange={(acts: Act[]) => updateFormData({ acts })}
            targetDuration={wizardState.formData.targetDuration || 0}
            validationErrors={wizardState.validationErrors}
          />
        );

      case 4:
        return (
          <Step4ScenePlanning
            scenes={wizardState.formData.scenes || []}
            acts={wizardState.formData.acts || []}
            onScenesChange={(scenes: Scene[]) => updateFormData({ scenes })}
            validationErrors={wizardState.validationErrors}
            worldId={wizardState.formData.worldId}
          />
        );

      case 5:
        return (
          <Step5ShotPreview
            sequencePlan={wizardState.formData}
            onShotsChange={(shots: ProductionShot[]) => updateFormData({ shots })}
          />
        );

      case 6:
        return (
          <Step6ReviewFinalize
            sequencePlan={wizardState.formData}
            selectedTemplate={wizardState.selectedTemplate}
            onEditStep={goToStep}
            onComplete={handleComplete}
          />
        );

      default:
        return <div>Unknown step</div>;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Sequence Plan</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ProductionWizardContainer
            title="Sequence Plan Wizard"
            steps={SEQUENCE_PLAN_STEPS}
            onCancel={handleCancel}
            onComplete={wizardState.currentStep === SEQUENCE_PLAN_STEPS.length - 1 ? handleComplete : nextStep}
            allowJumpToStep={false} // Can be enabled later if needed
            showAutoSaveIndicator={!existingSequencePlan}
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