/**
 * Prompt Library Modal
 * Modal wrapper for the Prompt Library Browser
 */

import { useState } from 'react';
import { X, BookOpen } from 'lucide-react';
import { PromptLibraryBrowser } from '../../library/PromptLibraryBrowser';
import '../../library/PromptLibraryBrowser.css';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
  title?: string;
}

export function PromptLibraryModal({
  isOpen,
  onClose,
  onSelectPrompt,
  title = 'Prompt Library'
}: PromptLibraryModalProps) {
  if (!isOpen) return null;

  const handlePromptSelect = (prompt: string) => {
    onSelectPrompt(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[90vh] mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <PromptLibraryBrowser onSelectPrompt={handlePromptSelect} />
        </div>
      </div>
    </div>
  );
}

// Export a hook to manage the modal state
export function usePromptLibraryModal() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev)
  };
}
