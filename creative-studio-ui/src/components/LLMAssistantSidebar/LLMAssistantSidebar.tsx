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

import { VOICE_COMMANDS_DATA, type VoiceCommandDef, type CommandCategory } from '../../data/voiceCommands';

// Available voice commands (legacy wrapper for compatibility if needed elsewhere)
export type VoiceCommand = VoiceCommandDef;

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
  { id: 'ai', label: 'AI & Addons', labelFr: 'IA & Addons', icon: '🤖', color: '#10b981' },
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
  const [language, setLanguage] = useState<Language>('fr');

  // Toggle sidebar expansion
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  // Get localized text
  const getLocalizedCommand = useCallback((cmd: VoiceCommand) => {
    return language === 'fr' ? cmd.commandFr : cmd.commandEn;
  }, [language]);

  const getLocalizedDescription = useCallback((cmd: VoiceCommand) => {
    return language === 'fr' ? cmd.descriptionFr : cmd.descriptionEn;
  }, [language]);

  const getLocalizedLabel = useCallback((cat: CommandCategoryInfo) => {
    return language === 'fr' ? cat.labelFr : cat.label;
  }, [language]);

  // Filter commands by category and search
  const filteredCommands = VOICE_COMMANDS_DATA.filter(cmd => {
    const matchesCategory = activeCategory === 'all' || cmd.category === activeCategory;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      cmd.commandEn.toLowerCase().includes(searchLower) ||
      cmd.commandFr.toLowerCase().includes(searchLower) ||
      cmd.descriptionEn.toLowerCase().includes(searchLower) ||
      cmd.descriptionFr.toLowerCase().includes(searchLower) ||
      cmd.keywordsEn.some(kw => kw.toLowerCase().includes(searchLower)) ||
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
    title: language === 'fr' ? 'Protocole Carotte' : 'Carrot Protocol',
    subtitle: language === 'fr' ? 'Commandes Vocales' : 'Voice Commands',
    shortSubtitle: language === 'fr' ? 'Voix' : 'Voice',
    searchPlaceholder: language === 'fr' ? 'Rechercher une commande...' : 'Search for a command...',
    all: language === 'fr' ? 'Tous' : 'All',
    copied: language === 'fr' ? 'Copié!' : 'Copied!',
    noResults: language === 'fr' ? 'Aucune commande trouvée' : 'No command found',
    helpText: language === 'fr' 
      ? 'Dites "slash" (ou votre préfixe réglé) suivi d\'une commande pour l\'activer. Les phrases sans préfixe sont traitées comme de la dictée normale.'
      : 'Say "slash" (or your set prefix) followed by a command to activate it. Phrases without a prefix are treated as normal dictation.',
    clickToCopy: language === 'fr' ? 'Cliquez pour copier:' : 'Click to copy:',
  };

  return (
    <div className={`llm-assistant-sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${className}`}>
      {/* Header with carrot icon */}
      <div className="llm-sidebar-header" onClick={toggleExpanded}>
        <div className="llm-sidebar-header-left">
          <span className="llm-carrot-icon" title="Protocole Carotte">🥕</span>
          {isExpanded && (
            <div className="flex flex-col">
              <span className="llm-sidebar-title">{t.title}</span>
              <span className="text-[10px] text-primary/70 font-mono">StoryCore System</span>
            </div>
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