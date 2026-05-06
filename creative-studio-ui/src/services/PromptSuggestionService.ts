/**
 * PromptSuggestionService - Dynamic prompt suggestion generation service
 *
 * Analyzes the current conversation to generate prompt suggestions
 * adapted to the context and language of the user
 */

import { type LanguageCode } from '@/utils/llmConfigStorage';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
}

export interface PromptSuggestion {
  id: string;
  text: string;
  icon: string;
  category: 'follow-up' | 'clarification' | 'expansion' | 'alternative' | 'refinement';
  relevance: number; // 0-1, score de pertinence
  language: LanguageCode;
}

export interface ConversationContext {
  language: LanguageCode;
  lastUserMessage: string;
  lastAssistantMessage: string;
  messageCount: number;
  hasProjectContext: boolean;
  recentTopics: string[];
  conversationTone: 'casual' | 'professional' | 'technical' | 'creative';
  userIntent: 'create' | 'modify' | 'question' | 'help' | 'explore' | 'unknown';
}

/**
 * Dynamic prompt suggestion generation service
 */
export class PromptSuggestionService {
  private static instance: PromptSuggestionService;

  // Suggestion database by language and category
  private suggestionTemplates: Record<LanguageCode, Record<string, string[]>> = {
    fr: {
      followUp: [
        "Pouvez-vous développer cette idée ?",
        "Quels seraient les détails supplémentaires ?",
        "Comment pourrais-je améliorer cela ?",
        "Avez-vous d'autres suggestions ?",
        "Pouvez-vous me donner un exemple concret ?"
      ],
      clarification: [
        "Pouvez-vous préciser votre demande ?",
        "Qu'entendez-vous exactement par... ?",
        "Pourriez-vous donner plus de contexte ?",
        "Avez-vous des préférences spécifiques ?",
        "Quel style recherchez-vous ?"
      ],
      expansion: [
        "Ajoutez plus de détails à cette description",
        "Développez cette scène avec plus d'éléments",
        "Ajoutez des personnages secondaires",
        "Enrichissez l'environnement",
        "Ajoutez des éléments d'action"
      ],
      alternative: [
        "Essayez une approche différente",
        "Voici une variante du concept",
        "Une autre interprétation serait...",
        "Essayez ce style alternatif",
        "Voici une version simplifiée"
      ],
      refinement: [
        "Ajustez les détails selon vos préférences",
        "Modifiez les éléments suivants...",
        "Changez l'atmosphère pour...",
        "Adaptez le ton à...",
        "Personnalisez ces aspects..."
      ]
    },
    en: {
      followUp: [
        "Can you develop this idea further?",
        "What additional details would you like?",
        "How could I improve this?",
        "Do you have other suggestions?",
        "Can you give me a concrete example?"
      ],
      clarification: [
        "Can you clarify your request?",
        "What exactly do you mean by...?",
        "Could you provide more context?",
        "Do you have specific preferences?",
        "What style are you looking for?"
      ],
      expansion: [
        "Add more details to this description",
        "Expand this scene with more elements",
        "Add secondary characters",
        "Enrich the environment",
        "Add action elements"
      ],
      alternative: [
        "Try a different approach",
        "Here's a variation of the concept",
        "Another interpretation would be...",
        "Try this alternative style",
        "Here's a simplified version"
      ],
      refinement: [
        "Adjust details according to your preferences",
        "Modify the following elements...",
        "Change the atmosphere to...",
        "Adapt the tone to...",
        "Customize these aspects..."
      ]
    },
    es: {
      followUp: [
        "¿Puede desarrollar esta idea más?",
        "¿Qué detalles adicionales le gustaría?",
        "¿Cómo podría mejorar esto?",
        "¿Tiene otras sugerencias?",
        "¿Puede darme un ejemplo concreto?"
      ],
      clarification: [
        "¿Puede aclarar su solicitud?",
        "¿Qué significa exactamente...?",
        "¿Podría proporcionar más contexto?",
        "¿Tiene preferencias específicas?",
        "¿Qué estilo busca?"
      ],
      expansion: [
        "Agregar más detalles a esta descripción",
        "Expandir esta escena con más elementos",
        "Agregar personajes secundarios",
        "Enriquecer el entorno",
        "Agregar elementos de acción"
      ],
      alternative: [
        "Probar un enfoque diferente",
        "Aquí hay una variación del concepto",
        "Otra interpretación sería...",
        "Probar este estilo alternativo",
        "Aquí hay una versión simplificada"
      ],
      refinement: [
        "Ajustar detalles según sus preferencias",
        "Modificar los siguientes elementos...",
        "Cambiar la atmósfera a...",
        "Adaptar el tono a...",
        "Personalizar estos aspectos..."
      ]
    },
    de: {
      followUp: [
        "Können Sie diese Idee weiterentwickeln?",
        "Welche zusätzlichen Details möchten Sie?",
        "Wie könnte ich das verbessern?",
        "Haben Sie andere Vorschläge?",
        "Können Sie mir ein konkretes Beispiel geben?"
      ],
      clarification: [
        "Können Sie Ihre Anfrage klären?",
        "Was meinen Sie genau mit...?",
        "Könnten Sie mehr Kontext geben?",
        "Haben Sie spezifische Vorlieben?",
        "Welchen Stil suchen Sie?"
      ],
      expansion: [
        "Fügen Sie mehr Details zu dieser Beschreibung hinzu",
        "Erweitern Sie diese Szene mit mehr Elementen",
        "Sekundäre Charaktere hinzufügen",
        "Die Umgebung bereichern",
        "Action-Elemente hinzufügen"
      ],
      alternative: [
        "Versuchen Sie einen anderen Ansatz",
        "Hier ist eine Variation des Konzepts",
        "Eine andere Interpretation wäre...",
        "Probieren Sie diesen alternativen Stil",
        "Hier ist eine vereinfachte Version"
      ],
      refinement: [
        "Details nach Ihren Vorlieben anpassen",
        "Die folgenden Elemente ändern...",
        "Die Atmosphäre ändern zu...",
        "Den Ton anpassen an...",
        "Diese Aspekte personalisieren..."
      ]
    },
    it: {
      followUp: [
        "Può sviluppare ulteriormente questa idea?",
        "Quali dettagli aggiuntivi vorresti?",
        "Come potrei migliorare questo?",
        "Hai altri suggerimenti?",
        "Puoi darmi un esempio concreto?"
      ],
      clarification: [
        "Puoi chiarire la tua richiesta?",
        "Cosa intendi esattamente per...?",
        "Potresti fornire più contesto?",
        "Hai preferenze specifiche?",
        "Che stile stai cercando?"
      ],
      expansion: [
        "Aggiungi più dettagli a questa descrizione",
        "Espandi questa scena con più elementi",
        "Aggiungi personaggi secondari",
        "Arricchisci l'ambiente",
        "Aggiungi elementi d'azione"
      ],
      alternative: [
        "Prova un approccio diverso",
        "Ecco una variazione del concetto",
        "Un'altra interpretazione sarebbe...",
        "Prova questo stile alternativo",
        "Ecco una versione semplificata"
      ],
      refinement: [
        "Regola i dettagli secondo le tue preferenze",
        "Modifica i seguenti elementi...",
        "Cambia l'atmosfera in...",
        "Adatta il tono a...",
        "Personalizza questi aspetti..."
      ]
    },
    pt: {
      followUp: [
        "Pode desenvolver esta ideia mais?",
        "Que detalhes adicionais gostaria?",
        "Como posso melhorar isso?",
        "Você tem outras sugestões?",
        "Pode me dar um exemplo concreto?"
      ],
      clarification: [
        "Pode esclarecer sua solicitação?",
        "O que você quer dizer exatamente com...?",
        "Poderia fornecer mais contexto?",
        "Você tem preferências específicas?",
        "Que estilo está procurando?"
      ],
      expansion: [
        "Adicionar mais detalhes a esta descrição",
        "Expandir esta cena com mais elementos",
        "Adicionar personagens secundários",
        "Enriquecer o ambiente",
        "Adicionar elementos de ação"
      ],
      alternative: [
        "Tente uma abordagem diferente",
        "Aqui está uma variação do conceito",
        "Outra interpretação seria...",
        "Tente este estilo alternativo",
        "Aqui está uma versão simplificada"
      ],
      refinement: [
        "Ajustar detalhes de acordo com suas preferências",
        "Modificar os seguintes elementos...",
        "Mudar a atmosfera para...",
        "Adaptar o tom para...",
        "Personalizar estes aspectos..."
      ]
    },
    ja: {
      followUp: [
        "このアイデアをさらに発展させられますか？",
        "どのような追加の詳細が必要ですか？",
        "これをどのように改善できますか？",
        "他の提案はありますか？",
        "具体的な例を挙げてもらえますか？"
      ],
      clarification: [
        "リクエストを明確にしていただけますか？",
        "...とは具体的に何を意味しますか？",
        "もっと文脈を提供していただけますか？",
        "特定の好みはありますか？",
        "どのようなスタイルをお探しですか？"
      ],
      expansion: [
        "この説明に詳細を追加する",
        "このシーンをより多くの要素で拡張する",
        "副次的なキャラクターを追加する",
        "環境を豊かにする",
        "アクション要素を追加する"
      ],
      alternative: [
        "異なるアプローチを試す",
        "概念のバリエーションです",
        "別の解釈としては...",
        "この代替スタイルを試す",
        "簡略化されたバージョンです"
      ],
      refinement: [
        "あなたの好みに合わせて詳細を調整する",
        "次の要素を変更する...",
        "雰囲気を変更する...",
        "トーンを適応させる...",
        "これらの側面をカスタマイズする..."
      ]
    },
    zh: {
      followUp: [
        "您能进一步发展这个想法吗？",
        "您想要什么额外的细节？",
        "我怎样才能改进这个？",
        "您还有其他建议吗？",
        "您能给我一个具体的例子吗？"
      ],
      clarification: [
        "您能澄清您的请求吗？",
        "...究竟是什么意思？",
        "您能提供更多上下文吗？",
        "您有特定偏好吗？",
        "您在寻找什么风格？"
      ],
      expansion: [
        "为这个描述添加更多细节",
        "用更多元素扩展这个场景",
        "添加次要角色",
        "丰富环境",
        "添加动作元素"
      ],
      alternative: [
        "尝试不同的方法",
        "这是概念的变体",
        "另一种解释是...",
        "尝试这个替代风格",
        "这是简化版本"
      ],
      refinement: [
        "根据您的偏好调整细节",
        "修改以下元素...",
        "将气氛改为...",
        "将语气调整为...",
        "自定义这些方面..."
      ]
    },
    ko: {
      followUp: [
        "이 아이디어를 더 발전시킬 수 있나요?",
        "어떤 추가 세부 사항을 원하시나요?",
        "이걸 어떻게 개선할 수 있을까요?",
        "다른 제안이 있으신가요?",
        "구체적인 예시를 주실 수 있나요?"
      ],
      clarification: [
        "요청을 명확히 해주실 수 있나요?",
        "...이 정확히 무엇을 의미하나요?",
        "더 많은 맥락을 제공해 주실 수 있나요?",
        "특정 선호 사항이 있으신가요?",
        "어떤 스타일을 찾고 계신가요?"
      ],
      expansion: [
        "이 설명에 더 많은 세부 사항 추가",
        "이 장면을 더 많은 요소로 확장",
        "부차적 캐릭터 추가",
        "환경 풍부하게 하기",
        "액션 요소 추가"
      ],
      alternative: [
        "다른 접근 방식 시도",
        "개념의 변형입니다",
        "다른 해석은...",
        "이 대안 스타일 시도",
        "간소화된 버전입니다"
      ],
      refinement: [
        "귀하의 선호에 따라 세부 사항 조정",
        "다음 요소 수정...",
        "분위기를 변경...",
        "톤을 적응...",
        "이러한 측면을 사용자 정의..."
      ]
    }
  };

  private constructor() {}

  static getInstance(): PromptSuggestionService {
    if (!PromptSuggestionService.instance) {
      PromptSuggestionService.instance = new PromptSuggestionService();
    }
    return PromptSuggestionService.instance;
  }

  /**
   * Génère des suggestions de prompts adaptées au contexte de conversation
   */
  generateSuggestions(
    messages: Message[],
    currentLanguage: LanguageCode,
    currentInput: string = ''
  ): PromptSuggestion[] {
    const context = this.analyzeConversation(messages, currentLanguage, currentInput);
    const suggestions: PromptSuggestion[] = [];

    // Génère des suggestions basées sur le contexte
    if (context.lastUserMessage) {
      // Suggestions de suivi basées sur le dernier message utilisateur
      suggestions.push(...this.generateFollowUpSuggestions(context));

      // Suggestions d'expansion si le contexte le permet
      if (context.userIntent === 'create' || context.userIntent === 'modify') {
        suggestions.push(...this.generateExpansionSuggestions(context));
      }

      // Suggestions alternatives
      suggestions.push(...this.generateAlternativeSuggestions(context));
    }

    // Suggestions de clarification si nécessaire
    if (this.needsClarification(context)) {
      suggestions.push(...this.generateClarificationSuggestions(context));
    }

    // Suggestions basées sur le texte en cours de saisie
    if (currentInput.trim().length > 0) {
      suggestions.push(...this.generateInputBasedSuggestions(currentInput, context));
    }

    // Trie par pertinence et limite à 6 suggestions
    return suggestions
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 6);
  }

  /**
   * Génère des suggestions basées sur le texte en cours de saisie
   */
  generateInputBasedSuggestions(input: string, context: ConversationContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const inputLower = input.toLowerCase();

    // Détection de type de contenu
    if (this.containsKeywords(inputLower, ['monde', 'world', 'univers', 'universe', 'setting'])) {
      suggestions.push({
        id: `input-world-${Date.now()}`,
        text: this.getLocalizedText(context.language, 'expansion', 'Enrichissez votre monde avec des lieux détaillés et une histoire riche'),
        icon: '🏰',
        category: 'expansion',
        relevance: 0.9,
        language: context.language
      });
    }

    if (this.containsKeywords(inputLower, ['personnage', 'character', 'perso', 'hero', 'héros'])) {
      suggestions.push({
        id: `input-character-${Date.now()}`,
        text: this.getLocalizedText(context.language, 'expansion', 'Développez la personnalité et l\'arrière-plan de votre personnage'),
        icon: '👥',
        category: 'expansion',
        relevance: 0.9,
        language: context.language
      });
    }

    if (this.containsKeywords(inputLower, ['scène', 'scene', 'action', 'combat', 'fight'])) {
      suggestions.push({
        id: `input-scene-${Date.now()}`,
        text: this.getLocalizedText(context.language, 'expansion', 'Ajoutez de l\'intensité et des détails visuels à votre scène'),
        icon: '🎬',
        category: 'expansion',
        relevance: 0.9,
        language: context.language
      });
    }

    if (this.containsKeywords(inputLower, ['dialogue', 'parler', 'speak', 'conversation'])) {
      suggestions.push({
        id: `input-dialogue-${Date.now()}`,
        text: this.getLocalizedText(context.language, 'expansion', 'Rendez le dialogue plus naturel et révélateur de la personnalité'),
        icon: '💬',
        category: 'expansion',
        relevance: 0.9,
        language: context.language
      });
    }

    return suggestions;
  }

  /**
   * Génère des suggestions de suivi
   */
  private generateFollowUpSuggestions(context: ConversationContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const templates = this.suggestionTemplates[context.language]?.followUp || [];

    templates.slice(0, 2).forEach((template, index) => {
      suggestions.push({
        id: `followup-${index}`,
        text: template,
        icon: '➡️',
        category: 'follow-up',
        relevance: 0.8 - (index * 0.1),
        language: context.language
      });
    });

    return suggestions;
  }

  /**
   * Génère des suggestions d'expansion
   */
  private generateExpansionSuggestions(context: ConversationContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const templates = this.suggestionTemplates[context.language]?.expansion || [];

    // Sélectionne les plus pertinentes selon le contexte
    const relevantTemplates = this.filterRelevantTemplates(templates, context);

    relevantTemplates.slice(0, 2).forEach((template, index) => {
      suggestions.push({
        id: `expansion-${index}`,
        text: template,
        icon: '🔍',
        category: 'expansion',
        relevance: 0.7 - (index * 0.1),
        language: context.language
      });
    });

    return suggestions;
  }

  /**
   * Génère des suggestions alternatives
   */
  private generateAlternativeSuggestions(context: ConversationContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const templates = this.suggestionTemplates[context.language]?.alternative || [];

    templates.slice(0, 1).forEach((template, index) => {
      suggestions.push({
        id: `alternative-${index}`,
        text: template,
        icon: '🔄',
        category: 'alternative',
        relevance: 0.6,
        language: context.language
      });
    });

    return suggestions;
  }

  /**
   * Génère des suggestions de clarification
   */
  private generateClarificationSuggestions(context: ConversationContext): PromptSuggestion[] {
    const suggestions: PromptSuggestion[] = [];
    const templates = this.suggestionTemplates[context.language]?.clarification || [];

    templates.slice(0, 1).forEach((template, index) => {
      suggestions.push({
        id: `clarification-${index}`,
        text: template,
        icon: '❓',
        category: 'clarification',
        relevance: 0.5,
        language: context.language
      });
    });

    return suggestions;
  }

  /**
   * Analyse la conversation pour extraire le contexte
   */
  private analyzeConversation(
    messages: Message[],
    language: LanguageCode,
    currentInput: string
  ): ConversationContext {
    const userMessages = messages.filter(m => m.type === 'user');
    const assistantMessages = messages.filter(m => m.type === 'assistant');

    const lastUserMessage = userMessages[userMessages.length - 1]?.content || '';
    const lastAssistantMessage = assistantMessages[assistantMessages.length - 1]?.content || '';

    // Détection de l'intention utilisateur
    const userIntent = this.detectUserIntent(lastUserMessage + ' ' + currentInput);

    // Extraction des topics récents
    const recentTopics = this.extractTopics([...userMessages.slice(-3), ...assistantMessages.slice(-3)]);

    // Analyse du ton de la conversation
    const conversationTone = this.analyzeConversationTone(messages);

    // Vérification du contexte projet
    const hasProjectContext = this.hasProjectContext(messages);

    return {
      language,
      lastUserMessage,
      lastAssistantMessage,
      messageCount: messages.length,
      hasProjectContext,
      recentTopics,
      conversationTone,
      userIntent
    };
  }

  /**
   * Détecte l'intention de l'utilisateur
   */
  private detectUserIntent(text: string): ConversationContext['userIntent'] {
    const lowerText = text.toLowerCase();

    if (this.containsKeywords(lowerText, ['créer', 'create', 'nouveau', 'new', 'générer', 'generate'])) {
      return 'create';
    }

    if (this.containsKeywords(lowerText, ['modifier', 'modify', 'changer', 'change', 'ajouter', 'add'])) {
      return 'modify';
    }

    if (this.containsKeywords(lowerText, ['comment', 'how', 'pourquoi', 'why', 'qu\'est-ce', 'what'])) {
      return 'question';
    }

    if (this.containsKeywords(lowerText, ['aide', 'help', 'assistant'])) {
      return 'help';
    }

    if (this.containsKeywords(lowerText, ['explorer', 'explore', 'découvrir', 'discover'])) {
      return 'explore';
    }

    return 'unknown';
  }

  /**
   * Extrait les topics récents de la conversation
   */
  private extractTopics(messages: Message[]): string[] {
    const topics: string[] = [];
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    const topicKeywords = {
      world: ['monde', 'world', 'univers', 'universe', 'setting'],
      character: ['personnage', 'character', 'perso', 'hero', 'héros'],
      scene: ['scène', 'scene', 'action', 'fight', 'combat'],
      dialogue: ['dialogue', 'parler', 'speak', 'conversation'],
      storyboard: ['storyboard', 'plan', 'shot', 'plan'],
      audio: ['audio', 'son', 'music', 'musique', 'voice']
    };

    Object.entries(topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics.slice(0, 3); // Maximum 3 topics
  }

  /**
   * Analyse le ton de la conversation
   */
  private analyzeConversationTone(messages: Message[]): ConversationContext['conversationTone'] {
    const text = messages.map(m => m.content).join(' ').toLowerCase();

    // Compte les mots techniques vs créatifs
    const technicalWords = ['configurer', 'paramètre', 'setting', 'api', 'interface'];
    const creativeWords = ['créer', 'imaginer', 'histoire', 'scène', 'personnage'];

    const technicalCount = technicalWords.filter(word => text.includes(word)).length;
    const creativeCount = creativeWords.filter(word => text.includes(word)).length;

    if (technicalCount > creativeCount) {
      return 'technical';
    } else if (creativeCount > technicalCount) {
      return 'creative';
    } else {
      return 'professional';
    }
  }

  /**
   * Vérifie si la conversation a un contexte de projet
   */
  private hasProjectContext(messages: Message[]): boolean {
    const text = messages.map(m => m.content).join(' ').toLowerCase();
    return this.containsKeywords(text, ['projet', 'project', 'shot', 'scène', 'storyboard']);
  }

  /**
   * Détermine si une clarification est nécessaire
   */
  private needsClarification(context: ConversationContext): boolean {
    // Si le dernier message utilisateur est très court
    if (context.lastUserMessage.length < 10) {
      return true;
    }

    // Si le dernier message contient des mots vagues
    const vagueWords = ['quelque chose', 'truc', 'machin', 'something', 'stuff'];
    if (this.containsKeywords(context.lastUserMessage.toLowerCase(), vagueWords)) {
      return true;
    }

    return false;
  }

  /**
   * Filtre les templates pertinents selon le contexte
   */
  private filterRelevantTemplates(templates: string[], _context: ConversationContext): string[] {
    // Pour l'instant, retourne tous les templates (peut être amélioré avec ML)
    return templates;
  }

  /**
   * Vérifie si le texte contient des mots-clés
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * Obtient un texte localisé
   */
  private getLocalizedText(language: LanguageCode, category: string, fallback: string): string {
    const templates = this.suggestionTemplates[language]?.[category];
    return templates?.[0] || fallback;
  }

  /**
   * Obtient les suggestions statiques par défaut (pour compatibilité)
   */
  getDefaultSuggestions(language: LanguageCode = 'en'): PromptSuggestion[] {
    const _templates = this.suggestionTemplates[language] || this.suggestionTemplates.en;

    return [
      // Top Ghost Tracker recommendations
      {
        id: 'ghost-tracker-characters',
        text: language === 'fr'
          ? 'Créer des définitions de personnages détaillées avec personnalités et motivations'
          : 'Create detailed character definitions with personalities and motivations',
        icon: '👥',
        category: 'expansion',
        relevance: 1.0,
        language
      },
      {
        id: 'ghost-tracker-shots',
        text: language === 'fr'
          ? 'Planifier les plans et angles de caméra pour une meilleure cinematographie'
          : 'Plan shots and camera angles for better cinematography',
        icon: '🎬',
        category: 'expansion',
        relevance: 0.95,
        language
      },
      // Standard suggestions
      {
        id: 'world-building',
        text: language === 'fr' ? 'Créer un monde fantastique' : 'Create a fantasy world',
        icon: '🏰',
        category: 'expansion',
        relevance: 0.85,
        language
      },
      {
        id: 'scene-action',
        text: language === 'fr' ? 'Générer une scène d\'action' : 'Generate an action scene',
        icon: '🎭',
        category: 'expansion',
        relevance: 0.75,
        language
      },
      {
        id: 'dialogue-romantic',
        text: language === 'fr' ? 'Écrire un dialogue romantique' : 'Write a romantic dialogue',
        icon: '💬',
        category: 'expansion',
        relevance: 0.70,
        language
      }
    ];
  }

  /**
   * Génère des suggestions rafraîchies avec de nouvelles idées (pour le bouton "improve")
   */
  getRefreshedSuggestions(language: LanguageCode = 'en'): PromptSuggestion[] {
    const _templates = this.suggestionTemplates[language] || this.suggestionTemplates.en;
    const timestamp = Date.now();

    return [
      // Suggestions rafraîchies avec des approches créatives différentes
      {
        id: `refreshed-creative-${timestamp}-1`,
        text: language === 'fr'
          ? 'Explorer des approches non-conventionnelles et innovantes'
          : 'Explore unconventional and innovative approaches',
        icon: '💡',
        category: 'alternative',
        relevance: 0.95,
        language
      },
      {
        id: `refreshed-vector-${timestamp}-2`,
        text: language === 'fr'
          ? 'Utiliser des associations vectorielles inattendues pour plus de créativité'
          : 'Use unexpected vectorial associations for enhanced creativity',
        icon: '🧠',
        category: 'expansion',
        relevance: 0.90,
        language
      },
      {
        id: `refreshed-probability-${timestamp}-3`,
        text: language === 'fr'
          ? 'Incorporer des éléments de surprise et d\'imprévisibilité'
          : 'Incorporate surprise elements and unpredictability',
        icon: '🎲',
        category: 'refinement',
        relevance: 0.85,
        language
      },
      {
        id: `refreshed-jokes-${timestamp}-4`,
        text: language === 'fr'
          ? 'Ajouter une touche d\'humour et de légèreté créative'
          : 'Add a touch of humor and creative lightness',
        icon: '😄',
        category: 'alternative',
        relevance: 0.80,
        language
      },
      {
        id: `refreshed-distribution-${timestamp}-5`,
        text: language === 'fr'
          ? 'Optimiser la distribution des éléments selon des lois vectorielles'
          : 'Optimize element distribution according to vectorial laws',
        icon: '📊',
        category: 'refinement',
        relevance: 0.75,
        language
      },
      {
        id: `refreshed-cultural-${timestamp}-6`,
        text: language === 'fr'
          ? 'Enrichir avec des références culturelles diverses et précises'
          : 'Enrich with diverse and precise cultural references',
        icon: '🌍',
        category: 'expansion',
        relevance: 0.70,
        language
      }
    ];
  }
}

// Export de l'instance singleton
export const promptSuggestionService = PromptSuggestionService.getInstance();
