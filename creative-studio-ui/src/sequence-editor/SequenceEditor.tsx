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
import { AlignmentDashboard, AlignmentReport } from './components/Alignment/AlignmentDashboard';
import { StatusBar } from './components/StatusBar/StatusBar';
import { BottomBar } from './components/BottomBar/BottomBar';
import { LayerManager } from './components/LayerManager/LayerManager';
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
  
  // Mock Alignment Report for demonstration if not present in project
  const [report] = React.useState<AlignmentReport>({
    total_score: 74,
    summary: "The project shows strong thematic consistency, but several shots have lighting mismatches and rhythmic pacing issues in the second act.",
    categories: {
      narrative_flow: { score: 85, issues: [], recommendations: ["Increase character tension in shot 4"] },
      visual_coherence: { score: 62, issues: ["Lighting mismatch in shots 2 and 3"], recommendations: ["Apply consistent morning LUT across sequence"] },
      rhythm_pacing: { score: 75, issues: ["Shot 5 is 24f longer than optimal rhythm"], recommendations: ["Trim shot 5 to 48 frames"] }
    },
    recommendations: [
      "Harmonize lighting between shot 2 and 3",
      "Trim shot 5 for better act-end rhythm",
      "Add environmental SFX to character appearance in shot 1"
    ]
  });

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
    if (shot && (shot.type === 'sequence' || (shot as any).subSequenceId)) {
      const targetSeqId = (shot as any).subSequenceId || shot.id;
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
                    report={report} 
                    onFixAll={(recs) => console.log('Fix all:', recs)}
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