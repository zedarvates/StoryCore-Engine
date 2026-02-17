/**
 * Camera Angle Editor Modal Context
 * 
 * Provides global state management for the camera angle editor modal.
 * Allows opening the modal from anywhere in the application with an initial image.
 * 
 * Usage:
 * ```tsx
 * // In your app root
 * import { CameraAngleEditorProvider } from '@/contexts/CameraAngleEditorContext';
 * 
 * function App() {
 *   return (
 *     <CameraAngleEditorProvider>
 *       <YourApp />
 *     </CameraAngleEditorProvider>
 *   );
 * }
 * 
 * // In any component
 * import { useCameraAngleEditorModal } from '@/contexts/CameraAngleEditorContext';
 * 
 * function MyComponent() {
 *   const { openModal } = useCameraAngleEditorModal();
 *   
 *   return (
 *     <button onClick={() => openModal('image-123', '/path/to/image.jpg')}>
 *       Open Editor
 *     </button>
 *   );
 * }
 * ```
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CameraAngleEditorModal } from '@/components/camera-angle-editor/CameraAngleEditorModal';
import type { CameraAngleResult } from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

interface CameraAngleEditorModalState {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Initial image ID */
  imageId: string | null;
  /** Initial image path */
  imagePath: string | null;
}

interface CameraAngleEditorContextValue {
  /** Current modal state */
  modalState: CameraAngleEditorModalState;
  /** Open the modal with an image */
  openModal: (imageId: string, imagePath: string) => void;
  /** Close the modal */
  closeModal: () => void;
}

interface CameraAngleEditorProviderProps {
  children: React.ReactNode;
  /** Callback when generation completes */
  onGenerationComplete?: (results: CameraAngleResult[]) => void;
  /** Callback when generation fails */
  onGenerationError?: (error: string) => void;
}

// ============================================================================
// Context Creation
// ============================================================================

const CameraAngleEditorContext = createContext<CameraAngleEditorContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

export const CameraAngleEditorProvider: React.FC<CameraAngleEditorProviderProps> = ({
  children,
  onGenerationComplete,
  onGenerationError,
}) => {
  const [modalState, setModalState] = useState<CameraAngleEditorModalState>({
    isOpen: false,
    imageId: null,
    imagePath: null,
  });

  /**
   * Open the modal with an image
   */
  const openModal = useCallback((imageId: string, imagePath: string) => {
    setModalState({
      isOpen: true,
      imageId,
      imagePath,
    });
  }, []);

  /**
   * Close the modal
   */
  const closeModal = useCallback(() => {
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  /**
   * Handle generation complete
   */
  const handleGenerationComplete = useCallback(
    (results: CameraAngleResult[]) => {
      onGenerationComplete?.(results);
    },
    [onGenerationComplete]
  );

  /**
   * Handle generation error
   */
  const handleGenerationError = useCallback(
    (error: string) => {
      onGenerationError?.(error);
    },
    [onGenerationError]
  );

  // Memoize context value
  const contextValue = useMemo(
    () => ({
      modalState,
      openModal,
      closeModal,
    }),
    [modalState, openModal, closeModal]
  );

  return (
    <CameraAngleEditorContext.Provider value={contextValue}>
      {children}
      {/* Render modal at the root level */}
      <CameraAngleEditorModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        initialImageId={modalState.imageId || undefined}
        initialImagePath={modalState.imagePath || undefined}
        onGenerationComplete={handleGenerationComplete}
        onGenerationError={handleGenerationError}
      />
    </CameraAngleEditorContext.Provider>
  );
};

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the camera angle editor modal context
 */
export function useCameraAngleEditorModal(): CameraAngleEditorContextValue {
  const context = useContext(CameraAngleEditorContext);
  
  if (!context) {
    throw new Error(
      'useCameraAngleEditorModal must be used within a CameraAngleEditorProvider'
    );
  }
  
  return context;
}

// ============================================================================
// Optional: Standalone hook without context (for simpler use cases)
// ============================================================================

/**
 * Hook for managing modal state locally without a provider.
 * Useful for components that don't need global modal state.
 */
export function useLocalCameraAngleEditorModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [imageId, setImageId] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);

  const openModal = useCallback((id: string, path: string) => {
    setImageId(id);
    setImagePath(path);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    imageId,
    imagePath,
    openModal,
    closeModal,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default CameraAngleEditorProvider;
