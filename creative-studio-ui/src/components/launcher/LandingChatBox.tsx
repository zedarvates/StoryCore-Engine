import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Sparkles, MessageSquare, AlertCircle, Download, Settings, Lightbulb, Globe, Users, Film, MessageSquare as MessageIcon, FileText, Wand2, Music, Zap, List, RotateCcw, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import { StatusIndicator, ConnectionStatus } from './StatusIndicator';
import { LanguageSelector } from './LanguageSelector';
import { TypingIndicator } from './TypingIndicator';
import { type LLMConfig, type LLMRequest, type ErrorRecoveryOptions, LLMError } from '@/services/llmService';
import { useLLMConfig } from '@/services/llmConfigService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { getWelcomeMessage } from '@/utils/chatboxTranslations';
import { InlineLLMError } from '@/components/wizard/LLMErrorDisplay';
import { getInitialLanguagePreference } from '@/utils/languageDetection';
import { type World } from '@/types/world';
import { type Story } from '@/types/story';
import { useAppStore } from '@/stores/useAppStore'; // NEW: Use global store for LLM settings
import {
  type LanguageCode,
  saveLanguagePreference,
} from '@/utils/llmConfigStorage';
import {
  autoMigrate,
  getMigrationNotification,
  clearMigrationNotification,
  getMigratedChatHistory,
  clearMigratedChatHistory
} from '@/utils/ollamaMigration';
import { formAutoFill } from '@/services/FormAutoFill';
import { promptSuggestionService, type PromptSuggestion } from '@/services/PromptSuggestionService';
import { contentCreationService, type ContentType, type ContentDetectionResult, type CreationResult } from '@/services/ContentCreationService';
import { createChatService, ChatService, type ChatAction, type ProjectCreationRequest } from '@/services/chatService';
import { useStore } from '@/store';
import { createEmptyCharacter, type Character } from '@/types/character';
import { eventEmitter, WizardEventType, createCharacterCreatedPayload } from '@/services/eventEmitter';
import { createEmptyLocation, type Location } from '@/types/location';
import { useLocationStore } from '@/stores/locationStore';
import { createEmptyObject, type StoryObject } from '@/types/object';


// ============================================================================
// Constants
// ============================================================================

const MESSAGE_HISTORY_LIMIT = 100; // Maximum number of messages to keep in history
const CONFIG_DEBOUNCE_DELAY = 500; // Debounce delay for configuration changes in milliseconds

// ============================================================================
// Types
// ============================================================================

interface CreationActionButton {
  id: string;
  label: string;
  icon: string;
  type: ContentType;
  data: Record<string, unknown>;
}

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
  isStreaming?: boolean;
  streamComplete?: boolean;
  error?: ErrorRecoveryOptions;
  creationButtons?: CreationActionButton[];
  creationResult?: CreationResult;
}

interface LandingChatBoxProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  placeholder?: string;
  height?: number;
  onLaunchWizard?: (wizardType: string) => void;
  context?: 'landing' | 'project'; // NEW: Context to adapt suggestions
}

// ============================================================================
// Landing Chat Box Component
// ============================================================================

export function LandingChatBox({
  onSendMessage,
  placeholder = "Décrivez votre projet ou posez une question...",
  height,
  context, // Will be undefined if not provided
}: LandingChatBoxProps) {
  // Use unified LLM configuration service
  const { config: llmConfig, service: llmService, isConfigured } = useLLMConfig();

  // Use global store to open LLM settings modal and check if project is loaded
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);
  const project = useAppStore((state) => state.project);

  // Auto-detect context if not provided: 'landing' if no project, 'project' if project loaded
  const effectiveContext = context || (project ? 'project' : 'landing');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [providerName, setProviderName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => getInitialLanguagePreference() as LanguageCode);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamRequestId, setCurrentStreamRequestId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<PromptSuggestion[]>([]);
  const [promptRepetitionEnabled, setPromptRepetitionEnabled] = useState(false);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingType, setCreatingType] = useState<ContentType | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatServiceRef = useRef(createChatService({
    project: null,
    shots: [],
    assets: [],
    selectedShotId: null
  }));

  // Update chat service context when store data changes
  useEffect(() => {
    chatServiceRef.current.updateContext({
      project,
      shots: [], // Would get from shots store if available
      assets: [], // Would get from assets store if available
    });
  }, [project]);

  // Helper function to add messages with history limit
  const addMessage = useCallback((newMessage: Message | Message[]) => {
    setMessages(prev => {
      const updatedMessages = Array.isArray(newMessage)
        ? [...prev, ...newMessage]
        : [...prev, newMessage];

      // Limit message history to prevent memory issues
      if (updatedMessages.length > MESSAGE_HISTORY_LIMIT) {
        // Keep the first message (welcome message) and the most recent messages
        return [
          updatedMessages[0],
          ...updatedMessages.slice(-(MESSAGE_HISTORY_LIMIT - 1))
        ];
      }

      return updatedMessages;
    });
  }, []);

  // Initialize welcome message based on current language
  useEffect(() => {
    // Only set welcome message if messages array is empty
    if (messages.length === 0) {
      const welcomeMessage: Message = {
        id: '1',
        type: 'assistant',
        content: getWelcomeMessage(currentLanguage),
        timestamp: new Date(),
      };
      setMessages([welcomeMessage]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Intentionally run only on mount - welcome message should be set once
  }, []);

  // Check for Ollama migration on mount (for backward compatibility)
  useEffect(() => {
    async function checkOllamaMigration() {
      // Perform automatic Ollama migration if needed
      const migrationResult = await autoMigrate();

      if (migrationResult && migrationResult.success) {
        ;

        // Show migration notification
        if (migrationResult.notification) {
          const systemMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: migrationResult.notification,
            timestamp: new Date(),
          };
          addMessage(systemMessage);
        }

        // Restore migrated chat history if available
        if (migrationResult.historyMigrated && migrationResult.messagesCount > 0) {
          const migratedHistory = getMigratedChatHistory();
          if (migratedHistory.length > 0) {
            const restoredMessages: Message[] = migratedHistory.map(msg => ({
              id: msg.id,
              type: msg.type as 'user' | 'assistant' | 'system',
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              attachments: msg.attachments,
            }));

            addMessage(restoredMessages);

            // Clear migrated history after restoration
            clearMigratedChatHistory();
          }
        }
      }

      // Check for pending migration notification
      const notification = getMigrationNotification();
      if (notification) {
        const systemMessage: Message = {
          id: Date.now().toString(),
          type: 'system',
          content: notification,
          timestamp: new Date(),
        };
        addMessage(systemMessage);
        clearMigrationNotification();
      }

      // Check Ollama availability for warning banner
      const ollamaAvailable = await checkOllamaStatus();
      setIsOllamaAvailable(ollamaAvailable);
    }

    checkOllamaMigration();
  }, [addMessage]);

  // Update connection status based on LLM configuration
  useEffect(() => {
    if (llmConfig && llmService) {
      setProviderName(llmConfig.provider);
      setModelName(llmConfig.model);
      setConnectionStatus('online');
      setIsFallbackMode(false);
    } else {
      setConnectionStatus('fallback');
      setIsFallbackMode(true);
    }
  }, [llmConfig, llmService]);

  // Cleanup streaming connections on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing streaming requests
      if (llmService && currentStreamRequestId) {
        llmService.cancelRequest(currentStreamRequestId);
      }
    };
  }, [llmService, currentStreamRequestId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  // Génère des suggestions dynamiques basées sur la conversation
  const updateDynamicSuggestions = useCallback(() => {
    // Si on est sur la landing page (pas de projet), afficher des suggestions spécifiques
    if (effectiveContext === 'landing' && messages.length <= 1) {
      const landingSuggestions: PromptSuggestion[] = [
        {
          id: 'landing-new-project',
          text: currentLanguage === 'fr' ? '🆕 Créer un nouveau projet' : '🆕 Create a new project',
          category: 'expansion',
          relevance: 1.0,
          icon: '🆕',
          language: currentLanguage
        },
        {
          id: 'landing-open-project',
          text: currentLanguage === 'fr' ? '📂 Ouvrir un projet existant' : '📂 Open an existing project',
          category: 'expansion',
          relevance: 0.95,
          icon: '📂',
          language: currentLanguage
        },
        {
          id: 'landing-resume-project',
          text: currentLanguage === 'fr' ? '🔄 Reprendre le dernier projet' : '🔄 Resume last project',
          category: 'expansion',
          relevance: 0.9,
          icon: '🔄',
          language: currentLanguage
        },
        {
          id: 'landing-recent-projects',
          text: currentLanguage === 'fr' ? '📋 Voir mes projets récents' : '📋 View recent projects',
          category: 'expansion',
          relevance: 0.85,
          icon: '📋',
          language: currentLanguage
        },
        {
          id: 'landing-help',
          text: currentLanguage === 'fr' ? '❓ Comment utiliser StoryCore?' : '❓ How to use StoryCore?',
          category: 'clarification',
          relevance: 0.8,
          icon: '❓',
          language: currentLanguage
        }
      ];
      setDynamicSuggestions(landingSuggestions);
      return;
    }

    if (inputValue.trim().length > 0) {
      const suggestions = promptSuggestionService.generateSuggestions(
        messages,
        currentLanguage,
        inputValue
      );
      setDynamicSuggestions(suggestions);
    } else if (messages.length > 1) {
      // Suggestions basées sur la conversation si pas de texte en cours
      const suggestions = promptSuggestionService.generateSuggestions(
        messages,
        currentLanguage,
        ''
      );
      setDynamicSuggestions(suggestions.slice(0, 4)); // Limite à 4 suggestions
    } else {
      // Suggestions par défaut au démarrage
      const defaultSuggestions = promptSuggestionService.getDefaultSuggestions(currentLanguage);
      setDynamicSuggestions(defaultSuggestions);
    }
  }, [messages, currentLanguage, inputValue, effectiveContext]);

  // Met à jour les suggestions quand le texte change ou la langue change
  useEffect(() => {
    updateDynamicSuggestions();
  }, [updateDynamicSuggestions]);

  // Fonction pour utiliser le texte de l'utilisateur comme base pour les suggestions et rafraîchir les prompts
  const handleUseUserTextAsPrompt = () => {
    // Rafraîchir les suggestions avec de nouvelles idées basées sur le texte actuel
    if (inputValue.trim()) {
      const enhancedSuggestions = promptSuggestionService.generateInputBasedSuggestions(
        inputValue,
        {
          language: currentLanguage,
          lastUserMessage: inputValue,
          lastAssistantMessage: messages[messages.length - 1]?.content || '',
          messageCount: messages.length,
          hasProjectContext: false,
          recentTopics: [],
          conversationTone: 'professional',
          userIntent: 'create'
        }
      );
      setDynamicSuggestions(enhancedSuggestions);
    } else {
      // Si pas de texte, rafraîchir avec de nouvelles suggestions générales
      const refreshedSuggestions = promptSuggestionService.getRefreshedSuggestions(currentLanguage);
      setDynamicSuggestions(refreshedSuggestions);
    }

    // Forcer le rafraîchissement des suggestions en les masquant brièvement puis réaffichant
    setShowSuggestions(false);
    setTimeout(() => setShowSuggestions(true), 100);
  };

  // Fonction pour réviser le prompt : contexte en premier, question après
  const handleRevisePrompt = () => {
    if (!inputValue.trim()) return;

    // Analyser le texte pour séparer contexte et question
    const text = inputValue.trim();
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    if (sentences.length <= 1) {
      // Si une seule phrase, on ne peut pas séparer
      return;
    }

    // Dernière phrase = question, le reste = contexte
    const question = sentences[sentences.length - 1].trim() + (text.includes('?') ? '?' : '.');
    const context = sentences.slice(0, -1).join('. ').trim();

    if (context && question) {
      // Restructurer : contexte d'abord, puis question
      const revisedPrompt = `${context}.\n\n${question}`;
      setInputValue(revisedPrompt);
    }
  };

  // Fonction pour optimiser le prompt selon le modèle actuel
  const handleOptimizeForModel = () => {
    const text = inputValue.trim();
    const modelName = llmConfig?.model || 'unknown';

    // Si pas de texte, utiliser un exemple par défaut
    const defaultText = currentLanguage === 'fr'
      ? "Décrivez-moi un personnage principal pour une histoire de science-fiction."
      : "Describe a main character for a science fiction story.";

    const promptText = text || defaultText;
    let optimizedPrompt = promptText;

    // Optimisations spécifiques selon le modèle
    if (modelName.toLowerCase().includes('gpt')) {
      // GPT models préfèrent des instructions claires et structurées
      optimizedPrompt = currentLanguage === 'fr'
        ? `Veuillez analyser et répondre de manière détaillée à la demande suivante :\n\n${promptText}\n\nFournissez une réponse complète et bien structurée.`
        : `Please analyze and respond in detail to the following request:\n\n${promptText}\n\nProvide a complete and well-structured response.`;
    } else if (modelName.toLowerCase().includes('claude')) {
      // Claude aime les contextes riches
      const context = messages.slice(-2).map(m => m.content).join(' ').substring(0, 200);
      const contextText = context || (currentLanguage === 'fr' ? 'Création de contenu créatif' : 'Creative content creation');
      optimizedPrompt = currentLanguage === 'fr'
        ? `Contexte : ${contextText}\n\nDemande : ${promptText}\n\nRépondez de manière helpful et précise.`
        : `Context: ${contextText}\n\nRequest: ${promptText}\n\nRespond helpfully and precisely.`;
    } else if (modelName.toLowerCase().includes('llama') || modelName.toLowerCase().includes('mistral')) {
      // Modèles open-source préfèrent la concision
      optimizedPrompt = promptText.length > 200 ? promptText.substring(0, 200) + '...' : promptText;
    } else {
      // Optimisation générique
      optimizedPrompt = currentLanguage === 'fr'
        ? `${promptText}\n\nVeuillez fournir une réponse détaillée et utile.`
        : `${promptText}\n\nPlease provide a detailed and helpful response.`;
    }

    setInputValue(optimizedPrompt);
  };

  // Fonction pour ajouter des instructions système
  const handleAddSystemInstructions = () => {
    const text = inputValue.trim();
    const defaultText = currentLanguage === 'fr'
      ? "Expliquez-moi comment créer un personnage mémorable."
      : "Explain how to create a memorable character.";

    const promptText = text || defaultText;

    const systemInstructions = currentLanguage === 'fr'
      ? "Instructions système :\n- Soyez précis et concis\n- Fournissez des exemples concrets\n- Structurez votre réponse clairement\n- Utilisez un langage professionnel\n\n"
      : "System instructions:\n- Be precise and concise\n- Provide concrete examples\n- Structure your response clearly\n- Use professional language\n\n";

    const enhancedPrompt = `${systemInstructions}${promptText}`;
    setInputValue(enhancedPrompt);
  };

  // Fonction pour nettoyer et réduire le prompt
  const handleCleanPrompt = () => {
    const text = inputValue.trim();
    const defaultText = currentLanguage === 'fr'
      ? "Je veux créer une histoire fantastique avec des dragons et des magiciens. Les dragons sont très importants dans cette histoire car ils représentent la puissance et la sagesse ancienne. Les magiciens contrôlent les dragons avec leur magie."
      : "I want to create a fantasy story with dragons and wizards. Dragons are very important in this story because they represent power and ancient wisdom. Wizards control dragons with their magic.";

    const promptText = text || defaultText;

    let cleanedPrompt = promptText;

    // Supprimer les répétitions
    const sentences = cleanedPrompt.split(/[.!?]+/).filter(s => s.trim().length > 3);
    const uniqueSentences = [...new Set(sentences.map(s => s.trim()))];
    cleanedPrompt = uniqueSentences.join('. ');

    // Réduire la longueur si nécessaire
    if (cleanedPrompt.length > 300) {
      cleanedPrompt = cleanedPrompt.substring(0, 300) + '...';
    }

    // Nettoyer les espaces multiples
    cleanedPrompt = cleanedPrompt.replace(/\s+/g, ' ').trim();

    setInputValue(cleanedPrompt);
  };

  // Helper function to create error message with recovery options (Requirements 7.1-7.8)
  const createErrorMessage = (error: Error | LLMError, userInput: string): Message => {
    const llmError = error instanceof LLMError ? error : new LLMError(
      error.message,
      'unknown',
      false
    );

    // Log error to console for debugging (Requirement 7.8)
    console.error('LLM Error:', {
      category: llmError.category,
      code: llmError.code,
      message: llmError.message,
      userMessage: llmError.getUserMessage(),
      retryable: llmError.retryable,
      details: llmError.details,
      timestamp: new Date().toISOString(),
    });

    // Create recovery options with action handlers (Requirements 7.5, 7.6, 7.7)
    const recoveryOptions: ErrorRecoveryOptions = {
      message: llmError.message,
      userMessage: llmError.getUserMessage(),
      category: llmError.category,
      retryable: llmError.retryable,
      actions: [
        // Retry action (Requirement 7.6)
        ...(llmError.retryable ? [{
          label: 'Retry',
          action: async () => {
            // Resend the last message (Requirement 7.6)
            await handleRetryMessage(userInput);
          },
          primary: true,
        }] : []),
        // Configure action (Requirement 7.7)
        {
          label: 'Configure',
          action: () => {
            setShowLLMSettings(true);
          },
          primary: !llmError.retryable,
        },
        // Cancel action (Requirement 7.7)
        {
          label: 'Cancel',
          action: () => {
            // Remove the error message
            setMessages(prev => prev.filter(msg => msg.type !== 'error'));
          },
          primary: false,
        },
      ],
    };

    return {
      id: Date.now().toString(),
      type: 'error',
      content: llmError.getUserMessage(),
      timestamp: new Date(),
      error: recoveryOptions,
    };
  };

  // Helper function to retry a failed message (Requirement 7.6)
  const handleRetryMessage = useCallback(async (userInput: string) => {
    // Remove error messages
    setMessages(prev => prev.filter(msg => msg.type !== 'error'));

    // Resend the message with the same input
    if (!llmService) {
      // Fall back to pre-configured response
      setTimeout(() => {
        const fallbackResponse = generateAssistantResponse(userInput.toLowerCase());
        const fallbackMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: fallbackResponse,
          timestamp: new Date(),
        };
        addMessage(fallbackMessage);
      }, 500);
      return;
    }

    try {
      // Build language-aware system prompt
      const systemPrompt = buildSystemPrompt(currentLanguage);

      // Create LLM request
      const request: LLMRequest = {
        prompt: userInput,
        systemPrompt,
        stream: llmConfig.streamingEnabled,
      };

      // Generate unique request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentStreamRequestId(requestId);

      // Route request to LLM provider
      if (llmConfig.streamingEnabled) {
        setIsStreaming(true);

        const streamingMessageId = Date.now().toString();
        setStreamingMessageId(streamingMessageId);

        const streamingMessage: Message = {
          id: streamingMessageId,
          type: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
          streamComplete: false,
        };
        addMessage(streamingMessage);

        const response = await llmService.generateStreamingCompletion(
          request,
          (chunk: string) => {
            setMessages(prev => prev.map(msg =>
              msg.id === streamingMessageId
                ? { ...msg, content: msg.content + chunk }
                : msg
            ));
          },
          requestId
        );

        setIsStreaming(false);
        setStreamingMessageId(null);
        setCurrentStreamRequestId(null);

        if (response.success && response.data) {
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? {
                ...msg,
                isStreaming: false,
                streamComplete: true,
                timestamp: new Date()
              }
              : msg
          ));
        } else {
          throw new LLMError(response.error || 'Stream failed', response.code || 'stream_error', true);
        }
      } else {
        const response = await llmService.generateCompletion(request, requestId);
        setCurrentStreamRequestId(null);

        if (response.success && response.data) {
          const assistantMessage: Message = {
            id: Date.now().toString(),
            type: 'assistant',
            content: response.data.content,
            timestamp: new Date(),
            streamComplete: true,
          };
          addMessage(assistantMessage);
        } else {
          throw new LLMError(response.error || 'Request failed', response.code || 'request_error', true);
        }
      }
    } catch (error) {
      // Create error message with recovery options
      const errorMessage = createErrorMessage(error as Error, userInput);
      addMessage(errorMessage);
    }
  }, [llmService, llmConfig, currentLanguage, addMessage]);

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // Cancel any ongoing stream before sending new message (Requirement 8.5)
    if (isStreaming && currentStreamRequestId && llmService) {
      const cancelled = llmService.cancelRequest(currentStreamRequestId);
      if (cancelled) {
        ;

        // Mark the streaming message as interrupted
        if (streamingMessageId) {
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? {
                ...msg,
                content: msg.content + '\n\n⚠️ Stream interrupted by new message',
                isStreaming: false,
                streamComplete: false
              }
              : msg
          ));
        }

        // Clean up streaming state
        setIsStreaming(false);
        setStreamingMessageId(null);
        setCurrentStreamRequestId(null);
      }
    }

    // Validate API key before sending (Requirement 3.7)
    // Check if llmConfig is loaded
    if (!llmConfig) {
      // Configuration not loaded - prompt user to configure
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'error',
        content: '⚠️ LLM configuration not found. Please configure your LLM settings to use the AI assistant.',
        timestamp: new Date(),
        error: {
          message: 'Configuration required',
          userMessage: 'Please configure your LLM settings in Settings → LLM Configuration.',
          category: 'invalid_request',
          retryable: false,
          actions: [
            {
              label: 'Configure Now',
              action: () => setShowLLMSettings(true),
              primary: true,
            },
            {
              label: 'Cancel',
              action: () => setMessages(prev => prev.filter(msg => msg.type !== 'error')),
              primary: false,
            },
          ],
        },
      };
      addMessage(errorMessage);
      setShowLLMSettings(true);
      return;
    }

    const requiresApiKey = llmConfig.provider === 'openai' || llmConfig.provider === 'anthropic';
    if (requiresApiKey && !llmConfig.apiKey) {
      // Show error message and prompt to configure
      const errorMessage: Message = {
        id: Date.now().toString(),
        type: 'error',
        content: '⚠️ API key required. Please configure your LLM settings to use the AI assistant.',
        timestamp: new Date(),
        error: {
          message: 'API key required',
          userMessage: 'Authentication failed. Please check your API key in settings.',
          category: 'authentication' as const,
          retryable: false,
          actions: [
            {
              label: 'Configure',
              action: () => setShowLLMSettings(true),
              primary: true,
            },
            {
              label: 'Cancel',
              action: () => setMessages(prev => prev.filter(msg => msg.type !== 'error')),
              primary: false,
            },
          ],
        },
      };
      addMessage(errorMessage);
      setShowLLMSettings(true);
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachments.map(f => f.name),
    };

    addMessage(newMessage);

    // Call external handler if provided
    if (onSendMessage) {
      onSendMessage(inputValue, attachments);
    }

    // Reset input immediately for better UX
    const userInput = inputValue;
    setInputValue('');
    setAttachments([]);

    // Store last user message for retry functionality (Requirement 7.6)
    setLastUserMessage(userInput);

    // Convert attachments to base64 for ChatService
    const chatAttachments = await Promise.all(attachments.map(async (file) => {
      return new Promise<{ name: string, content: string, type: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 part
          const base64 = result.split(',')[1];
          resolve({
            name: file.name,
            content: base64,
            type: file.type
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }));

    // Analyze intent using ChatService (media generation, entity creation, etc.)
    // Pass attachments and llmService for vision capabilities
    const chatServiceResponse = await chatServiceRef.current.processMessage(userInput, chatAttachments, llmService);

    // Handle detected actions from ChatService
    if (chatServiceResponse.actions && chatServiceResponse.actions.length > 0) {
      // Check for analyzeImage action (result of vision)
      const analyzeAction = chatServiceResponse.actions.find(a => a.type === 'analyzeImage');
      if (analyzeAction) {
        // The message from ChatService already contains the analysis, so we just add it to history
        const analysisMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: chatServiceResponse.message,
          timestamp: new Date(),
        };
        addMessage(analysisMessage);
        return;
      }

      // Prioritize project creation
      const projectAction = chatServiceResponse.actions.find(a => a.type === 'createProject');

      if (projectAction) {
        const projectPayload = projectAction.payload as unknown as ProjectCreationRequest;

        // Show creation in progress
        const progressId = Date.now().toString();
        addMessage({
          id: progressId,
          type: 'system',
          content: currentLanguage === 'fr'
            ? `🚧 Création du projet "${projectPayload.name}" en cours...`
            : `🚧 Creating project "${projectPayload.name}"...`,
          timestamp: new Date()
        });

        try {
          // Execute creation
          const result = await ChatService.executeProjectCreation(projectPayload);

          // Remove progress message
          setMessages(prev => prev.filter(msg => msg.id !== progressId));

          if (result.success && result.projectPath) {
            // Success message
            addMessage({
              id: Date.now().toString(),
              type: 'system',
              content: currentLanguage === 'fr'
                ? `✅ Projet "${projectPayload.name}" créé avec succès ! Redirection en cours...`
                : `✅ Project "${projectPayload.name}" created successfully! Redirecting...`,
              timestamp: new Date()
            });

            // Redirect after short delay
            setTimeout(() => {
              ChatService.navigateToProjectDashboard(result.projectPath!);
            }, 1500);

            return; // Stop further processing
          } else {
            throw new Error(result.error || 'Project creation failed');
          }
        } catch (error) {
          // Remove progress message if still there
          setMessages(prev => prev.filter(msg => msg.id !== progressId));

          addMessage({
            id: Date.now().toString(),
            type: 'error',
            content: currentLanguage === 'fr'
              ? `❌ Erreur lors de la création du projet : ${error instanceof Error ? error.message : String(error)}`
              : `❌ Error creating project: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date()
          });
          return;
        }
      }

      // Handle other actions
      for (const action of chatServiceResponse.actions) {
        const actionType = action.type;
        const payload = action.payload as Record<string, unknown>;

        if (actionType === 'createProject') continue; // Already handled

        if (actionType === 'generateImage') {
          handleCreation('image', payload, chatServiceResponse.message);
        } else if (actionType === 'generateAudio') {
          handleCreation('audio', payload, chatServiceResponse.message);
        } else if (actionType === 'generateVideo') {
          handleCreation('video', payload, chatServiceResponse.message);
        } else if (actionType.startsWith('create')) {
          // Map action types like 'createCharacter' to 'character' ContentType
          const rawType = actionType.replace('create', '');
          const contentType = (rawType.charAt(0).toLowerCase() + rawType.slice(1)) as ContentType;
          handleCreation(contentType, payload, chatServiceResponse.message);
        }
      }

      // If ChatService provided a specific message and we handled actions,
      // we can skip the general LLM call to avoid redundant responses
      if (chatServiceResponse.message) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: chatServiceResponse.message,
          timestamp: new Date(),
          streamComplete: true,
        };
        addMessage(assistantMessage);
        return;
      }
    }

    // Generate response using LLM service or fallback (Requirement 3.1)
    if (llmService) {
      try {
        // Build language-aware system prompt (Requirement 3.4)
        const systemPrompt = buildSystemPrompt(currentLanguage);

        // Create LLM request
        const request: LLMRequest = {
          prompt: userInput,
          systemPrompt,
          stream: llmConfig?.streamingEnabled ?? true,
        };

        // Generate unique request ID for cancellation support
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentStreamRequestId(requestId);

        // Route request to LLM provider via LLMService (Requirement 3.1)
        if (llmConfig?.streamingEnabled ?? true) {
          // Streaming mode (Requirements 8.1, 8.3)
          setIsStreaming(true);

          // Create placeholder message for streaming
          const streamingMessageId = (Date.now() + 1).toString();
          setStreamingMessageId(streamingMessageId);

          const streamingMessage: Message = {
            id: streamingMessageId,
            type: 'assistant',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
            streamComplete: false,
          };
          addMessage(streamingMessage);

          try {
            // Handle streaming chunks (Requirement 8.1)
            const response = await llmService.generateStreamingCompletion(
              request,
              (chunk: string) => {
                // Update message content token-by-token (Requirement 8.1)
                setMessages(prev => prev.map(msg =>
                  msg.id === streamingMessageId
                    ? { ...msg, content: msg.content + chunk }
                    : msg
                ));
              },
              requestId
            );

            // Mark streaming as complete (Requirement 8.4)
            setIsStreaming(false);
            setStreamingMessageId(null);
            setCurrentStreamRequestId(null);

            if (response.success && response.data) {
              // Update message to mark streaming complete and add final timestamp
              setMessages(prev => prev.map(msg =>
                msg.id === streamingMessageId
                  ? {
                    ...msg,
                    isStreaming: false,
                    streamComplete: true,
                    timestamp: new Date() // Update timestamp when complete
                  }
                  : msg
              ));
            } else {
              // Handle streaming error - display error with recovery options (Requirement 8.7)
              setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));

              // Create error message with recovery options
              const error = new LLMError(
                response.error || 'Stream failed',
                response.code || 'stream_error',
                true
              );
              const errorMessage = createErrorMessage(error, userInput);
              addMessage(errorMessage);

              // If connection failed, activate fallback mode (Requirement 10.2)
              if (response.code === 'network' || response.code === 'timeout' || response.code === 'connection') {
                setIsFallbackMode(true);
                setConnectionStatus('fallback');
              }
            }
          } catch (streamError) {
            // Graceful handling of stream interruptions (Requirement 8.6)
            console.error('Stream interrupted or failed:', streamError);

            // Clean up streaming state
            setIsStreaming(false);
            setStreamingMessageId(null);
            setCurrentStreamRequestId(null);

            // Remove incomplete streaming message
            setMessages(prev => prev.filter(msg => msg.id !== streamingMessageId));

            // Create error message with recovery options
            const errorMessage = createErrorMessage(streamError as Error, userInput);
            addMessage(errorMessage);

            // If connection failed, activate fallback mode (Requirement 10.2)
            if (streamError instanceof LLMError &&
              (streamError.category === 'network' || streamError.category === 'timeout')) {
              setIsFallbackMode(true);
              setConnectionStatus('fallback');
            }
          }
        } else {
          // Non-streaming mode (Requirement 8.2)
          const response = await llmService.generateCompletion(request, requestId);
          setCurrentStreamRequestId(null);

          if (response.success && response.data) {
            // Display complete response after generation finishes (Requirement 8.2)
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              type: 'assistant',
              content: response.data.content,
              timestamp: new Date(),
              streamComplete: true,
            };
            addMessage(assistantMessage);
          } else {
            // Handle error - create error message with recovery options
            const error = new LLMError(
              response.error || 'Failed to generate response',
              response.code || 'request_error',
              true
            );
            const errorMessage = createErrorMessage(error, userInput);
            addMessage(errorMessage);

            // If connection failed, activate fallback mode (Requirement 10.2)
            if (response.code === 'network' || response.code === 'timeout' || response.code === 'connection') {
              setIsFallbackMode(true);
              setConnectionStatus('fallback');
            }
          }
        }
      } catch (error) {
        console.error('LLM request failed:', error);

        // Clean up streaming state
        setIsStreaming(false);
        setStreamingMessageId(null);
        setCurrentStreamRequestId(null);

        // Create error message with recovery options
        const errorMessage = createErrorMessage(error as Error, userInput);
        addMessage(errorMessage);

        // If connection failed, activate fallback mode (Requirement 10.2)
        if (error instanceof LLMError &&
          (error.category === 'network' || error.category === 'timeout')) {
          setIsFallbackMode(true);
          setConnectionStatus('fallback');
        }
      }
    } else {
      // No LLM service configured, use fallback (Requirement 3.3, 10.1)
      setIsFallbackMode(true);
      setConnectionStatus('fallback');

      setTimeout(() => {
        const response = generateAssistantResponse(userInput.toLowerCase());
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        addMessage(assistantMessage);
      }, 1000);
    }
  };

  // ============================================================================
  // Content Creation from Chat
  // ============================================================================

  // After each completed assistant message, detect creation intent and add action buttons
  useEffect(() => {
    if (messages.length < 2) return;

    const lastMessage = messages[messages.length - 1];
    const prevMessage = messages.length >= 2 ? messages[messages.length - 2] : null;

    // Only detect intent when an assistant message just completed streaming (or is non-streaming)
    if (
      lastMessage?.type === 'assistant' &&
      !lastMessage.isStreaming &&
      !lastMessage.creationButtons &&
      !lastMessage.creationResult &&
      prevMessage?.type === 'user'
    ) {
      const intent = contentCreationService.detectCreationIntent(
        prevMessage.content,
        lastMessage.content,
        currentLanguage
      );

      if (intent) {
        const buttons = contentCreationService.getCreationButtons(intent, currentLanguage);
        if (buttons.length > 0) {
          // Update the last message to include creation buttons
          setMessages(prev => prev.map(msg =>
            msg.id === lastMessage.id
              ? { ...msg, creationButtons: buttons }
              : msg
          ));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Handle creation action from button click
  const handleCreation = useCallback(async (type: ContentType, data: Record<string, unknown>, contextMessage?: string) => {
    setIsCreating(true);
    setCreatingType(type);

    // Add a system message showing creation in progress
    const progressMessage: Message = {
      id: `creating-${Date.now()}`,
      type: 'system',
      content: currentLanguage === 'fr'
        ? `⏳ Création en cours : ${type}...`
        : `⏳ Creating: ${type}...`,
      timestamp: new Date(),
    };
    addMessage(progressMessage);

    try {
      // Determine world context from current project
      const worldContext = project?.project_name || undefined;

      // Find context message for parsing - prefer explicit contextMessage passed in
      const assistantContent = contextMessage || [...messages].reverse().find(m => m.type === 'assistant' && !m.creationResult)?.content;

      let result;
      if (assistantContent) {
        // Use createFromLLMResponse to extract structured data from the assistant's response
        result = await contentCreationService.createFromLLMResponse(
          assistantContent,
          type,
          data,
          worldContext as string | undefined,
          currentLanguage
        );
      } else {
        // No recent assistant message, create with just the provided data
        result = await contentCreationService.createContent(type, data, worldContext as string | undefined, currentLanguage);
      }

      // Remove progress message
      setMessages(prev => prev.filter(msg => msg.id !== progressMessage.id));

      if (result.success) {

        // Dispatch created entity to the app store
        const mainStore = useStore.getState();

        switch (type) {
          case 'character': {
            try {
              // Add character to store
              const baseCharacter = createEmptyCharacter();

              const entity = result.entity as any;
              const newCharacter: Character = {
                ...baseCharacter,
                character_id: (entity.id as string) || crypto.randomUUID(),
                name: (entity.name as string) || 'Unnamed Character',
                role: {
                  ...baseCharacter.role,
                  archetype: (entity.archetype as string) || baseCharacter.role?.archetype || '',
                  narrative_function: (entity.role as string) || baseCharacter.role?.narrative_function || '',
                },
                visual_identity: {
                  ...baseCharacter.visual_identity,
                  gender: (entity.gender as string) || baseCharacter.visual_identity?.gender || '',
                  age_range: (entity.age as string) || baseCharacter.visual_identity?.age_range || '',
                  generated_portrait: entity.visual_identity?.generated_portrait || entity.imageUrl || '',
                  // Map description to distinctive_features if it exists
                  distinctive_features: entity.description
                    ? [...(baseCharacter.visual_identity?.distinctive_features || []), entity.description as string]
                    : baseCharacter.visual_identity?.distinctive_features || [],
                },
                prompts: (entity.prompts as string[]) || [],
                creation_timestamp: entity.creation_timestamp || entity.createdAt || Date.now(),
                last_modified: entity.last_modified || entity.updatedAt || Date.now(),
                version: '1.0',
              } as Character;

              // Use the main store to add the character
              if (mainStore.addCharacter) {
                mainStore.addCharacter(newCharacter);

                // Also update the project in AppStore to ensure persistence
                const appStore = useAppStore.getState();
                const currentProject = appStore.project;
                if (currentProject) {
                  const projectCharacters = currentProject.characters || [];
                  const characterExistsInProject = projectCharacters.some(
                    c => c.character_id === newCharacter.character_id
                  );

                  if (!characterExistsInProject) {
                    appStore.setProject({
                      ...currentProject,
                      characters: [...projectCharacters, newCharacter]
                    });
                  }
                }

                // Also dispatch event for UI components that listen directly via eventEmitter
                eventEmitter.emit(
                  WizardEventType.CHARACTER_CREATED,
                  createCharacterCreatedPayload(newCharacter, 'api')
                );
              }
            } catch (creationError) {
              console.error('[LandingChatBox] Error mapping created character:', creationError);
            }
            break;
          }
          case 'location': {
            const baseLocation = createEmptyLocation();
            const entity = result.entity as any;
            const loadedMetadata = entity.metadata || {};

            const newLocation: Location = {
              ...baseLocation,
              location_id: entity.id || crypto.randomUUID(),
              name: entity.name || 'Unnamed Location',
              metadata: {
                ...baseLocation.metadata,
                description: loadedMetadata.description || entity.description || '',
                atmosphere: loadedMetadata.atmosphere || entity.atmosphere || '',
                significance: loadedMetadata.significance || entity.significance || '',
                thumbnail_path: loadedMetadata.thumbnail_path,
              },
              prompts: (entity.prompts as string[]) || [],
              creation_timestamp: entity.creation_timestamp || entity.createdAt || Date.now(),
              last_modified: entity.last_modified || entity.updatedAt || Date.now(),
            } as Location;

            useLocationStore.getState().addLocation(newLocation);
            window.dispatchEvent(new CustomEvent('storycore:location-created', { detail: newLocation }));
            break;
          }
          case 'object': {
            const baseObject = createEmptyObject();
            const entity = result.entity as any;
            const newObject: StoryObject = {
              ...baseObject,
              id: entity.id || crypto.randomUUID(),
              name: entity.name || 'Unnamed Object',
              type: entity.type || 'prop',
              rarity: entity.rarity || 'common',
              description: entity.description || '',
              properties: {
                ...baseObject.properties,
                material: entity.properties?.material || entity.material || '',
                usage: entity.properties?.usage || entity.usage || '',
              },
              imageUrl: entity.imageUrl,
              prompts: (entity.prompts as string[]) || [],
              createdAt: entity.createdAt || entity.creation_timestamp || Date.now(),
              updatedAt: entity.updatedAt || entity.last_modified || Date.now(),
            } as StoryObject;

            if (mainStore.addObject) {
              mainStore.addObject(newObject);
            }
            window.dispatchEvent(new CustomEvent('storycore:object-created', { detail: newObject }));
            break;
          }
          case 'world': {
            const newWorld = result.entity as unknown as World;
            if (mainStore.addWorld) {
              mainStore.addWorld(newWorld);
            }
            window.dispatchEvent(new CustomEvent('storycore:world-created', { detail: newWorld }));
            break;
          }
          case 'story': {
            const newStory = result.entity as unknown as Story;
            if (mainStore.addStory) {
              mainStore.addStory(newStory);
            }
            window.dispatchEvent(new CustomEvent('storycore:story-created', { detail: newStory }));
            break;
          }
          case 'scenario': {
            const scenarioStory = result.entity as unknown as Story;
            if (mainStore.addStory) {
              mainStore.addStory(scenarioStory);
            }
            window.dispatchEvent(new CustomEvent('storycore:story-created', { detail: scenarioStory }));
            window.dispatchEvent(new CustomEvent('storycore:scenario-created', { detail: scenarioStory }));
            break;
          }
          case 'dialogue': {
            window.dispatchEvent(new CustomEvent('storycore:dialogue-created', { detail: result.entity }));
            break;
          }
          case 'image': {
            window.dispatchEvent(new CustomEvent('storycore:image-created', { detail: result.entity }));
            break;
          }
          case 'audio': {
            window.dispatchEvent(new CustomEvent('storycore:audio-created', { detail: result.entity }));
            break;
          }
          case 'video': {
            window.dispatchEvent(new CustomEvent('storycore:video-created', { detail: result.entity }));
            break;
          }
        }

        // Add success message with the created entity details
        const successMessage: Message = {
          id: `created-${Date.now()}`,
          type: 'assistant',
          content: (result.message || '') + '\n\n' + formatCreatedEntity(result),
          timestamp: new Date(),
          creationResult: result,
        };
        addMessage(successMessage);
      } else {
        // Handle failure
        const errorMessage: Message = {
          id: `create-error-${Date.now()}`,
          type: 'error',
          content: result.message || (currentLanguage === 'fr' ? 'Erreur de création' : 'Creation error'),
          timestamp: new Date(),
        };
        addMessage(errorMessage);
      }
    } catch (error) {
      console.error('[LandingChatBox] Error in handleCreation:', error);
      // Remove progress message if it's still there
      setMessages(prev => prev.filter(msg => msg.id !== progressMessage.id));

      const errorMessage: Message = {
        id: `create-error-${Date.now()}`,
        type: 'error',
        content: currentLanguage === 'fr'
          ? `❌ Erreur lors de la création : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
          : `❌ Creation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsCreating(false);
      setCreatingType(null);
    }
  }, [addMessage, currentLanguage, messages, project]);

  // Quick create handler (from quick create bar)
  const handleQuickCreate = useCallback(async (type: ContentType) => {
    await handleCreation(type, {});
  }, [handleCreation]);

  // Format created entity for display in chat
  function formatCreatedEntity(result: CreationResult): string {
    const entity = result.entity;
    const lines: string[] = [];

    switch (result.type) {
      case 'character':
        lines.push(`**Nom :** ${entity.name}`);
        if (entity.archetype) lines.push(`**Archétype :** ${entity.archetype}`);
        if (entity.role) lines.push(`**Rôle :** ${entity.role}`);
        if (entity.gender) lines.push(`**Genre :** ${entity.gender}`);
        if (entity.description) lines.push(`**Description :** ${entity.description}`);
        break;
      case 'location':
        lines.push(`**Nom :** ${entity.name}`);
        if (entity.type) lines.push(`**Type :** ${entity.type}`);
        if (entity.description) lines.push(`**Description :** ${entity.description}`);
        break;
      case 'object':
        lines.push(`**Nom :** ${entity.name}`);
        if (entity.type) lines.push(`**Type :** ${entity.type}`);
        if (entity.rarity) lines.push(`**Rareté :** ${entity.rarity}`);
        if (entity.description) lines.push(`**Description :** ${entity.description}`);
        break;
      case 'dialogue':
        if (entity.lines && Array.isArray(entity.lines)) {
          lines.push(`**${(entity.lines as unknown[]).length} répliques générées**`);
          (entity.lines as Array<{ character: string; text: string }>).slice(0, 3).forEach(l => {
            lines.push(`> **${l.character}:** ${l.text}`);
          });
          if ((entity.lines as unknown[]).length > 3) {
            lines.push(`_...et ${(entity.lines as unknown[]).length - 3} autres répliques_`);
          }
        }
        break;
      case 'story':
      case 'scenario':
        lines.push(`**Titre :** ${entity.title || entity.name}`);
        if (entity.genre) lines.push(`**Genre :** ${entity.genre}`);
        if (entity.summary || entity.description) lines.push(`**Résumé :** ${entity.summary || entity.description}`);
        break;
      case 'world':
        lines.push(`**Nom :** ${entity.name}`);
        if (entity.genre) lines.push(`**Genre :** ${entity.genre}`);
        if (entity.era) lines.push(`**Époque :** ${entity.era}`);
        if (entity.description) lines.push(`**Description :** ${entity.description}`);
        break;
      case 'image':
        lines.push(`**Prompt :** ${entity.prompt}`);
        if (entity.url) lines.push(`![Généré](${entity.url})`);
        break;
      case 'audio':
        lines.push(`**Texte :** ${entity.text}`);
        if (entity.duration) lines.push(`**Durée :** ${Math.round(entity.duration as number)}s`);
        break;
      case 'video':
        lines.push(`**Prompt :** ${entity.prompt}`);
        if (entity.url) lines.push(`[Voir la vidéo](${entity.url})`);
        break;
    }

    return lines.join('\n');
  }

  // Handle file attachment
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle language change
  const handleLanguageChange = useCallback((language: LanguageCode) => {
    // Persist language preference on selection (Requirements 2.4, 6.5)
    try {
      saveLanguagePreference(language, false);
      ;
    } catch (error) {
      console.error('Failed to persist language preference:', error);
      // Continue with state update even if persistence fails
    }

    // Update UI state
    setCurrentLanguage(language);

    // Update welcome message to new language
    setMessages(prev => {
      if (prev.length > 0 && prev[0].id === '1' && prev[0].type === 'assistant') {
        // Update the welcome message
        const updatedWelcome = {
          ...prev[0],
          content: getWelcomeMessage(language),
        };
        return [updatedWelcome, ...prev.slice(1)];
      }
      return prev;
    });

    // Build language-aware system prompt for LLM
    const systemPrompt = buildSystemPrompt(language);
    ;

    // Add system message about language change (Requirement 2.7)
    const languageNames: Record<LanguageCode, string> = {
      fr: 'French (Français)',
      en: 'English',
      es: 'Spanish (Español)',
      de: 'German (Deutsch)',
      it: 'Italian (Italiano)',
      pt: 'Portuguese (Português)',
      ja: 'Japanese (日本語)',
      zh: 'Chinese (中文)',
      ko: 'Korean (한국어)',
    };

    const systemMessage: Message = {
      id: Date.now().toString(),
      type: 'system',
      content: `🌐 Language preference changed to ${languageNames[language]}. The assistant will now respond in this language.`,
      timestamp: new Date(),
    };
    addMessage(systemMessage);
  }, [addMessage]);

  return (
    <div
      className="flex flex-col bg-gray-900 rounded-lg border border-gray-700 overflow-hidden"
      style={{ height: height ? `${height}px` : '800px' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700"
        role="banner"
        aria-label="Chat header"
      >
        <MessageSquare className="w-5 h-5 text-purple-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-white" id="chatbox-title">Assistant StoryCore</h3>
        <StatusIndicator
          status={connectionStatus}
          providerName={providerName}
          modelName={modelName}
        />

        {/* Configuration Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowLLMSettings(true)}
          className="text-gray-400 hover:text-white hover:bg-gray-700 ml-2"
          title="Configure LLM"
          aria-label="Configure LLM settings"
        >
          <Settings className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">Configure LLM settings</span>
        </Button>

        {/* Language Selector Button */}
        <LanguageSelector
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />

        {/* Conversation Erase Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            const confirmed = window.confirm(
              currentLanguage === 'fr'
                ? 'Êtes-vous sûr de vouloir effacer toute la conversation ? Cette action est irréversible.'
                : 'Are you sure you want to erase the entire conversation? This action cannot be undone.'
            );
            if (confirmed) {
              // Keep only the welcome message
              const welcomeMessage: Message = {
                id: '1',
                type: 'assistant',
                content: getWelcomeMessage(currentLanguage),
                timestamp: new Date(),
              };
              setMessages([welcomeMessage]);

              // Add system message about conversation erase
              const systemMessage: Message = {
                id: Date.now().toString(),
                type: 'system',
                content: currentLanguage === 'fr'
                  ? '🗑️ Conversation effacée. Nouvelle session commencée pour éviter la surcharge du modèle LLM.'
                  : '🗑️ Conversation erased. New session started to prevent LLM model overload.',
                timestamp: new Date(),
              };
              setMessages([welcomeMessage, systemMessage]);

              // Clear streaming state
              setIsStreaming(false);
              setStreamingMessageId(null);
              setCurrentStreamRequestId(null);
              setLastUserMessage('');
            }
          }}
          className="text-gray-400 hover:text-red-400 hover:bg-red-900/20 ml-2"
          title={currentLanguage === 'fr' ? 'Effacer la conversation' : 'Erase conversation'}
          aria-label={currentLanguage === 'fr' ? 'Effacer la conversation' : 'Erase conversation'}
        >
          <Trash2 className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">{currentLanguage === 'fr' ? 'Effacer la conversation' : 'Erase conversation'}</span>
        </Button>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-live="polite"
        aria-atomic="false"
        aria-label="Chat messages"
        aria-describedby="chatbox-title"
      >
        {/* Ollama Warning Banner */}
        {isOllamaAvailable === false && (
          <div
            className="rounded-lg border-2 border-orange-500/50 bg-orange-900/20 p-3"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-300 text-sm mb-1">
                  Ollama n'est pas détecté
                </h4>
                <p className="text-xs text-orange-200/80 mb-2">
                  L'assistant AI nécessite Ollama pour fonctionner.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="https://ollama.com/download/windows"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                    aria-label="Download Ollama (opens in new window)"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    Télécharger
                  </a>
                  <button
                    onClick={async () => {
                      setConnectionStatus('connecting');
                      const available = await checkOllamaStatus();
                      setIsOllamaAvailable(available);
                      if (available) {
                        setConnectionStatus('online');
                        setProviderName('Ollama');
                        setModelName('llama2');
                        setIsFallbackMode(false);
                        // Add system message about connection status change (Requirement 4.6)
                        addMessage({
                          id: Date.now().toString(),
                          type: 'system',
                          content: '✅ Connection status: Online. Ollama is now connected and ready to assist.',
                          timestamp: new Date(),
                        });
                      } else {
                        setConnectionStatus('fallback');
                        setIsFallbackMode(true);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 text-gray-200 text-xs rounded hover:bg-gray-600 transition-colors"
                    aria-label="Check Ollama connection status"
                  >
                    Vérifier
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback Mode Warning Banner (Requirements 10.3, 10.4, 10.7) */}
        {isFallbackMode && !isOllamaAvailable && (
          <div
            className="rounded-lg border-2 border-orange-500/50 bg-orange-900/20 p-3"
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-300 text-sm mb-1">
                  Mode hors ligne activé
                </h4>
                <p className="text-xs text-orange-200/80 mb-2">
                  L'assistant utilise des réponses pré-configurées. Configurez un service LLM pour des réponses AI dynamiques.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setShowLLMSettings(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 transition-colors"
                    aria-label="Configure LLM settings"
                  >
                    <Settings className="w-3 h-3" aria-hidden="true" />
                    Configurer LLM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : message.type === 'system' ? 'justify-center' : 'justify-start'}`}
            role="article"
            aria-label={`${message.type === 'user' ? 'User' : message.type === 'assistant' ? 'Assistant' : message.type === 'system' ? 'System' : 'Error'} message`}
          >
            {message.type === 'error' && message.error ? (
              // Error message with recovery options (Requirements 7.1-7.7)
              <div className="w-full">
                <InlineLLMError
                  error={message.error}
                  onRetry={message.error.retryable ? async () => {
                    await handleRetryMessage(lastUserMessage);
                  } : undefined}
                  onManualEntry={() => {
                    // Remove error and allow user to try again
                    setMessages(prev => prev.filter(msg => msg.id !== message.id));
                  }}
                />
              </div>
            ) : message.type === 'system' ? (
              // System message styling (Requirement 2.7, 4.6)
              <div
                className="max-w-[90%] rounded-lg px-4 py-2 bg-blue-900/20 border border-blue-500/30"
                role="status"
                aria-live="polite"
              >
                <p className="text-sm text-blue-300 text-center whitespace-pre-wrap">{message.content}</p>
                <span className="text-xs text-blue-400/60 mt-1 block text-center">
                  <time dateTime={message.timestamp.toISOString()}>
                    {message.timestamp.toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </span>
              </div>
            ) : (
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${message.type === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-200'
                  }`}
              >
                {message.type === 'assistant' && (
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3 h-3 text-purple-400" aria-hidden="true" />
                    <span className="text-xs text-purple-400 font-medium">Assistant</span>
                    {/* Typing indicator during streaming (Requirement 8.3) */}
                    {message.isStreaming && (
                      <TypingIndicator className="text-gray-400 text-xs ml-1" />
                    )}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1" role="list" aria-label="Attachments">
                    {message.attachments.map((attachment, idx) => (
                      <div key={idx} className="text-xs text-gray-400 flex items-center gap-1" role="listitem">
                        <Paperclip className="w-3 h-3" aria-hidden="true" />
                        <span>{attachment}</span>
                      </div>
                    ))}
                  </div>
                )}
                {/* Display timestamp after streaming completes (Requirement 8.4) */}
                {!message.isStreaming && (
                  <span className="text-xs text-gray-400 mt-1 block">
                    <time dateTime={message.timestamp.toISOString()}>
                      {message.timestamp.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </span>
                )}
                {/* Content Creation Action Buttons */}
                {message.type === 'assistant' && message.creationButtons && message.creationButtons.length > 0 && !message.creationResult && (
                  <div className="mt-3 pt-2 border-t border-gray-700/50">
                    <div className="flex items-center gap-1 mb-2">
                      <Wand2 className="w-3 h-3 text-amber-400" aria-hidden="true" />
                      <span className="text-xs text-amber-400 font-medium">
                        {currentLanguage === 'fr' ? 'Actions de création détectées' : 'Creation actions detected'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.creationButtons.map((btn) => (
                        <button
                          key={btn.id}
                          onClick={() => handleCreation(btn.type, btn.data)}
                          disabled={isCreating}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600/80 to-indigo-600/80 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          title={btn.label}
                        >
                          {isCreating && creatingType === btn.type ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <span className="text-sm">{btn.icon}</span>
                          )}
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Creation Result Badge */}
                {message.creationResult && message.creationResult.success && (
                  <div className="mt-2 flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-900/40 border border-emerald-500/30 rounded-full text-xs text-emerald-300">
                      <Sparkles className="w-3 h-3" />
                      {currentLanguage === 'fr' ? 'Créé avec succès' : 'Created successfully'}
                    </span>
                  </div>
                )}
                {/* Media Playback / Display */}
                {message.creationResult && message.creationResult.success && (
                  <div className="mt-3 overflow-hidden rounded-md border border-gray-700">
                    {message.creationResult.type === 'image' && message.creationResult.entity.url && (
                      <img
                        src={message.creationResult.entity.url as string}
                        alt="Generated content"
                        className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    {message.creationResult.type === 'audio' && message.creationResult.entity.url && (
                      <div className="p-2 bg-gray-900/50">
                        <audio
                          controls
                          src={message.creationResult.entity.url as string}
                          className="w-full h-8"
                        />
                      </div>
                    )}
                    {message.creationResult.type === 'video' && message.creationResult.entity.url && (
                      <video
                        controls
                        src={message.creationResult.entity.url as string}
                        className="w-full h-auto"
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div
          className="px-4 py-2 bg-gray-800 border-t border-gray-700"
          role="region"
          aria-label="Attached files"
        >
          <div className="flex flex-wrap gap-2" role="list">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 rounded-md text-xs text-gray-300"
                role="listitem"
              >
                <Paperclip className="w-3 h-3" aria-hidden="true" />
                <span>{file.name}</span>
                <button
                  onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                  className="ml-1 text-gray-400 hover:text-white"
                  aria-label={`Remove ${file.name}`}
                  title={`Remove ${file.name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dynamic Prompt Suggestions */}
      {showSuggestions && dynamicSuggestions.length > 0 && (
        <div className="px-4 py-3 bg-gray-800 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300 font-medium">
              {currentLanguage === 'fr' ? 'Suggestions intelligentes' : 'Smart Suggestions'}
            </span>
            {inputValue.trim() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUseUserTextAsPrompt}
                className="ml-auto text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                title={currentLanguage === 'fr' ? 'Utiliser mon texte comme base' : 'Use my text as base'}
              >
                <Zap className="w-3 h-3 mr-1" />
                {currentLanguage === 'fr' ? 'Améliorer' : 'Enhance'}
              </Button>
            )}
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-gray-500 hover:text-gray-300 text-xs"
              title={currentLanguage === 'fr' ? 'Masquer les suggestions' : 'Hide suggestions'}
            >
              ✕
            </button>
          </div>

          {/* Suggestions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dynamicSuggestions.map((suggestion) => {
              const isGhostTracker = suggestion.id.startsWith('ghost-tracker-');

              return (
                <button
                  key={suggestion.id}
                  onClick={() => setInputValue(suggestion.text)}
                  className="flex items-start gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-left transition-colors group relative"
                  title={`${suggestion.category} - Pertinence: ${(suggestion.relevance * 100).toFixed(0)}% ${isGhostTracker ? ' - Recommandation Ghost Tracker' : ''}`}
                >
                  {/* Ghost Tracker Badge */}
                  {isGhostTracker && (
                    <div className="absolute -top-1 -right-1 bg-purple-600 text-white text-xs px-1 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                      <span className="text-xs">👻</span>
                      <span className="text-[10px] font-bold">AI</span>
                    </div>
                  )}

                  <span className="text-lg flex-shrink-0 mt-0.5" role="img" aria-label={suggestion.category}>
                    {suggestion.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm line-clamp-2 group-hover:text-white ${isGhostTracker ? 'text-purple-200' : 'text-gray-200'}`}>
                      {suggestion.text}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${suggestion.category === 'follow-up' ? 'bg-blue-900/50 text-blue-300' :
                        suggestion.category === 'clarification' ? 'bg-orange-900/50 text-orange-300' :
                          suggestion.category === 'expansion' ? 'bg-green-900/50 text-green-300' :
                            suggestion.category === 'alternative' ? 'bg-purple-900/50 text-purple-300' :
                              'bg-gray-900/50 text-gray-300'
                        }`}>
                        {suggestion.category === 'follow-up' ? (currentLanguage === 'fr' ? 'Suivi' : 'Follow-up') :
                          suggestion.category === 'clarification' ? (currentLanguage === 'fr' ? 'Clarification' : 'Clarify') :
                            suggestion.category === 'expansion' ? (currentLanguage === 'fr' ? 'Expansion' : 'Expand') :
                              suggestion.category === 'alternative' ? (currentLanguage === 'fr' ? 'Alternative' : 'Alternative') :
                                (currentLanguage === 'fr' ? 'Affinement' : 'Refine')}
                      </span>
                      {isGhostTracker && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300 border border-purple-500/30">
                          👻 GT
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {(suggestion.relevance * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Helper Text */}
          <div className="mt-2 text-xs text-gray-500 text-center">
            {currentLanguage === 'fr'
              ? 'Ces suggestions s\'adaptent à votre conversation et langue'
              : 'These suggestions adapt to your conversation and language'
            }
          </div>
        </div>
      )}

      {/* Quick Create Bar */}
      <div className="px-4 py-2 bg-gray-800/50 border-t border-gray-700/50">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuickCreate(!showQuickCreate)}
            className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors"
            title={currentLanguage === 'fr' ? 'Création rapide de contenu' : 'Quick content creation'}
          >
            <Plus className="w-3.5 h-3.5" />
            <Wand2 className="w-3.5 h-3.5" />
            <span className="font-medium">
              {currentLanguage === 'fr' ? 'Créer' : 'Create'}
            </span>
          </button>

          {showQuickCreate && (
            <div className="flex flex-wrap gap-1.5 ml-2 animate-in slide-in-from-left-2 duration-200">
              {contentCreationService.getQuickCreationButtons(currentLanguage).map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleQuickCreate(btn.type)}
                  disabled={isCreating}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-700/80 hover:bg-gray-600 text-gray-200 text-xs rounded-md transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/50 hover:border-purple-500/50"
                  title={btn.label}
                >
                  {isCreating && creatingType === btn.type ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span>{btn.icon}</span>
                  )}
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div
        className="p-4 bg-gray-800 border-t border-gray-700"
        role="form"
        aria-label="Message input"
      >
        {/* Button Row - Advanced Prompt Tools */}
        <div className="flex justify-end gap-1 mb-2 flex-wrap">
          {/* Model Optimization Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleOptimizeForModel()}
            className="text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 text-xs px-2 py-1 h-7"
            title={currentLanguage === 'fr'
              ? 'Optimiser pour le modèle actuel'
              : 'Optimize for current model'
            }
            aria-label={currentLanguage === 'fr' ? 'Optimiser pour le modèle' : 'Optimize for model'}
          >
            🎯 {currentLanguage === 'fr' ? 'Opt.' : 'Opt'}
          </Button>

          {/* Add System Instructions Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleAddSystemInstructions()}
            className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20 text-xs px-2 py-1 h-7"
            title={currentLanguage === 'fr'
              ? 'Ajouter des instructions système'
              : 'Add system instructions'
            }
            aria-label={currentLanguage === 'fr' ? 'Ajouter instructions système' : 'Add system instructions'}
          >
            ⚙️ {currentLanguage === 'fr' ? 'Sys' : 'Sys'}
          </Button>

          {/* Clean Prompt Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleCleanPrompt()}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 text-xs px-2 py-1 h-7"
            title={currentLanguage === 'fr'
              ? 'Nettoyer et réduire le prompt'
              : 'Clean and reduce prompt'
            }
            aria-label={currentLanguage === 'fr' ? 'Nettoyer le prompt' : 'Clean prompt'}
          >
            🧹 {currentLanguage === 'fr' ? 'Clean' : 'Clean'}
          </Button>

          {/* Prompt Repetition Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPromptRepetitionEnabled(!promptRepetitionEnabled)}
            className={`text-xs px-2 py-1 h-7 ${promptRepetitionEnabled
              ? 'text-green-400 bg-green-900/20 border border-green-500/30'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
              }`}
            title={currentLanguage === 'fr'
              ? 'Répéter le prompt pour certains modèles (<prompt> <prompt>)'
              : 'Repeat prompt for some models (<prompt> <prompt>)'
            }
            aria-label={currentLanguage === 'fr' ? 'Activer répétition du prompt' : 'Enable prompt repetition'}
          >
            🔄 {currentLanguage === 'fr' ? 'Rép.' : 'Rep'}
          </Button>

          {/* Prompt Revision Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleRevisePrompt()}
            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 text-xs px-2 py-1 h-7"
            title={currentLanguage === 'fr'
              ? 'Réviser le prompt : contexte en premier, question après'
              : 'Revise prompt: context first, question after'
            }
            aria-label={currentLanguage === 'fr' ? 'Réviser le prompt' : 'Revise prompt'}
          >
            📝 {currentLanguage === 'fr' ? 'Rév.' : 'Rev'}
          </Button>

          {/* Enhance Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUseUserTextAsPrompt}
            className="text-purple-400 hover:text-purple-300 hover:bg-purple-900/20 text-xs px-2 py-1 h-7"
            title={currentLanguage === 'fr' ? 'Utiliser mon texte pour générer des suggestions' : 'Use my text to generate suggestions'}
            aria-label={currentLanguage === 'fr' ? 'Améliorer avec IA' : 'Enhance with AI'}
          >
            <Zap className="w-4 h-4 mr-1" aria-hidden="true" />
            {currentLanguage === 'fr' ? 'Amél.' : 'Enh'}
          </Button>
        </div>

        <div className="flex items-end gap-2">
          {/* File Attachment Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,image/*,.pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Select files to attach"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-400 hover:text-white hover:bg-gray-700"
            title="Joindre un fichier"
            aria-label="Attach file"
          >
            <Paperclip className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Attach file</span>
          </Button>

          {/* Text Input */}
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 min-h-[80px] max-h-[240px] bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 resize-none"
            rows={2}
            aria-label="Message input"
            aria-describedby="input-help-text"
          />

          {/* Send Button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() && attachments.length === 0}
            className="bg-purple-600 hover:bg-purple-700 text-white"
            title="Envoyer (Entrée)"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
        <p id="input-help-text" className="text-xs text-gray-500 mt-2">
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour une nouvelle ligne
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate intelligent assistant responses based on user input
 */
function generateAssistantResponse(input: string): string {
  // Project creation requests
  if (
    (input.includes('créer') || input.includes('creer') || input.includes('create') ||
      input.includes('nouveau') || input.includes('new')) &&
    (input.includes('projet') || input.includes('project'))
  ) {
    return "Pour créer un nouveau projet, cliquez sur le bouton 'New Project' ci-dessus. Je pourrai ensuite vous aider à créer des shots, ajouter des transitions et configurer l'audio une fois votre projet ouvert.";
  }

  // Project opening requests
  if (
    (input.includes('ouvrir') || input.includes('open') ||
      input.includes('charger') || input.includes('load')) &&
    (input.includes('projet') || input.includes('project'))
  ) {
    return "Pour ouvrir un projet existant, cliquez sur le bouton 'Open Project' ci-dessus, ou sélectionnez un projet dans la liste des projets récents. Je serai là pour vous assister dès que votre projet sera ouvert!";
  }

  // Wizard launch requests - detect specific wizard requests
  const wizardPatterns = {
    'world': ['world', 'building', 'monde', 'univers', 'world-building'],
    'character': ['character', 'personnage', 'perso', 'character-creation'],
    'scene': ['scene', 'scène', 'scene-generator'],
    'dialogue': ['dialogue', 'dialogues', 'dialogue-writer'],
    'storyboard': ['storyboard', 'story', 'storyboard-creator'],
    'style': ['style', 'transfer', 'style-transfer'],
    'comic': ['comic', 'bd', 'bande', 'comic-to-sequence'],
    'audio': ['audio', 'son', 'music', 'audio-production'],
    'transition': ['transition', 'transitions'],
    'sequence': ['sequence', 'plan', 'plan-sequences']
  };

  // Check for specific wizard requests
  for (const [wizardType, keywords] of Object.entries(wizardPatterns)) {
    if (keywords.some(keyword => input.toLowerCase().includes(keyword))) {
      // Extract context and auto-fill suggestions
      const autoFillResult = formAutoFill.autoFillForm(wizardType, input);

      // Dispatch custom event to launch wizard with pre-filled data
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('launch-wizard', {
          detail: {
            wizardType,
            context: input,
            keywords: keywords.filter(k => input.toLowerCase().includes(k)),
            autoFillData: autoFillResult.data,
            suggestions: autoFillResult.suggestions
          }
        }));
      }, 500);

      // Build intelligent response with pre-fill information
      let response = `🎯 **Lancement du wizard ${wizardType === 'world' ? 'World Building' :
        wizardType === 'character' ? 'Character Creation' :
          wizardType === 'scene' ? 'Scene Generator' :
            wizardType === 'dialogue' ? 'Dialogue Writer' :
              wizardType === 'storyboard' ? 'Storyboard Creator' :
                wizardType === 'style' ? 'Style Transfer' :
                  wizardType === 'comic' ? 'Comic to Sequence' :
                    wizardType === 'audio' ? 'Audio Production' :
                      wizardType === 'transition' ? 'Transitions' :
                        'Plan Sequences'}...**\n\n`;

      if (autoFillResult.success && autoFillResult.filledFields.length > 0) {
        response += `✨ **Pré-remplissage intelligent détecté !**\n`;
        response += `Champs remplis automatiquement : ${autoFillResult.filledFields.join(', ')}\n\n`;

        if (autoFillResult.suggestions.length > 0) {
          response += `💡 **Suggestions d'amélioration :**\n`;
          autoFillResult.suggestions.slice(0, 2).forEach(suggestion => {
            response += `• ${suggestion}\n`;
          });
          response += '\n';
        }
      } else {
        response += `Le wizard s'ouvre automatiquement. Utilisez les informations de votre demande pour pré-remplir les champs !\n\n`;
      }

      response += `🔧 **Astuce** : Vous pouvez modifier tous les champs pré-remplis selon vos besoins.`;

      return response;
    }
  }

  // Help/capabilities requests
  if (
    input.includes('aide') || input.includes('help') ||
    input.includes('comment') || input.includes('how') ||
    input.includes('que peux') || input.includes('what can') ||
    input.includes('wizard') || input.includes('assistant') ||
    input.includes('quel') || input.includes('which')
  ) {
    return "Voici tous les **Wizards** et outils disponibles dans StoryCore :\n\n🎭 **Creative Wizards** (cliquez sur les cartes dans le dashboard) :\n\n• **🏰 World Building** : Créez des mondes complets avec des univers, des lieux et de la lore détaillée\n• **👥 Character Creation** : Concevez des personnages avec personnalités, apparences et arcs narratifs\n• **🎬 Scene Generator** : Générez automatiquement des scènes complètes avec descriptions et dialogues\n• **💬 Dialogue Writer** : Écrivez des dialogues naturels alignés sur les personnalités des personnages\n• **📖 Storyboard Creator** : Transformez vos scripts en storyboards visuels professionnels\n• **🎨 Style Transfer** : Appliquez des styles artistiques à vos projets (impressionnisme, manga, etc.)\n\n🎯 **Outils Spécialisés** :\n• **📚 Comic to Sequence** : Transformez des bandes dessinées en séquences cinématiques\n• **🎵 Audio Production** : Configurez musique, effets sonores et voix-off\n• **🔄 Transitions** : Ajoutez des effets de transition professionnels\n• **📋 Plan Sequences** : Gérez et organisez vos séquences vidéo\n\n💡 **Astuce** : Dites simplement le nom du wizard (ex: \"world building\", \"character creation\") pour le lancer automatiquement !";
  }

  // Shots/scenes requests
  if (
    input.includes('shot') || input.includes('scene') ||
    input.includes('séquence') || input.includes('sequence')
  ) {
    return "Pour travailler avec des shots et des scènes, vous devez d'abord créer ou ouvrir un projet. Une fois dans l'éditeur, je pourrai vous aider à créer des séquences, ajuster les durées, et organiser vos scènes.";
  }

  // Audio requests
  if (
    input.includes('audio') || input.includes('son') ||
    input.includes('music') || input.includes('musique') ||
    input.includes('voix') || input.includes('voice')
  ) {
    return "Je peux vous aider à configurer l'audio de votre projet, incluant la musique de fond, les effets sonores, et les voix-off. Créez d'abord un projet pour accéder aux fonctionnalités audio avancées.";
  }

  // Transition requests
  if (
    input.includes('transition') || input.includes('effet') ||
    input.includes('effect') || input.includes('animation')
  ) {
    return "Les transitions et effets visuels sont disponibles une fois que vous avez créé un projet et ajouté des shots. Je pourrai alors vous suggérer les meilleures transitions (fade, wipe, dissolve) selon votre style.";
  }

  // Export/render requests
  if (
    input.includes('export') || input.includes('render') ||
    input.includes('générer') || input.includes('generate') ||
    input.includes('vidéo') || input.includes('video')
  ) {
    return "L'export et le rendu de vidéos sont disponibles depuis l'éditeur de projet. Une fois votre storyboard terminé, vous pourrez exporter votre projet dans différents formats avec les paramètres de qualité de votre choix.";
  }

  // Vision analysis fallback
  if (
    input.includes('analyser') || input.includes('analyze') ||
    input.includes('voir') || input.includes('see') ||
    input.includes('regarder') || input.includes('look') ||
    input.includes('image')
  ) {
    return "Je peux analyser vos images ! Glissez simplement une image dans le chat ou utilisez le bouton trombone, et je vous dirai ce que je vois. Je peux aussi créer des personnages, lieux ou objets basés sur vos images.";
  }

  // Default response
  return "Je suis là pour vous aider avec StoryCore! Pour commencer, créez un nouveau projet ou ouvrez un projet existant en utilisant les boutons ci-dessus. Ensuite, je pourrai vous assister dans la création de votre storyboard, l'ajout d'effets, et bien plus encore.";
}
