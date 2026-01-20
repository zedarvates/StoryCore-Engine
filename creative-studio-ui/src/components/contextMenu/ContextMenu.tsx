import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  submenu?: ContextMenuItem[];
  action?: () => void;
  separator?: boolean;
}

export interface ContextMenuProps {
  items: ContextMenuItem[];
  position: { x: number; y: number };
  onClose: () => void;
  visible?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  items,
  position,
  onClose,
  visible = true
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenuState, setSubmenuState] = React.useState<{
    itemId: string | null;
    position: { x: number; y: number } | null;
  }>({ itemId: null, position: null });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [visible, onClose]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [visible, onClose]);

  // Adjust position to keep menu within viewport
  const getAdjustedPosition = useCallback(() => {
    if (!menuRef.current) return position;

    const menuRect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    // Adjust horizontal position
    if (x + menuRect.width > viewportWidth) {
      x = viewportWidth - menuRect.width - 10;
    }

    // Adjust vertical position
    if (y + menuRect.height > viewportHeight) {
      y = viewportHeight - menuRect.height - 10;
    }

    return { x: Math.max(10, x), y: Math.max(10, y) };
  }, [position]);

  const handleItemClick = useCallback((item: ContextMenuItem, event: React.MouseEvent) => {
    event.stopPropagation();

    if (item.disabled) return;

    if (item.submenu && item.submenu.length > 0) {
      // Show submenu
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setSubmenuState({
        itemId: item.id,
        position: {
          x: rect.right,
          y: rect.top
        }
      });
    } else {
      // Execute action and close menu
      if (item.action) {
        item.action();
      }
      onClose();
    }
  }, [onClose]);

  const handleMouseEnter = useCallback((item: ContextMenuItem, event: React.MouseEvent) => {
    if (item.submenu && item.submenu.length > 0) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setSubmenuState({
        itemId: item.id,
        position: {
          x: rect.right,
          y: rect.top
        }
      });
    } else {
      setSubmenuState({ itemId: null, position: null });
    }
  }, []);

  const adjustedPosition = getAdjustedPosition();

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            ref={menuRef}
            className="fixed z-50 bg-gray-800 border border-gray-600 rounded-md shadow-lg py-1 min-w-48"
            style={{
              left: adjustedPosition.x,
              top: adjustedPosition.y
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <React.Fragment key={item.id}>
                {item.separator ? (
                  <div className="my-1 border-t border-gray-600" />
                ) : (
                  <button
                    className={`
                      w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2
                      ${item.disabled
                        ? 'text-gray-500 cursor-not-allowed'
                        : item.danger
                          ? 'text-red-400 hover:bg-red-900/30'
                          : 'text-gray-200 hover:bg-gray-700'
                      }
                      ${submenuState.itemId === item.id ? 'bg-gray-700' : ''}
                      transition-colors
                    `}
                    onClick={(e) => handleItemClick(item, e)}
                    onMouseEnter={(e) => handleMouseEnter(item, e)}
                    disabled={item.disabled}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {item.icon && <span className="w-4 h-4">{item.icon}</span>}
                      <span>{item.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.shortcut && (
                        <span className="text-xs text-gray-400">{item.shortcut}</span>
                      )}
                      {item.submenu && item.submenu.length > 0 && (
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </button>
                )}
              </React.Fragment>
            ))}
          </motion.div>

          {/* Submenu */}
          {submenuState.itemId && submenuState.position && (
            <ContextMenu
              items={items.find(item => item.id === submenuState.itemId)?.submenu || []}
              position={submenuState.position}
              onClose={onClose}
              visible={true}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default ContextMenu;
