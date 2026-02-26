/**
 * Timeline Context Menu
 * Right-click context menu for timeline with enhanced features:
 * - Video extension options
 * - TTS/Speech configuration
 * - Character selection
 * - Trim and resize options
 */
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { LayerType } from '../../types';
import './TimelineContextMenu.css';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  target: LayerType | 'shot' | 'track' | 'timeline' | null;
  shotId?: string;
  layerId?: string;
  onClose: () => void;
  onAction?: (action: string, data?: { shotId?: string; layerId?: string }) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  submenu?: MenuItem[];
  divider?: boolean;
  disabled?: boolean;
}

export const TimelineContextMenu: React.FC<ContextMenuProps> = ({
  position,
  target,
  shotId,
  layerId,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Build menu items based on target type
  const menuItems: MenuItem[] = useMemo(() => {
    const items: MenuItem[] = [];

    // Common edit actions
    items.push({
      id: 'edit',
      label: 'Édition',
      icon: '✏️',
      submenu: [
        { id: 'cut', label: 'Couper', shortcut: 'Ctrl+X' },
        { id: 'copy', label: 'Copier', shortcut: 'Ctrl+C' },
        { id: 'paste', label: 'Coller', shortcut: 'Ctrl+V' },
        { id: 'duplicate', label: 'Dupliquer', shortcut: 'Ctrl+D' },
        { id: 'delete', label: 'Supprimer', shortcut: 'Suppr' },
      ],
    });

    // Media/Video specific actions
    if (target === 'media') {
      items.push({
        id: 'video',
        label: 'Vidéo',
        icon: '🎬',
        submenu: [
          { id: 'extendVideo', label: 'Étendre la vidéo...' },
          { id: 'extendFreeze', label: 'Étendre (image fixe)', icon: '🖼️' },
          { id: 'extendLoop', label: 'Étendre (boucle)', icon: '🔄' },
          { id: 'extendAI', label: 'Extension IA', icon: '✨' },
          { id: 'trimStart', label: 'Couper le début' },
          { id: 'trimEnd', label: 'Couper la fin' },
        ],
      });
    }

    // Audio specific actions
    if (target === 'audio') {
      items.push({
        id: 'audio',
        label: 'Audio',
        icon: '🔊',
        submenu: [
          { id: 'configureSpeech', label: 'Configurer parole/TTS...', icon: '🗣️' },
          { id: 'selectCharacter', label: 'Sélectionner personnage...', icon: '👤' },
          { id: 'changeVoice', label: 'Changer la voix...', icon: '🎭' },
          { id: 'adjustVolume', label: 'Ajuster le volume...' },
          { id: 'fadeIn', label: 'Fondu entrée' },
          { id: 'fadeOut', label: 'Fondu sortie' },
        ],
      });
    }

    // Text specific actions
    if (target === 'text') {
      items.push({
        id: 'text',
        label: 'Texte',
        icon: '📝',
        submenu: [
          { id: 'editText', label: 'Modifier le texte...' },
          { id: 'configureSpeech', label: 'Convertir en parole (TTS)...', icon: '🗣️' },
          { id: 'selectCharacter', label: 'Assigner à un personnage...', icon: '👤' },
          { id: 'changeStyle', label: 'Modifier le style...' },
        ],
      });
    }

    // Shot actions
    if (target === 'shot' || target === 'media' || target === 'audio' || target === 'text') {
      items.push({
        id: 'shot',
        label: 'Plan',
        icon: '🎞️',
        submenu: [
          { id: 'split', label: 'Diviser à la tête de lecture', shortcut: 'S' },
          { id: 'trimStart', label: 'Rogner le début' },
          { id: 'trimEnd', label: 'Rogner la fin' },
          { id: 'addMarker', label: 'Ajouter un marqueur' },
        ],
      });

      items.push({
        id: 'timing',
        label: 'Timing',
        icon: '⏱️',
        submenu: [
          { id: 'normalSpeed', label: 'Vitesse normale (1x)' },
          { id: 'halfSpeed', label: 'Demi-vitesse (0.5x)' },
          { id: 'doubleSpeed', label: 'Double vitesse (2x)' },
          { id: 'customSpeed', label: 'Vitesse personnalisée...' },
        ],
      });
    }

    // Track actions
    if (target === 'track') {
      items.push({
        id: 'track',
        label: 'Piste',
        icon: '📊',
        submenu: [
          { id: 'mute', label: 'Muet' },
          { id: 'solo', label: 'Solo' },
          { id: 'lock', label: 'Verrouiller' },
          { id: 'hide', label: 'Masquer' },
          { id: 'deleteTrack', label: 'Supprimer la piste' },
        ],
      });
    }

    // Add transition options
    if (target === 'media' || target === 'shot') {
      items.push({
        id: 'transitions',
        label: 'Transitions',
        icon: '↔️',
        submenu: [
          { id: 'addFadeIn', label: 'Fondu entrée' },
          { id: 'addFadeOut', label: 'Fondu sortie' },
          { id: 'addDissolve', label: 'Fondu enchaîné' },
          { id: 'addWipe', label: 'Balayage' },
          { id: 'removeTransition', label: 'Supprimer la transition' },
        ],
      });
    }

    return items;
  }, [target]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [onClose]);

  const handleAction = useCallback((action: string) => {
    onAction?.(action, { shotId, layerId });
    onClose();
  }, [onAction, onClose, shotId, layerId]);

  if (!position) return null;

  return (
    <div 
      ref={menuRef}
      className="timeline-context-menu"
      style={{ top: position.y, left: position.x }}
      role="menu"
    >
      {menuItems.map((item) => (
        <div 
          key={item.id}
          className="context-menu-item"
          onMouseEnter={() => item.submenu && setActiveSubmenu(item.id)}
          onClick={() => item.submenu || handleAction(item.id)}
        >
          <span className="item-label">{item.label}</span>
          {item.submenu && <span className="item-arrow">▶</span>}
          
          {item.submenu && activeSubmenu === item.id && (
            <div className="context-submenu">
              {item.submenu.map((subItem) => (
                <div 
                  key={subItem.id}
                  className="context-menu-item"
                  onClick={(e) => { e.stopPropagation(); handleAction(subItem.id); }}
                >
                  <span className="item-label">{subItem.label}</span>
                  {subItem.shortcut && (
                    <span className="item-shortcut">{subItem.shortcut}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TimelineContextMenu;


