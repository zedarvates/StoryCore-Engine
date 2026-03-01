/* cspell:ignore Chatbox chatbox openai openai Anthropic Anthropic Italiano Português creer */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, Sparkles, MessageSquare, AlertCircle, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import { StatusIndicator, ConnectionStatus } from './StatusIndicator';
import { LanguageSelector } from './LanguageSelector';
import { LLMConfigDialog } from './LLMConfigDialog';
import { TypingIndicator } from './TypingIndicator';
import { type LLMConfig, LLMService, type LLMRequest, type ErrorRecoveryOptions, LLMError } from '@/services/llmService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { getWelcomeMessage } from '@/utils/chatboxTranslations';
import { InlineLLMError } from '@/components/wizard/LLMErrorDisplay';
import { getInitialLanguagePreference } from '@/utils/languageDetection';
import { 
  type LanguageCode, 
  saveConfiguration, 
  saveLanguagePreference,
  type ChatboxLLMConfig,
  loadConfiguration 
} from '@/utils/llmConfigStorage';
import { 
  autoMigrate, 
  getMigrationNotification, 
  clearMigrationNotification,
  getMigratedChatHistory,
  clearMigratedChatHistory 
} from '@/utils/ollamaMigration';
import { 
  UserPlus, 
  MapPin, 
  Package, 
  Video, 
  Ghost, 
  Mic, 
  MicOff, 
  PlusSquare, 
  Wand2, 
  Zap, 
  Minimize2, 
  Type, 
  Eraser,
  BookOpen
} from 'lucide-react';
import { VoiceTextService } from '@/services/VoiceTextService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// ============================================================================
// Constants
// ============================================================================

const MESSAGE_HISTORY_LIMIT = 100; // Maximum number of messages to keep in history
const CONFIG_DEBOUNCE_DELAY = 500; // Debounce delay for configuration changes in milliseconds

// ============================================================================
// Types
// ============================================================================

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
  isStreaming?: boolean;
  streamComplete?: boolean;
  error?: ErrorRecoveryOptions;
}

interface LandingChatBoxProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  placeholder?: string;
  height?: string;
  isDetached?: boolean;
}

// ============================================================================
// Landing Chat Box Component
// ============================================================================

export function LandingChatBox({
  onSendMessage,
  placeholder = "Décrivez votre projet ou posez une question...",
  height,
  isDetached = false,
}: LandingChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [providerName, setProviderName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => getInitialLanguagePreference() as LanguageCode);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    parameters: {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    systemPrompts: {
      worldGeneration: '',
      characterGeneration: '',
      dialogueGeneration: '',
    },
    timeout: 30000,
    retryAttempts: 3,
    streamingEnabled: true,
  });
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamRequestId, setCurrentStreamRequestId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Ref to break circular dependency between createErrorMessage and handleRetryMessage
  const handleRetryMessageRef = useRef<((userInput: string) => Promise<void>) | null>(null);

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
  }, [currentLanguage, messages.length]); // Run when language changes or messages are cleared

  // Check for Ollama migration and load configuration on mount
  useEffect(() => {
    async function initializeConfiguration() {
      setConnectionStatus('connecting');
      
      // Perform automatic migration if needed
      const migrationResult = await autoMigrate();
      
      if (migrationResult && migrationResult.success) {
        console.log('Ollama configuration migrated:', migrationResult);
        
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
      
      // Load configuration (either migrated or existing)
      const loadedConfig = await loadConfiguration();
      
      // Check Ollama availability first
      const ollamaAvailable = await checkOllamaStatus();
      setIsOllamaAvailable(ollamaAvailable);
      
      if (loadedConfig) {
        // If loaded config is OpenAI/Anthropic without API key, prefer Ollama if available
        const requiresApiKey = loadedConfig.provider === 'openai' || loadedConfig.provider === 'anthropic';
        const hasApiKey = loadedConfig.apiKey && loadedConfig.apiKey.trim().length > 0;
        
        if (requiresApiKey && !hasApiKey && ollamaAvailable) {
          // Use Ollama instead of invalid OpenAI/Anthropic config
          setLlmConfig({
            provider: 'local',
            model: 'gemma3:1b',
            apiKey: '',
            apiEndpoint: 'http://localhost:11434',
            parameters: {
              temperature: 0.7,
              maxTokens: 2000,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
            },
            systemPrompts: {
              worldGeneration: '',
              characterGeneration: '',
              dialogueGeneration: '',
            },
            timeout: 30000,
            retryAttempts: 3,
            streamingEnabled: true,
          });
          setProviderName('Ollama');
          setModelName('gemma3:1b');
          setConnectionStatus('online');
          setIsFallbackMode(false);
        } else {
          // Use loaded configuration
          setLlmConfig({
            provider: loadedConfig.provider,
            model: loadedConfig.model,
            apiKey: loadedConfig.apiKey,
            apiEndpoint: loadedConfig.provider === 'local' ? 'http://localhost:11434' : undefined,
            parameters: {
              temperature: loadedConfig.temperature,
              maxTokens: loadedConfig.maxTokens,
              topP: 1,
              frequencyPenalty: 0,
              presencePenalty: 0,
            },
            systemPrompts: {
              worldGeneration: '',
              characterGeneration: '',
              dialogueGeneration: '',
            },
            timeout: 30000,
            retryAttempts: 3,
            streamingEnabled: loadedConfig.streamingEnabled,
          });
          
          setProviderName(loadedConfig.provider);
          setModelName(loadedConfig.model);
          setConnectionStatus('online');
          setIsFallbackMode(false);
        }
      } else if (ollamaAvailable) {
        // No configuration found, use Ollama as default
        setLlmConfig({
          provider: 'local',
          model: 'gemma3:1b',
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: 1,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          systemPrompts: {
            worldGeneration: '',
            characterGeneration: '',
            dialogueGeneration: '',
          },
          timeout: 30000,
          retryAttempts: 3,
          streamingEnabled: true,
        });
        setConnectionStatus('online');
        setProviderName('Ollama');
        setModelName('gemma3:1b');
        setIsFallbackMode(false);
      } else {
        // No LLM provider configured, activate fallback mode (Requirement 10.1)
        setConnectionStatus('fallback');
        setIsFallbackMode(true);
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
    }
    
    initializeConfiguration();
  }, [addMessage]);

  // Initialize LLM Service when configuration changes
  useEffect(() => {
    // Only initialize if we have an API key (for providers that require it)
    const requiresApiKey = llmConfig.provider === 'openai' || llmConfig.provider === 'anthropic';
    
    if (requiresApiKey && !llmConfig.apiKey) {
      // No API key configured, stay in fallback mode (Requirement 10.1)
      setLlmService(null);
      setConnectionStatus('fallback');
      setIsFallbackMode(true);
      return;
    }

    // Initialize LLM service with current configuration
    const service = new LLMService(llmConfig);
    setLlmService(service);
    
    // Update connection status based on provider
    setProviderName(llmConfig.provider);
    setModelName(llmConfig.model);
    setConnectionStatus('online');
    setIsFallbackMode(false);

    // Cleanup function to cancel all requests on unmount or config change
    return () => {
      if (service) {
        service.cancelAllRequests();
      }
    };
  }, [llmConfig]);

  // Cleanup streaming connections on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing streaming requests
      if (llmService && currentStreamRequestId) {
        llmService.cancelRequest(currentStreamRequestId);
      }
      
      // Clear debounce timer
      if (configDebounceTimerRef.current) {
        clearTimeout(configDebounceTimerRef.current);
      }
    };
  }, [llmService, currentStreamRequestId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);



  // Helper function to create error message with recovery options (Requirements 7.1-7.8)
  const createErrorMessage = useCallback((error: Error | LLMError, userInput: string): Message => {
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
            if (handleRetryMessageRef.current) {
              await handleRetryMessageRef.current(userInput);
            }
          },
          primary: true,
        }] : []),
        // Configure action (Requirement 7.7)
        {
          label: 'Configure',
          action: () => {
            setShowConfigDialog(true);
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
  }, [setShowConfigDialog]); // handleRetryMessageRef, addMessage, setMessages are stable

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
  }, [llmService, llmConfig, currentLanguage, addMessage, createErrorMessage]);

  // Update retry ref
  useEffect(() => {
    handleRetryMessageRef.current = handleRetryMessage;
  }, [handleRetryMessage]);

  // Handle quick action (Requirements for character, location, object, shot)
  const handleQuickAction = useCallback(async (action: string) => {
    let prompt = '';
    switch (action) {
      case 'character': prompt = "Je souhaite créer un nouveau personnage pour mon projet. Peux-tu m'aider à définir son background et sa personnalité ?"; break;
      case 'location': prompt = "Je dois concevoir un nouveau lieu (décor/environnement). Quelles idées peux-tu me proposer ?"; break;
      case 'object': prompt = "J'ai besoin d'un objet clé (un accessoire/prop) pour mon histoire. Peux-tu m'aider à le créer ?"; break;
      case 'shot': prompt = "J'aimerais planifier un nouveau shot (plan de caméra) pour ma séquence. Peux-tu m'aider à définir le cadrage et l'angle ?"; break;
      case 'scenario': prompt = "Je souhaite travailler sur le scénario de mon projet. Peux-tu m'aider à structurer l'intrigue ou à écrire une scène ?"; break;
      case 'ghost': prompt = "Peux-tu me donner des conseils du Ghost Tracker sur l'état actuel de mon projet et les améliorations possibles ?"; break;
      default: return;
    }
    setInputValue(prompt);
  }, []);

  // Handle prompt improvement (Requirement 3.1+)
  const handleImprovePrompt = useCallback(async (type: 'improve' | 'shorter' | 'longer') => {
    if (!inputValue.trim() || !llmService) return;

    setIsImproving(true);
    try {
      let instruction = '';
      if (type === 'improve') instruction = "Réécris ce prompt de façon plus claire, riche et efficace pour un assistant créatif :";
      else if (type === 'shorter') instruction = "Rends ce prompt beaucoup plus court et concis :";
      else if (type === 'longer') instruction = "Enrichis ce prompt avec beaucoup plus de détails créatifs :";

      const request: LLMRequest = {
        prompt: `${instruction}\n\n"${inputValue}"`,
        systemPrompt: "Tu es un expert en prompt engineering. Réponds UNIQUEMENT par le prompt amélioré, sans introduction ni conclusion.",
        stream: false,
      };

      const response = await llmService.generateCompletion(request);
      if (response.success && response.data) {
        setInputValue(response.data.content.trim().replace(/^"/, '').replace(/"$/, ''));
        toast({ title: "Prompt amélioré ✨", description: "Le texte a été mis à jour par l'IA." });
      }
    } catch (error) {
      console.error('Failed to improve prompt:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible d'améliorer le prompt." });
    } finally {
      setIsImproving(false);
    }
  }, [inputValue, llmService, toast]);

  // Handle voice recording
  const handleVoiceRecording = useCallback(() => {
    const voiceService = VoiceTextService.getInstance();
    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
    } else {
      voiceService.startListening({
        onStart: () => setIsListening(true),
        onResult: (result) => {
          if (result.isFinal) {
            setInputValue(prev => prev + (prev ? ' ' : '') + result.transcript);
          }
        },
        onError: (error) => {
          console.error('Voice error:', error);
          setIsListening(false);
          toast({ variant: "destructive", title: "Erreur vocale", description: error });
        },
        onEnd: () => setIsListening(false),
      });
    }
  }, [isListening, toast]);

  // Handle screen area capture (Requirement "+" button)
  const handleScreenCapture = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const electron = (window as any).electron;
      if (electron && electron.startAreaCapture) {
        const result = await electron.startAreaCapture();
        if (result && result.base64Data) {
          const res = await fetch(result.base64Data);
          const blob = await res.blob();
          const file = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
          setAttachments(prev => [...prev, file]);
          toast({ title: "Capture réussie 📸", description: "L'image a été ajoutée." });
        }
      } else {
        toast({ variant: "destructive", title: "Indisponible", description: "La capture d'écran n'est pas supportée dans ce contexte." });
      }
    } catch (error) {
      console.error('Screen capture error:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Erreur lors de la capture." });
    }
  };

  // Handle send message
  const handleSend = async () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    // Cancel any ongoing stream before sending new message (Requirement 8.5)
    if (isStreaming && currentStreamRequestId && llmService) {
      const cancelled = llmService.cancelRequest(currentStreamRequestId);
      if (cancelled) {
        console.log('Cancelled ongoing stream:', currentStreamRequestId);
        
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
              action: () => setShowConfigDialog(true),
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
      setShowConfigDialog(true);
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

    // Generate response using LLM service or fallback (Requirement 3.1)
    if (llmService) {
      try {
        // Build language-aware system prompt (Requirement 3.4)
        const systemPrompt = buildSystemPrompt(currentLanguage);
        
        // Create LLM request
        const request: LLMRequest = {
          prompt: userInput,
          systemPrompt,
          stream: llmConfig.streamingEnabled,
        };

        // Generate unique request ID for cancellation support
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentStreamRequestId(requestId);

        // Route request to LLM provider via LLMService (Requirement 3.1)
        if (llmConfig.streamingEnabled) {
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

  // Handle configuration save with debouncing
  const handleConfigSave = useCallback(async (config: LLMConfig) => {
    // Clear any existing debounce timer
    if (configDebounceTimerRef.current) {
      clearTimeout(configDebounceTimerRef.current);
    }
    
    // Debounce configuration changes to prevent excessive updates
    configDebounceTimerRef.current = setTimeout(async () => {
      // Persist configuration to localStorage (Requirements 1.7, 6.4)
      try {
        const chatboxConfig: ChatboxLLMConfig = {
          provider: config.provider,
          model: config.model,
          temperature: config.parameters.temperature,
          maxTokens: config.parameters.maxTokens,
          apiKey: config.apiKey,
          streamingEnabled: config.streamingEnabled,
        };
        
        await saveConfiguration(chatboxConfig);
        console.log('Configuration persisted to localStorage');
      } catch (error) {
        console.error('Failed to persist configuration:', error);
        // Continue with state update even if persistence fails
      }
      
      // Update UI state after successful save (Requirement 1.7)
      setLlmConfig(config);
      setProviderName(config.provider);
      setModelName(config.model);
      
      // Update connection status and check for automatic mode recovery (Requirement 10.5)
      const requiresApiKey = config.provider === 'openai' || config.provider === 'anthropic';
      const wasInFallbackMode = isFallbackMode;
      
      if (requiresApiKey && !config.apiKey) {
        setConnectionStatus('fallback');
        setIsFallbackMode(true);
        
        // Add system message about fallback mode (Requirement 4.6)
        const systemMessage: Message = {
          id: Date.now().toString(),
          type: 'system',
          content: '⚠️ Connection status: Offline mode. API key required for live AI responses.',
          timestamp: new Date(),
        };
        addMessage(systemMessage);
      } else {
        // Service is now configured, switch from fallback to live mode (Requirement 10.5)
        setConnectionStatus('online');
        setIsFallbackMode(false);
        
        // Add system message about mode recovery if we were in fallback mode (Requirement 4.6)
        if (wasInFallbackMode) {
          const providerNames: Record<string, string> = {
            openai: 'OpenAI',
            anthropic: 'Anthropic',
            local: 'Local',
            custom: 'Custom',
          };
          
          const systemMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: `✅ Connection status: Online. Connected to ${providerNames[config.provider] || config.provider} (${config.model}). Live AI responses enabled.`,
            timestamp: new Date(),
          };
          addMessage(systemMessage);
        }
      }
      
      // Configuration saved successfully
      console.log('LLM configuration saved');
    }, CONFIG_DEBOUNCE_DELAY);
  }, [isFallbackMode, addMessage]);

  // Handle connection validation
  const handleValidateConnection = async (config: LLMConfig): Promise<boolean> => {
    // Mock validation for now - in real implementation, this would test the actual connection
    console.log('Validating connection for provider:', config.provider);
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate successful validation
        resolve(true);
      }, 1500);
    });
  };

  // Handle language change
  const handleLanguageChange = useCallback((language: LanguageCode) => {
    // Persist language preference on selection (Requirements 2.4, 6.5)
    try {
      saveLanguagePreference(language, false);
      console.log('Language preference persisted to localStorage:', language);
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
    console.log('System prompt updated for language:', language, systemPrompt);
    
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
      className={`flex flex-col ${height ? '' : 'min-h-[400px] max-h-[70vh]'} bg-gray-900 ${isDetached ? '' : 'rounded-lg border border-gray-700 shadow-2xl'} overflow-hidden transition-all duration-300`}
      style={height ? { height } : {}}
      id="landing-chatbox-container"
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
          onClick={() => setShowConfigDialog(true)}
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
                    onClick={() => setShowConfigDialog(true)}
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
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
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
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Buttons (Barre Ghost) */}
      <div className="px-4 py-2 bg-gray-900/40 border-t border-gray-700/50 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('character')} className="h-8 px-2.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-full border border-transparent hover:border-blue-400/20">
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-medium">Perso</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Créer un personnage</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('location')} className="h-8 px-2.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded-full border border-transparent hover:border-green-400/20">
                <MapPin className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-medium">Lieu</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Créer un lieu</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('object')} className="h-8 px-2.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded-full border border-transparent hover:border-yellow-400/20">
                <Package className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-medium">Objet</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Créer un objet</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('shot')} className="h-8 px-2.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded-full border border-transparent hover:border-purple-400/20">
                <Video className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-medium">Shot</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Créer un shot</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('scenario')} className="h-8 px-2.5 text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10 rounded-full border border-transparent hover:border-cyan-400/20">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-medium">Scénario</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Écrire un scénario</TooltipContent>
          </Tooltip>

          <div className="h-4 w-[1px] bg-gray-700/50 mx-1 flex-shrink-0" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" onClick={() => handleQuickAction('ghost')} className="h-8 px-2.5 text-orange-400/80 hover:text-orange-400 hover:bg-orange-400/10 rounded-full border border-orange-400/10 hover:border-orange-400/30">
                <Ghost className="w-3.5 h-3.5 mr-1.5" /> <span className="text-[11px] font-bold tracking-tight">GHOST</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Conseils stratégiques du Ghost Tracker</TooltipContent>
          </Tooltip>
        </TooltipProvider>
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

      {/* Input Area */}
      <div 
        className="pt-4 px-4 pb-2 bg-gray-800 border-t border-gray-700"
        role="form"
        aria-label="Message input"
      >
        {/* Prompt Improvement Toolbar */}
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleImprovePrompt('improve')} 
                  disabled={!inputValue.trim() || isImproving}
                  className="h-7 w-7 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10"
                >
                  <Wand2 className={`w-3.5 h-3.5 ${isImproving ? 'animate-pulse' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Améliorer le prompt</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleImprovePrompt('shorter')} 
                  disabled={!inputValue.trim() || isImproving}
                  className="h-7 w-7 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Raccourcir</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleImprovePrompt('longer')} 
                  disabled={!inputValue.trim() || isImproving}
                  className="h-7 w-7 text-gray-400 hover:text-green-400 hover:bg-green-400/10"
                >
                  <Type className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Détailler</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleImprovePrompt('improve')} // Placeholder for optimize
                  disabled={!inputValue.trim() || isImproving}
                  className="h-7 w-7 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                >
                  <Zap className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Optimiser pour le modèle</TooltipContent>
            </Tooltip>
            
            <div className="flex-1" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setInputValue('')} 
                  disabled={!inputValue.trim()}
                  className="h-7 w-7 text-gray-400 hover:text-red-400 hover:bg-red-400/10"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-xs">Effacer tout</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="flex items-end gap-2">
          {/* File & Screen Capture Group */}
          <div className="flex flex-col gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Paperclip className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Joindre un fichier</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleScreenCapture}
                    className="h-9 w-9 text-gray-400 hover:text-purple-400 hover:bg-gray-700"
                  >
                    <PlusSquare className="w-5 h-5 text-purple-400" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Capture de zone (Tous écrans)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,image/*,.pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text Input */}
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 min-h-[132px] max-h-[480px] pr-10 bg-gray-700 border-gray-600 text-white placeholder:text-gray-500 resize-none shadow-inner"
              rows={3}
            />
            {/* Microphone Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleVoiceRecording}
                    className={`absolute right-3 bottom-2.5 p-1 rounded-full transition-all ${
                      isListening ? 'bg-red-500 animate-pulse text-white' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{isListening ? "Arrêter l'enregistrement" : "Enregistrer la voix"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Send Button */}
          <Button
            type="button"
            onClick={handleSend}
            disabled={(!inputValue.trim() && attachments.length === 0) || isStreaming}
            className={`h-11 w-11 rounded-full flex-shrink-0 transition-transform active:scale-95 ${
              isStreaming ? 'bg-gray-600' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        <p className="text-[10px] text-gray-500 mt-1 ml-1">
          {isListening ? "🎙️ Transcription en cours..." : "Appuyez sur Entrée pour envoyer • Shift+Entrée pour nouvelle ligne"}
        </p>
      </div>

      {/* LLM Configuration Dialog */}
      <LLMConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        currentConfig={llmConfig}
        onSave={handleConfigSave}
        onValidateConnection={handleValidateConnection}
      />
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

  // Help/capabilities requests
  if (
    input.includes('aide') || input.includes('help') || 
    input.includes('comment') || input.includes('how') ||
    input.includes('que peux') || input.includes('what can')
  ) {
    return "Je peux vous aider avec:\n\n• Créer et organiser des shots\n• Ajouter des transitions entre les scènes\n• Configurer l'audio et les effets sonores\n• Suggérer des effets visuels\n• Optimiser votre workflow de production\n\nCommencez par créer ou ouvrir un projet, puis je pourrai vous assister dans votre création!";
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

  // Default response
  return "Je suis là pour vous aider avec StoryCore! Pour commencer, créez un nouveau projet ou ouvrez un projet existant en utilisant les boutons ci-dessus. Ensuite, je pourrai vous assister dans la création de votre storyboard, l'ajout d'effets, et bien plus encore.";
}

