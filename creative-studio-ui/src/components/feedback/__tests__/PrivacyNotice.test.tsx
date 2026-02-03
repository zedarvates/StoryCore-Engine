/**
 * Unit tests for PrivacyNotice component
 * 
 * Tests privacy notice display, consent checkbox functionality,
 * and local storage persistence.
 * 
 * Requirements: 7.3, 7.4
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrivacyNotice, loadConsentPreference, saveConsentPreference } from '../PrivacyNotice';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PrivacyNotice Component', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('Privacy Notice Display', () => {
    it('should display privacy notice explaining data collection', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Check for privacy notice heading
      expect(screen.getByText(/Privacy Notice:/)).toBeInTheDocument();

      // Check for key data collection points
      expect(screen.getByText(/System Information:/)).toBeInTheDocument();
      expect(screen.getByText(/Module Context:/)).toBeInTheDocument();
      expect(screen.getByText(/Your Description:/)).toBeInTheDocument();
      expect(screen.getByText(/Screenshot:/)).toBeInTheDocument();
      expect(screen.getByText(/Error Information:/)).toBeInTheDocument();

      // Check for GitHub visibility notice
      expect(screen.getByText(/public GitHub repository/)).toBeInTheDocument();
      expect(screen.getByText(/Sensitive information.*automatically removed/)).toBeInTheDocument();
    });

    it('should display log consent checkbox', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Check for consent checkbox label
      expect(screen.getByText(/Include application logs in my report/)).toBeInTheDocument();
      
      // Check for checkbox element
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it('should display different messages based on consent state', () => {
      const mockOnConsentChange = vi.fn();
      
      const { rerender } = render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // When consent is disabled
      expect(screen.getByText(/Disabled:/)).toBeInTheDocument();
      expect(screen.getByText(/No logs will be included/)).toBeInTheDocument();

      // When consent is enabled
      rerender(
        <PrivacyNotice
          logConsent={true}
          onConsentChange={mockOnConsentChange}
        />
      );

      expect(screen.getByText(/Enabled:/)).toBeInTheDocument();
      expect(screen.getByText(/last 500 lines.*will be included/)).toBeInTheDocument();
    });

    it('should display public visibility warning', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      expect(screen.getByText(/publicly visible on GitHub/)).toBeInTheDocument();
    });
  });

  describe('Consent Checkbox Functionality', () => {
    it('should call onConsentChange when checkbox is clicked', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnConsentChange).toHaveBeenCalledWith(true);
    });

    it('should toggle consent state when checkbox is clicked multiple times', () => {
      const mockOnConsentChange = vi.fn();
      
      // Start with false
      const { rerender } = render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      // First click - enable
      fireEvent.click(checkbox);
      expect(mockOnConsentChange).toHaveBeenCalledWith(true);

      // Update the component with new state
      rerender(
        <PrivacyNotice
          logConsent={true}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Second click - disable
      fireEvent.click(checkbox);
      expect(mockOnConsentChange).toHaveBeenCalledWith(false);
    });

    it('should reflect the current consent state in checkbox', () => {
      const mockOnConsentChange = vi.fn();
      
      const { rerender } = render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Radix UI Checkbox uses data-state attribute instead of checked property
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('data-state', 'unchecked');

      rerender(
        <PrivacyNotice
          logConsent={true}
          onConsentChange={mockOnConsentChange}
        />
      );

      expect(checkbox).toHaveAttribute('data-state', 'checked');
    });
  });

  describe('Local Storage Persistence', () => {
    it('should save consent preference to local storage when changed', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Check that preference was saved
      const stored = localStorageMock.getItem('storycore-feedback-log-consent');
      expect(stored).toBe('true');
    });

    it('should load consent preference from local storage on mount', async () => {
      // Set initial preference in storage
      localStorageMock.setItem('storycore-feedback-log-consent', 'true');

      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Should call onConsentChange with stored value
      await waitFor(() => {
        expect(mockOnConsentChange).toHaveBeenCalledWith(true);
      });
    });

    it('should not override current state if storage matches', async () => {
      // Set preference in storage
      localStorageMock.setItem('storycore-feedback-log-consent', 'true');

      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={true}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Should not call onConsentChange if values match
      await waitFor(() => {
        expect(mockOnConsentChange).not.toHaveBeenCalled();
      });
    });

    it('should handle missing storage gracefully', async () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      // Should not crash or call onConsentChange
      await waitFor(() => {
        expect(mockOnConsentChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Helper Functions', () => {
    it('loadConsentPreference should return false when not set', () => {
      const result = loadConsentPreference();
      expect(result).toBe(false);
    });

    it('loadConsentPreference should return stored value', () => {
      localStorageMock.setItem('storycore-feedback-log-consent', 'true');
      const result = loadConsentPreference();
      expect(result).toBe(true);
    });

    it('saveConsentPreference should save to local storage', () => {
      saveConsentPreference(true);
      const stored = localStorageMock.getItem('storycore-feedback-log-consent');
      expect(stored).toBe('true');
    });

    it('saveConsentPreference should handle errors gracefully', () => {
      // Mock localStorage.setItem to throw
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('Storage error');
      };

      // Should not throw
      expect(() => saveConsentPreference(true)).not.toThrow();

      // Restore
      localStorageMock.setItem = originalSetItem;
    });

    it('loadConsentPreference should handle errors gracefully', () => {
      // Mock localStorage.getItem to throw
      const originalGetItem = localStorageMock.getItem;
      localStorageMock.getItem = () => {
        throw new Error('Storage error');
      };

      // Should return false and not throw
      const result = loadConsentPreference();
      expect(result).toBe(false);

      // Restore
      localStorageMock.getItem = originalGetItem;
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      const label = screen.getByText(/Include application logs in my report/);
      
      expect(checkbox).toHaveAttribute('id', 'log-consent');
      expect(label).toHaveAttribute('for', 'log-consent');
    });

    it('should be keyboard accessible', () => {
      const mockOnConsentChange = vi.fn();
      
      render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      
      // Verify checkbox is focusable (keyboard accessible)
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
      
      // Verify it's not disabled
      expect(checkbox).not.toBeDisabled();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const mockOnConsentChange = vi.fn();
      
      const { container } = render(
        <PrivacyNotice
          logConsent={false}
          onConsentChange={mockOnConsentChange}
          className="custom-class"
        />
      );

      const rootElement = container.firstChild as HTMLElement;
      expect(rootElement.className).toContain('custom-class');
    });
  });
});
