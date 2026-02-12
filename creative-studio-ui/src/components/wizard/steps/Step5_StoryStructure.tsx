/**
 * Step 5: Story Structure
 * Allows users to define the narrative structure of their story
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItemWithDescription,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select-rich';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type {
  StoryStructureData,
  ActStructure,
  NarrativePerspective,
  PlotPoint,
} from '@/types/wizard';

// ============================================================================
// Act Structure Options
// ============================================================================

const ACT_STRUCTURE_OPTIONS: {
  value: ActStructure;
  label: string;
  description: string;
  plotPoints: string[];
}[] = [
  {
    value: '3-act',
    label: '3-Act Structure',
    description: 'Classic three-act structure (Setup, Confrontation, Resolution)',
    plotPoints: [
      'Opening Image',
      'Inciting Incident',
      'First Plot Point',
      'Midpoint',
      'Second Plot Point',
      'Climax',
      'Resolution',
    ],
  },
  {
    value: '5-act',
    label: '5-Act Structure',
    description: 'Shakespearean five-act structure (Exposition, Rising Action, Climax, Falling Action, Denouement)',
    plotPoints: [
      'Exposition',
      'Rising Action Begins',
      'Climax',
      'Falling Action',
      'Catastrophe/Resolution',
    ],
  },
  {
    value: 'hero-journey',
    label: "Hero's Journey",
    description: "Joseph Campbell's monomyth structure",
    plotPoints: [
      'Ordinary World',
      'Call to Adventure',
      'Refusal of the Call',
      'Meeting the Mentor',
      'Crossing the Threshold',
      'Tests, Allies, Enemies',
      'Approach to Inmost Cave',
      'Ordeal',
      'Reward',
      'The Road Back',
      'Resurrection',
      'Return with Elixir',
    ],
  },
  {
    value: 'save-the-cat',
    label: 'Save the Cat',
    description: "Blake Snyder's beat sheet structure",
    plotPoints: [
      'Opening Image',
      'Theme Stated',
      'Setup',
      'Catalyst',
      'Debate',
      'Break into Two',
      'B Story',
      'Fun and Games',
      'Midpoint',
      'Bad Guys Close In',
      'All Is Lost',
      'Dark Night of the Soul',
      'Break into Three',
      'Finale',
      'Final Image',
    ],
  },
  {
    value: 'custom',
    label: 'Custom Structure',
    description: 'Define your own plot points',
    plotPoints: [],
  },
];

// ============================================================================
// Narrative Perspective Options
// ============================================================================

const NARRATIVE_PERSPECTIVE_OPTIONS: {
  value: NarrativePerspective;
  label: string;
  description: string;
  example: string;
}[] = [
  {
    value: 'first-person',
    label: 'First Person',
    description: 'Story told from "I" perspective',
    example: '"I walked into the room..."',
  },
  {
    value: 'third-person-limited',
    label: 'Third Person Limited',
    description: 'Story told from one character\'s perspective',
    example: '"She walked into the room..."',
  },
  {
    value: 'third-person-omniscient',
    label: 'Third Person Omniscient',
    description: 'Narrator knows all characters\' thoughts',
    example: '"As she walked in, he wondered..."',
  },
  {
    value: 'multiple-pov',
    label: 'Multiple POV',
    description: 'Story told from multiple perspectives',
    example: 'Alternating character viewpoints',
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step5_StoryStructureProps {
  data: StoryStructureData | null;
  onUpdate: (data: StoryStructureData) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step5_StoryStructure({
  data,
  onUpdate,
  errors = {},
}: Step5_StoryStructureProps) {
  // State
  const [storyStructure, setStoryStructure] = useState<StoryStructureData>(
    data || {
      premise: '',
      logline: '',
      actStructure: '3-act',
      plotPoints: [],
      themes: [],
      motifs: [],
      narrativePerspective: 'third-person-limited',
    }
  );

  const [isPlotPointDialogOpen, setIsPlotPointDialogOpen] = useState(false);
  const [editingPlotPoint, setEditingPlotPoint] = useState<PlotPoint | null>(null);

  // Plot point form state
  const [plotPointForm, setPlotPointForm] = useState<Partial<PlotPoint>>({
    name: '',
    description: '',
    timingMinutes: 0,
    actNumber: 1,
  });

  // Theme/motif input
  const [themeInput, setThemeInput] = useState('');
  const [motifInput, setMotifInput] = useState('');

  // Update parent when story structure changes
  useEffect(() => {
    onUpdate(storyStructure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyStructure]); // Only depend on storyStructure, not onUpdate

  // Handle act structure change
  const handleActStructureChange = (value: ActStructure) => {
    const selectedStructure = ACT_STRUCTURE_OPTIONS.find((opt) => opt.value === value);
    
    // If changing to a template structure, pre-populate plot points
    if (selectedStructure && selectedStructure.plotPoints.length > 0) {
      const templatePlotPoints: PlotPoint[] = selectedStructure.plotPoints.map(
        (name, index) => ({
          id: `plot-${Date.now()}-${index}`,
          name,
          description: '',
          timingMinutes: 0,
          actNumber: Math.floor((index / selectedStructure.plotPoints.length) * 
            (value === '5-act' ? 5 : value === '3-act' ? 3 : 1)) + 1,
        })
      );
      
      setStoryStructure((prev) => ({
        ...prev,
        actStructure: value,
        plotPoints: templatePlotPoints,
      }));
    } else {
      setStoryStructure((prev) => ({
        ...prev,
        actStructure: value,
      }));
    }
  };

  // Handle plot point dialog open
  const handleAddPlotPoint = () => {
    setEditingPlotPoint(null);
    setPlotPointForm({
      name: '',
      description: '',
      timingMinutes: 0,
      actNumber: 1,
    });
    setIsPlotPointDialogOpen(true);
  };

  // Handle plot point edit
  const handleEditPlotPoint = (plotPoint: PlotPoint) => {
    setEditingPlotPoint(plotPoint);
    setPlotPointForm(plotPoint);
    setIsPlotPointDialogOpen(true);
  };

  // Handle plot point save
  const handleSavePlotPoint = () => {
    if (!plotPointForm.name) {
      return;
    }

    const newPlotPoint: PlotPoint = {
      id: editingPlotPoint?.id || `plot-${Date.now()}`,
      name: plotPointForm.name || '',
      description: plotPointForm.description || '',
      timingMinutes: plotPointForm.timingMinutes || 0,
      actNumber: plotPointForm.actNumber || 1,
    };

    if (editingPlotPoint) {
      // Update existing plot point
      setStoryStructure((prev) => ({
        ...prev,
        plotPoints: prev.plotPoints.map((pp) =>
          pp.id === editingPlotPoint.id ? newPlotPoint : pp
        ),
      }));
    } else {
      // Add new plot point
      setStoryStructure((prev) => ({
        ...prev,
        plotPoints: [...prev.plotPoints, newPlotPoint],
      }));
    }

    setIsPlotPointDialogOpen(false);
    setPlotPointForm({
      name: '',
      description: '',
      timingMinutes: 0,
      actNumber: 1,
    });
  };

  // Handle plot point delete
  const handleDeletePlotPoint = (plotPointId: string) => {
    setStoryStructure((prev) => ({
      ...prev,
      plotPoints: prev.plotPoints.filter((pp) => pp.id !== plotPointId),
    }));
  };

  // Handle theme add
  const handleAddTheme = () => {
    if (themeInput.trim() && !storyStructure.themes.includes(themeInput.trim())) {
      setStoryStructure((prev) => ({
        ...prev,
        themes: [...prev.themes, themeInput.trim()],
      }));
      setThemeInput('');
    }
  };

  // Handle theme remove
  const handleRemoveTheme = (theme: string) => {
    setStoryStructure((prev) => ({
      ...prev,
      themes: prev.themes.filter((t) => t !== theme),
    }));
  };

  // Handle motif add
  const handleAddMotif = () => {
    if (motifInput.trim() && !storyStructure.motifs.includes(motifInput.trim())) {
      setStoryStructure((prev) => ({
        ...prev,
        motifs: [...prev.motifs, motifInput.trim()],
      }));
      setMotifInput('');
    }
  };

  // Handle motif remove
  const handleRemoveMotif = (motif: string) => {
    setStoryStructure((prev) => ({
      ...prev,
      motifs: prev.motifs.filter((m) => m !== motif),
    }));
  };

  // Get character counts
  const premiseCharCount = storyStructure.premise.length;
  const loglineCharCount = storyStructure.logline.length;
  const premiseMaxChars = 500;
  const loglineMaxChars = 150;

  return (
    <WizardFormLayout
      title="Story Structure"
      description="Define the narrative framework and plot points of your story"
    >
      {/* Error Summary */}
      {(errors.premise || errors.logline) && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
            {errors.premise && <li>{errors.premise}</li>}
            {errors.logline && <li>{errors.logline}</li>}
          </ul>
        </div>
      )}

      {/* Premise and Logline */}
      <FormSection
        title="Story Foundation"
        description="Define the core premise and logline of your story"
      >
        <FormField
          label="Premise"
          name="premise"
          required
          helpText={`A brief summary of your story's core concept (${premiseCharCount}/${premiseMaxChars} characters)`}
        >
          <Textarea
            id="premise"
            value={storyStructure.premise}
            onChange={(e) => {
              if (e.target.value.length <= premiseMaxChars) {
                setStoryStructure((prev) => ({ ...prev, premise: e.target.value }));
              }
            }}
            placeholder="e.g., A reluctant hero must overcome their fears to save their world from an ancient evil that threatens to destroy everything they love"
            rows={4}
            className={premiseCharCount > premiseMaxChars ? 'border-red-500' : ''}
          />
          {premiseCharCount > premiseMaxChars && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Premise exceeds maximum length
            </p>
          )}
        </FormField>

        <FormField
          label="Logline"
          name="logline"
          required
          helpText={`A one-sentence summary of your story (${loglineCharCount}/${loglineMaxChars} characters)`}
        >
          <Textarea
            id="logline"
            value={storyStructure.logline}
            onChange={(e) => {
              if (e.target.value.length <= loglineMaxChars) {
                setStoryStructure((prev) => ({ ...prev, logline: e.target.value }));
              }
            }}
            placeholder="e.g., A young wizard must defeat a dark lord to save the magical world"
            rows={2}
            className={loglineCharCount > loglineMaxChars ? 'border-red-500' : ''}
          />
          {loglineCharCount > loglineMaxChars && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              Logline exceeds maximum length
            </p>
          )}
        </FormField>
      </FormSection>

      {/* Act Structure */}
      <FormSection
        title="Act Structure"
        description="Choose a narrative structure template or create your own"
      >
        <FormField
          label="Structure Type"
          name="actStructure"
          required
          helpText="Select a narrative structure template"
        >
          <Select
            value={storyStructure.actStructure}
            onValueChange={handleActStructureChange}
          >
            <SelectTrigger id="actStructure">
              <SelectValue placeholder="Select act structure" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {ACT_STRUCTURE_OPTIONS.map((structure) => (
                <SelectItemWithDescription
                  key={structure.value}
                  value={structure.value}
                  label={structure.label}
                  description={structure.description}
                />
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      {/* Plot Points Timeline */}
      <FormSection
        title="Plot Points"
        description="Define key turning points and events in your story"
      >
        {storyStructure.plotPoints.length > 0 && (
          <div className="space-y-3">
            {storyStructure.plotPoints
              .sort((a, b) => a.timingMinutes - b.timingMinutes)
              .map((plotPoint, index) => (
                <Card key={plotPoint.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                          <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                            {index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{plotPoint.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                Act {plotPoint.actNumber}
                              </Badge>
                              {plotPoint.timingMinutes > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  ~{plotPoint.timingMinutes} min
                                </Badge>
                              )}
                            </div>
                            {plotPoint.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {plotPoint.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPlotPoint(plotPoint)}
                              aria-label={`Edit ${plotPoint.name}`}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePlotPoint(plotPoint.id)}
                              aria-label={`Delete ${plotPoint.name}`}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}

        {/* Add Plot Point Button */}
        <Button onClick={handleAddPlotPoint} variant="outline" className="w-full" type="button">
          <Plus className="h-4 w-4 mr-2" />
          Add Plot Point
        </Button>
      </FormSection>

      {/* Themes and Motifs */}
      <FormSection
        title="Themes & Motifs"
        description="Define recurring themes and symbolic elements"
      >
        <FormGrid columns={2}>
          {/* Themes */}
          <FormField
            label="Themes"
            name="themes"
            helpText="Add thematic elements (e.g., Love, Redemption, Power)"
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={themeInput}
                  onChange={(e) => setThemeInput(e.target.value)}
                  placeholder="e.g., Redemption, Sacrifice"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTheme();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddTheme} variant="secondary">
                  Add
                </Button>
              </div>
              {storyStructure.themes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {storyStructure.themes.map((theme, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={() => handleRemoveTheme(theme)}
                    >
                      {theme} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </FormField>

          {/* Motifs */}
          <FormField
            label="Motifs"
            name="motifs"
            helpText="Add recurring symbolic elements (e.g., Water, Mirrors)"
          >
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={motifInput}
                  onChange={(e) => setMotifInput(e.target.value)}
                  placeholder="e.g., Mirrors, Fire"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMotif();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddMotif} variant="secondary">
                  Add
                </Button>
              </div>
              {storyStructure.motifs.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {storyStructure.motifs.map((motif, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                      onClick={() => handleRemoveMotif(motif)}
                    >
                      {motif} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </FormField>
        </FormGrid>
      </FormSection>

      {/* Narrative Perspective */}
      <FormSection
        title="Narrative Perspective"
        description="Choose how the story is told"
      >
        <FormField
          label="Point of View"
          name="narrativePerspective"
          required
          helpText="Select the narrative perspective for your story"
        >
          <Select
            value={storyStructure.narrativePerspective}
            onValueChange={(value) =>
              setStoryStructure((prev) => ({
                ...prev,
                narrativePerspective: value as NarrativePerspective,
              }))
            }
          >
            <SelectTrigger id="narrativePerspective">
              <SelectValue placeholder="Select narrative perspective" />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              {NARRATIVE_PERSPECTIVE_OPTIONS.map((perspective) => (
                <SelectItemWithDescription
                  key={perspective.value}
                  value={perspective.value}
                  label={perspective.label}
                  description={perspective.description}
                />
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </FormSection>

      {/* Summary */}
      {(storyStructure.premise || storyStructure.logline) && (
        <div className="rounded-lg bg-purple-50 dark:bg-purple-950 p-4 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                Story Structure Summary
              </h4>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                You have defined a <strong>{storyStructure.actStructure}</strong> structure with{' '}
                <strong>{storyStructure.plotPoints.length} plot points</strong>
                {storyStructure.themes.length > 0 && (
                  <>
                    , <strong>{storyStructure.themes.length} themes</strong>
                  </>
                )}
                {storyStructure.motifs.length > 0 && (
                  <>
                    , and <strong>{storyStructure.motifs.length} motifs</strong>
                  </>
                )}
                . The story will be told from a{' '}
                <strong>
                  {
                    NARRATIVE_PERSPECTIVE_OPTIONS.find(
                      (opt) => opt.value === storyStructure.narrativePerspective
                    )?.label
                  }
                </strong>{' '}
                perspective.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plot Point Dialog */}
      <Dialog open={isPlotPointDialogOpen} onOpenChange={setIsPlotPointDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingPlotPoint ? 'Edit Plot Point' : 'Add Plot Point'}
            </DialogTitle>
            <DialogDescription>
              Define a key turning point or event in your story
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <FormGrid columns={2}>
              <FormField
                label="Plot Point Name"
                name="plotPointName"
                required
                helpText="Name of this plot point"
              >
                <Input
                  id="plotPointName"
                  value={plotPointForm.name || ''}
                  onChange={(e) =>
                    setPlotPointForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Inciting Incident, Midpoint"
                />
              </FormField>

              <FormField
                label="Act Number"
                name="actNumber"
                required
                helpText="Which act does this occur in?"
              >
                <Input
                  id="actNumber"
                  type="number"
                  min="1"
                  value={plotPointForm.actNumber || 1}
                  onChange={(e) =>
                    setPlotPointForm((prev) => ({
                      ...prev,
                      actNumber: parseInt(e.target.value) || 1,
                    }))
                  }
                />
              </FormField>
            </FormGrid>

            <FormField
              label="Timing (Minutes)"
              name="timingMinutes"
              helpText="Approximate timing in the story (optional)"
            >
              <Input
                id="timingMinutes"
                type="number"
                min="0"
                value={plotPointForm.timingMinutes || 0}
                onChange={(e) =>
                  setPlotPointForm((prev) => ({
                    ...prev,
                    timingMinutes: parseInt(e.target.value) || 0,
                  }))
                }
                placeholder="e.g., 15"
              />
            </FormField>

            <FormField
              label="Description"
              name="plotPointDescription"
              helpText="Describe what happens at this plot point"
            >
              <Textarea
                id="plotPointDescription"
                value={plotPointForm.description || ''}
                onChange={(e) =>
                  setPlotPointForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="e.g., The hero receives a call to adventure that disrupts their ordinary world"
                rows={4}
              />
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPlotPointDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSavePlotPoint}
              disabled={!plotPointForm.name}
              type="button"
            >
              {editingPlotPoint ? 'Update Plot Point' : 'Add Plot Point'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
