import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit } from 'lucide-react';
import type { Character } from '@/types/character';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 6: Review and Finalize
// ============================================================================

interface Step6ReviewFinalizeProps {
  storyContext?: StoryContext;
}

export function Step6ReviewFinalize({ storyContext }: Step6ReviewFinalizeProps = {}) {
  const { formData, goToStep, previousStep, submitWizard, isSubmitting } =
    useWizard<Character>();

  const handleEdit = (step: number) => {
    goToStep(step);
  };

  return (
    <WizardFormLayout
      title="Review and Finalize"
      description="Review your character before saving"
    >
      <div className="space-y-6">
        {/* Basic Identity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Basic Identity</CardTitle>
            <Button
              onClick={() => handleEdit(1)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{formData.name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Archetype</p>
              <p>{formData.role?.archetype || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Age Range</p>
              <p>{formData.visual_identity?.age_range || 'Not specified'}</p>
            </div>
            {formData.role?.narrative_function && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Narrative Function</p>
                <p className="text-sm">{formData.role.narrative_function}</p>
              </div>
            )}
            {formData.role?.character_arc && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Character Arc</p>
                <p className="text-sm">{formData.role.character_arc}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Physical Appearance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Physical Appearance</CardTitle>
            <Button
              onClick={() => handleEdit(2)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              {formData.visual_identity?.hair_color && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hair</p>
                  <p className="text-sm">
                    {formData.visual_identity.hair_color}{' '}
                    {formData.visual_identity.hair_style}{' '}
                    {formData.visual_identity.hair_length}
                  </p>
                </div>
              )}
              {formData.visual_identity?.eye_color && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eyes</p>
                  <p className="text-sm">
                    {formData.visual_identity.eye_color}{' '}
                    {formData.visual_identity.eye_shape}
                  </p>
                </div>
              )}
              {formData.visual_identity?.skin_tone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Skin Tone</p>
                  <p className="text-sm">{formData.visual_identity.skin_tone}</p>
                </div>
              )}
              {formData.visual_identity?.facial_structure && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Face</p>
                  <p className="text-sm">{formData.visual_identity.facial_structure}</p>
                </div>
              )}
              {formData.visual_identity?.height && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Height</p>
                  <p className="text-sm">{formData.visual_identity.height}</p>
                </div>
              )}
              {formData.visual_identity?.build && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Build</p>
                  <p className="text-sm">{formData.visual_identity.build}</p>
                </div>
              )}
            </div>
            {formData.visual_identity?.distinctive_features &&
              formData.visual_identity.distinctive_features.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Distinctive Features
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.visual_identity.distinctive_features.map((feature, index) => (
                      <Badge key={index} variant="secondary">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            {formData.visual_identity?.color_palette &&
              formData.visual_identity.color_palette.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Color Palette
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {formData.visual_identity.color_palette.map((color, index) => (
                      <Badge key={index} variant="outline">
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Personality</CardTitle>
            <Button
              onClick={() => handleEdit(3)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.personality?.traits && formData.personality.traits.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Traits</p>
                <div className="flex flex-wrap gap-2">
                  {formData.personality.traits.map((trait, index) => (
                    <Badge key={index} variant="secondary">
                      {trait}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {formData.personality?.values && formData.personality.values.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Values</p>
                <div className="flex flex-wrap gap-2">
                  {formData.personality.values.map((value, index) => (
                    <Badge key={index} variant="outline">
                      {value}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {formData.personality?.temperament && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Temperament</p>
                  <p className="text-sm">{formData.personality.temperament}</p>
                </div>
              )}
              {formData.personality?.communication_style && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Communication Style
                  </p>
                  <p className="text-sm">{formData.personality.communication_style}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Background */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Background</CardTitle>
            <Button
              onClick={() => handleEdit(4)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {formData.background?.origin && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Origin</p>
                <p className="text-sm">{formData.background.origin}</p>
              </div>
            )}
            {formData.background?.occupation && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occupation</p>
                <p className="text-sm">{formData.background.occupation}</p>
              </div>
            )}
            {formData.background?.significant_events &&
              formData.background.significant_events.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Significant Events
                  </p>
                  <ul className="list-disc list-inside space-y-1">
                    {formData.background.significant_events.map((event, index) => (
                      <li key={index} className="text-sm">
                        {event}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </CardContent>
        </Card>

        {/* Relationships */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg">Relationships</CardTitle>
            <Button
              onClick={() => handleEdit(5)}
              variant="ghost"
              size="sm"
              className="h-8"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardHeader>
          <CardContent>
            {formData.relationships && formData.relationships.length > 0 ? (
              <div className="space-y-3">
                {formData.relationships.map((relationship, index) => (
                  <div key={index}>
                    {index > 0 && <Separator className="my-3" />}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{relationship.character_name}</p>
                        <Badge variant="outline">{relationship.relationship_type}</Badge>
                        {relationship.dynamic && (
                          <Badge variant="secondary">{relationship.dynamic}</Badge>
                        )}
                      </div>
                      {relationship.description && (
                        <p className="text-sm text-muted-foreground">
                          {relationship.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No relationships defined</p>
            )}
          </CardContent>
        </Card>

        {/* Summary Info */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Ready to create?</strong> Review all sections above. You can edit any
            section by clicking the Edit button. Once you're satisfied, click "Create
            Character" to save your character.
          </p>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={previousStep}
            disabled={isSubmitting}
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={submitWizard}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Character...' : 'Create Character'}
          </Button>
        </div>
      </div>
    </WizardFormLayout>
  );
}
