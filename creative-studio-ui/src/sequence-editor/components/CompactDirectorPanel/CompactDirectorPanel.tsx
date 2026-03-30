/**
 * Compact Director Panel
 * Consolidated controls for rapid scene orchestration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppDispatch } from '../../store';
import { toggleCompactMode } from '../../store/slices/panelsSlice';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { 
  Sparkles, Send, X, User, Play, Camera, Maximize2, 
  Settings as SettingsIcon, Image as ImageIcon, 
  Video as VideoIcon, Mic, Type, Music, Waves, Volume2, Save, CheckCircle,
  Plus
} from 'lucide-react';
import { useDrop } from 'react-dnd';
import { DND_ITEM_TYPES, type CharacterDragItem } from '@/constants/dnd';
import type { Shot, GenerationTask, StyleApplication, Cinematography } from '@/types';
import { intentOrchestration, SystemContext } from '@/services/ai/IntentOrchestrationService';
import type { IntentName, IntentEntities } from '@/services/ai/types';
import { audioWorldizationMapper, WorldizationResult } from '@/services/audio/AudioWorldizationMapper';
import { cinematicAudioService } from '@/services/CinematicAudioService';
import './compactDirectorPanel.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  suggestions?: string[];
}

type PanelTab = 'assistant' | 'images' | 'videos' | 'audio' | 'text';

export const CompactDirectorPanel: React.FC = () => {
  const dispatch = useAppDispatch();
  
  // Unified Project Store Integration
  const { 
    shots, 
    selectedShotId, 
    setSelectedShotId,
    characters,
    project,
    addTask,
    promoteAssetFromShot,
    promoteAllGeneratedAssets,
    assignCharacterToShot,
    removeCharacterFromShot
  } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    selectedShotId: state.selectedShotId,
    setSelectedShotId: state.setSelectedShotId,
    characters: state.characters,
    project: state.project,
    addTask: state.addTask,
    promoteAssetFromShot: state.promoteAssetFromShot,
    promoteAllGeneratedAssets: state.promoteAllGeneratedAssets,
    assignCharacterToShot: state.assignCharacterToShot,
    removeCharacterFromShot: state.removeCharacterFromShot
  })));

  const activeShotIndex = shots.findIndex(s => s.id === selectedShotId);
  const activeShot = activeShotIndex >= 0 ? shots[activeShotIndex] : null;

  const [activeTab, setActiveTab] = useState<PanelTab>('assistant');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Directeur IA prêt. Comment souhaitez-vous orchestrer cette séquence ?", timestamp: Date.now() }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [audioMap, setAudioMap] = useState<WorldizationResult | null>(null);
  const [generatingLayers, setGeneratingLayers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [panelSettings] = useState({
    mode: 'Multi-shot Manual',
    ratio: '16:9',
    resolution: '1080p',
    style: 'Action Cinematic',
    audio: 'On',
    sampling: '1/4'
  });

  const handleClose = () => {
    dispatch(toggleCompactMode());
  };

  const handleGenerate = useCallback(() => {
    if (!selectedShotId) return;
    
    const newTask: GenerationTask = {
      id: `gen-${Date.now()}`,
      shotId: selectedShotId,
      type: activeTab === 'videos' ? ('video' as GenerationTask['type']) : ('image' as GenerationTask['type']),
      status: 'pending',
      priority: 1,
      prompt: prompt || activeShot?.prompt || '',
      width: 1024,
      height: 1024,
      steps: 20,
      createdAt: Date.now()
    };
    
    addTask(newTask);
  }, [selectedShotId, activeTab, prompt, activeShot, addTask]);

  const handleWorldizeAudio = useCallback(async () => {
    if (!activeShot) return;
    setIsAiThinking(true);
    setActiveTab('audio');

    try {
      const result = await audioWorldizationMapper.mapSceneToAudio({
        sceneDescription: activeShot.prompt || activeShot.name || 'Une scène cinématographique',
        mood: activeShot.cinematography?.lighting || 'Cinematic',
        timeOfDay: 'Night',
        isInterior: true
      });
      setAudioMap(result);
    } catch (error) {
      console.error("Audio worldization failed", error);
    } finally {
      setIsAiThinking(false);
    }
  }, [activeShot]);

  const handleSendMessage = useCallback(async () => {
    if (!prompt.trim()) return;
    
    const userMsg: Message = { role: 'user', content: prompt, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = prompt;
    setPrompt('');
    setIsAiThinking(true);

    try {
      // Run real AI engine
      const context: SystemContext = {
        active_module: 'sequence-editor',
        project_open: !!project,
        unsaved_changes: false,
        selection_type: selectedShotId ? 'shot' : undefined
      };
      
      const resp = await intentOrchestration.classifyIntent(currentInput, context);
      
      // Intent Dispatcher (Requirement Audit Task 11)
      const dispatchIntent = (intent: IntentName, entities: IntentEntities) => {
        const store = useProjectStore.getState();
        
        switch (intent) {
          case 'UNDO': store.undo(); break;
          case 'REDO': store.redo(); break;
          case 'PLAY_TIMELINE': store.play(); break;
          case 'STOP_TIMELINE': store.stop(); break;
          case 'SAVE_PROJECT': store.saveProjectToDisk(); break;
          
          case 'DELETE_SCENE': 
            if (selectedShotId) store.deleteShot(selectedShotId);
            break;
            
          case 'GENERATE_IMAGE':
            setActiveTab('images');
            handleGenerate();
            break;

          case 'GENERATE_VIDEO':
            setActiveTab('videos');
            handleGenerate();
            break;

          case 'GENERATE_AUDIO':
            setActiveTab('audio');
            handleWorldizeAudio();
            break;

          case 'MODIFY_GENERATION':
            if (selectedShotId && entities) {
              store.updateShot(selectedShotId, {
                prompt: entities.prompt || undefined,
                visualStyle: entities.style ? { 
                  ...activeShot?.visualStyle, 
                  styleName: entities.style 
                } as StyleApplication : undefined,
                cinematography: entities.framing ? {
                   ...activeShot?.cinematography,
                   framing: entities.framing
                } as Cinematography : undefined
              });
            }
            break;

          case 'ADD_SCENE': {
            // Basic shot creation logic (Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.2)
            const newShotId = `shot-${Date.now()}`;
            const newShot: Shot = {
               id: newShotId,
               name: entities.scene_name || 'New Scene',
               prompt: entities.prompt || '',
               duration: 96, // 4s
               startTime: store.currentTime,
               position: shots.length,
               layers: [],
               referenceImages: [],
               parameters: { seed: -1, denoising: 0.7, steps: 20, guidance: 7, sampler: 'dpmpp_2m', scheduler: 'karras' }
            };
            store.addShot(newShot);
            store.setSelectedShotId(newShotId);
            break;
          }

          default:
            console.warn(`[DirectorPanel] Unhandled intent: ${intent}`);
        }
      };

      if (resp.intent !== 'NONE' && resp.confidence > 0.6) {
        dispatchIntent(resp.intent, resp.entities);
      }
      
      const assistantMsg: Message = { 
        role: 'assistant', 
        content: resp.feedback, 
        timestamp: Date.now(),
        suggestions: resp.suggestions
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (_error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Désolé, j'ai rencontré une erreur technique en traitant votre demande.", 
        timestamp: Date.now() 
      }]);
    } finally {
      setIsAiThinking(false);
    }
  }, [prompt, project, selectedShotId, handleGenerate, handleWorldizeAudio, activeShot?.cinematography, activeShot?.visualStyle, shots.length, setActiveTab]);

  const handleGenerateAudioLayer = async (layer: string, description: string) => {
    setGeneratingLayers(prev => [...prev, layer]);
    try {
       const res = await cinematicAudioService.generateSFX(description);
       if (res.success) {
         console.log(`[Director] Generated ${layer}: ${res.url}`);
       }
    } catch (err) {
      console.error(`[Director] Failed to generate ${layer}`, err);
    } finally {
      setGeneratingLayers(prev => prev.filter(l => l !== layer));
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);


  // Character Drop Logic
  const [{ isOver }, dropRef] = useDrop({
    accept: DND_ITEM_TYPES.CHARACTER,
    drop: (item: CharacterDragItem) => {
      if (selectedShotId) {
        assignCharacterToShot(selectedShotId, item.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // SVG Curve Helper
  const CurvePreview = ({ path }: { path: string }) => (
    <div className="shot-curve-preview">
      <svg className="shot-curve-svg" viewBox="0 0 100 40">
        <path d={path} className="curve-path" />
      </svg>
    </div>
  );

  const mockPaths = [
    "M0,35 Q25,5 50,35 T100,35",
    "M0,35 Q25,25 50,15 T100,5",
    "M0,5 Q25,15 50,25 T100,35",
    "M0,20 Q50,0 100,20",
    "M0,35 L50,5 L100,35",
    "M0,20 C20,0 80,40 100,20"
  ];

  return (
    <div className="compact-director-overlay">
      <button 
        className="close-compact-btn" 
        onClick={handleClose} 
        title="Fermer le mode compact"
        aria-label="Fermer le mode compact"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Floating Left Side Vertical Bar */}
      <div className="compact-sidebar">
        <div 
          className={`sidebar-btn ${activeTab === 'images' ? 'active' : ''}`} 
          onClick={() => setActiveTab('images')}
          title="Images"
        >
          <ImageIcon className="w-5 h-5" />
        </div>
        <div 
          className={`sidebar-btn ${activeTab === 'videos' ? 'active' : ''}`} 
          onClick={() => setActiveTab('videos')}
          title="Vidéos"
        >
          <VideoIcon className="w-5 h-5" />
        </div>
        <div 
          className={`sidebar-btn ${activeTab === 'assistant' ? 'active' : ''}`} 
          onClick={() => setActiveTab('assistant')}
          title="Assistant AI"
        >
          <Sparkles className="w-5 h-5" />
        </div>
        <div 
          className={`sidebar-btn ${activeTab === 'audio' ? 'active' : ''}`} 
          onClick={() => {
            setActiveTab('audio');
            if (!audioMap) handleWorldizeAudio();
          }}
          title="Audio / Voix"
        >
          <Mic className="w-5 h-5" />
        </div>
        <div 
          className={`sidebar-btn ${activeTab === 'text' ? 'active' : ''}`} 
          onClick={() => setActiveTab('text')}
          title="Titres / Texte"
        >
          <Type className="w-5 h-5" />
        </div>
      </div>

      {/* Main Orchestration Layout */}
      <div className="compact-main-layout">
        
        {/* Left Column: AI Assistant Chat or Tab Content */}
        <div className="ai-assistant-column">
          <div className="assistant-content-header">
             {activeTab === 'assistant' && <Sparkles className="w-4 h-4 text-amber-400" />}
             {activeTab === 'audio' && <Waves className="w-4 h-4 text-blue-400" />}
             <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
               {activeTab === 'assistant' ? 'Assistant Director AI' : `AI ${activeTab} Mapper`}
             </span>
          </div>
          
          <div className="assistant-messages-window" ref={scrollRef}>
            {activeTab === 'assistant' ? (
              <>
                {messages.map((msg, i) => (
                  <div key={i} className={`compact-msg ${msg.role}`}>
                    <div className="msg-avatar">
                       {msg.role === 'assistant' ? <Sparkles className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    </div>
                    <div className="msg-bubble">
                      {msg.content}
                      {msg.suggestions && msg.suggestions.length > 0 && (
                        <div className="msg-suggestions">
                           {msg.suggestions.map((s, si) => (
                             <button key={si} className="suggestion-btn" onClick={() => setPrompt(s)}>
                               {s}
                             </button>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : activeTab === 'audio' ? (
              <div className="audio-world-container">
                {audioMap ? (
                  <div className="audio-map-content">
                    <div className="advice-box">
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                      <p>{audioMap.mixAdvice}</p>
                    </div>
                    <div className="audio-layers-list">
                      {audioMap.mappings.map((m, mi) => (
                        <div key={mi} className="audio-layer-card">
                          <div className="layer-header">
                            {m.layer === 'music' ? <Music className="w-3 h-3" /> : <Waves className="w-3 h-3" />}
                            <span className="layer-name">{m.layer}</span>
                            <div className="intensity-bar">
                               <div 
                                 className="intensity-fill" 
                                 ref={el => el?.style.setProperty('--intensity', m.intensity.toString())} 
                               />
                            </div>
                          </div>
                          <div className="layer-desc">{m.description}</div>
                          <button 
                            className="layer-gen-btn"
                            onClick={() => handleGenerateAudioLayer(m.layer, m.description)}
                            disabled={generatingLayers.includes(m.layer)}
                          >
                            {generatingLayers.includes(m.layer) ? 'Generating...' : 'Generate Asset'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="empty-tab-state">
                    Lancement de l'Audio Worldization...
                  </div>
                )}
              </div>
            ) : activeTab === 'images' ? (
              <div className="images-orch-container">
                 <div className="advice-box">
                   <ImageIcon className="w-4 h-4 text-amber-400" />
                   <p>Cadrage {activeShot?.cinematography?.framing || 'cinématique'} détecté. Style: <b>{activeShot?.visualStyle?.styleName || 'Action'}</b></p>
                 </div>
                 <div className="visual-param-stack">
                    <div className="param-item">
                       <span className="param-label">Atmosphère</span>
                       <div className="param-pill">Brumeux / Aube</div>
                    </div>
                    <div className="param-item">
                       <span className="param-label">Éclairage</span>
                       <div className="param-pill">{activeShot?.cinematography?.lighting || 'Backlit Gold'}</div>
                    </div>
                 </div>
                 <button className="orch-action-btn" onClick={handleGenerate}>
                    Générer Plan Visuel
                 </button>
              </div>
            ) : activeTab === 'videos' ? (
              <div className="videos-orch-container">
                 <div className="advice-box">
                   <VideoIcon className="w-4 h-4 text-purple-400" />
                   <p>Mouvement {activeShot?.cinematography?.cameraMovement || 'fixe'} recommandé.</p>
                 </div>
                 <div className="motion-intensity-box">
                    <div className="motion-label">Intensité du Mouvement</div>
                    <div className="intensity-bar">
                       <div className="intensity-fill" ref={el => el?.style.setProperty('--intensity', '0.6')} />
                    </div>
                 </div>
                 <button className="orch-action-btn">
                    Animer le Plan
                 </button>
              </div>
            ) : (
              <div className="empty-tab-state">
                <Type className="w-6 h-6 mb-2 opacity-20" />
                <p>Orchestration textuelle {activeShot?.textLayers?.length || 0} couches</p>
                <button className="suggestion-btn mt-4">Ajouter Sous-titre AI</button>
              </div>
            )}
            
            {isAiThinking && (
              <div className="compact-msg assistant">
                <div className="msg-bubble thinking">
                   <span className="dot">.</span><span className="dot">.</span><span className="dot">.</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Visual Controls */}
        <div className="visual-controls-column">
          
          {/* Shot Thumbnails Row */}
          <div className="thumbnails-header">
             <span className="thumbnails-count">{shots.length} Shots in Sequence</span>
             <button className="promote-all-btn" onClick={promoteAllGeneratedAssets} title="Promouvoir tous les visuels générés vers la bibliothèque">
               <Save className="w-3 h-3 mr-1" />
               PROMOTE ALL
             </button>
          </div>

          <div className="shot-thumbnails-row">
            {shots.map((shot, idx) => {
              const isGenerated = !!(shot.result_url || shot.generated_image_url);
              return (
                <div 
                  key={shot.id} 
                  className={`shot-card ${selectedShotId === shot.id ? 'active' : ''}`}
                  onClick={() => setSelectedShotId(shot.id)}
                >
                  <div className="shot-label">Shot {idx + 1}</div>
                  <div className="shot-title">{shot.name || shot.title || 'Untitled'}</div>
                  <CurvePreview path={mockPaths[idx % mockPaths.length]} />
                  <div className="shot-duration-tag">{Math.round((shot.duration || 48) / 24)}s</div>
                  
                  {isGenerated && (
                    <button 
                      className="shot-promote-badge" 
                      onClick={(e) => { e.stopPropagation(); promoteAssetFromShot(shot.id); }}
                      title="Promouvoir vers la bibliothèque"
                    >
                      <CheckCircle className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
            {shots.length === 0 && (
              <div className="no-shots-message">Aucun plan disponible</div>
            )}
          </div>

          {/* Director Context Panel */}
          <div className="director-controls-panel">
            <div className="control-group">
              <div className="control-label">Cast & World</div>
              <div 
                className={`character-slots ${isOver ? 'active-drop' : ''}`}
                ref={node => { if (node) dropRef(node); }}
              >
                {activeShot?.composition?.characterIds.map(charId => {
                  const char = characters.find(c => c.character_id === charId);
                  if (!char) return null;
                  return (
                    <div key={charId} className="char-slot filled" title={char.name}>
                       {char.name[0]}
                       <button 
                         className="remove-char-btn" 
                         onClick={() => removeCharacterFromShot(selectedShotId!, charId)}
                         title={`Remove ${char.name} from casting`}
                       >
                         <X className="w-2 h-2" />
                       </button>
                    </div>
                  );
                })}
                <div className="char-slot" title="Drag character here to cast">
                  <Plus className="w-3 h-3 opacity-40" />
                </div>
              </div>
            </div>

            <div className="control-group flex-1">
              <div className="control-label">
                Cinematic Motion 
                <span className="ai-badge">AI OPTIMIZED</span>
              </div>
              <div className="curve-editor-container">
                 <div className="ai-dynamic-label">Auto-steady Adaptive Pathing</div>
                 <svg width="100%" height="100%" viewBox="0 0 400 60">
                    <path d="M10,50 Q100,10 200,50 T390,50" className="curve-path ai-curve-path" />
                    <circle cx="10" cy="50" r="3" fill="#fbbf24" />
                    <circle cx="205" cy="50" r="3" fill="#fbbf24" />
                    <circle cx="390" cy="50" r="3" fill="#fbbf24" />
                 </svg>
              </div>
            </div>

            <div className="control-group mini-control">
              <div className="control-label">Focale</div>
              <div className="mini-val-box">{activeShot?.cinematography?.focalLength || '50mm'}</div>
            </div>
            
            <div className="control-group mini-control">
              <div className="control-label">Iris</div>
              <div className="mini-val-box">{activeShot?.cinematography?.iris || 'f/2.8'}</div>
            </div>
          </div>

          {/* Integrated Prompt Bar */}
          <div className="compact-prompt-bar">
            <input 
              type="text" 
              className="compact-prompt-input" 
              placeholder={activeTab === 'assistant' ? "Commande vocale ou texte..." : `Message pour l'IA ${activeTab}...`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <div className="prompt-actions">
               <button 
                 className="sidebar-btn compact-icon-btn" 
                 onClick={handleSendMessage}
                 title="Envoyer le message"
                 aria-label="Envoyer le message"
               >
                 <Send className="w-4 h-4" />
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions Utility Bar */}
      <div className="compact-actions-bar">
        <div className="settings-pills-group">
          <div className="setting-pill interactive" title="Mode de rendu"><SettingsIcon className="w-3 h-3" /> {panelSettings.mode}</div>
          <div className="setting-pill interactive" title="Ratio d'aspect"><Maximize2 className="w-3 h-3" /> {panelSettings.ratio}</div>
          <div className="setting-pill interactive" title="Style visuel"><Sparkles className="w-3 h-3" /> {panelSettings.style}</div>
        </div>

        <div className="orchestrator-actions">
          <button className="frame-btn" title="Image de référence">
            <Camera className="w-4 h-4 mb-1" />
            <span>Ref. Frame</span>
          </button>
          
          <button 
            className="generate-btn"
            onClick={handleGenerate}
            disabled={!selectedShotId}
            title="Lancer l'orchestration"
          >
            <Play className="w-5 h-5 fill-current" />
            ORCHESTRATE ✦
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompactDirectorPanel;
