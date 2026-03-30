import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from './store';
import { 
  toggleLibrary, toggleInspector, toggleMixer, toggleMetadata, toggleAlignmentDashboard 
} from './store/slices/panelsSlice';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';

import { HeaderBar } from './components/HeaderBar/HeaderBar';
import { ToolBar } from './components/ToolBar/ToolBar';
import { AssetNavigator } from './components/AssetLibrary/AssetNavigator';
import { AssetBrowser } from './components/AssetLibrary/AssetBrowser';
import { PreviewFrame } from './components/PreviewFrame/PreviewFrame';
import { ShotConfigPanel } from './components/ShotConfig/ShotConfigPanel';
import { Timeline } from './components/Timeline/Timeline';
import { CompactDirectorPanel } from './components/CompactDirectorPanel/CompactDirectorPanel';
import { CompactAssistant } from './components/Assistant/CompactAssistant';
import { AlignmentDashboard } from './components/Alignment/AlignmentDashboard';
import { StatusBar } from './components/StatusBar/StatusBar';
import { BottomBar } from './components/BottomBar/BottomBar';
import { LayerManager } from './components/LayerManager/LayerManager';
import { addMessage, setIsOpen as setChatOpen } from './store/slices/chatSlice';
import { AudioMixerPanel } from './components/AudioMixerPanel/AudioMixerPanel';
import { ExportDialog } from './components/Dialogs/ExportDialog';
import { SettingsDialog } from './components/Dialogs/SettingsDialog';
import type { Shot } from '@/types';

import './SequenceEditor.css';

export interface SequenceEditorProps {
  sequenceId?: string;
  onBack?: () => void;
}

export const SequenceEditor: React.FC<SequenceEditorProps> = ({ 
  sequenceId: propSequenceId, 
  onBack 
}) => {
  const { projectId, sequenceId: routeSequenceId } = useParams<{ projectId: string; sequenceId: string }>();
  const sequenceId = propSequenceId || routeSequenceId;
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // Redux & Global State
  const { 
    libraryVisible, inspectorVisible, mixerVisible 
  } = useAppSelector((state) => state.panels);
  const showLayerManager = useAppSelector((state) => state.panels.showLayerManager);
  const compactMode = useAppSelector((state) => state.panels.compactMode);
  const showAlignmentDashboard = useAppSelector((state) => state.panels.showAlignmentDashboard);
  
  // Alignment State from Unified Project Store
  const { 
    alignmentReport, 
    isAnalyzingAlignment,
    isRefiningAlignment,
    generateAlignmentReport,
    applyAlignmentRepair
  } = useProjectStore(useShallow(state => ({
    alignmentReport: state.alignmentReport,
    isAnalyzingAlignment: state.isAnalyzingAlignment,
    isRefiningAlignment: state.isRefiningAlignment,
    generateAlignmentReport: state.generateAlignmentReport,
    applyAlignmentRepair: state.applyAlignmentRepair
  })));

  // Auto-analyze on load if no report
  React.useEffect(() => {
    if (!alignmentReport && !isAnalyzingAlignment) {
      generateAlignmentReport();
    }
  }, [alignmentReport, isAnalyzingAlignment, generateAlignmentReport]);

  const projectState = useAppSelector((state) => state.project);
  
  // Unified Project Store (Audit Task 21)
  const { shots, selectedElements } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    selectedElements: state.selectedElements
  })));
  
  // Get currently selected shot for LayerManager
  const selectedShot = React.useMemo(() => {
    if (selectedElements.length > 0) {
      return shots.find(s => s.id === selectedElements[0]);
    }
    return shots[0]; // Fallback to first shot
  }, [shots, selectedElements]);

  // Local Layout State
  const [navWidth, setNavWidth] = React.useState(240);
  const [browserWidth, setBrowserWidth] = React.useState(300);
  const [inspectorWidth, setInspectorWidth] = React.useState(320);
  const [timelineHeight, setTimelineHeight] = React.useState(40); // 40% Default for better visibility

  // Handle Resize
  const handleNavResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const initialWidth = navWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      setNavWidth(Math.max(100, Math.min(400, initialWidth + (moveEvent.clientX - startX))));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleBrowserResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const initialWidth = browserWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      setBrowserWidth(Math.max(150, Math.min(600, initialWidth + (moveEvent.clientX - startX))));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleInspectorResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const initialWidth = inspectorWidth;
    const onMouseMove = (moveEvent: MouseEvent) => {
      setInspectorWidth(Math.max(200, Math.min(500, initialWidth + (startX - moveEvent.clientX))));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTimelineResize = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const initialHeight = timelineHeight;
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = ((startY - moveEvent.clientY) / window.innerHeight) * 100;
      setTimelineHeight(Math.max(15, Math.min(70, initialHeight + delta)));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleShotDoubleClick = (shotId: string) => {
    const shot = shots.find(s => s.id === shotId);
    if (shot && (shot.type === 'sequence' || (shot as Shot & { subSequenceId?: string }).subSequenceId)) {
      const targetSeqId = (shot as Shot & { subSequenceId?: string }).subSequenceId || shot.id;
      navigate(`/project/${projectId}/sequence/${targetSeqId}`);
    }
  };

  const handleBackToDashboard = () => {
    navigate(`/project/${projectId}`);
  };

  // Layout Calculations
  const gridTemplateColumns = React.useMemo(() => {
    let cols = '';
    if (libraryVisible) {
      cols += `${navWidth}px ${browserWidth}px `;
    }
    cols += '1fr ';
    if (inspectorVisible) {
      cols += `${inspectorWidth}px`;
    }
    return cols;
  }, [libraryVisible, inspectorVisible, navWidth, browserWidth, inspectorWidth]);

  const [showExport, setShowExport] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  return (
    <div className="sequence-editor-root">
      <HeaderBar 
        title={projectState.metadata?.name ? `${projectState.metadata.name}${sequenceId ? ` › ${sequenceId}` : ''}` : 'StoryCore Sequence'}
        onBack={onBack || handleBackToDashboard}
        onMediaPoolToggle={() => dispatch(toggleLibrary())}
        onInspectorToggle={() => dispatch(toggleInspector())}
        onMixerToggle={() => dispatch(toggleMixer())}
        onMetadataToggle={() => dispatch(toggleMetadata())}
        onHealthToggle={() => dispatch(toggleAlignmentDashboard())}
      />
      
      <ToolBar 
        onBack={handleBackToDashboard} 
        onExportToggle={() => setShowExport(true)}
        onSettingsToggle={() => setShowSettings(true)}
      />

      {showExport && (
        <ExportDialog 
          projectName={projectState.metadata?.name || 'Untitled Project'}
          onClose={() => setShowExport(false)}
          onExport={(format) => console.log(`[Export] Started for format: ${format}`)}
        />
      )}

      {showSettings && (
        <SettingsDialog 
          onClose={() => setShowSettings(false)}
        />
      )}
      
      <main 
        className="sequence-editor-main"
        ref={(el) => {
          if (el) {
            el.style.setProperty('--editor-columns', gridTemplateColumns);
            el.style.setProperty('--timeline-rows', `${100 - timelineHeight}% ${timelineHeight}%`);
          }
        }}
      >
        {/* Row 1: Panels */}
        {libraryVisible && (
          <>
            <section className="editor-cell nav-cell">
              <AssetNavigator />
              <div className="resize-handle resize-handle-horizontal resize-handle-nav" onMouseDown={handleNavResize}>
                <div className="resize-handle-grip">⋮</div>
              </div>
            </section>
            <section className="editor-cell browser-cell">
              {showLayerManager ? (
                <LayerManager shot={selectedShot as Shot} selectedLayerIds={[]} />
              ) : (
                <AssetBrowser />
              )}
              <div className="resize-handle resize-handle-horizontal resize-handle-browser" onMouseDown={handleBrowserResize}>
                <div className="resize-handle-grip">⋮</div>
              </div>
            </section>
          </>
        )}

        <section className="editor-cell preview-cell">
          <PreviewFrame />
          {inspectorVisible && (
            <div className="resize-handle resize-handle-horizontal resize-handle-inspector" onMouseDown={handleInspectorResize}>
              <div className="resize-handle-grip">⋮</div>
            </div>
          )}
        </section>

        {inspectorVisible && (
          <section className="editor-cell inspector-cell">
            <ShotConfigPanel />
          </section>
        )}

        {/* Row 2: Timeline (Global Spanning) */}
        <section className="editor-cell editor-timeline-cell editor-timeline-full-span">
          <div className="resize-handle resize-handle-vertical resize-handle-timeline" onMouseDown={handleTimelineResize}>
            <div className="resize-handle-grip">⋯</div>
          </div>
          
          <div className="timeline-horizontal-split">
            <div className="timeline-main-area">
              <Timeline onShotDoubleClick={handleShotDoubleClick} />
            </div>
            {mixerVisible && (
              <aside className="timeline-mixer-sidebar">
                {showAlignmentDashboard ? (
                  <AlignmentDashboard 
                    report={alignmentReport || { total_score: 0, summary: "Analyzing...", categories: {}, recommendations: [] }} 
                    isRefining={isAnalyzingAlignment || isRefiningAlignment}
                    onFixAll={(recs) => {
                      applyAlignmentRepair(recs);
                    }}
                    onFixSingle={(rec) => {
                      console.log('Fixing single:', rec);
                      // Logic for specific repair
                      dispatch(addMessage({ 
                        role: 'assistant', 
                        content: `I've analyzed the recommendation: "${rec}". I am now preparing an automated repair plan for your sequence.` 
                      }));
                      dispatch(setChatOpen(true));
                    }}
                    onChat={(rec) => {
                      // Logic to open chat with this recommendation
                      dispatch(addMessage({ 
                        role: 'user', 
                        content: `How can I fix this issue: "${rec}"?` 
                      }));
                      dispatch(setChatOpen(true));
                    }}
                  />
                ) : showLayerManager ? (
                  <LayerManager shot={selectedShot as Shot} selectedLayerIds={[]} />
                ) : (
                  <AudioMixerPanel />
                )}
              </aside>
            )}
          </div>
        </section>
      </main>

      {/* Overlays */}
      {compactMode && <CompactDirectorPanel />}
      <CompactAssistant />

      <BottomBar />
      <StatusBar />
    </div>
  );
};

export default SequenceEditor;