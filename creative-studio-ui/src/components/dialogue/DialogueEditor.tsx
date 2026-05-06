import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Play, Volume2, Wand2, Video, Image as ImageIcon } from 'lucide-react';
import './DialogueEditor.css';

interface DialogueLine {
  id: string;
  character: string;
  text: string;
  emotionalState: string;
  audioGenerated?: boolean;
  audioPath?: string;
  recordedAudio?: Blob;
  sapiGenerated?: boolean;
  imagePrompt?: string;
  videoPrompt?: string;
}

interface DialogueScene {
  id: string;
  title: string;
  lines: DialogueLine[];
  characters: Character[];
}

interface Character {
  id: string;
  name: string;
  voiceProfile: string;
  personality: string[];
}

interface DialogueEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onDialoguesGenerated?: (dialogues: DialogueLine[]) => void;
}

const DialogueEditor: React.FC<DialogueEditorProps> = ({ isOpen, onClose, onDialoguesGenerated }) => {
  const [scene, setScene] = useState<DialogueScene | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingLineId, setRecordingLineId] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [draggedLineId, setDraggedLineId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize characters
  useEffect(() => {
    if (isOpen && characters.length === 0) {
      setCharacters([
        { id: '1', name: 'Alice', voiceProfile: 'femme_adulte', personality: ['confiante', 'directe'] },
        { id: '2', name: 'Bob', voiceProfile: 'homme_adulte', personality: ['amical', 'curieux'] },
        { id: '3', name: 'Charlie', voiceProfile: 'enfant', personality: ['énergique', 'innocent'] }
      ]);
    }
  }, [isOpen, characters.length]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async (lineId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      setMediaRecorder(recorder);
      setRecordingLineId(lineId);
      setIsRecording(true);

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        setScene(prevScene => {
          if (!prevScene) return prevScene;
          const updatedLines = prevScene.lines.map(line =>
            line.id === lineId ? { ...line, recordedAudio: audioBlob } : line
          );
          return { ...prevScene, lines: updatedLines };
        });
        setIsRecording(false);
        setRecordingLineId(null);
      };

      recorder.start();
    } catch (error) {
      console.error('Erreur lors du démarrage de l\'enregistrement:', error);
      alert('Impossible d\'accéder au microphone. Vérifiez les permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  }, [mediaRecorder, isRecording]);

  const playAudio = useCallback(async (audioBlob: Blob) => {
    if (audioRef.current) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
  }, []);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, lineId: string) => {
    setDraggedLineId(lineId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetLineId: string) => {
    e.preventDefault();
    if (draggedLineId && draggedLineId !== targetLineId) {
      setScene(prevScene => {
        if (!prevScene) return prevScene;
        const lines = [...prevScene.lines];
        const draggedIndex = lines.findIndex(line => line.id === draggedLineId);
        const targetIndex = lines.findIndex(line => line.id === targetLineId);
        const [draggedLine] = lines.splice(draggedIndex, 1);
        lines.splice(targetIndex, 0, draggedLine);
        return { ...prevScene, lines };
      });
    }
    setDraggedLineId(null);
  };

  const generateDialoguesWithLLM = async () => {
    setIsGenerating(true);
    try {
      // Simulation de l'appel à l'API LLM pour générer des dialogues
      const _prompt = `Génère un dialogue naturel entre ${characters.length} personnages avec ces profils:
${characters.map(c => `${c.name}: ${c.personality.join(', ')}`).join('\n')}

Le dialogue doit être en français, naturel et engageant. Format: JSON avec character, text, emotionalState.`;

      // Ici on simule la réponse - en production, appeler l'API LLM
      const mockResponse = {
        dialogues: [
          { character: 'Alice', text: 'Bonjour, comment allez-vous aujourd\'hui ?', emotionalState: 'calme' },
          { character: 'Bob', text: 'Très bien merci ! Et vous, Alice ?', emotionalState: 'enthousiaste' },
          { character: 'Alice', text: 'Ça va bien, je suis contente de vous voir.', emotionalState: 'heureuse' },
          { character: 'Charlie', text: 'Salut tout le monde ! Qu\'est-ce qu\'on fait aujourd\'hui ?', emotionalState: 'excité' }
        ]
      };

      const dialogueLines: DialogueLine[] = mockResponse.dialogues.map((line, index) => ({
        id: `line_${Date.now()}_${index}`,
        character: line.character,
        text: line.text,
        emotionalState: line.emotionalState
      }));

      const newScene: DialogueScene = {
        id: Date.now().toString(),
        title: 'Dialogue Généré par LLM',
        lines: dialogueLines,
        characters: characters
      };

      setScene(newScene);

      if (onDialoguesGenerated) {
        onDialoguesGenerated(dialogueLines);
      }
    } catch (error) {
      console.error('Erreur lors de la génération des dialogues:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateAudioWithSAPI = async (lineId: string, text: string, character: string) => {
    try {
      // Simulation de l'appel à SAPI pour générer l'audio
      // En production, utiliser l'API SAPI ou un service de synthèse vocale
      console.log(`Génération audio SAPI pour "${text}" avec la voix de ${character}`);

      // Simuler un délai de génération
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Marquer comme généré
      setScene(prevScene => {
        if (!prevScene) return prevScene;
        const updatedLines = prevScene.lines.map(line =>
          line.id === lineId ? {
            ...line,
            sapiGenerated: true,
            audioPath: `/audio/sapi_${lineId}.wav`
          } : line
        );
        return { ...prevScene, lines: updatedLines };
      });
    } catch (error) {
      console.error('Erreur lors de la génération SAPI:', error);
    }
  };

  const generateImagePrompt = async (lineId: string, dialogueText: string, character: string) => {
    try {
      const _prompt = `Génère un prompt détaillé pour une image représentant la scène de dialogue suivante:

Personnage: ${character}
Dialogue: "${dialogueText}"

Le prompt doit décrire une scène visuelle cohérente avec le dialogue, incluant:
- L'expression faciale du personnage
- L'environnement approprié
- L'ambiance émotionnelle
- Le style artistique (cinématographique, réaliste)

Format: Description visuelle détaillée en français.`;

      // Simulation de génération de prompt
      const imagePrompt = `Scène cinématographique montrant ${character} prononçant "${dialogueText}". Portrait en gros plan avec expression déterminée, éclairage naturel, arrière-plan urbain moderne, style photographique réaliste.`;

      setScene(prevScene => {
        if (!prevScene) return prevScene;
        const updatedLines = prevScene.lines.map(line =>
          line.id === lineId ? { ...line, imagePrompt } : line
        );
        return { ...prevScene, lines: updatedLines };
      });
    } catch (error) {
      console.error('Erreur lors de la génération du prompt image:', error);
    }
  };

  const generateVideoPrompt = async (lineId: string, dialogueText: string, character: string) => {
    try {
      const _prompt = `Génère un prompt détaillé pour une vidéo représentant la scène de dialogue suivante:

Personnage: ${character}
Dialogue: "${dialogueText}"

Le prompt doit décrire une séquence vidéo courte (3-5 secondes) incluant:
- Mouvement de caméra approprié
- Expression faciale évoluant pendant le dialogue
- Transitions fluides
- Ambiance et timing

Format: Description de séquence vidéo détaillée en français.`;

      // Simulation de génération de prompt vidéo
      const videoPrompt = `Séquence vidéo de 4 secondes: caméra en gros plan sur ${character}, début avec expression neutre, transition progressive vers expression déterminée en prononçant "${dialogueText}", léger mouvement de caméra pour dynamisme, éclairage naturel évoluant.`;

      setScene(prevScene => {
        if (!prevScene) return prevScene;
        const updatedLines = prevScene.lines.map(line =>
          line.id === lineId ? { ...line, videoPrompt } : line
        );
        return { ...prevScene, lines: updatedLines };
      });
    } catch (error) {
      console.error('Erreur lors de la génération du prompt vidéo:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="dialogue-editor-modal">
      <div className="dialogue-editor-overlay" onClick={onClose}></div>
      <div className="dialogue-editor-content">
        <div className="dialogue-editor-header">
          <h2>🎭 Éditeur de Dialogue Avancé</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>

        <div className="dialogue-controls">
          <div className="control-section">
            <h3>🤖 Génération LLM</h3>
            <button
              onClick={generateDialoguesWithLLM}
              disabled={isGenerating}
              className="generate-btn llm-btn"
            >
              <Wand2 size={16} />
              {isGenerating ? 'Génération...' : 'Générer Dialogues'}
            </button>
          </div>

          <div className="control-section">
            <h3>🎤 Enregistrement Audio</h3>
            <p>Utilisez le micro pour enregistrer vos propres dialogues</p>
          </div>
        </div>

        {scene && (
          <div className="dialogue-timeline">
            <h3>{scene.title}</h3>
            <div className="timeline-container">
              {scene.lines.map((line) => (
                <div
                  key={line.id}
                  className="dialogue-line"
                  draggable
                  onDragStart={(e) => handleDragStart(e, line.id)}
                  onDrop={(e) => handleDrop(e, line.id)}
                  onDragOver={handleDragOver}
                >
                  <div className="line-header">
                    <span className="character-name">{line.character}</span>
                    <span className="emotional-state">{line.emotionalState}</span>
                  </div>

                  <div className="line-content">
                    <p className="dialogue-text">"{line.text}"</p>
                  </div>

                  <div className="line-actions">
                    {/* Enregistrement Audio */}
                    <div className="action-group">
                      <button
                        onClick={() => isRecording && recordingLineId === line.id ? stopRecording() : startRecording(line.id)}
                        className={`action-btn record-btn ${isRecording && recordingLineId === line.id ? 'recording' : ''}`}
                        disabled={isRecording && recordingLineId !== line.id}
                      >
                        {isRecording && recordingLineId === line.id ? <MicOff size={16} /> : <Mic size={16} />}
                        {isRecording && recordingLineId === line.id ? 'Arrêter' : 'Enregistrer'}
                      </button>

                      {line.recordedAudio && (
                        <button
                          onClick={() => playAudio(line.recordedAudio!)}
                          className="action-btn play-btn"
                        >
                          <Play size={16} />
                          Écouter
                        </button>
                      )}
                    </div>

                    {/* Génération SAPI */}
                    <div className="action-group">
                      <button
                        onClick={() => generateAudioWithSAPI(line.id, line.text, line.character)}
                        className="action-btn sapi-btn"
                        disabled={line.sapiGenerated}
                      >
                        <Volume2 size={16} />
                        {line.sapiGenerated ? 'Audio Généré' : 'Générer SAPI'}
                      </button>
                    </div>

                    {/* Prompts IA */}
                    <div className="action-group">
                      <button
                        onClick={() => generateImagePrompt(line.id, line.text, line.character)}
                        className="action-btn prompt-btn"
                        disabled={!!line.imagePrompt}
                      >
                        <ImageIcon size={16} />
                        {line.imagePrompt ? 'Prompt Image ✓' : 'Prompt Image'}
                      </button>

                      <button
                        onClick={() => generateVideoPrompt(line.id, line.text, line.character)}
                        className="action-btn prompt-btn"
                        disabled={!!line.videoPrompt}
                      >
                        <Video size={16} />
                        {line.videoPrompt ? 'Prompt Vidéo ✓' : 'Prompt Vidéo'}
                      </button>
                    </div>
                  </div>

                  {/* Affichage des prompts générés */}
                  {line.imagePrompt && (
                    <div className="generated-prompt image-prompt">
                      <h4>📸 Prompt Image:</h4>
                      <p>{line.imagePrompt}</p>
                    </div>
                  )}

                  {line.videoPrompt && (
                    <div className="generated-prompt video-prompt">
                      <h4>🎬 Prompt Vidéo:</h4>
                      <p>{line.videoPrompt}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <audio ref={audioRef} />
      </div>
    </div>
  );
};

export default DialogueEditor;