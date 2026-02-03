/**
 * AboutModal - Modal displaying application information
 * 
 * Shows:
 * - Application name and version
 * - Credits and contributors
 * - License information
 * - Links to documentation and repository
 * 
 * Requirements: 6.3
 */

import React from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { ExternalLink, Github, Book } from 'lucide-react';

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  version?: string;
  buildDate?: string;
}

/**
 * AboutModal component
 * 
 * Displays application information, version, and credits.
 */
export function AboutModal({
  isOpen,
  onClose,
  version = '1.0.0',
  buildDate = new Date().toISOString().split('T')[0],
}: AboutModalProps) {
  const links = [
    {
      label: 'Documentation',
      url: 'https://github.com/storycore/storycore-engine#readme',
      icon: Book,
    },
    {
      label: 'GitHub Repository',
      url: 'https://github.com/storycore/storycore-engine',
      icon: Github,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="About StoryCore Creative Studio"
      size="md"
    >
      <div className="space-y-6">
        {/* Logo and Name */}
        <div className="text-center py-4">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            StoryCore-Engine
          </div>
          <div className="text-lg text-gray-600 dark:text-gray-400">
            Creative Studio
          </div>
        </div>

        {/* Version Information */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Version:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{version}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Build Date:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{buildDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Data Contract:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">v1.0</span>
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          <p>
            StoryCore-Engine is a self-correcting multimodal production pipeline that transforms
            scripts into professional-quality cinematic sequences. It features visual coherence
            guarantees, autonomous quality control, and deterministic reproducibility.
          </p>
        </div>

        {/* Key Features */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Key Features:</h4>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
            <li>Master Coherence Sheet for visual consistency</li>
            <li>Autonomous QA + Autofix Loop</li>
            <li>Full deterministic pipeline</li>
            <li>ComfyUI integration ready</li>
          </ul>
        </div>

        {/* Links */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Resources:</h4>
          <div className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              );
            })}
          </div>
        </div>

        {/* License */}
        <div className="text-xs text-gray-500 dark:text-gray-500 pt-4 border-t border-gray-200 dark:border-gray-800">
          <p>© 2024 StoryCore-Engine. All rights reserved.</p>
          <p className="mt-1">
            Licensed under the MIT License. See LICENSE file for details.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
