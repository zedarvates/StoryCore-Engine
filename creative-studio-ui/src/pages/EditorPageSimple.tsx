/**
 * Simple Editor Page Wrapper
 * 
 * Wraps the new SequenceEditor component with professional timeline
 */

import { SequenceEditor } from '@/sequence-editor/SequenceEditor';

interface EditorPageSimpleProps {
  sequenceId?: string;
  onBackToDashboard: () => void;
}

export function EditorPageSimple({ sequenceId, onBackToDashboard }: EditorPageSimpleProps) {
  // Use the new professional sequence editor with multi-track timeline
  return <SequenceEditor />;
}
