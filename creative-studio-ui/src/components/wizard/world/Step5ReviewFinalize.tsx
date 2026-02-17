import { CheckCircle2, Edit, Globe, MapPin, BookOpen, Users } from 'lucide-react';
import { useWizard } from '@/contexts/WizardContext';
import type { World } from '@/types/world';
import { WizardFormLayout } from '../WizardFormLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Step 5: Review and Finalize
// ============================================================================

export function Step5ReviewFinalize() {
  const { formData, goToStep } = useWizard<World>();

  const handleEditSection = (step: number) => {
    goToStep(step);
  };

  return (
    <WizardFormLayout
      title="Review & Finalize"
      description="Review your world details before creating"
    >
      {/* Basic Information */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection(1)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-600">World Name</p>
            <p className="text-base">{formData.name || 'Not specified'}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600">Time Period</p>
            <p className="text-base">{formData.timePeriod || 'Not specified'}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Genre</p>
            <div className="flex flex-wrap gap-2">
              {formData.genre && formData.genre.length > 0 ? (
                formData.genre.map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">No genres selected</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-600 mb-2">Tone</p>
            <div className="flex flex-wrap gap-2">
              {formData.tone && formData.tone.length > 0 ? (
                formData.tone.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-gray-500">No tones selected</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* World Rules */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              World Rules & Systems
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection(2)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Technology */}
          {formData.technology && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Technology</p>
              <p className="text-sm text-gray-700 mt-1">{formData.technology}</p>
            </div>
          )}

          {/* Magic */}
          {formData.magic && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Magic System</p>
              <p className="text-sm text-gray-700 mt-1">{formData.magic}</p>
            </div>
          )}

          {/* Custom Rules */}
          {formData.rules && formData.rules.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">
                Custom Rules ({formData.rules.length})
              </p>
              <div className="space-y-2">
                {formData.rules.slice(0, 3).map((rule) => (
                  <div key={rule.id} className="p-2 bg-gray-50 rounded border">
                    <p className="text-sm font-medium">{rule.rule}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Category: {rule.category}
                    </p>
                  </div>
                ))}
                {formData.rules.length > 3 && (
                  <p className="text-xs text-gray-500">
                    +{formData.rules.length - 3} more rules
                  </p>
                )}
              </div>
            </div>
          )}

          {!formData.technology && !formData.magic && (!formData.rules || formData.rules.length === 0) && (
            <p className="text-sm text-gray-500">No rules or systems defined</p>
          )}
        </CardContent>
      </Card>

      {/* Locations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Key Locations
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection(3)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.locations && formData.locations.length > 0 ? (
            <div className="space-y-3">
              {formData.locations.map((location) => (
                <div key={location.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{location.name}</p>
                      {location.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {location.description}
                        </p>
                      )}
                      {location.atmosphere && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          {location.atmosphere}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No locations defined</p>
          )}
        </CardContent>
      </Card>

      {/* Key Objects */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Key Objects
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection(4)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {formData.keyObjects && formData.keyObjects.length > 0 ? (
            <div className="space-y-3">
              {formData.keyObjects.map((object) => (
                <div key={object.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{object.name}</p>
                      <p className="text-xs text-gray-500">{object.type}</p>
                      {object.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {object.description}
                        </p>
                      )}
                      {object.influence && (
                        <p className="text-xs text-blue-600 mt-1 italic">
                          Influence: {object.influence}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No objects defined</p>
          )}
        </CardContent>
      </Card>

      {/* Cultural Elements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Cultural Elements
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditSection(5)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Languages */}
          {formData.culturalElements?.languages && formData.culturalElements.languages.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Languages</p>
              <div className="flex flex-wrap gap-2">
                {formData.culturalElements.languages.map((lang, index) => (
                  <Badge key={index} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Religions */}
          {formData.culturalElements?.religions && formData.culturalElements.religions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Religions</p>
              <div className="flex flex-wrap gap-2">
                {formData.culturalElements.religions.map((religion, index) => (
                  <Badge key={index} variant="outline">
                    {religion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Traditions */}
          {formData.culturalElements?.traditions && formData.culturalElements.traditions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Traditions</p>
              <div className="flex flex-wrap gap-2">
                {formData.culturalElements.traditions.map((tradition, index) => (
                  <Badge key={index} variant="outline">
                    {tradition}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Historical Events */}
          {formData.culturalElements?.historicalEvents && formData.culturalElements.historicalEvents.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Historical Events</p>
              <div className="space-y-1">
                {formData.culturalElements.historicalEvents.map((event, index) => (
                  <p key={index} className="text-sm text-gray-700">
                    • {event}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Atmosphere */}
          {formData.atmosphere && (
            <div>
              <p className="text-sm font-semibold text-gray-600">Overall Atmosphere</p>
              <p className="text-sm text-gray-700 mt-1">{formData.atmosphere}</p>
            </div>
          )}

          {!formData.culturalElements && !formData.atmosphere && (
            <p className="text-sm text-gray-500">No cultural elements defined</p>
          )}
        </CardContent>
      </Card>

      {/* Completion Message */}
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-semibold text-green-900">
                Ready to Create World
              </h3>
              <p className="text-sm text-green-700 mt-1">
                Your world "{formData.name || 'Unnamed World'}" is ready to be created.
                Click "Complete" to save your world and make it available for your projects.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </WizardFormLayout>
  );
}
