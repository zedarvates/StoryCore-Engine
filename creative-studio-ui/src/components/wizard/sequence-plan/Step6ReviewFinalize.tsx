import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDownIcon, ChevronUpIcon, EditIcon, DownloadIcon, CheckCircleIcon, AlertTriangleIcon, EyeIcon } from 'lucide-react';
import { SequencePlan, Act, Scene } from '@/types/sequencePlan';
import { ProductionShot } from '@/types/shot';
import { SequenceTemplate } from '@/types/template';

interface Step6ReviewFinalizeProps {
  sequencePlan: Partial<SequencePlan>;
  selectedTemplate?: SequenceTemplate;
  onEditStep: (stepIndex: number) => void;
  onComplete: () => void;
}

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  step: number;
  section: string;
}

export function Step6ReviewFinalize({
  sequencePlan,
  selectedTemplate,
  onEditStep,
  onComplete
}: Step6ReviewFinalizeProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Validation logic
  const validationIssues = useMemo((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    // Check basic information
    if (!sequencePlan.name?.trim()) {
      issues.push({
        type: 'error',
        message: 'Sequence name is required',
        step: 2,
        section: 'Basic Information'
      });
    }
    if (!sequencePlan.worldId) {
      issues.push({
        type: 'error',
        message: 'World must be selected',
        step: 2,
        section: 'Basic Information'
      });
    }

    // Check narrative structure
    if (!sequencePlan.acts?.length) {
      issues.push({
        type: 'error',
        message: 'At least one act must be defined',
        step: 3,
        section: 'Narrative Structure'
      });
    }

    // Check scenes
    if (!sequencePlan.scenes?.length) {
      issues.push({
        type: 'warning',
        message: 'No scenes have been created yet',
        step: 4,
        section: 'Scene Planning'
      });
    }

    // Check scene completeness
    sequencePlan.scenes?.forEach((scene, index) => {
      if (!scene.title?.trim()) {
        issues.push({
          type: 'warning',
          message: `Scene ${scene.number} is missing a title`,
          step: 4,
          section: 'Scene Planning'
        });
      }
      if (!scene.locationId) {
        issues.push({
          type: 'warning',
          message: `Scene ${scene.number} has no location assigned`,
          step: 4,
          section: 'Scene Planning'
        });
      }
      if (!scene.characterIds?.length) {
        issues.push({
          type: 'warning',
          message: `Scene ${scene.number} has no characters assigned`,
          step: 4,
          section: 'Scene Planning'
        });
      }
    });

    // Check shots
    if (!sequencePlan.shots?.length) {
      issues.push({
        type: 'warning',
        message: 'No shots have been created yet',
        step: 5,
        section: 'Shot Preview'
      });
    }

    return issues;
  }, [sequencePlan]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleExport = (format: 'json' | 'project') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(sequencePlan, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `${sequencePlan.name || 'sequence-plan'}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    }
    // TODO: Implement project format export when project service is available
  };

  const renderValidationSummary = () => {
    if (validationIssues.length === 0) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Your sequence plan looks complete! All required information is present.
          </AlertDescription>
        </Alert>
      );
    }

    const errors = validationIssues.filter(i => i.type === 'error');
    const warnings = validationIssues.filter(i => i.type === 'warning');

    return (
      <Alert className={errors.length > 0 ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"}>
        {errors.length > 0 ? (
          <AlertTriangleIcon className="h-4 w-4 text-red-600" />
        ) : (
          <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
        )}
        <AlertDescription>
          {errors.length > 0 && (
            <div className="mb-2">
              <strong className="text-red-800">{errors.length} Error{errors.length !== 1 ? 's' : ''}:</strong>
              <ul className="mt-1 space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">
                    • {error.message} (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-red-700 underline"
                        onClick={() => onEditStep(error.step - 1)}
                      >
                        Edit Step {error.step}
                      </Button>
                    )
                  </li>
                ))}
              </ul>
            </div>
          )}
          {warnings.length > 0 && (
            <div>
              <strong className={errors.length > 0 ? "text-yellow-800" : "text-yellow-800"}>
                {warnings.length} Warning{warnings.length !== 1 ? 's' : ''}:
              </strong>
              <ul className="mt-1 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index} className="text-yellow-700 text-sm">
                    • {warning.message} (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-yellow-700 underline"
                        onClick={() => onEditStep(warning.step - 1)}
                      >
                        Edit Step {warning.step}
                      </Button>
                    )
                  </li>
                ))}
              </ul>
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  };

  const renderOverviewSection = () => (
    <Card className="cursor-pointer">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        onClick={() => toggleSection('overview')}
      >
        <div>
          <CardTitle className="text-lg">Sequence Overview</CardTitle>
          <CardDescription>Basic information and technical specifications</CardDescription>
        </div>
        {expandedSections.has('overview') ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </CardHeader>
      {expandedSections.has('overview') && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-600 uppercase tracking-wide">Basic Info</h4>
              <div className="mt-2 space-y-1">
                <p><strong>Name:</strong> {sequencePlan.name || 'Not set'}</p>
                <p><strong>Description:</strong> {sequencePlan.description || 'Not set'}</p>
                <p><strong>World:</strong> {sequencePlan.worldId || 'Not set'}</p>
                <p><strong>Template:</strong> {selectedTemplate?.name || 'Custom'}</p>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-600 uppercase tracking-wide">Technical Specs</h4>
              <div className="mt-2 space-y-1">
                <p><strong>Duration:</strong> {sequencePlan.targetDuration || 0} seconds</p>
                <p><strong>Frame Rate:</strong> {sequencePlan.frameRate || 24} fps</p>
                <p><strong>Resolution:</strong> {sequencePlan.resolution ? `${sequencePlan.resolution.width}x${sequencePlan.resolution.height}` : 'Not set'}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => onEditStep(1)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Basic Info
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );

  const renderActsSection = () => (
    <Card className="cursor-pointer">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        onClick={() => toggleSection('acts')}
      >
        <div>
          <CardTitle className="text-lg">Acts ({sequencePlan.acts?.length || 0})</CardTitle>
          <CardDescription>Narrative structure and act breakdown</CardDescription>
        </div>
        {expandedSections.has('acts') ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </CardHeader>
      {expandedSections.has('acts') && (
        <CardContent>
          {sequencePlan.acts?.length ? (
            <div className="space-y-3">
              {sequencePlan.acts.map((act, index) => (
                <div key={act.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Act {act.number}: {act.title}</h4>
                    <Badge variant="outline">{act.targetDuration}s</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{act.description}</p>
                  <p className="text-sm text-gray-500 mt-1"><strong>Purpose:</strong> {act.narrativePurpose}</p>
                  <p className="text-sm text-gray-500"><strong>Scenes:</strong> {act.sceneIds.length}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No acts defined yet.</p>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => onEditStep(2)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Narrative Structure
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );

  const renderScenesSection = () => (
    <Card className="cursor-pointer">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        onClick={() => toggleSection('scenes')}
      >
        <div>
          <CardTitle className="text-lg">Scenes ({sequencePlan.scenes?.length || 0})</CardTitle>
          <CardDescription>Location and character assignments</CardDescription>
        </div>
        {expandedSections.has('scenes') ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </CardHeader>
      {expandedSections.has('scenes') && (
        <CardContent>
          {sequencePlan.scenes?.length ? (
            <div className="space-y-3">
              {sequencePlan.scenes.map((scene) => (
                <div key={scene.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Scene {scene.number}: {scene.title}</h4>
                    <div className="flex gap-2">
                      <Badge variant="outline">Act {sequencePlan.acts?.find(a => a.id === scene.actId)?.number || '?'}</Badge>
                      <Badge variant="outline">{scene.estimatedShotCount} shots</Badge>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{scene.description}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-500"><strong>Location:</strong> {scene.locationId || 'Not set'}</p>
                    <p className="text-sm text-gray-500"><strong>Characters:</strong> {scene.characterIds?.length || 0}</p>
                    <p className="text-sm text-gray-500"><strong>Beats:</strong> {scene.beats?.length || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No scenes defined yet.</p>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => onEditStep(3)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Scene Planning
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );

  const renderShotsSection = () => (
    <Card className="cursor-pointer">
      <CardHeader
        className="flex flex-row items-center justify-between space-y-0 pb-2"
        onClick={() => toggleSection('shots')}
      >
        <div>
          <CardTitle className="text-lg">Shots ({sequencePlan.shots?.length || 0})</CardTitle>
          <CardDescription>Timeline and shot breakdown</CardDescription>
        </div>
        {expandedSections.has('shots') ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </CardHeader>
      {expandedSections.has('shots') && (
        <CardContent>
          {sequencePlan.shots?.length ? (
            <div className="space-y-3">
              {sequencePlan.shots.slice(0, 10).map((shot, index) => (
                <div key={shot.id || index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Shot {shot.number}: {shot.generation.prompt || 'No prompt'}</h4>
                    <Badge variant="outline">{shot.timing.duration} frames</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{shot.notes || 'No notes'}</p>
                  <p className="text-sm text-gray-500"><strong>Type:</strong> {shot.type} • <strong>Category:</strong> {shot.category}</p>
                </div>
              ))}
              {sequencePlan.shots.length > 10 && (
                <p className="text-sm text-gray-500">... and {sequencePlan.shots.length - 10} more shots</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No shots defined yet.</p>
          )}
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => onEditStep(4)}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit Shot Preview
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );

  const renderConfirmDialog = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <CardTitle>Confirm Completion</CardTitle>
          <CardDescription>
            Are you sure you want to finalize this sequence plan? This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setShowConfirmDialog(false);
              onComplete();
            }}>
              Complete Sequence Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const hasErrors = validationIssues.some(i => i.type === 'error');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Review & Finalize</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('json')}>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button variant="outline" disabled>
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export Project
          </Button>
        </div>
      </div>

      {renderValidationSummary()}

      <div className="space-y-4">
        {renderOverviewSection()}
        {renderActsSection()}
        {renderScenesSection()}
        {renderShotsSection()}
      </div>

      <Separator />

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Ready to complete your sequence plan?
        </div>
        <Button
          onClick={() => setShowConfirmDialog(true)}
          disabled={hasErrors}
          className="px-6"
        >
          <CheckCircleIcon className="h-4 w-4 mr-2" />
          Complete Sequence Plan
        </Button>
      </div>

      {showConfirmDialog && renderConfirmDialog()}
    </div>
  );
}