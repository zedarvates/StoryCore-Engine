/**
 * Main Editor Page - Refactored
 *
 * Full-featured video editor with:
 * - Asset library (left panel)
 * - Storyboard/Canvas (center)
 * - Properties/Chat/Assets/Plans (right panel)
 */

import React, { useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { EditorLayout } from '@/components/EditorLayout';
import { AssetPanel } from '@/components/AssetPanel';
import { CanvasArea } from '@/components/CanvasArea';
import { PropertiesPanel } from '@/components/PropertiesPanel';
import { CentralConfigurationUI } from '@/components';
import { WizardLauncher } from '@/components/wizard/WizardLauncher';
import { ConfigurationProvider } from '@/contexts/ConfigurationContext';
import { WIZARD_DEFINITIONS } from '@/data/wizardDefinitions';

interface EditorPageProps {
  sequenceId?: string;
  onBackToDashboard: () => void;
}

export function EditorPage({ sequenceId, onBackToDashboard }: EditorPageProps) {
  const { project } = useAppStore();
  const { projectPath } = useEditorStore();

  // Handle generation completion
  const handleGenerationComplete = (asset: unknown) => {
    console.log('[EditorPage] Generation completed:', asset);
    // Asset will be automatically saved by the generation services
    // and integrated into the project
  };

  return (
    <EditorLayout onGenerationComplete={handleGenerationComplete}>
      <AssetPanel projectPath={projectPath || undefined} />
      <CanvasArea onBackToDashboard={onBackToDashboard} />
      <PropertiesPanel />
    </EditorLayout>
  );
}

