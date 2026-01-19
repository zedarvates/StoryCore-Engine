/**
 * Panel Context Menu Component
 * 
 * Provides context menu for panel operations including generation
 * Displays on right-click or long-press on a panel
 * 
 * Validates Requirements: 11.1, 11.3
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Copy,
  Trash2,
  Crop,
  RotateCw,
  Maximize2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
} from 'lucide-react';
import type { Panel } from '../../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface PanelContextMenuProps {
  /**
   * Panel for which the context menu is shown
   */
  panel: Panel;

  /**
   * Position to display the menu
   */
  position: { x: number; y: number };

  /**
   * Callback when menu is closed
   */
  onClose: () => void;

  /**
   * Callback when generate is clicked
   */
  onGenerate?: (panelId: string) => void;

  /**
   * Callback when duplicate is clicked
   */
  onDuplicate?: (panelId: string) => void;

  /**
   * Callback when delete is clicked
   */
  onDelete?: (panelId: string) => void;

  /**
   * Callback when crop is clicked
   */
  onCrop?: (panelId: string) => void;

  /**
   * Callback when rotate is clicked
   */
  onRotate?: (panelId: string) => void;

  /**
   * Callback when scale is clicked
   */
  onScale?: (panelId: string) => void;

  /**
   * Callback when visibility is toggled
   */
  onToggleVisibility?: (panelId: string) => void;

  /**
   * Callback when lock is toggled
   */
  onToggleLock?: (panelId: string) => void;
}

/**
 * Menu item definition
 */
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  divider?: boolean;
  variant?: 'default' | 'primary' | 'danger';
}

// ============================================================================
// Component
// ============================================================================

export const PanelContextMenu: React.FC<PanelContextMenuProps> = ({
  panel,
  position,
  onClose,
  onGenerate,
  onDuplicate,
  onDelete,
  onCrop,
  onRotate,
  onScale,
  onToggleVisibility,
  onToggleLock,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust menu position to keep it within viewport
  useEffect(() => {
    if (!menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Build menu items
  const menuItems: MenuItem[] = [
    {
      id: 'generate',
      label: 'Generate Image',
      icon: <Sparkles className="h-4 w-4" />,
      onClick: () => {
        onGenerate?.(panel.id);
        onClose();
      },
      variant: 'primary',
    },
    {
      id: 'divider-1',
      label: '',
      icon: null,
      onClick: () => {},
      divider: true,
    },
    {
      id: 'crop',
      label: 'Crop',
      icon: <Crop className="h-4 w-4" />,
      onClick: () => {
        onCrop?.(panel.id);
        onClose();
      },
    },
    {
      id: 'rotate',
      label: 'Rotate',
      icon: <RotateCw className="h-4 w-4" />,
      onClick: () => {
        onRotate?.(panel.id);
        onClose();
      },
    },
    {
      id: 'scale',
      label: 'Scale',
      icon: <Maximize2 className="h-4 w-4" />,
      onClick: () => {
        onScale?.(panel.id);
        onClose();
      },
    },
    {
      id: 'divider-2',
      label: '',
      icon: null,
      onClick: () => {},
      divider: true,
    },
    {
      id: 'visibility',
      label: panel.layers[0]?.visible ? 'Hide' : 'Show',
      icon: panel.layers[0]?.visible ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      ),
      onClick: () => {
        onToggleVisibility?.(panel.id);
        onClose();
      },
    },
    {
      id: 'lock',
      label: panel.layers[0]?.locked ? 'Unlock' : 'Lock',
      icon: panel.layers[0]?.locked ? (
        <Unlock className="h-4 w-4" />
      ) : (
        <Lock className="h-4 w-4" />
      ),
      onClick: () => {
        onToggleLock?.(panel.id);
        onClose();
      },
    },
    {
      id: 'divider-3',
      label: '',
      icon: null,
      onClick: () => {},
      divider: true,
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: <Copy className="h-4 w-4" />,
      onClick: () => {
        onDuplicate?.(panel.id);
        onClose();
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: () => {
        onDelete?.(panel.id);
        onClose();
      },
      variant: 'danger',
    },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[200px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      {/* Menu Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          Panel {panel.position.row * 3 + panel.position.col + 1}
        </p>
      </div>

      {/* Menu Items */}
      <div className="py-1">
        {menuItems.map((item) => {
          if (item.divider) {
            return (
              <div
                key={item.id}
                className="my-1 border-t border-gray-200 dark:border-gray-700"
              />
            );
          }

          const baseClasses =
            'w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors';
          const variantClasses = {
            default:
              'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
            primary:
              'text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 font-medium',
            danger:
              'text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20',
          };

          return (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={item.disabled}
              className={`${baseClasses} ${
                variantClasses[item.variant || 'default']
              } ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PanelContextMenu;
