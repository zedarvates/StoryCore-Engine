import { vi } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { ModalsContainer } from './ModalsContainer';

// Mock heavy modal components to keep test fast
vi.mock('@/components/installation/InstallationWizardModal', () => () => <div data-testid="InstallationWizardModal" />);
vi.mock('@/components/wizard/WorldWizardModal', () => () => <div data-testid="WorldWizardModal" />);
vi.mock('@/components/wizard/CharacterWizardModal', () => () => <div data-testid="CharacterWizardModal" />);
vi.mock('@/components/wizard/StorytellerWizardModal', () => () => <div data-testid="StorytellerWizardModal" />);
vi.mock('@/components/wizard/ProjectSetupWizardModal', () => () => <div data-testid="ProjectSetupWizardModal" />);
vi.mock('@/components/wizard/CreateProjectDialogModal', () => () => <div data-testid="CreateProjectDialogModal" />);
vi.mock('@/components/wizard/SequencePlanWizardModal', () => () => <div data-testid="SequencePlanWizardModal" />);
vi.mock('@/components/wizard/ShotWizardModal', () => () => <div data-testid="ShotWizardModal" />);
vi.mock('@/components/wizard/GenericWizardModal', () => () => <div data-testid="GenericWizardModal" />);
vi.mock('@/components/settings/LLMSettingsModal', () => () => <div data-testid="LLMSettingsModal" />);
vi.mock('@/components/settings/ComfyUISettingsModal', () => () => <div data-testid="ComfyUISettingsModal" />);
vi.mock('@/components/configuration/GeneralSettingsWindow', () => () => <div data-testid="GeneralSettingsWindow" />);
vi.mock('@/components/settings/AddonsModal', () => () => <div data-testid="AddonsModal" />);
vi.mock('@/components/modals/CharactersModal', () => () => <div data-testid="CharactersModal" />);
vi.mock('@/components/modals/WorldModal', () => () => <div data-testid="WorldModal" />);
vi.mock('@/components/modals/LocationsModal', () => () => <div data-testid="LocationsModal" />);
vi.mock('@/components/modals/ObjectsModal', () => () => <div data-testid="ObjectsModal" />);
vi.mock('@/components/modals/ImageGalleryModal', () => () => <div data-testid="ImageGalleryModal" />);
vi.mock('@/components/feedback/FeedbackPanel', () => () => <div data-testid="FeedbackPanel" />);
vi.mock('@/components/feedback/PendingReportsList', () => () => <div data-testid="PendingReportsList" />);

test('ModalsContainer renders without crashing', () => {
  const { container } = render(
    <ModalsContainer
      showInstallationWizard={false}
      onCloseInstallationWizard={() => {}}
      onCompleteInstallation={() => {}}
      showWorldWizard={false}
      onCloseWorldWizard={() => {}}
      onCompleteWorld={() => {}}
      showCharacterWizard={false}
      onCloseCharacterWizard={() => {}}
      onCompleteCharacter={() => {}}
      showStorytellerWizard={false}
      onCloseStorytellerWizard={() => {}}
      onCompleteStoryteller={() => {}}
      showLLMSettings={false}
      onCloseLLMSettings={() => {}}
      showComfyUISettings={false}
      onCloseComfyUISettings={() => {}}
      showGeneralSettings={false}
      onCloseGeneralSettings={() => {}}
      showAddonsModal={false}
      onCloseAddonsModal={() => {}}
      showCharactersModal={false}
      onCloseCharactersModal={() => {}}
      showWorldModal={false}
      onCloseWorldModal={() => {}}
      showLocationsModal={false}
      onCloseLocationsModal={() => {}}
      showObjectsModal={false}
      onCloseObjectsModal={() => {}}
      showImageGalleryModal={false}
      onCloseImageGalleryModal={() => {}}
      showFeedbackPanel={false}
      onCloseFeedbackPanel={() => {}}
      onOpenPendingReports={() => {}}
      showPendingReportsList={false}
      onClosePendingReportsList={() => {}}
      activeWizardType={null}
      onCloseActiveWizard={() => {}}
      onCompleteWizard={() => {}}
    />
  );
  expect(container).toBeTruthy();
});
