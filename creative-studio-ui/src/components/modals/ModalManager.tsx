import React, { Suspense, lazy } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useShallow } from 'zustand/react/shallow';
import { useLLMConfig } from '@/services/llmConfigService';
import { Toaster } from '@/components/ui/toaster';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { FeedbackInitialContext } from '@/components/feedback/types';
import { devLog } from '@/utils/devOnly';
import type { World } from '@/types/world';
import type { Character } from '@/types/character';
import type { SequencePlan } from '@/types/sequencePlan';
import type { StoryObject } from '@/types/object';
import type { Story } from '@/types/story';
import type { DialogueBuilderData } from '@/components/wizard/dialogue-builder/DialogueBuilderWizard';
import type { PreviousEpisodeReference, ReferenceImage } from '@/types/reference';

// Lazy-loaded modals
const InstallationWizardModal = lazy(() => import('@/components/installation/InstallationWizardModal').then(m => ({ default: m.InstallationWizardModal })));
const WorldWizardModal = lazy(() => import('@/components/wizard/WorldWizardModal').then(m => ({ default: m.WorldWizardModal })));
const CharacterWizardModal = lazy(() => import('@/components/wizard/CharacterWizardModal').then(m => ({ default: m.CharacterWizardModal })));
const ObjectWizardModal = lazy(() => import('@/components/wizard/ObjectWizardModal').then(m => ({ default: m.ObjectWizardModal })));
const StorytellerWizardModal = lazy(() => import('@/components/wizard/StorytellerWizardModal').then(m => ({ default: m.StorytellerWizardModal })));
const ProjectSetupWizardModal = lazy(() => import('@/components/wizard/ProjectSetupWizardModal').then(m => ({ default: m.ProjectSetupWizardModal })));
const CreateProjectDialogModal = lazy(() => import('@/components/wizard/CreateProjectDialogModal').then(m => ({ default: m.CreateProjectDialogModal })));
const SequencePlanWizardModal = lazy(() => import('@/components/wizard/SequencePlanWizardModal').then(m => ({ default: m.SequencePlanWizardModal })));
const ShotWizardModal = lazy(() => import('@/components/wizard/ShotWizardModal').then(m => ({ default: m.ShotWizardModal })));
const GenericWizardModal = lazy(() => import('@/components/wizard/GenericWizardModal').then(m => ({ default: m.GenericWizardModal })));
const RogerWizardModal = lazy(() => import('../wizard/RogerWizardModalWrapper').then(m => ({ default: m.RogerWizardModal })));
const GhostTrackerWizardModal = lazy(() => import('../wizard/GhostTrackerWizardModal').then(m => ({ default: m.GhostTrackerWizardModal })));
const DialogueWriterWizardModal = lazy(() => import('../wizard/DialogueWriterWizardModal').then(m => ({ default: m.DialogueWriterWizardModal })));
const LipSyncWizardModal = lazy(() => import('../wizard/LipSyncWizardModal').then(m => ({ default: m.LipSyncWizardModal })));
const AudioProductionWizardModal = lazy(() => import('@/components/wizard/production/AudioProductionWizardModal').then(m => ({ default: m.AudioProductionWizardModal })));
const VideoEditorWizardModal = lazy(() => import('@/components/wizard/production/VideoEditorWizardModal').then(m => ({ default: m.VideoEditorWizardModal })));
const ComicToSequenceWizardModal = lazy(() => import('@/components/wizard/production/ComicToSequenceWizardModal').then(m => ({ default: m.ComicToSequenceWizardModal })));
const MarketingWizardModal = lazy(() => import('@/components/wizard/marketing/MarketingWizardModal').then(m => ({ default: m.MarketingWizardModal })));
const ScenarioBuilderWizardModal = lazy(() => import('@/components/wizard/ScenarioBuilderWizardModal').then(m => ({ default: m.ScenarioBuilderWizardModal })));
const DialogueBuilderWizardModal = lazy(() => import('@/components/wizard/DialogueBuilderWizardModal').then(m => ({ default: m.DialogueBuilderWizardModal })));
const ProjectTranslatorModal = lazy(() => import('@/components/wizard/ProjectTranslatorModal').then(m => ({ default: m.ProjectTranslatorModal })));
const TTTLRMModal = lazy(() => import('@/components/wizard/TTTLRMModal').then(m => ({ default: m.TTTLRMModal })));
const VideoPublisherEditor = lazy(() => import('@/components/addons/video_publisher/VideoPublisherEditor').then(m => ({ default: m.VideoPublisherEditor })));
const CreditsScreenModal = lazy(() => import('@/components/addons/credits_screen/CreditsScreenModal').then(m => ({ default: m.CreditsScreenModal })));
const ComfyUISettingsModal = lazy(() => import('@/components/settings/ComfyUISettingsModal').then(m => ({ default: m.ComfyUISettingsModal })));
const GeneralSettingsWindow = lazy(() => import('@/components/configuration/GeneralSettingsWindow').then(m => ({ default: m.GeneralSettingsWindow })));
const AddonsModal = lazy(() => import('@/components/settings/AddonsModal').then(m => ({ default: m.AddonsModal })));
const AddonSettingsModal = lazy(() => import('@/components/settings/AddonSettingsModal').then(m => ({ default: m.AddonSettingsModal })));
const CharactersModal = lazy(() => import('@/components/modals/CharactersModal').then(m => ({ default: m.CharactersModal })));
const WorldModal = lazy(() => import('@/components/modals/WorldModal').then(m => ({ default: m.WorldModal })));
const LocationsModal = lazy(() => import('@/components/modals/LocationsModal').then(m => ({ default: m.LocationsModal })));
const ObjectsModal = lazy(() => import('@/components/modals/ObjectsModal').then(m => ({ default: m.ObjectsModal })));
const ImageGalleryModal = lazy(() => import('@/components/modals/ImageGalleryModal').then(m => ({ default: m.ImageGalleryModal })));
const VaultModal = lazy(() => import('@/components/modals/VaultModal').then(m => ({ default: m.VaultModal })));
const FactCheckModal = lazy(() => import('@/components/modals/FactCheckModal').then(m => ({ default: m.FactCheckModal })));
const AboutModal = lazy(() => import('@/components/modals/AboutModal').then(m => ({ default: m.AboutModal })));
const DocumentationModal = lazy(() => import('@/components/modals/menuBar/DocumentationModal').then(m => ({ default: m.DocumentationModal })));
const KeyboardShortcutsDialog = lazy(() => import('@/components/KeyboardShortcutsDialog').then(m => ({ default: m.KeyboardShortcutsDialog })));
const MoodboardModal = lazy(() => import('@/components/modals/MoodboardModal').then(m => ({ default: m.MoodboardModal })));
const LLMConfigDialog = lazy(() => import('@/components/launcher/LLMConfigDialog').then(m => ({ default: m.LLMConfigDialog })));
const ComputeDashboard = lazy(() => import('@/components/feedback/ComputeDashboard').then(m => ({ default: m.ComputeDashboard })));
const ReferenceSheetManager = lazy(() => import('@/components/reference/ReferenceSheetManager').then(m => ({ default: m.ReferenceSheetManager })));
const VideoReplicationDialog = lazy(() => import('@/components/reference/VideoReplicationDialog').then(m => ({ default: m.VideoReplicationDialog })));
const CrossShotReferencePicker = lazy(() => import('@/components/reference/CrossShotReferencePicker').then(m => ({ default: m.CrossShotReferencePicker })));
const ProjectBranchingDialog = lazy(() => import('@/components/reference/ProjectBranchingDialog').then(m => ({ default: m.ProjectBranchingDialog })));
const EpisodeReferenceDialog = lazy(() => import('@/components/reference/EpisodeReferenceDialog').then(m => ({ default: m.EpisodeReferenceDialog })));
const DialogueEditor = lazy(() => import('@/ui/DialogueEditor'));
const FeedbackPanel = lazy(() => import('@/components/feedback/FeedbackPanel').then(m => ({ default: m.FeedbackPanel })));
const PendingReportsList = lazy(() => import('@/components/feedback/PendingReportsList').then(m => ({ default: m.PendingReportsList })));
const DiscoveryLab = lazy(() => import('@/components/DiscoveryLab/DiscoveryLab').then(m => ({ default: m.DiscoveryLab })));
const AutomationPanel = lazy(() => import('@/components/automation/AutomationPanel').then(m => ({ default: m.AutomationPanel })));
const SequenceEditor = lazy(() => import('@/sequence-editor/SequenceEditor').then(m => ({ default: m.SequenceEditor })));

interface ModalManagerProps {
  onCloseInstallationWizard: () => void;
  onInstallationComplete: (path: string) => void;
  onWorldComplete: (world: World) => void;
  onCharacterComplete: (character: Character) => void;
  onScenarioComplete: (story: Partial<Story>) => void;
  onDialogueBuilderComplete: (data: DialogueBuilderData, result?: string) => void;
  onObjectComplete: (object: Partial<StoryObject>) => void;
  onStorytellerComplete: (story: Story) => void;
  onSequencePlanComplete: (plan: SequencePlan) => void;
  onShotComplete: (shot: any) => void;
  onWizardComplete: (data: unknown) => void;
  feedbackInitialContext?: FeedbackInitialContext;
  settingsAddonName?: string;
  onCloseAddonSettings: () => void;
  onBorrowReferences: (refs: ReferenceImage[]) => void;
  onBranchCreated: (branch: { id: string; name: string }) => void;
  onReferenceAdded: (ref: PreviousEpisodeReference) => void;
  toast: any;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  onCloseInstallationWizard,
  onInstallationComplete,
  onWorldComplete,
  onCharacterComplete,
  onScenarioComplete,
  onDialogueBuilderComplete,
  onObjectComplete,
  onStorytellerComplete,
  onSequencePlanComplete,
  onShotComplete,
  onWizardComplete,
  feedbackInitialContext,
  settingsAddonName = 'Addon Settings',
  onCloseAddonSettings,
  onBorrowReferences,
  onBranchCreated,
  onReferenceAdded,
  toast
}) => {
  const {
    project,
    showInstallationWizard,
    showWorldWizard,
    showCharacterWizard,
    showObjectWizard,
    showStorytellerWizard,
    showLLMSettings,
    setShowLLMSettings,
    showComfyUISettings,
    setShowComfyUISettings,
    showGeneralSettings,
    setShowGeneralSettings,
    showAddonsModal,
    setShowAddonsModal,
    showCharactersModal,
    setShowCharactersModal,
    showWorldModal,
    setShowWorldModal,
    showLocationsModal,
    setShowLocationsModal,
    showObjectsModal,
    setShowObjectsModal,
    showImageGalleryModal,
    setShowImageGalleryModal,
    showVaultModal,
    setShowVaultModal,
    showDialogueEditor,
    setShowDialogueEditor,
    showFeedbackPanel,
    setShowFeedbackPanel,
    showPendingReportsList,
    setShowPendingReportsList,
    showFactCheckModal,
    setShowFactCheckModal,
    showAboutModal,
    setShowAboutModal,
    showMoodboardModal,
    setShowMoodboardModal,
    showDocumentationModal,
    setShowDocumentationModal,
    showKeyboardShortcutsDialog,
    setShowKeyboardShortcutsDialog,
    showSequencePlanWizard,
    closeSequencePlanWizard,
    sequencePlanWizardContext,
    showShotWizard,
    closeShotWizard,
    shotWizardContext,
    showScenarioBuilder,
    setShowScenarioBuilder,
    showDialogueBuilder,
    setShowDialogueBuilder,
    showDiscoveryLab,
    setShowDiscoveryLab,
    showProjectTranslator,
    setShowProjectTranslator,
    showVideoPublisher,
    setShowVideoPublisher,
    showComputeDashboard,
    setShowComputeDashboard,
    showAutomationPanel,
    setShowAutomationPanel,
    showReferenceSheetManager,
    setShowReferenceSheetManager,
    showVideoReplicationDialog,
    setShowVideoReplicationDialog,
    showCrossShotReferencePicker,
    setShowCrossShotReferencePicker,
    showProjectBranchingDialog,
    setShowProjectBranchingDialog,
    showEpisodeReferenceDialog,
    setShowEpisodeReferenceDialog,
    activeWizardType,
    closeActiveWizard,
    showSequenceEditor,
    closeSequenceEditor,
    sequenceEditorContext,
    settingsAddonId,
    selectedShotId,
    characterWizardContext,
    objectWizardContext,
  } = useAppStore(useShallow((state) => ({
    project: state.project,
    showInstallationWizard: state.showInstallationWizard,
    showWorldWizard: state.showWorldWizard,
    showCharacterWizard: state.showCharacterWizard,
    showObjectWizard: state.showObjectWizard,
    showStorytellerWizard: state.showStorytellerWizard,
    showLLMSettings: state.showLLMSettings,
    setShowLLMSettings: state.setShowLLMSettings,
    showComfyUISettings: state.showComfyUISettings,
    setShowComfyUISettings: state.setShowComfyUISettings,
    showGeneralSettings: state.showGeneralSettings,
    setShowGeneralSettings: state.setShowGeneralSettings,
    showAddonsModal: state.showAddonsModal,
    setShowAddonsModal: state.setShowAddonsModal,
    showCharactersModal: state.showCharactersModal,
    setShowCharactersModal: state.setShowCharactersModal,
    showWorldModal: state.showWorldModal,
    setShowWorldModal: state.setShowWorldModal,
    showLocationsModal: state.showLocationsModal,
    setShowLocationsModal: state.setShowLocationsModal,
    showObjectsModal: state.showObjectsModal,
    setShowObjectsModal: state.setShowObjectsModal,
    showImageGalleryModal: state.showImageGalleryModal,
    setShowImageGalleryModal: state.setShowImageGalleryModal,
    showVaultModal: state.showVaultModal,
    setShowVaultModal: state.setShowVaultModal,
    showDialogueEditor: state.showDialogueEditor,
    setShowDialogueEditor: state.setShowDialogueEditor,
    showFeedbackPanel: state.showFeedbackPanel,
    setShowFeedbackPanel: state.setShowFeedbackPanel,
    showPendingReportsList: state.showPendingReportsList,
    setShowPendingReportsList: state.setShowPendingReportsList,
    showFactCheckModal: state.showFactCheckModal,
    setShowFactCheckModal: state.setShowFactCheckModal,
    showAboutModal: state.showAboutModal,
    setShowAboutModal: state.setShowAboutModal,
    showMoodboardModal: state.showMoodboardModal,
    setShowMoodboardModal: state.setShowMoodboardModal,
    showDocumentationModal: state.showDocumentationModal,
    setShowDocumentationModal: state.setShowDocumentationModal,
    showKeyboardShortcutsDialog: state.showKeyboardShortcutsDialog,
    setShowKeyboardShortcutsDialog: state.setShowKeyboardShortcutsDialog,
    showSequencePlanWizard: state.showSequencePlanWizard,
    closeSequencePlanWizard: state.closeSequencePlanWizard,
    sequencePlanWizardContext: state.sequencePlanWizardContext,
    showShotWizard: state.showShotWizard,
    closeShotWizard: state.closeShotWizard,
    shotWizardContext: state.shotWizardContext,
    showScenarioBuilder: state.showScenarioBuilder,
    setShowScenarioBuilder: state.setShowScenarioBuilder,
    showDialogueBuilder: state.showDialogueBuilder,
    setShowDialogueBuilder: state.setShowDialogueBuilder,
    showDiscoveryLab: state.showDiscoveryLab,
    setShowDiscoveryLab: state.setShowDiscoveryLab,
    showProjectTranslator: state.showProjectTranslator,
    setShowProjectTranslator: state.setShowProjectTranslator,
    showVideoPublisher: state.showVideoPublisher,
    setShowVideoPublisher: state.setShowVideoPublisher,
    showComputeDashboard: state.showComputeDashboard,
    setShowComputeDashboard: state.setShowComputeDashboard,
    showAutomationPanel: state.showAutomationPanel,
    setShowAutomationPanel: state.setShowAutomationPanel,
    showReferenceSheetManager: state.showReferenceSheetManager,
    setShowReferenceSheetManager: state.setShowReferenceSheetManager,
    showVideoReplicationDialog: state.showVideoReplicationDialog,
    setShowVideoReplicationDialog: state.setShowVideoReplicationDialog,
    showCrossShotReferencePicker: state.showCrossShotReferencePicker,
    setShowCrossShotReferencePicker: state.setShowCrossShotReferencePicker,
    showProjectBranchingDialog: state.showProjectBranchingDialog,
    setShowProjectBranchingDialog: state.setShowProjectBranchingDialog,
    showEpisodeReferenceDialog: state.showEpisodeReferenceDialog,
    setShowEpisodeReferenceDialog: state.setShowEpisodeReferenceDialog,
    activeWizardType: state.activeWizardType,
    closeActiveWizard: state.closeActiveWizard,
    showSequenceEditor: state.showSequenceEditor,
    closeSequenceEditor: state.closeSequenceEditor,
    sequenceEditorContext: state.sequenceEditorContext,
    settingsAddonId: state.settingsAddonId,
    selectedShotId: state.selectedShotId,
    characterWizardContext: state.characterWizardContext,
    objectWizardContext: state.objectWizardContext,
  })));

  const {
    config: llmConfig,
    updateConfig,
    validateConnection: validateLLMConnection
  } = useLLMConfig();

  return (
    <Suspense fallback={null}>
      {/* Installation Wizard */}
      <InstallationWizardModal
        isOpen={showInstallationWizard}
        onClose={onCloseInstallationWizard}
        onComplete={onInstallationComplete}
      />

      {/* World Wizard Modal */}
      <WorldWizardModal
        isOpen={showWorldWizard}
        onClose={() => useAppStore.getState().setShowWorldWizard(false)}
        onComplete={onWorldComplete}
      />

      {/* Character Wizard Modal */}
      <CharacterWizardModal
        isOpen={showCharacterWizard}
        onClose={() => useAppStore.getState().setShowCharacterWizard(false)}
        onComplete={onCharacterComplete}
        initialImage={characterWizardContext?.imageFile}
        initialData={{ name: characterWizardContext?.name }}
        productionMode={project?.projectSetup?.productionMode}
      />

      {/* Location Wizard Modal */}
      <ScenarioBuilderWizardModal
        isOpen={showScenarioBuilder}
        onClose={() => setShowScenarioBuilder(false)}
        onComplete={onScenarioComplete}
      />

      {/* Dialogue Builder Modal */}
      <DialogueBuilderWizardModal
        isOpen={showDialogueBuilder}
        onClose={() => setShowDialogueBuilder(false)}
        onComplete={onDialogueBuilderComplete}
      />

      {/* Object Wizard Modal */}
      <ObjectWizardModal
        isOpen={showObjectWizard}
        onClose={() => useAppStore.getState().setShowObjectWizard(false)}
        onComplete={onObjectComplete}
        initialData={{ name: objectWizardContext?.name }}
      />

      {/* Storyteller Wizard Modal */}
      <StorytellerWizardModal
        isOpen={showStorytellerWizard}
        onClose={() => useAppStore.getState().setShowStorytellerWizard(false)}
        onComplete={onStorytellerComplete}
      />

      {/* Project Setup Wizard Modal */}
      <ProjectSetupWizardModal />

      {/* Create Project Dialog Modal */}
      <CreateProjectDialogModal />

      {/* Sequence Plan Wizard Modal */}
      <SequencePlanWizardModal
        isOpen={showSequencePlanWizard}
        onClose={closeSequencePlanWizard}
        onComplete={onSequencePlanComplete}
        initialPlan={sequencePlanWizardContext?.existingSequencePlan as SequencePlan}
        mode={sequencePlanWizardContext?.mode}
      />

      {/* Shot Wizard Modal */}
      <ShotWizardModal
        isOpen={showShotWizard}
        onClose={closeShotWizard}
        onComplete={onShotComplete}
        initialShot={shotWizardContext?.existingShot as any}
        sequenceId={shotWizardContext?.sequenceId}
        mode={shotWizardContext?.mode || 'create'}
      />

      {/* Roger Wizard Modal */}
      <RogerWizardModal />

      {/* Ghost Tracker Wizard Modal */}
      <GhostTrackerWizardModal />

      {/* Dialogue Writer Wizard Modal */}
      <DialogueWriterWizardModal />

      {/* Lip Sync Wizard Modal */}
      <LipSyncWizardModal />

      {/* Audio Production Wizard Modal */}
      <AudioProductionWizardModal />

      {/* Video Editor Wizard Modal */}
      <VideoEditorWizardModal />

      {/* Comic to Sequence Wizard Modal */}
      <ComicToSequenceWizardModal />

      {/* Marketing Wizard Modal */}
      <MarketingWizardModal />

      {/* Project Translator Modal */}
      <ProjectTranslatorModal
        isOpen={showProjectTranslator}
        onClose={() => setShowProjectTranslator(false)}
        projectId={project?.id || ''}
        projectData={project as any}
      />

      {/* TTT LRM Modal */}
      <TTTLRMModal />

      {/* Credits Screen Modal */}
      <CreditsScreenModal />

      {/* Video Publisher Editor */}
      <VideoPublisherEditor
        isOpen={showVideoPublisher}
        onClose={() => setShowVideoPublisher(false)}
      />

      {/* Generic Wizard Modal (Requirements 5.1-5.6) */}
      <GenericWizardModal
        isOpen={['style-transfer', 'scene-generator', 'storyboard-creator'].includes(activeWizardType as string)}
        onClose={closeActiveWizard}
        wizardType={activeWizardType!}
        onComplete={onWizardComplete}
      />

      {/* LLM Settings Modal */}
      <LLMConfigDialog
        open={showLLMSettings}
        onOpenChange={setShowLLMSettings}
        currentConfig={llmConfig}
        onSave={updateConfig}
        onValidateConnection={validateLLMConnection}
      />

      {/* ComfyUI Settings Modal */}
      <ComfyUISettingsModal
        isOpen={showComfyUISettings}
        onClose={() => setShowComfyUISettings(false)}
      />

      {/* General Settings Window */}
      <GeneralSettingsWindow
        isOpen={showGeneralSettings}
        onClose={() => setShowGeneralSettings(false)}
      />

      {/* Add-ons Modal */}
      <AddonsModal
        isOpen={showAddonsModal}
        onClose={() => setShowAddonsModal(false)}
      />

      {/* Addon Settings Modal (Individual) */}
      <AddonSettingsModal
        isOpen={!!settingsAddonId}
        onClose={onCloseAddonSettings}
        addonId={settingsAddonId || ''}
        addonName={settingsAddonName}
      />

      {/* Characters Modal */}
      <CharactersModal
        isOpen={showCharactersModal}
        onClose={() => setShowCharactersModal(false)}
      />

      {/* World Modal */}
      <WorldModal
        isOpen={showWorldModal}
        onClose={() => setShowWorldModal(false)}
      />

      {/* Locations Modal */}
      <LocationsModal
        isOpen={showLocationsModal}
        onClose={() => setShowLocationsModal(false)}
      />

      {/* Objects Modal */}
      <ObjectsModal
        isOpen={showObjectsModal}
        onClose={() => setShowObjectsModal(false)}
      />

      {/* Image Gallery Modal */}
      <ImageGalleryModal
        isOpen={showImageGalleryModal}
        onClose={() => setShowImageGalleryModal(false)}
      />

      {/* Vault Modal */}
      <VaultModal
        isOpen={showVaultModal}
        onClose={() => setShowVaultModal(false)}
      />

      {/* Dialogue Editor */}
      <DialogueEditor
        isOpen={showDialogueEditor}
        onClose={() => setShowDialogueEditor(false)}
      />

      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      <DocumentationModal
        isOpen={showDocumentationModal}
        onClose={() => setShowDocumentationModal(false)}
      />

      <MoodboardModal
        isOpen={showMoodboardModal}
        onClose={() => setShowMoodboardModal(false)}
      />

      {/* Feedback Panel */}
      <FeedbackPanel
        isOpen={showFeedbackPanel}
        onClose={() => setShowFeedbackPanel(false)}
        initialContext={feedbackInitialContext}
        onOpenPendingReports={() => setShowPendingReportsList(true)}
      />

      {/* Pending Reports List */}
      <PendingReportsList
        isOpen={showPendingReportsList}
        onClose={() => setShowPendingReportsList(false)}
      />

      {/* Fact Check Modal */}
      <FactCheckModal
        isOpen={showFactCheckModal}
        onClose={() => setShowFactCheckModal(false)}
      />

      {/* Keyboard Shortcuts Dialog */}
      <KeyboardShortcutsDialog
        isOpen={showKeyboardShortcutsDialog}
        onClose={() => setShowKeyboardShortcutsDialog(false)}
      />

      {/* Continuous Creation Modals */}
      <ReferenceSheetManager
        open={showReferenceSheetManager}
        onClose={() => setShowReferenceSheetManager(false)}
        projectId={project?.id || ''}
        projectPath={project?.path || ''}
        onSheetUpdate={() => {
          devLog('Reference sheet updated');
        }}
      />

      <VideoReplicationDialog
        open={showVideoReplicationDialog}
        onClose={() => setShowVideoReplicationDialog(false)}
        onReplicationComplete={(_projectId) => {
          devLog('Video replication started:', _projectId);
          toast({
            title: 'Replication Started',
            description: 'Video replication process has begun',
          });
        }}
      />

      {showCrossShotReferencePicker && (
        <CrossShotReferencePicker
          currentShotId={selectedShotId || ''}
          sequenceId=""
          onSelect={onBorrowReferences}
          onClose={() => setShowCrossShotReferencePicker(false)}
        />
      )}

      <ProjectBranchingDialog
        open={showProjectBranchingDialog}
        onClose={() => setShowProjectBranchingDialog(false)}
        currentProjectId={project?.id || ''}
        currentShotId={selectedShotId || undefined}
        onBranchCreated={onBranchCreated}
      />

      <EpisodeReferenceDialog
        open={showEpisodeReferenceDialog}
        onClose={() => setShowEpisodeReferenceDialog(false)}
        currentProjectId={project?.id || ''}
        onReferenceAdded={onReferenceAdded}
      />

      {/* Narrative Discovery Lab (P0 R&D) */}
      {showDiscoveryLab && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
          <div className="absolute top-4 right-6 z-[110]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDiscoveryLab(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <DiscoveryLab />
        </div>
      )}

      {/* Compute Marketplace Dashboard */}
      {showComputeDashboard && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-10 overflow-auto">
          <div className="absolute top-4 right-6 z-[110]">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => setShowComputeDashboard(false)}
              className="rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <ComputeDashboard />
        </div>
      )}

      {/* Automation Studio & n8n Panel */}
      {showAutomationPanel && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex flex-col p-4 md:p-8 overflow-auto">
          <div className="absolute top-4 right-6 z-[110]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowAutomationPanel(false)}
              className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="max-w-6xl mx-auto w-full flex-1 flex flex-col">
            <AutomationPanel />
          </div>
        </div>
      )}

      {/* Sequence Editor Modal */}
      {showSequenceEditor && (
        <div className="fixed inset-0 z-[120] bg-slate-950 flex flex-col">
          <SequenceEditor 
            sequenceId={sequenceEditorContext?.existingSequencePlan?.id}
            onBack={closeSequenceEditor}
          />
        </div>
      )}

      {/* Toast Notifications */}
      <Toaster />
    </Suspense>
  );
};
