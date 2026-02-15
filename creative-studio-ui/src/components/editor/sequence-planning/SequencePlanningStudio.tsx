import React, { useState, useCallback } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Save,
  Download,
  Upload,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Wand2,
  Layers,
  Users,
  Home,
  Camera,
  Film,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  Volume2,
  Speaker,
  Package,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { SequencePlan } from '@/types/sequencePlan';
import { ScenePlanningCanvas } from './ScenePlanningCanvas';
import { AIPromptGenerator } from './AIPromptGenerator';
import { SequenceGenerator } from './SequenceGenerator';
import { SceneMediaPanel } from './SceneMediaPanel';
import { PuppetLibrary } from './PuppetLibrary';
import { SceneLibrary } from './SceneLibrary';
import { ObjectLibrary } from './ObjectLibrary';
import { ElementPropertiesPanel } from './ElementPropertiesPanel';
import { SceneSelector } from './SceneSelector';
import { PlanningState, CanvasElement, ViewMode } from './types';
import { useAudioSpatialization } from './useAudioSpatialization';
import { AudioSurroundPreview } from './AudioSurroundPreview';
import { DialogueGenerator } from './DialogueGenerator';
import { useDialogueManagement } from './useDialogueManagement';
import './SequencePlanningStudio.css';

export interface SequencePlanningStudioProps {
  sequencePlan: SequencePlan;
  onSequenceUpdate: (plan: SequencePlan) => void;
  onGenerateSequence: (plan: SequencePlan) => void;
  className?: string;
}

export type PlanningMode = 'scene' | 'shot';

export const SequencePlanningStudio: React.FC<SequencePlanningStudioProps> = ({
  sequencePlan,
  onSequenceUpdate,
  onGenerateSequence,
  className = ''
}) => {
  const [planningState, setPlanningState] = useState<PlanningState>({
    currentScene: {
      id: sequencePlan.scenes[0]?.id || '',
      title: sequencePlan.scenes[0]?.title || '',
      description: sequencePlan.scenes[0]?.description || '',
      actId: sequencePlan.scenes[0]?.actId || '',
      number: sequencePlan.scenes[0]?.number || 1,
      locationId: sequencePlan.scenes[0]?.locationId || '',
      characterIds: sequencePlan.scenes[0]?.characterIds || [],
      elements: [],
      camera: { position: { x: 0, y: 0, z: 5 }, target: { x: 0, y: 0, z: 0 }, fov: 75 },
      lighting: { ambient: 0.5, directional: { x: 1, y: 1, z: 1 } }
    } as any,
    selectedElement: null,
    viewMode: '2d',
    showGrid: true,
    showGizmos: true,
    sequencePlan: sequencePlan,
    isGenerating: false,
    generationProgress: {
      currentScene: 0,
      totalScenes: sequencePlan.scenes.length,
      status: 'idle'
    }
  });

  const [leftPanel, setLeftPanel] = useState<'puppets' | 'scenes' | 'objects' | 'properties'>('puppets');
  const [rightPanel, setRightPanel] = useState<'prompt' | 'generator' | 'audio' | 'dialogue' | 'media' | 'none'>('none');
  const [surroundMode, setSurroundMode] = useState<'5.1' | '7.1'>('5.1');
  const [audioSpatializationEnabled, setAudioSpatializationEnabled] = useState(true);

  const updatePlanningState = useCallback((updates: Partial<PlanningState>) => {
    setPlanningState(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSceneSelect = useCallback((sceneId: string) => {
    const scene = sequencePlan.scenes.find(s => s.id === sceneId);
    if (scene) {
      updatePlanningState({
        currentScene: {
          id: scene.id,
          title: scene.title,
          description: scene.description,
          actId: scene.actId,
          number: scene.number,
          locationId: scene.locationId,
          characterIds: scene.characterIds,
          elements: [], // TODO: Load elements from scene data
          camera: { position: { x: 0, y: 0, z: 5 }, target: { x: 0, y: 0, z: 0 }, fov: 75 },
          lighting: { ambient: 0.5, directional: { x: 1, y: 1, z: 1 } }
        } as any,
        selectedElement: null
      });
    }
  }, [sequencePlan.scenes, updatePlanningState]);

  const handleElementSelect = useCallback((element: CanvasElement | null) => {
    updatePlanningState({ selectedElement: element });
  }, [updatePlanningState]);

  const handleElementUpdate = useCallback((elementId: string, updates: Partial<CanvasElement>) => {
    setPlanningState(prev => {
      const elements = prev.currentScene.elements || [];
      const updatedElements = elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      );
      return {
        ...prev,
        currentScene: {
          ...prev.currentScene,
          elements: updatedElements
        }
      };
    });
  }, []);

  const handleGeneratePrompt = useCallback(() => {
    // updatePlanningState({ showPromptGenerator: true }); // Property doesn't exist on PlanningState
    setRightPanel('prompt');
  }, [updatePlanningState]);

  const handleGenerateSequence = useCallback(() => {
    updatePlanningState({
      isGenerating: true,
      generationProgress: { ...planningState.generationProgress, status: 'generating' }
    });
    setRightPanel('generator');
    onGenerateSequence(sequencePlan);
  }, [sequencePlan, onGenerateSequence, updatePlanningState, planningState.generationProgress]);

  const handleGenerationComplete = useCallback((results: unknown) => {
    updatePlanningState({
      isGenerating: false,
      generationProgress: { ...planningState.generationProgress, status: 'completed' }
    });
    console.log('Generation complete', results);
  }, [updatePlanningState, planningState.generationProgress]);

  // Audio spatialization hook
  useAudioSpatialization(
    planningState.currentScene.elements || [],
    surroundMode,
    audioSpatializationEnabled,
    handleElementUpdate
  );

  // Dialogue management hook
  const {
    dialogueState,
    generateDialoguesForShot,
    addManualDialogue,
    updateDialogue,
    updateDialogueSpatialization,
    deleteDialogue,
    selectDialogue,
    clearDialogues
  } = useDialogueManagement();

  const selectedScene = sequencePlan.scenes.find(s => s.id === planningState.currentScene.id);

  return (
    <div className={`sequence-planning-studio ${className}`}>
      {/* Header */}
      <div className="studio-header">
        <div className="header-left">
          <h2 className="studio-title">
            <Film size={20} />
            Studio de Planification de Séquence
          </h2>
          <div className="plan-info">
            <span className="plan-name">{sequencePlan.name}</span>
            <span className="scene-count">
              {sequencePlan.scenes.length} scènes • {sequencePlan.shots.length} plans
            </span>
          </div>
        </div>

        <div className="header-center">
          <div className="view-mode-selector">
            <button
              className={`mode-btn ${planningState.viewMode === '2d' ? 'active' : ''}`}
              onClick={() => updatePlanningState({ viewMode: '2d' })}
            >
              2D
            </button>
            <button
              className={`mode-btn ${planningState.viewMode === '3d' ? 'active' : ''}`}
              onClick={() => updatePlanningState({ viewMode: '3d' })}
            >
              3D
            </button>
            <button
              className={`mode-btn ${planningState.viewMode === 'split' ? 'active' : ''}`}
              onClick={() => updatePlanningState({ viewMode: 'split' })}
            >
              Split
            </button>
          </div>
        </div>

        <div className="header-right">
          <div className="generation-status">
            {planningState.isGenerating ? (
              <div className="status-generating">
                <Clock size={16} className="spinning" />
                Génération en cours...
              </div>
            ) : (
              <div className="status-ready">
                <CheckCircle size={16} />
                Prêt à générer
              </div>
            )}
          </div>

          <button
            className="action-btn primary"
            onClick={handleGenerateSequence}
            disabled={planningState.isGenerating}
          >
            <Zap size={16} />
            Générer Séquence
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="studio-toolbar">
        <div className="toolbar-section">
          <button
            className={`tool-btn ${leftPanel === 'puppets' ? 'active' : ''}`}
            onClick={() => setLeftPanel('puppets')}
          >
            <Users size={16} />
            Puppets
          </button>
          <button
            className={`tool-btn ${leftPanel === 'scenes' ? 'active' : ''}`}
            onClick={() => setLeftPanel('scenes')}
          >
            <Home size={16} />
            Décors
          </button>
          <button
            className={`tool-btn ${leftPanel === 'objects' ? 'active' : ''}`}
            onClick={() => setLeftPanel('objects')}
          >
            <Package size={16} />
            Objets
          </button>
          <button
            className={`tool-btn ${leftPanel === 'properties' ? 'active' : ''}`}
            onClick={() => setLeftPanel('properties')}
          >
            <Settings size={16} />
            Propriétés
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className={`tool-btn ${audioSpatializationEnabled ? 'active' : ''}`}
            onClick={() => setAudioSpatializationEnabled(!audioSpatializationEnabled)}
            title="Spatialisation Audio"
          >
            <Volume2 size={16} />
            3D Audio
          </button>
          <select
            className="surround-mode-select"
            value={surroundMode}
            onChange={(e) => setSurroundMode(e.target.value as '5.1' | '7.1')}
            title="Mode Surround"
          >
            <option value="5.1">5.1</option>
            <option value="7.1">7.1</option>
          </select>
          <button
            className={`tool-btn ${rightPanel === 'audio' ? 'active' : ''}`}
            onClick={() => setRightPanel(rightPanel === 'audio' ? 'none' : 'audio')}
            title="Aperçu Audio Surround"
          >
            <Speaker size={16} />
            Surround
          </button>
          <button
            className={`tool-btn ${rightPanel === 'dialogue' ? 'active' : ''}`}
            onClick={() => setRightPanel(rightPanel === 'dialogue' ? 'none' : 'dialogue')}
            title="Générateur de Dialogues SAPI"
          >
            <Volume2 size={16} />
            Dialogues
          </button>
          <button
            className={`tool-btn ${rightPanel === 'media' ? 'active' : ''}`}
            onClick={() => setRightPanel(rightPanel === 'media' ? 'none' : 'media')}
            title="Génération Média de Scène"
          >
            <ImageIcon size={16} />
            Média
          </button>
        </div>

        <div className="toolbar-section">
          <button className="tool-btn">
            <Save size={16} />
            Sauvegarder
          </button>
          <button className="tool-btn">
            <Download size={16} />
            Exporter
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="studio-content">
        {/* Left Panel */}
        <div className="studio-panel left-panel">
          {leftPanel === 'puppets' && (
            <PuppetLibrary
              worldId={sequencePlan.worldId}
              onElementSelect={(el: any) => handleElementSelect(el)}
            />
          )}
          {leftPanel === 'scenes' && (
            <SceneLibrary
              onElementSelect={(el: any) => handleElementSelect(el)}
            />
          )}
          {leftPanel === 'objects' && (
            <ObjectLibrary
              onElementSelect={(el: any) => handleElementSelect(el)}
            />
          )}
          {leftPanel === 'properties' && (
            <ElementPropertiesPanel
              selectedElement={planningState.selectedElement}
              onElementUpdate={handleElementUpdate}
              onClose={() => setLeftPanel('puppets')}
            />
          )}
        </div>

        {/* Center Canvas */}
        <div className="studio-canvas">
          <SceneSelector
            scenes={sequencePlan.scenes}
            selectedSceneId={planningState.currentScene.id}
            onSceneSelect={handleSceneSelect}
          />

          <ScenePlanningCanvas
            scene={planningState.currentScene}
            viewMode={planningState.viewMode}
            selectedElement={planningState.selectedElement}
            onElementSelect={handleElementSelect}
            onElementUpdate={handleElementUpdate}
            showGrid={planningState.showGrid}
            showGizmos={planningState.showGizmos}
          />
        </div>

        {/* Right Panel */}
        <div className={`studio-panel right-panel ${rightPanel === 'none' ? 'hidden' : ''}`}>
          {rightPanel === 'prompt' && (
            <AIPromptGenerator
              scene={planningState.currentScene}
              onPromptGenerated={(prompt) => {
                // TODO: Handle prompt generation
                console.log('Generated prompt:', prompt);
              }}
              onClose={() => setRightPanel('none')}
            />
          )}
          {rightPanel === 'generator' && (
            <SequenceGenerator
              sequencePlan={sequencePlan}
              onGenerationComplete={handleGenerationComplete}
              onClose={() => setRightPanel('none')}
            />
          )}
          {rightPanel === 'audio' && (
            <AudioSurroundPreview
              surroundMode={surroundMode}
              elements={planningState.currentScene.elements || []}
            />
          )}
          {rightPanel === 'dialogue' && selectedScene && (
            <DialogueGenerator
              shot={{
                id: selectedScene.id,
                title: selectedScene.title,
                description: selectedScene.description,
                composition: {
                  characterIds: (planningState.currentScene.elements || [])
                    .filter(el => el.type === 'puppet')
                    .map(el => el.id),
                  characterPositions: [], // TODO: Get positions from elements
                  environmentId: selectedScene.locationId,
                  props: [], // TODO: Get props from scene
                  lightingMood: 'neutral', // TODO: Get from scene
                  timeOfDay: 'day' // TODO: Get from scene
                },
                timing: {
                  duration: 5, // Durée par défaut
                  inPoint: 0,
                  outPoint: 5,
                  transition: 'fade',
                  transitionDuration: 1
                },
                audio: {
                  backgroundMusic: '',
                  soundEffects: [],
                  dialogues: dialogueState.dialogues
                }
              } as any}
              onDialoguesGenerated={(dialogues) => {
                // Les dialogues sont déjà gérés par le hook useDialogueManagement
                console.log('Dialogues mis à jour:', dialogues);
              }}
              surroundMode={surroundMode}
              onSurroundModeChange={setSurroundMode}
              dialogueState={dialogueState}
              onDialogueUpdate={updateDialogue}
              onDialogueDelete={deleteDialogue}
              onDialogueSpatializationUpdate={updateDialogueSpatialization}
            />
          )}
          {rightPanel === 'media' && planningState.currentScene && (
            <SceneMediaPanel
              scene={planningState.currentScene}
              onUpdate={(updates: any) => {
                // Update local state
                const updatedScene = { ...planningState.currentScene, ...updates };
                updatePlanningState({ currentScene: updatedScene });

                // Update parent plan (persist changes)
                const updatedScenes = sequencePlan.scenes.map(s =>
                  s.id === planningState.currentScene.id ? { ...s, ...updates } : s
                );

                onSequenceUpdate({
                  ...sequencePlan,
                  scenes: updatedScenes
                });
              }}
              onClose={() => setRightPanel('none')}
              projectId={sequencePlan.id}
            />
          )}
        </div>
      </div>
    </div>
  );
};
