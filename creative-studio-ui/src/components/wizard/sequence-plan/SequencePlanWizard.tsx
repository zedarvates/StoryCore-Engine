import { LegacyAny } from '@/types/legacy';
import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, ClipboardList, Info, Clapperboard, Film, Monitor, CheckSquare } from 'lucide-react';
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
    targetDuration: Math.max(4, template.defaults.targetDuration),
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
    title: 'Timeline & Multi-shot',
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
    validationResult,
    loadResult,
    resetState,
    showRecoveryDialog,
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

  const initializeWizard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load available templates
      const templates = await templateManager.getAllSequenceTemplates();
      setAvailableTemplates(templates);

      // Initialize state based on props
      const initialState: SequencePlanWizardState = {
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
  }, [initialTemplateId, existingSequencePlan, loadResult?.isValid, loadResult?.state?.formData]);

  useEffect(() => {
    if (isOpen) {
      initializeWizard();
    }
  }, [isOpen, initializeWizard]);

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

  const handleComplete = useCallback(async (engine?: string) => {
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
        preferredEngine: engine,
        tags: wizardState.formData.tags || [],
      };

      // Clear any draft
      if (!existingSequencePlan) {
        clearWizardState('sequence-plan');
      }

      // Total Recall: Analyze for memory
      const { projectMemory } = await import('@/services/ProjectMemoryService');
      projectMemory.analyzeForMemory(
        `SEQUENCE PLAN COMPLETED: ${finalSequencePlan.name}\nDescription: ${finalSequencePlan.description}\nTarget Duration: ${finalSequencePlan.targetDuration}s\nActs: ${finalSequencePlan.acts.map(a => a.title).join(', ')}`,
        'Sequence Planning'
      );

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

  const _handleCancel = useCallback(() => {
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

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <>
      <div className="wizard-modal-overlay" onClick={onClose}>
        <div className="wizard-modal-container max-w-6xl h-[92vh]" onClick={(e) => e.stopPropagation()}>
          <ProductionWizardContainer
            title="Sequence Plan Architect"
            steps={SEQUENCE_PLAN_STEPS}
            currentStep={wizardState.currentStep}
            onNextStep={nextStep}
            onPreviousStep={previousStep}
            onGoToStep={goToStep}
            onCancel={onClose}
            onComplete={handleComplete}
            canProceed={true} // Can add validation logic here
            isDirty={wizardState.isDirty}
            lastSaved={wizardState.lastSaved}
            className="h-full"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-primary/20 mx-auto"></div>
                  </div>
                  <p className="text-muted-foreground font-medium animate-pulse">Initialisation du protocole...</p>
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
            initializeWizard();
          }}
          onRecover={async () => {
            const success = await attemptRecovery();
            if (success && loadResult?.state?.formData) {
              setWizardState(prev => ({
                ...prev,
                formData: loadResult.state!.formData as LegacyAny,
                isDirty: true
              }));
            }
          }}
        />
      )}

      {/* Valid Draft Recovery Dialog */}
      <Dialog open={showDraftDialog} onOpenChange={setShowDraftDialog}>
        <DialogContent className="sm:max-w-md bg-[#0a0a0f] border-primary/20 rounded-2xl shadow-2xl p-0 overflow-hidden">
          <div className="h-1.5 w-full bg-primary/40 shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]" />
          <div className="p-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-white text-xl font-black uppercase tracking-tight">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                Restore Work?
              </DialogTitle>
              <div className="pt-4 space-y-4">
                <DialogDescription className="text-slate-400 text-sm leading-relaxed">
                  An unsaved draft was detected from your previous session. Would you like to restore it or start clean?
                </DialogDescription>

                {recoveryDraft?.formData && (
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/70 mb-2">Draft Metadata:</p>
                    <p className="text-sm font-bold text-white uppercase">{(recoveryDraft.formData as LegacyAny).name || "Unnamed Sequence"}</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase">Lost on: {new Date((recoveryDraft.formData as LegacyAny).modifiedAt || Date.now()).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button
                variant="ghost"
                className="flex-1 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black uppercase tracking-widest h-12"
                onClick={() => {
                  setShowDraftDialog(false);
                  setRecoveryDraft(null);
                  clearWizardState('sequence-plan');
                }}
              >
                Wipe Recovery
              </Button>
              <Button
                className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-xl font-black uppercase tracking-widest text-[10px] h-12 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                onClick={() => {
                  if (recoveryDraft) {
                    setWizardState(prev => ({
                      ...prev,
                      ...recoveryDraft,
                      currentStep: Math.min(recoveryDraft.currentStep || 0, SEQUENCE_PLAN_STEPS.length - 1)
                    }));
                  }
                  setShowDraftDialog(false);
                }}
              >
                Restore Session
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
