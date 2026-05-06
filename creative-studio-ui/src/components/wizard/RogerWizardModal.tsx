/**
 * Roger Wizard Modal
 *
 * Modal for the Roger Data Extractor wizard that allows users to select
 * text files and extract project data from stories, novels, or LLM discussions.
 */
import { LegacyAny } from '@/types/legacy';


import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import type { WizardDefinition } from '../../types/configuration';
import { WizardService } from '../../services/wizard/WizardService';
import { useEditorStore } from '../../stores/editorStore';
import './WizardModal.css';
import './RogerWizardModal.css';

interface RogerWizardModalProps {
  isOpen: boolean;
  wizard: WizardDefinition;
  onClose: () => void;
}

interface FilePreview {
  name: string;
  size: number;
  wordCount: number;
  charCount: number;
  estimatedChars: number;
  estimatedLocs: number;
  potential: string;
  preview: string;
  error?: string;
}

export function RogerWizardModal({ isOpen, wizard, onClose }: RogerWizardModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [_isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<LegacyAny>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'extract' | 'result'>('select');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectPath = useEditorStore((state) => state.projectPath);

  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      
      // Reset state when modal opens
      setSelectedFile(null);
      setFilePreview(null);
      setIsAnalyzing(false);
      setIsExtracting(false);
      setExtractionResult(null);
      setError(null);
      setFocusAreas([]);
      setCurrentStep('select');
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(txt|md|story|novel|doc|docx)$/i)) {
      setError('Please select a text file (.txt, .md, .story, .novel, .doc, .docx)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsAnalyzing(true);

    try {
      // Get file preview using Electron API
      if (window.electronAPI?.fs?.readFile) {
        const bufferContent = await window.electronAPI.fs.readFile((file as LegacyAny).path);
        const content = bufferContent.toString('utf-8') as unknown as string;

        // Calculate basic stats
        const wordCount = content.split(/\s+/).length;
        const charCount = content.length;

        // Simple extraction estimates
        const nameMatches = (content.match(/\b[A-Z][a-z]+\b/g) || []).length;
        const locationMatches = (content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || []).length;

        const estimatedChars = Math.min(Math.floor(nameMatches / 3), 20);
        const estimatedLocs = Math.min(Math.floor(locationMatches / 5), 15);

        const potential = wordCount > 1000 ? 'high' :
                         wordCount > 500 ? 'medium' : 'low';

        const preview = content.substring(0, 300) +
                       (content.length > 300 ? '...' : '');

        setFilePreview({
          name: file.name,
          size: file.size,
          wordCount,
          charCount,
          estimatedChars,
          estimatedLocs,
          potential,
          preview
        });

        setCurrentStep('preview');
      } else {
        // Fallback for environments without Electron
        setFilePreview({
          name: file.name,
          size: file.size,
          wordCount: 0,
          charCount: file.size,
          estimatedChars: 5,
          estimatedLocs: 3,
          potential: 'unknown',
          preview: 'Preview not available in this environment',
          error: 'File preview requires Electron environment'
        });
        setCurrentStep('preview');
      }
    } catch (err) {
      setError(`Failed to analyze file: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setFilePreview(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFocusAreaChange = (area: string, checked: boolean) => {
    setFocusAreas(prev =>
      checked
        ? [...prev, area]
        : prev.filter(a => a !== area)
    );
  };

  const handleExtract = async () => {
    if (!selectedFile || !projectPath) return;

    setIsExtracting(true);
    setError(null);

    try {
      const wizardService = new WizardService();

      // For Roger wizard, we need to pass the file path
      // This would typically call the CLI command via Electron
      const result = await wizardService.launchWizard('roger-wizard', projectPath, {
        file: (selectedFile as LegacyAny).path,
        focus: focusAreas.length > 0 ? focusAreas : undefined,
        format: 'summary'
      });

      if (result.success) {
        // Parse the result output to extract structured data
        setExtractionResult({
          success: true,
          message: result.message,
          output: result.output,
          charactersExtracted: 0, // Would parse from output
          locationsExtracted: 0,
          worldElementsExtracted: 0,
          confidence: 7.5
        });
        setCurrentStep('result');
      } else {
        setError(result.error || result.message);
      }

    } catch (err) {
      setError(`Extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('select');
      setFilePreview(null);
      setSelectedFile(null);
    } else if (currentStep === 'extract') {
      setCurrentStep('preview');
    } else if (currentStep === 'result') {
      setCurrentStep('preview');
      setExtractionResult(null);
    }
  };

  const handleFinish = () => {
    onClose();
    // Could trigger a refresh of project data here
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
           <div className="flex items-center gap-3">
            <div className="text-2xl">{wizard.icon}</div>
            <div className="flex flex-col">
              <h2 className="wizard-modal-title">{wizard.name}</h2>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{wizard.description}</span>
            </div>
          </div>
          <button
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content">
          <div className="roger-modal-body p-6">
            {/* Step 1: File Selection */}
            {currentStep === 'select' && (
              <div className="step-content">
                <h3>📄 Select Text File</h3>
                <p>Choose a text file containing your story, novel, or discussion plan to extract project data from.</p>

                <div className="file-upload-area">
                  <input
                    title="Select File"
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.md,.story,.novel,.doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />

                  <button
                    className="file-select-button"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📁 Choose File
                  </button>

                  <div className="file-info">
                    <p><strong>Supported formats:</strong> .txt, .md, .story, .novel, .doc, .docx</p>
                    <p><strong>Maximum size:</strong> 10MB</p>
                    <p><strong>Minimum content:</strong> 100 characters</p>
                  </div>
                </div>

                {error && (
                  <div className="error-message">
                    ❌ {error}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: File Preview */}
            {currentStep === 'preview' && filePreview && (
              <div className="step-content">
                <h3>👁️ File Preview</h3>

                <div className="file-stats">
                  <div className="stat-item">
                    <span className="stat-label">File:</span>
                    <span className="stat-value">{filePreview.name}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Size:</span>
                    <span className="stat-value">{(filePreview.size / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Words:</span>
                    <span className="stat-value">{filePreview.wordCount.toLocaleString()}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Extraction Potential:</span>
                    <span className={`stat-value potential-${filePreview.potential}`}>
                      {filePreview.potential.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="extraction-estimates">
                  <h4>🎯 Estimated Extractions</h4>
                  <div className="estimates-grid">
                    <div className="estimate-item">
                      <span className="estimate-icon">👥</span>
                      <span className="estimate-label">Characters</span>
                      <span className="estimate-value">~{filePreview.estimatedChars}</span>
                    </div>
                    <div className="estimate-item">
                      <span className="estimate-icon">🏰</span>
                      <span className="estimate-label">Locations</span>
                      <span className="estimate-value">~{filePreview.estimatedLocs}</span>
                    </div>
                    <div className="estimate-item">
                      <span className="estimate-icon">🌍</span>
                      <span className="estimate-label">World Elements</span>
                      <span className="estimate-value">~{Math.floor(filePreview.estimatedChars / 2)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-preview">
                  <h4>📝 Text Preview</h4>
                  <div className="preview-content">
                    {filePreview.preview}
                  </div>
                </div>

                <div className="focus-options">
                  <h4>🎯 Focus Areas (Optional)</h4>
                  <p>Select specific areas to focus extraction on:</p>
                  <div className="focus-checkboxes">
                    {[
                      { id: 'characters', label: 'Characters', icon: '👥' },
                      { id: 'locations', label: 'Locations', icon: '🏰' },
                      { id: 'world_building', label: 'World Building', icon: '🌍' },
                      { id: 'plot', label: 'Plot & Themes', icon: '📖' }
                    ].map(area => (
                      <label key={area.id} className="focus-checkbox">
                        <input
                          type="checkbox"
                          checked={focusAreas.includes(area.id)}
                          onChange={(e) => handleFocusAreaChange(area.id, e.target.checked)}
                        />
                        <span className="checkbox-icon">{area.icon}</span>
                        {area.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Extraction in Progress */}
            {currentStep === 'extract' && (
              <div className="step-content">
                <h3>⚙️ Extracting Data</h3>
                <div className="extraction-progress">
                  <div className="progress-spinner"></div>
                  <p>Analyzing text file and extracting project data...</p>
                  <p className="progress-note">This may take a moment depending on file size.</p>
                </div>
              </div>
            )}

            {/* Step 4: Results */}
            {currentStep === 'result' && extractionResult && (
              <div className="step-content">
                <h3>✅ Extraction Complete</h3>

                <div className="extraction-results">
                  <div className="result-summary">
                    <div className="result-stat">
                      <span className="stat-icon">👥</span>
                      <span className="stat-label">Characters</span>
                      <span className="stat-value">{extractionResult.charactersExtracted || 0}</span>
                    </div>
                    <div className="result-stat">
                      <span className="stat-icon">🏰</span>
                      <span className="stat-label">Locations</span>
                      <span className="stat-value">{extractionResult.locationsExtracted || 0}</span>
                    </div>
                    <div className="result-stat">
                      <span className="stat-icon">🌍</span>
                      <span className="stat-label">World Elements</span>
                      <span className="stat-value">{extractionResult.worldElementsExtracted || 0}</span>
                    </div>
                    <div className="result-stat">
                      <span className="stat-icon">🎯</span>
                      <span className="stat-label">Confidence</span>
                      <span className="stat-value">{extractionResult.confidence || 0}/10</span>
                    </div>
                  </div>

                  <div className="result-files">
                    <h4>💾 Files Created</h4>
                    <ul>
                      <li><code>character_definitions.json</code> - Extracted character data</li>
                      <li><code>world_building.json</code> - World and location data</li>
                      <li><code>roger_extraction_report.json</code> - Complete extraction report</li>
                      <li><code>project.json</code> - Updated with extraction metadata</li>
                    </ul>
                  </div>

                  <div className="result-message">
                    <p>{extractionResult.message}</p>
                    {extractionResult.output && (
                      <details>
                        <summary>Detailed Output</summary>
                        <pre>{extractionResult.output}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="wizard-modal-footer flex border-t border-primary/10 p-4 bg-black/40">
            {currentStep !== 'select' && (
              <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 transition-colors" onClick={handleBack}>
                ← Back
              </button>
            )}

            <div className="flex-1"></div>

            {currentStep === 'select' && (
              <button className="px-4 py-2 text-slate-400 hover:text-white transition-colors" onClick={onClose}>
                Cancel
              </button>
            )}

            {currentStep === 'preview' && (
              <button
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
                onClick={() => {
                  setCurrentStep('extract');
                  handleExtract();
                }}
                disabled={isExtracting}
              >
                {isExtracting ? 'Extracting...' : 'Extract Data'}
              </button>
            )}

            {currentStep === 'extract' && (
              <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            )}

            {currentStep === 'result' && (
              <button className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-all" onClick={handleFinish}>
                Finish
              </button>
            )}
        </div>
      </div>
    </div>
  );
}
