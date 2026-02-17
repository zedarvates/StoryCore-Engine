import type { ChatMessage, Shot, Project, Asset } from '@/types';

export interface ChatContext {
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  selectedShotId: string | null;
}

export interface ChatAction {
  type: 'addShot' | 'updateShot' | 'deleteShot' | 'addTransition' | 'addAudio' | 'addText' | 'createProject' | 'createCharacter' | 'createLocation' | 'createObject' | 'createDialogue' | 'createStory' | 'createWorld' | 'createScenario' | 'generateImage' | 'generateAudio' | 'generateVideo';
  payload: unknown;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: ChatAction[];
  projectPath?: string;
}

export interface ProjectCreationRequest {
  name: string;
  theme?: string;
  universe?: string;
  genre?: string;
  description?: string;
  settings?: Record<string, unknown>;
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

    // Check for project creation request first
    const projectRequest = this.parseProjectCreationRequest(userInput);
    if (projectRequest) {
      return this.handleProjectCreation(projectRequest, userInput);
    }

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

      // Content creation intents
      case 'create_character':
        return this.handleCreateCharacter(userInput);
      case 'create_location':
        return this.handleCreateLocation(userInput);
      case 'create_object':
        return this.handleCreateObject(userInput);
      case 'create_dialogue':
        return this.handleCreateDialogue(userInput);
      case 'create_story':
        return this.handleCreateStory(userInput);
      case 'create_world':
        return this.handleCreateWorld(userInput);
      case 'create_scenario':
        return this.handleCreateScenario(userInput);

      // Media generation intents
      case 'generate_image':
        return this.handleGenerateImage(userInput);
      case 'generate_audio':
        return this.handleGenerateAudio(userInput);
      case 'generate_video':
        return this.handleGenerateVideo(userInput);

      default:
        return this.handleGeneral(input);
    }
  }

  /**
   * Parse natural language input for project creation requests
   * Extracts project name, theme, universe, genre, and other metadata
   */
  private parseProjectCreationRequest(input: string): ProjectCreationRequest | null {
    const lowerInput = input.toLowerCase();

    // Check if this is a project creation request
    const isProjectCreation =
      (lowerInput.includes('create') || lowerInput.includes('make') || lowerInput.includes('start') || lowerInput.includes('new')) &&
      (lowerInput.includes('project') || lowerInput.includes('video') || lowerInput.includes('trailer'));

    if (!isProjectCreation) {
      return null;
    }

    // Extract project name from various patterns
    let projectName: string | null = null;

    // Pattern 1: "create a project called/named 'X'"
    const namedPattern = /(?:called|named|titled)\s+["']([^"']+)["']/i;
    const namedMatch = input.match(namedPattern);
    if (namedMatch) {
      projectName = namedMatch[1];
    }

    // Pattern 2: "create 'X' project"
    if (!projectName) {
      const quotedPattern = /["']([^"']+)["']\s+(?:project|video|trailer)/i;
      const quotedMatch = input.match(quotedPattern);
      if (quotedMatch) {
        projectName = quotedMatch[1];
      }
    }

    // Pattern 3: "create a [adjective] project" - extract adjective as name
    if (!projectName) {
      const adjectivePattern = /(?:create|make|start|new)\s+(?:a|an)\s+([a-z\s]+?)\s+(?:project|video|trailer)/i;
      const adjectiveMatch = input.match(adjectivePattern);
      if (adjectiveMatch) {
        const extracted = adjectiveMatch[1].trim();
        // Only use if it's not too generic
        if (extracted && !['new', 'video', 'trailer'].includes(extracted)) {
          projectName = extracted;
        }
      }
    }

    // If no name found, generate a default one
    if (!projectName) {
      projectName = `Project ${new Date().toISOString().split('T')[0]}`;
    }

    // Extract theme/universe/genre
    const theme = this.extractThemeFromInput(input);
    const universe = this.extractUniverseFromInput(input);
    const genre = this.extractGenreFromInput(input);

    return {
      name: projectName,
      theme,
      universe,
      genre,
      description: input,
      settings: {
        created_by: 'llm-assistant',
        creation_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Extract theme from natural language input
   */
  private extractThemeFromInput(input: string): string | undefined {
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
  }

  /**
   * Extract universe/world description from natural language input
   */
  private extractUniverseFromInput(input: string): string | undefined {
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
  }

  /**
   * Extract genre from natural language input
   */
  private extractGenreFromInput(input: string): string | undefined {
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
  }

  /**
   * Handle project creation request
   */
  private async handleProjectCreation(
    request: ProjectCreationRequest,
    originalInput: string
  ): Promise<ChatResponse> {
    // Return a response that includes the project creation action
    // The actual project creation will be handled by the component that uses this service
    const themeInfo = request.theme ? ` with a ${request.theme} theme` : '';
    const universeInfo = request.universe ? ` set in a universe where ${request.universe}` : '';
    const genreInfo = request.genre ? ` in the ${request.genre} genre` : '';

    return {
      message: `I'll create a project called "${request.name}"${themeInfo}${universeInfo}${genreInfo}. Setting up the project structure now...`,
      suggestions: [
        'Add characters to the project',
        'Create the first scene',
        'Configure project settings',
      ],
      actions: [
        {
          type: 'createProject',
          payload: request,
        },
      ],
    };
  }

  /**
   * Execute project creation via Electron API
   * This method should be called by the component after receiving a createProject action
   */
  static async executeProjectCreation(request: ProjectCreationRequest): Promise<{
    success: boolean;
    projectPath?: string;
    error?: string;
  }> {
    try {
      // Check if Electron API is available
      if (!window.electronAPI?.project?.create) {
        return {
          success: false,
          error: 'Project creation requires Electron environment',
        };
      }

      // Prepare project data with theme/universe metadata
      const projectData = {
        name: request.name,
        format: {
          schema_version: '1.0',
          capabilities: {
            grid_generation: true,
            promotion_engine: true,
            qa_engine: true,
            autofix_engine: true,
          },
          generation_status: {
            grid: 'pending',
            promotion: 'pending',
          },
          metadata: {
            theme: request.theme,
            universe: request.universe,
            genre: request.genre,
            description: request.description,
            created_by: 'llm-assistant',
            created_at: new Date().toISOString(),
            ...request.settings,
          },
        },
      };

      // Call Electron API to create project
      const project = await window.electronAPI.project.create(projectData);

      return {
        success: true,
        projectPath: project.path,
      };
    } catch (error) {
      console.error('Failed to create project:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Navigate to project dashboard after successful creation
   * This method handles the navigation logic for opening a newly created project
   */
  static navigateToProjectDashboard(projectPath: string): void {
    try {
      // Check if we're in a React Router environment
      if (typeof window !== 'undefined') {
        // Encode the project path for URL safety
        const encodedPath = encodeURIComponent(projectPath);

        // Navigate to the project dashboard
        // The exact route depends on the application's routing structure
        // Common patterns: /project/:path or /dashboard/:path
        window.location.href = `/project/${encodedPath}`;

        // Alternative: If using React Router programmatically
        // This would need to be called from a component with access to navigate()
        // navigate(`/project/${encodedPath}`);
      }
    } catch (error) {
      console.error('Failed to navigate to project dashboard:', error);
      // Fallback: reload the page to show the new project
      window.location.reload();
    }
  }

  /**
   * Complete project creation workflow: create project and navigate to dashboard
   * This is a convenience method that combines creation and navigation
   */
  static async createProjectAndNavigate(request: ProjectCreationRequest): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Execute project creation
    const result = await ChatService.executeProjectCreation(request);

    if (!result.success) {
      return {
        success: false,
        error: result.error,
      };
    }

    // Navigate to the dashboard
    if (result.projectPath) {
      ChatService.navigateToProjectDashboard(result.projectPath);
    }

    return {
      success: true,
    };
  }

  /**
   * Analyze user intent from input
   */
  private analyzeIntent(input: string): { type: string; confidence: number; params: Record<string, unknown> } {
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

    // ======== Content Creation Intents ========

    // Create character (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|make|generate|nouveau|new/i) &&
      input.match(/personnage|character|héros|hero|protagoniste|antagoniste|pnj|npc/i)
    ) {
      return {
        type: 'create_character',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create location (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|make|generate|nouveau|new/i) &&
      input.match(/lieu|location|endroit|place|décor|environnement|setting/i)
    ) {
      return {
        type: 'create_location',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create object (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|make|generate|nouveau|new/i) &&
      input.match(/objet|object|artefact|artifact|item|relique|arme|weapon/i)
    ) {
      return {
        type: 'create_object',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create dialogue (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|[ée]cri[rs]|write|generate/i) &&
      input.match(/dialogue|conversation|réplique/i)
    ) {
      return {
        type: 'create_dialogue',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create story (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|[ée]cri[rs]|write|generate|nouveau|new/i) &&
      input.match(/histoire|story|récit|tale|narration|narrative/i)
    ) {
      return {
        type: 'create_story',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create world (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|make|generate|construi[rs]|build|nouveau|new/i) &&
      input.match(/monde|world|univers|universe/i)
    ) {
      return {
        type: 'create_world',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Create scenario (FR + EN)
    if (
      input.match(/cr[ée]+[rz]?|create|[ée]cri[rs]|write|generate|nouveau|new/i) &&
      input.match(/scénario|scenario|script|screenplay/i)
    ) {
      return {
        type: 'create_scenario',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // ======== Media Generation Intents ========

    // Generate image (FR + EN)
    if (
      input.match(/g[ée]n[ée]r[er]?|generate|cr[ée]+[rz]?|create|make|dessine[rz]?|draw/i) &&
      input.match(/image|illustration|dessin|drawing|photo|picture|portrait|visuel|visual|artwork/i)
    ) {
      return {
        type: 'generate_image',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Generate audio / voice (FR + EN)
    if (
      input.match(/g[ée]n[ée]r[er]?|generate|cr[ée]+[rz]?|create|donne|give|lis?|read|parle|speak/i) &&
      input.match(/voix|voice|audio|son|sound|parole|speech|narration|tts|text.to.speech/i)
    ) {
      return {
        type: 'generate_audio',
        confidence: 0.9,
        params: { rawInput: input },
      };
    }

    // Generate video (FR + EN)
    if (
      input.match(/g[ée]n[ée]r[er]?|generate|cr[ée]+[rz]?|create|make|anime[rz]?|animate/i) &&
      input.match(/vid[ée]o|video|animation|clip|mouvement|motion/i)
    ) {
      return {
        type: 'generate_video',
        confidence: 0.9,
        params: { rawInput: input },
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
  private handleCreateShots(intent: { type: string; confidence: number; params: Record<string, unknown> }, input: string): ChatResponse {
    const { count, theme } = intent.params as { count: number; theme: string };
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
      message: `I've created ${count} ${count === 1 ? 'shot' : 'shots'} for your ${theme} sequence. ${this.context.shots.length === 0
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
  private handleModifyShot(intent: { type: string; confidence: number; params: Record<string, unknown> }, input: string): ChatResponse {
    const { shotId } = intent.params as { shotId: string | null };

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
  private handleAddTransition(intent: { type: string; confidence: number; params: Record<string, unknown> }, input: string): ChatResponse {
    const { transitionType } = intent.params as { transitionType: string };

    if (this.context.shots.length < 2) {
      return {
        message: 'You need at least 2 shots to add transitions. Create more shots first!',
        suggestions: ['Create a 3-shot sequence'],
      };
    }

    return {
      message: `I recommend using a '${transitionType}' transition for smooth scene changes. ${transitionType === 'fade'
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
  private handleAddAudio(intent: { type: string; confidence: number; params: Record<string, unknown> }, input: string): ChatResponse {
    const { audioType } = intent.params as { audioType: string };

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
  private handleAddText(_intent: { type: string; confidence: number; params: Record<string, unknown> }, _input: string): ChatResponse {
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
  private handleSuggestAssets(_intent: { type: string; confidence: number; params: Record<string, unknown> }, _input: string): ChatResponse {
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
      message: `Your project has ${shotCount} ${shotCount === 1 ? 'shot' : 'shots'} with a total duration of ${totalDuration} seconds. ${this.context.project?.project_name
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

  // ========================================================================
  // Content Creation Handlers
  // ========================================================================

  /**
   * Handle character creation request
   */
  private handleCreateCharacter(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelé|nommé|named|called)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: name
        ? `I'll create the character "${name}". I'll generate their appearance, personality, and backstory automatically.`
        : `I'll create a new character for you. What would you like to know about them? I can generate all the details automatically.`,
      suggestions: [
        'Create a warrior character',
        'Create a female mage named Aria',
        'Create a mysterious antagonist',
      ],
      actions: [{
        type: 'createCharacter',
        payload: { name, rawInput: input },
      }],
    };
  }

  /**
   * Handle location creation request
   */
  private handleCreateLocation(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelé|nommé|named|called)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: name
        ? `I'll create the location "${name}" with atmosphere, description, and visual details.`
        : `I'll create a new location for your world. I'll generate the atmosphere, description, and significance.`,
      suggestions: [
        'Create a dark enchanted forest',
        'Create a futuristic city',
        'Create a medieval castle',
      ],
      actions: [{
        type: 'createLocation',
        payload: { name, rawInput: input },
      }],
    };
  }

  /**
   * Handle object creation request
   */
  private handleCreateObject(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelé|nommé|named|called)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: name
        ? `I'll create the object "${name}" with rarity, abilities, and lore.`
        : `I'll create a new object / artifact for your world. I'll determine its properties and significance.`,
      suggestions: [
        'Create a legendary sword',
        'Create a mysterious amulet',
        'Create a potent healing potion',
      ],
      actions: [{
        type: 'createObject',
        payload: { name, rawInput: input },
      }],
    };
  }

  /**
   * Handle dialogue creation request
   */
  private handleCreateDialogue(input: string): ChatResponse {
    return {
      message: `I'll generate a dialogue for your scene. Tell me the characters, the topic, and the tone, or I'll create everything automatically.`,
      suggestions: [
        'Create a tense negotiation between two leaders',
        'Write a humorous dialogue between friends',
        'Generate a dramatic confrontation',
      ],
      actions: [{
        type: 'createDialogue',
        payload: { rawInput: input },
      }],
    };
  }

  /**
   * Handle story creation request
   */
  private handleCreateStory(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelée?|nommée?|intitulée?|named|called|titled)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const title = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: title
        ? `I'll create the story "${title}". I'll generate a plot outline, characters, and setting.`
        : `I'll create a new story for you. I'll craft the plot, characters, and world automatically.`,
      suggestions: [
        'Create a fantasy epic',
        'Write a sci-fi short story',
        'Create a mystery thriller',
      ],
      actions: [{
        type: 'createStory',
        payload: { title, rawInput: input },
      }],
    };
  }

  /**
   * Handle world creation request
   */
  private handleCreateWorld(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelé|nommé|named|called)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const name = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: name
        ? `I'll build the world "${name}". I'll define its era, cultures, rules, and geography.`
        : `I'll create a new world for your stories. I'll generate its history, cultures, and rules.`,
      suggestions: [
        'Create a medieval fantasy world',
        'Build a cyberpunk universe',
        'Create a post-apocalyptic world',
      ],
      actions: [{
        type: 'createWorld',
        payload: { name, rawInput: input },
      }],
    };
  }

  /**
   * Handle scenario creation request
   */
  private handleCreateScenario(input: string): ChatResponse {
    const nameMatch = input.match(/(?:appelé|nommé|intitulé|named|called|titled)\s+["']?([^"',;.]+)["']?/i)
      || input.match(/["']([^"']+)["']/);
    const title = nameMatch ? nameMatch[1].trim() : undefined;

    return {
      message: title
        ? `I'll create the scenario "${title}". I'll generate the scenes, conflicts, and resolution.`
        : `I'll create a new scenario for you. I'll craft the scenes, characters, and narrative arc.`,
      suggestions: [
        'Create an action screenplay',
        'Write a dramatic scenario',
        'Create a comedy script',
      ],
      actions: [{
        type: 'createScenario',
        payload: { title, rawInput: input },
      }],
    };
  }

  // ========================================================================
  // Media Generation Handlers
  // ========================================================================

  /**
   * Handle image generation request
   */
  private handleGenerateImage(input: string): ChatResponse {
    // Extract the description/prompt from the user input
    const descMatch = input.match(/(?:image|illustration|dessin|drawing|photo|picture|portrait|visuel|visual|artwork)\s+(?:de|of|d'|du|d’|pour|for)?\s*(.+)/i)
      || input.match(/(?:génère|generate|crée|create|dessine|draw)\s+(?:une?|an?)?\s*(.+)/i);
    const prompt = descMatch ? descMatch[1].trim() : undefined;

    return {
      message: prompt
        ? `🎨 I'll generate an image based on: "${prompt}". The image will be created using ComfyUI with the configured workflow.`
        : `🎨 I'll generate an image for you! Please describe what you'd like to see, and I'll create it using AI image generation.`,
      suggestions: [
        'Generate a fantasy landscape at sunset',
        'Create a portrait of a warrior',
        'Draw a futuristic city at night',
      ],
      actions: [{
        type: 'generateImage',
        payload: { prompt: prompt || '', rawInput: input },
      }],
    };
  }

  /**
   * Handle audio/voice generation request
   */
  private handleGenerateAudio(input: string): ChatResponse {
    // Extract the text to convert to speech
    const textMatch = input.match(/(?:lis?|read|parle|speak|dis?|say)\s+["'«]([^"'»]+)["'»]/i)
      || input.match(/(?:voix|voice|audio|narration)\s+(?:pour|for|de|of)?\s*["'«]([^"'»]+)["'»]/i)
      || input.match(/(?:génère|generate|crée|create)\s+(?:une?|an?)?\s*(?:voix|voice|audio|narration)\s+(?:pour|for|de|of|qui dit|saying)?\s*(.+)/i);
    const text = textMatch ? textMatch[1].trim() : undefined;

    // Check for character voice reference
    const charMatch = input.match(/(?:voix|voice)\s+(?:de|of|pour|for|du|d'|d’)\s*(.+?)(?:\s+(?:qui|that|pour|for|disant|saying)|$)/i);
    const character = charMatch ? charMatch[1].trim() : undefined;

    return {
      message: text
        ? `🎤 I'll generate audio for: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}". The voice will be synthesized using TTS.`
        : character
          ? `🎤 I'll generate a voice for the character "${character}". Please provide the text you'd like them to say.`
          : `🎤 I'll generate audio for you! Tell me what text you'd like converted to speech.`,
      suggestions: [
        'Read this dialogue aloud',
        'Generate a narration voice',
        'Give a deep male voice to the narrator',
      ],
      actions: [{
        type: 'generateAudio',
        payload: { text: text || '', character, rawInput: input },
      }],
    };
  }

  /**
   * Handle video generation request
   */
  private handleGenerateVideo(input: string): ChatResponse {
    // Extract the description/prompt
    const descMatch = input.match(/(?:vidéo|video|animation|clip)\s+(?:de|of|d'|d’|du|pour|for)?\s*(.+)/i)
      || input.match(/(?:anime|animate|génère|generate|crée|create)\s+(?:une?|an?)?\s*(?:vidéo|video|animation)?\s*(.+)/i);
    const prompt = descMatch ? descMatch[1].trim() : undefined;

    return {
      message: prompt
        ? `🎬 I'll generate a video based on: "${prompt}". This will use the ComfyUI video generation pipeline.`
        : `🎬 I'll generate a video for you! Describe the scene you'd like to animate using AI video generation.`,
      suggestions: [
        'Animate a walking character',
        'Create a video of flowing water',
        'Generate an animation of a flying dragon',
      ],
      actions: [{
        type: 'generateVideo',
        payload: { prompt: prompt || '', rawInput: input },
      }],
    };
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

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


