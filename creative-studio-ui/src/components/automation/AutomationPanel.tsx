/**
 * Automation Panel Component
 * Central panel for all automation features
 */

import React, { useState, useEffect, ChangeEvent } from 'react';
import './AutomationPanel.css';
import {
  automationService,
  DialogueCharacterData,
  DialogueContextData,
  CharacterGridBundleData,
  PromptEnhanceResponse,
  DialogueSceneData,
} from '../../services/automationService';

// Component type
type TabType = 'dialogue' | 'grid' | 'prompt' | 'n8n' | 'messaging';

interface AutomationPanelProps {
  projectId?: string;
}

import { n8nService, n8nStatus, n8nWorkflow, n8nTemplate } from '../../services/n8nService';
import { messagingService, MessagingStatus } from '../../services/messagingService';

// Main component
export const AutomationPanel: React.FC<AutomationPanelProps> = ({ projectId: _projectId }) => {
  const [activeTab, setActiveTab] = useState<TabType>('dialogue');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // State for n8n
  const [n8nStatus, setN8nStatus] = useState<n8nStatus | null>(null);
  const [n8nWorkflows, setN8nWorkflows] = useState<n8nWorkflow[]>([]);
  const [n8nTemplates, setN8nTemplates] = useState<n8nTemplate[]>([]);
  const [triggeringWorkflowId, setTriggeringWorkflowId] = useState<string | null>(null);
  const [importingTemplate, setImportingTemplate] = useState<string | null>(null);

  // State for Messaging
  const [messagingStatus, setMessagingStatus] = useState<MessagingStatus | null>(null);
  const [testMessage, setTestMessage] = useState<string>('Hello from ElectroClaw! 🚀');
  const [telegramChatId, setTelegramChatId] = useState<string>('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState<string>('');
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);

  // Effect to load n8n data when tab is active
  useEffect(() => {
    if (activeTab === 'n8n') {
      const loadN8nData = async () => {
        setLoading(true);
        try {
          const status = await n8nService.getStatus();
          setN8nStatus(status);
          const workflows = await n8nService.listWorkflows();
          setN8nWorkflows(workflows);
          const templates = await n8nService.listTemplates();
          setN8nTemplates(templates);
        } catch (_err) {
          console.debug("AutomationPanel: n8n service not reachable (expected if backend is down)");
        } finally {
          setLoading(false);
        }
      };
      loadN8nData();
    }

    if (activeTab === 'messaging') {
      const loadMessagingStatus = async () => {
        setLoading(true);
        try {
          const status = await messagingService.getStatus();
          setMessagingStatus(status);
        } catch (_err) {
          console.debug("AutomationPanel: messaging service not reachable (expected if backend is down)");
        } finally {
          setLoading(false);
        }
      };
      loadMessagingStatus();
    }
  }, [activeTab]);

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

  const handleTriggerWorkflow = async (workflowId: string) => {
    const workflow = n8nWorkflows.find(w => w.id === workflowId);
    if (!workflow) return;

    let webhookId = workflow.id;
    if (workflow.name.includes("Webhook Test")) webhookId = "electroclaw-test";
    else if (workflow.name.includes("Character Enhancer")) webhookId = "enhance-character";

    setTriggeringWorkflowId(workflowId);
    try {
      await n8nService.triggerWorkflow(webhookId, {
        source: 'ElectroClaw UI',
        triggered_at: new Date().toISOString()
      });
      setSuccess(`Workflow "${workflow.name}" triggered successfully!`);
    } catch (err: unknown) {
      setError(`Failed to trigger workflow: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTriggeringWorkflowId(null);
    }
  };

  // Render tabs
  const renderTabs = (): React.ReactNode => (
    <div className="automation-tabs">
      {(['dialogue', 'grid', 'prompt', 'messaging', 'n8n'] as TabType[]).map((tab) => (
        <div
          key={tab}
          className={`automation-tab ${activeTab === tab ? 'automation-tab-active' : ''}`}
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
          {tab === 'messaging' && 'Messaging'}
          {tab === 'n8n' && 'n8n Automation'}
        </div>
      ))}
    </div>
  );

  // Render dialogue content
  const renderDialogueTab = (): React.ReactNode => (
    <div>
      {/* Characters */}
      <div className="automation-section">
        <div className="automation-section-title">Characters</div>
        
        {dialogueCharacters.map((char, index) => (
          <div key={char.character_id} className="automation-card">
            <div className="automation-flex-row">
              <span className="automation-bold">Character {index + 1}</span>
              <button
                className="automation-button automation-button-secondary automation-btn-sm"
                onClick={() => removeCharacter(index)}
              >
                X
              </button>
            </div>
            
            <label className="automation-label">Name</label>
            <input
              className="automation-input"
              value={char.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateCharacter(index, 'name', e.target.value)}
              placeholder="Character name"
            />
            
            <label className="automation-label">Archetype</label>
            <select
              className="automation-select"
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
        
        <button className="automation-button" onClick={addCharacter}>
          + Add Character
        </button>
      </div>

      {/* Context */}
      <div className="automation-section">
        <div className="automation-section-title">Context</div>
        
        <label className="automation-label">Location</label>
        <input
          className="automation-input"
          value={dialogueContext.location}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDialogueContext({ ...dialogueContext, location: e.target.value })}
          placeholder="Scene location"
        />
        
        <label className="automation-label">Time of Day</label>
        <select
          className="automation-select"
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
        
        <label className="automation-label">Situation</label>
        <select
          className="automation-select"
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
        
        <label className="automation-label">Mood</label>
        <select
          className="automation-select"
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
        className="automation-button w-100"
        onClick={generateDialogue}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Dialogue'}
      </button>

      {/* Result */}
      {generatedDialogue && (
        <div className="mt-20">
          <div className="automation-section-title">Generated Dialogue</div>
          {generatedDialogue.lines?.map((line, index) => (
            <div key={line.line_id || index} className="automation-dialogue-line">
              <div className="automation-dialogue-speaker">{line.character_name}</div>
              <div className="automation-dialogue-text">{line.dialogue}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render grid content
  const renderGridTab = (): React.ReactNode => (
    <div>
      <div className="automation-section">
        <div className="automation-section-title">Configuration</div>
        
        <label className="automation-label">Character ID</label>
        <input
          className="automation-input"
          value={gridCharacterId}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setGridCharacterId(e.target.value)}
          placeholder="hero_001"
        />
        
        <label className="automation-label">Character Name</label>
        <input
          className="automation-input"
          value={gridCharacterName}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setGridCharacterName(e.target.value)}
          placeholder="Main Hero"
        />
        
        <label className="automation-label">Grid Size</label>
        <select
          className="automation-select"
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
        className="automation-button w-100"
        onClick={generateGrid}
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Grid'}
      </button>

      {/* Generated Grids */}
      {generatedGrids.length > 0 && (
        <div className="mt-20">
          <div className="automation-section-title">Generated Grids</div>
          <div className="automation-grid">
            {generatedGrids.map((grid) => (
              <div key={grid.bundle_id} className="automation-card">
                <div className="automation-label">{grid.character_name}</div>
                <div className="automation-value">{grid.grid_size}</div>
                <div className="automation-label">{grid.total_panels} panels</div>
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
      <div className="automation-section">
        <div className="automation-section-title">Base Prompt</div>
        <textarea
          className="automation-input automation-textarea"
          value={basePrompt}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBasePrompt(e.target.value)}
          placeholder="Enter your base prompt..."
        />
      </div>

      <div className="automation-section">
        <div className="automation-section-title">Style</div>
        <select
          className="automation-select"
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

        <label className="automation-label">Lighting</label>
        <select
          className="automation-select"
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

        <label className="automation-label">Mood</label>
        <select
          className="automation-select"
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
        className="automation-button w-100"
        onClick={enhancePrompt}
        disabled={loading}
      >
        {loading ? 'Enhancing...' : 'Enhance Prompt'}
      </button>

      {/* Result */}
      {enhancedPrompt && (
        <div className="mt-20">
          <div className="automation-section-title">Enhanced Prompt</div>
          <div className="automation-section">
            <div className="automation-label">Positive Prompt</div>
            <div className="automation-prompt-preview">{enhancedPrompt.enhanced_prompt}</div>
            
            <div className="mt-12">
              <div className="automation-label">Negative Prompt</div>
              <div className="automation-prompt-preview">{enhancedPrompt.negative_prompt}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render messaging content
  const renderMessagingTab = (): React.ReactNode => (
    <div className="automation-tab-content">
      <div className="automation-section">
        <div className="automation-section-title">Connectivity Status</div>
        <div className="n8n-status-container">
          <div className="n8n-status-card">
            <div className={`n8n-status-icon ${messagingStatus?.telegram === 'configured' ? 'n8n-status-online' : 'n8n-status-offline'}`}></div>
            <div>
              <div className="automation-bold">Telegram Bot</div>
              <div className={messagingStatus?.telegram === 'configured' ? 'status-text-online' : 'status-text-offline'}>
                {messagingStatus?.telegram === 'configured' ? 'CONNECTED' : 'NOT CONFIGURED'}
              </div>
            </div>
          </div>
          <div className="n8n-status-card">
            <div className={`n8n-status-icon ${messagingStatus?.discord === 'configured' ? 'n8n-status-online' : 'n8n-status-offline'}`}></div>
            <div>
              <div className="automation-bold">Discord Webhook</div>
              <div className={messagingStatus?.discord === 'configured' ? 'status-text-online' : 'status-text-offline'}>
                {messagingStatus?.discord === 'configured' ? 'CONNECTED' : 'NOT CONFIGURED'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="automation-section">
        <div className="automation-section-title">Test Notifications</div>
        <div className="automation-form-group">
          <label className="automation-label">Test Message Content</label>
          <textarea
            className="automation-input automation-textarea"
            value={testMessage}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setTestMessage(e.target.value)}
            placeholder="Enter message to send..."
          />
        </div>

        <div className="automation-grid">
          <div className="automation-card">
            <div className="automation-section-title no-margin">
              <span className="automation-service-icon">🔹</span> Telegram
            </div>
            <div className="automation-form-group mt-20">
              <label className="automation-label">Chat ID (Optional override)</label>
              <input
                className="automation-input"
                value={telegramChatId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTelegramChatId(e.target.value)}
                placeholder="Defaults to config if empty"
              />
            </div>
            <button
              className="automation-button w-100"
              disabled={messagingStatus?.telegram !== 'configured' || sendingMessage}
              onClick={async () => {
                setSendingMessage(true);
                try {
                  await messagingService.sendTelegram(testMessage, telegramChatId || undefined);
                  setSuccess("Telegram message sent successfully!");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to send Telegram message");
                } finally {
                  setSendingMessage(false);
                }
              }}
            >
              {sendingMessage ? 'Sending...' : 'Send to Telegram'}
            </button>
          </div>

          <div className="automation-card">
            <div className="automation-section-title no-margin">
              <span className="automation-service-icon">🟣</span> Discord
            </div>
            <div className="automation-form-group mt-20">
              <label className="automation-label">Webhook URL (Optional override)</label>
              <input
                className="automation-input"
                value={discordWebhookUrl}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setDiscordWebhookUrl(e.target.value)}
                placeholder="Defaults to config if empty"
              />
            </div>
            <button
              className="automation-button automation-button-secondary w-100"
              disabled={messagingStatus?.discord !== 'configured' || sendingMessage}
              onClick={async () => {
                setSendingMessage(true);
                try {
                  await messagingService.sendDiscord(testMessage, discordWebhookUrl || undefined);
                  setSuccess("Discord message sent successfully!");
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed to send Discord message");
                } finally {
                  setSendingMessage(false);
                }
              }}
            >
              {sendingMessage ? 'Sending...' : 'Send via Discord'}
            </button>
          </div>
        </div>
      </div>

      <div className="automation-info">
        <p><strong>Pro Tip:</strong> Ensure that the environment variables <code>TELEGRAM_BOT_TOKEN</code> and <code>DISCORD_WEBHOOK_URL</code> are set in your <code>.env</code> file for default connectivity.</p>
      </div>
    </div>
  );

  // Render n8n content
  const renderN8nTab = (): React.ReactNode => (
    <div className="automation-tab-content">
      <div className="automation-section">
        <div className="automation-section-title">n8n Connection Status</div>
        <div className="n8n-status-container">
          <div className="n8n-status-card">
            <div 
              className={`n8n-status-icon ${n8nStatus?.status === 'online' ? 'n8n-status-online' : 'n8n-status-offline'}`}
            ></div>
            <span className={n8nStatus?.status === 'online' ? 'status-text-online' : 'status-text-offline'}>
              {n8nStatus?.status === 'online' ? 'Online' : 'Offline'}
            </span>
            <span className="n8n-status-message">
              {n8nStatus?.message}
            </span>
          </div>
          
          <div className="automation-flex-row automation-gap-8 no-margin">
            <button 
              className="automation-button automation-button-secondary"
              onClick={() => window.open(n8nService.getN8nUrl(), '_blank')}
            >
              Open n8n UI
            </button>
            <button 
              className="automation-button"
              onClick={async () => {
                setLoading(true);
                try {
                  await n8nService.createWorkflow(`Automation ${new Date().toLocaleTimeString()}`, [], {});
                  setSuccess('New workflow shell created in n8n!');
                  const workflows = await n8nService.listWorkflows();
                  setN8nWorkflows(workflows);
                } catch (_err) {
                  setError('Failed to create workflow');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || n8nStatus?.status !== 'online'}
            >
              + Create New Workflow
            </button>
          </div>
        </div>
      </div>

      <div className="automation-section">
        <div className="automation-section-title">Workflow Catalog</div>
        {n8nWorkflows.length > 0 ? (
          <div className="automation-grid">
            {n8nWorkflows.map((wf) => (
              <div key={wf.id} className={`automation-card ${!wf.active ? 'n8n-card-inactive' : ''}`}>
                <div className="automation-flex-row">
                  <div className="automation-flex-col">
                    <div className="automation-wf-name">{wf.name}</div>
                    <div className="automation-label mt-4">
                      ID: {wf.id}
                    </div>
                  </div>
                  <div className="automation-flex-col automation-align-end automation-gap-8">
                    <span className={`n8n-badge ${wf.active ? 'n8n-badge-active' : 'n8n-badge-inactive'}`}>
                      {wf.active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      className="n8n-trigger-btn"
                      onClick={() => handleTriggerWorkflow(wf.id)}
                      disabled={triggeringWorkflowId === wf.id}
                    >
                      {triggeringWorkflowId === wf.id ? '...' : 'Trigger'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="automation-loading">
            No workflows found or n8n API not configured.
          </div>
        )}
      </div>

      <div className="automation-section">
        <div className="automation-section-title">Template Library</div>
        <p className="automation-label mb-12">Import pre-configured workflows for ElectroClaw</p>
        
        {n8nTemplates.length > 0 ? (
          <div className="automation-grid">
            {n8nTemplates.map((template) => (
              <div key={template.filename} className="automation-card n8n-template-card">
                <div className="automation-flex-col">
                  <div className="automation-wf-name">{template.name}</div>
                  <div className="automation-label mt-4">{template.description || template.filename}</div>
                  {template.tags && template.tags.length > 0 && (
                    <div className="n8n-template-tags mt-8">
                      {template.tags.map(tag => (
                        <span key={tag} className="n8n-tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-16">
                  <button
                    className="automation-button automation-button-secondary w-100"
                    disabled={!!importingTemplate || n8nStatus?.status !== 'online'}
                    onClick={async () => {
                      setImportingTemplate(template.filename);
                      try {
                        await n8nService.importTemplate(template.filename);
                        setSuccess(`Template "${template.name}" imported successfully!`);
                        const workflows = await n8nService.listWorkflows();
                        setN8nWorkflows(workflows);
                      } catch (err) {
                        setError(`Failed to import template: ${err instanceof Error ? err.message : 'Unknown error'}`);
                      } finally {
                        setImportingTemplate(null);
                      }
                    }}
                  >
                    {importingTemplate === template.filename ? 'Importing...' : 'Import to n8n'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="automation-loading">No templates available.</div>
        )}
      </div>
      
      <div className="automation-section">
        <div className="automation-section-title">Direct Connection Info</div>
        <p className="automation-label">API Gateway / Webhook URL Context:</p>
        <div className="n8n-url-display">
          {n8nService.getN8nUrl()}
        </div>
      </div>
    </div>
  );

  return (
    <div className="automation-panel">
      <div className="automation-header">
        <h2>Automation Studio</h2>
        <p>
          Automatic generation of dialogues, images and prompts + n8n management
        </p>
      </div>

      {/* Messages */}
      {error && <div className="automation-error">{error}</div>}
      {success && <div className="automation-success">{success}</div>}

      {/* Loading */}
      {loading && <div className="automation-loading">Processing...</div>}

      {/* Tabs */}
      {renderTabs()}

      {/* Content based on active tab */}
      {activeTab === 'dialogue' && renderDialogueTab()}
      {activeTab === 'grid' && renderGridTab()}
      {activeTab === 'prompt' && renderPromptTab()}
      {activeTab === 'messaging' && renderMessagingTab()}
      {activeTab === 'n8n' && renderN8nTab()}
    </div>
  );
};

export default AutomationPanel;

