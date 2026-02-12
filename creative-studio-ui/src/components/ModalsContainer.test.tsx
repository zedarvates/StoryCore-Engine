import React from 'react';
import { render } from '@testing-library/react';
import { ModalsContainer } from './ModalsContainer';

// Mock heavy modal components to keep test fast
jest.mock('@/components/installation/InstallationWizardModal', () => () => <div data-testid="InstallationWizardModal" />);
jest.mock('@/components/wizard/WorldWizardModal', () => () => <div data-testid="WorldWizardModal" />);
jest.mock('@/components/wizard/CharacterWizardModal', () => () => <div data-testid="CharacterWizardModal" />);
jest.mock('@/components/wizard/StorytellerWizardModal', () => () => <div data-testid="StorytellerWizardModal" />);
jest.mock('@/components/wizard/ProjectSetupWizardModal', () => () => <div data-testid="ProjectSetupWizardModal" />);
jest.mock('@/components/wizard/CreateProjectDialogModal', () => () => <div data-testid="CreateProjectDialogModal" />);
jest.mock('@/components/wizard/SequencePlanWizardModal', () => () => <div data-testid="SequencePlanWizardModal" />);
jest.mock('@/components/wizard/ShotWizardModal', () => () => <div data-testid="ShotWizardModal" />);
jest.mock('@/components/wizard/GenericWizardModal', () => () => <div data-testid="GenericWizardModal" />);
jest.mock('@/components/settings/LLMSettingsModal', () => () => <div data-testid="LLMSettingsModal" />);
jest.mock('@/components/settings/ComfyUISettingsModal', () => () => <div data-testid="ComfyUISettingsModal" />);
jest.mock('@/components/configuration/GeneralSettingsWindow', () => () => <div data-testid="GeneralSettingsWindow" />);
jest.mock('@/components/settings/AddonsModal', () => () => <div data-testid="AddonsModal" />);
jest.mock('@/components/modals/CharactersModal', () => () => <div data-testid="CharactersModal" />);
jest.mock('@/components/modals/WorldModal', () => () => <div data-testid="WorldModal" />);
jest.mock('@/components/modals/LocationsModal', () => () => <div data-testid="LocationsModal" />);
jest.mock('@/components/modals/ObjectsModal', () => () => <div data-testid="ObjectsModal" />);
jest.mock('@/components/modals/ImageGalleryModal', () => () => <div data-testid="ImageGalleryModal" />);
jest.mock('@/components/feedback/FeedbackPanel', () => () => <div data-testid="FeedbackPanel" />);
jest.mock('@/components/feedback/PendingReportsList', () => () => <div data-testid="PendingReportsList" />);

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
