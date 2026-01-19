/**
 * Main Editor Page
 * 
 * Full-featured video editor with:
 * - Asset library (left panel)
 * - Storyboard/Canvas (center top)
 * - Timeline (center bottom)
 * - Properties/Chat (right panel)
 */

import { useState, useEffect, useRef } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { useSequencePlanStore, usePlans, useSequencePlanActions } from '@/stores/sequencePlanStore';
import type { Shot } from '../types';
import { ChatBox } from '@/components/ChatBox';
import { CentralConfigurationUI } from '@/components';
import { WizardLauncher } from '@/components/wizards/WizardLauncher';
import { ConfigurationProvider } from '@/contexts/ConfigurationContext';
import { WIZARD_DEFINITIONS } from '@/data/wizardDefinitions';
import { useToast } from '@/hooks/use-toast';
import { GridEditorCanvas } from '@/components/gridEditor';
import { SequencePlanManager } from '@/components/SequencePlanManager';
import { AssetLoader, TemplateSelector, TemplateEditor, TimelineViewer, NarrativeForm } from '@/components/asset-integration';
import { ProjectTemplateService } from '@/services/asset-integration';
import { ProjectTemplate, VideoTimelineMetadata, NarrativeText } from '@/types/asset-integration';
import { Timeline } from '@/components/Timeline';
import { DialogueWriterWizard } from '@/components/wizard';
import {
  Plus,
  Image as ImageIcon,
  Music,
  Video,
  FileText,
  Layers,
  Settings,
  Sparkles,
  ArrowLeft,
  Wand2,
  Loader2,
  Grid3x3,
  Maximize2,
  Edit,
  Zap,
  Film,
} from 'lucide-react';

interface EditorPageProps {
  onBackToDashboard: () => void;
}

export function EditorPage({ onBackToDashboard }: EditorPageProps) {
  const { project } = useAppStore();
  const {
    shots,
    selectedShotId,
    selectShot,
    createShot,
    updateShot,
    importAssets,
    openWizard,
    closeWizard,
    activeWizard,
    projectPath,
    loadProject,
  } = useEditorStore();
  
  // Wizard actions from useAppStore
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const openShotWizard = useAppStore((state) => state.openShotWizard);
  const openGenericWizard = useAppStore((state) => state.openWizard); // Generic wizard opener (Requirement 4.1)
  
  // Sequence Plan Store
  const plans = usePlans();
  const currentPlanId = useSequencePlanStore((state) => state.currentPlanId);
  const {
    loadPlans,
    selectPlan,
    createPlan,
    duplicatePlan,
    deletePlan,
    exportPlan,
  } = useSequencePlanActions();
  
  const { toast } = useToast();
  const [_showChat, _setShowChat] = useState(true);
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [showWizards, setShowWizards] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isCreatingShot, setIsCreatingShot] = useState(false);
  const [activeView, setActiveView] = useState<'storyboard' | 'timeline' | 'grid'>('storyboard');
  const [currentTime] = useState(0); // For TimelineViewer in Assets tab

  // Asset integration state
  const [loadedProjectTemplate, setLoadedProjectTemplate] = useState<ProjectTemplate | null>(null);
  const [loadedTimeline, setLoadedTimeline] = useState<VideoTimelineMetadata | null>(null);
  const [loadedNarrative, setLoadedNarrative] = useState<NarrativeText | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'properties' | 'chat' | 'assets' | 'plans'>('properties');

  // Get selected shot for properties panel
  const selectedShot = selectedShotId ? shots.find(shot => shot.id === selectedShotId) : null;

  // Properties panel form state
  const [shotTitle, setShotTitle] = useState('');
  const [shotDescription, setShotDescription] = useState('');
  const [shotDuration, setShotDuration] = useState(5);

  // Auto-save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
  const handleUpdateShot = async (updates: Partial<Shot>) => {
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

  // Debounced save handlers with refs for timeout management
  const titleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitleChange = (value: string) => {
    setShotTitle(value);

    // Clear existing timeout
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }

    // Set new timeout
    titleTimeoutRef.current = setTimeout(() => {
      handleUpdateShot({ title: value });
      titleTimeoutRef.current = null;
    }, 500);
  };

  const handleDescriptionChange = (value: string) => {
    setShotDescription(value);

    // Clear existing timeout
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }

    // Set new timeout
    descriptionTimeoutRef.current = setTimeout(() => {
      handleUpdateShot({ description: value });
      descriptionTimeoutRef.current = null;
    }, 500);
  };

  const handleDurationChange = (value: number) => {
    setShotDuration(value);
    handleUpdateShot({ duration: value }); // Immediate update for duration
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (titleTimeoutRef.current) {
        clearTimeout(titleTimeoutRef.current);
      }
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  // Ref for storyboard container
  const storyboardRef = useRef<HTMLDivElement>(null);

  // Load sequence plans on mount
  useEffect(() => {
    loadPlans().catch((error) => {
      console.error('Failed to load sequence plans:', error);
    });
  }, [loadPlans]);

  // Load project on mount if project is available
  useEffect(() => {
    if (project && !projectPath) {
      // Try to load project from app store
      const path = (project as any).path || (project as any).projectPath;
      if (path) {
        loadProject(path).catch((error) => {
          console.error('Failed to load project:', error);
          toast({
            title: 'Error',
            description: 'Failed to load project data',
            variant: 'destructive',
          });
        });
      }
    }
  }, [project, projectPath, loadProject, toast]);

  // Auto-scroll storyboard to selected shot
  useEffect(() => {
    if (!storyboardRef.current || !selectedShotId || shots.length === 0 || activeView !== 'storyboard') return;
    
    // Find the selected shot element
    const selectedShotIndex = shots.findIndex(s => s.id === selectedShotId);
    if (selectedShotIndex === -1) return;
    
    // Calculate the shot's position in the grid (3 columns)
    const row = Math.floor(selectedShotIndex / 3);
    const col = selectedShotIndex % 3;
    
    // Get the storyboard container dimensions
    const container = storyboardRef.current;
    const containerHeight = container.clientHeight;
    const scrollTop = container.scrollTop;
    
    // Estimate shot card height (aspect-video + padding + info = ~250px)
    const estimatedCardHeight = 250;
    const gap = 16; // gap-4 = 1rem = 16px
    
    // Calculate the shot's vertical position
    const shotTop = row * (estimatedCardHeight + gap);
    const shotBottom = shotTop + estimatedCardHeight;
    
    // Check if shot is visible
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;
    
    const isVisible = shotTop >= viewportTop && shotBottom <= viewportBottom;
    
    if (!isVisible) {
      // Scroll to center the shot vertically
      const targetScrollTop = shotTop - (containerHeight / 2) + (estimatedCardHeight / 2);
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }
  }, [selectedShotId, shots, activeView]);

  // Handle import assets
  const handleImportAssets = async () => {
    // If no project, create a temporary one
    if (!projectPath && !project) {
      toast({
        title: 'No Project',
        description: 'Please create or open a project first',
        variant: 'destructive',
      });
      return;
    }

    // Create file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*,audio/*,video/*';

    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || []);
      if (files.length === 0) return;

      setIsImporting(true);
      try {
        // If we have a projectPath, use the import function
        if (projectPath) {
          const results = await importAssets(files, (current, total, filename) => {
            toast({
              title: 'Importing Assets',
              description: `${current}/${total}: ${filename}`,
            });
          });

          const successCount = results.filter((r) => r.success).length;
          const failCount = results.filter((r) => !r.success).length;

          toast({
            title: 'Import Complete',
            description: `${successCount} assets imported successfully${failCount > 0 ? `, ${failCount} failed` : ''}`,
            variant: failCount > 0 ? 'destructive' : 'default',
          });
        } else {
          // Fallback: just show success message
          toast({
            title: 'Assets Selected',
            description: `${files.length} files selected. Full import requires a project.`,
          });
        }
      } catch (error) {
        console.error('Import failed:', error);
        toast({
          title: 'Import Failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      } finally {
        setIsImporting(false);
      }
    };

    input.click();
  };

  // Handle create new shot
  const handleCreateNewShot = async () => {
    // Allow creating shots even without a full project path
    // The shots will be stored in the editor store
    setIsCreatingShot(true);
    try {
      const shot = await createShot({
        title: `Shot ${shots.length + 1}`,
        description: 'New shot',
        duration: 5,
      });

      toast({
        title: 'Shot Created',
        description: `Created shot: ${shot.title}`,
      });
    } catch (error) {
      console.error('Failed to create shot:', error);
      toast({
        title: 'Failed to Create Shot',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingShot(false);
    }
  };

  // Handle wizard launch (Requirements 4.1, 4.2)
  const handleLaunchWizard = (wizardId: string) => {
    console.log(`Launching wizard: ${wizardId}`);
    
    // Map wizard IDs to WizardType (Requirement 4.3)
    const wizardTypeMap: Record<string, WizardType> = {
      'dialogue-writer': 'dialogue-writer',
      'scene-generator': 'scene-generator',
      'storyboard-creator': 'storyboard-creator',
      'style-transfer': 'style-transfer',
      'world-building': 'world-building',
    };
    
    const wizardType = wizardTypeMap[wizardId];
    
    if (wizardType) {
      // Open generic wizard modal
      openGenericWizard(wizardType);
      setShowWizards(false);
      
      toast({
        title: 'Wizard Opened',
        description: `Opening ${wizardId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
      });
    } else {
      // Handle non-generic wizards (world-building, character-creation)
      // These use their own dedicated modals
      console.warn(`Wizard ${wizardId} not mapped to generic wizard system`);
      
      // Fallback to old wizard system if needed
      const totalSteps = 3;
      openWizard(wizardId, totalSteps);
      setShowWizards(false);
      
      toast({
        title: 'Wizard Launched',
        description: `Starting ${wizardId}`,
      });
    }
  };

  // Show configuration UI if requested
  if (showConfiguration && project) {
    return (
      <CentralConfigurationUI
        projectId={project.project_name} // Use project name as ID for now
        projectName={project.project_name}
        onClose={() => setShowConfiguration(false)}
      />
    );
  }

  // Show wizards panel if requested
  if (showWizards) {
    return (
      <div className="flex h-screen bg-background text-foreground">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
            <h2 className="text-lg font-semibold">Assistants Créatifs</h2>
            <button
              onClick={() => setShowWizards(false)}
              className="px-3 py-1.5 text-sm hover:bg-muted rounded-md"
            >
              Fermer
            </button>
          </div>
          
          {/* Wizard Launcher */}
          <div className="flex-1 overflow-auto p-6">
            <ConfigurationProvider>
              <WizardLauncher
                availableWizards={WIZARD_DEFINITIONS}
                onLaunchWizard={handleLaunchWizard}
              />
            </ConfigurationProvider>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Left Panel - Asset Library */}
      <div className="w-64 border-r border-border bg-card flex flex-col">
        {/* Assets Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-3">Assets</h2>
          <input
            type="text"
            placeholder="Rechercher..."
            className="w-full px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Asset Categories */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            {/* Category: All */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Tous
            </button>

            {/* Category: Images */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </button>

            {/* Category: Audio */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2">
              <Music className="w-4 h-4" />
              Audio
            </button>

            {/* Category: Video */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2">
              <Video className="w-4 h-4" />
              Vidéo
            </button>

            {/* Category: Text */}
            <button className="w-full px-3 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Texte
            </button>
          </div>

          {/* Asset Grid */}
          <div className="p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground mb-2">Prompt Data</h3>
            
            {/* Sample Assets */}
            {[
              { name: 'Camera_shot...', type: 'image' },
              { name: 'Production.jpg', type: 'image' },
              { name: 'Background_...', type: 'audio' },
              { name: 'Sound_effect...', type: 'audio' },
              { name: 'Narration.mp3', type: 'audio' },
            ].map((asset, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer border border-border"
              >
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  {asset.type === 'image' ? (
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  ) : (
                    <Music className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{asset.name}</p>
                  <p className="text-xs text-muted-foreground">{asset.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Import Button */}
        <div className="p-4 border-t border-border">
          <button 
            onClick={handleImportAssets}
            disabled={isImporting}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Importer
              </>
            )}
          </button>
        </div>
      </div>

      {/* Center Panel - Storyboard + Timeline */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToDashboard}
              className="p-2 hover:bg-muted rounded-md mr-2"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveView('storyboard')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeView === 'storyboard'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Storyboard
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-3 py-1.5 text-sm rounded-md ${
                activeView === 'timeline'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView('grid')}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${
                activeView === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              Grid Editor
            </button>
            
            {/* Divider */}
            <div className="h-6 w-px bg-border mx-2" />
            
            {/* Wizard buttons */}
            <button
              onClick={() => openSequencePlanWizard({ mode: 'create', sourceLocation: 'editor' })}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
              title="Nouveau Plan de Séquence (Ctrl+Shift+P)"
            >
              <Film className="w-4 h-4" />
              Nouveau Plan
            </button>
            <button
              onClick={() => openShotWizard({ mode: 'create', sourceLocation: 'storyboard' })}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
              title="Nouveau Shot (Ctrl+Shift+S)"
            >
              <Plus className="w-4 h-4" />
              Nouveau Shot
            </button>
            <button
              onClick={() => openShotWizard({ mode: 'create', quickMode: true, sourceLocation: 'storyboard' })}
              className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
              title="Shot Rapide (Ctrl+Shift+Q)"
            >
              <Zap className="w-4 h-4" />
              Shot Rapide
            </button>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto-save status indicator */}
            {saveStatus !== 'idle' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
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
              <div className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowWizards(true)}
                className="p-2 hover:bg-muted rounded-md"
                title="Assistants Créatifs"
              >
                <Wand2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowConfiguration(true)}
                className="p-2 hover:bg-muted rounded-md"
                title="Configuration API"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button className="p-2 hover:bg-muted rounded-md" title="Plein écran">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Conditional based on active view */}
        {activeView === 'grid' ? (
          /* Grid Editor View */
          <div className="flex-1 overflow-hidden">
            <GridEditorCanvas
              projectId={project?.project_name || 'default'}
              onSave={(config) => {
                console.log('Grid configuration saved:', config);
                toast({
                  title: 'Configuration Saved',
                  description: 'Grid configuration has been saved successfully',
                });
              }}
              onExport={(config) => {
                console.log('Grid configuration exported:', config);
                toast({
                  title: 'Configuration Exported',
                  description: 'Grid configuration has been exported successfully',
                });
              }}
            />
          </div>
        ) : (
          /* Storyboard/Timeline View */
          <>
            {/* Storyboard Area */}
            <div ref={storyboardRef} className="flex-1 overflow-auto bg-muted/20 p-4">
              <div className="grid grid-cols-3 gap-4 max-w-6xl mx-auto">
                {shots.length === 0 ? (
                  <div className="col-span-3 flex flex-col items-center justify-center py-20 text-center">
                    <Sparkles className="w-16 h-16 text-primary mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Aucun plan pour le moment</h3>
                    <p className="text-muted-foreground mb-4">
                      Commencez par créer votre premier plan ou demandez à l'assistant AI
                    </p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleCreateNewShot}
                        disabled={isCreatingShot}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isCreatingShot ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Nouveau plan
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => openShotWizard({ mode: 'create', sourceLocation: 'storyboard' })}
                        className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 flex items-center gap-2"
                        title="Créer un shot avec l'assistant"
                      >
                        <Wand2 className="w-4 h-4" />
                        Nouveau Shot (Assistant)
                      </button>
                    </div>
                  </div>
                ) : (
                  shots.map((shot) => (
                    <div
                      key={shot.id}
                      onClick={() => selectShot(shot.id)}
                      className={`group bg-card border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedShotId === shot.id
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {/* Shot Preview */}
                      <div className="aspect-video bg-muted flex items-center justify-center relative">
                        {shot.image ? (
                          <img src={shot.image} alt={shot.title} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                        )}
                        <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                          {shot.position + 1}
                        </div>
                        {/* Edit button overlay */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openShotWizard({
                              mode: 'edit',
                              sourceLocation: 'shot-card',
                              // Pass basic shot info - wizard will load full ProductionShot if needed
                              shotNumber: shot.position + 1,
                            });
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Éditer le shot"
                        >
                          <Edit className="w-4 h-4 text-white" />
                        </button>
                      </div>

                      {/* Shot Info */}
                      <div className="p-3">
                        <h4 className="font-semibold text-sm mb-1 truncate">{shot.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {shot.description}
                        </p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Durée: {shot.duration}s</span>
                          <div className="flex gap-1">
                            {shot.audioTracks?.length > 0 && (
                              <span className="text-primary">{shot.audioTracks.length} 🎵</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Timeline Area - Integrated Timeline Component */}
            <Timeline 
              className="h-64"
              selectedShotId={selectedShotId}
              onShotSelect={selectShot}
              onOpenPlansPanel={() => setRightPanelTab('plans')}
            />
          </>
        )}
      </div>

      {/* Right Panel - Properties / Chat */}
      <div className="w-80 border-l border-border bg-card flex flex-col">
        {/* Tab Switcher */}
        <div className="h-12 border-b border-border flex">
          <button
            onClick={() => setRightPanelTab('properties')}
            className={`flex-1 text-sm font-medium ${
              rightPanelTab === 'properties' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
            }`}
          >
            Propriétés
          </button>
          <button
            onClick={() => setRightPanelTab('chat')}
            className={`flex-1 text-sm font-medium ${
              rightPanelTab === 'chat' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
            }`}
          >
            Assistant
          </button>
          <button
            onClick={() => setRightPanelTab('assets')}
            className={`flex-1 text-sm font-medium ${
              rightPanelTab === 'assets' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setRightPanelTab('plans')}
            className={`flex-1 text-sm font-medium ${
              rightPanelTab === 'plans' ? 'bg-background border-b-2 border-primary' : 'hover:bg-muted'
            }`}
          >
            Plans
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
                    currentTime={currentTime}
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
                onSelectPlan={selectPlan}
                onCreatePlan={createPlan}
                onDuplicatePlan={duplicatePlan}
                onDeletePlan={deletePlan}
                onExportPlan={exportPlan}
                className="h-full"
              />
            </div>
          ) : (
            <div className="p-4">
              {selectedShot ? (
                <div>
                  <h3 className="text-sm font-semibold mb-4">Propriétés du plan</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Titre</label>
                      <input
                        type="text"
                        value={shotTitle}
                        onChange={(e) => {
                          setShotTitle(e.target.value);
                          handleTitleChange(e.target.value);
                        }}
                        className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="Titre du plan"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <textarea
                        value={shotDescription}
                        onChange={(e) => {
                          setShotDescription(e.target.value);
                          handleDescriptionChange(e.target.value);
                        }}
                        className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        rows={3}
                        placeholder="Description..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Durée (secondes)</label>
                      <input
                        type="number"
                        value={shotDuration}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setShotDuration(value);
                          handleDurationChange(value);
                        }}
                        min="0.1"
                        step="0.1"
                        className="w-full mt-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="5"
                      />
                    </div>
                    <div className="pt-2 border-t border-border">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex justify-between">
                          <span>ID:</span>
                          <span className="font-mono">{selectedShot.id.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between mt-1">
                          <span>Position:</span>
                          <span>{selectedShot.position + 1}</span>
                        </div>
                        {selectedShot.audioTracks && selectedShot.audioTracks.length > 0 && (
                          <div className="flex justify-between mt-1">
                            <span>Audio:</span>
                            <span>{selectedShot.audioTracks.length} piste{selectedShot.audioTracks.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Settings className="w-12 h-12 mb-2" />
                  <p className="text-sm">Sélectionnez un plan pour voir ses propriétés</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Wizard Modal */}
      {activeWizard?.wizardId === 'dialogue-writer' && (
        <DialogueWriterWizard
          isOpen={true}
          onClose={closeWizard}
          onComplete={(data) => {
            console.log('Dialogue completed:', data);
            // TODO: Handle dialogue completion (save to project, etc.)
            closeWizard();
            toast({
              title: 'Dialogue Generated',
              description: 'Dialogue has been created successfully',
            });
          }}
          characters={[]} // TODO: Get characters from project/world context
          initialData={activeWizard.formData}
        />
      )}
      {/* Add other wizard renderers here as needed */}
    </div>
  );
}
