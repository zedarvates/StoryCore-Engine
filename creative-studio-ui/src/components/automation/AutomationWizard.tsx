/**
 * AutomationWizard Component
 * 
 * A guided wizard for automation workflows with step-by-step process for:
 * - Selecting automation type
 * - Configuring parameters
 * - Preview and confirm
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { WizardStepIndicator, StepState, WizardStep } from '../wizard/WizardStepIndicator';
import { WizardNavigation } from '../wizard/WizardNavigation';
import {
  automationService,
  DialogueCharacterData,
  DialogueContextData,
  DialogueSceneData,
  CharacterGridBundleData,
  PromptEnhanceResponse,
} from '../../services/automationService';

// ============================================================================
// Types
// ============================================================================

export type AutomationType = 'dialogue' | 'grid' | 'prompt';

export interface AutomationWizardData {
  automationType: AutomationType;
  // Dialogue data
  dialogueCharacters?: DialogueCharacterData[];
  dialogueContext?: DialogueContextData;
  dialogueType?: string;
  numLines?: number;
  generatedDialogue?: DialogueSceneData;
  // Grid data
  gridCharacterId?: string;
  gridCharacterName?: string;
  gridSize?: string;
  gridOutfits?: string[];
  gridPoses?: string[];
  gridExpressions?: string[];
  generatedGrid?: CharacterGridBundleData;
  // Prompt data
  basePrompt?: string;
  promptStyle?: string;
  promptLighting?: string;
  promptMood?: string;
  enhancedPrompt?: PromptEnhanceResponse;
}

export interface AutomationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: AutomationWizardData) => void;
  projectId?: string;
  initialData?: Partial<AutomationWizardData>;
  className?: string;
}

// ============================================================================
// Wizard Steps Configuration
// ============================================================================

const WIZARD_STEPS: WizardStep[] = [
  { number: 1, title: 'Select Type', description: 'Choose automation type' },
  { number: 2, title: 'Configure', description: 'Set parameters' },
  { number: 3, title: 'Preview', description: 'Review and generate' },
  { number: 4, title: 'Complete', description: 'Results and export' },
];

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  container: {
    backgroundColor: '#1a1a2e',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #333',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
    color: '#00d4ff',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    fontSize: '28px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  stepIndicator: {
    padding: '16px 24px',
    borderBottom: '1px solid #333',
    backgroundColor: '#16213e',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #333',
    backgroundColor: '#16213e',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#16213e',
    borderRadius: '8px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#00d4ff',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    marginBottom: '12px',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 14px',
    marginBottom: '12px',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    marginBottom: '12px',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    borderRadius: '6px',
    color: '#eee',
    fontSize: '14px',
    minHeight: '100px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    marginBottom: '6px',
    fontSize: '13px',
    color: '#aaa',
    fontWeight: 500,
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  buttonSecondary: {
    backgroundColor: '#533483',
  },
  buttonDisabled: {
    backgroundColor: '#444',
    cursor: 'not-allowed',
  },
  typeCard: {
    padding: '20px',
    backgroundColor: '#0f3460',
    borderRadius: '8px',
    border: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
  },
  typeCardSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#1a3a5c',
  },
  typeCardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#fff',
  },
  typeCardDescription: {
    fontSize: '13px',
    color: '#aaa',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  card: {
    padding: '12px',
    backgroundColor: '#0f3460',
    borderRadius: '6px',
    border: '1px solid #333',
    marginBottom: '12px',
  },
  characterRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    marginBottom: '12px',
  },
  characterField: {
    flex: 1,
  },
  removeButton: {
    padding: '8px 12px',
    backgroundColor: '#c0392b',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  dialogueLine: {
    padding: '12px 16px',
    marginBottom: '10px',
    backgroundColor: '#0f3460',
    borderRadius: '6px',
    borderLeft: '4px solid #00d4ff',
  },
  dialogueSpeaker: {
    fontWeight: 600,
    color: '#00d4ff',
    marginBottom: '6px',
    fontSize: '14px',
  },
  dialogueText: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#eee',
  },
  promptPreview: {
    padding: '16px',
    backgroundColor: '#0a0a1a',
    borderRadius: '6px',
    fontFamily: 'monospace',
    fontSize: '13px',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word',
    color: '#eee',
    maxHeight: '200px',
    overflow: 'auto',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#aaa',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTopColor: '#00d4ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '12px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#c0392b',
    borderRadius: '6px',
    color: '#fff',
    marginBottom: '16px',
  },
  success: {
    padding: '12px 16px',
    backgroundColor: '#27ae60',
    borderRadius: '6px',
    color: '#fff',
    marginBottom: '16px',
  },
  resultSection: {
    marginTop: '20px',
  },
  gridPreview: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '12px',
  },
  gridCell: {
    aspectRatio: '1',
    backgroundColor: '#0f3460',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    color: '#aaa',
    border: '1px solid #333',
  },
  tagContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginTop: '8px',
  },
  tag: {
    padding: '4px 10px',
    backgroundColor: '#0f3460',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#00d4ff',
    border: '1px solid #00d4ff',
  },
};

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  data: Partial<AutomationWizardData>;
  onUpdate: (data: Partial<AutomationWizardData>) => void;
  errors?: Record<string, string[]>;
}

// Step 1: Select Automation Type
const Step1SelectType: React.FC<StepProps> = ({ data, onUpdate }) => {
  const types: { type: AutomationType; title: string; description: string; icon: string }[] = [
    { type: 'dialogue', title: 'Dialogue Generation', description: 'Create character conversations', icon: 'chat' },
    { type: 'grid', title: 'Character Grid', description: 'Generate character pose grids', icon: 'grid' },
    { type: 'prompt', title: 'Prompt Enhancement', description: 'Enhance and refine prompts', icon: 'edit' },
  ];

  const handleTypeSelect = (type: AutomationType) => {
    onUpdate?.({ automationType: type });
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>Select Automation Type</h3>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Choose the type of automation you want to perform.
      </p>
      
      <div style={styles.typeGrid}>
        {types.map(({ type, title, description }) => (
          <div
            key={type}
            style={{
              ...styles.typeCard,
              ...(data.automationType === type ? styles.typeCardSelected : {}),
            }}
            onClick={() => handleTypeSelect(type)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTypeSelect(type);
              }
            }}
          >
            <div style={styles.typeCardTitle}>{title}</div>
            <div style={styles.typeCardDescription}>{description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Step 2: Configure Parameters
// Step 2: Configure Parameters
const Step2Configure: React.FC<StepProps> = ({ data, onUpdate, errors }) => {
  const [newCharacterArchetype, setNewCharacterArchetype] = useState('hero');
  const [newCharacterName, setNewCharacterName] = useState('');

  // Dialogue configuration
  const addCharacter = () => {
    
    const characters = data.dialogueCharacters || [];
    onUpdate?.({
      dialogueCharacters: [
        ...characters,
        {
          character_id: `char_${Date.now()}`,
          name: newCharacterName,
          archetype: newCharacterArchetype,
        },
      ],
    });
    setNewCharacterName('');
  };

  const removeCharacter = (index: number) => {
    const characters = data.dialogueCharacters || [];
    onUpdate?.({
      dialogueCharacters: characters.filter((_, i) => i !== index),
    });
  };

  const updateCharacter = (index: number, field: string, value: string) => {
    const characters = data.dialogueCharacters || [];
    const updated = [...characters];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate?.({ dialogueCharacters: updated });
  };

  // Update handlers with optional chaining
  const handleUpdate = useCallback((update: Partial<AutomationWizardData>) => {
    onUpdate?.(update);
  }, [onUpdate]);

  // Render based on automation type
  if (data.automationType === 'dialogue') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Dialogue Generation</h3>
        
        {/* Characters */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Characters</div>
          
          {(data.dialogueCharacters || []).map((char, index) => (
            <div key={char.character_id} style={styles.card}>
              <div style={styles.characterRow}>
                <div style={styles.characterField}>
                  <label style={styles.label}>Name</label>
                  <input
                    style={styles.input}
                    value={char.name}
                    onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                    placeholder="Character name"
                  />
                </div>
                <div style={styles.characterField}>
                  <label style={styles.label}>Archetype</label>
                    <select
                      style={styles.select}
                      value={char.archetype}
                      onChange={(e) => updateCharacter(index, 'archetype', e.target.value)}
                      title="Character archetype"
                      aria-label="Character archetype"
                    >
                    <option value="hero">Hero</option>
                    <option value="villain">Villain</option>
                    <option value="mentor">Mentor</option>
                    <option value="comic_relief">Comic Relief</option>
                    <option value="sidekick">Sidekick</option>
                    <option value="antagonist">Antagonist</option>
                  </select>
                </div>
                <button
                  style={styles.removeButton}
                  onClick={() => removeCharacter(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div style={styles.characterRow}>
            <div style={styles.characterField}>
              <input
                style={styles.input}
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="New character name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCharacter();
                  }
                }}
              />
            </div>
            <div style={styles.characterField}>
              <select
                value={newCharacterArchetype}
                onChange={(e) => setNewCharacterArchetype(e.target.value)}
                title="New character archetype"
                aria-label="New character archetype"
              >
                <option value="hero">Hero</option>
                <option value="villain">Villain</option>
                <option value="mentor">Mentor</option>
                <option value="comic_relief">Comic Relief</option>
                <option value="sidekick">Sidekick</option>
                <option value="antagonist">Antagonist</option>
              </select>
            </div>
            <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={addCharacter}>
              Add Character
            </button>
          </div>
        </div>

        {/* Context */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Scene Context</div>
          
          <label style={styles.label}>Location</label>
          <input
            style={styles.input}
            value={data.dialogueContext?.location || ''}
            onChange={(e) => handleUpdate({
              dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), location: e.target.value }
            })}
            placeholder="Where does the scene take place?"

            aria-label="Scene location"
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
          <label style={styles.label}>Time of Day</label>
              <select
                style={styles.select}
                value={data.dialogueContext?.time_of_day || 'day'}
                onChange={(e) => handleUpdate({
                  dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), time_of_day: e.target.value }
                })}
                title="Time of Day"
                aria-label="Time of Day"
              >
                <option value="dawn">Dawn</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="dusk">Dusk</option>
                <option value="night">Night</option>
              </select>
            </div>
            
            <div>
              <label style={styles.label}>Situation</label>
              <select
                style={styles.select}
                value={data.dialogueContext?.situation || 'neutral'}
                onChange={(e) => handleUpdate({
                  dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), situation: e.target.value }
                })}
                title="Situation"
                aria-label="Situation"
              >
                <option value="neutral">Neutral</option>
                <option value="combat">Combat</option>
                <option value="meeting">Meeting</option>
                <option value="travel">Travel</option>
                <option value="rest">Rest</option>
              </select>
            </div>
          </div>
          
          <label style={styles.label}>Mood</label>
          <select
            style={styles.select}
            value={data.dialogueContext?.mood || 'neutral'}
            onChange={(e) => handleUpdate({
              dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), mood: e.target.value }
            })}
            title="Mood"
            aria-label="Mood"
          >
            <option value="neutral">Neutral</option>
            <option value="tense">Tense</option>
            <option value="peaceful">Peaceful</option>
            <option value="mysterious">Mysterious</option>
            <option value="epic">Epic</option>
            <option value="joyful">Joyful</option>
          </select>
          
          <label style={styles.label}>Number of Lines</label>
          <input
            type="number"
            style={styles.input}
            value={data.numLines || 10}
            onChange={(e) => handleUpdate({ numLines: Number.parseInt(e.target.value, 10) || 10 })}
            min={4}
            max={50}
            title="Number of dialogue lines"
            aria-label="Number of dialogue lines"
          />
        </div>
        
        {errors?.characters && (
          <div style={styles.error}>
            {errors.characters.join(', ')}
          </div>
        )}
      </div>
    );
  }

  if (data.automationType === 'grid') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Character Grid</h3>
        
        <div style={styles.section}>
          <label style={styles.label}>Character ID</label>
          <input
            style={styles.input}
            value={data.gridCharacterId || ''}
            onChange={(e) => handleUpdate({ gridCharacterId: e.target.value })}
            placeholder="hero_001"
            title="Character ID"
            aria-label="Character ID"
          />
          
          <label style={styles.label}>Character Name</label>
          <input
            style={styles.input}
            value={data.gridCharacterName || ''}
            onChange={(e) => handleUpdate({ gridCharacterName: e.target.value })}
            placeholder="Main Hero"
            title="Character Name"
            aria-label="Character Name"
          />
          
          <label style={styles.label}>Grid Size</label>
          <select
            style={styles.select}
            value={data.gridSize || '3x3'}
            onChange={(e) => handleUpdate({ gridSize: e.target.value })}
            title="Grid Size"
            aria-label="Grid Size"
          >
            <option value="2x2">2x2 (4 images)</option>
            <option value="3x3">3x3 (9 images)</option>
            <option value="4x4">4x4 (16 images)</option>
          </select>
          
          <label style={styles.label}>Poses (comma-separated)</label>
          <input
            style={styles.input}
            value={(data.gridPoses || []).join(', ')}
            onChange={(e) => handleUpdate({ gridPoses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="standing, walking, fighting, casting"
            title="Character poses"
            aria-label="Character poses"
          />
          
          <label style={styles.label}>Expressions (comma-separated)</label>
          <input
            style={styles.input}
            value={(data.gridExpressions || []).join(', ')}
            onChange={(e) => handleUpdate({ gridExpressions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="neutral, happy, angry, determined"
            title="Character expressions"
            aria-label="Character expressions"
          />
        </div>
        
        {errors?.character && (
          <div style={styles.error}>
            {errors.character.join(', ')}
          </div>
        )}
      </div>
    );
  }

  if (data.automationType === 'prompt') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Prompt Enhancement</h3>
        
        <div style={styles.section}>
          <label style={styles.label}>Base Prompt</label>
          <textarea
            style={styles.textarea}
            value={data.basePrompt || ''}
            onChange={(e) => handleUpdate({ basePrompt: e.target.value })}
            placeholder="Enter your base prompt to enhance..."
            rows={4}
            title="Base prompt"
            aria-label="Base prompt"
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={styles.label}>Style</label>
              <select
                style={styles.select}
                value={data.promptStyle || 'realistic'}
                onChange={(e) => handleUpdate({ promptStyle: e.target.value })}
                title="Prompt style"
                aria-label="Prompt style"
              >
                <option value="realistic">Realistic</option>
                <option value="anime">Anime</option>
                <option value="fantasy">Fantasy</option>
                <option value="science_fiction">Science Fiction</option>
                <option value="oil_painting">Oil Painting</option>
                <option value="watercolor">Watercolor</option>
                <option value="photographic">Photographic</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="gothic">Gothic</option>
                <option value="minimalist">Minimalist</option>
              </select>
            </div>
            
            <div>
              <label style={styles.label}>Lighting</label>
              <select
                style={styles.select}
                value={data.promptLighting || 'cinematic'}
                onChange={(e) => handleUpdate({ promptLighting: e.target.value })}
                title="Prompt lighting"
                aria-label="Prompt lighting"
              >
                <option value="cinematic">Cinematic</option>
                <option value="natural">Natural</option>
                <option value="dramatic">Dramatic</option>
                <option value="soft">Soft</option>
                <option value="volumetric">Volumetric</option>
                <option value="neon">Neon</option>
                <option value="golden_hour">Golden Hour</option>
                <option value="blue_hour">Blue Hour</option>
              </select>
            </div>
          </div>
          
          <label style={styles.label}>Mood</label>
          <select
            style={styles.select}
            value={data.promptMood || 'neutral'}
            onChange={(e) => handleUpdate({ promptMood: e.target.value })}
            title="Prompt mood"
            aria-label="Prompt mood"
          >
            <option value="neutral">Neutral</option>
            <option value="tense">Tense</option>
            <option value="peaceful">Peaceful</option>
            <option value="mysterious">Mysterious</option>
            <option value="epic">Epic</option>
            <option value="joyful">Joyful</option>
            <option value="somber">Somber</option>
            <option value="horror">Horror</option>
            <option value="romantic">Romantic</option>
            <option value="dreamy">Dreamy</option>
          </select>
        </div>
        
        {errors?.prompt && (
          <div style={styles.error}>
            {errors.prompt.join(', ')}
          </div>
        )}
      </div>
    );
};


  // Render based on automation type
  if (data.automationType === 'dialogue') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Dialogue Generation</h3>
        
        {/* Characters */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Characters</div>
          
          {(data.dialogueCharacters || []).map((char, index) => (
            <div key={char.character_id} style={styles.card}>
              <div style={styles.characterRow}>
                <div style={styles.characterField}>
                  <label style={styles.label}>Name</label>
                  <input
                    style={styles.input}
                    value={char.name}
                    onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                    placeholder="Character name"
                  />
                </div>
                <div style={styles.characterField}>
                  <label style={styles.label}>Archetype</label>
                  <select
                    style={styles.select}
                    value={char.archetype}
                    onChange={(e) => updateCharacter(index, 'archetype', e.target.value)}
                    title="Character archetype"
                    aria-label="Character archetype"
                  >
                    <option value="hero">Hero</option>
                    <option value="villain">Villain</option>
                    <option value="mentor">Mentor</option>
                    <option value="comic_relief">Comic Relief</option>
                    <option value="sidekick">Sidekick</option>
                    <option value="antagonist">Antagonist</option>
                  </select>
                </div>
                <button
                  style={styles.removeButton}
                  onClick={() => removeCharacter(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          
          <div style={styles.characterRow}>
            <div style={styles.characterField}>
              <input
                style={styles.input}
                value={newCharacterName}
                onChange={(e) => setNewCharacterName(e.target.value)}
                placeholder="New character name"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCharacter();
                  }
                }}
              />
            </div>
            <div style={styles.characterField}>
              <select
                style={styles.select}
                value={newCharacterArchetype}
                onChange={(e) => setNewCharacterArchetype(e.target.value)}
                title="New character archetype"
                aria-label="New character archetype"
              >
                <option value="hero">Hero</option>
                <option value="villain">Villain</option>
                <option value="mentor">Mentor</option>
                <option value="comic_relief">Comic Relief</option>
                <option value="sidekick">Sidekick</option>
                <option value="antagonist">Antagonist</option>
              </select>
            </div>
            <button style={{ ...styles.button, ...styles.buttonSecondary }} onClick={addCharacter}>
              Add Character
            </button>
          </div>
        </div>

        {/* Context */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Scene Context</div>
          
          <label style={styles.label}>Location</label>
          <input
            style={styles.input}
            value={data.dialogueContext?.location || ''}
            onChange={(e) => onUpdate({
              dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), location: e.target.value }
            })}
            placeholder="Where does the scene take place?"
            title="Scene location"
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
          <label style={styles.label}>Time of Day</label>
              <select
                style={styles.select}
                value={data.dialogueContext?.time_of_day || 'day'}
                onChange={(e) => onUpdate({
                  dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), time_of_day: e.target.value }
                })}
                title="Time of Day"
                aria-label="Time of Day"
              >
                <option value="dawn">Dawn</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
                <option value="dusk">Dusk</option>
                <option value="night">Night</option>
              </select>
            </div>
            
            <div>
              <label style={styles.label}>Situation</label>
              <select
                style={styles.select}
                value={data.dialogueContext?.situation || 'neutral'}
                onChange={(e) => onUpdate({
                  dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), situation: e.target.value }
                })}
                title="Situation"
                aria-label="Situation"
              >
                <option value="neutral">Neutral</option>
                <option value="combat">Combat</option>
                <option value="meeting">Meeting</option>
                <option value="travel">Travel</option>
                <option value="rest">Rest</option>
              </select>
            </div>
          </div>
          
          <label style={styles.label}>Mood</label>
          <select
            style={styles.select}
            value={data.dialogueContext?.mood || 'neutral'}
            onChange={(e) => onUpdate({
              dialogueContext: { ...(data.dialogueContext || { location: '', time_of_day: 'day', situation: 'neutral', mood: 'neutral' }), mood: e.target.value }
            })}
            title="Mood"
            aria-label="Mood"
          >
            <option value="neutral">Neutral</option>
            <option value="tense">Tense</option>
            <option value="peaceful">Peaceful</option>
            <option value="mysterious">Mysterious</option>
            <option value="epic">Epic</option>
            <option value="joyful">Joyful</option>
          </select>
          
          <label style={styles.label}>Number of Lines</label>
          <input
            type="number"
            style={styles.input}
            value={data.numLines || 10}
            onChange={(e) => onUpdate({ numLines: parseInt(e.target.value, 10) || 10 })}
            min={4}
            max={50}
            title="Number of dialogue lines"
          />
        </div>
        
        {errors?.characters && (
          <div style={styles.error}>
            {errors.characters.join(', ')}
          </div>
        )}
      </div>
    );
  }

  if (data.automationType === 'grid') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Character Grid</h3>
        
        <div style={styles.section}>
          <label style={styles.label}>Character ID</label>
          <input
            style={styles.input}
            value={data.gridCharacterId || ''}
            onChange={(e) => onUpdate({ gridCharacterId: e.target.value })}
            placeholder="hero_001"
          />
          
          <label style={styles.label}>Character Name</label>
          <input
            style={styles.input}
            value={data.gridCharacterName || ''}
            onChange={(e) => onUpdate({ gridCharacterName: e.target.value })}
            placeholder="Main Hero"
          />
          
          <label style={styles.label}>Grid Size</label>
          <select
            style={styles.select}
            value={data.gridSize || '3x3'}
            onChange={(e) => onUpdate({ gridSize: e.target.value })}
            title="Grid Size"
            aria-label="Grid Size"
          >
            <option value="2x2">2x2 (4 images)</option>
            <option value="3x3">3x3 (9 images)</option>
            <option value="4x4">4x4 (16 images)</option>
          </select>
          
          <label style={styles.label}>Poses (comma-separated)</label>
          <input
            style={styles.input}
            value={(data.gridPoses || []).join(', ')}
            onChange={(e) => onUpdate({ gridPoses: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="standing, walking, fighting, casting"
          />
          
          <label style={styles.label}>Expressions (comma-separated)</label>
          <input
            style={styles.input}
            value={(data.gridExpressions || []).join(', ')}
            onChange={(e) => onUpdate({ gridExpressions: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            placeholder="neutral, happy, angry, determined"
          />
        </div>
        
        {errors?.character && (
          <div style={styles.error}>
            {errors.character.join(', ')}
          </div>
        )}
      </div>
    );
  }

  if (data.automationType === 'prompt') {
    return (
      <div>
        <h3 style={styles.sectionTitle}>Configure Prompt Enhancement</h3>
        
        <div style={styles.section}>
          <label style={styles.label}>Base Prompt</label>
          <textarea
            style={styles.textarea}
            value={data.basePrompt || ''}
            onChange={(e) => onUpdate({ basePrompt: e.target.value })}
            placeholder="Enter your base prompt to enhance..."
            rows={4}
          />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={styles.label}>Style</label>
              <select
                style={styles.select}
                value={data.promptStyle || 'realistic'}
                onChange={(e) => onUpdate({ promptStyle: e.target.value })}
                title="Prompt style"
              >
                <option value="realistic">Realistic</option>
                <option value="anime">Anime</option>
                <option value="fantasy">Fantasy</option>
                <option value="science_fiction">Science Fiction</option>
                <option value="oil_painting">Oil Painting</option>
                <option value="watercolor">Watercolor</option>
                <option value="photographic">Photographic</option>
                <option value="cyberpunk">Cyberpunk</option>
                <option value="gothic">Gothic</option>
                <option value="minimalist">Minimalist</option>
              </select>
            </div>
            
            <div>
              <label style={styles.label}>Lighting</label>
              <select
                style={styles.select}
                value={data.promptLighting || 'cinematic'}
                onChange={(e) => onUpdate({ promptLighting: e.target.value })}
                title="Prompt lighting"
              >
                <option value="cinematic">Cinematic</option>
                <option value="natural">Natural</option>
                <option value="dramatic">Dramatic</option>
                <option value="soft">Soft</option>
                <option value="volumetric">Volumetric</option>
                <option value="neon">Neon</option>
                <option value="golden_hour">Golden Hour</option>
                <option value="blue_hour">Blue Hour</option>
              </select>
            </div>
          </div>
          
          <label style={styles.label}>Mood</label>
          <select
            style={styles.select}
            value={data.promptMood || 'neutral'}
            onChange={(e) => onUpdate({ promptMood: e.target.value })}
            title="Prompt mood"
          >
            <option value="neutral">Neutral</option>
            <option value="tense">Tense</option>
            <option value="peaceful">Peaceful</option>
            <option value="mysterious">Mysterious</option>
            <option value="epic">Epic</option>
            <option value="joyful">Joyful</option>
            <option value="somber">Somber</option>
            <option value="horror">Horror</option>
            <option value="romantic">Romantic</option>
            <option value="dreamy">Dreamy</option>
          </select>
        </div>
        
        {errors?.prompt && (
          <div style={styles.error}>
            {errors.prompt.join(', ')}
          </div>
        )}
      </div>
    );
  }

};

// Step 3: Preview and Generate
const Step3Preview: React.FC<StepProps & { onGenerate: () => Promise<void>; isGenerating: boolean }> = ({
  data,
  onGenerate,
  isGenerating,
}) => {
  const renderPreview = () => {
    if (data.automationType === 'dialogue') {
      return (
        <div>
          <h4 style={styles.sectionTitle}>Dialogue Preview</h4>
          <div style={styles.card}>
            <p><strong>Characters:</strong> {(data.dialogueCharacters || []).map(c => c.name).join(', ') || 'None'}</p>
            <p><strong>Location:</strong> {data.dialogueContext?.location || 'Not specified'}</p>
            <p><strong>Mood:</strong> {data.dialogueContext?.mood || 'neutral'}</p>
            <p><strong>Lines:</strong> {data.numLines || 10}</p>
          </div>
        </div>
      );
    }

    if (data.automationType === 'grid') {
      const size = data.gridSize || '3x3';
      const [rows, cols] = size.split('x').map(Number);
      
      return (
        <div>
          <h4 style={styles.sectionTitle}>Grid Preview</h4>
          <div style={styles.card}>
            <p><strong>Character:</strong> {data.gridCharacterName || 'Not specified'}</p>
            <p><strong>Size:</strong> {size} ({rows * cols} panels)</p>
            <p><strong>Poses:</strong> {(data.gridPoses || []).join(', ') || 'Default'}</p>
            <p><strong>Expressions:</strong> {(data.gridExpressions || []).join(', ') || 'Default'}</p>
          </div>
          
          <div style={styles.gridPreview}>
            {Array.from({ length: rows * cols }).map((_, i) => (
              <div key={i} style={styles.gridCell}>
                Panel {i + 1}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (data.automationType === 'prompt') {
      return (
        <div>
          <h4 style={styles.sectionTitle}>Prompt Preview</h4>
          <div style={styles.card}>
            <p><strong>Base Prompt:</strong></p>
            <div style={styles.promptPreview}>{data.basePrompt || 'No prompt entered'}</div>
            <p style={{ marginTop: '12px' }}><strong>Style:</strong> {data.promptStyle || 'realistic'}</p>
            <p><strong>Lighting:</strong> {data.promptLighting || 'cinematic'}</p>
            <p><strong>Mood:</strong> {data.promptMood || 'neutral'}</p>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>Preview and Generate</h3>
      <p style={{ color: '#aaa', marginBottom: '20px' }}>
        Review your configuration and click Generate to create content.
      </p>
      
      {renderPreview()}
      
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <button
          style={{
            ...styles.button,
            ...(isGenerating ? styles.buttonDisabled : {}),
            padding: '14px 32px',
            fontSize: '16px',
          }}
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
      </div>
    </div>
  );
};

// Step 4: Results
const Step4Results: React.FC<StepProps & { onExport: () => void }> = ({ data, onExport }) => {
  const renderResults = () => {
    if (data.automationType === 'dialogue' && data.generatedDialogue) {
      return (
        <div>
          <h4 style={styles.sectionTitle}>Generated Dialogue</h4>
          <div style={styles.card}>
            <p><strong>Scene:</strong> {data.generatedDialogue.title}</p>
            <p><strong>Lines:</strong> {data.generatedDialogue.lines?.length || 0}</p>
          </div>
          
          <div style={styles.resultSection}>
            {data.generatedDialogue.lines?.map((line, index) => (
              <div key={line.line_id || index} style={styles.dialogueLine}>
                <div style={styles.dialogueSpeaker}>
                  {line.character_name}
                  {line.emotion && <span style={{ color: '#aaa', marginLeft: '8px', fontSize: '12px' }}>({line.emotion})</span>}
                </div>
                <div style={styles.dialogueText}>{line.dialogue}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (data.automationType === 'grid' && data.generatedGrid) {
      return (
        <div>
          <h4 style={styles.sectionTitle}>Generated Grid</h4>
          <div style={styles.card}>
            <p><strong>Character:</strong> {data.generatedGrid.character_name}</p>
            <p><strong>Size:</strong> {data.generatedGrid.grid_size}</p>
            <p><strong>Total Panels:</strong> {data.generatedGrid.total_panels}</p>
          </div>
          
          <div style={styles.resultSection}>
            <h4 style={{ ...styles.sectionTitle, fontSize: '14px' }}>Panels</h4>
            <div style={styles.gridPreview}>
              {data.generatedGrid.panels?.map((panel, index) => (
                <div key={panel.panel_id || index} style={styles.gridCell}>
                  <div style={{ textAlign: 'center' }}>
                    <div>{panel.pose}</div>
                    <div style={{ fontSize: '10px', color: '#666' }}>{panel.expression}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (data.automationType === 'prompt' && data.enhancedPrompt) {
      return (
        <div>
          <h4 style={styles.sectionTitle}>Enhanced Prompt</h4>
          
          <div style={styles.card}>
            <label style={styles.label}>Original Prompt</label>
            <div style={styles.promptPreview}>{data.enhancedPrompt.original_prompt}</div>
          </div>
          
          <div style={styles.card}>
            <label style={styles.label}>Enhanced Prompt</label>
            <div style={{ ...styles.promptPreview, borderLeft: '4px solid #27ae60' }}>
              {data.enhancedPrompt.enhanced_prompt}
            </div>
          </div>
          
          <div style={styles.card}>
            <label style={styles.label}>Negative Prompt</label>
            <div style={{ ...styles.promptPreview, borderLeft: '4px solid #c0392b' }}>
              {data.enhancedPrompt.negative_prompt}
            </div>
          </div>
          
          <div style={styles.card}>
            <label style={styles.label}>Applied Tags</label>
            <div style={styles.tagContainer}>
              {data.enhancedPrompt.style_tags?.map((tag, i) => (
                <span key={`style-${i}`} style={styles.tag}>{tag}</span>
              ))}
              {data.enhancedPrompt.lighting_tags?.map((tag, i) => (
                <span key={`light-${i}`} style={{ ...styles.tag, borderColor: '#f39c12', color: '#f39c12' }}>{tag}</span>
              ))}
              {data.enhancedPrompt.mood_tags?.map((tag, i) => (
                <span key={`mood-${i}`} style={{ ...styles.tag, borderColor: '#9b59b6', color: '#9b59b6' }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.error}>
        No results available. Please go back and generate content.
      </div>
    );
  };

  return (
    <div>
      <h3 style={styles.sectionTitle}>Generation Complete</h3>
      <div style={styles.success}>Content generated successfully!</div>
      
      {renderResults()}
      
      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
        <button style={styles.button} onClick={onExport}>
          Export Result
        </button>
        <button
          style={{ ...styles.button, ...styles.buttonSecondary }}
          onClick={() => {
            // Reset to generate new content
            window.location.reload();
          }}
        >
          Generate New
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Main AutomationWizard Component
// ============================================================================

export const AutomationWizard: React.FC<AutomationWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  projectId,
  initialData,
  className,
}) => {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepStates, setStepStates] = useState<Record<number, StepState>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wizardData, setWizardData] = useState<Partial<AutomationWizardData>>({
    automationType: 'dialogue',
    dialogueCharacters: [],
    dialogueContext: {
      location: '',
      time_of_day: 'day',
      situation: 'neutral',
      mood: 'neutral',
    },
    numLines: 10,
    gridSize: '3x3',
    gridPoses: ['standing', 'walking', 'fighting', 'casting'],
    gridExpressions: ['neutral', 'happy', 'angry', 'determined'],
    promptStyle: 'realistic',
    promptLighting: 'cinematic',
    promptMood: 'neutral',
    ...initialData,
  });

  // Update data helper
  const updateData = useCallback((data: Partial<AutomationWizardData>) => {
    setWizardData(prev => ({ ...prev, ...data }));
    setError(null);
  }, []);

  // Validation
  const validateStep = useCallback((step: number): { valid: boolean; errors?: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (step === 1) {
      if (!wizardData.automationType) {
        errors.type = ['Please select an automation type'];
      }
    }

    if (step === 2) {
      if (wizardData.automationType === 'dialogue') {
        if (!wizardData.dialogueCharacters || wizardData.dialogueCharacters.length === 0) {
          errors.characters = ['Add at least one character'];
        }
        if (!wizardData.dialogueContext?.location) {
          errors.context = ['Please specify a location'];
        }
      }

      if (wizardData.automationType === 'grid') {
        if (!wizardData.gridCharacterId || !wizardData.gridCharacterName) {
          errors.character = ['Please specify character ID and name'];
        }
      }

      if (wizardData.automationType === 'prompt') {
        if (!wizardData.basePrompt || wizardData.basePrompt.trim().length < 10) {
          errors.prompt = ['Please enter a prompt (at least 10 characters)'];
        }
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
    };
  }, [wizardData]);

  // Navigation
  const canGoNext = useMemo(() => {
    const result = validateStep(currentStep);
    return result.valid;
  }, [currentStep, validateStep]);

  const canGoPrevious = currentStep > 1;

  const handleNext = useCallback(() => {
    const result = validateStep(currentStep);
    
    if (!result.valid) {
      setError(Object.values(result.errors || {}).flat().join('. '));
      return;
    }

    setStepStates(prev => ({
      ...prev,
      [currentStep]: { status: 'valid' },
    }));

    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }

    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, validateStep, completedSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const handleGoToStep = useCallback((step: number) => {
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    }
  }, [currentStep, completedSteps]);

  // Generate content
  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (wizardData.automationType === 'dialogue') {
        const result = await automationService.generateDialogue({
          characters: wizardData.dialogueCharacters || [],
          context: wizardData.dialogueContext || {
            location: 'Unknown',
            time_of_day: 'day',
            situation: 'neutral',
            mood: 'neutral',
          },
          dialogueType: 'conversation',
          numLines: wizardData.numLines || 10,
        });
        updateData({ generatedDialogue: result });
      }

      if (wizardData.automationType === 'grid') {
        const result = await automationService.generateCharacterGrid({
          characterId: wizardData.gridCharacterId || '',
          characterName: wizardData.gridCharacterName || '',
          gridSize: wizardData.gridSize,
          poses: wizardData.gridPoses,
          expressions: wizardData.gridExpressions,
        });
        updateData({ generatedGrid: result });
      }

      if (wizardData.automationType === 'prompt') {
        const result = await automationService.enhancePrompt({
          base_prompt: wizardData.basePrompt || '',
          style: wizardData.promptStyle as 'realistic' | 'anime' | 'fantasy' | 'science_fiction' | 'oil_painting' | 'watercolor' | 'photographic' | 'cyberpunk' | 'gothic' | 'minimalist',
          lighting: wizardData.promptLighting as 'cinematic' | 'natural' | 'dramatic' | 'soft' | 'volumetric' | 'neon' | 'golden_hour' | 'blue_hour',
          mood: wizardData.promptMood as 'neutral' | 'tense' | 'peaceful' | 'mysterious' | 'epic' | 'joyful' | 'somber' | 'horror' | 'romantic' | 'dreamy',
        });
        updateData({ enhancedPrompt: result });
      }

      // Move to results step
      setCompletedSteps(prev => [...prev, 3]);
      setCurrentStep(4);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [wizardData, updateData]);

  // Export results
  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(wizardData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation-${wizardData.automationType}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    onComplete?.(wizardData as AutomationWizardData);
  }, [wizardData, onComplete]);

  // Handle complete
  const handleComplete = useCallback(() => {
    onComplete?.(wizardData as AutomationWizardData);
    onClose();
  }, [wizardData, onComplete, onClose]);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1SelectType
            data={wizardData}
            onUpdate={updateData}
          />
        );
      case 2:
        return (
          <Step2Configure
            data={wizardData}
            onUpdate={updateData}
            errors={validateStep(currentStep).errors}
          />
        );
      case 3:
        return (
          <Step3Preview
            data={wizardData}
            onUpdate={updateData}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        );
      case 4:
        return (
          <Step4Results
            data={wizardData}
            onUpdate={updateData}
            onExport={handleExport}
          />
        );
      default:
        return null;
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.container}
        className={className}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Automation Wizard</h2>
          <button style={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Step Indicator */}
        <div style={styles.stepIndicator}>
          <WizardStepIndicator
            steps={WIZARD_STEPS}
            currentStep={currentStep}
            stepStates={stepStates}
            onStepClick={handleGoToStep}
            allowJumpToStep={false}
          />
        </div>

        {/* Error Display */}
        {error && (
          <div style={{ padding: '0 24px' }}>
            <div style={styles.error}>{error}</div>
          </div>
        )}

        {/* Content */}
        <div style={styles.content}>
          {isGenerating ? (
            <div style={styles.loading}>
              <div style={styles.spinner} />
              <span>Generating content...</span>
            </div>
          ) : (
            renderStep()
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <WizardNavigation
            currentStep={currentStep}
            totalSteps={WIZARD_STEPS.length}
            canGoNext={canGoNext && !isGenerating}
            canGoBack={canGoPrevious && !isGenerating}
            onNext={currentStep === 3 ? () => {} : handleNext}
            onBack={handlePrevious}
            onSubmit={currentStep === 4 ? handleComplete : undefined}
            onCancel={onClose}
            canSkip={false}
            onSkip={() => {}}
            onSaveDraft={() => {}}
          />
        </div>
      </div>

      {/* CSS Animation for spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AutomationWizard;