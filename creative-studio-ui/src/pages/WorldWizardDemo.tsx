import { useState } from 'react';
import { WorldWizard } from '@/components/wizard/world';
import type { World } from '@/types/world';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// World Wizard Demo Page
// ============================================================================

export function WorldWizardDemo() {
  const [showWizard, setShowWizard] = useState(false);
  const [createdWorld, setCreatedWorld] = useState<World | null>(null);

  const handleComplete = (world: World) => {
    ;
    setCreatedWorld(world);
    setShowWizard(false);
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  const handleStartNew = () => {
    setCreatedWorld(null);
    setShowWizard(true);
  };

  if (showWizard) {
    return (
      <div className="h-screen">
        <WorldWizard onComplete={handleComplete} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">World Wizard Demo</h1>
          <p className="text-gray-600 mt-2">
            Test the world creation wizard with all 5 steps
          </p>
        </div>

        {!createdWorld ? (
          <Card>
            <CardHeader>
              <CardTitle>Create Your First World</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Use the wizard to create a rich, detailed story world with AI assistance.
              </p>
              <Button onClick={handleStartNew} size="lg">
                Start World Wizard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>World Created Successfully!</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{createdWorld.name}</h3>
                  <p className="text-sm text-gray-600">
                    {createdWorld.genre.join(', ')} • {createdWorld.timePeriod}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-gray-700">Tone</h4>
                  <p className="text-sm">{createdWorld.tone.join(', ')}</p>
                </div>

                {createdWorld.atmosphere && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Atmosphere</h4>
                    <p className="text-sm">{createdWorld.atmosphere}</p>
                  </div>
                )}

                {createdWorld.locations.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">
                      Locations ({createdWorld.locations.length})
                    </h4>
                    <ul className="text-sm list-disc list-inside">
                      {createdWorld.locations.map((loc) => (
                        <li key={loc.id}>{loc.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {createdWorld.rules.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">
                      Rules ({createdWorld.rules.length})
                    </h4>
                    <ul className="text-sm list-disc list-inside">
                      {createdWorld.rules.map((rule) => (
                        <li key={rule.id}>{rule.rule}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4">
                  <Button onClick={handleStartNew}>Create Another World</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Full World Data (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-96">
                  {JSON.stringify(createdWorld, null, 2)}
                </pre>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
