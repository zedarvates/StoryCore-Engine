/**
 * Test Page for Prompt Library Accessibility
 * Route: /prompt-library-test
 */

import React from 'react';
import { PromptLibraryTest } from '../components/wizard/PromptLibraryTest';

export const PromptLibraryTestPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <PromptLibraryTest />
      </div>
    </div>
  );
};
