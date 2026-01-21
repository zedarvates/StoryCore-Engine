import React, { useState } from 'react';
import { CharacterWizard } from '@/components/wizard/character/CharacterWizard';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// ============================================================================
// Character Wizard Demo Page
// ============================================================================

export function CharacterWizardDemo() {
  const [showWizard, setShowWizard] = useState(false);
  const [createdCharacter, setCreatedCharacter] = useState<Character | null>(null);
  const [selectedWorld, setSelectedWorld] = useState<World | undefined>(undefined);

  // Mock world for testing
  const mockWorld: World = {
    id: 'world-1',
    name: 'Eldoria',
    genre: ['Fantasy', 'Adventure'],
    timePeriod: 'Medieval',
    tone: ['Epic', 'Heroic'],
    locations: [],
    rules: [],
    atmosphere: 'A land of magic and ancient kingdoms',
    culturalElements: {
      languages: ['Common', 'Elvish'],
      religions: ['The Old Gods'],
      traditions: ['Annual Harvest Festival'],
      historicalEvents: ['The Great War'],
      culturalConflicts: ['Humans vs Elves'],
    },
    technology: 'Medieval with some magic',
    magic: 'Elemental magic system',
    conflicts: ['War between kingdoms'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const handleComplete = (character: Character) => {
    ;
    setCreatedCharacter(character);
    setShowWizard(false);
  };

  const handleCancel = () => {
    setShowWizard(false);
  };

  const handleStartWithWorld = () => {
    setSelectedWorld(mockWorld);
    setShowWizard(true);
  };

  const handleStartWithoutWorld = () => {
    setSelectedWorld(undefined);
    setShowWizard(true);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Character Wizard Demo</h1>
          <p className="text-muted-foreground">
            Test the character creation wizard with or without world context
          </p>
        </div>

        {!showWizard && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Start Character Creation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button onClick={handleStartWithWorld} className="flex-1">
                    Create Character with World Context
                  </Button>
                  <Button onClick={handleStartWithoutWorld} variant="outline" className="flex-1">
                    Create Character without World
                  </Button>
                </div>
                {selectedWorld && (
                  <p className="text-sm text-muted-foreground">
                    World context: <strong>{mockWorld.name}</strong> ({mockWorld.genre.join(', ')})
                  </p>
                )}
              </CardContent>
            </Card>

            {createdCharacter && (
              <Card>
                <CardHeader>
                  <CardTitle>Created Character</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(createdCharacter, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {showWizard && (
          <CharacterWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            worldContext={selectedWorld}
          />
        )}
      </div>
    </div>
  );
}
