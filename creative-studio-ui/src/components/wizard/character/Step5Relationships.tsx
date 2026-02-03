import { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCharacters } from '@/store';
import type { Character, CharacterRelationship } from '@/types/character';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 5: Relationships
// ============================================================================

interface Step5RelationshipsProps {
  storyContext?: StoryContext;
}

const RELATIONSHIP_TYPES = [
  'Family',
  'Friend',
  'Romantic Partner',
  'Mentor',
  'Student',
  'Rival',
  'Enemy',
  'Ally',
  'Colleague',
  'Acquaintance',
  'Other',
];

const RELATIONSHIP_DYNAMICS = [
  'Supportive',
  'Antagonistic',
  'Complicated',
  'Distant',
  'Close',
  'Evolving',
  'Strained',
  'Harmonious',
  'Dependent',
  'Independent',
];

export function Step5Relationships({ storyContext }: Step5RelationshipsProps = {}) {
  const { formData, updateFormData, validationErrors, nextStep, previousStep } =
    useWizard<Character>();
  
  // Get existing characters from the store
  const existingCharacters = useCharacters();

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentRelationship, setCurrentRelationship] = useState<CharacterRelationship>({
    character_id: '',
    character_name: '',
    relationship_type: '',
    description: '',
    dynamic: '',
  });
  const [useExistingCharacter, setUseExistingCharacter] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string>('');

  // Validate that the referenced character exists
  const validateCharacterExists = (characterId: string): boolean => {
    if (!characterId) return false;
    return existingCharacters.some((char) => char.character_id === characterId);
  };

  // Get character name by ID
  const getCharacterNameById = (characterId: string): string => {
    const character = existingCharacters.find((char) => char.character_id === characterId);
    return character?.name || '';
  };

  const handleAddRelationship = () => {
    // Validate
    if (useExistingCharacter && !validateCharacterExists(currentRelationship.character_id)) {
      setValidationError('Please select a valid existing character');
      return;
    }

    if (!useExistingCharacter && !currentRelationship.character_name.trim()) {
      setValidationError('Please enter a character name');
      return;
    }

    if (!currentRelationship.relationship_type) {
      setValidationError('Please select a relationship type');
      return;
    }

    setValidationError('');

    // Prepare relationship data
    const relationshipData: CharacterRelationship = {
      ...currentRelationship,
      character_id: useExistingCharacter 
        ? currentRelationship.character_id 
        : crypto.randomUUID(),
      character_name: useExistingCharacter
        ? getCharacterNameById(currentRelationship.character_id)
        : currentRelationship.character_name,
    };

    if (editingIndex !== null) {
      // Update existing relationship
      const relationships = [...(formData.relationships || [])];
      relationships[editingIndex] = relationshipData;
      updateFormData({ relationships });
      setEditingIndex(null);
    } else {
      // Add new relationship
      const relationships = formData.relationships || [];
      updateFormData({
        relationships: [...relationships, relationshipData],
      });
    }

    // Reset form
    setCurrentRelationship({
      character_id: '',
      character_name: '',
      relationship_type: '',
      description: '',
      dynamic: '',
    });
    setUseExistingCharacter(true);
  };

  const handleEditRelationship = (index: number) => {
    const relationship = formData.relationships?.[index];
    if (relationship) {
      setCurrentRelationship(relationship);
      setEditingIndex(index);
      // Check if this is an existing character
      const isExisting = validateCharacterExists(relationship.character_id);
      setUseExistingCharacter(isExisting);
      setValidationError('');
    }
  };

  const handleDeleteRelationship = (index: number) => {
    const relationships = formData.relationships || [];
    updateFormData({
      relationships: relationships.filter((_, i) => i !== index),
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setCurrentRelationship({
      character_id: '',
      character_name: '',
      relationship_type: '',
      description: '',
      dynamic: '',
    });
    setUseExistingCharacter(true);
    setValidationError('');
  };

  const isFormValid = () => {
    if (useExistingCharacter) {
      return (
        currentRelationship.character_id !== '' &&
        currentRelationship.relationship_type !== '' &&
        validateCharacterExists(currentRelationship.character_id)
      );
    } else {
      return (
        currentRelationship.character_name.trim() !== '' &&
        currentRelationship.relationship_type !== ''
      );
    }
  };

  // Check if a relationship references an existing character
  const isRelationshipValid = (relationship: CharacterRelationship): boolean => {
    return validateCharacterExists(relationship.character_id);
  };

  return (
    <WizardFormLayout
      title="Relationships"
      description="Define connections with other characters"
    >
      <div className="space-y-6">
        {/* Info about existing characters */}
        {existingCharacters.length > 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              You have {existingCharacters.length} existing character{existingCharacters.length !== 1 ? 's' : ''} in your project.
              You can create relationships with them or add new characters.
            </AlertDescription>
          </Alert>
        )}

        {/* Add/Edit Relationship Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingIndex !== null ? 'Edit Relationship' : 'Add Relationship'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Character Selection Mode */}
            {existingCharacters.length > 0 && (
              <div className="space-y-2">
                <Label>Character Source</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useExistingCharacter}
                      onChange={() => {
                        setUseExistingCharacter(true);
                        setCurrentRelationship({
                          ...currentRelationship,
                          character_id: '',
                          character_name: '',
                        });
                        setValidationError('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Existing Character</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useExistingCharacter}
                      onChange={() => {
                        setUseExistingCharacter(false);
                        setCurrentRelationship({
                          ...currentRelationship,
                          character_id: '',
                          character_name: '',
                        });
                        setValidationError('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">New Character</span>
                  </label>
                </div>
              </div>
            )}

            {/* Character Selection/Input */}
            {useExistingCharacter && existingCharacters.length > 0 ? (
              <div className="space-y-2">
                <Label htmlFor="existing-character" className="required">
                  Select Character
                </Label>
                <Select
                  value={currentRelationship.character_id}
                  onValueChange={(value) => {
                    setCurrentRelationship({
                      ...currentRelationship,
                      character_id: value,
                      character_name: getCharacterNameById(value),
                    });
                    setValidationError('');
                  }}
                >
                  <SelectTrigger id="existing-character" aria-required="true">
                    <SelectValue placeholder="Select a character" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {existingCharacters
                      .filter((char) => char.character_id !== formData.character_id) // Don't show current character
                      .map((character) => (
                        <SelectItem key={character.character_id} value={character.character_id}>
                          {character.name}
                          {character.role?.archetype && (
                            <span className="text-muted-foreground ml-2">
                              ({character.role.archetype})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select an existing character from your project
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="character-name" className="required">
                  Character Name
                </Label>
                <Input
                  id="character-name"
                  value={currentRelationship.character_name}
                  onChange={(e) => {
                    setCurrentRelationship({
                      ...currentRelationship,
                      character_name: e.target.value,
                    });
                    setValidationError('');
                  }}
                  placeholder="Name of the other character"
                  aria-required="true"
                />
                <p className="text-sm text-muted-foreground">
                  Enter the name of a character you'll create later
                </p>
              </div>
            )}

            {/* Relationship Type */}
            <div className="space-y-2">
              <Label htmlFor="relationship-type" className="required">
                Relationship Type
              </Label>
              <Select
                value={currentRelationship.relationship_type}
                onValueChange={(value) =>
                  setCurrentRelationship({
                    ...currentRelationship,
                    relationship_type: value,
                  })
                }
              >
                <SelectTrigger id="relationship-type" aria-required="true">
                  <SelectValue placeholder="Select relationship type" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {RELATIONSHIP_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dynamic */}
            <div className="space-y-2">
              <Label htmlFor="dynamic">Relationship Dynamic</Label>
              <Select
                value={currentRelationship.dynamic}
                onValueChange={(value) =>
                  setCurrentRelationship({
                    ...currentRelationship,
                    dynamic: value,
                  })
                }
              >
                <SelectTrigger id="dynamic">
                  <SelectValue placeholder="Select dynamic (optional)" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {RELATIONSHIP_DYNAMICS.map((dynamic) => (
                    <SelectItem key={dynamic} value={dynamic}>
                      {dynamic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="relationship-description">Description</Label>
              <Textarea
                id="relationship-description"
                value={currentRelationship.description}
                onChange={(e) =>
                  setCurrentRelationship({
                    ...currentRelationship,
                    description: e.target.value,
                  })
                }
                placeholder="Describe the relationship history and current status"
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                Example: "Met during military training, became close friends, now serve in different units but stay in touch"
              </p>
            </div>

            {/* Action Buttons */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleAddRelationship}
                disabled={!isFormValid()}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                {editingIndex !== null ? 'Update Relationship' : 'Add Relationship'}
              </Button>
              {editingIndex !== null && (
                <Button onClick={handleCancelEdit} variant="outline">
                  Cancel
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Existing Relationships List */}
        <div className="space-y-2">
          <Label>Existing Relationships</Label>
          {formData.relationships && formData.relationships.length > 0 ? (
            <div className="space-y-3">
              {formData.relationships.map((relationship, index) => {
                const isValid = isRelationshipValid(relationship);
                return (
                  <Card key={index} className={!isValid ? 'border-yellow-500' : ''}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{relationship.character_name}</h4>
                            <span className="text-sm text-muted-foreground">
                              ({relationship.relationship_type})
                            </span>
                            {relationship.dynamic && (
                              <span className="text-sm px-2 py-1 bg-muted rounded">
                                {relationship.dynamic}
                              </span>
                            )}
                            {isValid ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" aria-label="Character exists" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-yellow-600" aria-label="Character not found - will be created later" />
                            )}
                          </div>
                          {relationship.description && (
                            <p className="text-sm text-muted-foreground">
                              {relationship.description}
                            </p>
                          )}
                          {!isValid && (
                            <p className="text-sm text-yellow-600">
                              ⚠️ This character doesn't exist yet. You can create them later.
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleEditRelationship(index)}
                            variant="ghost"
                            size="sm"
                          >
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteRelationship(index)}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {validationErrors[`relationship-${index}-name`] && (
                        <p className="text-sm text-destructive mt-2" role="alert">
                          {validationErrors[`relationship-${index}-name`][0]}
                        </p>
                      )}
                      {validationErrors[`relationship-${index}-type`] && (
                        <p className="text-sm text-destructive mt-2" role="alert">
                          {validationErrors[`relationship-${index}-type`][0]}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  No relationships added yet. Add relationships to define how this character
                  connects with others in your story.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Relationships help create depth and conflict in your story.
            Consider adding at least 2-3 key relationships that will drive the narrative.
          </p>
        </div>
      </div>
    </WizardFormLayout>
  );
}
