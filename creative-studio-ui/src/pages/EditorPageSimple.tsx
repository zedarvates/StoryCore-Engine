/**
 * Simple Editor Page Wrapper
 * 
 * Wraps the new SequenceEditor component with professional timeline
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { SequenceEditor } from '@/sequence-editor/SequenceEditor';
import { ProjectProvider } from '@/contexts/ProjectContext';

import { Provider } from 'react-redux';
import { store } from '@/sequence-editor/store';

interface EditorPageSimpleProps {
  sequenceId?: string;
  onBackToDashboard?: () => void;
}

export function EditorPageSimple({ sequenceId: propSequenceId, onBackToDashboard }: EditorPageSimpleProps) {
  const navigate = useNavigate();
  const { projectId: routeProjectId, sequenceId: routeSequenceId } = useParams();
  const project = useAppStore(state => state.project);
  
  const projectId = project?.metadata?.id || project?.metadata?.path || project?.path || routeProjectId || 'default';
  
  // Use provided callback or fallback to router navigation
  const handleBack = onBackToDashboard || (() => navigate(`/project/${encodeURIComponent(String(projectId))}`));

  // Use the new professional sequence editor with multi-track timeline
  return (
    <ProjectProvider projectId={String(projectId)}>
      <Provider store={store}>
        <SequenceEditor sequenceId={propSequenceId || routeSequenceId} onBack={handleBack} />
      </Provider>
    </ProjectProvider>
  );
}
