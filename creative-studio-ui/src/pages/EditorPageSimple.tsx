/**
 * Simple Editor Page Wrapper
 * 
 * Wraps the new SequenceEditor component with professional timeline
 */

import { useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { SequenceEditor } from '@/sequence-editor/SequenceEditor';

interface EditorPageSimpleProps {
  sequenceId?: string;
  onBackToDashboard?: () => void;
}

export function EditorPageSimple({ sequenceId: propSequenceId, onBackToDashboard }: EditorPageSimpleProps) {
  const navigate = useNavigate();
  const { projectId: routeProjectId, sequenceId: routeSequenceId } = useParams();
  const project = useAppStore(state => state.project);
  
  const projectId = project?.path || project?.metadata?.path || project?.metadata?.id || routeProjectId || 'default';
  
  // Use provided callback or fallback to router navigation
  const handleBack = onBackToDashboard || (() => navigate(`/project/${encodeURIComponent(String(projectId))}`));

  // Use the new professional sequence editor with multi-track timeline
  return <SequenceEditor sequenceId={propSequenceId || routeSequenceId} onBack={handleBack} />;
}
