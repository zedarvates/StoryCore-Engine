import { useState } from 'react';
import { useWizard } from '@/contexts/WizardContext';
import { WizardFormLayout, FormField } from '../WizardFormLayout';
import { Input } from '@/components/ui/input';
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
import { Plus, Trash2, AlertCircle, CheckCircle2, Share2, Users, Link2, GitCommit, Shield, Heart, Zap, ZapOff, Terminal, Activity } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCharacters } from '@/store';
import { cn } from '@/lib/utils';
import type { Character, CharacterRelationship } from '@/types/character';
import type { StoryContext } from './CharacterWizard';

// ============================================================================
// Step 5: Social Linkages (Relationships)
// ============================================================================

interface Step5RelationshipsProps {
  storyContext?: StoryContext;
}

const RELATIONSHIP_TYPES = [
  'Genetic / Unit',
  'Allied Peer',
  'Symbiotic Partner',
  'Knowledge Node',
  'Processing Node',
  'Competitive Parallel',
  'Antagonistic Adversary',
  'Strategic Proxy',
  'Operational Associate',
  'Casual Node',
  'Other / Custom',
];

const RELATIONSHIP_DYNAMICS = [
  'Augmenting',
  'Subtractive',
  'Non-Linear',
  'High-Latency',
  'Low-Latency',
  'Adaptive',
  'Fragmented',
  'Synchronized',
  'Sustained',
  'Autonomous',
];

export function Step5Relationships({ storyContext }: Step5RelationshipsProps = {}) {
  const { formData, updateFormData, validationErrors } = useWizard<Character>();
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

  const validateCharacterExists = (characterId: string): boolean => {
    if (!characterId) return false;
    return existingCharacters.some((char) => char.character_id === characterId);
  };

  const getCharacterNameById = (characterId: string): string => {
    const character = existingCharacters.find((char) => char.character_id === characterId);
    return character?.name || '';
  };

  const handleAddRelationship = () => {
    if (useExistingCharacter && !validateCharacterExists(currentRelationship.character_id)) {
      setValidationError('Entity archival lookup failed: Selection required');
      return;
    }

    if (!useExistingCharacter && !currentRelationship.character_name.trim()) {
      setValidationError('Entity designation failed: Identifier required');
      return;
    }

    if (!currentRelationship.relationship_type) {
      setValidationError('Linkage protocol failed: Type required');
      return;
    }

    setValidationError('');

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
      const relationships = [...(formData.relationships || [])];
      relationships[editingIndex] = relationshipData;
      updateFormData({ relationships });
      setEditingIndex(null);
    } else {
      const relationships = formData.relationships || [];
      updateFormData({
        relationships: [...relationships, relationshipData],
      });
    }

    setCurrentRelationship({
      character_id: '',
      character_name: '',
      relationship_type: '',
      description: '',
      dynamic: '',
    });
    setUseExistingCharacter(existingCharacters.length > 0);
  };

  const handleEditRelationship = (index: number) => {
    const relationship = formData.relationships?.[index];
    if (relationship) {
      setCurrentRelationship(relationship);
      setEditingIndex(index);
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
    setUseExistingCharacter(existingCharacters.length > 0);
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

  const isRelationshipValid = (relationship: CharacterRelationship): boolean => {
    return validateCharacterExists(relationship.character_id);
  };

  return (
    <WizardFormLayout
      title="SocialGrid Nexus"
      description="Initialize interpersonal linkages and map social proximity within the network"
    >
      <div className="space-y-10">
        {/* Connection Setup */}
        <div className="p-6 border border-primary/20 bg-primary/5 backdrop-blur-sm relative">
          <div className="absolute -top-3 left-6 bg-[#050b10] px-3 py-0.5 border border-primary/20">
            <span className="text-[10px] font-black text-primary neon-text uppercase tracking-widest font-mono">
              {editingIndex !== null ? '// Linkage Modification' : '// Linkage Initialization'}
            </span>
          </div>

          <div className="space-y-6 mt-2">
            {/* Source Selection */}
            {existingCharacters.length > 0 && (
              <div className="space-y-3">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-mono italic">Select Entity Source:</span>
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className={cn(
                      "w-4 h-4 border flex items-center justify-center transition-all",
                      useExistingCharacter ? "border-primary bg-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "border-primary/20 hover:border-primary/50"
                    )}>
                      {useExistingCharacter && <div className="w-1.5 h-1.5 bg-primary pulse-neon" />}
                      <input type="radio" checked={useExistingCharacter} onChange={() => { setUseExistingCharacter(true); setValidationError(''); }} className="hidden" />
                    </div>
                    <span className={cn("text-[11px] font-mono uppercase tracking-wider transition-colors", useExistingCharacter ? "text-primary" : "text-primary/40 group-hover:text-primary/60")}>Archive Entity</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={cn(
                      "w-4 h-4 border flex items-center justify-center transition-all",
                      !useExistingCharacter ? "border-primary bg-primary/20 shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" : "border-primary/20 hover:border-primary/50"
                    )}>
                      {!useExistingCharacter && <div className="w-1.5 h-1.5 bg-primary pulse-neon" />}
                      <input type="radio" checked={!useExistingCharacter} onChange={() => { setUseExistingCharacter(false); setValidationError(''); }} className="hidden" />
                    </div>
                    <span className={cn("text-[11px] font-mono uppercase tracking-wider transition-colors", !useExistingCharacter ? "text-primary" : "text-primary/40 group-hover:text-primary/60")}>Unregistered Entity</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {useExistingCharacter && existingCharacters.length > 0 ? (
                <FormField label="Target Archive Entity" name="character_id">
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
                    <SelectTrigger className="bg-primary/5 border-primary/20 font-mono text-[10px]">
                      <SelectValue placeholder="Accessing archives..." />
                    </SelectTrigger>
                    <SelectContent className="bg-[#050b10] border-primary/30">
                      {existingCharacters
                        .filter((char) => char.character_id !== formData.character_id)
                        .map((character) => (
                          <SelectItem key={character.character_id} value={character.character_id} className="focus:bg-primary/20 text-[10px] font-mono uppercase">
                            {character.name} {character.role?.archetype && `[${character.role.archetype}]`}
                          </SelectItem>
                        ))
                      }
                    </SelectContent>
                  </Select>
                </FormField>
              ) : (
                <FormField label="Entity Designation" name="character_name">
                  <Input
                    value={currentRelationship.character_name}
                    onChange={(e) => { setCurrentRelationship({ ...currentRelationship, character_name: e.target.value }); setValidationError(''); }}
                    placeholder="Input identifier..."
                    className="bg-primary/5 border-primary/20 font-mono text-[10px]"
                  />
                </FormField>
              )}

              <FormField label="Linkage Protocol (Type)" name="relationship_type">
                <Select
                  value={currentRelationship.relationship_type}
                  onValueChange={(value) => setCurrentRelationship({ ...currentRelationship, relationship_type: value })}
                >
                  <SelectTrigger className="bg-primary/5 border-primary/20 font-mono text-[10px]">
                    <SelectValue placeholder="Protocol defined..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b10] border-primary/30">
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="focus:bg-primary/20 text-[10px] font-mono uppercase">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="Iterative Dynamic" name="dynamic">
                <Select
                  value={currentRelationship.dynamic}
                  onValueChange={(value) => setCurrentRelationship({ ...currentRelationship, dynamic: value })}
                >
                  <SelectTrigger className="bg-primary/5 border-primary/20 font-mono text-[10px]">
                    <SelectValue placeholder="Dynamic state..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050b10] border-primary/30">
                    {RELATIONSHIP_DYNAMICS.map((dynamic) => (
                      <SelectItem key={dynamic} value={dynamic} className="focus:bg-primary/20 text-[10px] font-mono uppercase">
                        {dynamic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Operational History" name="description">
                <Textarea
                  value={currentRelationship.description}
                  onChange={(e) => setCurrentRelationship({ ...currentRelationship, description: e.target.value })}
                  placeholder="Detail the causal history of this linkage..."
                  rows={3}
                  className="bg-primary/5 border-primary/20 text-[10px]"
                />
              </FormField>
            </div>

            {validationError && (
              <div className="p-2 border border-red-500/30 bg-red-500/5 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[10px] text-red-400 font-mono uppercase tracking-tighter">{validationError}</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleAddRelationship}
                disabled={!isFormValid()}
                className="flex-1 btn-neon bg-primary/20 text-primary border-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {editingIndex !== null ? 'Modify Linkage' : 'Initialize Linkage'}
                </span>
              </Button>
              {editingIndex !== null && (
                <Button onClick={handleCancelEdit} variant="outline" className="border-primary/20 text-primary/60 hover:text-primary">
                  <span className="text-[10px] font-black uppercase tracking-widest">Abort</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Linkage Archives */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary/60">
            <Terminal className="h-4 w-4" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Active Linkage Archives</span>
          </div>

          {formData.relationships && formData.relationships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.relationships.map((rel, index) => {
                const isValid = isRelationshipValid(rel);
                return (
                  <div key={index} className={cn(
                    "p-4 border bg-primary/5 relative group transition-all",
                    isValid ? "border-primary/10 hover:border-primary/30" : "border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50"
                  )}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase text-primary tracking-wider">{rel.character_name}</span>
                          {isValid ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-yellow-500" />}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-[9px] font-mono px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary/80 uppercase tracking-tighter">{rel.relationship_type}</span>
                          {rel.dynamic && <span className="text-[9px] font-mono px-1.5 py-0.5 border border-primary/20 bg-primary/10 text-primary/60 uppercase tracking-tighter">{rel.dynamic}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button onClick={() => handleEditRelationship(index)} variant="ghost" size="icon" className="h-7 w-7 text-primary/40 hover:text-primary hover:bg-primary/10">
                          <Activity className="h-3.5 w-3.5" />
                        </Button>
                        <Button onClick={() => handleDeleteRelationship(index)} variant="ghost" size="icon" className="h-7 w-7 text-primary/20 hover:text-red-500 hover:bg-red-500/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {rel.description && (
                      <p className="text-[10px] font-mono text-primary/60 italic line-clamp-2 mt-2 pt-2 border-t border-primary/5">
                        "{rel.description}"
                      </p>
                    )}
                    {!isValid && (
                      <div className="mt-2 text-[9px] text-yellow-600 font-mono uppercase tracking-tighter opacity-70">
                        [!] archival target unregistered [!]
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 border border-dashed border-primary/10 flex flex-col items-center justify-center opacity-40">
              <Share2 className="h-8 w-8 text-primary/20 mb-3" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-primary/60">No linkages initialized</p>
            </div>
          )}
        </div>
      </div>
    </WizardFormLayout>
  );
}
