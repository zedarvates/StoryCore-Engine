/**
 * LLMAssistantSidebar - StoryCore LLM Assistant
 * 
 * A collapsible sidebar panel that displays available voice commands
 * to help users discover and use voice commands effectively.
 * 
 * Features:
 * - Collapsible panel with carrot icon 🥕
 * - Expand/collapse arrow indicator
 * - Categorized voice commands list
 * - Bilingual support (English/French)
 * - Click to copy command text
 */

import React, { useState, useCallback } from 'react';
import './LLMAssistantSidebar.css';

// Types
export interface VoiceCommand {
  id: string;
  command: string; // English command (default)
  commandFr: string; // French version
  description: string; // English description
  descriptionFr: string; // French description
  keywords: string[]; // English keywords
  keywordsFr: string[]; // French keywords
  category: CommandCategory;
}

export type CommandCategory = 'system' | 'navigation' | 'creation' | 'playback' | 'editing';

export interface CommandCategoryInfo {
  id: CommandCategory;
  label: string; // English label
  labelFr: string; // French label
  icon: string;
  color: string;
}

type Language = 'en' | 'fr';

// Command categories configuration
const CATEGORIES: CommandCategoryInfo[] = [
  { id: 'system', label: 'System', labelFr: 'Système', icon: '⚙️', color: '#6366f1' },
  { id: 'navigation', label: 'Navigation', labelFr: 'Navigation', icon: '🧭', color: '#8b5cf6' },
  { id: 'creation', label: 'Creation', labelFr: 'Création', icon: '✨', color: '#ec4899' },
  { id: 'playback', label: 'Playback', labelFr: 'Lecture', icon: '▶️', color: '#10b981' },
  { id: 'editing', label: 'Editing', labelFr: 'Édition', icon: '✏️', color: '#f59e0b' },
];

// Available voice commands
const VOICE_COMMANDS: VoiceCommand[] = [
  // System commands
  {
    id: 'undo',
    command: 'Undo',
    commandFr: 'Annuler',
    description: 'Undo the last action',
    descriptionFr: 'Annuler la dernière action',
    keywords: ['undo', 'revert', 'back'],
    keywordsFr: ['annuler', 'revenir', 'retour'],
    category: 'system',
  },
  {
    id: 'redo',
    command: 'Redo',
    commandFr: 'Rétablir',
    description: 'Redo the last undone action',
    descriptionFr: 'Rétablir la dernière action annulée',
    keywords: ['redo', 'restore'],
    keywordsFr: ['rétablir', 'refaire'],
    category: 'system',
  },
  {
    id: 'save',
    command: 'Save project',
    commandFr: 'Sauvegarder le projet',
    description: 'Save the current project',
    descriptionFr: 'Enregistrer le projet en cours',
    keywords: ['save', 'store', 'project'],
    keywordsFr: ['sauvegarder', 'enregistrer', 'sauver'],
    category: 'system',
  },
  {
    id: 'cancel',
    command: 'Cancel generation',
    commandFr: 'Annuler la génération',
    description: 'Stop the current generation',
    descriptionFr: 'Arrêter la génération en cours',
    keywords: ['cancel', 'stop generation', 'abort'],
    keywordsFr: ['annuler génération', 'stopper', 'arrêter'],
    category: 'system',
  },

  // Navigation commands
  {
    id: 'go-dashboard',
    command: 'Go to dashboard',
    commandFr: 'Aller au tableau de bord',
    description: 'Return to the dashboard',
    descriptionFr: 'Retourner au tableau de bord',
    keywords: ['dashboard', 'home', 'go'],
    keywordsFr: ['tableau de bord', 'accueil', 'aller'],
    category: 'navigation',
  },
  {
    id: 'go-settings',
    command: 'Open settings',
    commandFr: 'Ouvrir les paramètres',
    description: 'Access application settings',
    descriptionFr: "Accéder aux paramètres de l'application",
    keywords: ['settings', 'preferences', 'open'],
    keywordsFr: ['paramètres', 'réglages', 'ouvrir'],
    category: 'navigation',
  },
  {
    id: 'go-ai',
    command: 'Open AI settings',
    commandFr: 'Ouvrir les paramètres IA',
    description: 'Access LLM settings',
    descriptionFr: 'Accéder aux paramètres LLM',
    keywords: ['ai', 'llm', 'artificial intelligence'],
    keywordsFr: ['ia', 'ai', 'llm', 'intelligence artificielle'],
    category: 'navigation',
  },
  {
    id: 'next-shot',
    command: 'Next shot',
    commandFr: 'Plan suivant',
    description: 'Go to the next shot',
    descriptionFr: 'Aller au plan suivant',
    keywords: ['next', 'shot', 'following'],
    keywordsFr: ['suivant', 'prochain', 'plan'],
    category: 'navigation',
  },
  {
    id: 'prev-shot',
    command: 'Previous shot',
    commandFr: 'Plan précédent',
    description: 'Go to the previous shot',
    descriptionFr: 'Aller au plan précédent',
    keywords: ['previous', 'shot', 'back'],
    keywordsFr: ['précédent', 'avant', 'plan'],
    category: 'navigation',
  },

  // Creation commands
  {
    id: 'generate-image',
    command: 'Generate an image',
    commandFr: 'Générer une image',
    description: 'Create an image with the active addon',
    descriptionFr: "Créer une image avec l'addon actif",
    keywords: ['generate', 'image', 'create', 'draw'],
    keywordsFr: ['générer image', 'créer image', 'dessiner'],
    category: 'creation',
  },
  {
    id: 'regenerate',
    command: 'Regenerate',
    commandFr: 'Régénérer',
    description: 'Request a new result',
    descriptionFr: 'Demander un nouveau résultat',
    keywords: ['regenerate', 'redo', 'try again'],
    keywordsFr: ['régénérer', 'refais', 'essaye encore'],
    category: 'creation',
  },
  {
    id: 'fix-element',
    command: 'Fix element',
    commandFr: "Corriger l'élément",
    description: 'Improve the selected element',
    descriptionFr: 'Améliorer l\'élément sélectionné',
    keywords: ['fix', 'improve', 'correct', 'enhance'],
    keywordsFr: ['corriger', 'améliorer', 'fixer'],
    category: 'creation',
  },
  {
    id: 'create-character',
    command: 'Create a character',
    commandFr: 'Créer un personnage',
    description: 'Launch the character creation wizard',
    descriptionFr: "Lancer l'assistant de création de personnage",
    keywords: ['create', 'character', 'new character'],
    keywordsFr: ['créer personnage', 'nouveau personnage'],
    category: 'creation',
  },
  {
    id: 'create-world',
    command: 'Create a world',
    commandFr: 'Créer un monde',
    description: 'Launch the world creation wizard',
    descriptionFr: "Lancer l'assistant de création de monde",
    keywords: ['create', 'world', 'new world'],
    keywordsFr: ['créer monde', 'nouveau monde'],
    category: 'creation',
  },

  // Playback commands
  {
    id: 'play',
    command: 'Play',
    commandFr: 'Lecture',
    description: 'Start playback',
    descriptionFr: 'Démarrer la lecture',
    keywords: ['play', 'start', 'run'],
    keywordsFr: ['jouer', 'lire', 'lecture'],
    category: 'playback',
  },
  {
    id: 'pause',
    command: 'Pause',
    commandFr: 'Pause',
    description: 'Pause playback',
    descriptionFr: 'Mettre en pause la lecture',
    keywords: ['pause', 'stop'],
    keywordsFr: ['pause', 'arrêter'],
    category: 'playback',
  },
  {
    id: 'stop',
    command: 'Stop',
    commandFr: 'Stop',
    description: 'Stop playback',
    descriptionFr: 'Arrêter la lecture',
    keywords: ['stop', 'halt'],
    keywordsFr: ['stop', 'arrêter', 'halte'],
    category: 'playback',
  },

  // Editing commands
  {
    id: 'edit-selected',
    command: 'Edit selection',
    commandFr: 'Éditer la sélection',
    description: 'Edit the selected element',
    descriptionFr: "Modifier l'élément sélectionné",
    keywords: ['edit', 'modify', 'change'],
    keywordsFr: ['éditer', 'modifier', 'changer'],
    category: 'editing',
  },
  {
    id: 'delete-selected',
    command: 'Delete selection',
    commandFr: 'Supprimer la sélection',
    description: 'Delete the selected element',
    descriptionFr: "Supprimer l'élément sélectionné",
    keywords: ['delete', 'remove', 'erase'],
    keywordsFr: ['supprimer', 'effacer'],
    category: 'editing',
  },
  {
    id: 'duplicate',
    command: 'Duplicate',
    commandFr: 'Dupliquer',
    description: 'Duplicate the selected element',
    descriptionFr: "Dupliquer l'élément sélectionné",
    keywords: ['duplicate', 'copy', 'clone'],
    keywordsFr: ['dupliquer', 'copier'],
    category: 'editing',
  },
  {
    id: 'change-mood',
    command: 'Change mood',
    commandFr: "Changer l'ambiance",
    description: 'Change the scene mood',
    descriptionFr: "Modifier l'ambiance de la scène",
    keywords: ['mood', 'atmosphere', 'style'],
    keywordsFr: ['ambiance', 'mood', 'style', 'atmosphère'],
    category: 'editing',
  },
];

interface LLMAssistantSidebarProps {
  className?: string;
  onCommandClick?: (command: VoiceCommand) => void;
}

export const LLMAssistantSidebar: React.FC<LLMAssistantSidebarProps> = ({
  className = '',
  onCommandClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CommandCategory | 'all'>('all');
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [language, setLanguage] = useState<Language>('en');

  // Toggle sidebar expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Get localized text
  const getLocalizedCommand = useCallback((cmd: VoiceCommand) => {
    return language === 'fr' ? cmd.commandFr : cmd.command;
  }, [language]);

  const getLocalizedDescription = useCallback((cmd: VoiceCommand) => {
    return language === 'fr' ? cmd.descriptionFr : cmd.description;
  }, [language]);

  const getLocalizedLabel = useCallback((cat: CommandCategoryInfo) => {
    return language === 'fr' ? cat.labelFr : cat.label;
  }, [language]);

  // Filter commands by category and search
  const filteredCommands = VOICE_COMMANDS.filter(cmd => {
    const matchesCategory = activeCategory === 'all' || cmd.category === activeCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      cmd.command.toLowerCase().includes(searchLower) ||
      cmd.commandFr.toLowerCase().includes(searchLower) ||
      cmd.description.toLowerCase().includes(searchLower) ||
      cmd.descriptionFr.toLowerCase().includes(searchLower) ||
      cmd.keywords.some(kw => kw.toLowerCase().includes(searchLower)) ||
      cmd.keywordsFr.some(kw => kw.toLowerCase().includes(searchLower));
    return matchesCategory && matchesSearch;
  });

  // Handle command click (copy to clipboard)
  const handleCommandClick = useCallback((command: VoiceCommand) => {
    const textToCopy = getLocalizedCommand(command);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedCommand(command.id);
      setTimeout(() => setCopiedCommand(null), 2000);
    });

    if (onCommandClick) {
      onCommandClick(command);
    }
  }, [onCommandClick, getLocalizedCommand]);

  // Group commands by category
  const groupedCommands = CATEGORIES.reduce((acc, cat) => {
    const cmds = filteredCommands.filter(cmd => cmd.category === cat.id);
    if (cmds.length > 0) {
      acc[cat.id] = cmds;
    }
    return acc;
  }, {} as Record<CommandCategory, VoiceCommand[]>);

  // Translations
  const t = {
    title: language === 'fr' ? 'Assistant LLM' : 'LLM Assistant',
    subtitle: language === 'fr' ? 'Commandes vocales' : 'Voice Commands',
    shortSubtitle: language === 'fr' ? 'Voix' : 'Voice',
    searchPlaceholder: language === 'fr' ? 'Rechercher une commande...' : 'Search for a command...',
    all: language === 'fr' ? 'Tous' : 'All',
    copied: language === 'fr' ? 'Copié!' : 'Copied!',
    noResults: language === 'fr' ? 'Aucune commande trouvée' : 'No command found',
    helpText: language === 'fr' 
      ? 'Cliquez sur une commande pour la copier dans le presse-papier. Utilisez ces phrases avec la reconnaissance vocale.'
      : 'Click on a command to copy it to the clipboard. Use these phrases with voice recognition.',
    clickToCopy: language === 'fr' ? 'Cliquez pour copier:' : 'Click to copy:',
  };

  return (
    <div className={`llm-assistant-sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
      {/* Header with carrot icon */}
      <div className="llm-sidebar-header" onClick={toggleExpanded}>
        <div className="llm-sidebar-header-left">
          <span className="llm-carrot-icon">🥕</span>
          {isExpanded && (
            <span className="llm-sidebar-title">{t.title}</span>
          )}
        </div>
        <div className="llm-sidebar-header-right">
          <span className="llm-sidebar-subtitle">
            {isExpanded ? t.subtitle : t.shortSubtitle}
          </span>
          <span className={`llm-expand-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        </div>
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="llm-sidebar-content">
          {/* Language toggle */}
          <div className="llm-language-toggle">
            <button
              className={`llm-lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              🇬🇧 EN
            </button>
            <button
              className={`llm-lang-btn ${language === 'fr' ? 'active' : ''}`}
              onClick={() => setLanguage('fr')}
            >
              🇫🇷 FR
            </button>
          </div>

          {/* Search input */}
          <div className="llm-search-container">
            <input
              type="text"
              className="llm-search-input"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="llm-search-icon">🔍</span>
          </div>

          {/* Category filters */}
          <div className="llm-category-filters">
            <button
              className={`llm-category-btn ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              {t.all}
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`llm-category-btn ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
                style={{ '--category-color': cat.color } as React.CSSProperties}
              >
                <span className="llm-category-icon">{cat.icon}</span>
                <span className="llm-category-label">{getLocalizedLabel(cat)}</span>
              </button>
            ))}
          </div>

          {/* Commands list */}
          <div className="llm-commands-list">
            {(activeCategory === 'all' ? CATEGORIES.filter(c => groupedCommands[c.id]) : [CATEGORIES.find(c => c.id === activeCategory)!])
              .filter(Boolean)
              .map(cat => (
                <div key={cat.id} className="llm-command-group">
                  {activeCategory === 'all' && (
                    <div className="llm-group-header" style={{ color: cat.color }}>
                      <span>{cat.icon}</span>
                      <span>{getLocalizedLabel(cat)}</span>
                    </div>
                  )}
                  <div className="llm-group-commands">
                    {(activeCategory === 'all' ? groupedCommands[cat.id] || [] : filteredCommands).map(cmd => (
                      <div
                        key={cmd.id}
                        className={`llm-command-item ${copiedCommand === cmd.id ? 'copied' : ''}`}
                        onClick={() => handleCommandClick(cmd)}
                        title={`${t.clickToCopy} "${getLocalizedCommand(cmd)}"`}
                      >
                        <div className="llm-command-text">{getLocalizedCommand(cmd)}</div>
                        <div className="llm-command-desc">{getLocalizedDescription(cmd)}</div>
                        {copiedCommand === cmd.id && (
                          <div className="llm-copied-badge">{t.copied}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            
            {filteredCommands.length === 0 && (
              <div className="llm-no-results">
                <span className="llm-no-results-icon">🔍</span>
                <span>{t.noResults}</span>
              </div>
            )}
          </div>

          {/* Help section */}
          <div className="llm-help-section">
            <div className="llm-help-icon">💡</div>
            <div className="llm-help-text">
              {t.helpText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LLMAssistantSidebar;