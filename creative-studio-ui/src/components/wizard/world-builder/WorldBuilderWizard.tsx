/**
 * World Builder Wizard
 * 
 * Refonded wizard with:
- Simplified 3-step flow (no Basic Info/World Rules as separate steps)
- Presets and templates for quick setup
- Combined Culture & Rules step
- Enhanced locations with presets
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Sparkles, Copy, Check, X, BookOpen, MapPin, Users, Settings } from 'lucide-react';
import { WizardErrorBoundary } from '../WizardErrorBoundary';
import { WizardStepIndicator, WizardStep } from '../WizardStepIndicator';
import { WizardNavigation } from '../WizardNavigation';
import { useWizardAutoSave } from '@/hooks/useWizardAutoSave';
import { useWizardCompletion } from '@/hooks/useWizardCompletion';
import { useServiceStatus } from '@/hooks/useServiceStatus';
import { useStore } from '@/store';
import type { World, Location, WorldRule, CulturalElements } from '@/types/world';
import { GENRE_OPTIONS, TONE_OPTIONS, RULE_CATEGORIES } from '@/types/world';

// ============================================================================
// Presets and Templates
// ============================================================================

export interface WorldPreset {
  id: string;
  name: string;
  description: string;
  genre: string[];
  tone: string[];
  locations: Partial<Location>[];
  rules: Partial<WorldRule>[];
  culturalElements: Partial<CulturalElements>;
  icon: string;
}

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: 'fantasy-kingdom',
    name: 'Fantasy Kingdom',
    description: 'Classic medieval fantasy setting with magic',
    genre: ['fantasy'],
    tone: ['epic', 'adventurous'],
    locations: [
      { name: 'Royal Castle', description: 'The seat of power', significance: 'Central', atmosphere: 'Majestic' },
      { name: 'Ancient Forest', description: 'Mystical woods', significance: 'Dangerous', atmosphere: 'Mysterious' },
      { name: 'Village', description: 'Humble settlement', significance: 'Home', atmosphere: 'Cozy' },
    ],
    rules: [
      { category: 'magical', rule: 'Magic is rare but powerful', implications: 'Only trained mages can use it' },
      { category: 'social', rule: 'Feudal hierarchy', implications: 'Nobles have more rights' },
    ],
    culturalElements: {
      languages: ['Common', 'Elvish', 'Dwarvish'],
      religions: ['Temple of Light', 'Old Gods'],
      traditions: ['Harvest Festival', 'Knighting Ceremony'],
    },
    icon: '🏰',
  },
  {
    id: 'cyberpunk-city',
    name: 'Cyberpunk City',
    description: 'High-tech dystopian future',
    genre: ['cyberpunk', 'sci-fi'],
    tone: ['dark', 'gritty'],
    locations: [
      { name: 'Corporate District', description: 'High-tech corporate zone', significance: 'Power center', atmosphere: 'Sterile' },
      { name: 'Underground Market', description: 'Black market hub', significance: 'Illegal trade', atmosphere: 'Dim' },
      { name: 'Slums', description: 'Poor residential area', significance: 'Home of outcasts', atmosphere: 'Gritty' },
    ],
    rules: [
      { category: 'technological', rule: 'Cybernetic enhancements common', implications: 'Social divide between augmented and natural' },
      { category: 'social', rule: 'Corporate control', implications: 'Government is weak, corporations rule' },
    ],
    culturalElements: {
      languages: ['English', 'Japanese', 'Corporate Speak'],
      religions: ['Tech Cult', 'Old Religions'],
      traditions: ['Neon Festival', 'Hackathon'],
    },
    icon: '🌆',
  },
  {
    id: 'post-apocalyptic',
    name: 'Post-Apocalyptic',
    description: 'World after the fall',
    genre: ['post-apocalyptic', 'sci-fi'],
    tone: ['dark', 'gritty'],
    locations: [
      { name: 'Bunker', description: 'Underground shelter', significance: 'Safe haven', atmosphere: 'Confined' },
      { name: 'Ruins', description: 'Collapsed city', significance: 'Danger zone', atmosphere: 'Desolate' },
      { name: 'Oasis', description: 'Rare safe settlement', significance: 'Hope', atmosphere: 'Tense' },
    ],
    rules: [
      { category: 'physical', rule: 'Resources are scarce', implications: 'Survival is priority' },
      { category: 'social', rule: 'Tribal societies', implications: 'Groups form for protection' },
    ],
    culturalElements: {
      languages: ['Broken English', 'Tribal dialects'],
      religions: ['Survivor Cults', 'Old World Worship'],
      traditions: ['Survival Day', 'Memorial of the Fall'],
    },
    icon: '☢️',
  },
  {
    id: 'space-opera',
    name: 'Space Opera',
    description: 'Interstellar adventure setting',
    genre: ['sci-fi', 'fantasy'],
    tone: ['epic', 'adventurous'],
    locations: [
      { name: 'Space Station', description: 'Orbital hub', significance: 'Trade center', atmosphere: 'Busy' },
      { name: 'Alien World', description: 'Exotic planet', significance: 'Adventure', atmosphere: 'Strange' },
      { name: 'Starship', description: 'Player ship', significance: 'Home', atmosphere: 'Cozy' },
    ],
    rules: [
      { category: 'technological', rule: 'FTL travel exists', implications: 'Galaxy is accessible' },
      { category: 'social', rule: 'Various factions compete', implications: 'Politics and war' },
    ],
    culturalElements: {
      languages: ['Galactic Common', 'Alien languages'],
      religions: ['Universal Church', 'Alien faiths'],
      traditions: ['Star Festival', 'Ship Launch'],
    },
    icon: '🚀',
  },
  {
    id: 'horror-manor',
    name: 'Haunted Manor',
    description: 'Gothic horror setting',
    genre: ['horror', 'fantasy'],
    tone: ['dark', 'mysterious'],
    locations: [
      { name: 'Grand Hall', description: 'Main entrance', significance: 'Gathering place', atmosphere: 'Eerie' },
      { name: 'Basement', description: 'Dark underground', significance: 'Secrets', atmosphere: 'Terrifying' },
      { name: 'Attic', description: 'Storage space', significance: 'Hidden truths', atmosphere: 'Dusty' },
    ],
    rules: [
      { category: 'physical', rule: 'Ghosts can interact', implications: 'Spirits are real and dangerous' },
      { category: 'social', rule: 'Family curse', implications: 'Tragedy follows the family' },
    ],
    culturalElements: {
      languages: ['English', 'Latin'],
      religions: ['Occult', 'Christianity'],
      traditions: ['Seance', 'Ritual of Binding'],
    },
    icon: '👻',
  },
];

// ============================================================================
// Component Props
// ============================================================================

export interface WorldBuilderWizardProps {
  onComplete: (world: World) => void;
  onCancel: () => void;
  initialData?: Partial<World>;
}

// ============================================================================
// Step 1: Quick Setup with Presets
// ============================================================================

interface Step1QuickSetupProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
  presets: WorldPreset[];
  onApplyPreset: (preset: WorldPreset) => void;
}

function Step1QuickSetup({ data, onUpdate, presets, onApplyPreset }: Step1QuickSetupProps) {
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [customName, setCustomName] = useState(data.name || '');

  const handleNameChange = (name: string) => {
    setCustomName(name);
    onUpdate({ ...data, name });
  };

  const handleGenreChange = (genre: string[]) => {
    onUpdate({ ...data, genre });
  };

  const handleToneChange = (tone: string[]) => {
    onUpdate({ ...data, tone });
  };

  return (
    <div className="space-y-6">
      {/* Presets Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Choose a Preset or Start Fresh
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Start Fresh Option */}
          <button
            onClick={() => {
              setSelectedPreset(null);
              onApplyPreset({
                id: 'fresh',
                name: 'Fresh Start',
                description: 'Start with a blank world',
                genre: [],
                tone: [],
                locations: [],
                rules: [],
                culturalElements: { languages: [], religions: [], traditions: [], historicalEvents: [], culturalConflicts: [] },
                icon: '✨',
              });
            }}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              selectedPreset === null ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">✨</div>
            <div className="font-medium">Fresh Start</div>
            <div className="text-sm text-gray-500">Blank world</div>
          </button>

          {/* Presets */}
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                setSelectedPreset(preset.id);
                onApplyPreset(preset);
              }}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedPreset === preset.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{preset.icon}</div>
              <div className="font-medium">{preset.name}</div>
              <div className="text-sm text-gray-500">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Settings (shown when preset selected or fresh) */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">World Name</label>
          <input
            type="text"
            value={customName}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Enter world name..."
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Genres</label>
          <div className="flex flex-wrap gap-2">
            {GENRE_OPTIONS.map((genre) => (
              <button
                key={genre.value}
                onClick={() => {
                  const newGenres = data.genre?.includes(genre.value)
                    ? data.genre.filter((g) => g !== genre.value)
                    : [...(data.genre || []), genre.value];
                  handleGenreChange(newGenres);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  data.genre?.includes(genre.value)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {genre.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tones</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map((tone) => (
              <button
                key={tone.value}
                onClick={() => {
                  const newTones = data.tone?.includes(tone.value)
                    ? data.tone.filter((t) => t !== tone.value)
                    : [...(data.tone || []), tone.value];
                  handleToneChange(newTones);
                }}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  data.tone?.includes(tone.value)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tone.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Step 2: Locations & Rules
// ============================================================================

interface Step2LocationsRulesProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onAddRule: () => void;
  onRemoveRule: (id: string) => void;
}

function Step2LocationsRules({
  data,
  onUpdate,
  onAddLocation,
  onRemoveLocation,
  onAddRule,
  onRemoveRule,
}: Step2LocationsRulesProps) {
  const locations = data.locations || [];
  const rules = data.rules || [];

  return (
    <div className="space-y-6">
      {/* Locations Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            Locations
          </h3>
          <button
            onClick={onAddLocation}
            className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Add Location
          </button>
        </div>

        {locations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No locations yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {locations.map((location, index) => (
              <div key={location.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-start gap-3">
                  <input
                    type="text"
                    value={location.name}
                    onChange={(e) => {
                      const newLocations = [...locations];
                      newLocations[index] = { ...location, name: e.target.value };
                      onUpdate({ ...data, locations: newLocations });
                    }}
                    placeholder="Location name"
                    className="flex-1 px-3 py-2 border rounded-lg"
                  />
                  <button
                    onClick={() => onRemoveLocation(location.id!)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={location.description}
                  onChange={(e) => {
                    const newLocations = [...locations];
                    newLocations[index] = { ...location, description: e.target.value };
                    onUpdate({ ...data, locations: newLocations });
                  }}
                  placeholder="Description"
                  className="w-full mt-2 px-3 py-2 border rounded-lg resize-none"
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="w-5 h-5 text-green-500" />
            World Rules
          </h3>
          <button
            onClick={onAddRule}
            className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
          >
            <Plus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No rules yet. Add one to define your world.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="p-4 border rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <select
                    value={rule.category}
                    onChange={(e) => {
                      const newRules = [...rules];
                      newRules[index] = { ...rule, category: e.target.value as any };
                      onUpdate({ ...data, rules: newRules });
                    }}
                    className="px-3 py-1 border rounded-lg text-sm"
                  >
                    {RULE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => onRemoveRule(rule.id!)}
                    className="ml-auto p-1 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <textarea
                  value={rule.rule}
                  onChange={(e) => {
                    const newRules = [...rules];
                    newRules[index] = { ...rule, rule: e.target.value };
                    onUpdate({ ...data, rules: newRules });
                  }}
                  placeholder="Rule description"
                  className="w-full px-3 py-2 border rounded-lg resize-none"
                  rows={2}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Step 3: Culture & Review
// ============================================================================

interface Step3CultureReviewProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
  onComplete: () => void;
}

function Step3CultureReview({ data, onUpdate, onComplete }: Step3CultureReviewProps) {
  const culturalElements = data.culturalElements || {
    languages: [],
    religions: [],
    traditions: [],
    historicalEvents: [],
    culturalConflicts: [],
  };

  const [activeTab, setActiveTab] = useState<'culture' | 'review'>('culture');

  const addItem = (field: keyof CulturalElements, item: string) => {
    if (!item.trim()) return;
    const current = culturalElements[field] || [];
    onUpdate({
      ...data,
      culturalElements: {
        ...culturalElements,
        [field]: [...current, item],
      },
    });
  };

  const removeItem = (field: keyof CulturalElements, index: number) => {
    const current = culturalElements[field] || [];
    onUpdate({
      ...data,
      culturalElements: {
        ...culturalElements,
        [field]: current.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('culture')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'culture' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'
          }`}
        >
          Culture
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'review' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-500'
          }`}
        >
          Review
        </button>
      </div>

      {activeTab === 'culture' ? (
        <div className="space-y-6">
          {/* Languages */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Languages
            </h4>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add language..."
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItem('languages', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                  addItem('languages', input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.languages.map((lang, i) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                  {lang}
                  <button onClick={() => removeItem('languages', i)} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Religions */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Users className="w-4 h-4" /> Religions/Faiths
            </h4>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add religion..."
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItem('religions', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                  addItem('religions', input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.religions.map((rel, i) => (
                <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full flex items-center gap-1">
                  {rel}
                  <button onClick={() => removeItem('religions', i)} className="hover:text-purple-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Traditions */}
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Traditions
            </h4>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add tradition..."
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addItem('traditions', e.currentTarget.value);
                    e.currentTarget.value = '';
                  }
                }}
              />
              <button
                onClick={(e) => {
                  const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                  addItem('traditions', input.value);
                  input.value = '';
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {culturalElements.traditions.map((trad, i) => (
                <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                  {trad}
                  <button onClick={() => removeItem('traditions', i)} className="hover:text-green-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">World Summary</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Name</div>
              <div className="font-medium">{data.name || 'Unnamed'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Genres</div>
              <div className="font-medium">{data.genre?.join(', ') || 'None'}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Locations</div>
              <div className="font-medium">{data.locations?.length || 0}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Rules</div>
              <div className="font-medium">{data.rules?.length || 0}</div>
            </div>
          </div>

          <button
            onClick={onComplete}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            Create World
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorldBuilderWizard({
  onComplete,
  onCancel,
  initialData,
}: WorldBuilderWizardProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<Partial<World>>(initialData || {});
  const addWorld = useStore((state) => state.addWorld);

  // Steps definition
  const steps: WizardStep[] = [
    { number: 1, title: 'Quick Setup', description: 'Presets & basics' },
    { number: 2, title: 'Locations & Rules', description: 'Build your world' },
    { number: 3, title: 'Culture & Review', description: 'Finalize' },
  ];

  // Data update
  const updateData = useCallback((newData: Partial<World>) => {
    setData((prev) => ({ ...prev, ...newData }));
  }, []);

  // Location management
  const addLocation = useCallback(() => {
    const newLocation: Location = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      significance: '',
      atmosphere: '',
    };
    updateData({
      locations: [...(data.locations || []), newLocation],
    });
  }, [data.locations, updateData]);

  const removeLocation = useCallback((id: string) => {
    updateData({
      locations: data.locations?.filter((l) => l.id !== id) || [],
    });
  }, [data.locations, updateData]);

  // Rule management
  const addRule = useCallback(() => {
    const newRule: WorldRule = {
      id: crypto.randomUUID(),
      category: 'physical',
      rule: '',
      implications: '',
    };
    updateData({
      rules: [...(data.rules || []), newRule],
    });
  }, [data.rules, updateData]);

  const removeRule = useCallback((id: string) => {
    updateData({
      rules: data.rules?.filter((r) => r.id !== id) || [],
    });
  }, [data.rules, updateData]);

  // Apply preset
  const applyPreset = useCallback((preset: WorldPreset) => {
    setData({
      name: preset.name,
      genre: preset.genre,
      tone: preset.tone,
      locations: preset.locations.map((l) => ({
        id: crypto.randomUUID(),
        name: l.name || '',
        description: l.description || '',
        significance: l.significance || '',
        atmosphere: l.atmosphere || '',
      })),
      rules: preset.rules.map((r) => ({
        id: crypto.randomUUID(),
        category: r.category || 'physical',
        rule: r.rule || '',
        implications: r.implications || '',
      })),
      culturalElements: {
        languages: preset.culturalElements.languages || [],
        religions: preset.culturalElements.religions || [],
        traditions: preset.culturalElements.traditions || [],
        historicalEvents: [],
        culturalConflicts: [],
      },
    });
  }, []);

  // Navigation
  const canGoNext = useMemo(() => {
    if (currentStep === 1) {
      return data.name && data.name.trim() !== '';
    }
    return true;
  }, [currentStep, data.name]);

  const canGoBack = currentStep > 1;

  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    const world: World = {
      id: crypto.randomUUID(),
      name: data.name || 'Unnamed World',
      genre: data.genre || [],
      timePeriod: data.timePeriod || 'Unknown',
      tone: data.tone || [],
      locations: data.locations || [],
      rules: data.rules || [],
      atmosphere: data.atmosphere || '',
      culturalElements: data.culturalElements || {
        languages: [],
        religions: [],
        traditions: [],
        historicalEvents: [],
        culturalConflicts: [],
      },
      technology: data.technology || '',
      magic: data.magic || '',
      conflicts: data.conflicts || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addWorld(world);
    onComplete(world);
  }, [data, addWorld, onComplete]);

  // Render current step
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <Step1QuickSetup
            data={data}
            onUpdate={updateData}
            presets={WORLD_PRESETS}
            onApplyPreset={applyPreset}
          />
        );
      case 2:
        return (
          <Step2LocationsRules
            data={data}
            onUpdate={updateData}
            onAddLocation={addLocation}
            onRemoveLocation={removeLocation}
            onAddRule={addRule}
            onRemoveRule={removeRule}
          />
        );
      case 3:
        return (
          <Step3CultureReview
            data={data}
            onUpdate={updateData}
            onComplete={handleComplete}
          />
        );
      default:
        return null;
    }
  };

  return (
    <WizardErrorBoundary
      wizardType="world"
      onReset={() => {
        setCurrentStep(1);
        setData({});
      }}
    >
      <div className="wizard-builder p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Create Your World</h2>
          <p className="text-gray-500">Choose a preset or start fresh, then build your world.</p>
        </div>

        {/* Step Indicator */}
        <div className="mb-6">
          <WizardStepIndicator
            steps={steps}
            currentStep={currentStep}
            allowJumpToStep={false}
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
              >
                Next
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </WizardErrorBoundary>
  );
}

export default WorldBuilderWizard;
