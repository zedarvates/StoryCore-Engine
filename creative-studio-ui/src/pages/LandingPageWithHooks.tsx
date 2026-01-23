import { useEffect } from 'react';
import { LandingPage } from './LandingPage';
import { CreateProjectDialog } from '@/components/launcher/CreateProjectDialog';
import { FolderNavigationModal } from '@/components/launcher/FolderNavigationModal';
// import { LandingChatBox } from '@/components/launcher/LandingChatBox'; // Temporairement masqué
import { useLandingPage } from '@/hooks/useLandingPage';
import { useRecentProjects } from '@/hooks/useRecentProjects';
import { Alert } from '@/components/ui/alert';

// ============================================================================
// Landing Page With Hooks Component
// ============================================================================

export function LandingPageWithHooks() {
  const {
    isLoading,
    error,
    showCreateDialog,
    showOpenDialog,
    handleCreateProject,
    handleOpenProject,
    handleCreateProjectSubmit,
    handleOpenProjectSubmit,
    handleRecentProjectClick,
    handleRemoveRecentProject,
    setShowCreateDialog,
    setShowOpenDialog,
    clearError,
  } = useLandingPage();

  const {
    projects: recentProjects,
    isLoading: isLoadingProjects,
    error: projectsError,
    refresh: refreshProjects,
    remove: removeRecentProject,
  } = useRecentProjects(true);

  // Refresh projects when dialogs close
  useEffect(() => {
    if (!showCreateDialog && !showOpenDialog) {
      refreshProjects();
    }
  }, [showCreateDialog, showOpenDialog, refreshProjects]);

  return (
    <>
      {/* Global Error Display */}
      {(error || projectsError) && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <Alert
            variant="destructive"
            className="bg-red-900/90 border-red-800 text-red-100 backdrop-blur-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1">{error || projectsError}</p>
              <button
                onClick={clearError}
                className="text-red-200 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Landing Page */}
      <LandingPage
        onCreateProject={handleCreateProject}
        onOpenProject={handleOpenProject}
        recentProjects={recentProjects}
        onRecentProjectClick={handleRecentProjectClick}
        onRemoveRecentProject={removeRecentProject}
        version="1.0.0"
      >
        {/* Chat Box Assistant - TEMPORAIREMENT MASQUÉ POUR LA PREMIÈRE PUBLICATION */}
        {/* Sera réactivé une fois l'intégration LLM complète et testée */}
        {/* <LandingChatBox
          onSendMessage={(message, attachments) => {
            ;
            ;
          }}
        /> */}
      </LandingPage>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProjectSubmit}
      />

      {/* 
        Open Project Dialog - FALLBACK FOR OLDER BROWSERS
        
        CRITICAL: This modal is only shown when:
        1. Running in browser mode (!window.electronAPI)
        2. AND File System Access API is not available
        
        Modern browsers (Chrome, Edge, Opera) use the native showDirectoryPicker() API.
        Electron uses the native OS file dialog.
        
        This custom modal is a fallback for older browsers (Firefox, Safari) that
        don't support the File System Access API yet.
        
        @see useLandingPage.ts - handleOpenProject() for native dialog implementation
        @see FolderNavigationModal.tsx - component documentation
      */}
      {!window.electronAPI && !('showDirectoryPicker' in window) && (
        <FolderNavigationModal
          open={showOpenDialog}
          onOpenChange={setShowOpenDialog}
          onSelectProject={handleOpenProjectSubmit}
        />
      )}

      {/* Loading Overlay */}
      {(isLoading || isLoadingProjects) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-6 py-4 rounded-lg bg-gray-900 border border-gray-700 shadow-xl">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-white font-medium">
              {isLoadingProjects ? 'Loading projects...' : 'Processing...'}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
