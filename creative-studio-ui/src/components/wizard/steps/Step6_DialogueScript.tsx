/**
 * Step 6: Dialogue & Script
 * Allows users to input screenplay or script content
 */

import { useState, useEffect } from 'react';
import { FileText, Upload, AlertCircle, CheckCircle2, FileCode } from 'lucide-react';
import { WizardFormLayout, FormField, FormSection } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ScriptData, ParsedScene } from '@/types/wizard';
import { screenplayParser } from '@/services/wizard/ScreenplayParser';

// ============================================================================
// Script Format Options
// ============================================================================

const SCRIPT_FORMAT_OPTIONS: {
  value: ScriptData['format'];
  label: string;
  description: string;
  placeholder: string;
}[] = [
  {
    value: 'full-screenplay',
    label: 'Full Screenplay',
    description: 'Complete screenplay with scene headings, action, dialogue',
    placeholder: `INT. COFFEE SHOP - DAY

JANE sits at a corner table, typing on her laptop. MARK enters, spots her, and approaches.

MARK
(nervous)
Hey, Jane. Mind if I join you?

JANE
(looking up, surprised)
Mark! I didn't expect to see you here.`,
  },
  {
    value: 'scene-descriptions',
    label: 'Scene Descriptions Only',
    description: 'Simplified scene-by-scene descriptions without full screenplay format',
    placeholder: `Scene 1: Jane works alone in a coffee shop when Mark unexpectedly arrives.

Scene 2: They have an awkward conversation about their past.

Scene 3: Jane decides to give Mark another chance.`,
  },
  {
    value: 'shot-list',
    label: 'Shot List',
    description: 'Technical shot-by-shot breakdown',
    placeholder: `Shot 1: Wide shot of coffee shop interior
Shot 2: Medium shot of Jane at laptop
Shot 3: Close-up of Mark entering
Shot 4: Two-shot of Jane and Mark talking`,
  },
  {
    value: 'storyboard-notes',
    label: 'Storyboard Notes',
    description: 'Visual descriptions for storyboarding',
    placeholder: `Panel 1: Establishing shot - cozy coffee shop, warm lighting
Panel 2: Jane focused on work, coffee cup nearby
Panel 3: Mark's silhouette in doorway
Panel 4: Jane's surprised expression`,
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step6_DialogueScriptProps {
  data: ScriptData | null;
  onUpdate: (data: ScriptData) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step6_DialogueScript({
  data,
  onUpdate,
  errors = {},
}: Step6_DialogueScriptProps) {
  // State
  const [scriptData, setScriptData] = useState<ScriptData>(
    data || {
      format: 'full-screenplay',
      content: '',
      parsedScenes: [],
    }
  );

  const [isParseDialogOpen, setIsParseDialogOpen] = useState(false);
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    scenes: ParsedScene[];
    conflicts: string[];
  } | null>(null);

  // Update parent when script data changes
  useEffect(() => {
    onUpdate(scriptData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptData]); // Only depend on scriptData, not onUpdate

  // Handle format change
  const handleFormatChange = (format: ScriptData['format']) => {
    setScriptData((prev) => ({
      ...prev,
      format,
      // Clear parsed scenes when format changes
      parsedScenes: [],
    }));
  };

  // Handle content change
  const handleContentChange = (content: string) => {
    setScriptData((prev) => ({
      ...prev,
      content,
    }));
  };

  // Handle file import
  const handleFileImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setScriptData((prev) => ({
        ...prev,
        content: text,
        importedFrom: file.name,
      }));
    } catch (error) {
      console.error('Error reading file:', error);
      // TODO: Show error toast
    }
  };

  // Parse screenplay content
  const handleParseScript = () => {
    if (!scriptData.content.trim()) {
      return;
    }

    // Use ScreenplayParser service
    const validation = screenplayParser.validate(scriptData.content);
    const scenes = screenplayParser.parse(scriptData.content);
    
    // Check for conflicts (characters/locations not defined in previous steps)
    // This would need access to wizard state - simplified for now
    const conflicts: string[] = [...validation.errors, ...validation.warnings];

    setParseResult({
      success: validation.isValid,
      scenes,
      conflicts,
    });

    setIsParseDialogOpen(true);
  };

  // Accept parsed scenes
  const handleAcceptParsedScenes = () => {
    if (parseResult) {
      setScriptData((prev) => ({
        ...prev,
        parsedScenes: parseResult.scenes,
      }));
    }
    setIsParseDialogOpen(false);
  };

  // Get current format option
  const currentFormat = SCRIPT_FORMAT_OPTIONS.find(
    (opt) => opt.value === scriptData.format
  );

  // Character count
  const characterCount = scriptData.content.length;
  const wordCount = scriptData.content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <WizardFormLayout
      title="Dialogue & Script"
      description="Input your screenplay, scene descriptions, or shot list"
    >
      {/* Error Summary */}
      {errors.content && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{errors.content}</p>
        </div>
      )}

      {/* Script Format Selection */}
      <FormSection
        title="Script Format"
        description="Choose the format that best matches your input"
      >
        <FormField
          label="Format Type"
          name="scriptFormat"
          required
          helpText="Select how you want to structure your script"
        >
          <Select value={scriptData.format} onValueChange={handleFormatChange}>
            <SelectTrigger id="scriptFormat">
              <SelectValue placeholder="Select script format" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {SCRIPT_FORMAT_OPTIONS.map((format) => (
                <SelectItem key={format.value} value={format.value}>
                  <div>
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      {/* File Import */}
      <FormSection
        title="Import Script"
        description="Upload an existing screenplay file (optional)"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => document.getElementById('script-file-input')?.click()}
            type="button"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import File
          </Button>
          <input
            id="script-file-input"
            type="file"
            accept=".txt,.pdf,.fdx,.fountain"
            onChange={handleFileImport}
            className="hidden"
          />
          {scriptData.importedFrom && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {scriptData.importedFrom}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Supported formats: TXT, PDF, FDX (Final Draft), Fountain
        </p>
      </FormSection>

      {/* Script Editor */}
      <FormSection
        title="Script Content"
        description={currentFormat?.description || 'Enter your script content'}
      >
        <FormField
          label="Script"
          name="scriptContent"
          required
          helpText={`${wordCount} words, ${characterCount} characters`}
        >
          <Textarea
            id="scriptContent"
            value={scriptData.content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder={currentFormat?.placeholder}
            rows={20}
            className="font-mono text-sm"
          />
        </FormField>

        {/* Parse Button (only for full screenplay) */}
        {scriptData.format === 'full-screenplay' && scriptData.content.trim() && (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={handleParseScript}
              type="button"
            >
              <FileCode className="h-4 w-4 mr-2" />
              Parse Screenplay
            </Button>
          </div>
        )}
      </FormSection>

      {/* Parsed Scenes Summary */}
      {scriptData.parsedScenes && scriptData.parsedScenes.length > 0 && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                Script Parsed Successfully
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Extracted <strong>{scriptData.parsedScenes.length} scenes</strong> from your
                screenplay. These will be used in the scene breakdown step.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Format Guide */}
      <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Screenplay Format Guide
              </h4>
              <div className="text-sm text-blue-700 dark:text-blue-300 space-y-2">
                <p>
                  <strong>Scene Headings:</strong> INT./EXT. LOCATION - TIME OF DAY
                </p>
                <p>
                  <strong>Action:</strong> Describe what happens (present tense)
                </p>
                <p>
                  <strong>Character Names:</strong> ALL CAPS above dialogue
                </p>
                <p>
                  <strong>Dialogue:</strong> Indented below character name
                </p>
                <p>
                  <strong>Parentheticals:</strong> (action or tone) before dialogue
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parse Result Dialog */}
      <Dialog open={isParseDialogOpen} onOpenChange={setIsParseDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Screenplay Parsing Results</DialogTitle>
            <DialogDescription>
              Review the extracted scenes and resolve any conflicts
            </DialogDescription>
          </DialogHeader>

          {parseResult && (
            <div className="space-y-4 py-4">
              {/* Conflicts Warning */}
              {parseResult.conflicts.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                        Conflicts Detected
                      </h4>
                      <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {parseResult.conflicts.map((conflict, index) => (
                          <li key={index}>• {conflict}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Parsed Scenes */}
              <div>
                <h4 className="font-semibold mb-3">
                  Extracted Scenes ({parseResult.scenes.length})
                </h4>
                <div className="space-y-3">
                  {parseResult.scenes.map((scene) => (
                    <Card key={scene.sceneNumber}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge variant="secondary">Scene {scene.sceneNumber}</Badge>
                          <div className="flex-1">
                            <h5 className="font-semibold mb-1">{scene.heading}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                              {scene.description.substring(0, 150)}
                              {scene.description.length > 150 ? '...' : ''}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{scene.characters.length} characters</span>
                              <span>•</span>
                              <span>{scene.dialogue.length} dialogue lines</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsParseDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button onClick={handleAcceptParsedScenes} type="button">
              Accept Parsed Scenes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
