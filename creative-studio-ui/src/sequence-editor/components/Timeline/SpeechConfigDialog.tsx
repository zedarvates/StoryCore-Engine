/**
 * SpeechConfigDialog Component
 * 
 * Dialog for configuring text-to-speech for characters:
 * - Character selection
 * - TTS method/provider selection
 * - Voice selection
 * - Speed, pitch, emotion settings
 * 
 * Requirements: Timeline editing enhancement
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { TTSCharacter, TTSMethod } from '../../types';
import type { SpeechConfigOptions } from '../../hooks/useTimelineInteractions';

// ============================================================================
// Types
// ============================================================================

interface SpeechConfigDialogProps {
  isOpen: boolean;
  shotId: string;
  layerId: string;
  currentConfig?: SpeechConfigOptions;
  existingText?: string;
  characters?: TTSCharacter[];
  ttsMethods?: TTSMethod[];
  onApply: (config: SpeechConfigOptions, text?: string) => void;
  onClose: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TTS_METHODS: TTSMethod[] = [
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    provider: 'elevenlabs',
    requiresApiKey: true,
    supportedLanguages: ['fr', 'en', 'es', 'de', 'it'],
    voiceCount: 100,
  },
  {
    id: 'openai',
    name: 'OpenAI TTS',
    provider: 'openai',
    requiresApiKey: true,
    supportedLanguages: ['fr', 'en', 'es', 'de', 'it'],
    voiceCount: 6,
  },
  {
    id: 'coqui',
    name: 'Coqui TTS',
    provider: 'coqui',
    requiresApiKey: false,
    supportedLanguages: ['fr', 'en', 'es', 'de'],
    voiceCount: 50,
  },
  {
    id: 'sapi',
    name: 'SAPI (Windows)',
    provider: 'sapi',
    requiresApiKey: false,
    supportedLanguages: ['fr', 'en'],
    voiceCount: 10,
  },
  {
    id: 'local',
    name: 'TTS Local',
    provider: 'local',
    requiresApiKey: false,
    supportedLanguages: ['fr', 'en'],
    voiceCount: 5,
  },
];

const DEFAULT_CHARACTERS: TTSCharacter[] = [
  { id: 'narrator', name: 'Narrateur', gender: 'neutral' },
  { id: 'character-1', name: 'Personnage 1', gender: 'male' },
  { id: 'character-2', name: 'Personnage 2', gender: 'female' },
];

const EMOTIONS = [
  { id: 'neutral', name: 'Neutre', icon: '😐' },
  { id: 'happy', name: 'Joyeux', icon: '😊' },
  { id: 'sad', name: 'Triste', icon: '😢' },
  { id: 'angry', name: 'Colérique', icon: '😠' },
  { id: 'surprised', name: 'Surpris', icon: '😲' },
  { id: 'fearful', name: 'Peur', icon: '😨' },
  { id: 'whisper', name: 'Chuchotement', icon: '🤫' },
];

const SPEED_PRESETS = [
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '2x', value: 2.0 },
];

// ============================================================================
// Component
// ============================================================================

export const SpeechConfigDialog: React.FC<SpeechConfigDialogProps> = ({
  isOpen,
  shotId,
  layerId,
  currentConfig,
  existingText = '',
  characters = DEFAULT_CHARACTERS,
  ttsMethods = DEFAULT_TTS_METHODS,
  onApply,
  onClose,
}) => {
  // State
  const [text, setText] = useState(existingText);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | undefined>(
    currentConfig?.characterId
  );
  const [selectedMethod, setSelectedMethod] = useState<string>(
    currentConfig?.ttsMethod || 'elevenlabs'
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(
    currentConfig?.voiceId
  );
  const [speed, setSpeed] = useState(currentConfig?.speed || 1.0);
  const [pitch, setPitch] = useState(currentConfig?.pitch || 0);
  const [emotion, setEmotion] = useState<string | undefined>(currentConfig?.emotion);

  // Get selected character
  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId),
    [characters, selectedCharacterId]
  );

  // Get selected method
  const selectedMethodData = useMemo(
    () => ttsMethods.find((m) => m.id === selectedMethod),
    [ttsMethods, selectedMethod]
  );

  // Get available voices based on selected method and character
  const availableVoices = useMemo(() => {
    // In a real implementation, this would fetch voices from the TTS provider
    // For now, return placeholder voices
    const methodVoices = [];
    for (let i = 1; i <= (selectedMethodData?.voiceCount || 10); i++) {
      methodVoices.push({
        id: `voice-${selectedMethod}-${i}`,
        name: `Voix ${i}`,
        gender: i % 2 === 0 ? 'female' : 'male',
      });
    }
    return methodVoices;
  }, [selectedMethod, selectedMethodData]);

  // Handle character selection
  const handleCharacterSelect = useCallback((characterId: string) => {
    setSelectedCharacterId(characterId);
    const character = characters.find((c) => c.id === characterId);
    if (character?.voiceId) {
      setSelectedVoiceId(character.voiceId);
    }
  }, [characters]);

  // Handle apply
  const handleApply = useCallback(() => {
    const character = characters.find((c) => c.id === selectedCharacterId);
    
    onApply(
      {
        characterId: selectedCharacterId,
        characterName: character?.name,
        ttsMethod: selectedMethod,
        voiceId: selectedVoiceId,
        speed,
        pitch,
        emotion,
      },
      text
    );
    onClose();
  }, [
    selectedCharacterId,
    selectedMethod,
    selectedVoiceId,
    speed,
    pitch,
    emotion,
    text,
    characters,
    onApply,
    onClose,
  ]);

  // Preview TTS (placeholder)
  const handlePreview = useCallback(() => {
    console.log('[SpeechConfig] Preview TTS:', {
      text: text.substring(0, 100),
      method: selectedMethod,
      voice: selectedVoiceId,
      speed,
      pitch,
    });
    // In a real implementation, this would call the TTS service
    alert(`Aperçu TTS:\n"${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"\n\nMéthode: ${selectedMethodData?.name}\nVoix: ${selectedVoiceId}`);
  }, [text, selectedMethod, selectedVoiceId, speed, pitch, selectedMethodData]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog speech-config-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-header">
          <h2>Configuration Parole / TTS</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-content">
          {/* Text Input */}
          <div className="form-group">
            <label>Texte à prononcer</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Entrez le texte que le personnage doit dire..."
              rows={4}
            />
            <div className="text-counter">{text.length} caractères</div>
          </div>

          {/* Character Selection */}
          <div className="form-group">
            <label>Personnage</label>
            <div className="character-grid">
              {characters.map((character) => (
                <button
                  key={character.id}
                  className={`character-button ${selectedCharacterId === character.id ? 'active' : ''}`}
                  onClick={() => handleCharacterSelect(character.id)}
                >
                  <div className="character-avatar">
                    {character.gender === 'male' ? '👨' : character.gender === 'female' ? '👩' : '🧑'}
                  </div>
                  <span className="character-name">{character.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* TTS Method Selection */}
          <div className="form-group">
            <label>Méthode TTS</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
            >
              {ttsMethods.map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name} {method.requiresApiKey ? '(API Key requise)' : ''}
                </option>
              ))}
            </select>
            {selectedMethodData && (
              <div className="method-info">
                <span>{selectedMethodData.voiceCount} voix disponibles</span>
                <span>Langues: {selectedMethodData.supportedLanguages?.join(', ')}</span>
              </div>
            )}
          </div>

          {/* Voice Selection */}
          <div className="form-group">
            <label>Voix</label>
            <select
              value={selectedVoiceId || ''}
              onChange={(e) => setSelectedVoiceId(e.target.value)}
            >
              {availableVoices.map((voice) => (
                <option key={voice.id} value={voice.id}>
                  {voice.name} ({voice.gender === 'male' ? 'Homme' : voice.gender === 'female' ? 'Femme' : 'Neutre'})
                </option>
              ))}
            </select>
          </div>

          {/* Speed and Pitch */}
          <div className="form-row">
            <div className="form-group">
              <label>Vitesse</label>
              <div className="speed-controls">
                {SPEED_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    className={`speed-button ${speed === preset.value ? 'active' : ''}`}
                    onClick={() => setSpeed(preset.value)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label>Ton (Pitch)</label>
              <input
                type="range"
                min={-10}
                max={10}
                step={1}
                value={pitch}
                onChange={(e) => setPitch(Number(e.target.value))}
              />
              <div className="pitch-labels">
                <span>Grave</span>
                <span>Normal</span>
                <span>Aigu</span>
              </div>
            </div>
          </div>

          {/* Emotion */}
          <div className="form-group">
            <label>Émotion</label>
            <div className="emotion-grid">
              {EMOTIONS.map((e) => (
                <button
                  key={e.id}
                  className={`emotion-button ${emotion === e.id ? 'active' : ''}`}
                  onClick={() => setEmotion(e.id)}
                  title={e.name}
                >
                  <span className="emotion-icon">{e.icon}</span>
                  <span className="emotion-name">{e.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="form-group">
            <button
              className="btn btn-preview"
              onClick={handlePreview}
              disabled={!text.trim()}
            >
              🔊 Aperçu
            </button>
          </div>
        </div>

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={!text.trim()}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};

export default SpeechConfigDialog;