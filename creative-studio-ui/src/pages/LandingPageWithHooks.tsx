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
            console.log('Message envoyé:', message);
            console.log('Fichiers joints:', attachments);
            // TODO: Implémenter l'intégration avec l'assistant IA
            // TODO: Gérer les annotations sonores du dossier "sound"
          }}
        /> */}
      </LandingPage>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreateProject={handleCreateProjectSubmit}
      />

      {/* Open Project Dialog */}
      <FolderNavigationModal
        open={showOpenDialog}
        onOpenChange={setShowOpenDialog}
        onSelectProject={handleOpenProjectSubmit}
      />

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
