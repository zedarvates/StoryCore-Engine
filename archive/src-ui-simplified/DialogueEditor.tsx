import React, { useState } from 'react';
import './DialogueEditor.css';

interface DialogueLine {
  id: string;
  character: string;
  text: string;
  emotionalState: string;
  audioGenerated?: boolean;
  audioPath?: string;
}

interface DialogueScene {
  id: string;
  title: string;
  lines: DialogueLine[];
}

interface DialogueEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

const DialogueEditor: React.FC<DialogueEditorProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  const [scene, setScene] = useState<DialogueScene | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateDialogues = async () => {
    setIsGenerating(true);
    // Mock dialogue generation
    // In real implementation, call API to generate dialogues using dialogue_wizard
    const mockLines: DialogueLine[] = [
      { id: '1', character: 'Alice', text: 'Bonjour, comment allez-vous ?', emotionalState: 'calm' },
      { id: '2', character: 'Bob', text: 'Très bien, merci. Et vous ?', emotionalState: 'happy' },
      { id: '3', character: 'Alice', text: 'Bien aussi, je suis contente de vous voir.', emotionalState: 'excited' },
    ];
    const newScene: DialogueScene = {
      id: Date.now().toString(),
      title: 'Dialogue Généré',
      lines: mockLines,
    };
    setScene(newScene);
    setIsGenerating(false);
  };

  const handleGenerateAudio = async (lineId: string) => {
    // Mock audio generation
    // In real implementation, call API to generate audio using audio_engine
    setScene(prevScene => {
      if (!prevScene) return prevScene;
      const updatedLines = prevScene.lines.map(line =>
        line.id === lineId ? { ...line, audioGenerated: true, audioPath: `/audio/${lineId}.wav` } : line
      );
      return { ...prevScene, lines: updatedLines };
    });
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, lineId: string) => {
    e.dataTransfer.setData('lineId', lineId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetLineId: string) => {
    e.preventDefault();
    const draggedLineId = e.dataTransfer.getData('lineId');

    if (!scene) return;

    const draggedIndex = scene.lines.findIndex(line => line.id === draggedLineId);
    const targetIndex = scene.lines.findIndex(line => line.id === targetLineId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedLines = [...scene.lines];
    const [draggedLine] = updatedLines.splice(draggedIndex, 1);
    updatedLines.splice(targetIndex, 0, draggedLine);

    setScene({ ...scene, lines: updatedLines });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="dialogue-editor-modal">
      <div className="dialogue-editor-overlay" onClick={onClose}></div>
      <div className="dialogue-editor-content">
        <div className="dialogue-editor-header">
          <h2>Éditeur de Dialogue</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
      <button onClick={handleGenerateDialogues} disabled={isGenerating}>
        {isGenerating ? 'Génération en cours...' : 'Générer les textes de dialogues'}
      </button>

      {scene && (
        <div className="dialogue-timeline">
          <h3>{scene.title}</h3>
          <div className="timeline-container">
            {scene.lines.map(line => (
              <div
                key={line.id}
                className="dialogue-line"
                draggable
                onDragStart={(e) => handleDragStart(e, line.id)}
                onDrop={(e) => handleDrop(e, line.id)}
                onDragOver={handleDragOver}
              >
                <div className="line-content">
                  <strong>{line.character}:</strong> {line.text}
                  <em>({line.emotionalState})</em>
                </div>
                <div className="line-actions">
                  {!line.audioGenerated ? (
                    <button onClick={() => handleGenerateAudio(line.id)}>
                      Générer le son
                    </button>
                  ) : (
                    <span>Son généré: {line.audioPath}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DialogueEditor;