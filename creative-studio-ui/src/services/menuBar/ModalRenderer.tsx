/**
 * ModalRenderer - Renders active modals from ModalManager
 * 
 * Automatically renders all active modals registered with the ModalManager.
 * Should be placed at the root of the application.
 */

import React from 'react';
import { useModalManager } from './useModalManager';
import { modalManager, ModalManager } from './ModalManager';

export interface ModalRendererProps {
  manager?: ModalManager;
}

/**
 * ModalRenderer component
 * 
 * Renders all active modals from the ModalManager.
 * Place this component at the root of your application.
 */
export function ModalRenderer({ manager = modalManager }: ModalRendererProps) {
  const { activeModals, closeModal } = useModalManager(manager);

  return (
    <>
      {Array.from(activeModals).map((modalId) => {
        const ModalComponent = manager.getModalComponent(modalId);
        const modalState = manager.getModalState(modalId);

        if (!ModalComponent) {
          console.warn(`Modal component not found for ID: ${modalId}`);
          return null;
        }

        return (
          <ModalComponent
            key={modalId}
            isOpen={true}
            onClose={() => closeModal(modalId)}
            {...(modalState?.props || {})}
          />
        );
      })}
    </>
  );
}
