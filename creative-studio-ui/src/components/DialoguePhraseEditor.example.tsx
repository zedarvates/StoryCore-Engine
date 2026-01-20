/**
 * DialoguePhraseEditor Usage Example
 * 
 * Demonstrates how to integrate the DialoguePhraseEditor component
 * with ProjectContext for dialogue phrase management.
 */

import React from 'react';
import { DialoguePhraseEditor } from './DialoguePhraseEditor';
import { useProject } from '../contexts/ProjectContext';
import type { DialoguePhrase } from '../types/projectDashboard';

/**
 * Example: Editing a selected dialogue phrase
 */
export const DialoguePhraseEditorExample: React.FC = () => {
  const {
    project,
    updateDialoguePhrase,
    deleteDialoguePhrase,
  } = useProject();

  // Example: Get the first phrase for demonstration
  const selectedPhrase: DialoguePhrase | null = 
    project?.audioPhrases[0] || null;

  if (!selectedPhrase) {
    return (
      <div style={{ padding: '20px', color: '#999' }}>
        No dialogue phrase selected
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>
        Dialogue Phrase Editor Example
      </h2>
      
      <DialoguePhraseEditor
        phrase={selectedPhrase}
        shots={project?.shots || []}
        onUpdate={(updates) => {
          updateDialoguePhrase(selectedPhrase.id, updates);
        }}
        onDelete={() => {
          deleteDialoguePhrase(selectedPhrase.id);
        }}
      />
    </div>
  );
};

/**
 * Example: Editing phrase within AudioTrackManager
 */
export const AudioTrackManagerIntegrationExample: React.FC = () => {
  const {
    project,
    updateDialoguePhrase,
    deleteDialoguePhrase,
  } = useProject();

  const [selectedPhraseId, setSelectedPhraseId] = React.useState<string | null>(null);

  const selectedPhrase = project?.audioPhrases.find(
    phrase => phrase.id === selectedPhraseId
  );

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Phrase List */}
      <div style={{ flex: 1 }}>
        <h3 style={{ color: '#fff', marginBottom: '16px' }}>
          Dialogue Phrases
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {project?.audioPhrases.map(phrase => (
            <button
              key={phrase.id}
              onClick={() => setSelectedPhraseId(phrase.id)}
              style={{
                padding: '12px',
                backgroundColor: selectedPhraseId === phrase.id ? '#4a9eff' : '#2a2a2a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 600 }}>{phrase.text}</div>
              <div style={{ fontSize: '12px', color: '#ccc', marginTop: '4px' }}>
                {phrase.startTime}s - {phrase.endTime}s
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Panel */}
      <div style={{ flex: 2 }}>
        {selectedPhrase ? (
          <DialoguePhraseEditor
            phrase={selectedPhrase}
            shots={project?.shots || []}
            onUpdate={(updates) => {
              updateDialoguePhrase(selectedPhrase.id, updates);
            }}
            onDelete={() => {
              deleteDialoguePhrase(selectedPhrase.id);
              setSelectedPhraseId(null);
            }}
          />
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#999',
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            border: '1px solid #333',
          }}>
            Select a dialogue phrase to edit
          </div>
        )}
      </div>
    </div>
  );
};

export default DialoguePhraseEditorExample;
