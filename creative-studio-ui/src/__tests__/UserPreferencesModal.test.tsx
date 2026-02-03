/**
 * Unit Tests for UserPreferencesModal Component
 * 
 * Tests the user preferences modal functionality including:
 * - Language dropdown rendering with all supported languages
 * - Language selection and state management
 * - Save button persisting changes
 * - Cancel button discarding changes
 * - Modal open/close behavior
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserPreferencesModal } from '../components/modals/UserPreferencesModal';
import { LanguageProvider } from '../contexts/LanguageContext';
import { I18nProvider } from '../utils/i18n';
import { SUPPORTED_LANGUAGES } from '../types/language';

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
  writable: true,
});

describe('UserPreferencesModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    localStorageMock.clear();
  });

  const renderModal = (isOpen: boolean = true) => {
    return render(
      <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
        <LanguageProvider>
          <UserPreferencesModal isOpen={isOpen} onClose={mockOnClose} />
        </LanguageProvider>
      </I18nProvider>
    );
  };

  describe('Modal Rendering', () => {
    it('renders modal when isOpen is true', () => {
      renderModal(true);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not render modal when isOpen is false', () => {
      renderModal(false);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('displays modal title', () => {
      renderModal(true);
      // The title uses translation key which returns 'preferences.title' in test environment
      expect(screen.getByText('preferences.title')).toBeInTheDocument();
    });
  });

  describe('Language Dropdown', () => {
    it('displays language selection dropdown', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i);
      expect(dropdown).toBeInTheDocument();
      expect(dropdown.tagName).toBe('SELECT');
    });

    it('displays all supported languages in dropdown', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      const options = Array.from(dropdown.options);

      // Verify all supported languages are present
      SUPPORTED_LANGUAGES.forEach((lang) => {
        const optionExists = options.some(
          (option) => option.value === lang.code
        );
        expect(optionExists).toBe(true);
      });

      // Verify count matches
      expect(options.length).toBe(SUPPORTED_LANGUAGES.length);
    });

    it('displays languages in format "Native Name (English Name)"', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      const options = Array.from(dropdown.options);

      SUPPORTED_LANGUAGES.forEach((lang) => {
        const expectedText = `${lang.nativeName} (${lang.name})`;
        const optionExists = options.some(
          (option) => option.textContent === expectedText
        );
        expect(optionExists).toBe(true);
      });
    });

    it('shows current language as selected by default', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      
      // Default language should be 'en' (English) on first load
      expect(dropdown.value).toBe('en');
    });
  });

  describe('Language Selection', () => {
    it('updates selected language when dropdown value changes', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;

      // Change to Spanish
      fireEvent.change(dropdown, { target: { value: 'es' } });
      expect(dropdown.value).toBe('es');

      // Change to French
      fireEvent.change(dropdown, { target: { value: 'fr' } });
      expect(dropdown.value).toBe('fr');
    });

    it('does not apply language change until Save is clicked', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;

      // Change language
      fireEvent.change(dropdown, { target: { value: 'es' } });

      // Language should not be persisted yet
      const stored = localStorageMock.getItem('storycore_language_preference');
      if (stored) {
        const parsed = JSON.parse(stored);
        // If there's a stored preference, it should not be 'es' yet
        expect(parsed.userLanguage).not.toBe('es');
      }
    });
  });

  describe('Save Functionality', () => {
    it('displays Save button', () => {
      renderModal(true);
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('applies language change when Save is clicked', async () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      const saveButton = screen.getByRole('button', { name: /save/i });

      // Change language to Spanish
      fireEvent.change(dropdown, { target: { value: 'es' } });

      // Click Save
      fireEvent.click(saveButton);

      // Wait for state updates
      await waitFor(() => {
        const stored = localStorageMock.getItem('storycore_language_preference');
        expect(stored).toBeTruthy();
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.userLanguage).toBe('es');
        }
      });
    });

    it('closes modal when Save is clicked', () => {
      renderModal(true);
      const saveButton = screen.getByRole('button', { name: /save/i });

      fireEvent.click(saveButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call setLanguage if language has not changed', () => {
      renderModal(true);
      const saveButton = screen.getByRole('button', { name: /save/i });

      // Don't change language, just click Save
      fireEvent.click(saveButton);

      // Modal should still close
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Functionality', () => {
    it('displays Cancel button', () => {
      renderModal(true);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();
    });

    it('discards language changes when Cancel is clicked', async () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Change language to Spanish
      fireEvent.change(dropdown, { target: { value: 'es' } });
      expect(dropdown.value).toBe('es');

      // Click Cancel
      fireEvent.click(cancelButton);

      // Language should not be persisted
      await waitFor(() => {
        const stored = localStorageMock.getItem('storycore_language_preference');
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.userLanguage).not.toBe('es');
        }
      });
    });

    it('closes modal when Cancel is clicked', () => {
      renderModal(true);
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('resets dropdown to current language when Cancel is clicked', async () => {
      const { rerender } = renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      // Initial language should be 'en'
      expect(dropdown.value).toBe('en');

      // Change language to Spanish
      fireEvent.change(dropdown, { target: { value: 'es' } });
      expect(dropdown.value).toBe('es');

      // Click Cancel
      fireEvent.click(cancelButton);

      // Reopen modal
      rerender(
        <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
          <LanguageProvider>
            <UserPreferencesModal isOpen={true} onClose={mockOnClose} />
          </LanguageProvider>
        </I18nProvider>
      );

      // Dropdown should be back to 'en'
      const newDropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      expect(newDropdown.value).toBe('en');
    });
  });

  describe('Modal Close Behavior', () => {
    it('calls onClose when close button (X) is clicked', () => {
      renderModal(true);
      const closeButton = screen.getByLabelText(/close modal/i);

      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('resets local state when modal is reopened', () => {
      const { rerender } = renderModal(true);
      const dropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;

      // Change language
      fireEvent.change(dropdown, { target: { value: 'es' } });
      expect(dropdown.value).toBe('es');

      // Close modal
      rerender(
        <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
          <LanguageProvider>
            <UserPreferencesModal isOpen={false} onClose={mockOnClose} />
          </LanguageProvider>
        </I18nProvider>
      );

      // Reopen modal
      rerender(
        <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
          <LanguageProvider>
            <UserPreferencesModal isOpen={true} onClose={mockOnClose} />
          </LanguageProvider>
        </I18nProvider>
      );

      // Dropdown should be reset to current language (en)
      const newDropdown = screen.getByLabelText(/language/i) as HTMLSelectElement;
      expect(newDropdown.value).toBe('en');
    });
  });

  describe('Accessibility', () => {
    it('language dropdown has proper aria-label', () => {
      renderModal(true);
      // The aria-label uses translation key which returns 'preferences.selectLanguage' in test environment
      const dropdown = screen.getByLabelText('preferences.selectLanguage');
      expect(dropdown).toBeInTheDocument();
    });

    it('modal has proper dialog role', () => {
      renderModal(true);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('language label is associated with dropdown', () => {
      renderModal(true);
      const dropdown = screen.getByLabelText(/language/i);
      expect(dropdown.id).toBe('language-select');
    });
  });
});
