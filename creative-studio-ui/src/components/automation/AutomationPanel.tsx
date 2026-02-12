/**
 * Automation Panel Component
 * Central panel for all automation features
 */

import React, { useState, useEffect, ChangeEvent } from 'react';
import {
  automationService,
  DialogueCharacterData,
  DialogueContextData,
  CharacterGridBundleData,
  PromptEnhanceResponse,
  DialogueSceneData,
} from '../../services/automationService';

// CSS-in-JS styles for the panel
const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '20px',
    backgroundColor: '#1a1a2e',
    borderRadius: '8px',
    color: '#eee',
    fontFamily: 'system-ui, sans-serif',
  },
  header: {
    marginBottom: '20px',
    borderBottom: '1px solid #333',
    paddingBottom: '10px',
  },
  section: {
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: '#16213e',
    borderRadius: '6px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#00d4ff',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '8px',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#eee',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    marginBottom: '8px',
    backgroundColor: '#0f3460',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#eee',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#e94560',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: '8px',
    marginTop: '8px',
  },
  buttonSecondary: {
    backgroundColor: '#533483',
  },
  buttonDisabled: {
    backgroundColor: '#444',
    cursor: 'not-allowed',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '12px',
    marginTop: '12px',
  },
  card: {
    padding: '12px',
    backgroundColor: '#0f3460',
    borderRadius: '4px',
    border: '1px solid #333',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    color: '#aaa',
  },
  value: {
    fontSize: '14px',
    fontWeight: 500,
  },
  loading: {
    padding: '20px',
    textAlign: 'center',
    color: '#aaa',
  },
  error: {
    padding: '12px',
    backgroundColor: '#ff4444',
    borderRadius: '4px',
    marginBottom: '12px',
    color: '#fff',
  },
  success: {
    padding: '12px',
    backgroundColor: '#44aa44',
    borderRadius: '4px',
    marginBottom: '12px',
    color: '#fff',
  },
  dialogueLine: {
    padding: '8px 12px',
    marginBottom: '8px',
    backgroundColor: '#0f3460',
    borderRadius: '4px',
    borderLeft: '3px solid #00d4ff',
  },
  dialogueSpeaker: {
    fontWeight: 600,
    color: '#00d4ff',
    marginBottom: '4px',
  },
  dialogueText: {
    fontSize: '14px',
    lineHeight: 1.5,
  },
  tabs: {
    display: 'flex',
    marginBottom: '16px',
    borderBottom: '1px solid #333',
  },
  tab: {
    padding: '10px 20px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    color: '#aaa',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#00d4ff',
    borderBottomColor: '#00d4ff',
  },
  promptPreview: {
    padding: '12px',
    backgroundColor: '#0a0a1a',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

// Component type
type TabType = 'dialogue' | 'grid' | 'prompt';

interface AutomationPanelProps {
  projectId?: string;
}

// Main component
export const AutomationPanel: React.FC<AutomationPanelProps> = ({ projectId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dialogue');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for dialogues
  const [dialogueCharacters, setDialogueCharacters] = useState<DialogueCharacterData[]>([]);
  const [dialogueContext, setDialogueContext] = useState<DialogueContextData>({
    location: '',
    time_of_day: 'day',
    situation: 'neutral',
    mood: 'neutral',
  });
  const [generatedDialogue, setGeneratedDialogue] = useState<DialogueSceneData | null>(null);

  // State for grids
  const [gridCharacterId, setGridCharacterId] = useState<string>('');
  const [gridCharacterName, setGridCharacterName] = useState<string>('');
  const [gridSize, setGridSize] = useState<string>('3x3');
  const [generatedGrids, setGeneratedGrids] = useState<CharacterGridBundleData[]>([]);

  // State for prompts
  const [basePrompt, setBasePrompt] = useState<string>('');
  const [promptStyle, setPromptStyle] = useState<string>('realistic');
  const [promptLighting, setPromptLighting] = useState<string>('cinematic');
  const [promptMood, setPromptMood] = useState<string>('neutral');
  const [enhancedPrompt, setEnhancedPrompt] = useState<PromptEnhanceResponse | null>(null);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handlers for dialogues
  const addCharacter = (): void => {
    setDialogueCharacters([
      ...dialogueCharacters,
      {
        character_id: `char_${Date.now()}`,
        name: `Character ${dialogueCharacters.length + 1}`,
        archetype: 'hero',
      },
    ]);
  };

  const updateCharacter = (index: number, field: string, value: string): void => {
    const updated = [...dialogueCharacters];
    updated[index] = { ...updated[index], [field]: value };
    setDialogueCharacters(updated);
  };

  const removeCharacter = (index: number): void => {
    setDialogueCharacters(dialogueCharacters.filter((_, i) => i !== index));
  };

  const generateDialogue = async (): Promise<void> => {
    if (dialogueCharacters.length === 0) {
      setError('Add at least one character');
      return;
    }
    if (!dialogueContext.location) {
      setError('Specify a location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await automationService.generateDialogue({
        characters: dialogueCharacters,
        context: dialogueContext,
        dialogueType: 'conversation',
        numLines: 10,
      });
      setGeneratedDialogue(result);
      setSuccess('Dialogue generated successfully');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error generating dialogue';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for grids
  const generateGrid = async (): Promise<void> => {
    if (!gridCharacterId || !gridCharacterName) {
      setError('Specify character ID and name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await automationService.generateCharacterGrid({
        characterId: gridCharacterId,
        characterName: gridCharacterName,
        gridSize: gridSize,
      });
      setGeneratedGrids([result, ...generatedGrids]);
      setSuccess('Grid generated successfully');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error generating grid';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handlers for prompts
  const enhancePrompt = async (): Promise<void> => {
    if (!basePrompt) {
      setError('Enter a base prompt');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await automationService.enhancePrompt({
        base_prompt: basePrompt,
        style: promptStyle as 'realistic' | 'anime' | 'fantasy' | 'science_fiction' | 'oil_painting' | 'watercolor' | 'photographic' | 'cyberpunk' | 'gothic' | 'minimalist',
        lighting: promptLighting as 'cinematic' | 'natural' | 'dramatic' | 'soft' | 'volumetric' | 'neon' | 'golden_hour' | 'blue_hour',
        mood: promptMood as 'neutral' | 'tense' | 'peaceful' | 'mysterious' | 'epic' | 'joyful' | 'somber' | 'horror' | 'romantic' | 'dreamy',
      });
      setEnhancedPrompt(result);
      setSuccess('Prompt enhanced successfully');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error enhancing prompt';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Render tabs
  const renderTabs = (): React.ReactNode => (
    <div style={styles.tabs}>
      {(['dialogue', 'grid', 'prompt'] as TabType[]).map((tab) => (
        <div
          key={tab}
          style={{
            ...styles.tab,
            ...(activeTab === tab ? styles.tabActive : {}),
          }}
          onClick={() => setActiveTab(tab)}
          role="button"
          tabIndex={0}
          onKeyDown={(e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveTab(tab);
            }
          }}
        >
          {tab === 'dialogue' && 'Dialogues'}
          {tab === 'grid' && 'Grids'}
          {tab === 'prompt' && 'Prompts'}
        </div>
      ))}
    </div>
  );

  // Render dialogue content
  const renderDialogueTab = (): React.ReactNode => (
    <div>
      {/* Characters */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Characters</div>
        
        {dialogueCharacters.map((char, index) => (
          <div key={char.character_id} style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600 }}>Character {index + 1}</span>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary, padding: '4px 8px', marginTop: 0 }}
                onClick={() => removeCharacter(index)}
              >
                X
              </button>
            </div>
            
            <label style={styles.label}>Name</label>
            <input
              style={styles.input}
              value={char.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCharacter(index, 'name', e.target.value)}
              placeholder="Character name"
            />
            
            <label style={styles.label}>Archetype</label>
            <select
              style={styles.select}
              value={char.archetype}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => updateCharacter(index, 'archetype', e.target.value)}
              title="Character archetype"
            >
              <option value="hero">Hero</option>
              <option value="villain">Villain</option>
              <option value="mentor">Mentor</option>
              <option value="comic_relief">Comic Relief</option>
              <option value="sidekick">Sidekick</option>
              <option value="antagonist">Antagonist</option>
            </select>
          </div>
        ))}
        
        <button style={styles.button} onClick={addCharacter}>
          + Add Character
        </button>
      </div>

      {/* Context */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Context</div>
        
        <label style={styles.label}>Location</label>
        <input
          style={styles.input}
          value={dialogueContext.location}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDialogueContext({ ...dialogueContext, location: e.target.value })}
          placeholder="Scene location"
        />
        
        <label style={styles.label}>Time of Day</label>
        <select
          style={styles.select}
          value={dialogueContext.time_of_day}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setDialogueContext({ ...dialogueContext, time_of_day: e.target.value })}
          title="Time of day"
        >
          <option value="dawn">Dawn</option>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="dusk">Dusk</option>
          <option value="night">Night</option>
        </select>
        
        <label style={styles.label}>Situation</label>
        <select
          style={styles.select}
          value={dialogueContext.situation}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setDialogueContext({ ...dialogueContext, situation: e.target.value })}
          title="Situation type"
        >
          <option value="neutral">Neutral</option>
          <option value="combat">Combat</option>
          <option value="meeting">Meeting</option>
          <option value="travel">Travel</option>
          <option value="rest">Rest</option>
        </select>
        
        <label style={styles.label}>Mood</label>
        <select
          style={styles.select}
          value={dialogueContext.mood}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setDialogueContext({ ...dialogueContext, mood: e.target.value })}
          title="Mood atmosphere"
        >
          <option value="neutral">Neutral</option>
          <option value="tense">Tense</option>
          <option value="peaceful">Peaceful</option>
          <option value="mysterious">Mysterious</option>
          <option value="epic">Epic</option>
          <option value="joyful">Joyful</option>
        </select>
      </div>

      {/* Generation */}
      <button
        style={{ ...styles.button, width: '100%' }}
        onClick={generateDialogue}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Dialogue'}
      </button>

      {/* Result */}
      {generatedDialogue && (
        <div style={{ marginTop: '20px' }}>
          <div style={styles.sectionTitle}>Generated Dialogue</div>
          {generatedDialogue.lines?.map((line, index) => (
            <div key={line.line_id || index} style={styles.dialogueLine}>
              <div style={styles.dialogueSpeaker}>{line.character_name}</div>
              <div style={styles.dialogueText}>{line.dialogue}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render grid content
  const renderGridTab = (): React.ReactNode => (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Configuration</div>
        
        <label style={styles.label}>Character ID</label>
        <input
          style={styles.input}
          value={gridCharacterId}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setGridCharacterId(e.target.value)}
          placeholder="hero_001"
        />
        
        <label style={styles.label}>Character Name</label>
        <input
          style={styles.input}
          value={gridCharacterName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setGridCharacterName(e.target.value)}
          placeholder="Main Hero"
        />
        
        <label style={styles.label}>Grid Size</label>
        <select
          style={styles.select}
          value={gridSize}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setGridSize(e.target.value)}
          title="Grid size selection"
        >
          <option value="2x2">2x2 (4 images)</option>
          <option value="3x3">3x3 (9 images)</option>
          <option value="4x4">4x4 (16 images)</option>
        </select>
      </div>

      <button
        style={{ ...styles.button, width: '100%' }}
        onClick={generateGrid}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Grid'}
      </button>

      {/* Generated Grids */}
      {generatedGrids.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={styles.sectionTitle}>Generated Grids</div>
          <div style={styles.grid}>
            {generatedGrids.map((grid) => (
              <div key={grid.bundle_id} style={styles.card}>
                <div style={styles.label}>{grid.character_name}</div>
                <div style={styles.value}>{grid.grid_size}</div>
                <div style={styles.label}>{grid.total_panels} panels</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render prompt content
  const renderPromptTab = (): React.ReactNode => (
    <div>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>Base Prompt</div>
        <textarea
          style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
          value={basePrompt}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBasePrompt(e.target.value)}
          placeholder="Enter your base prompt..."
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>Style</div>
        <select
          style={styles.select}
          value={promptStyle}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPromptStyle(e.target.value)}
          title="Art style selection"
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

        <label style={styles.label}>Lighting</label>
        <select
          style={styles.select}
          value={promptLighting}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPromptLighting(e.target.value)}
          title="Lighting type selection"
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

        <label style={styles.label}>Mood</label>
        <select
          style={styles.select}
          value={promptMood}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setPromptMood(e.target.value)}
          title="Mood atmosphere selection"
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

      <button
        style={{ ...styles.button, width: '100%' }}
        onClick={enhancePrompt}
        disabled={loading}
      >
        {loading ? 'Enhancing...' : 'Enhance Prompt'}
      </button>

      {/* Result */}
      {enhancedPrompt && (
        <div style={{ marginTop: '20px' }}>
          <div style={styles.sectionTitle}>Enhanced Prompt</div>
          <div style={styles.section}>
            <div style={styles.label}>Positive Prompt</div>
            <div style={styles.promptPreview}>{enhancedPrompt.enhanced_prompt}</div>
            
            <div style={{ marginTop: '12px' }}>
              <div style={styles.label}>Negative Prompt</div>
              <div style={styles.promptPreview}>{enhancedPrompt.negative_prompt}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={{ margin: 0, color: '#00d4ff' }}>Automation Studio</h2>
        <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#aaa' }}>
          Automatic generation of dialogues, images and prompts
        </p>
      </div>

      {/* Messages */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Loading */}
      {loading && <div style={styles.loading}>Processing...</div>}

      {/* Tabs */}
      {renderTabs()}

      {/* Content based on active tab */}
      {activeTab === 'dialogue' && renderDialogueTab()}
      {activeTab === 'grid' && renderGridTab()}
      {activeTab === 'prompt' && renderPromptTab()}
    </div>
  );
};

export default AutomationPanel;

