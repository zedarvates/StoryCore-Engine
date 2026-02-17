/**
 * StoryCore Assistant Component
 *
 * AI-powered assistant that can analyze projects, provide advice, and automatically
 * trigger wizards including the Ghost Tracker for project insights.
 * Enhanced with pipeline-aware generation context and re-generation commands.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { WizardDefinition } from '../../types/configuration';
import { WizardService } from '../../services/wizard/WizardService';
import { WIZARD_DEFINITIONS } from '../../data/wizardDefinitions';
import { useAppStore } from '../../stores/useAppStore';
import { useEditorStore } from '../../stores/editorStore';
import { useGenerationStore } from '../../stores/generationStore';
import { LandingChatBox } from '../launcher/LandingChatBox';
import { ollamaClient } from '../../services/llm/OllamaClient';
import { PipelineAwareLLM } from '../../services/llm/PipelineAwareLLM';
import type { ContextualSuggestion } from '../../services/llm/PipelineAwareLLM';
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
  const [pipelineSuggestions, setPipelineSuggestions] = useState<ContextualSuggestion[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const project = useAppStore((state) => state.project);
  const projectPath = useEditorStore((state) => state.projectPath);
  const currentPipeline = useGenerationStore((state) => state.currentPipeline);

  // Update pipeline suggestions when pipeline state changes
  useEffect(() => {
    const suggestions = PipelineAwareLLM.getContextualSuggestions();
    setPipelineSuggestions(suggestions);
  }, [currentPipeline]);

  // Initialize with welcome message (context-aware)
  useEffect(() => {
    const projectStatus = PipelineAwareLLM.getProjectCompletionStatus();
    const ctxSuggestions = PipelineAwareLLM.getContextualSuggestions();

    let welcomeContent = `👋 Salut ! Je suis ton Assistant StoryCore. Je t'aide à créer ton film de A à Z.\n\n`;
    welcomeContent += `📊 Ton projet est à **${projectStatus.completionPercentage}%**`;

    if (projectStatus.missingSteps.length > 0) {
      welcomeContent += `\n\n📋 Prochaines étapes :`;
      projectStatus.missingSteps.slice(0, 3).forEach(step => {
        welcomeContent += `\n• ${step}`;
      });
    }

    welcomeContent += `\n\nEssaie :\n• "Analyse mon projet"\n• "Régénérer l'image du shot 1"\n• "État du pipeline"\n• "Quel wizard lancer ?"`;

    // Build dynamic suggestions from pipeline state + defaults
    const dynamicSuggestions: AssistantSuggestion[] = [];

    // Add pipeline-aware suggestions first
    ctxSuggestions.slice(0, 2).forEach(cs => {
      dynamicSuggestions.push({
        type: cs.type === 'wizard' ? 'wizard' : 'analysis',
        title: cs.title,
        description: cs.description,
        action: () => handlePipelineSuggestion(cs),
        priority: cs.priority === 'critical' ? 'high' : cs.priority === 'high' ? 'high' : 'medium',
      });
    });

    // Always include analyze
    dynamicSuggestions.push({
      type: 'analysis',
      title: '📊 Analyser le projet',
      description: 'Analyse complète avec état du pipeline',
      action: () => handleQuickAction('analyze'),
      priority: 'high'
    });

    // Ghost Tracker
    dynamicSuggestions.push({
      type: 'wizard',
      title: '👻 Ghost Tracker',
      description: 'AI-powered project advisor',
      action: () => handleWizardLaunch('ghost-tracker-wizard'),
      wizardId: 'ghost-tracker-wizard',
      priority: 'medium'
    });

    const welcomeMessage: AssistantMessage = {
      id: 'welcome',
      type: 'assistant',
      content: welcomeContent,
      timestamp: new Date(),
      suggestions: dynamicSuggestions.slice(0, 4),
    };

    setMessages([welcomeMessage]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally run only on mount - welcome message should be set once
  }, []);

  // Auto-analyze project when it loads
  useEffect(() => {
    if (project && projectPath && messages.length === 1) {
      // Auto-trigger analysis after a short delay
      const timeoutId = setTimeout(() => {
        handleQuickAction('analyze');
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only trigger when project/projectPath changes; messages.length check prevents re-triggering
  }, [project, projectPath]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Process the message
    await processUserMessage(inputValue);
  };

  // Handle pipeline-aware suggestions when user clicks them
  const handlePipelineSuggestion = (suggestion: ContextualSuggestion) => {
    switch (suggestion.type) {
      case 'wizard':
        // Map suggestion IDs to wizard IDs
        if (suggestion.id === 'create-characters') handleWizardLaunch('character-creation');
        else if (suggestion.id === 'plan-shots') handleWizardLaunch('shot-planning');
        else addAssistantMessage(`🚀 Lancement de l'action: ${suggestion.title}`);
        break;
      case 'generate':
      case 'regenerate':
        addAssistantMessage(
          `🎨 Pour ${suggestion.actionLabel}, utilise le bouton correspondant dans la barre de génération (Prompt → Image → Vidéo → Audio).\n\n` +
          `💡 Astuce : Tu peux aussi cliquer droit sur un shot dans l'éditeur pour accéder aux options de re-génération.`,
          [{
            type: 'advice',
            title: '📊 Voir l\'état du pipeline',
            description: 'Afficher l\'état de toutes les générations',
            action: () => handleQuickAction('status'),
            priority: 'medium',
          }]
        );
        break;
      case 'export':
        addAssistantMessage(
          `🎞️ Pour exporter ton film, va dans le Video Editor et clique sur "Export".\n` +
          `Tu pourras choisir le format (MP4, MOV, etc.) et la qualité (Draft → Cinema).`
        );
        break;
      default:
        addAssistantMessage(`✅ ${suggestion.title} — ${suggestion.description}`);
    }
  };

  const processUserMessage = async (message: string) => {
    const lowerMessage = message.toLowerCase();

    // 1. Check for re-generation intent first (new feature)
    const regenIntent = PipelineAwareLLM.parseGenerationIntent(message);
    if (regenIntent) {
      const typeLabels = { prompt: 'le prompt', image: 'l\'image', video: 'la vidéo', audio: 'l\'audio' };
      const label = typeLabels[regenIntent.type];
      let response = `🔄 Tu veux régénérer ${label}`;
      if (regenIntent.targetName) {
        response += ` de "${regenIntent.targetName}"`;
      }
      response += `.\n\n`;
      response += `Pour lancer la re-génération :\n`;
      response += `1. Sélectionne le shot dans l'éditeur\n`;
      response += `2. Clique sur le bouton ${regenIntent.type === 'image' ? '🖼️ Image' : regenIntent.type === 'video' ? '🎬 Vidéo' : regenIntent.type === 'audio' ? '🔊 Audio' : '✏️ Prompt'} dans la barre de génération\n`;
      response += `3. Ajuste les paramètres si besoin et lance\n\n`;
      response += `💡 La re-génération remplacera le contenu existant.`;

      addAssistantMessage(response, [{
        type: 'analysis',
        title: '📊 État du pipeline',
        description: 'Voir les générations en cours',
        action: () => handleQuickAction('status'),
        priority: 'medium',
      }]);
      return;
    }

    // 2. Check for status/pipeline commands (new feature)
    if (lowerMessage.includes('status') || lowerMessage.includes('état') || lowerMessage.includes('pipeline') || lowerMessage.includes('progression')) {
      await handleQuickAction('status');
      return;
    }

    // 3. Existing command routing
    if (lowerMessage.includes('analyze') || lowerMessage.includes('analysis') || lowerMessage.includes('analyse')) {
      await handleQuickAction('analyze');
    } else if (lowerMessage.includes('ghost') || lowerMessage.includes('tracker')) {
      await handleWizardLaunch('ghost-tracker-wizard');
    } else if (lowerMessage.includes('character') || lowerMessage.includes('personnage')) {
      await handleWizardLaunch('character-creation');
    } else if (lowerMessage.includes('shot') || lowerMessage.includes('plan')) {
      await handleWizardLaunch('shot-planning');
    } else if (lowerMessage.includes('dialogue') || lowerMessage.includes('dialog')) {
      await handleWizardLaunch('dialogue-wizard');
    } else if (lowerMessage.includes('reference') || lowerMessage.includes('image')) {
      await handleWizardLaunch('shot-reference-wizard');
    } else if (lowerMessage.includes('world') || lowerMessage.includes('monde')) {
      await handleWizardLaunch('world-building');
    } else if (lowerMessage.includes('storyboard')) {
      await handleWizardLaunch('storyboard-creator');
    } else if (lowerMessage.includes('music') || lowerMessage.includes('musique')) {
      await handleWizardLaunch('music-generation');
    } else if (lowerMessage.includes('lyrics') || lowerMessage.includes('paroles') || lowerMessage.includes('chanson')) {
      await handleWizardLaunch('lyrics-generation');
    } else if (lowerMessage.includes('sequence') || lowerMessage.includes('séquence')) {
      await handleWizardLaunch('sequence-plan');
    } else if (lowerMessage.includes('export') || lowerMessage.includes('film')) {
      // New: export guidance
      const projectStatus = PipelineAwareLLM.getProjectCompletionStatus();
      if (projectStatus.completionPercentage < 80) {
        addAssistantMessage(
          `⚠️ Ton projet est à ${projectStatus.completionPercentage}%. Voici ce qu'il reste à faire avant l'export :\n\n` +
          projectStatus.missingSteps.map(s => `• ${s}`).join('\n') +
          `\n\n💡 Complète d'abord ces étapes pour un export de qualité.`
        );
      } else {
        addAssistantMessage(
          `🎞️ Ton projet est prêt pour l'export (${projectStatus.completionPercentage}%) !\n\n` +
          `Va dans le Video Editor → Export pour choisir :\n` +
          `• Format : MP4, MOV, AVI, MKV, WEBM\n` +
          `• Qualité : Draft, Preview, Standard, High, Broadcast, Cinema\n` +
          `• Options : Sous-titres, chapitres, package professionnel`
        );
      }
    } else {
      // 4. Use Ollama with CONTEXT-AWARE system prompt (enhanced)
      const ollamaStatus = useAppStore.getState().ollamaStatus;

      if (ollamaStatus === 'connected') {
        try {
          const models = await ollamaClient.listModels();
          const model = models.find(m => m.category === 'storytelling' || m.name.includes('llama'))?.name || models[0]?.name;

          if (model) {
            // Use pipeline-aware context instead of generic prompt
            const systemPrompt = PipelineAwareLLM.buildContextualSystemPrompt();
            const response = await ollamaClient.generate(model, `${systemPrompt}\n\nUser: ${message}`);
            addAssistantMessage(response);
            return;
          }
        } catch (error) {
          console.error('❌ [StoryCoreAssistant] Ollama chat failed:', error);
        }
      }

      // Fallback to generic response
      const response = generateGenericResponse(message);
      addAssistantMessage(response.content, response.suggestions);
    }
  };

  const handleQuickAction = async (action: string) => {
    if (action === 'status') {
      // New: Pipeline status command
      const statusMsg = PipelineAwareLLM.formatStatusMessage();
      const ctxSuggestions = PipelineAwareLLM.getContextualSuggestions();
      const suggestions: AssistantSuggestion[] = ctxSuggestions.slice(0, 3).map(cs => ({
        type: cs.type === 'wizard' ? 'wizard' as const : 'analysis' as const,
        title: cs.title,
        description: cs.description,
        action: () => handlePipelineSuggestion(cs),
        priority: cs.priority === 'critical' ? 'high' as const : 'medium' as const,
      }));
      addAssistantMessage(statusMsg, suggestions);
    } else if (action === 'analyze') {
      setIsAnalyzing(true);

      try {
        const analysis = await analyzeProject();
        setProjectAnalysis(analysis);
        const pipelineStatus = PipelineAwareLLM.getPipelineStatus();
        const projectStatus = PipelineAwareLLM.getProjectCompletionStatus();

        let content = `📊 **Analyse Complète du Projet !**\n\n`;
        content += `🎯 Score global : ${analysis.score}/10\n`;
        content += `📈 Complétion : ${projectStatus.completionPercentage}%\n`;
        content += `🔄 Pipeline : ${pipelineStatus.overallProgress}%\n\n`;

        if (analysis.issues.length > 0) {
          content += `⚠️ Problèmes détectés :\n`;
          analysis.issues.slice(0, 3).forEach(issue => {
            content += `• ${issue}\n`;
          });
          content += '\n';
        }

        if (pipelineStatus.failedStages.length > 0) {
          content += `❌ Étapes en échec : ${pipelineStatus.failedStages.join(', ')}\n\n`;
        }

        if (analysis.recommendations.length > 0) {
          content += `💡 Recommandations :\n`;
          analysis.recommendations.slice(0, 3).forEach(rec => {
            content += `• ${rec}\n`;
          });
          content += '\n';
        }

        if (analysis.suggestedWizards.length > 0) {
          content += `🚀 Wizards suggérés :\n`;
          analysis.suggestedWizards.forEach(wizardId => {
            const wizard = WIZARD_DEFINITIONS.find(w => w.id === wizardId);
            if (wizard) {
              content += `• ${wizard.name}\n`;
            }
          });
        }

        // Merge wizard suggestions with pipeline suggestions
        const suggestions: AssistantSuggestion[] = [];

        // Pipeline-aware suggestions first
        const ctxSuggestions = PipelineAwareLLM.getContextualSuggestions();
        ctxSuggestions.slice(0, 2).forEach(cs => {
          suggestions.push({
            type: cs.type === 'wizard' ? 'wizard' as const : 'analysis' as const,
            title: cs.title,
            description: cs.description,
            action: () => handlePipelineSuggestion(cs),
            priority: cs.priority === 'critical' ? 'high' as const : 'medium' as const,
          });
        });

        // Wizard suggestions
        analysis.suggestedWizards.slice(0, 2).forEach(wizardId => {
          const wizard = WIZARD_DEFINITIONS.find(w => w.id === wizardId);
          suggestions.push({
            type: 'wizard' as const,
            title: wizard?.name || 'Unknown Wizard',
            description: `Lancer ${wizard?.name} pour améliorer le projet`,
            action: () => handleWizardLaunch(wizardId),
            wizardId,
            priority: 'high' as const
          });
        });

        addAssistantMessage(content, suggestions);

      } catch (error) {
        addAssistantMessage(`❌ L'analyse a échoué : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const analyzeProject = async (): Promise<ProjectAnalysis> => {
    // This would normally call the Ghost Tracker wizard
    // For now, simulate analysis based on available project data

    let score = 8.0;
    const issues: string[] = [];
    const recommendations: string[] = [];
    const suggestedWizards: string[] = [];

    // Check project data
    if (!project?.characters || project.characters.length === 0) {
      issues.push('No characters defined');
      recommendations.push('Create detailed character profiles');
      suggestedWizards.push('character-creation');
      score -= 1.5;
    }

    if (!project?.shots || project.shots.length === 0) {
      issues.push('No shots planned');
      recommendations.push('Plan your cinematic shots');
      suggestedWizards.push('shot-planning');
      score -= 1.5;
    }

    // Always suggest Ghost Tracker for detailed analysis
    if (!suggestedWizards.includes('ghost-tracker-wizard')) {
      suggestedWizards.push('ghost-tracker-wizard');
    }

    // Suggest shot references if shots exist
    if (project?.shots && project.shots.length > 0 && !suggestedWizards.includes('shot-reference-wizard')) {
      suggestedWizards.push('shot-reference-wizard');
    }

    return {
      score: Math.max(0, Math.min(10, score)),
      issues,
      recommendations,
      suggestedWizards
    };
  };

  const handleWizardLaunch = async (wizardId: string) => {
    const wizard = WIZARD_DEFINITIONS.find(w => w.id === wizardId);
    if (!wizard) return;

    // Enhanced announcements with wizard-specific expertise
    const announcements: Record<string, string> = {
      'ghost-tracker-wizard': `👻 I'm using the Ghost Tracker AI Advisor to analyze your project with deep insights and quality metrics from our test suite. This wizard uses advanced AI to provide comprehensive project analysis, identify improvement opportunities, and suggest optimization strategies.`,
      'roger-wizard': `🤖 I'm using the Roger Data Extractor to intelligently parse your text files and populate your StoryCore project. Roger specializes in natural language processing to extract characters, locations, plot points, and world-building elements from your source materials.`,
      'audio-production-wizard': `🎵 I'm using the SonicCrafter Audio Production Wizard to craft a complete sound design for your video sequences. SonicCrafter analyzes your storyboard to create voice overs, sound effects, music cues, and ambient audio that perfectly match your narrative.`,
      'video-editor-wizard': `🎬 I'm using the EditForge Video Editor Wizard to create professional montages from your storyboards. EditForge automatically assembles shots with cinematic transitions, synchronizes audio, and optimizes pacing for maximum impact.`,
      'marketing-wizard': `🚀 I'm using the ViralForge Marketing Content Wizard to create comprehensive viral marketing campaigns. ViralForge analyzes your content to generate thumbnails, descriptions, social posts, and strategies optimized for each platform's algorithm.`,
      'character-creation': `👤 I'm using the Character Creation Wizard to design detailed, compelling characters. This wizard creates rich personality profiles, backstories, and visual descriptions that bring your characters to life.`,
      'dialogue-wizard': `💬 I'm using the Dialogue Wizard to create compelling, character-driven conversations. The Dialogue Wizard ensures authentic voice, emotional depth, and narrative coherence in every line.`,
      'world-building': `🌍 I'm using the World Building Wizard to create immersive, consistent universes. This wizard develops detailed lore, cultures, rules, and interconnected elements for rich storytelling.`,
      'shot-planning': `🎥 I'm using the Shot Planning Wizard to create cinematic shot sequences. This wizard applies professional cinematography principles to transform your story into visual storytelling.`,
      'shot-reference-wizard': `🖼️ I'm using the Shot Reference Wizard to generate visual references for your shots. This wizard creates detailed images that help visualize and plan your cinematic sequences.`,
      'scene-generator': `🎬 I'm using the Scene Generator to create complete cinematic scenes. This wizard combines storytelling, cinematography, and visual design for compelling sequences.`,
      'storyboard-creator': `📋 I'm using the Storyboard Creator to visualize your story through sequential panels. This wizard generates professional storyboard layouts for planning and communication.`,
      'style-transfer': `🎨 I'm using the Style Transfer Wizard to apply consistent visual styles across your project. This wizard ensures visual cohesion and artistic consistency.`,
      'project-init': `📁 I'm using the Project Initialization Wizard to set up your new StoryCore project. This wizard creates the perfect foundation with guided setup and story generation.`,
      'sequence-plan': `🎬 I'm using the Sequence Plan Wizard to create detailed shot sequences for your story. This wizard helps you organize your narrative into coherent cinematic sequences with proper pacing and flow.`,
      'shot': `📸 I'm using the Shot Wizard to create and configure individual shots. This wizard helps you define camera angles, compositions, and visual details for each shot in your sequence.`,
      'music-generation': `🎵 I'm using the Music Generation Wizard to create original music for your project. Describe the mood, style, and duration you need, and the AI will generate detailed music prompts that can be used with music generation tools.`,
      'lyrics-generation': `🎤 I'm using the Lyrics Generation Wizard to write original lyrics for your project. Whether you need a song for a specific scene or background music with vocals, this wizard helps create compelling lyrics.`,
    };

    const announcement = announcements[wizardId] || `🚀 I'm launching the ${wizard.name} to help with your creative workflow.`;
    addAssistantMessage(announcement);

    try {
      const wizardService = new WizardService();

      const result = await wizardService.launchWizard(wizardId, projectPath || undefined);

      if (result.success) {
        let response = `✅ ${wizard.name} completed successfully!\n\n`;
        if (result.output) {
          response += `${result.output}\n\n`;
        }
        response += `📄 Check the results in your project directory.`;

        // Add comprehensive learning and workflow suggestions
        const suggestions: AssistantSuggestion[] = [];

        // Add "How To" guides for every wizard
        const howToGuides: Record<string, { title: string; description: string }> = {
          'audio-production-wizard': {
            title: '🎵 Master Audio Production',
            description: 'Learn professional sound design techniques'
          },
          'ghost-tracker-wizard': {
            title: '👻 Master Quality Analysis',
            description: 'Learn to interpret and use quality metrics'
          },
          'roger-wizard': {
            title: '🤖 Master Data Extraction',
            description: 'Advanced text analysis and structuring'
          },
          'video-editor-wizard': {
            title: '🎬 Master Video Editing',
            description: 'Professional montage and post-production'
          },
          'marketing-wizard': {
            title: '🚀 Master Viral Marketing',
            description: 'Create successful marketing campaigns'
          },
          'character-creation': {
            title: '👤 Master Character Design',
            description: 'Create compelling, memorable characters'
          },
          'dialogue-wizard': {
            title: '💬 Master Dialogue Writing',
            description: 'Write authentic, engaging conversations'
          },
          'world-building': {
            title: '🌍 Master World Building',
            description: 'Create immersive, consistent universes'
          },
          'shot-planning': {
            title: '🎥 Master Cinematography',
            description: 'Plan professional shot sequences'
          },
          'shot-reference-wizard': {
            title: '🖼️ Master Visual References',
            description: 'Create effective shot visualizations'
          }
        };

        if (howToGuides[wizardId]) {
          suggestions.push({
            type: 'advice',
            title: howToGuides[wizardId].title,
            description: howToGuides[wizardId].description,
            action: () => showHowToGuide(wizardId.replace('-wizard', '').replace('-', '_')),
            priority: 'medium'
          });
        }

        // Intelligent workflow suggestions based on wizard used
        const workflowSuggestions = getWorkflowSuggestions(wizardId);
        suggestions.push(...workflowSuggestions);

        // Add project analysis if not recently done
        if (!projectAnalysis && messages.length > 2) {
          suggestions.push({
            type: 'analysis',
            title: '📊 Analyze Full Project',
            description: 'Get comprehensive project insights',
            action: () => handleQuickAction('analyze'),
            priority: 'low'
          });
        }

        addAssistantMessage(response, suggestions);
      } else {
        addAssistantMessage(`❌ ${wizard.name} failed: ${result.error || result.message}\n\n💡 Try checking your project setup or contact support if the issue persists.`);
      }

    } catch (error) {
      addAssistantMessage(`❌ Error launching ${wizard.name}: ${error instanceof Error ? error.message : 'Unknown error'}\n\n🔧 The wizard may need additional configuration or there might be a temporary issue.`);
    }
  };

  const getWorkflowSuggestions = (completedWizardId: string): AssistantSuggestion[] => {
    const suggestions: AssistantSuggestion[] = [];

    // Intelligent workflow chains based on creative process
    const workflows: Record<string, { id: string; title: string; desc: string }[]> = {
      'character-creation': [
        { id: 'dialogue-wizard', title: 'Create Dialogue', desc: 'Bring your characters to life with conversations' },
        { id: 'shot-planning', title: 'Plan Shots', desc: 'Visualize your characters in cinematic shots' },
        { id: 'world-building', title: 'Build World', desc: 'Create the environment for your characters' }
      ],
      'world-building': [
        { id: 'character-creation', title: 'Create Characters', desc: 'Populate your world with compelling inhabitants' },
        { id: 'shot-planning', title: 'Plan Exploration', desc: 'Create shots that showcase your world' },
        { id: 'scene-generator', title: 'Generate Scenes', desc: 'Build scenes in your detailed world' }
      ],
      'shot-planning': [
        { id: 'shot-reference-wizard', title: 'Generate References', desc: 'Create visual references for your shots' },
        { id: 'scene-generator', title: 'Build Scenes', desc: 'Expand shots into complete scenes' },
        { id: 'storyboard-creator', title: 'Create Storyboard', desc: 'Visualize your shot sequence' }
      ],
      'shot-reference-wizard': [
        { id: 'style-transfer', title: 'Apply Style', desc: 'Ensure visual consistency across shots' },
        { id: 'scene-generator', title: 'Generate Scenes', desc: 'Combine references into scenes' },
        { id: 'storyboard-creator', title: 'Create Storyboard', desc: 'Build complete visual narrative' }
      ],
      'audio-production-wizard': [
        { id: 'video-editor-wizard', title: 'Create Montage', desc: 'Combine audio with video editing' },
        { id: 'marketing-wizard', title: 'Create Marketing', desc: 'Promote your audio-enhanced project' },
        { id: 'ghost-tracker-wizard', title: 'Quality Analysis', desc: 'Analyze the complete audiovisual project' }
      ],
      'video-editor-wizard': [
        { id: 'marketing-wizard', title: 'Viral Marketing', desc: 'Create promotional content for your video' },
        { id: 'ghost-tracker-wizard', title: 'Final Analysis', desc: 'Comprehensive quality assessment' }
      ],
      'marketing-wizard': [
        { id: 'ghost-tracker-wizard', title: 'Campaign Analysis', desc: 'Analyze marketing campaign effectiveness' }
      ],
      'roger-wizard': [
        { id: 'character-creation', title: 'Enhance Characters', desc: 'Develop characters from extracted data' },
        { id: 'world-building', title: 'Build World', desc: 'Expand world from extracted elements' },
        { id: 'ghost-tracker-wizard', title: 'Data Quality', desc: 'Analyze extracted data quality' }
      ],
      'ghost-tracker-wizard': [
        { id: 'character-creation', title: 'Improve Characters', desc: 'Address character-related issues' },
        { id: 'shot-planning', title: 'Enhance Shots', desc: 'Fix shot planning problems' },
        { id: 'audio-production-wizard', title: 'Add Audio', desc: 'Address audio gaps' }
      ]
    };

    const workflow = workflows[completedWizardId] || [];
    return workflow.slice(0, 2).map((item: any) => ({
      type: 'wizard' as const,
      title: item.title,
      description: item.desc,
      action: () => handleWizardLaunch(item.id),
      wizardId: item.id,
      priority: 'high' as const
    }));
  };

  const showHowToGuide = (topic: string) => {
    const guides = {
      'audio_production': {
        title: '🎵 How to Master Audio Production with SonicCrafter',
        content: `
**🎯 Pro Tips for Professional Sound Design:**

1. **Layer Your Audio**: Combine voice overs with subtle ambient sounds and music cues
2. **Mood Consistency**: Use the same mood category across related shots for emotional flow
3. **Timing is Everything**: Voice overs should be 60-80% of shot duration for natural pacing
4. **SFX Categories**: Focus on Foley (practical sounds) for realism, effects for emphasis
5. **Music Hierarchy**: Background music at 20-30% volume, SFX at 40-60%, voice at 70-90%

**🔧 Advanced Techniques:**
- Export voice scripts separately for professional recording
- Use music cue exports for collaboration with composers
- Focus on specific shots with --shots parameter for iterative refinement
- Combine with Ghost Tracker for complete project optimization

**💡 Example Workflow:**
1. Run SonicCrafter on your storyboard
2. Review generated voice scripts and music cues
3. Record voice overs in a quiet environment
4. Mix elements using professional audio software
5. Export final audio files matching video timing
        `
      },
      'quality_metrics': {
        title: '👻 How to Use Quality Metrics with Ghost Tracker',
        content: `
**📊 Understanding Ghost Tracker Metrics:**

**Coverage Metrics:**
- **Voice Coverage**: % of shots with narration (aim for 60-80%)
- **SFX Coverage**: % of shots with sound effects (aim for 70-90%)
- **Music Coverage**: % of shots with background music (aim for 40-60%)

**Quality Scores:**
- **Average Confidence**: How reliable our AI suggestions are
- **Overall Quality**: Combined score for project health

**🎯 Optimization Strategies:**

1. **Low Coverage Areas**: Run specialized wizards to fill gaps
2. **High Confidence**: Use as-is or make minor adjustments
3. **Low Confidence**: Review and customize suggestions

**🔍 Deep Analysis Features:**
- **Multimedia Quality**: PSNR/SSIM scores from image tests
- **Audio Quality**: Levels and mixing standards
- **Prompt Optimization**: AI prompt effectiveness analysis
- **Consistency Checks**: Cross-project coherence validation

**💡 Pro Tip**: Run Ghost Tracker after major changes to track improvement!
        `
      },
      'data_extraction': {
        title: '🤖 How to Extract Data Like a Pro with Roger',
        content: `
**🎯 Advanced Data Extraction Techniques:**

**File Type Optimization:**
- **Stories**: Extract characters, plot, world-building
- **Scripts**: Focus on dialogue and character relationships
- **World Lore**: Extract rules, cultures, magic systems
- **LLM Outputs**: Parse AI-generated content for structure

**Focus Areas for Precision:**
- **Characters Only**: --focus characters for casting prep
- **Locations Only**: --focus world_building for set design
- **Plot Only**: --focus plot for story structure
- **Combined**: Let Roger analyze everything automatically

**📈 Quality Enhancement:**
- **Longer Files**: Better extraction (minimum 1000 words)
- **Clear Structure**: Chapter breaks, character names help accuracy
- **Rich Descriptions**: Detailed settings improve world-building extraction
- **Consistent Naming**: Same character/location names throughout

**🔧 Integration Workflow:**
1. Extract data with Roger from your source material
2. Review and refine extracted elements
3. Use Character Wizard to enhance personality traits
4. Run World Builder for immersive settings
5. Create shots with enriched context

**💡 Expert Tip**: Use --preview first to see extraction potential before full processing!
        `
      },
      'video_editing': {
        title: '🎬 How to Master Video Editing with EditForge',
        content: `
**🎯 Pro Tips for Cinematic Montage:**

1. **Pacing is King**: Match editing rhythm to emotional intensity
2. **Transition Logic**: Use dissolves for emotional scenes, cuts for action
3. **Audio Sync**: Align cuts with sound beats for maximum impact
4. **Visual Flow**: Maintain consistent screen direction and energy
5. **Quality First**: Always check for sync issues before export

**🔧 Advanced Editing Techniques:**
- Choose editing styles based on content (cinematic, dynamic, smooth)
- Export timeline for professional software integration
- Use chapter markers for easy navigation
- Combine with SonicCrafter audio plans for perfect sync

**💡 Example Workflow:**
1. Run EditForge with your preferred style
2. Review generated timeline and transitions
3. Adjust pacing for emotional impact
4. Sync with SonicCrafter audio elements
5. Export final video with professional settings
        `
      },
      'viral_marketing': {
        title: '🚀 How to Master Viral Marketing with ViralForge',
        content: `
**🎯 Viral Marketing Strategies:**

1. **Platform Optimization**: Tailor content for each platform's algorithm
2. **Hook First**: Grab attention in the first 3 seconds
3. **Emotional Connection**: Choose strategy based on content (educational, entertaining, emotional)
4. **Hashtag Strategy**: Use trending + branded hashtags strategically
5. **Posting Timing**: Schedule for peak engagement hours

**🔧 Advanced Marketing Techniques:**
- Analyze viral potential before creating campaigns
- A/B test different thumbnails and hooks
- Track performance metrics across platforms
- Optimize based on audience engagement patterns

**💡 Example Workflow:**
1. Run ViralForge with your chosen strategy
2. Review generated thumbnails and descriptions
3. Customize posts for your brand voice
4. Schedule posting at optimal times
5. Monitor and adjust based on performance
        `
      },
      'character_design': {
        title: '👤 How to Master Character Design',
        content: `
**🎯 Character Creation Best Practices:**

1. **Depth Over Detail**: Focus on motivations and conflicts, not just appearance
2. **Consistency**: Ensure traits align with background and personality
3. **Complexity**: Add layers - strengths, flaws, secrets, growth potential
4. **Relationships**: Define how characters interact with each other
5. **Visual Clarity**: Make descriptions vivid but not overly restrictive

**🔧 Advanced Character Techniques:**
- Use archetypes as starting points, then customize
- Create character arcs that drive the story
- Ensure diversity in personality types
- Link character traits to plot requirements

**💡 Pro Tip**: Characters should be compelling enough to carry the story alone!
        `
      },
      'dialogue_writing': {
        title: '💬 How to Master Dialogue Writing',
        content: `
**🎯 Dialogue Excellence Principles:**

1. **Purpose-Driven**: Every line should advance plot, character, or theme
2. **Voice Consistency**: Characters should sound distinct and authentic
3. **Subtext Layer**: Include unspoken meaning beneath surface words
4. **Natural Rhythm**: Dialogue should flow like real conversation
5. **Conflict Creation**: Use dialogue to create and resolve tension

**🔧 Advanced Dialogue Techniques:**
- Vary sentence length for natural speech patterns
- Use interruptions and overlaps for realism
- Include character-specific verbal tics
- Balance exposition with natural character expression

**💡 Pro Tip**: Good dialogue should be interesting to read and act out!
        `
      },
      'world_building': {
        title: '🌍 How to Master World Building',
        content: `
**🎯 World Building Fundamentals:**

1. **Rules First**: Establish clear rules that govern your world
2. **Cultural Depth**: Develop societies, customs, and belief systems
3. **Logical Consistency**: Ensure all elements work together coherently
4. **Sensory Details**: Make the world vivid through all senses
5. **Relevance**: Only build what's needed for your story

**🔧 Advanced World Building:**
- Create interconnected systems (magic, technology, society)
- Develop history that explains current events
- Include diverse cultures and perspectives
- Ensure world rules enhance rather than constrain your story

**💡 Pro Tip**: A well-built world feels lived-in and believable!
        `
      },
      'cinematography': {
        title: '🎥 How to Master Cinematography Planning',
        content: `
**🎯 Shot Planning Principles:**

1. **Visual Storytelling**: Each shot should convey emotion and information
2. **Composition Rules**: Use rule of thirds, leading lines, balance
3. **Camera Movement**: Choose movement that serves the story
4. **Lighting Logic**: Ensure lighting matches mood and time of day
5. **Continuity**: Maintain spatial and temporal consistency

**🔧 Advanced Cinematography:**
- Master shot types and their emotional impact
- Use camera angles to convey power dynamics
- Plan for smooth actor movement and blocking
- Consider post-production needs in planning

**💡 Pro Tip**: Every shot choice should serve your story's emotional journey!
        `
      },
      'visual_references': {
        title: '🖼️ How to Master Visual Reference Creation',
        content: `
**🎯 Visual Reference Best Practices:**

1. **Clarity**: References should clearly show what's needed
2. **Consistency**: Maintain style consistency across shots
3. **Detail Level**: Provide enough detail without over-constraining
4. **Composition**: Use strong visual composition principles
5. **Lighting**: Show appropriate lighting for mood and time

**🔧 Advanced Visual Techniques:**
- Use references to explore different creative directions
- Combine multiple references for complex scenes
- Consider camera angles and focal lengths
- Plan for post-production visual effects

**💡 Pro Tip**: Good references inspire creativity while providing clear guidance!
        `
      }
    };

    const guide = guides[topic as keyof typeof guides];
    if (guide) {
      addAssistantMessage(`📚 **${guide.title}**\n\n${guide.content}`);
    }
  };

  const addAssistantMessage = (content: string, suggestions?: AssistantSuggestion[]) => {
    const message: AssistantMessage = {
      id: `assistant-${Date.now()}`,
      type: 'assistant',
      content,
      timestamp: new Date(),
      suggestions
    };

    setMessages(prev => [...prev, message]);
  };

  const generateGenericResponse = (message: string) => {
    const suggestions: AssistantSuggestion[] = [
      {
        type: 'analysis',
        title: 'Analyze Project',
        description: 'Get comprehensive analysis',
        action: () => handleQuickAction('analyze'),
        priority: 'high'
      },
      {
        type: 'wizard',
        title: 'Ghost Tracker',
        description: 'AI project advisor',
        action: () => handleWizardLaunch('ghost-tracker-wizard'),
        wizardId: 'ghost-tracker-wizard',
        priority: 'high'
      }
    ];

    return {
      content: `I understand you asked about "${message}". I can help you with:\n\n• Project analysis and advice\n• Running specific wizards\n• Answering questions about your storyboard\n\nWhat would you like me to help you with?`,
      suggestions
    };
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(txt|md|story|novel|doc|docx)$/i)) {
      addAssistantMessage(`❌ Unsupported file type. Please upload a text file (.txt, .md, .story, .novel, .doc, .docx)`);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addAssistantMessage(`❌ File too large. Maximum size is 10MB.`);
      return;
    }

    setIsProcessingFile(true);

    // Add user message indicating file upload
    const fileMessage: AssistantMessage = {
      id: `user-file-${Date.now()}`,
      type: 'user',
      content: `📄 Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, fileMessage]);

    try {
      // Process the file with Roger wizard
      await processFileWithRoger(file);
    } catch (error) {
      addAssistantMessage(`❌ Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessingFile(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const processFileWithRoger = async (file: File) => {
    addAssistantMessage(`🤖 Processing "${file.name}" with Roger Data Extractor...\n\n⏳ Analyzing text content and extracting project data...`);

    try {
      const wizardService = new WizardService();

      // For file processing, we need to save the file temporarily or pass it through Electron
      // For now, we'll simulate the Roger wizard launch with file path
      // In a real implementation, the file would be saved temporarily and processed

      const result = await wizardService.launchWizard('roger-wizard', projectPath || undefined, {
        file: (file as any).path || file.name, // Use file.path if available (Electron), otherwise filename
        format: 'summary'
      });

      if (result.success) {
        // Parse the result to extract meaningful information
        let response = `✅ File processed successfully!\n\n`;
        response += `📄 Roger has extracted data from "${file.name}" and updated your project:\n\n`;

        // Try to extract key information from the result output
        if (result.output) {
          // Look for extracted counts in the output
          const charMatch = result.output.match(/(\d+)\s*characters?/i);
          const locMatch = result.output.match(/(\d+)\s*locations?/i);
          const worldMatch = result.output.match(/(\d+)\s*world elements?/i);

          if (charMatch || locMatch || worldMatch) {
            response += `📊 Extraction Results:\n`;
            if (charMatch) response += `   👥 ${charMatch[1]} characters extracted\n`;
            if (locMatch) response += `   🏰 ${locMatch[1]} locations extracted\n`;
            if (worldMatch) response += `   🌍 ${worldMatch[1]} world elements extracted\n`;
            response += `\n`;
          }
        }

        response += `💾 Files Updated:\n`;
        response += `   • character_definitions.json - Character data\n`;
        response += `   • world_building.json - World and location data\n`;
        response += `   • roger_extraction_report.json - Complete report\n\n`;

        response += `🎯 Your project now has structured data extracted from the text file!\n`;
        response += `You can now run other wizards using this foundation.`;

        const suggestions: AssistantSuggestion[] = [
          {
            type: 'wizard',
            title: 'Run Character Wizard',
            description: 'Review and enhance extracted characters',
            action: () => handleWizardLaunch('character-creation'),
            wizardId: 'character-creation',
            priority: 'high'
          },
          {
            type: 'wizard',
            title: 'World Builder',
            description: 'Develop the extracted world elements',
            action: () => handleWizardLaunch('world-building'),
            wizardId: 'world-building',
            priority: 'high'
          },
          {
            type: 'wizard',
            title: 'Ghost Tracker',
            description: 'Analyze the completed project',
            action: () => handleWizardLaunch('ghost-tracker-wizard'),
            wizardId: 'ghost-tracker-wizard',
            priority: 'medium'
          }
        ];

        addAssistantMessage(response, suggestions);

        // Refresh project data
        setTimeout(() => {
          window.location.reload();
        }, 2000);

      } else {
        addAssistantMessage(`❌ Roger extraction failed: ${result.error || result.message}\n\nPlease check that the file contains valid text content.`);
      }

    } catch (error) {
      addAssistantMessage(`❌ Error during file processing: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease ensure the file is accessible and contains readable text.`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="storycore-assistant">
      <div className="assistant-header">
        <div className="assistant-icon">🤖</div>
        <div className="assistant-info">
          <h3>StoryCore Assistant</h3>
          <p>AI-powered project advisor</p>
        </div>
        {isAnalyzing && (
          <div className="analyzing-indicator">
            <div className="spinner"></div>
            <span>Analyzing...</span>
          </div>
        )}
      </div>

      <div className="assistant-messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              {message.content.split('\n').map((line, i) => (
                <div key={i}>{line || '\u00A0'}</div>
              ))}
            </div>

            {message.suggestions && message.suggestions.length > 0 && (
              <div className="message-suggestions">
                {message.suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className={`suggestion-button ${suggestion.priority}`}
                    onClick={suggestion.action}
                    title={suggestion.description}
                  >
                    {suggestion.title}
                  </button>
                ))}
              </div>
            )}

            <div className="message-timestamp">
              {message.timestamp.toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Chatterbox Integration */}
      <div className="chatterbox-integration">
        <LandingChatBox
          placeholder="Ask for modifications, ask questions about your project..."
          height={300}
        />
      </div>

      <div className="assistant-input">
        <div className="input-with-upload">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about your project, or upload a text file to extract data..."
            rows={2}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.story,.novel,.doc,.docx"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            title="Upload text file for Roger extraction"
            aria-label="Upload text file for Roger extraction"
          />
          <button
            className="upload-button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload text file for Roger extraction"
            aria-label="Upload text file for Roger extraction"
          >
            📄
          </button>
        </div>
        <button
          className="send-button"
          onClick={handleSendMessage}
          disabled={!inputValue.trim() && !isProcessingFile}
        >
          {isProcessingFile ? 'Processing...' : 'Send'}
        </button>
      </div>

      {/* Project Analysis Summary */}
      {projectAnalysis && (
        <div className="analysis-summary">
          <div className="analysis-score">
            <span className="score-label">Project Score</span>
            <span className="score-value">{projectAnalysis.score}/10</span>
          </div>

          {projectAnalysis.issues.length > 0 && (
            <div className="analysis-issues">
              <span className="issues-count">{projectAnalysis.issues.length} issues</span>
            </div>
          )}

          {projectAnalysis.suggestedWizards.length > 0 && (
            <div className="suggested-wizards">
              <span className="suggestions-label">Suggested wizards:</span>
              <div className="wizard-tags">
                {projectAnalysis.suggestedWizards.map(wizardId => {
                  const wizard = WIZARD_DEFINITIONS.find(w => w.id === wizardId);
                  return (
                    <button
                      key={wizardId}
                      className="wizard-tag"
                      onClick={() => handleWizardLaunch(wizardId)}
                      title={wizard?.description}
                    >
                      {wizard?.icon} {wizard?.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

