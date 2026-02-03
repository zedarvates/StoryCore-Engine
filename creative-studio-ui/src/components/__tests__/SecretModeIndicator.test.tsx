/**
 * Tests for SecretModeIndicator Component
 * Validates visual feedback for secret mode and experimental page states
 * 
 * Requirements: 3.1, 3.2, 3.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SecretModeIndicator } from '../SecretModeIndicator';
import * as SecretModeContext from '@/contexts/SecretModeContext';

// Mock the useSecretMode hook
vi.mock('@/contexts/SecretModeContext', () => ({
  useSecretMode: vi.fn(),
}));

describe('SecretModeIndicator', () => {
  describe('Visibility', () => {
    it('should return null when neither secret mode nor experimental page is active', () => {
      // Mock hook to return inactive state
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      const { container } = render(<SecretModeIndicator />);
      
      // Component should return null, so container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('should render when secret mode is active', () => {
      // Mock hook to return secret mode active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should render the indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render when on experimental page', () => {
      // Mock hook to return experimental page active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should render the indicator
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Content Display', () => {
    it('should show "Secret Mode Active" when keys are held', () => {
      // Mock hook to return secret mode active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should display "Secret Mode Active" text
      expect(screen.getByText('Secret Mode Active')).toBeInTheDocument();
      
      // Should show unlock icon
      expect(screen.getByText('🔓')).toBeInTheDocument();
    });

    it('should show "Experimental Feature" when on experimental page', () => {
      // Mock hook to return experimental page active (keys not held)
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should display "Experimental Feature" text
      expect(screen.getByText('Experimental Feature')).toBeInTheDocument();
      
      // Should show experiment icon
      expect(screen.getByText('🧪')).toBeInTheDocument();
    });

    it('should show warning icon when on experimental page', () => {
      // Mock hook to return experimental page active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should display warning text with icon
      expect(screen.getByText(/⚠️ Work in Progress/i)).toBeInTheDocument();
    });

    it('should not show warning when only secret mode is active', () => {
      // Mock hook to return secret mode active (not on experimental page)
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Should NOT display warning text
      expect(screen.queryByText(/Work in Progress/i)).not.toBeInTheDocument();
    });
  });

  describe('CSS Classes', () => {
    it('should apply experimental-page class when on experimental page', () => {
      // Mock hook to return experimental page active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('secret-mode-indicator');
      expect(indicator).toHaveClass('experimental-page');
    });

    it('should not apply experimental-page class when only secret mode is active', () => {
      // Mock hook to return secret mode active (not on experimental page)
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveClass('secret-mode-indicator');
      expect(indicator).not.toHaveClass('experimental-page');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      // Mock hook to return secret mode active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      const indicator = screen.getByRole('status');
      
      // Should have role="status"
      expect(indicator).toHaveAttribute('role', 'status');
      
      // Should have aria-live="polite"
      expect(indicator).toHaveAttribute('aria-live', 'polite');
      
      // Should have aria-label
      expect(indicator).toHaveAttribute('aria-label', 'Secret mode is active');
    });

    it('should have correct aria-label for experimental page', () => {
      // Mock hook to return experimental page active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      const indicator = screen.getByRole('status');
      expect(indicator).toHaveAttribute('aria-label', 'Viewing experimental feature');
    });

    it('should mark icons as aria-hidden', () => {
      // Mock hook to return secret mode active
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });

      render(<SecretModeIndicator />);
      
      // Icon should be aria-hidden
      const icon = screen.getByText('🔓');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('State Transitions', () => {
    it('should update display when transitioning from secret mode to experimental page', () => {
      // Start with secret mode active
      const { rerender } = render(<SecretModeIndicator />);
      
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: true,
        isOnExperimentalPage: false,
        currentExperimentalFeature: undefined,
        setCurrentExperimentalFeature: vi.fn(),
      });
      
      rerender(<SecretModeIndicator />);
      expect(screen.getByText('Secret Mode Active')).toBeInTheDocument();
      
      // Transition to experimental page (keys released)
      vi.mocked(SecretModeContext.useSecretMode).mockReturnValue({
        isSecretMode: false,
        isOnExperimentalPage: true,
        currentExperimentalFeature: 'advanced-grid-editor',
        setCurrentExperimentalFeature: vi.fn(),
      });
      
      rerender(<SecretModeIndicator />);
      expect(screen.getByText('Experimental Feature')).toBeInTheDocument();
      expect(screen.getByText(/Work in Progress/i)).toBeInTheDocument();
    });
  });
});
