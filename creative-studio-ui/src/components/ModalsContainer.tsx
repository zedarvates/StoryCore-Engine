/**
 * Modals Container
 * 
 * Centralized container for all application modals.
 * Prevents duplication and ensures consistent modal management.
 */

import React from 'react';
import { InstallationWizardModal } from '@/components/installation/InstallationWizardModal';
import { WorldWizardModal } from '@/components/wizard/WorldWizardModal';
import { CharacterWizardModal } from '@/components/wizard/CharacterWizardModal';
import { ObjectWizardModal } from '@/components/wizard/ObjectWizardModal';
import { StorytellerWizardModal } from '@/components/wizard/StorytellerWizardModal';
import { ProjectSetupWizardModal } from '@/components/wizard/ProjectSetupWizardModal';
import { CreateProjectDialogModal } from '@/components/wizard/CreateProjectDialogModal';
import { SequencePlanWizardModal } from '@/components/wizard/SequencePlanWizardModal';
import { ShotWizardModal } from '@/components/wizard/ShotWizardModal';
import { GenericWizardModal } from '@/components/wizard/GenericWizardModal';
import { LLMSettingsModal } from '@/components/settings/LLMSettingsModal';
import { ComfyUISettingsModal } from '@/components/settings/ComfyUISettingsModal';
import { GeneralSettingsWindow } from '@/components/configuration/GeneralSettingsWindow';
import { AddonsModal } from '@/components/settings/AddonsModal';
import { CharactersModal } from '@/components/modals/CharactersModal';
import { WorldModal } from '@/components/modals/WorldModal';
import { LocationsModal } from '@/components/modals/LocationsModal';
import { ObjectsModal } from '@/components/modals/ObjectsModal';
import { ImageGalleryModal } from '@/components/modals/ImageGalleryModal';
import { FeedbackPanel } from '@/components/feedback/FeedbackPanel';
import { PendingReportsList } from '@/components/feedback/PendingReportsList';
import type { FeedbackInitialContext } from '@/components/feedback/types';

interface ModalsContainerProps {
  // Installation
  showInstallationWizard: boolean;
  onCloseInstallationWizard: () => void;
  onCompleteInstallation: () => void;

  // Wizards
  showWorldWizard: boolean;
  onCloseWorldWizard: () => void;
  onCompleteWorld: (world: unknown) => void;

  showCharacterWizard: boolean;
  onCloseCharacterWizard: () => void;
  onCompleteCharacter: (character: unknown) => void;

  showObjectWizard: boolean;
  onCloseObjectWizard: () => void;
  onCompleteObject: (object: unknown) => void;

  showStorytellerWizard: boolean;
  onCloseStorytellerWizard: () => void;
  onCompleteStoryteller: (story: unknown) => void;

  // Settings
  showLLMSettings: boolean;
  onCloseLLMSettings: () => void;

  showComfyUISettings: boolean;
  onCloseComfyUISettings: () => void;

  showGeneralSettings: boolean;
  onCloseGeneralSettings: () => void;

  // Addons
  showAddonsModal: boolean;
  onCloseAddonsModal: () => void;

  // Content Modals
  showCharactersModal: boolean;
  onCloseCharactersModal: () => void;

  showWorldModal: boolean;
  onCloseWorldModal: () => void;

  showLocationsModal: boolean;
  onCloseLocationsModal: () => void;

  showObjectsModal: boolean;
  onCloseObjectsModal: () => void;

  showImageGalleryModal: boolean;
  onCloseImageGalleryModal: () => void;

  // Feedback
  showFeedbackPanel: boolean;
  onCloseFeedbackPanel: () => void;
  feedbackInitialContext?: FeedbackInitialContext;
  onOpenPendingReports: () => void;

  showPendingReportsList: boolean;
  onClosePendingReportsList: () => void;

  // Generic Wizard
  activeWizardType: string | null;
  onCloseActiveWizard: () => void;
  onCompleteWizard: (output: unknown) => void;
}

/**
 * Centralized modals container
 * Renders all application modals in one place to prevent duplication
 */
export function ModalsContainer({
  // Installation
  showInstallationWizard,
  onCloseInstallationWizard,
  onCompleteInstallation,

  // Wizards
  showWorldWizard,
  onCloseWorldWizard,
  onCompleteWorld,

  showCharacterWizard,
  onCloseCharacterWizard,
  onCompleteCharacter,

  showObjectWizard,
  onCloseObjectWizard,
  onCompleteObject,

  showStorytellerWizard,
  onCloseStorytellerWizard,
  onCompleteStoryteller,

  // Settings
  showLLMSettings,
  onCloseLLMSettings,

  showComfyUISettings,
  onCloseComfyUISettings,

  showGeneralSettings,
  onCloseGeneralSettings,

  // Addons
  showAddonsModal,
  onCloseAddonsModal,

  // Content Modals
  showCharactersModal,
  onCloseCharactersModal,

  showWorldModal,
  onCloseWorldModal,

  showLocationsModal,
  onCloseLocationsModal,

  showObjectsModal,
  onCloseObjectsModal,

  showImageGalleryModal,
  onCloseImageGalleryModal,

  // Feedback
  showFeedbackPanel,
  onCloseFeedbackPanel,
  feedbackInitialContext,
  onOpenPendingReports,

  showPendingReportsList,
  onClosePendingReportsList,

  // Generic Wizard
  activeWizardType,
  onCloseActiveWizard,
  onCompleteWizard,
}: ModalsContainerProps) {
  return (
    <>
      {/* Installation Wizard */}
      <InstallationWizardModal
        isOpen={showInstallationWizard}
        onClose={onCloseInstallationWizard}
        onComplete={onCompleteInstallation}
      />

      {/* Content Wizards */}
      <WorldWizardModal
        isOpen={showWorldWizard}
        onClose={onCloseWorldWizard}
        onComplete={onCompleteWorld}
      />
      <CharacterWizardModal
        isOpen={showCharacterWizard}
        onClose={onCloseCharacterWizard}
        onComplete={onCompleteCharacter}
      />
      <ObjectWizardModal
        isOpen={showObjectWizard}
        onClose={onCloseObjectWizard}
        onComplete={onCompleteObject}
      />
      <StorytellerWizardModal
        isOpen={showStorytellerWizard}
        onClose={onCloseStorytellerWizard}
        onComplete={onCompleteStoryteller}
      />

      {/* Production Wizards */}
      <CreateProjectDialogModal />
      <ProjectSetupWizardModal />
      <SequencePlanWizardModal />
      <ShotWizardModal />

      {/* Generic Wizard Modal */}
      <GenericWizardModal
        isOpen={activeWizardType !== null}
        wizardType={activeWizardType as any}
        onClose={onCloseActiveWizard}
        onComplete={onCompleteWizard}
      />

      {/* Settings Modals */}
      <LLMSettingsModal
        isOpen={showLLMSettings}
        onClose={onCloseLLMSettings}
      />
      <ComfyUISettingsModal
        isOpen={showComfyUISettings}
        onClose={onCloseComfyUISettings}
      />
      <GeneralSettingsWindow
        isOpen={showGeneralSettings}
        onClose={onCloseGeneralSettings}
      />

      {/* Addons Modal */}
      <AddonsModal
        isOpen={showAddonsModal}
        onClose={onCloseAddonsModal}
      />

      {/* Content Modals */}
      <CharactersModal
        isOpen={showCharactersModal}
        onClose={onCloseCharactersModal}
      />
      <WorldModal
        isOpen={showWorldModal}
        onClose={onCloseWorldModal}
      />
      <LocationsModal
        isOpen={showLocationsModal}
        onClose={onCloseLocationsModal}
      />
      <ObjectsModal
        isOpen={showObjectsModal}
        onClose={onCloseObjectsModal}
      />
      <ImageGalleryModal
        isOpen={showImageGalleryModal}
        onClose={onCloseImageGalleryModal}
      />

      {/* Feedback Modals */}
      <FeedbackPanel
        isOpen={showFeedbackPanel}
        onClose={onCloseFeedbackPanel}
        initialContext={feedbackInitialContext}
        onOpenPendingReports={onOpenPendingReports}
      />
      <PendingReportsList
        isOpen={showPendingReportsList}
        onClose={onClosePendingReportsList}
      />
    </>
  );
}


