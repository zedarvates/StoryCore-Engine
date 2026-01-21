/**
 * ConversationExportService - Service d'export de conversations
 *
 * Permet d'exporter les conversations en PDF/Word, de marquer et organiser
 * les conversations importantes, de faire des recherches plein texte,
 * et de partager les conversations.
 */

import { jsPDF } from 'jspdf';
import { LanguageCode } from '@/utils/llmConfigStorage';
import { notificationService } from './NotificationService';

export interface Message {
  id: string;
  type: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isMarked: boolean;
  language: LanguageCode;
  metadata: Record<string, any>;
}

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'txt' | 'json';
  includeTimestamps: boolean;
  includeMetadata: boolean;
  anonymize: boolean;
  title: string;
  author: string;
}

export interface SearchResult {
  conversationId: string;
  messageId: string;
  content: string;
  timestamp: Date;
  matchScore: number;
  context: string;
}

export interface ShareOptions {
  format: 'link' | 'file' | 'embed';
  expirationHours: number;
  password?: string;
  allowDownload: boolean;
}

/**
 * Service d'export et gestion des conversations
 */
export class ConversationExportService {
  private static instance: ConversationExportService;
  private conversations: Conversation[] = [];
  private searchIndex: Map<string, string[]> = new Map();

  private constructor() {
    this.loadConversations();
    this.buildSearchIndex();
  }

  static getInstance(): ConversationExportService {
    if (!ConversationExportService.instance) {
      ConversationExportService.instance = new ConversationExportService();
    }
    return ConversationExportService.instance;
  }

  /**
   * Charge les conversations sauvegardées
   */
  private loadConversations(): void {
    try {
      const stored = localStorage.getItem('conversations');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.conversations = parsed.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
      }
    } catch (error) {
      console.warn('Failed to load conversations:', error);
      this.conversations = [];
    }
  }

  /**
   * Sauvegarde les conversations
   */
  private saveConversations(): void {
    try {
      const dataToSave = this.conversations.map(conv => ({
        ...conv,
        createdAt: conv.createdAt.toISOString(),
        updatedAt: conv.updatedAt.toISOString(),
        messages: conv.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp.toISOString()
        }))
      }));
      localStorage.setItem('conversations', JSON.stringify(dataToSave));
    } catch (error) {
      console.warn('Failed to save conversations:', error);
    }
  }

  /**
   * Construit l'index de recherche
   */
  private buildSearchIndex(): void {
    this.searchIndex.clear();

    this.conversations.forEach(conv => {
      const allText = conv.messages.map(msg => msg.content).join(' ').toLowerCase();
      const words = allText.split(/\s+/).filter(word => word.length > 2);
      this.searchIndex.set(conv.id, [...new Set(words)]);
    });
  }

  /**
   * Sauvegarde une conversation
   */
  saveConversation(
    messages: Message[],
    title?: string,
    tags: string[] = [],
    language: LanguageCode = 'fr'
  ): string {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const conversation: Conversation = {
      id,
      title: title || this.generateTitle(messages),
      messages,
      createdAt: now,
      updatedAt: now,
      tags,
      isMarked: false,
      language,
      metadata: {
        messageCount: messages.length,
        wordCount: messages.reduce((count, msg) => count + msg.content.split(/\s+/).length, 0),
        duration: messages.length > 1 ?
          messages[messages.length - 1].timestamp.getTime() - messages[0].timestamp.getTime() : 0
      }
    };

    this.conversations.unshift(conversation);
    this.saveConversations();
    this.buildSearchIndex();

    notificationService.success(
      'Conversation sauvegardée',
      `La conversation "${conversation.title}" a été sauvegardée avec succès.`
    );

    return id;
  }

  /**
   * Génère un titre automatique pour la conversation
   */
  private generateTitle(messages: Message[]): string {
    if (messages.length === 0) return 'Conversation vide';

    // Prendre les premiers mots du premier message utilisateur
    const firstUserMessage = messages.find(msg => msg.type === 'user');
    if (firstUserMessage) {
      const words = firstUserMessage.content.split(/\s+/).slice(0, 6);
      const title = words.join(' ');
      return title.length > 50 ? title.substring(0, 47) + '...' : title;
    }

    return `Conversation du ${new Date().toLocaleDateString('fr-FR')}`;
  }

  /**
   * Marque/démarque une conversation comme importante
   */
  toggleMark(conversationId: string): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.isMarked = !conversation.isMarked;
      conversation.updatedAt = new Date();
      this.saveConversations();

      notificationService.info(
        conversation.isMarked ? 'Conversation marquée' : 'Marquage retiré',
        `La conversation "${conversation.title}" a été ${conversation.isMarked ? 'marquée' : 'démarquée'}.`
      );
    }
  }

  /**
   * Ajoute des tags à une conversation
   */
  addTags(conversationId: string, tags: string[]): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation) {
      conversation.tags = [...new Set([...conversation.tags, ...tags])];
      conversation.updatedAt = new Date();
      this.saveConversations();
    }
  }

  /**
   * Recherche dans les conversations
   */
  searchConversations(query: string): SearchResult[] {
    if (!query.trim()) return [];

    const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    const results: SearchResult[] = [];

    this.conversations.forEach(conv => {
      conv.messages.forEach(msg => {
        const content = msg.content.toLowerCase();
        let matchScore = 0;
        let matchedWords: string[] = [];

        queryWords.forEach(word => {
          if (content.includes(word)) {
            matchScore += 1;
            matchedWords.push(word);
          }
        });

        if (matchScore > 0) {
          // Extraire le contexte autour de la première occurrence
          const firstMatchIndex = Math.max(0, content.indexOf(matchedWords[0]) - 50);
          const context = msg.content.substring(firstMatchIndex, firstMatchIndex + 100);

          results.push({
            conversationId: conv.id,
            messageId: msg.id,
            content: msg.content,
            timestamp: msg.timestamp,
            matchScore,
            context: context + (context.length === 100 ? '...' : '')
          });
        }
      });
    });

    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Exporte une conversation
   */
  async exportConversation(conversationId: string, options: ExportOptions): Promise<Blob> {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(conversation, options);
      case 'docx':
        return this.exportToDOCX(conversation, options);
      case 'txt':
        return this.exportToTXT(conversation, options);
      case 'json':
        return this.exportToJSON(conversation, options);
      default:
        throw new Error('Unsupported format');
    }
  }

  /**
   * Export vers PDF
   */
  private exportToPDF(conversation: Conversation, options: ExportOptions): Blob {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Titre
    pdf.setFontSize(18);
    pdf.text(options.title || conversation.title, margin, yPosition);
    yPosition += 15;

    // Métadonnées
    if (options.includeMetadata) {
      pdf.setFontSize(10);
      pdf.text(`Auteur: ${options.author || 'Utilisateur'}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Date: ${conversation.createdAt.toLocaleDateString('fr-FR')}`, margin, yPosition);
      yPosition += 10;
      pdf.text(`Messages: ${conversation.messages.length}`, margin, yPosition);
      yPosition += 15;
    }

    // Messages
    pdf.setFontSize(12);
    conversation.messages.forEach((message, index) => {
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      const prefix = message.type === 'user' ? 'Vous: ' : 'Assistant: ';
      const content = options.anonymize && message.type === 'user' ? '[Message anonymisé]' : message.content;

      if (options.includeTimestamps) {
        pdf.setFontSize(8);
        pdf.text(message.timestamp.toLocaleString('fr-FR'), margin, yPosition);
        yPosition += 8;
        pdf.setFontSize(12);
      }

      const lines = pdf.splitTextToSize(prefix + content, pageWidth - 2 * margin);
      pdf.text(lines, margin, yPosition);
      yPosition += lines.length * 7 + 10;
    });

    return pdf.output('blob');
  }

  /**
   * Export vers DOCX (simulé - dans un vrai système utiliserait une bibliothèque spécialisée)
   */
  private exportToDOCX(conversation: Conversation, options: ExportOptions): Blob {
    // Simulation d'export DOCX - dans un vrai système, utiliserait une bibliothèque comme docx
    const content = this.formatConversationForExport(conversation, options, 'docx');
    return new Blob([content], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  /**
   * Export vers TXT
   */
  private exportToTXT(conversation: Conversation, options: ExportOptions): Blob {
    const content = this.formatConversationForExport(conversation, options, 'txt');
    return new Blob([content], { type: 'text/plain' });
  }

  /**
   * Export vers JSON
   */
  private exportToJSON(conversation: Conversation, options: ExportOptions): Blob {
    const exportData = {
      title: options.title || conversation.title,
      author: options.author || 'Utilisateur',
      exportDate: new Date().toISOString(),
      conversation: {
        ...conversation,
        messages: options.anonymize ? conversation.messages.map(msg => ({
          ...msg,
          content: msg.type === 'user' ? '[Message anonymisé]' : msg.content
        })) : conversation.messages
      }
    };
    return new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  }

  /**
   * Formate la conversation pour l'export
   */
  private formatConversationForExport(
    conversation: Conversation,
    options: ExportOptions,
    format: string
  ): string {
    let content = `${options.title || conversation.title}\n`;
    content += `Auteur: ${options.author || 'Utilisateur'}\n`;
    content += `Date: ${conversation.createdAt.toLocaleDateString('fr-FR')}\n\n`;

    conversation.messages.forEach(message => {
      if (options.includeTimestamps) {
        content += `[${message.timestamp.toLocaleString('fr-FR')}] `;
      }

      const prefix = message.type === 'user' ? 'Vous: ' : 'Assistant: ';
      const msgContent = options.anonymize && message.type === 'user' ? '[Message anonymisé]' : message.content;

      content += `${prefix}${msgContent}\n\n`;
    });

    return content;
  }

  /**
   * Partage une conversation
   */
  async shareConversation(conversationId: string, options: ShareOptions): Promise<string> {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Simuler la création d'un lien de partage
    const shareId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const shareData = {
      id: shareId,
      conversationId,
      options,
      expiresAt: new Date(Date.now() + options.expirationHours * 60 * 60 * 1000),
      createdAt: new Date()
    };

    // Sauvegarder les données de partage (dans un vrai système, irait sur un serveur)
    localStorage.setItem(`share_${shareId}`, JSON.stringify(shareData));

    const shareUrl = `${window.location.origin}/share/${shareId}`;

    notificationService.success(
      'Conversation partagée',
      `Lien de partage créé: ${shareUrl}`,
      [
        {
          label: 'Copier le lien',
          action: () => navigator.clipboard.writeText(shareUrl),
          primary: true
        }
      ]
    );

    return shareUrl;
  }

  /**
   * Supprime une conversation
   */
  deleteConversation(conversationId: string): void {
    const index = this.conversations.findIndex(c => c.id === conversationId);
    if (index !== -1) {
      const conversation = this.conversations[index];
      this.conversations.splice(index, 1);
      this.saveConversations();
      this.buildSearchIndex();

      notificationService.info(
        'Conversation supprimée',
        `La conversation "${conversation.title}" a été supprimée.`
      );
    }
  }

  /**
   * Obtient toutes les conversations
   */
  getConversations(): Conversation[] {
    return [...this.conversations];
  }

  /**
   * Obtient les conversations marquées
   */
  getMarkedConversations(): Conversation[] {
    return this.conversations.filter(c => c.isMarked);
  }

  /**
   * Obtient les statistiques
   */
  getStats(): {
    totalConversations: number;
    totalMessages: number;
    markedConversations: number;
    averageMessagesPerConversation: number;
  } {
    const totalConversations = this.conversations.length;
    const totalMessages = this.conversations.reduce((sum, conv) => sum + conv.messages.length, 0);
    const markedConversations = this.conversations.filter(c => c.isMarked).length;
    const averageMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

    return {
      totalConversations,
      totalMessages,
      markedConversations,
      averageMessagesPerConversation: Math.round(averageMessagesPerConversation * 10) / 10
    };
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.conversations = [];
    this.searchIndex.clear();
  }
}

// Export de l'instance singleton
export const conversationExportService = ConversationExportService.getInstance();