/**
 * Timeline Context Menu
 * Right-click context menu for timeline.
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import './TimelineContextMenu.css';

interface ContextMenuProps {
  position: { x: number; y: number } | null;
  target: 'shot' | 'track' | 'timeline' | null;
  onClose: () => void;
  onAction?: (action: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  shortcut?: string;
  submenu?: MenuItem[];
}

export const TimelineContextMenu: React.FC<ContextMenuProps> = ({
  position,
  target,
  onClose,
  onAction,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  
  const menuItems: MenuItem[] = [
    {
      id: 'edit',
      label: 'Edit',
      submenu: [
        { id: 'cut', label: 'Cut', shortcut: 'Ctrl+X' },
        { id: 'copy', label: 'Copy', shortcut: 'Ctrl+C' },
        { id: 'paste', label: 'Paste', shortcut: 'Ctrl+V' },
        { id: 'duplicate', label: 'Duplicate', shortcut: 'Ctrl+D' },
        { id: 'delete', label: 'Delete', shortcut: 'Del' },
      ],
    },
    {
      id: 'shot',
      label: 'Shot',
      submenu: [
        { id: 'split', label: 'Split at Playhead' },
        { id: 'trimStart', label: 'Trim Start' },
        { id: 'trimEnd', label: 'Trim End' },
        { id: 'addMarker', label: 'Add Marker' },
      ],
    },
    {
      id: 'timing',
      label: 'Timing',
      submenu: [
        { id: 'normalSpeed', label: 'Normal Speed (1x)' },
        { id: 'halfSpeed', label: 'Half Speed (0.5x)' },
        { id: 'doubleSpeed', label: 'Double Speed (2x)' },
      ],
    },
    {
      id: 'track',
      label: 'Track',
      submenu: [
        { id: 'mute', label: 'Mute' },
        { id: 'solo', label: 'Solo' },
        { id: 'lock', label: 'Lock' },
        { id: 'hide', label: 'Hide' },
      ],
    },
  ];

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
    onAction?.(action);
    onClose();
  }, [onAction, onClose]);

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


