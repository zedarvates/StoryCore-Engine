import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, FileText, ClipboardList, Info, Clapperboard, Film, Monitor, CheckSquare } from 'lucide-react';
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







// Services
import { templateManager } from '@/services/templateManager';
import { saveWizardState, clearWizardState } from '@/utils/wizardStorage';
import { useStateRecovery } from '@/hooks/useStateRecovery';
import { StateRecoveryDialog } from '@/components/wizard/StateRecoveryDialog';

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
    title: 'Template & Concept',
    description: 'Select a structural starting point',
    icon: ClipboardList,
  },
  {
    number: 2,
    title: 'Project Context',
    description: 'Resolution, world connection and duration',
    icon: Info,
  },
  {
    number: 3,
    title: 'Narrative Arc',
    description: 'Define acts and pacing',
    icon: Clapperboard,
  },
  {
    number: 4,
    title: 'Scene Sequencing',
    description: 'Assemble locations, characters, and beats',
    icon: Film,
  },
  {
    number: 5,
    title: 'Timeline & Multishot',
    description: 'Preview and fine-tune your sequence shots',
    icon: Monitor,
  },
  {
    number: 6,
    title: 'Production Export',
    description: 'Review and send to generation engine',
    icon: CheckSquare,
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
  const [recoveryDraft, setRecoveryDraft] = useState<Partial<SequencePlanWizardState> | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Recovery hook
  const {
    isCorrupted,
    validationResult,
    loadResult,
    resetState,
    showRecoveryDialog,
    setShowRecoveryDialog,
    dismissWarning,
    attemptRecovery
  } = useStateRecovery({
    wizardType: 'sequence-plan',
    onRecoverySuccess: () => {
      // Logic handled via effect later
    }
  });

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

      // Check for drafts if no existing plan
      if (!existingSequencePlan && loadResult?.isValid && loadResult.state?.formData) {
        // Found valid draft
        const draftData = loadResult.state.formData as Partial<SequencePlan>;
        if (Object.keys(draftData).length > 0) {
          setRecoveryDraft({ formData: draftData });
          setShowDraftDialog(true);
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

  // Auto-save Effect
  useEffect(() => {
    if (wizardState.isDirty && !existingSequencePlan) {
      const saveDraft = () => {
        try {
          // Create partial data for auto-save
          // Only save relevant fields
          const draftData: Partial<SequencePlan> = {
            ...wizardState.formData,
            // Ensure ID and timestamps are preserved or updated if needed
            modifiedAt: Date.now()
          };

          saveWizardState('sequence-plan', 0, draftData);

          setWizardState(prev => ({
            ...prev,
            lastSaved: Date.now(),
            isDirty: false, // Wait, usually auto-save doesn't clear isDirty for the FORM, but for the storage sync?
            // Actually wizardState.isDirty tracks "unsaved changes vs initial" usually.
            // But here allow next save.
          }));
        } catch (err) {
          console.error('Failed to auto-save draft:', err);
        }
      };

      const timer = setTimeout(saveDraft, 2000); // Auto-save every 2 seconds (localStorage is fast)
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

  const handleShotsChange = useCallback((shots: ProductionShot[]) => {
    updateFormData({ shots });
  }, [updateFormData]);

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
        clearWizardState('sequence-plan');
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
      clearWizardState('sequence-plan');
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
          <ScenePlanningInterface
            scenes={wizardState.formData.scenes || []}
            acts={wizardState.formData.acts || []}
            onScenesChange={(scenes: Scene[]) => updateFormData({ scenes })}
            validationErrors={wizardState.validationErrors}
            worldId={wizardState.formData.worldId || ''}
          />
        );

      case 5:
        return (
          <Step5ShotPreview
            sequencePlan={wizardState.formData}
            onShotsChange={handleShotsChange}
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
      <DialogContent className="max-w-6xl h-[90vh] overflow-hidden flex flex-col cyber-card border-primary/30 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="border-b border-primary/30 bg-card/95 backdrop-blur-sm">
          <DialogTitle className="neon-text text-primary text-xl font-bold">Sequence Editor Wizard</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <ProductionWizardContainer
            title="Multishot Sequence Editor"
            steps={SEQUENCE_PLAN_STEPS}
            currentStep={wizardState.currentStep}
            onNextStep={nextStep}
            onPreviousStep={previousStep}
            onGoToStep={goToStep}
            onCancel={handleCancel}
            onComplete={wizardState.currentStep === SEQUENCE_PLAN_STEPS.length - 1 ? handleComplete : nextStep}
            allowJumpToStep={false} // Can be enabled later if needed
            showAutoSaveIndicator={!existingSequencePlan}
            canProceed={true} // Can add validation logic here
            isDirty={wizardState.isDirty}
            lastSaved={wizardState.lastSaved}
            className="h-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground neon-text-blue">Loading...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="mb-4 text-destructive neon-text-pink">{error}</p>
                  <button
                    onClick={initializeWizard}
                    className="px-4 py-2 btn-neon rounded neon-border"
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

        {/* Corruption Recovery Dialog */}
        {validationResult && (
          <StateRecoveryDialog
            wizardType="sequence-plan"
            validationResult={validationResult}
            isOpen={showRecoveryDialog}
            onDismiss={dismissWarning}
            onReset={() => {
              resetState();
              initializeWizard(); // Restart initialization after reset
            }}
            onRecover={async () => {
              const success = await attemptRecovery();
              if (success && loadResult?.state?.formData) {
                setWizardState(prev => ({
                  ...prev,
                  formData: loadResult.state!.formData as any,
                  isDirty: true
                }));
              }
            }}
          />
        )}

        {/* Valid Draft Recovery Dialog */}
        <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
          <DialogContent className="sm:max-w-md bg-card border-primary/20">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-primary neon-text">
                <FileText className="w-5 h-5" />
                Recover Previous Session?
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                We found an unsaved draft from a previous session. Would you like to restore it and continue where you left off?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:justify-end mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDraftDialog(false);
                  setRecoveryDraft(null);
                  clearWizardState('sequence-plan');
                }}
              >
                Start Fresh
              </Button>
              <Button
                onClick={() => {
                  if (recoveryDraft) {
                    setWizardState(prev => ({
                      ...prev,
                      ...recoveryDraft,
                      // Ensure currentStep is valid
                      currentStep: Math.min(recoveryDraft.currentStep || 0, SEQUENCE_PLAN_STEPS.length - 1)
                    }));
                  }
                  setShowDraftDialog(false);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Recover Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

