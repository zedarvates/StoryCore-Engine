/**
 * LLMAssistantSidebar - StoryCore LLM Assistant
 * 
 * A collapsible sidebar panel that displays available voice commands
 * to help users discover and use voice commands effectively.
 * 
 * Modernized for 2026 UI Trends (Glassmorphism 2.0, Purposeful Motion)
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Lightbulb, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    subtitle: language === 'fr' ? 'Partenaire Créatif IA' : 'AI Creative Partner',
    shortSubtitle: language === 'fr' ? 'Voix' : 'Voice',
    searchPlaceholder: language === 'fr' ? 'Rechercher une commande...' : 'Search commands...',
    all: language === 'fr' ? 'Tous' : 'All',
    copied: language === 'fr' ? 'Copié!' : 'Copied!',
    noResults: language === 'fr' ? 'Aucun résultat' : 'No results',
    helpText: language === 'fr' 
      ? 'Énoncez le préfixe réglé suivi d\'une commande.'
      : 'Say the configured prefix followed by a command.',
    clickToCopy: language === 'fr' ? 'Cliquer pour copier' : 'Click to copy',
  };

  return (
    <motion.div 
      initial={false}
      animate={{ 
        width: isExpanded ? 340 : 50,
        height: isExpanded ? 'auto' : 50
      }}
      className={cn(
        'fixed left-0 top-1/2 -translate-y-1/2 z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]',
        'glass-panel rounded-r-3xl overflow-hidden shadow-2xl border-l-0',
        className
      )}
    >
      {/* Header with carrot icon */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors" 
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-3">
          <motion.span 
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: isExpanded ? 1.2 : 1
            }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-2xl"
          >
            🥕
          </motion.span>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
              <span className="text-sm font-bold text-white leading-none">{t.title}</span>
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">{t.subtitle}</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isExpanded && <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest mr-1">{t.shortSubtitle}</span>}
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
          >
            <ChevronRight className="w-4 h-4 text-white/40" />
          </motion.div>
        </div>
      </div>

      {/* Expandable content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 pt-2 max-h-[70vh] overflow-y-auto"
          >
            {/* Language toggle */}
            <div className="flex bg-black/40 p-1 rounded-xl mb-4">
              {(['en', 'fr'] as const).map(l => (
                <button
                  key={l}
                  className={cn(
                    'flex-1 py-1 px-3 rounded-lg text-[10px] font-bold transition-all',
                    language === l ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                  )}
                  onClick={() => setLanguage(l)}
                >
                  {l === 'en' ? '🇬🇧 EN' : '🇫🇷 FR'}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input
                type="text"
                className="w-full bg-black/40 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:border-primary/50 outline-none transition-all"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              <button
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
                  activeCategory === 'all' 
                    ? 'bg-primary/20 border-primary/50 text-white' 
                    : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                )}
                onClick={() => setActiveCategory('all')}
              >
                {t.all}
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border',
                    activeCategory === cat.id 
                      ? 'bg-white/10 border-white/20 text-white' 
                      : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'
                  )}
                  onClick={() => setActiveCategory(cat.id)}
                  style={activeCategory === cat.id ? { borderColor: cat.color + '80', backgroundColor: cat.color + '20' } : {}}
                >
                  <span>{cat.icon}</span>
                  <span>{getLocalizedLabel(cat)}</span>
                </button>
              ))}
            </div>

            {/* Commands list */}
            <div className="space-y-6">
              {(activeCategory === 'all' ? CATEGORIES.filter(c => groupedCommands[c.id]) : [CATEGORIES.find(c => c.id === activeCategory)!])
                .filter(Boolean)
                .map(cat => (
                  <div key={cat.id} className="space-y-3">
                    {activeCategory === 'all' && (
                      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: cat.color }}>
                        <span className="w-4 h-[1px] bg-current opacity-30" />
                        <span>{getLocalizedLabel(cat)}</span>
                      </div>
                    )}
                    <div className="space-y-1.5 px-1">
                      {(activeCategory === 'all' ? groupedCommands[cat.id] || [] : filteredCommands).map(cmd => (
                        <motion.div
                          key={cmd.id}
                          layout
                          whileHover={{ x: 3, backgroundColor: 'rgba(255,255,255,0.05)' }}
                          className={cn(
                            'group flex items-center justify-between p-3 rounded-xl border border-white/5 cursor-pointer transition-colors',
                            copiedCommand === cmd.id ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-white/2'
                          )}
                          onClick={() => handleCommandClick(cmd)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white/90 group-hover:text-primary transition-colors">{getLocalizedCommand(cmd)}</div>
                            <div className="text-[10px] text-white/40 mt-0.5 truncate">{getLocalizedDescription(cmd)}</div>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                             {copiedCommand === cmd.id ? (
                               <Check className="w-3.5 h-3.5 text-emerald-400" />
                             ) : (
                               <Copy className="w-3.5 h-3.5 text-white/10 group-hover:text-white/40 transition-colors" />
                             )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              
              {filteredCommands.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-white/20 gap-3">
                  <Search className="w-8 h-8 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest">{t.noResults}</span>
                </div>
              )}
            </div>

            {/* Help section */}
            <div className="mt-8 p-4 bg-white/2 rounded-2xl border border-white/5 flex gap-3">
              <Lightbulb className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-[10px] text-white/40 leading-relaxed font-medium">
                {t.helpText}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LLMAssistantSidebar;
