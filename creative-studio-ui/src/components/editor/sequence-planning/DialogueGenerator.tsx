import React, { useState, useEffect } from 'react';
import { DialogueLine, ProductionShot } from '@/types/shot';
import { Vector3D } from './types';
import { AudioSurroundPreview } from './AudioSurroundPreview';
import { DialogueState, useDialogueManagement } from './useDialogueManagement';

interface DialogueGeneratorProps {
  shot: ProductionShot;
  onDialoguesGenerated: (dialogues: DialogueLine[]) => void;
  surroundMode: '5.1' | '7.1';
  onSurroundModeChange: (mode: '5.1' | '7.1') => void;
  dialogueState: DialogueState;
  onDialogueUpdate: (dialogueId: string, updates: Partial<DialogueLine>) => void;
  onDialogueDelete: (dialogueId: string) => void;
  onDialogueSpatializationUpdate: (
    dialogueId: string,
    newPosition: Vector3D,
    surroundMode: '5.1' | '7.1'
  ) => void;
}

export const DialogueGenerator: React.FC<DialogueGeneratorProps> = ({
  shot,
  onDialoguesGenerated,
  surroundMode,
  onSurroundModeChange,
  dialogueState,
  onDialogueUpdate,
  onDialogueDelete,
  onDialogueSpatializationUpdate
}) => {
  const [manualText, setManualText] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState<string>('');
  const [selectedDialogue, setSelectedDialogue] = useState<DialogueLine | null>(null);

  const {
    generateDialoguesForShot,
    addManualDialogue
  } = useDialogueManagement();

  useEffect(() => {
    if (shot.composition.characterIds.length > 0) {
      setSelectedCharacter(shot.composition.characterIds[0]);
    }
  }, [shot.composition.characterIds]);

  const handleGenerateDialogues = async () => {
    const dialogues = await generateDialoguesForShot(shot, surroundMode);
    onDialoguesGenerated(dialogues);
  };

  const handleManualDialogueGeneration = async () => {
    if (!manualText.trim() || !selectedCharacter) return;

    const dialogue = await addManualDialogue(
      selectedCharacter,
      manualText,
      { x: 0, y: 0, z: 0 }, // Position par défaut
      surroundMode
    );

    if (dialogue) {
      onDialoguesGenerated([...dialogueState.dialogues, dialogue]);
      setManualText('');
    }
  };

  const handleUpdateSpatialization = (dialogue: DialogueLine, newPosition: Vector3D) => {
    onDialogueSpatializationUpdate(dialogue.id, newPosition, surroundMode);
  };

  const handleDeleteDialogue = (dialogueId: string) => {
    onDialogueDelete(dialogueId);
  };

  return (
    <div className="dialogue-generator bg-gray-900 p-4 rounded-lg border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Génération de Dialogues SAPI</h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-300">Mode Surround:</label>
          <select
            title="Mode Surround"
            value={surroundMode}
            onChange={(e) => onSurroundModeChange(e.target.value as '5.1' | '7.1')}
            className="bg-gray-800 text-white px-2 py-1 rounded border border-gray-600 text-sm"
          >
            <option value="5.1">5.1</option>
            <option value="7.1">7.1</option>
          </select>
        </div>
      </div>

      {/* Génération automatique */}
      <div className="mb-6">
        <button
          onClick={handleGenerateDialogues}
          disabled={dialogueState.isGenerating || shot.composition.characterIds.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors"
        >
          {dialogueState.isGenerating ? 'Génération...' : 'Générer Dialogues Automatiques'}
        </button>
        <p className="text-sm text-gray-400 mt-1">
          Génère automatiquement des dialogues pour tous les personnages du shot
        </p>
      </div>

      {/* Génération manuelle */}
      <div className="mb-6 p-4 bg-gray-800 rounded border border-gray-600">
        <h4 className="text-md font-medium text-white mb-3">Dialogue Manuel</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Personnage:</label>
            <select
              title="Personnage"
              value={selectedCharacter}
              onChange={(e) => setSelectedCharacter(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
            >
              {shot.composition.characterIds.map(charId => (
                <option key={charId} value={charId}>{charId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Texte du dialogue:</label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Entrez le texte du dialogue..."
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 resize-none"
              rows={3}
            />
          </div>
          <button
            onClick={handleManualDialogueGeneration}
            disabled={dialogueState.isGenerating || !manualText.trim() || !selectedCharacter}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-medium transition-colors"
          >
            {dialogueState.isGenerating ? 'Génération...' : 'Ajouter Dialogue'}
          </button>
        </div>
      </div>

      {/* Liste des dialogues générés */}
      {dialogueState.dialogues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-md font-medium text-white mb-3">Dialogues Générés</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {dialogueState.dialogues.map((dialogue) => (
              <div
                key={dialogue.id}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedDialogue?.id === dialogue.id
                    ? 'bg-blue-900 border-blue-500'
                    : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
                }`}
                onClick={() => setSelectedDialogue(dialogue)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-gray-300 mb-1">
                      <strong>{dialogue.characterId}</strong> - {dialogue.timing.emotionalTone}
                    </div>
                    <div className="text-white text-sm">"{dialogue.text}"</div>
                    <div className="text-xs text-gray-400 mt-1">
                      Voix: {dialogue.audio.voiceId} | Position: {dialogue.audio.spatialization.speakerAssignment}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDialogue(dialogue.id);
                    }}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Éditeur de dialogue sélectionné */}
      {dialogueState.selectedDialogue && (
        <div className="p-4 bg-gray-800 rounded border border-gray-600">
          <h4 className="text-md font-medium text-white mb-3">Édition du Dialogue</h4>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Voix SAPI:</label>
<select
              title="Voix SAPI"
              value={dialogueState.selectedDialogue!.audio.voiceId}
                onChange={(e) => {
                  const updated = { ...dialogueState.selectedDialogue!, audio: { ...dialogueState.selectedDialogue!.audio, voiceId: e.target.value } };
                  onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
              >
                <option value="Microsoft-Zira">Zira (Femme, US)</option>
                <option value="Microsoft-David">David (Homme, US)</option>
                <option value="Microsoft-Mark">Mark (Homme, US)</option>
                <option value="Microsoft-Hazel">Hazel (Femme, GB)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Ton Émotionnel:</label>
<select
                title="Ton Émotionnel"
                value={dialogueState.selectedDialogue!.timing.emotionalTone}
                onChange={(e) => {
                  const updated = {
                    ...dialogueState.selectedDialogue!,
                    timing: { ...dialogueState.selectedDialogue!.timing, emotionalTone: e.target.value as any }
                  };
                  onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
              >
                <option value="neutral">Neutre</option>
                <option value="happy">Heureux</option>
                <option value="sad">Triste</option>
                <option value="angry">En colère</option>
                <option value="excited">Excité</option>
                <option value="calm">Calme</option>
                <option value="surprised">Surpris</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-1">Texte:</label>
<textarea
              placeholder="Modifier le texte du dialogue..."
              value={dialogueState.selectedDialogue!.text}
              onChange={(e) => {
                const updated = { ...dialogueState.selectedDialogue!, text: e.target.value };
                onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
              }}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 resize-none"
              rows={2}
            />
          </div>

          {/* Aperçu spatial */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Position Spatiale:</label>
            <AudioSurroundPreview
              elements={[{
                id: selectedDialogue!.id,
                name: selectedDialogue!.characterId,
                audio: {
                  enabled: true,
                  speakerAssignment: selectedDialogue!.audio.spatialization.speakerAssignment,
                  volume: selectedDialogue!.audio.volume
                }
              }]}
              surroundMode={surroundMode}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-300 mb-1">Pitch:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={dialogueState.selectedDialogue!.audio.pitch}
                onChange={(e) => {
                  const updated = {
                    ...dialogueState.selectedDialogue!,
                    audio: { ...dialogueState.selectedDialogue!.audio, pitch: parseFloat(e.target.value) }
                  };
                  onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
                }}
                className="w-full"
              />
              <div className="text-xs text-gray-400 text-center">{dialogueState.selectedDialogue!.audio.pitch.toFixed(1)}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Vitesse:</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={dialogueState.selectedDialogue!.audio.speed}
                onChange={(e) => {
                  const updated = {
                    ...dialogueState.selectedDialogue!,
                    audio: { ...dialogueState.selectedDialogue!.audio, speed: parseFloat(e.target.value) }
                  };
                  onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
                }}
                className="w-full"
              />
              <div className="text-xs text-gray-400 text-center">{dialogueState.selectedDialogue!.audio.speed.toFixed(1)}</div>
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">Volume:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={dialogueState.selectedDialogue!.audio.volume}
                onChange={(e) => {
                  const updated = {
                    ...dialogueState.selectedDialogue!,
                    audio: { ...dialogueState.selectedDialogue!.audio, volume: parseFloat(e.target.value) }
                  };
                  onDialogueUpdate(dialogueState.selectedDialogue!.id, updated);
                }}
                className="w-full"
              />
              <div className="text-xs text-gray-400 text-center">{dialogueState.selectedDialogue!.audio.volume.toFixed(1)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};