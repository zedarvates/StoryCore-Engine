import { useState, useEffect } from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useSequencePlanStore, usePlans } from '@/stores/sequencePlanStore';
import { ChatBox } from '@/components/ChatBox';
import { SequencePlanManager } from '@/components/SequencePlanManager';
import { AssetLoader, TemplateSelector, TemplateEditor, TimelineViewer, NarrativeForm } from '@/components/asset-integration';
import { ProjectTemplateService } from '@/services/asset-integration';
import { ProjectTemplate, VideoTimelineMetadata, NarrativeText } from '@/types/asset-integration';
import { useToast } from '@/hooks/use-toast';
import { ComfyUIControlPanel } from '@/components/ComfyUIControlPanel';
import {
  Settings,
  Loader2,
  Zap,
} from 'lucide-react';

interface PropertiesPanelProps {
  className?: string;
}

export function PropertiesPanel({ className }: PropertiesPanelProps) {
  const { toast } = useToast();
  const {
    shots,
    selectedShotId,
    updateShot,
  } = useEditorStore();

  // Panel state
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'chat' | 'assets' | 'plans' | 'comfyui'>('properties');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Asset integration state
  const [loadedProjectTemplate, setLoadedProjectTemplate] = useState<ProjectTemplate | null>(null);
  const [loadedTimeline, setLoadedTimeline] = useState<VideoTimelineMetadata | null>(null);
  const [loadedNarrative, setLoadedNarrative] = useState<NarrativeText | null>(null);

  // Plans state
  const plans = usePlans();
  const currentPlanId = useSequencePlanStore((state) => state.currentPlanId);

  // Get selected shot for properties panel
  const selectedShot = selectedShotId ? shots.find(shot => shot.id === selectedShotId) : null;

  // Properties panel form state
  const [shotTitle, setShotTitle] = useState('');
  const [shotDescription, setShotDescription] = useState('');
  const [shotDuration, setShotDuration] = useState(5);

  // Update form when selected shot changes
  useEffect(() => {
    if (selectedShot) {
      setShotTitle(selectedShot.title || '');
      setShotDescription(selectedShot.description || '');
      setShotDuration(selectedShot.duration || 5);
    } else {
      setShotTitle('');
      setShotDescription('');
      setShotDuration(5);
    }
  }, [selectedShot]);

  // Handler to update shot properties
  const handleUpdateShot = async (updates: Partial<NonNullable<typeof selectedShot>>) => {
    if (!selectedShotId) return;

    setSaveStatus('saving');

    try {
      await updateShot(selectedShotId, updates);
      setSaveStatus('saved');
      setLastSaved(new Date());
      toast({
        title: 'Shot Updated',
        description: 'Shot properties have been saved successfully',
      });

      // Reset to idle after 2 seconds
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to update shot:', error);
      setSaveStatus('idle');
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };



  // Debounced save handlers
  const handleTitleChange = (value: string) => {
    setShotTitle(value);
    // Debounced update will be implemented with useCallback and useRef
    handleUpdateShot({ title: value });
  };

  const handleDescriptionChange = (value: string) => {
    setShotDescription(value);
    // Debounced update will be implemented with useCallback and useRef
    handleUpdateShot({ description: value });
  };

  const handleDurationChange = (value: number) => {
    setShotDuration(value);
    handleUpdateShot({ duration: value }); // Immediate update for duration
  };

  return (
    <div className={`w-80 border-l border-border bg-card flex flex-col ${className || ''}`}>
      {/* Tab Switcher */}
      <div className="h-12 border-b border-border flex">
        <button
          onClick={() => setRightPanelTab('properties')}
          className={`flex-1 text-sm font-medium ${
            rightPanelTab === 'properties' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
          }`}
          aria-label="Properties panel"
        >
          Properties
        </button>
        <button
          onClick={() => setRightPanelTab('chat')}
          className={`flex-1 text-sm font-medium ${
            rightPanelTab === 'chat' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
          }`}
          aria-label="Chat assistant panel"
        >
          Assistant
        </button>
        <button
          onClick={() => setRightPanelTab('assets')}
          className={`flex-1 text-sm font-medium ${
            rightPanelTab === 'assets' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
          }`}
          aria-label="Assets panel"
        >
          Assets
        </button>
        <button
          onClick={() => setRightPanelTab('plans')}
          className={`flex-1 text-sm font-medium ${
            rightPanelTab === 'plans' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
          }`}
          aria-label="Plans panel"
        >
          Plans
        </button>
        <button
          onClick={() => setRightPanelTab('comfyui')}
          className={`flex-1 text-sm font-medium ${
            rightPanelTab === 'comfyui' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
          }`}
          aria-label="ComfyUI panel"
        >
          AI
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {rightPanelTab === 'chat' ? (
          <ChatBox className="h-full" />
        ) : rightPanelTab === 'assets' ? (
          <div className="h-full overflow-auto">
            <AssetLoader
              onProjectTemplateLoaded={setLoadedProjectTemplate}
              onTimelineLoaded={setLoadedTimeline}
              onNarrativeLoaded={setLoadedNarrative}
            />
            {loadedProjectTemplate && (
              <div className="p-4">
                <TemplateSelector
                  selectedTemplate={loadedProjectTemplate}
                  onTemplateSelect={setLoadedProjectTemplate}
                  onNewTemplate={() => {
                    // Handle new template creation
                    const service = ProjectTemplateService.getInstance();
                    service.createNewTemplate().then(setLoadedProjectTemplate);
                  }}
                />
                <div className="mt-4">
                  <TemplateEditor
                    template={loadedProjectTemplate}
                    onTemplateChange={setLoadedProjectTemplate}
                  />
                </div>
              </div>
            )}
            {loadedTimeline && (
              <div className="p-4">
                <TimelineViewer
                  timeline={loadedTimeline}
                  currentTime={0}
                />
              </div>
            )}
            {loadedNarrative && (
              <div className="p-4">
                <NarrativeForm
                  narrative={loadedNarrative}
                  onNarrativeChange={setLoadedNarrative}
                />
              </div>
            )}
          </div>
        ) : rightPanelTab === 'plans' ? (
          <div className="h-full overflow-hidden p-4">
            <SequencePlanManager
              plans={plans}
              currentPlanId={currentPlanId}
              onSelectPlan={(planId: string) => {
                useSequencePlanStore.getState().setCurrentPlan(planId);
                toast({
                  title: 'Plan Selected',
                  description: `Plan ${planId} is now active`,
                });
              }}
              onCreatePlan={() => {
                // Ouvrir le wizard de création de plan
                const openSequencePlanWizard = useAppStore?.getState?.()?.openSequencePlanWizard;
                if (openSequencePlanWizard) {
                  openSequencePlanWizard({
                    mode: 'create',
                    sequenceId: undefined // Sera déterminé automatiquement
                  });
                  toast({
                    title: 'Create Plan Wizard',
                    description: 'Opening sequence plan creation wizard',
                  });
                }
              }}
              onDuplicatePlan={async (planId: string) => {
                try {
                  const plan = plans.find(p => p.id === planId);
                  if (!plan) return;

                  const duplicatedPlan = {
                    ...plan,
                    id: `duplicate-${Date.now()}`,
                    name: `${plan.name} (Copy)`,
                    createdAt: Date.now(),
                    modifiedAt: Date.now(),
                  };

                  await useSequencePlanStore.getState().createPlan(duplicatedPlan);
                  toast({
                    title: 'Plan Duplicated',
                    description: `Duplicated "${plan.name}" as "${duplicatedPlan.name}"`,
                  });
                } catch (error) {
                  console.error('Failed to duplicate plan:', error);
                  toast({
                    title: 'Duplicate Failed',
                    description: error instanceof Error ? error.message : 'Unknown error',
                    variant: 'destructive',
                  });
                }
              }}
              onDeletePlan={async (planId: string) => {
                const plan = plans.find(p => p.id === planId);
                if (!plan) return;

                const confirmed = window.confirm(
                  `Are you sure you want to delete plan "${plan.name}"? This action cannot be undone.`
                );

                if (!confirmed) return;

                try {
                  await useSequencePlanStore.getState().deletePlan(planId);
                  toast({
                    title: 'Plan Deleted',
                    description: `Successfully deleted "${plan.name}"`,
                  });
                } catch (error) {
                  console.error('Failed to delete plan:', error);
                  toast({
                    title: 'Delete Failed',
                    description: error instanceof Error ? error.message : 'Unknown error',
                    variant: 'destructive',
                  });
                }
              }}
              onExportPlan={async (planId: string) => {
                try {
                  const plan = plans.find(p => p.id === planId);
                  if (!plan) return;

                  // Créer un objet exportable
                  const exportData = {
                    plan: plan,
                    exportedAt: new Date().toISOString(),
                    version: '1.0.0',
                    exportedBy: 'StoryCore',
                  };

                  // Télécharger en JSON
                  const dataStr = JSON.stringify(exportData, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });

                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(dataBlob);
                  link.download = `plan-${plan.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  toast({
                    title: 'Plan Exported',
                    description: `Successfully exported "${plan.name}"`,
                  });
                } catch (error) {
                  console.error('Failed to export plan:', error);
                  toast({
                    title: 'Export Failed',
                    description: error instanceof Error ? error.message : 'Unknown error',
                    variant: 'destructive',
                  });
                }
              }}
              className="h-full"
            />
          </div>
        ) : rightPanelTab === 'comfyui' ? (
          <ComfyUIControlPanel className="h-full" />
        ) : (
          <div className="p-4">
            {/* Auto-save status indicator */}
            {saveStatus !== 'idle' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
                {saveStatus === 'saving' ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Saved</span>
                  </>
                ) : null}
              </div>
            )}

            {/* Last saved timestamp */}
            {lastSaved && saveStatus === 'idle' && (
              <div className="text-xs text-muted-foreground mb-4">
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}

            {selectedShot ? (
              <div>
                <h3 className="text-sm font-semibold mb-4">Shot Properties</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Title</label>
                    <input
                      type="text"
                      value={shotTitle}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Shot title"
                      aria-label="Shot title"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Description</label>
                    <textarea
                      value={shotDescription}
                      onChange={(e) => handleDescriptionChange(e.target.value)}
                      className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      rows={3}
                      placeholder="Shot description..."
                      aria-label="Shot description"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Duration (seconds)</label>
                    <input
                      type="number"
                      value={shotDuration}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          handleDurationChange(value);
                        }
                      }}
                      min="0.1"
                      step="0.1"
                      className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="5"
                      aria-label="Shot duration in seconds"
                    />
                  </div>

                  {/* Shot metadata */}
                  <div className="pt-2 border-t border-border">
                    <div className="text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>ID:</span>
                        <span className="font-mono">{selectedShot.id.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Position:</span>
                        <span>{(selectedShot.position != null ? selectedShot.position : 0) + 1}</span>
                      </div>
                      {selectedShot.audioTracks && selectedShot.audioTracks.length > 0 && (
                        <div className="flex justify-between mt-1">
                          <span>Audio:</span>
                          <span>{selectedShot.audioTracks.length} track{selectedShot.audioTracks.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Settings className="w-12 h-12 mb-2" />
                <p className="text-sm">Select a shot to view its properties</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
