import type { ChatMessage, Shot, Project, Asset } from '@/types';

export interface ChatContext {
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  selectedShotId: string | null;
}

export interface ChatAction {
  type: 'addShot' | 'updateShot' | 'deleteShot' | 'addTransition' | 'addAudio' | 'addText';
  payload: any;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: ChatAction[];
}

/**
 * ChatService handles AI-powered chat interactions with project context awareness
 */
export class ChatService {
  private context: ChatContext;
  private conversationHistory: ChatMessage[] = [];

  constructor(context: ChatContext) {
    this.context = context;
  }

  /**
   * Update the chat context with current project state
   */
  updateContext(context: Partial<ChatContext>): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * Add a message to conversation history
   */
  addToHistory(message: ChatMessage): void {
    this.conversationHistory.push(message);
  }

  /**
   * Get conversation history
   */
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Process user input and generate AI response with context awareness
   */
  async processMessage(userInput: string): Promise<ChatResponse> {
    const input = userInput.toLowerCase();

    // Analyze intent
    const intent = this.analyzeIntent(input);

    // Generate context-aware response
    switch (intent.type) {
      case 'create_shots':
        return this.handleCreateShots(intent, input);

      case 'modify_shot':
        return this.handleModifyShot(intent, input);

      case 'add_transition':
        return this.handleAddTransition(intent, input);

      case 'add_audio':
        return this.handleAddAudio(intent, input);

      case 'add_text':
        return this.handleAddText(intent, input);

      case 'suggest_assets':
        return this.handleSuggestAssets(intent, input);

      case 'project_info':
        return this.handleProjectInfo();

      default:
        return this.handleGeneral(input);
    }
  }

  /**
   * Analyze user intent from input
   */
  private analyzeIntent(input: string): { type: string; confidence: number; params: any } {
    // Create/add shots
    if (
      input.match(/create|add|make|generate/i) &&
      input.match(/shot|scene|sequence/i)
    ) {
      return {
        type: 'create_shots',
        confidence: 0.9,
        params: {
          count: this.extractNumber(input) || 1,
          theme: this.extractTheme(input),
        },
      };
    }

    // Modify existing shot
    if (
      input.match(/change|modify|update|edit/i) &&
      (input.match(/shot|scene/i) || this.context.selectedShotId)
    ) {
      return {
        type: 'modify_shot',
        confidence: 0.8,
        params: {
          shotId: this.context.selectedShotId,
        },
      };
    }

    // Add transition
    if (input.match(/transition|fade|wipe|dissolve|slide/i)) {
      return {
        type: 'add_transition',
        confidence: 0.85,
        params: {
          transitionType: this.extractTransitionType(input),
        },
      };
    }

    // Add audio
    if (input.match(/audio|sound|music|voiceover|narration/i)) {
      return {
        type: 'add_audio',
        confidence: 0.85,
        params: {
          audioType: this.extractAudioType(input),
        },
      };
    }

    // Add text
    if (input.match(/text|title|caption|subtitle/i)) {
      return {
        type: 'add_text',
        confidence: 0.8,
        params: {},
      };
    }

    // Suggest assets
    if (input.match(/suggest|recommend|find/i) && input.match(/asset|image|template/i)) {
      return {
        type: 'suggest_assets',
        confidence: 0.75,
        params: {},
      };
    }

    // Project info
    if (input.match(/how many|count|list|show|what/i)) {
      return {
        type: 'project_info',
        confidence: 0.7,
        params: {},
      };
    }

    return { type: 'general', confidence: 0.5, params: {} };
  }

  /**
   * Handle shot creation requests
   */
  private handleCreateShots(intent: any, input: string): ChatResponse {
    const { count, theme } = intent.params;
    const actions: ChatAction[] = [];

    for (let i = 0; i < count; i++) {
      const shot: Shot = {
        id: `shot-${Date.now()}-${i}`,
        title: `${theme} - Shot ${this.context.shots.length + i + 1}`,
        description: `A ${theme} scene`,
        duration: 5,
        position: this.context.shots.length + i,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      };

      actions.push({
        type: 'addShot',
        payload: shot,
      });
    }

    return {
      message: `I've created ${count} ${count === 1 ? 'shot' : 'shots'} for your ${theme} sequence. ${
        this.context.shots.length === 0
          ? 'This is your first shot!'
          : `You now have ${this.context.shots.length + count} shots total.`
      }`,
      suggestions: [
        'Add transitions between shots',
        'Suggest audio for this sequence',
        'Add text overlays',
      ],
      actions,
    };
  }

  /**
   * Handle shot modification requests
   */
  private handleModifyShot(intent: any, input: string): ChatResponse {
    const { shotId } = intent.params;

    if (!shotId) {
      return {
        message: 'Please select a shot first, then tell me what you want to change.',
        suggestions: ['Select a shot from the canvas'],
      };
    }

    const shot = this.context.shots.find((s) => s.id === shotId);
    if (!shot) {
      return {
        message: "I couldn't find that shot. Please select a valid shot.",
      };
    }

    return {
      message: `I can help you modify "${shot.title}". What would you like to change? You can update the title, description, duration, or add effects.`,
      suggestions: [
        'Change the duration to 10 seconds',
        'Add a blur effect',
        'Update the description',
      ],
    };
  }

  /**
   * Handle transition addition requests
   */
  private handleAddTransition(intent: any, input: string): ChatResponse {
    const { transitionType } = intent.params;

    if (this.context.shots.length < 2) {
      return {
        message: 'You need at least 2 shots to add transitions. Create more shots first!',
        suggestions: ['Create a 3-shot sequence'],
      };
    }

    return {
      message: `I recommend using a '${transitionType}' transition for smooth scene changes. ${
        transitionType === 'fade'
          ? 'Fades work great for gentle transitions.'
          : transitionType === 'wipe'
            ? 'Wipes are perfect for dramatic cuts.'
            : 'This transition will add visual interest to your sequence.'
      } You can adjust the duration in the Properties Panel.`,
      suggestions: [
        'Apply this transition to all shots',
        'Try a different transition type',
        'Adjust transition duration',
      ],
    };
  }

  /**
   * Handle audio addition requests
   */
  private handleAddAudio(intent: any, input: string): ChatResponse {
    const { audioType } = intent.params;

    const recommendations: Record<string, string> = {
      action: 'intense orchestral music with surround sound positioning',
      dialogue: 'clear center-channel audio with voice clarity enhancement',
      ambient: 'subtle ambient sounds with wide stereo imaging',
      music: 'balanced stereo mix with appropriate EQ',
      voiceover: 'AI-generated narration with professional voice clarity',
    };

    const recommendation = recommendations[audioType] || recommendations.ambient;

    return {
      message: `For ${audioType} scenes, I suggest using ${recommendation}. You can configure this in the Audio Panel.`,
      suggestions: [
        'Add background music',
        'Generate voiceover narration',
        'Configure surround sound',
      ],
    };
  }

  /**
   * Handle text addition requests
   */
  private handleAddText(intent: any, input: string): ChatResponse {
    if (!this.context.selectedShotId) {
      return {
        message: 'Please select a shot first, then I can help you add text overlays.',
        suggestions: ['Select a shot from the canvas'],
      };
    }

    return {
      message:
        'You can add text overlays in the Properties Panel. Choose from title templates or create custom text with animations like fade-in, slide, or typewriter effects.',
      suggestions: [
        'Add a title with fade-in animation',
        'Create a subtitle with typewriter effect',
        'Use a title template',
      ],
    };
  }

  /**
   * Handle asset suggestion requests
   */
  private handleSuggestAssets(intent: any, input: string): ChatResponse {
    const assetCount = this.context.assets.length;

    if (assetCount === 0) {
      return {
        message:
          "You don't have any assets yet. Upload images, audio files, or templates to your Asset Library to use them in your shots.",
        suggestions: ['Upload an image', 'Upload audio files'],
      };
    }

    return {
      message: `You have ${assetCount} ${assetCount === 1 ? 'asset' : 'assets'} in your library. You can drag them onto the canvas to create new shots or add them to existing shots.`,
      suggestions: ['Show me the asset library', 'Upload more assets'],
    };
  }

  /**
   * Handle project information requests
   */
  private handleProjectInfo(): ChatResponse {
    const shotCount = this.context.shots.length;
    const totalDuration = this.context.shots.reduce((sum, shot) => sum + shot.duration, 0);

    if (shotCount === 0) {
      return {
        message:
          "Your project is empty. Let's create some shots to get started!",
        suggestions: [
          'Create a 3-shot sequence',
          'Upload assets to the library',
        ],
      };
    }

    return {
      message: `Your project has ${shotCount} ${shotCount === 1 ? 'shot' : 'shots'} with a total duration of ${totalDuration} seconds. ${
        this.context.project?.project_name
          ? `Project name: "${this.context.project.project_name}"`
          : ''
      }`,
      suggestions: [
        'Add more shots',
        'Preview the sequence',
        'Export the project',
      ],
    };
  }

  /**
   * Handle general queries
   */
  private handleGeneral(input: string): ChatResponse {
    return {
      message:
        "I can help you create shots, add transitions, suggest audio settings, and more. What would you like to do?",
      suggestions: [
        'Create a new shot sequence',
        'Add transitions between shots',
        'Suggest audio for my scenes',
      ],
    };
  }

  /**
   * Extract number from text
   */
  private extractNumber(text: string): number | null {
    const match = text.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }

  /**
   * Extract theme from text
   */
  private extractTheme(text: string): string {
    const themes = [
      'sunrise',
      'sunset',
      'action',
      'dialogue',
      'landscape',
      'portrait',
      'nature',
      'city',
      'night',
      'day',
    ];
    for (const theme of themes) {
      if (text.includes(theme)) return theme;
    }
    return 'scene';
  }

  /**
   * Extract transition type from text
   */
  private extractTransitionType(text: string): string {
    if (text.includes('fade')) return 'fade';
    if (text.includes('wipe')) return 'wipe';
    if (text.includes('dissolve')) return 'dissolve';
    if (text.includes('slide')) return 'slide';
    return 'fade';
  }

  /**
   * Extract audio type from text
   */
  private extractAudioType(text: string): string {
    if (text.includes('action')) return 'action';
    if (text.includes('dialogue') || text.includes('speech')) return 'dialogue';
    if (text.includes('music')) return 'music';
    if (text.includes('voiceover') || text.includes('narration')) return 'voiceover';
    return 'ambient';
  }
}

/**
 * Create a chat service instance with current context
 */
export function createChatService(context: ChatContext): ChatService {
  return new ChatService(context);
}
