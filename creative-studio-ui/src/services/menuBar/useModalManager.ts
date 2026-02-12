/**
 * useModalManager - React hook for modal management
 * 
 * Provides React integration for ModalManager with:
 * - State synchronization
 * - Automatic cleanup
 * - Type-safe modal operations
 */

import { useState, useEffect, useCallback } from 'react';
import { modalManager, ModalManager } from './ModalManager';

export interface UseModalManagerReturn {
  activeModals: Set<string>;
  openModal: (id: string, props?: Record<string, unknown>) => void;
  closeModal: (id: string) => void;
  closeAll: () => void;
  isOpen: (id: string) => boolean;
}

/**
 * Hook for using the modal manager in React components
 * 
 * @param manager - Optional ModalManager instance (defaults to singleton)
 * @returns Modal management functions and state
 */
export function useModalManager(manager: ModalManager = modalManager): UseModalManagerReturn {
  const [activeModals, setActiveModals] = useState<Set<string>>(
    manager.getActiveModals()
  );

  useEffect(() => {
    // Subscribe to modal state changes
    const unsubscribe = manager.subscribe((modals) => {
      setActiveModals(new Set(modals));
    });

    return unsubscribe;
  }, [manager]);

  const openModal = useCallback(
    (id: string, props?: Record<string, unknown>) => {
      manager.openModal(id, props);
    },
    [manager]
  );

  const closeModal = useCallback(
    (id: string) => {
      manager.closeModal(id);
    },
    [manager]
  );

  const closeAll = useCallback(() => {
    manager.closeAll();
  }, [manager]);

  const isOpen = useCallback(
    (id: string) => {
      return manager.isOpen(id);
    },
    [manager]
  );

  return {
    activeModals,
    openModal,
    closeModal,
    closeAll,
    isOpen,
  };
}

