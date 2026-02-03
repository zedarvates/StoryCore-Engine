/**
 * PendingReportsList Component Example
 * 
 * This file demonstrates how to use the PendingReportsList component
 * in your application.
 */

import React, { useState } from 'react';
import { PendingReportsList } from './PendingReportsList';

/**
 * Example: Basic usage with a button to open the pending reports list
 */
export const BasicExample: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        View Pending Reports
      </button>

      <PendingReportsList
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};

/**
 * Example: Integration with main menu
 */
export const MenuIntegrationExample: React.FC = () => {
  const [isPendingReportsOpen, setIsPendingReportsOpen] = useState(false);

  return (
    <div>
      <nav className="bg-gray-800 text-white p-4">
        <ul className="flex gap-4">
          <li>
            <button
              onClick={() => setIsPendingReportsOpen(true)}
              className="hover:text-gray-300"
            >
              Pending Reports
            </button>
          </li>
          {/* Other menu items */}
        </ul>
      </nav>

      <PendingReportsList
        isOpen={isPendingReportsOpen}
        onClose={() => setIsPendingReportsOpen(false)}
      />
    </div>
  );
};

/**
 * Example: Integration with FeedbackPanel
 * 
 * Show a link to pending reports in the feedback panel
 */
export const FeedbackPanelIntegrationExample: React.FC = () => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isPendingReportsOpen, setIsPendingReportsOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setIsFeedbackOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Submit Feedback
      </button>

      {/* Feedback Panel would go here */}
      {isFeedbackOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-semibold mb-4">Submit Feedback</h2>
            
            {/* Feedback form fields would go here */}
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setIsFeedbackOpen(false);
                  setIsPendingReportsOpen(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                View pending reports
              </button>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setIsFeedbackOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <PendingReportsList
        isOpen={isPendingReportsOpen}
        onClose={() => setIsPendingReportsOpen(false)}
      />
    </div>
  );
};

/**
 * Example: Keyboard shortcut integration
 */
export const KeyboardShortcutExample: React.FC = () => {
  const [isPendingReportsOpen, setIsPendingReportsOpen] = useState(false);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+Shift+P or Cmd+Shift+P to open pending reports
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        setIsPendingReportsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div>
      <p className="text-gray-600">
        Press <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Ctrl+Shift+P</kbd> 
        {' '}or{' '}
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded">Cmd+Shift+P</kbd>
        {' '}to view pending reports
      </p>

      <PendingReportsList
        isOpen={isPendingReportsOpen}
        onClose={() => setIsPendingReportsOpen(false)}
      />
    </div>
  );
};

export default BasicExample;
