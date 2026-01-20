import { useState, useCallback } from 'react';
import { ContextMenuItem } from './ContextMenu';

export interface ContextMenuState {
  visible: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  context?: any;
}

export const useContextMenu = () => {
  const [menuState, setMenuState] = useState<ContextMenuState>({
    visible: false,
    position: { x: 0, y: 0 },
    items: [],
    context: null
  });

  const showContextMenu = useCallback((
    x: number,
    y: number,
    items: ContextMenuItem[],
    context?: any
  ) => {
    setMenuState({
      visible: true,
      position: { x, y },
      items,
      context
    });
  }, []);

  const hideContextMenu = useCallback(() => {
    setMenuState(prev => ({
      ...prev,
      visible: false
    }));
  }, []);

  const handleContextMenu = useCallback((
    event: React.MouseEvent,
    items: ContextMenuItem[],
    context?: any
  ) => {
    event.preventDefault();
    event.stopPropagation();
    showContextMenu(event.clientX, event.clientY, items, context);
  }, [showContextMenu]);

  return {
    menuState,
    showContextMenu,
    hideContextMenu,
    handleContextMenu
  };
};
