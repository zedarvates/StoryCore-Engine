import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, type WizardType } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { GridEditorCanvas } from '@/components/gridEditor';
import { Timeline } from '@/components/Timeline';
import { DialogueWriterWizard } from '@/components/wizard';
import { EffectPreviewRenderer } from '@/components/editor/effects';
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
  Layers,
  Settings,
  Trash2,
  Copy,
  Clock,
  Music,
  Volume2,
  VolumeX,
  Play,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Timer,
} from 'lucide-react';

// Placeholder components for effects system
const EffectLibrary = ({ onEffectApply }: { onEffectApply: (effect: any) => void }) => (
  <div className="p-4">
    <h3 className="text-sm font-semibold mb-4">Effect Library</h3>
    <div className="space-y-2">
      <button
        onClick={() => onEffectApply({ id: 'blur', name: 'Blur', type: 'filter' })}
        className="w-full text-left p-2 hover:bg-muted rounded"
      >
        Blur Effect
      </button>
      <button
        onClick={() => onEffectApply({ id: 'brightness', name: 'Brightness', type: 'adjustment' })}
        className="w-full text-left p-2 hover:bg-muted rounded"
      >
        Brightness
      </button>
    </div>
  </div>
);

const EffectStack = ({
  effects,
  onEffectsChange,
  onEffectSelect,
  selectedEffectId
}: {
  effects: any[];
  onEffectsChange: (effects: any[]) => void;
  onEffectSelect: (effect: any) => void;
  selectedEffectId?: string;
}) => (
  <div className="p-4">
    <h3 className="text-sm font-semibold mb-4">Effect Stack</h3>
    <div className="space-y-2">
      {effects.map((effect) => (
        <div
          key={effect.id}
          onClick={() => onEffectSelect(effect)}
          className={`p-2 rounded cursor-pointer ${
            selectedEffectId === effect.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          {effect.name}
        </div>
      ))}
    </div>
  </div>
);

const EffectControls = ({
  selectedEffect,
  onEffectChange,
  onEffectDelete,
  onEffectDuplicate,
  onEffectToggle
}: {
  selectedEffect?: any;
  onEffectChange: (effect: any) => void;
  onEffectDelete: (effectId: string) => void;
  onEffectDuplicate: (effectId: string) => void;
  onEffectToggle: (effectId: string) => void;
}) => (
  <div className="p-4">
    <h3 className="text-sm font-semibold mb-4">Effect Controls</h3>
    {selectedEffect ? (
      <div className="space-y-4">
        <div>
          <label htmlFor="intensity-slider" className="text-sm font-medium">Intensity</label>
          <input
            id="intensity-slider"
            type="range"
            aria-label="Effect intensity"
            title="Adjust effect intensity"
            min="0"
            max="100"
            value={selectedEffect.intensity || 50}
            onChange={(e) => onEffectChange({
              ...selectedEffect,
              intensity: parseInt(e.target.value)
            })}
            className="w-full"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEffectToggle(selectedEffect.id)}
            className="px-3 py-1 text-sm bg-secondary rounded"
            aria-label={selectedEffect.enabled ? 'Disable effect' : 'Enable effect'}
            title={selectedEffect.enabled ? 'Disable effect' : 'Enable effect'}
          >
            {selectedEffect.enabled ? 'Disable' : 'Enable'}
          </button>
          <button
            onClick={() => onEffectDuplicate(selectedEffect.id)}
            className="px-3 py-1 text-sm bg-secondary rounded"
            aria-label="Duplicate effect"
            title="Duplicate effect"
          >
            <Copy className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => onEffectDelete(selectedEffect.id)}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded"
            aria-label="Delete effect"
            title="Delete effect"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">Select an effect to edit</p>
    )}
  </div>
);

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
  const [activeView, setActiveView] = useState<'storyboard' | 'timeline' | 'grid' | 'effects'>('storyboard');
  const [isCreatingShot, setIsCreatingShot] = useState(false);

  // Effects state
  const [appliedEffects, setAppliedEffects] = useState<Record<string, any[]>>({});
  const [selectedEffectId, setSelectedEffectId] = useState<string | undefined>();

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
            className="flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md mr-2 transition-colors"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          
          {/* Project Info */}
          {project && (
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-md">
              <span className="text-sm font-medium truncate max-w-[200px]">
                {project.project_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {shots.length} shot{shots.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
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
          <button
            onClick={() => setActiveView('effects')}
            className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1 ${
              activeView === 'effects'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            <Layers className="w-4 h-4" />
            Effects
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
              } catch (error) {
                console.error('Failed to save grid configuration:', error);
              }
            }}
            onExport={async () => {
              try {
              } catch (error) {
                console.error('Failed to export grid configuration:', error);
              }
            }}
          />
        </div>
      ) : activeView === 'effects' ? (
        /* Effects Editor View */
        <div className="flex-1 flex overflow-hidden">
          {/* Effects Library - Left Panel */}
          <div className="w-80 border-r border-border bg-card">
            <EffectLibrary
              onEffectApply={(effect) => {
                const currentEffects = appliedEffects[selectedShotId || ''] || [];
                const newEffect = {
                  ...effect,
                  id: `${effect.id}_${Date.now()}`,
                  enabled: true,
                  order: currentEffects.length,
                };
                setAppliedEffects(prev => ({
                  ...prev,
                  [selectedShotId || '']: [...currentEffects, newEffect]
                }));
              }}
            />
          </div>

          {/* Effects Preview & Stack - Center Panel */}
          <div className="flex-1 flex flex-col border-r border-border bg-card">
            {/* GPU-Accelerated Preview */}
            <div className="flex-1">
              <EffectPreviewRenderer
                videoSrc={selectedShotId ? shots.find(s => s.id === selectedShotId)?.image : undefined}
                effects={appliedEffects[selectedShotId || ''] || []}
                width={640}
                height={360}
                onPerformanceMetrics={(metrics) => {
                  // Log performance metrics for monitoring
                  console.log('GPU Performance:', metrics);
                }}
              />
            </div>

            {/* Effect Stack */}
            <div className="h-64 border-t border-border">
              <EffectStack
                effects={appliedEffects[selectedShotId || ''] || []}
                onEffectsChange={(effects) => {
                  setAppliedEffects(prev => ({
                    ...prev,
                    [selectedShotId || '']: effects
                  }));
                }}
                onEffectSelect={(effect) => setSelectedEffectId(effect.id)}
                selectedEffectId={selectedEffectId}
              />
            </div>
          </div>

          {/* Effect Controls - Right Panel */}
          <div className="w-80 bg-card">
            <EffectControls
              selectedEffect={appliedEffects[selectedShotId || '']?.find(e => e.id === selectedEffectId)}
              onEffectChange={(effect) => {
                const currentEffects = appliedEffects[selectedShotId || ''] || [];
                const updatedEffects = currentEffects.map(e =>
                  e.id === effect.id ? effect : e
                );
                setAppliedEffects(prev => ({
                  ...prev,
                  [selectedShotId || '']: updatedEffects
                }));
              }}
              onEffectDelete={(effectId) => {
                const currentEffects = appliedEffects[selectedShotId || ''] || [];
                const updatedEffects = currentEffects.filter(e => e.id !== effectId);
                setAppliedEffects(prev => ({
                  ...prev,
                  [selectedShotId || '']: updatedEffects
                }));
                if (selectedEffectId === effectId) {
                  setSelectedEffectId(undefined);
                }
              }}
              onEffectDuplicate={(effectId) => {
                const currentEffects = appliedEffects[selectedShotId || ''] || [];
                const effectToDuplicate = currentEffects.find(e => e.id === effectId);
                if (effectToDuplicate) {
                  const duplicatedEffect = {
                    ...effectToDuplicate,
                    id: `${effectToDuplicate.id}_${Date.now()}`,
                    name: `${effectToDuplicate.name} (Copie)`,
                    order: currentEffects.length,
                  };
                  setAppliedEffects(prev => ({
                    ...prev,
                    [selectedShotId || '']: [...currentEffects, duplicatedEffect]
                  }));
                }
              }}
              onEffectToggle={(effectId) => {
                const currentEffects = appliedEffects[selectedShotId || ''] || [];
                const updatedEffects = currentEffects.map(e =>
                  e.id === effectId ? { ...e, enabled: !e.enabled } : e
                );
                setAppliedEffects(prev => ({
                  ...prev,
                  [selectedShotId || '']: updatedEffects
                }));
              }}
            />
          </div>
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
                shots.map((shot) => {
                  const audioCount = shot.audioTracks?.length || 0;
                  const effectsCount = shot.effects?.length || 0;
                  const hasImage = !!shot.image;
                  const shotNumber = (shot.position != null ? shot.position : 0) + 1;
                  
                  return (
                    <div
                      key={shot.id}
                      onClick={() => selectShot(shot.id)}
                      className={`group bg-card border-2 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 ${
                        selectedShotId === shot.id
                          ? 'border-primary shadow-lg shadow-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                      aria-label={`Select shot ${shot.title}`}
                    >
                      {/* Shot Preview with Overlay */}
                      <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative overflow-hidden">
                        {shot.image ? (
                          <>
                            <img 
                              src={shot.image} 
                              alt={shot.title} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                          </>
                        ) : (
                          <ImageIcon className="w-14 h-14 text-muted-foreground/50" />
                        )}
                        
                        {/* Shot Number Badge */}
                        <div className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm px-2.5 py-1 rounded-lg text-sm font-bold text-primary-foreground shadow-lg">
                          #{shotNumber}
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${
                          hasImage 
                            ? 'bg-green-500/80 text-white' 
                            : 'bg-amber-500/80 text-white'
                        }`}>
                          {hasImage ? '✓ Ready' : '⚠ Draft'}
                        </div>
                        
                        {/* Duration Badge */}
                        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs text-white font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {shot.duration != null ? `${shot.duration}s` : 'N/A'}
                        </div>

                        {/* Hover Overlay with Quick Actions */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShotWizard({
                                mode: 'edit',
                                sourceLocation: 'shot-card',
                                shotNumber,
                              });
                            }}
                            className="p-2.5 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg"
                            title="Edit shot"
                            aria-label={`Edit shot ${shot.title}`}
                          >
                            <Edit className="w-5 h-5 text-gray-800" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Play preview action
                            }}
                            className="p-2.5 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg"
                            title="Preview shot"
                            aria-label="Preview shot"
                          >
                            <Play className="w-5 h-5 text-gray-800" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // More options action
                            }}
                            className="p-2.5 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg"
                            title="More options"
                            aria-label="More options"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-800" />
                          </button>
                        </div>
                      </div>

                      {/* Shot Info */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-semibold text-base truncate flex-1">{shot.title}</h4>
                          {selectedShotId === shot.id && (
                            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                          {shot.description || 'No description'}
                        </p>

                        {/* Shot Stats */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {/* Audio indicator */}
                            {audioCount > 0 && (
                              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                                <Music className="w-3.5 h-3.5" />
                                <span className="font-medium">{audioCount}</span>
                              </div>
                            )}
                            
                            {/* Effects indicator */}
                            {effectsCount > 0 && (
                              <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="font-medium">{effectsCount}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Quick action button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShotWizard({
                                mode: 'edit',
                                sourceLocation: 'shot-card',
                                shotNumber,
                              });
                            }}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                            title="Quick edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
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
