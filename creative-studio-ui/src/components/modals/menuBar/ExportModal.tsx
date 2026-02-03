/**
 * ExportModal - Modal for exporting project in various formats
 * 
 * Provides options for exporting project as:
 * - JSON (Data Contract v1)
 * - PDF Report
 * - Video Sequence
 * 
 * Requirements: 1.5, 13.1-13.6
 */

import React, { useState } from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileJson, FileText, Video } from 'lucide-react';

export type ExportFormat = 'json' | 'pdf' | 'video';

export interface ExportOptions {
  format: ExportFormat;
  includeAssets?: boolean;
  includeQAReport?: boolean;
  videoQuality?: 'low' | 'medium' | 'high';
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: ExportOptions) => void | Promise<void>;
  projectName: string;
}

/**
 * ExportModal component
 * 
 * Modal dialog for selecting export format and options.
 */
export function ExportModal({
  isOpen,
  onClose,
  onExport,
  projectName,
}: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [includeAssets, setIncludeAssets] = useState(true);
  const [includeQAReport, setIncludeQAReport] = useState(true);
  const [videoQuality, setVideoQuality] = useState<'low' | 'medium' | 'high'>('high');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const options: ExportOptions = {
        format: selectedFormat,
        includeAssets,
        includeQAReport,
        videoQuality,
      };

      await onExport(options);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export project');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    if (!isExporting) {
      setError(null);
      onClose();
    }
  };

  const formatOptions = [
    {
      id: 'json' as ExportFormat,
      name: 'JSON',
      description: 'Data Contract v1 format',
      icon: FileJson,
    },
    {
      id: 'pdf' as ExportFormat,
      name: 'PDF Report',
      description: 'Project overview with shots and QA metrics',
      icon: FileText,
    },
    {
      id: 'video' as ExportFormat,
      name: 'Video Sequence',
      description: 'Rendered video from promoted panels',
      icon: Video,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Export Project: ${projectName}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <Label>Export Format</Label>
          <div className="space-y-2">
            {formatOptions.map((format) => {
              const Icon = format.icon;
              return (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => setSelectedFormat(format.id)}
                  disabled={isExporting}
                  className={`w-full p-4 border rounded-lg text-left transition-colors ${
                    selectedFormat === format.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 mt-0.5 text-gray-600 dark:text-gray-400" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {format.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {format.description}
                      </div>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedFormat === format.id
                          ? 'border-blue-500'
                          : 'border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {selectedFormat === format.id && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Format-specific Options */}
        {selectedFormat === 'json' && (
          <div className="space-y-3">
            <Label>Options</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAssets}
                onChange={(e) => setIncludeAssets(e.target.checked)}
                disabled={isExporting}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include asset references
              </span>
            </label>
          </div>
        )}

        {selectedFormat === 'pdf' && (
          <div className="space-y-3">
            <Label>Options</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeQAReport}
                onChange={(e) => setIncludeQAReport(e.target.checked)}
                disabled={isExporting}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Include QA metrics and analysis
              </span>
            </label>
          </div>
        )}

        {selectedFormat === 'video' && (
          <div className="space-y-3">
            <Label htmlFor="video-quality">Video Quality</Label>
            <select
              id="video-quality"
              value={videoQuality}
              onChange={(e) => setVideoQuality(e.target.value as 'low' | 'medium' | 'high')}
              disabled={isExporting}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="low">Low (720p)</option>
              <option value="medium">Medium (1080p)</option>
              <option value="high">High (4K)</option>
            </select>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
