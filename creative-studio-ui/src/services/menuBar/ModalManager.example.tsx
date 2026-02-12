/**
 * ModalManager Usage Examples
 * 
 * This file demonstrates how to use the ModalManager system
 * with the menu bar modals.
 */

import React, { useEffect } from 'react';
import { modalManager } from './ModalManager';
import { ModalRenderer } from './ModalRenderer';
import { useModalManager } from './useModalManager';
import {
  NewProjectModal,
  SaveAsModal,
  ExportModal,
  KeyboardShortcutsModal,
  AboutModal,
  UnsavedChangesConfirmation,
} from '@/components/modals/menuBar';

/**
 * Example 1: Basic Setup
 * 
 * Register modals at application startup and render them.
 */
export function AppWithModals() {
  useEffect(() => {
    // Register all menu bar modals
    modalManager.registerModal('new-project', NewProjectModal);
    modalManager.registerModal('save-as', SaveAsModal);
    modalManager.registerModal('export', ExportModal);
    modalManager.registerModal('keyboard-shortcuts', KeyboardShortcutsModal);
    modalManager.registerModal('about', AboutModal);
    modalManager.registerModal('unsaved-changes', UnsavedChangesConfirmation);

    // Cleanup on unmount
    return () => {
      modalManager.reset();
    };
  }, []);

  return (
    <div>
      {/* Your app content */}
      <YourAppContent />
      
      {/* Modal renderer - place at root level */}
      <ModalRenderer />
    </div>
  );
}

/**
 * Example 2: Opening Modals from Menu Actions
 * 
 * Use the modal manager to open modals from menu item actions.
 */
export function MenuBarWithModals() {
  const { openModal } = useModalManager();

  const handleNewProject = () => {
    openModal('new-project', {
      onCreateProject: async (name: string, type?: string) => {
        console.log('Creating project:', name, type);
        // Call your project creation service here
      },
    });
  };

  const handleSaveAs = () => {
    openModal('save-as', {
      currentProjectName: 'My Project',
      onSaveAs: async (newName: string, location?: string) => {
        console.log('Saving as:', newName, location);
        // Call your save service here
      },
    });
  };

  const handleExport = () => {
    openModal('export', {
      projectName: 'My Project',
      onExport: async (options: unknown) => {
        console.log('Exporting with options:', options);
        // Call your export service here
      },
    });
  };

  const handleShowShortcuts = () => {
    openModal('keyboard-shortcuts');
  };

  const handleShowAbout = () => {
    openModal('about', {
      version: '1.0.0',
      buildDate: '2024-01-28',
    });
  };

  return (
    <div>
      <button onClick={handleNewProject}>New Project</button>
      <button onClick={handleSaveAs}>Save As</button>
      <button onClick={handleExport}>Export</button>
      <button onClick={handleShowShortcuts}>Keyboard Shortcuts</button>
      <button onClick={handleShowAbout}>About</button>
    </div>
  );
}

/**
 * Example 3: Unsaved Changes Protection
 * 
 * Show confirmation dialog when closing with unsaved changes.
 */
export function ProjectWithUnsavedChanges() {
  const { openModal } = useModalManager();
  const [hasUnsavedChanges, setHasUnsavedChanges] = React.useState(true);

  const handleClose = () => {
    if (hasUnsavedChanges) {
      openModal('unsaved-changes', {
        onSave: async () => {
          console.log('Saving project...');
          // Save the project
          setHasUnsavedChanges(false);
          // Then close
        },
        onDontSave: () => {
          console.log('Closing without saving');
          setHasUnsavedChanges(false);
          // Close without saving
        },
      });
    } else {
      // Close directly
      console.log('Closing project');
    }
  };

  return (
    <div>
      <button onClick={handleClose}>Close Project</button>
    </div>
  );
}

/**
 * Example 4: Programmatic Modal Control
 * 
 * Control modals programmatically without hooks.
 */
export function ProgrammaticModalControl() {
  const openNewProjectModal = () => {
    modalManager.openModal('new-project', {
      onCreateProject: async (name: string) => {
        console.log('Creating:', name);
      },
    });
  };

  const closeAllModals = () => {
    modalManager.closeAll();
  };

  const checkModalState = () => {
    const isOpen = modalManager.isOpen('new-project');
    console.log('New project modal is open:', isOpen);
    
    const activeModals = modalManager.getActiveModals();
    console.log('Active modals:', Array.from(activeModals));
  };

  return (
    <div>
      <button onClick={openNewProjectModal}>Open New Project</button>
      <button onClick={closeAllModals}>Close All Modals</button>
      <button onClick={checkModalState}>Check Modal State</button>
    </div>
  );
}

/**
 * Example 5: Custom Modal Registration
 * 
 * Register custom modals for specific use cases.
 */
function CustomModal({ isOpen, onClose, message }: unknown) {
  return (
    <div>
      {isOpen && (
        <div>
          <p>{message}</p>
          <button onClick={onClose}>Close</button>
        </div>
      )}
    </div>
  );
}

export function CustomModalExample() {
  useEffect(() => {
    // Register custom modal
    modalManager.registerModal('custom-modal', CustomModal);

    return () => {
      modalManager.unregisterModal('custom-modal');
    };
  }, []);

  const openCustomModal = () => {
    modalManager.openModal('custom-modal', {
      message: 'This is a custom modal!',
    });
  };

  return (
    <div>
      <button onClick={openCustomModal}>Open Custom Modal</button>
    </div>
  );
}

// Placeholder component
function YourAppContent() {
  return <div>Your app content here</div>;
}


