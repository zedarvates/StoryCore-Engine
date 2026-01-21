import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { GridEditorCanvas } from '@/components/gridEditor';
import { Timeline } from '@/components/Timeline';
import { DialogueWriterWizard } from '@/components/wizard';
import {
  Plus,
  Image as ImageIcon,
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

interface CanvasAreaProps {
  onBackToDashboard: () => void;
  className?: string;
}

export function CanvasArea({ onBackToDashboard, className }: CanvasAreaProps) {
  const { project } = useAppStore();
  const {
    shots,
    selectedShotId,
    selectShot,
    createShot,
    activeWizard,
    closeWizard,
  } = useEditorStore();

  // Canvas state
  const [activeView, setActiveView] = useState<'storyboard' | 'timeline' | 'grid'>('storyboard');
  const [isCreatingShot, setIsCreatingShot] = useState(false);

  // Wizard actions from useAppStore
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const openShotWizard = useAppStore((state) => state.openShotWizard);
  const openGenericWizard = useAppStore((state) => state.openWizard);

  // Ref for storyboard container
  const storyboardRef = useRef<HTMLDivElement>(null);

  // Auto-scroll storyboard to selected shot
  useEffect(() => {
    if (!storyboardRef.current || !selectedShotId || shots.length === 0 || activeView !== 'storyboard') return;

    // Find the selected shot element
    const selectedShotIndex = shots.findIndex(s => s.id === selectedShotId);
    if (selectedShotIndex === -1) return;

    // Calculate the shot's position in the grid (3 columns)
    const row = Math.floor(selectedShotIndex / 3);

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

  // Handle create new shot
  const handleCreateNewShot = async () => {
    setIsCreatingShot(true);
    try {
      const shot = await createShot({
        title: `Shot ${shots.length + 1}`,
        description: 'New shot',
        duration: 5,
      });

      ;
    } catch (error) {
      console.error('Failed to create shot:', error);
    } finally {
      setIsCreatingShot(false);
    }
  };

  // Handle wizard launch
  const handleLaunchWizard = (wizardId: string) => {
    ;

    // Map wizard IDs to WizardType
    const wizardTypeMap: Record<string, WizardType> = {
      'dialogue-writer': 'dialogue-writer',
      'scene-generator': 'scene-generator',
      'storyboard-creator': 'storyboard-creator',
      'style-transfer': 'style-transfer',
    };

    const wizardType = wizardTypeMap[wizardId];
    ;

    if (wizardType) {
      // Open generic wizard modal
      openGenericWizard(wizardType);

      ;
    } else {
      // Handle non-generic wizards
      console.warn(`Wizard ${wizardId} not mapped to generic wizard system`);
    }
  };

  return (
    <div className={`flex-1 flex flex-col ${className || ''}`}>
      {/* Top Bar */}
      <div className="h-12 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToDashboard}
            className="p-2 hover:bg-muted rounded-md mr-2"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
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
            title="New Sequence Plan (Ctrl+Shift+P)"
            aria-label="Create new sequence plan"
          >
            <Film className="w-4 h-4" />
            New Plan
          </button>
          <button
            onClick={() => openShotWizard({ mode: 'create', sourceLocation: 'storyboard' })}
            className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
            title="New Shot (Ctrl+Shift+S)"
            aria-label="Create new shot"
          >
            <Plus className="w-4 h-4" />
            New Shot
          </button>
          <button
            onClick={() => openShotWizard({ mode: 'create', quickMode: true, sourceLocation: 'storyboard' })}
            className="px-3 py-1.5 text-sm rounded-md hover:bg-muted flex items-center gap-1"
            title="Quick Shot (Ctrl+Shift+Q)"
            aria-label="Create quick shot"
          >
            <Zap className="w-4 h-4" />
            Quick Shot
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleLaunchWizard('scene-generator')}
            className="p-2 hover:bg-muted rounded-md"
            title="AI Wizards"
            aria-label="Open AI wizards"
          >
            <Wand2 className="w-4 h-4" />
          </button>
          <button
            className="p-2 hover:bg-muted rounded-md"
            title="Fullscreen"
            aria-label="Toggle fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area - Conditional based on active view */}
      {activeView === 'grid' ? (
        /* Grid Editor View */
        <div className="flex-1 overflow-hidden">
          <GridEditorCanvas
            projectId={project?.project_name || 'default'}
            onSave={async () => {
              try {
                // TODO: Implement save logic
              } catch (error) {
                console.error('Failed to save grid configuration:', error);
              }
            }}
            onExport={async () => {
              try {
                // TODO: Implement export logic
              } catch (error) {
                console.error('Failed to export grid configuration:', error);
              }
            }}
          />
        </div>
      ) : (
        /* Storyboard/Timeline View */
        <>
          {/* Storyboard Area */}
          <div ref={storyboardRef} className="flex-1 overflow-auto bg-muted/20 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {shots.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
                  <Sparkles className="w-16 h-16 text-primary mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No shots yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by creating your first shot or use AI assistance
                  </p>
                  <div className="flex gap-2 flex-wrap justify-center">
                    <button
                      onClick={handleCreateNewShot}
                      disabled={isCreatingShot}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      aria-label="Create new shot"
                    >
                      {isCreatingShot ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          New Shot
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => openShotWizard({ mode: 'create', sourceLocation: 'storyboard' })}
                      className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 flex items-center gap-2"
                      title="Create shot with AI assistant"
                      aria-label="Create shot with AI assistant"
                    >
                      <Wand2 className="w-4 h-4" />
                      AI Assistant
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
                    aria-label={`Select shot ${shot.title}`}
                  >
                    {/* Shot Preview */}
                    <div className="aspect-video bg-muted flex items-center justify-center relative">
                      {shot.image ? (
                        <img src={shot.image} alt={shot.title} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-12 h-12 text-muted-foreground" />
                      )}
                      <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-xs">
                        {(shot.position != null ? shot.position : 0) + 1}
                      </div>
                      {/* Edit button overlay */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openShotWizard({
                            mode: 'edit',
                            sourceLocation: 'shot-card',
                            shotNumber: (shot.position != null ? shot.position : 0) + 1,
                          });
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black/90 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit shot"
                        aria-label={`Edit shot ${shot.title}`}
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
                        <span className="text-muted-foreground">
                          Duration: {shot.duration != null ? `${shot.duration}s` : 'N/A'}
                        </span>
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

          {/* Timeline Area */}
          <Timeline
            className="h-64"
            selectedShotId={selectedShotId}
            onShotSelect={selectShot}
          />
        </>
      )}

      {/* Active Wizard Modal */}
      {activeWizard?.wizardId === 'dialogue-writer' && (
        <DialogueWriterWizard
          isOpen={true}
          onClose={closeWizard}
          onComplete={() => {
            closeWizard();
          }}
          characters={[]}
          initialData={activeWizard.formData}
        />
      )}
    </div>
  );
}
