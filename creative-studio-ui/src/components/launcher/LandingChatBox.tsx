/* cspell:ignore Chatbox chatbox openai openai Anthropic Anthropic Italiano Português creer moodboard Moodboard protag antag alli métrage trage nums upscaler trage trace track tracking */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Paperclip, Sparkles, MessageSquare, AlertCircle, Download, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { checkOllamaStatus } from '@/services/ollamaConfig';
import { StatusIndicator, ConnectionStatus } from './StatusIndicator';
import { LanguageSelector } from './LanguageSelector';
import { LLMConfigDialog } from './LLMConfigDialog';
import { TypingIndicator } from './TypingIndicator';
import { AgentAudioVisualizer } from '@/components/ui/AgentAudioVisualizer';
import { VoiceTextService } from '@/services/VoiceTextService';
import { type LLMConfig, LLMService, type LLMRequest, type ErrorRecoveryOptions, LLMError } from '@/services/llmService';
import { buildSystemPrompt } from '@/utils/systemPromptBuilder';
import { getWelcomeMessage } from '@/utils/chatboxTranslations';
import { InlineLLMError } from '@/components/wizard/LLMErrorDisplay';
import { getInitialLanguagePreference } from '@/utils/languageDetection';
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
import { 
  UserPlus, 
  MapPin, 
  Package, 
  Video, 
  Ghost, 
  Mic, 
  MicOff, 
  Wand2, 
  Zap, 
  Minimize2, 
  Type, 
  Eraser,
  BookOpen,
  Image as ImageIcon,
  Search,
  Radio,
  FileQuestion,
  MonitorUp,
  Layout,
  Plus,
  Box,
  ExternalLink
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { saveFileToProject } from '@/services/imageStorageService';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { type ProjectCreationRequest } from '@/services/chatService';
import { type Character, type Location as ProductionLocation, type SequencePlan, type StoryObject } from '@/types';
import { projectCreationService } from '@/services/ProjectCreationService';
import { useLLMConfig } from '@/services/llmConfigService'; // NEW: Use unified LLM config

// ============================================================================
// Internal Components
// ============================================================================

const ToolIcon: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  switch (id) {
    case 'character': return <UserPlus className={className} />;
    case 'location': return <MapPin className={className} />;
    case 'object': return <Package className={className} />;
    case 'shot': return <Video className={className} />;
    case 'scenario': return <BookOpen className={className} />;
    case 'video': return <Sparkles className={className} />;
    case 'audio': return <Radio className={className} />;
    case 'ghost': return <Ghost className={className} />;
    case 'settings': return <Settings className={className} />;
    default: return <Wand2 className={className} />;
  }
};

const ToolButton: React.FC<{ id: string; onAction: (id: string, direct: boolean) => void }> = ({ id, onAction }) => {
  const colors: Record<string, string> = {
    character: 'text-blue-400 border-blue-400/30 hover:bg-blue-400/10',
    location: 'text-green-400 border-green-400/30 hover:bg-green-400/10',
    object: 'text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10',
    shot: 'text-purple-400 border-purple-400/30 hover:bg-purple-400/10',
    scenario: 'text-cyan-400 border-cyan-400/30 hover:bg-cyan-400/10',
    video: 'text-indigo-400 border-indigo-400/30 hover:bg-indigo-400/10',
    audio: 'text-pink-400 border-pink-400/30 hover:bg-pink-400/10',
    ghost: 'text-orange-400 border-orange-400/30 hover:bg-orange-400/10',
    settings: 'text-gray-400 border-gray-400/30 hover:bg-gray-400/10',
  };

  const labels: Record<string, string> = {
    character: 'Assistant Personnage',
    location: 'Bâtisseur de Lieux',
    object: 'Forgeron d\'Objets',
    shot: 'Duo-Cam / Shot Planner',
    scenario: 'Scenario Editor',
    video: 'Générateur Vidéo',
    audio: 'Production Audio',
    ghost: 'Audit Ghost Tracker',
    settings: 'Paramètres Projet',
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`mt-2 flex items-center gap-2 rounded-xl border bg-transparent py-1.5 h-auto ${colors[id] || 'text-purple-400'}`}
      onClick={() => onAction(id, true)}
    >
      <ToolIcon id={id} className="w-4 h-4" />
      <span className="font-semibold text-xs">{labels[id] || id}</span>
      <ExternalLink className="w-3 h-3 opacity-50" />
    </Button>
  );
};

const parseContentWithTools = (content: string, onAction: (id: string, direct: boolean) => void) => {
  const toolRegex = /\[TOOL:([a-z0-9_-]+)\]/g;
  const parts = content.split(toolRegex);
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      if (parts[i]) elements.push(parts[i]);
    } else {
      elements.push(<ToolButton key={i} id={parts[i]} onAction={onAction} />);
    }
  }

  return elements.length > 0 ? elements : [content];
};

// ============================================================================
// Helpers
// ============================================================================

/**
 * Converts a File object to a base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/*;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Converts a File object to a data URL
 */
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

// ============================================================================
// Internal Components
// ============================================================================

interface AttachmentPreviewItemProps {
  file: File;
  onRemove: () => void;
}

const AttachmentPreviewItem: React.FC<AttachmentPreviewItemProps> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith('image/');
  const [previewUrl] = useState<string>(() => isImage ? URL.createObjectURL(file) : '');

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <li
      className="group flex items-center gap-2 px-3 py-1.5 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md rounded-xl text-xs text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700/50 transition-all hover:border-purple-500/50 hover:shadow-md"
    >
      {isImage ? (
        <div className="w-8 h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
          <img src={previewUrl} alt="preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-8 h-8 flex items-center justify-center rounded-md bg-white dark:bg-gray-700 shadow-sm border border-slate-200 dark:border-slate-600">
          <Paperclip className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
        </div>
      )}
      <div className="flex flex-col gap-0.5 min-w-0 max-w-[120px]">
        <span className="truncate font-medium">{file.name}</span>
        <span className="text-[9px] text-slate-400 tabular-nums">{(file.size / 1024).toFixed(0)} KB</span>
      </div>
      <button
        onClick={onRemove}
        className="ml-1 p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        aria-label={`Remove ${file.name}`}
        title={`Remove ${file.name}`}
      >
        <div className="w-4 h-4 flex items-center justify-center text-sm font-bold">×</div>
      </button>
    </li>
  );
};

// ============================================================================
// Constants
// ============================================================================

// const MESSAGE_HISTORY_LIMIT = 100; // Maximum number of messages to keep in history
// const CONFIG_DEBOUNCE_DELAY = 500; // Removed as no longer needed with unified config

// ============================================================================
// Types
// ============================================================================

import { type ChatAttachment, type ChatMessage } from '@/types';
import { persistenceService } from '@/services/PersistenceService';

interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  isStreaming?: boolean;
  streamComplete?: boolean;
  error?: ErrorRecoveryOptions;
  ai_coherence_data?: unknown;
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
  const { chatMessages: storeMessages, addChatMessage, setChatMessages } = useAppStore();
  
  // Helper to convert store messages to local Message format with proper type guards
  const toLocalMessages = useCallback((msgs: ChatMessage[]): Message[] => {
    return msgs?.map(msg => ({
      id: msg.id,
      type: msg.role === 'user' ? 'user' : msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'error',
      content: msg.content || '',
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      attachments: msg.attachments || [],
      isStreaming: msg.isStreaming || false,
      streamComplete: msg.streamComplete || false,
    })) || [];
  }, []);
  
  const messages = toLocalMessages(storeMessages);
  
  const setMessages = useCallback((msgs: Message[] | ((prev: Message[]) => Message[])) => {
    if (typeof msgs === 'function') {
      const currentMessages = toLocalMessages(useAppStore.getState().chatMessages);
      const updated = msgs(currentMessages);
      // Convert back to store format
      const storeMsgs = updated.map(msg => ({
        id: msg.id,
        role: msg.type as any,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments,
        isStreaming: msg.isStreaming,
        streamComplete: msg.streamComplete,
      }));
      setChatMessages(storeMsgs);
    } else {
      const storeMsgs = msgs.map(msg => ({
        id: msg.id,
        role: msg.type as any,
        content: msg.content,
        timestamp: msg.timestamp,
        attachments: msg.attachments,
        isStreaming: msg.isStreaming,
        streamComplete: msg.streamComplete,
      }));
      setChatMessages(storeMsgs);
    }
  }, [setChatMessages, toLocalMessages]);
  const [inputValue, setInputValue] = useState('');

  const [attachments, setAttachments] = useState<File[]>([]);
  const [isOllamaAvailable, setIsOllamaAvailable] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [providerName, setProviderName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('');
  const { config: llmConfig, updateConfig, validateConnection: validateLLMConnection } = useLLMConfig();
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => getInitialLanguagePreference() as LanguageCode);
  const [llmService, setLlmService] = useState<LLMService | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [currentStreamRequestId, setCurrentStreamRequestId] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const configDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Auto-save discussion to project (Requirement: Discussion persistence)
  const { 
    project, 
    selectedShotId,
    showCharacterWizard,
    showLocationWizard,
    showObjectWizard,
    showWorldWizard,
    showScenarioBuilder,
    showVideoEditorWizard,
    showAudioProductionWizard,
  } = useAppStore();

  const activeWizards = useMemo(() => {
    const active = [];
    if (showCharacterWizard) active.push('Character Creator');
    if (showLocationWizard) active.push('Location Builder');
    if (showObjectWizard) active.push('Object Smith');
    if (showWorldWizard) active.push('World Bible');
    if (showScenarioBuilder) active.push('Scenario Editor');
    if (showVideoEditorWizard) active.push('Video Editor');
    if (showAudioProductionWizard) active.push('Audio Production');
    return active;
  }, [
    showCharacterWizard, showLocationWizard, showObjectWizard, 
    showWorldWizard, showScenarioBuilder, showVideoEditorWizard, 
    showAudioProductionWizard
  ]);

  const projectContext = useMemo(() => ({
    projectName: project?.project_name,
    genre: project?.projectSetup?.genre,
    tone: project?.projectSetup?.tone,
    visualStyle: project?.projectSetup?.visualStyle,
    targetAudience: project?.projectSetup?.targetAudience,
    currentShot: selectedShotId ?? undefined,
    activeWizards
  }), [project, selectedShotId, activeWizards]);

  useEffect(() => {
    const projectPath: string | undefined = project?.path;
    if (projectPath && messages.length > 0) {
      const saveDiscussion = async () => {
        try {
          await persistenceService.saveDiscussionFile(projectPath, storeMessages);
        } catch (error) {
          console.error('[LandingChatBox] Discussion save failed:', error);
        }
      };
      
      // Debounce save
      const timer = setTimeout(saveDiscussion, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, storeMessages, project?.path]);

  // Ref to break circular dependency between createErrorMessage and handleRetryMessage
  const handleRetryMessageRef = useRef<((userInput: string) => Promise<void>) | null>(null);

  // Helper function to add messages with history limit
  const addMessage = useCallback((newMessage: Message | Message[]) => {
    const messagesToAdd = Array.isArray(newMessage) ? newMessage : [newMessage];
    addChatMessage(messagesToAdd as any);
  }, [addChatMessage]);


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
      addChatMessage(welcomeMessage as any);
    }

  }, [currentLanguage, messages.length, addChatMessage]); // Run when language changes or messages are cleared


  // Listen for global events from AgentFloatingControlBar
  useEffect(() => {
    const onScreenCapture = () => handleScreenCapture();
    const onOpenChatbox = () => { /* Handled externally or by layout state */ };
    const onCloseChatbox = () => { /* keep visible; toggling off is fine too if desired */ };

    window.addEventListener('storycore:trigger-screen-capture', onScreenCapture);
    window.addEventListener('storycore:open-chatbox', onOpenChatbox);
    window.addEventListener('storycore:close-chatbox', onCloseChatbox);
    return () => {
      window.removeEventListener('storycore:trigger-screen-capture', onScreenCapture);
      window.removeEventListener('storycore:open-chatbox', onOpenChatbox);
      window.removeEventListener('storycore:close-chatbox', onCloseChatbox);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Configuration initialization is handled by llmConfigService
  useEffect(() => {
    async function initializeChatbot() {
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
              attachments: msg.attachments?.map(name => ({ name, type: 'unknown', url: '' })),
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

      // Update connection status based on llmConfig
      if (llmConfig) {
        setProviderName(llmConfig.provider);
        setModelName(llmConfig.model);
        setConnectionStatus('online');
        setIsFallbackMode(false);
      } else {
        setConnectionStatus('fallback');
        setIsFallbackMode(true);
      }
    }
    
    initializeChatbot();
  }, [addMessage, llmConfig]);

  // Update LLM service when configuration changes
  useEffect(() => {
    if (!llmConfig) {
      setLlmService(null);
      setConnectionStatus('fallback');
      setIsFallbackMode(true);
      return;
    }

    const service = new LLMService(llmConfig);
    setLlmService(service);
    if (llmConfig) {
      setProviderName(llmConfig.provider);
      setModelName(llmConfig.model);
    }
    setConnectionStatus('online');
    setIsFallbackMode(false);

    return () => {
      if (service) {
        service.cancelAllRequests();
      }
    };
  }, [llmConfig]);

  useEffect(() => {
    const timer = configDebounceTimerRef.current;
    return () => {
      // Cancel any ongoing streaming requests
      if (llmService && currentStreamRequestId) {
        llmService.cancelRequest(currentStreamRequestId);
      }
      
      // Clear debounce timer
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [llmService, currentStreamRequestId]);

  // Auto-scroll to bottom when new messages arrive (only if already near bottom)
  useEffect(() => {
    if (!messagesAreaRef.current) return;
    
    const { scrollHeight, clientHeight, scrollTop } = messagesAreaRef.current;
    // Only auto-scroll if user is within 150px of bottom, OR if this is the very first message
    const isAtBottom = scrollHeight - clientHeight <= scrollTop + 150;
    const isFirstWelcomeMessage = messages.length === 1 && messages[0].id === '1';
    
    if (isAtBottom || isFirstWelcomeMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
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
  }, [setShowConfigDialog, setMessages]); // handleRetryMessageRef, addMessage are stable

  // Helper function to retry a failed message (Requirement 7.6)
  const handleRetryMessage = useCallback(async (userInput: string) => {
    // Remove error messages
    setMessages(prev => prev.filter(msg => msg.type !== 'error'));

    // Resend the message with the same input
    if (!llmService || !llmConfig) { // Added null check for llmConfig
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
      const systemPrompt = buildSystemPrompt(currentLanguage, projectContext);
      
      // Create LLM request
      const request: LLMRequest = {
        prompt: userInput,
        systemPrompt,
        stream: llmConfig.streamingEnabled ?? true,
        temperature: llmConfig.parameters?.temperature,
        maxTokens: llmConfig.parameters?.maxTokens,
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
  }, [llmService, llmConfig, currentLanguage, addMessage, createErrorMessage, setMessages, projectContext]);

  // Update retry ref
  useEffect(() => {
    handleRetryMessageRef.current = handleRetryMessage;
  }, [handleRetryMessage]);

  // Handle quick action (Requirements for character, location, object, shot)
  const handleQuickAction = useCallback(async (action: string, directOpen: boolean = false) => {
    // Check for image attachments for vision-based creation
    const imageFiles = attachments.filter(f => f.type.startsWith('image/'));
    const hasImage = imageFiles.length > 0;
    
    // Get store actions
    const store = useAppStore.getState();

    if (directOpen) {
      switch (action) {
        case 'character': store.setShowCharacterWizard(true, hasImage ? { imageFile: imageFiles[0] } : undefined); break;
        case 'location': store.setShowLocationWizard(true, hasImage ? { imageFile: imageFiles[0] } : undefined); break;
        case 'object': store.setShowObjectWizard(true, hasImage ? { imageFile: imageFiles[0] } : undefined); break;
        case 'shot': store.openShotWizard(); break;
        case 'scenario': store.setShowScenarioBuilder(true); break;
        case 'ghost': store.setShowGhostTrackerWizard(true); break;
        case 'settings': store.setShowGeneralSettings(true); break;
        case 'video': store.setShowVideoEditorWizard(true); break;
        case 'audio': store.setShowAudioProductionWizard(true); break;
        case 'world': store.setShowWorldWizard(true); break;
        default: break;
      }
      return;
    }

    let prompt = '';
    switch (action) {
      case 'character': 
        if (hasImage) {
          store.setShowCharacterWizard(true, { imageFile: imageFiles[0] });
          toast({ title: "Assistant Personnage", description: "Lancement de la synthèse à partir de l'image..." });
          return;
        }
        prompt = currentLanguage === 'fr' 
          ? "Je souhaite créer un nouveau personnage pour mon projet. Peux-tu m'aider à définir son background et sa personnalité ?"
          : "I want to create a new character for my project. Can you help me define their background and personality?"; 
        break;
      case 'location': 
        if (hasImage) {
          store.setShowLocationWizard(true, { imageFile: imageFiles[0] });
          toast({ title: "Assistant Lieu", description: "Lancement du bâtisseur à partir de l'image..." });
          return;
        }
        prompt = currentLanguage === 'fr'
          ? "Je dois concevoir un nouveau lieu (décor/environnement). Quelles idées peux-tu me proposer ?"
          : "I need to design a new location. What ideas can you suggest?"; 
        break;
      case 'object': 
        if (hasImage) {
          store.setShowObjectWizard(true, { imageFile: imageFiles[0] });
          toast({ title: "Assistant Objet", description: "Lancement du forgeron à partir de l'image..." });
          return;
        }
        prompt = currentLanguage === 'fr'
          ? "J'ai besoin d'un objet clé (un accessoire/prop) pour mon histoire. Peux-tu m'aider à le créer ?"
          : "I need a key object/prop for my story. Can you help me create it?"; 
        break;
      case 'shot': 
        prompt = currentLanguage === 'fr'
          ? "J'aimerais planifier un nouveau shot (plan de caméra) pour ma séquence. Peux-tu m'aider à définir le cadrage et l'angle ?"
          : "I would like to plan a new shot (camera plan) for my sequence. Can you help me define the framing and angle?"; 
        break;
      case 'scenario': 
        prompt = currentLanguage === 'fr'
          ? "Je souhaite travailler sur le scénario de mon projet. Peux-tu m'aider à structurer l'intrigue ou à écrire une scène ?"
          : "I want to work on the scenario for my project. Can you help me structure the plot or write a scene?"; 
        break;
      case 'ghost': 
        prompt = currentLanguage === 'fr'
          ? "Peux-tu me donner des conseils du Ghost Tracker sur l'état actuel de mon projet et les améliorations possibles ?"
          : "Can you give me Ghost Tracker advice on the current state of my project and possible improvements?"; 
        break;
      case 'settings':
        prompt = currentLanguage === 'fr' ? "Je souhaite configurer les paramètres de mon projet." : "I want to configure my project settings.";
        break;
      default: return;
    }
    setInputValue(prompt);
  }, [attachments, currentLanguage, toast]);

  // Handle prompt improvement (Requirement 3.1+)
  const handleImprovePrompt = useCallback(async (type: 'improve' | 'shorter' | 'longer') => {
    if (!inputValue.trim()) {
      toast({ 
        title: "Texte requis", 
        description: "Veuillez d'abord saisir un prompt dans la zone de texte pour l'améliorer.",
        variant: "default"
      });
      return;
    }

    if (!llmService) {
      toast({ 
        variant: "destructive", 
        title: "IA non configurée", 
        description: "Veuillez configurer un service LLM (bouton en haut) pour utiliser cette fonction." 
      });
      return;
    }

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
    
    // Check for support first to avoid blinking/crashes
    if (!voiceService.isRecognitionSupported()) {
      const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
      toast({ 
        variant: "default", 
        title: "Microphone indisponible", 
        description: isElectron 
          ? "La reconnaissance vocale Google n'est pas autorisée dans la version Desktop Chromium. Veuillez utiliser le texte." 
          : "Votre navigateur ne supporte pas la reconnaissance vocale."
      });
      return;
    }
    
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
          
          const isMissingKey = error.includes("Clé d'API manquante");
          
          toast({ 
            variant: isMissingKey ? "default" : "destructive", 
            title: isMissingKey ? "Mode Desktop : Aide" : "Erreur vocale", 
            description: error 
          });
        },
        onEnd: () => setIsListening(false),
      });
    }
  }, [isListening, toast]);

  // Handle screen area capture (Requirement "+" button)
  const handleScreenCapture = async (autoAction?: string) => {
    try {
      const isElectron = typeof window !== 'undefined' && 'electronAPI' in window;
      const electronAPI = (window as Window & { electronAPI?: { screen?: { startAreaCapture: () => Promise<string> } } }).electronAPI;
      
      let capturedFile: File | null = null;

      if (isElectron && electronAPI?.screen?.startAreaCapture) {
        const result = await electronAPI.screen.startAreaCapture();
        if (result) {
          // result is already a base64 string from the backend
          const res = await fetch(`data:image/png;base64,${result}`);
          const blob = await res.blob();
          capturedFile = new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' });
        }
      } else if (!isElectron && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        // Fallback for browser mode
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const video = document.createElement('video');
        video.srcObject = stream;
        
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = reject;
        });

        // Small delay to ensure frame is painted
        await new Promise(r => setTimeout(r, 100));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          capturedFile = await new Promise<File | null>((resolve) => {
            canvas.toBlob((blob) => {
              stream.getTracks().forEach(track => track.stop());
              if (blob) {
                resolve(new File([blob], `capture-${Date.now()}.png`, { type: 'image/png' }));
              } else {
                resolve(null);
              }
            }, 'image/png');
          });
        } else {
          stream.getTracks().forEach(track => track.stop());
          throw new Error("Canvas context is null");
        }
      } else {
        toast({ variant: "destructive", title: "Indisponible", description: "La capture d'écran n'est pas supportée dans ce contexte." });
        return;
      }

      if (capturedFile) {
        setAttachments(prev => [...prev, capturedFile as File]);
        toast({ title: "Capture réussie 📸", description: "L'image a été ajoutée." });

        if (autoAction) {
          const store = useAppStore.getState();
          if (autoAction === 'character') {
            store.setShowCharacterWizard(true, { imageFile: capturedFile });
          } else if (autoAction === 'location') {
            store.setShowLocationWizard(true, { imageFile: capturedFile });
          } else if (autoAction === 'object') {
            store.setShowObjectWizard(true, { imageFile: capturedFile });
          }
        }
      }

    } catch (error) {
      console.error('Screen capture error:', error);
      toast({ variant: "destructive", title: "Erreur / Annulé", description: "La capture a été annulée ou a échoué." });
    }
  };

  // Helper to convert chat history to markdown for project tracing
  const messagesToMarkdown = useCallback((msgs: Message[]) => {
    return msgs
      .map(msg => {
        const role = msg.type === 'user' ? 'USER' : 'ASSISTANT';
        const date = new Date(msg.timestamp).toLocaleString();
        return `### ${role} (${date})\n\n${msg.content}\n\n---`;
      })
      .join('\n\n');
  }, []);

  // Handle project creation with enhanced error handling
  const handleProjectCreation = useCallback(async (projectRequest: ProjectCreationRequest) => {
    try {
      // Validate project request
      if (!projectRequest.name || projectRequest.name.trim().length === 0) {
        throw new Error('Project name is required');
      }

      // Add the discussion history to the request
      const requestWithHistory = {
        ...projectRequest,
        discussion: messagesToMarkdown(messages)
      };

      // Use the centralized ProjectCreationService
      const result = await projectCreationService.createProjectAndNavigate(requestWithHistory);
      
      if (result.success) {
        toast({ 
          title: currentLanguage === 'fr' ? "Projet créé avec succès !" : "Project created successfully!",
          description: currentLanguage === 'fr' 
            ? `Le projet "${projectRequest.name}" a été créé et ouvert.` 
            : `Project "${projectRequest.name}" has been created and opened.`
        });
      } else {
        throw new Error(result.error || 'Failed to create project');
      }
    } catch (error) {
      console.error('Project creation failed:', error);
      
      // Enhanced error handling with specific messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                            errorMessage.toLowerCase().includes('connection') ||
                            errorMessage.toLowerCase().includes('timeout');
      
      toast({ 
        variant: "destructive",
        title: currentLanguage === 'fr' ? "Erreur de création" : "Creation Error",
        description: currentLanguage === 'fr' 
          ? isNetworkError 
            ? "Erreur réseau. Vérifiez votre connexion internet et réessayez." 
            : errorMessage === 'Project name is required'
            ? "Le nom du projet est requis. Veuillez spécifier un nom pour votre projet."
            : "Impossible de créer le projet. Vérifiez votre connexion."
          : isNetworkError
            ? "Network error. Please check your internet connection and try again."
            : errorMessage === 'Project name is required'
            ? "Project name is required. Please specify a name for your project."
            : "Failed to create project. Please check your connection."
      });
    }
  }, [messages, messagesToMarkdown, currentLanguage, toast]);

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

    if (!llmConfig) return;

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

    // Convert all attachments to data URLs for stable cross-window storage/sync (fixes Requirement 4.7 & ERR_FILE_NOT_FOUND)
    const processedAttachments = await Promise.all(attachments.map(async f => ({
      name: f.name,
      type: f.type,
      url: await fileToDataUrl(f)
    })));

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: processedAttachments,
    };

    addMessage(newMessage);
    
    // Auto-add attachments to moodboard if project is active
    const appStore = useAppStore.getState();
    if (appStore.project && attachments.length > 0) {
      attachments.forEach(async (file, index) => {
        let finalUrl = processedAttachments[index].url;
        
        // If in Electron, save to project folder
        if (window.electronAPI && appStore.project?.path) {
          const extension = file.name.split('.').pop() || 'png';
          const subDir = 'moodboard/references';
          const id = `ref_${Date.now()}_${index}`;
          const result = await saveFileToProject(file, appStore.project.path, id, subDir, extension);
          if (result.success && result.localPath) {
            finalUrl = result.localPath;
          }
        }

        let refType: 'image' | 'video' | 'texture' | 'pattern' | 'audio' | '3d' | 'document' = 'image';
        if (file.type.startsWith('video/')) refType = 'video';
        else if (file.type.startsWith('audio/')) refType = 'audio';
        else if (file.name.endsWith('.obj') || file.name.endsWith('.glb') || file.name.endsWith('.gltf') || file.name.endsWith('.stl')) refType = '3d';
        else if (file.type === 'application/pdf' || file.type.startsWith('text/') || file.type.includes('word') || file.name.endsWith('.pdf')) refType = 'document';

        appStore.addMoodboardReference({
          url: finalUrl,
          type: refType,
          source: 'upload',
          note: `Added from chat: ${file.name}`
        });
      });
    }
    
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

    // Prepare images for LLM if any (Requirement: Vision Support)
    const imageFiles = attachments.filter(f => f.type.startsWith('image/'));
    const base64Images = await Promise.all(imageFiles.map(fileToBase64));

    // Generate response using LLM service or fallback (Requirement 3.1)
    if (llmService) {
      try {
        // Build language-aware system prompt (Requirement 3.4)
        const systemPrompt = buildSystemPrompt(currentLanguage, projectContext);
        
        // Create LLM request
        const request: LLMRequest = {
          prompt: userInput,
          systemPrompt,
          stream: llmConfig.streamingEnabled,
          images: base64Images.length > 0 ? base64Images : undefined,
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

              // Check if the response contains project creation actions
              const assistantMessage = response.data.content;
              const isProjectCreationRequest = 
                (userInput.toLowerCase().match(/create|make|start|new|cr[ée]|nouveau|faire/i)) &&
                (userInput.toLowerCase().match(/project|video|trailer|projet|vid[ée]o|court-m[ée]trage|film|album/i));

              if (assistantMessage.includes('[TOOL:createProject') || 
                  assistantMessage.toLowerCase().includes('create project') ||
                  assistantMessage.toLowerCase().includes('créer un projet') ||
                  assistantMessage.toLowerCase().includes('créer le projet') ||
                  assistantMessage.toLowerCase().includes('créer projet') ||
                  assistantMessage.toLowerCase().includes('nom du projet') ||
                  isProjectCreationRequest) {
                
                // Parse project creation request from the response
                const projectRequest = parseProjectCreationFromResponse(assistantMessage, userInput);
                if (projectRequest) {
                  await handleProjectCreation(projectRequest);
                }
              }
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

            // Check if the response contains project creation actions
            const assistantMessageContent = response.data.content;
            const isProjectCreationRequest = 
              (userInput.toLowerCase().match(/create|make|start|new|cr[ée]|nouveau|faire/i)) &&
              (userInput.toLowerCase().match(/project|video|trailer|projet|vid[ée]o|court-m[ée]trage|film|album/i));

            if (assistantMessageContent.includes('[TOOL:createProject') || 
                assistantMessageContent.toLowerCase().includes('create project') ||
                assistantMessageContent.toLowerCase().includes('créer un projet') ||
                assistantMessageContent.toLowerCase().includes('créer le projet') ||
                assistantMessageContent.toLowerCase().includes('créer projet') ||
                assistantMessageContent.toLowerCase().includes('nom du projet') ||
                isProjectCreationRequest) {
              
              // Parse project creation request from the response
              const projectRequest = parseProjectCreationFromResponse(assistantMessageContent, userInput);
              if (projectRequest) {
                await handleProjectCreation(projectRequest);
              }
            }
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

  // Helper function to parse project creation request from assistant response
  const parseProjectCreationFromResponse = (assistantMessage: string, userInput: string): ProjectCreationRequest | null => {
    const namePatternMatch = assistantMessage.match(/\[TOOL:createProject:([^:\]]+)(?::([^\]]+))?\]/i);
    let name = namePatternMatch ? namePatternMatch[1].trim() : undefined;
    let formatId = namePatternMatch && namePatternMatch[2] ? namePatternMatch[2].trim() : undefined;

    if (!name) {
      // Extract project name from various patterns
      const nameMatch = assistantMessage.match(/(?:appelé|nommé|named|called|s'appeler)\s*[.:]?\s*["']?([^"',;\n]+)["']?/i)
        || assistantMessage.match(/["']([^"']+)["']/)
        || userInput.match(/(?:appelé|nommé|named|called|s'appeler)\s*[.:]?\s*["']?([^"',;\n]+)["']?/i)
        || userInput.match(/["']([^"']+)["']/);
      
      name = nameMatch ? nameMatch[1].trim() : undefined;
    }

    // Extract theme/universe/genre
    const theme = extractThemeFromInput(userInput);
    const universe = extractUniverseFromInput(userInput);
    const genre = extractGenreFromInput(userInput);

    // Deduce music-album format if not explicitly provided but mentioned in input
    if (!formatId) {
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('album') || lowerInput.includes('collection de titres') || lowerInput.includes('disque')) {
        formatId = 'music-album';
      }
    }

    // Parse characters
    const characters: Character[] = [];
    const charRegex = /\[TOOL:createCharacter:([^:\]]+)(?::([^\]]+))?\]/gi;
    let charMatch;
    while ((charMatch = charRegex.exec(assistantMessage)) !== null) {
      const name = charMatch[1].trim();
      const rawRole = charMatch[2] ? charMatch[2].trim() : 'Protagonist';
      
      // Determine narrative function and archetype from role string
      let narrative_function = rawRole;
      let archetype = 'other';
      
      const lowerRole = rawRole.toLowerCase();
      if (/protag|h[eé]ros|hero/i.test(lowerRole)) {
        archetype = 'hero';
        narrative_function = 'Protagonist';
      } else if (/antag|vilain|villain|n[eéè]m[eéè]sis|loup/i.test(lowerRole)) {
        archetype = 'villain';
        narrative_function = 'Antagonist';
      } else if (/mentor|sage/i.test(lowerRole)) {
        archetype = 'mentor';
        narrative_function = 'Mentor';
      } else if (/alli[eé]|ally|ami/i.test(lowerRole)) {
        archetype = 'ally';
        narrative_function = 'Ally';
      } else if (/catalyst|support/i.test(lowerRole)) {
        archetype = 'other';
        narrative_function = 'Catalyst';
      }

      characters.push({
        character_id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name,
        creation_method: 'auto_generated',
        creation_timestamp: Date.now(),
        version: '1.0',
        role: {
          archetype,
          narrative_function,
          character_arc: 'positive',
        },
        description: `Auto-generated character "${name}" with role ${rawRole}.`,
        visual_identity: {
          hair_color: '',
          hair_style: '',
          hair_length: '',
          eye_color: '',
          eye_shape: '',
          skin_tone: '',
          facial_structure: '',
          distinctive_features: [],
          age_range: 'adult',
          gender: 'unspecified',
          height: '',
          build: '',
          posture: '',
          clothing_style: '',
          color_palette: [],
          reference_images: [],
          reference_sheet_images: [],
        },
        personality: {
          traits: [],
          values: [],
          fears: [],
          desires: [],
          flaws: [],
          strengths: [],
          temperament: '',
          communication_style: '',
        },
        background: {
          origin: '',
          occupation: '',
          education: '',
          family: '',
          significant_events: [],
          current_situation: '',
          backstory: '',
        },
        relationships: [],
      } as Character);
    }

    // Parse locations
    const locations: Record<string, unknown>[] = [];
    const locRegex = /\[TOOL:createLocation:([^:\]]+)(?::([^\]]+))?\]/gi;
    let locMatch;
    while ((locMatch = locRegex.exec(assistantMessage)) !== null) {
      locations.push({
        id: `loc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: locMatch[1].trim(),
        type: locMatch[2] ? locMatch[2].trim() : 'exterior',
        description: 'Auto-generated location from assistant',
      });
    }

    // Parse sequences
    const sequences: Record<string, unknown>[] = [];
    const seqRegex = /\[TOOL:createSequence:([^:\]]+)\]/gi;
    let seqMatch;
    while ((seqMatch = seqRegex.exec(assistantMessage)) !== null) {
      sequences.push({
        id: `seq_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: seqMatch[1].trim(),
        description: 'Auto-generated sequence from assistant',
      });
    }

    // Parse objects
    const objects: Record<string, unknown>[] = [];
    const objRegex = /\[TOOL:createObject:([^:\]]+)(?::([^\]]+))?\]/gi;
    let objMatch;
    while ((objMatch = objRegex.exec(assistantMessage)) !== null) {
      objects.push({
        id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: objMatch[1].trim(),
        type: objMatch[2] ? objMatch[2].trim() : 'prop',
        description: 'Auto-generated object from assistant',
      });
    }

    return {
      name: name || `Project ${new Date().toISOString().split('T')[0]}`,
      theme,
      universe,
      genre,
      formatId,
      description: assistantMessage.replace(/\[TOOL:[^\]]+\]/gi, '').replace(/\n+/g, '\n').trim() || userInput,
      initialEntities: {
        characters: characters.length > 0 ? characters as unknown as Character[] : undefined,
        locations: locations.length > 0 ? locations as unknown as ProductionLocation[] : undefined,
        sequences: sequences.length > 0 ? sequences as unknown as SequencePlan[] : undefined,
        objects: objects.length > 0 ? objects as unknown as StoryObject[] : undefined,
      },
      settings: {
        created_by: 'llm-assistant',
        creation_timestamp: new Date().toISOString(),
      },
    };
  };

  // Helper function to extract theme from input
  const extractThemeFromInput = (input: string): string | undefined => {
    const themePatterns = [
      /(?:theme|setting|atmosphere|mood)(?:\s+is|\s+of)?\s+["']?([^"',.]+)["']?/i,
      /(?:in|with)\s+(?:a|an)\s+([a-z\s]+?)\s+(?:theme|setting|atmosphere)/i,
    ];

    for (const pattern of themePatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Check for common theme keywords
    const themes = [
      'fantasy', 'sci-fi', 'science fiction', 'horror', 'thriller', 'comedy', 'drama',
      'action', 'adventure', 'romance', 'mystery', 'western', 'noir', 'cyberpunk',
      'steampunk', 'post-apocalyptic', 'medieval', 'futuristic', 'historical',
      'tropical', 'arctic', 'desert', 'urban', 'rural', 'space', 'underwater',
    ];

    for (const theme of themes) {
      if (input.toLowerCase().includes(theme)) {
        return theme;
      }
    }

    return undefined;
  };

  // Helper function to extract universe from input
  const extractUniverseFromInput = (input: string): string | undefined => {
    const universePatterns = [
      /(?:universe|world|realm|dimension)(?:\s+where|\s+in which|\s+with)?\s+([^,.]+)/i,
      /(?:in|set in)\s+(?:a|an)\s+(?:universe|world|realm)\s+(?:where|with)?\s+([^,.]+)/i,
      /where\s+([^,.]+?)(?:\s+and|\s+but|$)/i,
    ];

    for (const pattern of universePatterns) {
      const match = input.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  };

  // Helper function to extract genre from input
  const extractGenreFromInput = (input: string): string | undefined => {
    const genres = [
      'action', 'adventure', 'comedy', 'drama', 'fantasy', 'horror', 'mystery',
      'romance', 'sci-fi', 'science fiction', 'thriller', 'western', 'animation',
      'documentary', 'musical', 'crime', 'war', 'biographical', 'historical',
    ];

    const lowerInput = input.toLowerCase();
    for (const genre of genres) {
      if (lowerInput.includes(genre)) {
        return genre;
      }
    }

    return undefined;
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

  // Configuration handlers
  const handleConfigSave = useCallback(async (configValue: LLMConfig) => {
    try {
      await updateConfig(configValue);
      
      // Update connection status and check for automatic mode recovery (Requirement 10.5)
      const requiresApiKey = configValue.provider === 'openai' || configValue.provider === 'anthropic';
      const wasInFallbackMode = isFallbackMode;
      
      if (requiresApiKey && !configValue.apiKey) {
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
            local_ollama: 'Ollama',
          };
          
          const systemMessage: Message = {
            id: Date.now().toString(),
            type: 'system',
            content: `✅ Connection status: Online. Connected to ${providerNames[configValue.provider] || configValue.provider} (${configValue.model}). Live AI responses enabled.`,
            timestamp: new Date(),
          };
          addMessage(systemMessage);
        }
      }
      
      toast({
        title: "Configuration sauvegardée",
        description: "Les nouveaux paramètres LLM ont été appliqués.",
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast({
        title: "Erreur de sauvegarde",
        description: "Une erreur est survenue lors de la sauvegarde de la configuration.",
        variant: "destructive",
      });
    }
  }, [isFallbackMode, addMessage, updateConfig, toast]);

  // Handle connection validation
  const handleValidateConnection = useCallback(async (_configValue: LLMConfig): Promise<boolean> => {
    try {
      return await validateLLMConnection();
    } catch (error) {
      console.error('Validation failed:', error);
      return false;
    }
  }, [validateLLMConnection]);

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
  }, [addMessage, setMessages]);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col ${height ? 'h-full' : 'min-h-[400px] max-h-[70vh]'} ${isDetached ? 'h-full' : 'rounded-[28px] border border-white/25 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]'} overflow-hidden transition-all duration-300 backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-slate-900/70`}
      id="landing-chatbox-container"
      style={height ? { height } : undefined}
    >
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-4 py-3 bg-white/40 dark:bg-slate-800/40 border-b border-white/20 dark:border-slate-700/30"
        role="banner"
        aria-label="Chat header"
      >
        <MessageSquare className="w-5 h-5 text-purple-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-white" id="chatbox-title">Assistant StoryCore</h3>
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
          className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white ml-2"
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
        ref={messagesAreaRef}
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
                  {message.timestamp && (
                    <time dateTime={new Date(message.timestamp).toISOString()}>
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  )}
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
                <div className="text-sm whitespace-pre-wrap">
                  {message.type === 'assistant' 
                    ? parseContentWithTools(message.content, handleQuickAction)
                    : message.content
                  }
                </div>
                {message.attachments && message.attachments.length > 0 && (
                  <div className={`mt-3 flex flex-wrap gap-2 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`} role="list" aria-label="Attachments">
                    {message.attachments.map((attachment, idx) => {
                      const isImage = attachment.type?.startsWith('image/');
                      if (isImage) {
                        return (
                          <div key={idx} className="group relative" role="listitem">
                            <img 
                              src={attachment.url} 
                              alt={attachment.name} 
                              className="w-24 h-24 object-cover rounded-lg border border-white/20 shadow-md transition-all hover:scale-105 hover:shadow-xl cursor-zoom-in"
                              onClick={() => window.open(attachment.url, '_blank')}
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[10px] text-white px-2 py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
                              {attachment.name}
                            </div>
                          </div>
                        );
                      }
                      
                      return (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-slate-200 border border-white/10 transition-colors" role="listitem">
                          <Paperclip className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="truncate max-w-[150px]">{attachment.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Display timestamp after streaming completes (Requirement 8.4) */}
                {!message.isStreaming && message.timestamp && (
                  <span className="text-xs text-gray-400 mt-1 block">
                    <time dateTime={new Date(message.timestamp).toISOString()}>
                      {new Date(message.timestamp).toLocaleTimeString('fr-FR', {
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
      <div className="px-4 py-2 bg-slate-100/40 dark:bg-gray-900/40 border-t border-white/20 dark:border-gray-700/50 flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
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
          className="px-4 py-2 bg-white/40 dark:bg-gray-800/40 border-t border-white/20 dark:border-gray-700/30"
          role="region"
          aria-label="Attached files"
        >
          <ul className="flex flex-wrap gap-2" aria-label="Attachments list">
            {attachments.map((file, idx) => (
              <AttachmentPreviewItem 
                key={`${file.name}-${idx}`} 
                file={file} 
                onRemove={() => setAttachments(attachments.filter((_, i) => i !== idx))} 
              />
            ))}
          </ul>
        </div>
      )}

      {/* Input Area */}
      <div 
        className="pt-4 px-4 pb-2 bg-transparent border-t border-white/20 dark:border-gray-700/30"
        role="form"
        aria-label="Message input"
      >
        <div className="flex items-center gap-1.5 mb-2 px-1">
          <div className="px-2 py-0.5 text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800/50 mr-0.5">
            AI Upgrade
          </div>
          <TooltipProvider>
              <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleImprovePrompt('improve')} 
                  disabled={isImproving || !inputValue.trim()}
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
                  disabled={isImproving || !inputValue.trim()}
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
                  disabled={isImproving || !inputValue.trim()}
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
                  disabled={isImproving || !inputValue.trim()}
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

        <div className="flex items-end gap-2 p-1.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] border border-white/40 dark:border-slate-600/40 shadow-sm focus-within:ring-2 focus-within:ring-purple-500/50 transition-all">
          {/* File & Screen Capture Group */}
          <div className="flex flex-col gap-1">
            <DropdownMenu>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 gap-2 px-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-full transition-all border border-transparent hover:border-gray-600"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-xs font-semibold">Ajouter</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Ajouter divers contenus</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenuContent 
                align="start" 
                side="top"
                className="w-72 rounded-[24px] backdrop-blur-2xl backdrop-saturate-200 bg-white/70 dark:bg-slate-900/70 border border-white/25 dark:border-slate-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-2 mb-4"
              >
                <div>
                  <DropdownMenuItem onSelect={() => fileInputRef.current?.click()} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors">
                    <div className="bg-purple-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Ajouter une image ou un fichier</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={() => handleQuickAction('shot')}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-blue-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Générer avec l'IA</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={() => toast({ title: "Recherche active", description: "L'assistant analyse votre projet pour une recherche ciblée." })}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-green-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Search className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Démarrer une recherche ciblée</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem 
                    onSelect={() => toast({ title: "Module Podcast", description: "Génération de script podcast pour votre projet..." })}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-orange-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Radio className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Créer un podcast</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={() => handleQuickAction('scenario')}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <FileQuestion className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Répondre à un questionnaire</span>
                  </DropdownMenuItem>
                </div>
                
                <DropdownMenuSeparator className="my-1 bg-slate-200 dark:bg-slate-700/50" />
                
                <div>
                  <DropdownMenuItem onSelect={() => handleScreenCapture()} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors">
                    <div className="bg-slate-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <MonitorUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Prendre une capture d'écran simple</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onSelect={() => handleScreenCapture('character')} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors">
                    <div className="bg-indigo-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Capturer & Créer Personnage</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={() => handleScreenCapture('location')} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors">
                    <div className="bg-amber-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Capturer & Créer Lieu</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onSelect={() => handleScreenCapture('object')} className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors">
                    <div className="bg-rose-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Box className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Capturer & Créer Objet</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={() => toast({ title: "Onglets", description: "Gestionnaire d'onglets bientôt disponible." })}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-slate-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Layout className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Ajouter des onglets</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem 
                    onSelect={() => setShowConfigDialog(true)}
                    className="flex items-center gap-3 p-2.5 cursor-pointer rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 focus:bg-white/50 dark:focus:bg-slate-800/50 transition-colors"
                  >
                    <div className="bg-purple-500/10 p-1.5 rounded-lg flex-shrink-0">
                      <Settings className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="font-medium text-sm text-slate-800 dark:text-slate-200">Amélioration / Compte utilisateur</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="audio/*,image/*,.pdf,.txt,.doc,.docx"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="Upload files"
            title="Upload files"
          />

          {/* Text Input */}
          <div className="relative flex-1">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className={`flex-1 min-h-[44px] max-h-[480px] p-2 bg-transparent border-none text-slate-800 dark:text-white placeholder:text-slate-500 resize-none shadow-none focus-visible:ring-0 focus-visible:outline-none focus:ring-0 transition-colors ${isListening ? 'bg-red-500/5 dark:bg-purple-500/10 rounded-md' : ''}`}
              rows={3}
            />
            {/* Audio Visualizer (visible when listening) */}
            {isListening && (
              <div className="absolute left-3 bottom-0 top-0 flex items-center pointer-events-none opacity-60">
                <AgentAudioVisualizer state="listening" size="sm" />
              </div>
            )}
            
            {/* Microphone Button */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleVoiceRecording}
                    className={`absolute right-3 bottom-2.5 p-1.5 rounded-full transition-all ${
                      isListening 
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20' 
                        : 'bg-slate-100 dark:bg-slate-800/50 text-gray-400 hover:text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-500/20'
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

