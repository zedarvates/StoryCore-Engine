/**
 * Step 4: Character Creation
 * Allows users to create detailed character profiles
 */

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Upload, Sparkles, Network } from 'lucide-react';
import { WizardFormLayout, FormField, FormSection, FormGrid } from '../WizardFormLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import type {
  CharacterProfile,
  CharacterRole,
  DialogueStyle,
} from '@/types/wizard';

// ============================================================================
// Character Role Options
// ============================================================================

const CHARACTER_ROLE_OPTIONS: {
  value: CharacterRole;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: 'protagonist',
    label: 'Protagonist',
    description: 'Main character driving the story',
    icon: '⭐',
  },
  {
    value: 'antagonist',
    label: 'Antagonist',
    description: 'Character opposing the protagonist',
    icon: '⚔️',
  },
  {
    value: 'supporting',
    label: 'Supporting',
    description: 'Important secondary character',
    icon: '👥',
  },
  {
    value: 'background',
    label: 'Background',
    description: 'Minor character',
    icon: '👤',
  },
];

// ============================================================================
// Dialogue Style Options
// ============================================================================

const DIALOGUE_STYLE_OPTIONS: {
  value: DialogueStyle;
  label: string;
  description: string;
}[] = [
  { value: 'formal', label: 'Formal', description: 'Proper and structured speech' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and conversational' },
  { value: 'technical', label: 'Technical', description: 'Specialized terminology' },
  { value: 'poetic', label: 'Poetic', description: 'Lyrical and metaphorical' },
  { value: 'terse', label: 'Terse', description: 'Brief and to the point' },
  { value: 'verbose', label: 'Verbose', description: 'Elaborate and detailed' },
  { value: 'dialect-specific', label: 'Dialect-Specific', description: 'Regional or cultural speech' },
];

// ============================================================================
// Component Props
// ============================================================================

interface Step4_CharacterCreationProps {
  data: CharacterProfile[] | null;
  onUpdate: (data: CharacterProfile[]) => void;
  errors?: Record<string, string>;
}

// ============================================================================
// Component
// ============================================================================

export function Step4_CharacterCreation({
  data,
  onUpdate,
  errors = {},
}: Step4_CharacterCreationProps) {
  // State
  const [characters, setCharacters] = useState<CharacterProfile[]>(data || []);
  const [isCharacterDialogOpen, setIsCharacterDialogOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<CharacterProfile | null>(null);
  const [isRelationshipDialogOpen, setIsRelationshipDialogOpen] = useState(false);
  const [selectedCharacterForRelationship, setSelectedCharacterForRelationship] =
    useState<CharacterProfile | null>(null);

  // Character form state
  const [characterForm, setCharacterForm] = useState<Partial<CharacterProfile>>({
    name: '',
    role: 'supporting',
    physicalAppearance: '',
    personalityTraits: [],
    characterArc: '',
    visualReferences: [],
    dialogueStyle: 'casual',
    relationships: [],
  });

  // Personality trait input
  const [traitInput, setTraitInput] = useState('');

  // Update parent when characters change
  useEffect(() => {
    if (characters.length > 0) {
      onUpdate(characters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters]); // Only depend on characters, not onUpdate

  // Handle character dialog open
  const handleAddCharacter = () => {
    setEditingCharacter(null);
    setCharacterForm({
      name: '',
      role: 'supporting',
      physicalAppearance: '',
      personalityTraits: [],
      characterArc: '',
      visualReferences: [],
      dialogueStyle: 'casual',
      relationships: [],
    });
    setTraitInput('');
    setIsCharacterDialogOpen(true);
  };

  // Handle character edit
  const handleEditCharacter = (character: CharacterProfile) => {
    setEditingCharacter(character);
    setCharacterForm(character);
    setTraitInput('');
    setIsCharacterDialogOpen(true);
  };

  // Handle character save
  const handleSaveCharacter = () => {
    if (!characterForm.name || !characterForm.physicalAppearance) {
      return;
    }

    const newCharacter: CharacterProfile = {
      id: editingCharacter?.id || `char-${Date.now()}`,
      name: characterForm.name,
      role: characterForm.role || 'supporting',
      physicalAppearance: characterForm.physicalAppearance || '',
      personalityTraits: characterForm.personalityTraits || [],
      characterArc: characterForm.characterArc || '',
      visualReferences: characterForm.visualReferences || [],
      dialogueStyle: characterForm.dialogueStyle || 'casual',
      relationships: characterForm.relationships || [],
    };

    if (editingCharacter) {
      // Update existing character
      setCharacters((prev) =>
        prev.map((char) => (char.id === editingCharacter.id ? newCharacter : char))
      );
    } else {
      // Add new character
      setCharacters((prev) => [...prev, newCharacter]);
    }

    setIsCharacterDialogOpen(false);
    setCharacterForm({
      name: '',
      role: 'supporting',
      physicalAppearance: '',
      personalityTraits: [],
      characterArc: '',
      visualReferences: [],
      dialogueStyle: 'casual',
      relationships: [],
    });
  };

  // Handle character delete
  const handleDeleteCharacter = (characterId: string) => {
    setCharacters((prev) => prev.filter((char) => char.id !== characterId));
  };

  // Handle personality trait add
  const handleAddTrait = () => {
    if (traitInput.trim() && characterForm.personalityTraits) {
      setCharacterForm((prev) => ({
        ...prev,
        personalityTraits: [...(prev.personalityTraits || []), traitInput.trim()],
      }));
      setTraitInput('');
    }
  };

  // Handle personality trait remove
  const handleRemoveTrait = (trait: string) => {
    setCharacterForm((prev) => ({
      ...prev,
      personalityTraits: (prev.personalityTraits || []).filter((t) => t !== trait),
    }));
  };

  // Handle visual reference upload (placeholder)
  const handleVisualReferenceUpload = () => {
    // Placeholder for file upload functionality
    // In a real implementation, this would handle file selection and upload
    const mockReference = `reference-${Date.now()}.jpg`;
    setCharacterForm((prev) => ({
      ...prev,
      visualReferences: [...(prev.visualReferences || []), mockReference],
    }));
  };

  // Handle visual reference remove
  const handleRemoveVisualReference = (reference: string) => {
    setCharacterForm((prev) => ({
      ...prev,
      visualReferences: (prev.visualReferences || []).filter((ref) => ref !== reference),
    }));
  };

  // Handle relationship matrix open
  const handleOpenRelationshipMatrix = (character: CharacterProfile) => {
    setSelectedCharacterForRelationship(character);
    setIsRelationshipDialogOpen(true);
  };

  // Get character role icon
  const getRoleIcon = (role: CharacterRole) => {
    return CHARACTER_ROLE_OPTIONS.find((opt) => opt.value === role)?.icon || '👤';
  };

  // Get character role label
  const getRoleLabel = (role: CharacterRole) => {
    return CHARACTER_ROLE_OPTIONS.find((opt) => opt.value === role)?.label || role;
  };

  return (
    <WizardFormLayout
      title="Character Creation"
      description="Create detailed character profiles for your story"
    >
      {/* Error Summary */}
      {errors.characters && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 p-4"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{errors.characters}</p>
        </div>
      )}

      {/* Character List */}
      <FormSection
        title="Character Profiles"
        description="Add and manage characters in your story"
      >
        {characters.length > 0 && (
          <div className="space-y-3">
            {characters.map((character) => (
              <Card key={character.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-2xl">
                        {getRoleIcon(character.role)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-lg">{character.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {getRoleLabel(character.role)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {character.physicalAppearance}
                          </p>
                          {character.personalityTraits.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {character.personalityTraits.map((trait, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {trait}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {character.characterArc && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                              <span className="font-medium">Arc:</span> {character.characterArc}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Dialogue: {character.dialogueStyle}</span>
                            {character.relationships.length > 0 && (
                              <span>{character.relationships.length} relationships</span>
                            )}
                            {character.visualReferences.length > 0 && (
                              <span>{character.visualReferences.length} references</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenRelationshipMatrix(character)}
                            aria-label={`View relationships for ${character.name}`}
                            title="Manage relationships"
                          >
                            <Network className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCharacter(character)}
                            aria-label={`Edit ${character.name}`}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCharacter(character.id)}
                            aria-label={`Delete ${character.name}`}
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

        {/* Add Character Button */}
        <Button onClick={handleAddCharacter} variant="outline" className="w-full" type="button">
          <Plus className="h-4 w-4 mr-2" />
          Add Character
        </Button>

        {/* Validation Message */}
        {characters.length === 0 && errors.characters && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.characters}</p>
        )}
      </FormSection>

      {/* Summary */}
      {characters.length > 0 && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Character Summary
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You have created <strong>{characters.length}</strong> character
                {characters.length > 1 ? 's' : ''} including{' '}
                <strong>
                  {characters.filter((c) => c.role === 'protagonist').length} protagonist(s)
                </strong>
                ,{' '}
                <strong>
                  {characters.filter((c) => c.role === 'antagonist').length} antagonist(s)
                </strong>
                , and{' '}
                <strong>
                  {characters.filter((c) => c.role === 'supporting').length} supporting character(s)
                </strong>
                . These characters will be available for scene breakdown and shot planning.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Character Dialog */}
      <Dialog open={isCharacterDialogOpen} onOpenChange={setIsCharacterDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCharacter ? 'Edit Character' : 'Add New Character'}
            </DialogTitle>
            <DialogDescription>
              Define a character profile with appearance, personality, and role
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Basic Information */}
            <FormGrid columns={2}>
              <FormField
                label="Character Name"
                name="characterName"
                required
                helpText="Full name of the character"
              >
                <Input
                  id="characterName"
                  value={characterForm.name || ''}
                  onChange={(e) =>
                    setCharacterForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., Sarah Connor, Gandalf"
                />
              </FormField>

              <FormField label="Role" name="characterRole" required helpText="Character's role in the story">
                <Select
                  value={characterForm.role || 'supporting'}
                  onValueChange={(value) =>
                    setCharacterForm((prev) => ({ ...prev, role: value as CharacterRole }))
                  }
                >
                  <SelectTrigger id="characterRole">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
                    {CHARACTER_ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center gap-2">
                          <span>{role.icon}</span>
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-xs text-gray-500">{role.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </FormGrid>

            {/* Physical Appearance */}
            <FormField
              label="Physical Appearance"
              name="physicalAppearance"
              required
              helpText="Describe the character's physical features, clothing, and distinctive traits"
            >
              <Textarea
                id="physicalAppearance"
                value={characterForm.physicalAppearance || ''}
                onChange={(e) =>
                  setCharacterForm((prev) => ({ ...prev, physicalAppearance: e.target.value }))
                }
                placeholder="e.g., Tall woman in her 30s with short dark hair, wearing tactical gear and a leather jacket"
                rows={3}
              />
            </FormField>

            {/* Personality Traits */}
            <FormField
              label="Personality Traits"
              name="personalityTraits"
              helpText="Add keywords describing the character's personality"
            >
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    placeholder="e.g., Brave, Intelligent, Stubborn"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrait();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTrait} variant="secondary">
                    Add
                  </Button>
                </div>
                {characterForm.personalityTraits && characterForm.personalityTraits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {characterForm.personalityTraits.map((trait, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer hover:bg-red-100 dark:hover:bg-red-900"
                        onClick={() => handleRemoveTrait(trait)}
                      >
                        {trait} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </FormField>

            {/* Character Arc */}
            <FormField
              label="Character Arc"
              name="characterArc"
              helpText="Describe how the character changes throughout the story"
            >
              <Textarea
                id="characterArc"
                value={characterForm.characterArc || ''}
                onChange={(e) =>
                  setCharacterForm((prev) => ({ ...prev, characterArc: e.target.value }))
                }
                placeholder="e.g., Starts as a reluctant hero, learns to trust others, becomes a confident leader"
                rows={3}
              />
            </FormField>

            {/* Dialogue Style */}
            <FormField
              label="Dialogue Style"
              name="dialogueStyle"
              helpText="How the character speaks"
            >
              <Select
                value={characterForm.dialogueStyle || 'casual'}
                onValueChange={(value) =>
                  setCharacterForm((prev) => ({ ...prev, dialogueStyle: value as DialogueStyle }))
                }
              >
                <SelectTrigger id="dialogueStyle">
                  <SelectValue placeholder="Select dialogue style" />
                </SelectTrigger>
                <SelectContent className="z-[9999]">
                  {DIALOGUE_STYLE_OPTIONS.map((style) => (
                    <SelectItem key={style.value} value={style.value}>
                      <div>
                        <div className="font-medium">{style.label}</div>
                        <div className="text-xs text-gray-500">{style.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Visual References */}
            <FormField
              label="Visual References"
              name="visualReferences"
              helpText="Upload reference images for character appearance"
            >
              <div className="space-y-2">
                <Button
                  type="button"
                  onClick={handleVisualReferenceUpload}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Reference Image
                </Button>
                {characterForm.visualReferences && characterForm.visualReferences.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {characterForm.visualReferences.map((ref, index) => (
                      <div
                        key={index}
                        className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center group"
                      >
                        <span className="text-xs text-gray-500 truncate px-2">{ref}</span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleRemoveVisualReference(ref)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCharacterDialogOpen(false)}
              type="button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveCharacter}
              disabled={!characterForm.name || !characterForm.physicalAppearance}
              type="button"
            >
              {editingCharacter ? 'Update Character' : 'Add Character'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relationship Matrix Dialog */}
      <Dialog open={isRelationshipDialogOpen} onOpenChange={setIsRelationshipDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Relationship Matrix - {selectedCharacterForRelationship?.name}
            </DialogTitle>
            <DialogDescription>
              Define relationships between this character and others
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {selectedCharacterForRelationship && (
              <div className="space-y-3">
                {characters
                  .filter((c) => c.id !== selectedCharacterForRelationship.id)
                  .map((otherCharacter) => {
                    const relationship = selectedCharacterForRelationship.relationships.find(
                      (r) => r.characterId === otherCharacter.id
                    );

                    return (
                      <Card key={otherCharacter.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center text-lg">
                                {getRoleIcon(otherCharacter.role)}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-sm">{otherCharacter.name}</h5>
                              {relationship ? (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {relationship.relationshipType}: {relationship.description}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400">No relationship defined</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                {characters.filter((c) => c.id !== selectedCharacterForRelationship.id).length ===
                  0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Add more characters to define relationships
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRelationshipDialogOpen(false)}
              type="button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WizardFormLayout>
  );
}
