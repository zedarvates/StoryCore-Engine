/**
 * Integration test for Installation Wizard
 * Validates Requirements: All (Task 15.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../../App';
import { InstallationWizardProvider } from '../../contexts/InstallationWizardContext';
import { useAppStore } from '../../stores/useAppStore';

// Mock the installation API
vi.mock('../../services/installationApiService', () => ({
  installationApi: {
    initialize: vi.fn().mockResolvedValue({
      success: true,
      data: {
        downloadZonePath: 'C:\\test\\download_zone',
        downloadUrl: 'https://example.com/comfyui.zip',
        expectedFileName: 'ComfyUI_Portable.zip',
        expectedFileSize: 2500000000,
      },
    }),
    checkFile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        exists: false,
        valid: false,
        fileName: null,
        fileSize: null,
        validationError: null,
      },
    }),
    disconnect: vi.fn(),
  },
}));

// Mock fetch for other API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({}),
});

describe('Installation Wizard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useAppStore.setState({
      showInstallationWizard: false,
      installationComplete: false,
    });
  });

  it('should render the app without wizard initially', () => {
    render(
      <InstallationWizardProvider>
        <App />
      </InstallationWizardProvider>
    );

    // Wizard should not be visible initially
    expect(screen.queryByText('ComfyUI Installation Wizard')).not.toBeInTheDocument();
  });

  it('should show wizard when state is set to true', () => {
    // Set the wizard to open
    useAppStore.setState({ showInstallationWizard: true });

    render(
      <InstallationWizardProvider>
        <App />
      </InstallationWizardProvider>
    );

    // Wizard should now be visible
    expect(screen.getByText('ComfyUI Installation Wizard')).toBeInTheDocument();
  });

  it('should have wizard state management in app store', () => {
    const store = useAppStore.getState();
    
    // Check that wizard state exists
    expect(store).toHaveProperty('showInstallationWizard');
    expect(store).toHaveProperty('installationComplete');
    expect(store).toHaveProperty('setShowInstallationWizard');
    expect(store).toHaveProperty('setInstallationComplete');
  });

  it('should update wizard state when actions are called', () => {
    const { setShowInstallationWizard, setInstallationComplete } = useAppStore.getState();
    
    // Test setShowInstallationWizard
    setShowInstallationWizard(true);
    expect(useAppStore.getState().showInstallationWizard).toBe(true);
    
    setShowInstallationWizard(false);
    expect(useAppStore.getState().showInstallationWizard).toBe(false);
    
    // Test setInstallationComplete
    setInstallationComplete(true);
    expect(useAppStore.getState().installationComplete).toBe(true);
    
    setInstallationComplete(false);
    expect(useAppStore.getState().installationComplete).toBe(false);
  });
});
