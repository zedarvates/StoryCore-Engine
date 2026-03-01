/**
 * StoryCore Assistant Component
 *
 * AI-powered assistant that can analyze projects, provide advice, and automatically
 * trigger wizards including the Ghost Tracker for project insights.
 * Enhanced with pipeline-aware generation context and re-generation commands.
 * 
 * cspell:ignore PSNR SSIM roger Sonic Edit Viral Forge
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WizardService } from '../../services/wizard/WizardService';
import { WIZARD_DEFINITIONS } from '../../data/wizardDefinitions';
import { useAppStore } from '../../stores/useAppStore';
import { useEditorStore } from '../../stores/editorStore';
import { useGenerationStore } from '../../stores/generationStore';
import { LandingChatBox } from '../launcher/LandingChatBox';
import { ollamaClient } from '../../services/llm/OllamaClient';
import { PipelineAwareLLM } from '../../services/llm/PipelineAwareLLM';
import type { ContextualSuggestion } from '../../services/llm/PipelineAwareLLM';
import { LLMAssistantSidebar } from '../LLMAssistantSidebar';
import { Plus, Settings, HelpCircle, Activity, Sparkles, Wand2, Brain, Search, Network } from 'lucide-react';
import { rlmService } from '../../services/RecursiveLLMService';
import { RLMProcessDisplay } from '../llm/RLMProcessDisplay';
import LoreGraphVisualizer from '../llm/LoreGraphVisualizer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';

import './StoryCoreAssistant.css';

interface AssistantMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AssistantSuggestion[];
}

interface AssistantSuggestion {
  type: 'wizard' | 'advice' | 'analysis';
  title: string;
  description: string;
  action: () => void;
  wizardId?: string;
  priority: 'high' | 'medium' | 'low';
}

interface ProjectAnalysis {
  score: number;
  issues: string[];
  recommendations: string[];
  suggestedWizards: string[];
}

export function StoryCoreAssistant() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectAnalysis | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [useRLM, setUseRLM] = useState(false);
  const [rlmSteps, setRlmSteps] = useState<string[]>([]);
  const [isRlmProcessing, setIsRlmProcessing] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphRefreshKey, setGraphRefreshKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = useAppStore((state) => state.project);
  const projectPath = useEditorStore((state) => state.projectPath);
  const currentPipeline = useGenerationStore((state) => state.currentPipeline);

  // --- Handlers (Wrapped in useCallback to stabilize references) ---

  const addAssistantMessage = useCallback((content: string, suggestions?: AssistantSuggestion[]) => {
    const message: AssistantMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions
    };
    setMessages(prev => [...prev, message]);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const showHowToGuide = useCallback((topic: string) => {
    const guides: Record<string, { title: string; content: string }> = {
      'audio_production': {
        title: '🎵 Mastery: Audio Production with SonicCrafter',
        content: `**🎯 Sound Design Mastery:**\n1. Layer voice, ambient SFX, and music.\n2. Maintain emotional flow.\n3. Balance volumes: Voice (80%), SFX (50%), Music (30%).`
      },
      'quality_metrics': {
        title: '👻 Mastery: Quality Metrics with Ghost Tracker',
        content: `**📊 Project Health Metrics:**\n- Coverage: Voice, SFX, Music (target 70%+).\n- Quality: Goal 8.5/10 across all metrics.`
      },
      'data_extraction': {
        title: '🤖 Mastery: Data Extraction with Roger',
        content: `**🎯 Advanced Extraction:**\n- Best with 1000+ words.\n- Extracts characters, world lore, and plot points.`
      },
      'video_editing': {
        title: '🎬 Mastery: Video Editing with EditForge',
        content: `**🎯 Cinematic Assembly:**\n- Automated montage based on storyboard beats.\n- Synchronized transitions and audio cues.`
      }
    };
    const guide = guides[topic];
    if (guide) addAssistantMessage(`📚 **${guide.title}**\n\n${guide.content}`);
  }, [addAssistantMessage]);

  const handleWizardLaunch = useCallback(async (wizardId: string) => {
    const wizard = WIZARD_DEFINITIONS.find(w => w.id === wizardId);
    if (!wizard) return;

    addAssistantMessage(`🚀 Launching ${wizard.name}...`);

    try {
      const wizardService = new WizardService();
      const result = await wizardService.launchWizard(wizardId, projectPath || undefined);

      if (result.success) {
        addAssistantMessage(`✅ ${wizard.name} completed!\n\n${result.output || ''}`);
        const guideKey = wizardId.replace('-wizard', '').replace('-', '_');
        showHowToGuide(guideKey);
      } else {
        addAssistantMessage(`❌ ${wizard.name} failed: ${result.error || result.message}`);
      }
    } catch (error) {
      addAssistantMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }, [addAssistantMessage, projectPath, showHowToGuide]);

  const handlePipelineSuggestion = useCallback((suggestion: ContextualSuggestion) => {
    if (suggestion.type === 'wizard') {
      const mapping: Record<string, string> = { 'create-characters': 'character-creation', 'plan-shots': 'shot-planning' };
      handleWizardLaunch(mapping[suggestion.id] || suggestion.id);
    } else {
      addAssistantMessage(`💡 Advice: ${suggestion.title} — ${suggestion.description}`);
    }
  }, [addAssistantMessage, handleWizardLaunch]);

  const analyzeProject = useCallback(async (): Promise<ProjectAnalysis> => {
    let score = 8.0;
    const issues: string[] = [];
    if (!project?.characters?.length) { issues.push('No characters'); score -= 2; }
    if (!project?.shots?.length) { issues.push('No shots'); score -= 2; }
    return { score: Math.max(0, score), issues, recommendations: [], suggestedWizards: issues.length ? ['character-creation', 'shot-planning'] : [] };
  }, [project]);

  const handleQuickAction = useCallback(async (action: string) => {
    if (action === 'status') {
      const msg = PipelineAwareLLM.formatStatusMessage();
      const suggestions: AssistantSuggestion[] = PipelineAwareLLM.getContextualSuggestions().map(s => ({
        type: s.type === 'wizard' ? 'wizard' : 'advice',
        title: s.title,
        description: s.description,
        action: () => handlePipelineSuggestion(s),
        priority: 'medium'
      }));
      addAssistantMessage(msg, suggestions);
    } else if (action === 'analyze') {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeProject();
        setProjectAnalysis(analysis);
        addAssistantMessage(`📊 **Project Score: ${analysis.score}/10**\nIssues: ${analysis.issues.join(', ') || 'None'}`);
      } finally { setIsAnalyzing(false); }
    } else if (action === 'lore') {
      setIsRlmProcessing(true);
      setRlmSteps([]);
      try {
        const result = await rlmService.generateRLM("Perform a full lore consistency check. Analyze relationships between characters and their roles. Report any contradictions found in the Knowledge Graph.", project?.global_resume || "");
        setRlmSteps(result.steps);
        addAssistantMessage(`📜 **Lore Consistency Report**:\n\n${result.final_answer}`);
      } catch (error) {
        addAssistantMessage(`❌ Lore check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsRlmProcessing(false);
      }
    }
  }, [addAssistantMessage, analyzeProject, handlePipelineSuggestion, project]);

  const processUserMessage = useCallback(async (message: string) => {
    const intent = PipelineAwareLLM.parseGenerationIntent(message);
    if (intent) {
      addAssistantMessage(`🔄 Re-generation for ${intent.type} triggered. Use buttons in Generator bar.`);
      return;
    }
    const lowerValue = message.toLowerCase();
    if (lowerValue.includes('status') || lowerValue.includes('pipeline')) await handleQuickAction('status');
    else if (lowerValue.includes('analyze')) await handleQuickAction('analyze');
    else {
      try {
        if (useRLM) {
          setIsRlmProcessing(true);
          setRlmSteps([]);
          try {
            // Context can be derived from current project resume
            const massiveContext = project?.global_resume || "";
            const result = await rlmService.generateRLM(message, massiveContext);
            setRlmSteps(result.steps);
            addAssistantMessage(result.final_answer);
          } catch (error) {
            addAssistantMessage(`❌ RLM Error: ${error instanceof Error ? error.message : 'Analysis failed'}`);
          } finally {
            setIsRlmProcessing(false);
          }
          return;
        }

        const models = await ollamaClient.listModels();
        const model = models.find(m => m.name.includes('llama'))?.name || models[0]?.name;
        if (model) {
          const sysPrompt = PipelineAwareLLM.buildContextualSystemPrompt();
          const llmResponse = await ollamaClient.generate(model, `${sysPrompt}\n\nUser: ${message}`);
          addAssistantMessage(llmResponse);
          return;
        }
      } catch { /* fallback */ }
      addAssistantMessage(`I'm help with analysis/production. Try "Analyze project".`);
    }
  }, [addAssistantMessage, handleQuickAction, useRLM, project]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;
    const userMsg: AssistantMessage = { id: `u-${Date.now()}`, type: 'user', content: inputValue, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = inputValue;
    setInputValue('');
    await processUserMessage(currentInput);
  }, [inputValue, processUserMessage]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessingFile(true);
    addAssistantMessage(`📄 Processing "${file.name}"...`);
    try {
      const result = await (new WizardService()).launchWizard('roger-wizard', projectPath || undefined, { file: (file as unknown as { path: string }).path || file.name });
      addAssistantMessage(result.success ? `✅ Extraction complete!` : `❌ Extraction failed.`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [addAssistantMessage, projectPath]);

  // --- Effects ---

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (currentPipeline) console.log('Pipeline change', currentPipeline);
  }, [currentPipeline]);

  useEffect(() => {
    const projectStatus = PipelineAwareLLM.getProjectCompletionStatus();
    setMessages([{ 
      id: 'welcome', 
      type: 'assistant', 
      content: `👋 Salut ! Projet à **${projectStatus.completionPercentage}%**. Prêt pour le **Protocole Carotte** ?`, 
      timestamp: new Date(), 
      suggestions: [
        { type: 'analysis', title: '📊 Analyser', description: 'Deep scan', action: () => handleQuickAction('analyze'), priority: 'high' },
        { type: 'advice', title: '💡 Aide Carotte', description: 'Commandes vocales', action: () => (document.querySelector('.llm-sidebar-header') as HTMLElement)?.click(), priority: 'medium' },
        { type: 'wizard', title: '👻 Ghost Tracker', description: 'Ghost Tracker', action: () => handleWizardLaunch('ghost-tracker-wizard'), priority: 'low' }
      ]
    }]);
  }, [handleQuickAction, handleWizardLaunch]);

  return (
    <div className="storycore-assistant">
      <div className="assistant-header">
        <div className="assistant-icon">🤖</div>
        <div className="assistant-info">
          <h3>StoryCore Assistant</h3>
          <p>AI Advisor — Protocole Carotte</p>
        </div>
        {isAnalyzing && <div className="analyzing-indicator"><div className="spinner"></div><span>Scanning project...</span></div>}
        <div className="header-actions">
          <button 
            className="voice-help-toggle" 
            title="Aide Commandes Vocales 🥕" 
            onClick={() => (document.querySelector('.llm-sidebar-header') as HTMLElement)?.click()}
          >
            <span className="llm-carrot-icon">🥕</span>
          </button>
          
          <button 
            className={`graph-toggle-btn ${showGraph ? 'active' : ''}`}
            onClick={() => {
              setShowGraph(!showGraph);
              if (!showGraph) setGraphRefreshKey(prev => prev + 1);
            }}
            title={showGraph ? "Hide Knowledge Graph" : "Show Knowledge Graph (Lore)"}
          >
            <Network className={`w-4 h-4 ${showGraph ? 'text-cyan-400' : 'text-gray-400'}`} />
          </button>
          
          <button 
            className={`rlm-toggle-btn ${useRLM ? 'active' : ''}`}
            onClick={() => setUseRLM(!useRLM)}
            title={useRLM ? "Désactiver RLM (Mode Standard)" : "Activer RLM Engine (Deep Reasoning)"}
          >
            <Brain className={`w-4 h-4 ${useRLM ? 'animate-pulse text-cyan-400' : 'text-gray-400'}`} />
            {useRLM && <span className="rlm-badge">RLM ON</span>}
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="more-options-btn" title="Plus d'options">
                <Plus className="w-4 h-4 mr-1" />
                <span>+ more options</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="assistant-dropdown">
              <DropdownMenuItem onSelect={() => setUseRLM(!useRLM)}>
                <Brain className="w-4 h-4 mr-2 text-cyan-500" />
                <span>{useRLM ? 'Disable' : 'Enable'} RLM Engine</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAction('analyze')}>
                <Activity className="w-4 h-4 mr-2 text-blue-500" />
                <span>📊 Analyze Project</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setShowGraph(!showGraph)}>
                <Network className="w-4 h-4 mr-2 text-cyan-400" />
                <span>{showGraph ? 'Hide' : 'Show'} Knowledge Graph</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAction('lore')}>
                <Search className="w-4 h-4 mr-2 text-blue-400" />
                <span>🔍 Lore Consistency</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleQuickAction('status')}>
                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                <span>✨ System Status</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleWizardLaunch('ghost-tracker-wizard')}>
                <Wand2 className="w-4 h-4 mr-2 text-orange-500" />
                <span>👻 Ghost Tracker</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => (document.querySelector('.llm-sidebar-header') as HTMLElement)?.click()}>
                <HelpCircle className="w-4 h-4 mr-2 text-green-500" />
                <span>🥕 Voice Help</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => useAppStore.getState().setShowLLMSettings(true)}>
                <Settings className="w-4 h-4 mr-2 text-gray-500" />
                <span>⚙️ LLM Settings</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {(isRlmProcessing || rlmSteps.length > 0) && (
        <div className="rlm-contextual-panel">
          <RLMProcessDisplay 
            steps={rlmSteps} 
            isProcessing={isRlmProcessing} 
          />
        </div>
      )}

      {showGraph && (
        <div className="assistant-graph-overlay">
          <LoreGraphVisualizer refreshKey={graphRefreshKey} />
          <button className="close-graph-btn" onClick={() => setShowGraph(false)}>×</button>
        </div>
      )}

      <div className="assistant-messages">
        {messages.map(m => (
          <div key={m.id} className={`message ${m.type}`}>
            <div className="message-content">{m.content}</div>
            <div className="message-suggestions">
              {m.suggestions?.map((s, i) => (
                <button key={i} className={`suggestion-button ${s.priority}`} onClick={s.action}>{s.title}</button>
              ))}
            </div>
            <div className="message-timestamp">{m.timestamp.toLocaleTimeString()}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chatterbox-integration"><LandingChatBox placeholder="Analyze..." height="100%" /></div>

      <div className="assistant-input">

        <div className="input-with-upload">
          <textarea 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
            placeholder="Posez votre question (ex: 'Analyse mon projet')..." 
            rows={2} 
          />
          <input ref={fileInputRef} type="file" onChange={handleFileUpload} style={{ display: 'none' }} />
          <button className="upload-btn" onClick={() => fileInputRef.current?.click()} title="Upload file for analysis">📄</button>
          <button className="send-btn" onClick={handleSendMessage} disabled={!inputValue.trim() || isProcessingFile} title="Send message">
            {isProcessingFile ? <div className="spinner mini"></div> : 'Envoyer'}
          </button>
        </div>
      </div>
      
      {projectAnalysis && <div className="analysis-summary-mini">Score: {projectAnalysis.score}/10 • {projectAnalysis.issues.length} issues</div>}
      <LLMAssistantSidebar className="assistant-sidebar-embedded" />
    </div>
  );
}
