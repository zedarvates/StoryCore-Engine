import React, { useCallback, useMemo, useState } from 'react';
import { Plus, Trash2, MapPin, ScrollText, AlertCircle, Sparkles, Box, Wand2, Info } from 'lucide-react';
import type { World, Location, WorldRule, WorldObject } from '@/types/world';
import { RULE_CATEGORIES } from '@/types/world';
import { llmConfigService } from '@/services/llmConfigService';
import { logger } from '@/utils/logger';

interface LocationsRulesStepProps {
  data: Partial<World>;
  onUpdate: (data: Partial<World>) => void;
  onAddLocation: () => void;
  onRemoveLocation: (id: string) => void;
  onAddRule: () => void;
  onRemoveRule: (id: string) => void;
  onAddKeyObject: () => void;
  onRemoveKeyObject: (id: string) => void;
}

export function LocationsRulesStep({
  data,
  onUpdate,
  onAddLocation,
  onRemoveLocation,
  onAddRule,
  onRemoveRule,
  onAddKeyObject,
  onRemoveKeyObject,
}: LocationsRulesStepProps) {
  const locations = useMemo(() => data.locations || [], [data.locations]);
  const rules = useMemo(() => data.rules || [], [data.rules]);
  const objects = useMemo(() => data.keyObjects || [], [data.keyObjects]);
  
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  const updateLocation = useCallback((id: string, updates: Partial<Location>) => {
    const newLocations = locations.map(loc => 
      loc.id === id ? { ...loc, ...updates } : loc
    );
    onUpdate({ locations: newLocations });
  }, [locations, onUpdate]);

  const updateRule = useCallback((id: string, updates: Partial<WorldRule>) => {
    const newRules = rules.map(rule => 
      rule.id === id ? { ...rule, ...updates } : rule
    );
    onUpdate({ rules: newRules });
  }, [rules, onUpdate]);

  const updateObject = useCallback((id: string, updates: Partial<WorldObject>) => {
    const newObjects = objects.map(obj => 
      obj.id === id ? { ...obj, ...updates } : obj
    );
    onUpdate({ keyObjects: newObjects });
  }, [objects, onUpdate]);

  // Helper function to call LLM service
  const callLLM = async (prompt: string): Promise<string | null> => {
    const service = llmConfigService.getService();
    if (!service) {
      logger.warn('[LocationsRulesStep] LLM service not configured');
      return null;
    }
    
    try {
      const response = await service.generateCompletion({
        prompt,
        maxTokens: 500,
        temperature: 0.8,
      });
      
      if (response.success && response.data?.content) {
        return response.data.content.trim();
      }
      return null;
    } catch (error) {
      logger.error('[LocationsRulesStep] LLM generation failed:', error);
      return null;
    }
  };

  // Generate location with LLM
  const generateLocation = async (id: string) => {
    setIsGenerating(id);
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const tone = data.tone?.join(', ') || 'adventurous';
    const worldName = data.name || 'this world';
    
    const prompt = `You are a creative world-building assistant. Generate a unique location for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}
- Tone(s): ${tone}

Create a compelling location with the following details. Respond in JSON format:
{
  "name": "Location name (evocative and fitting the genre)",
  "description": "A rich sensory description of the location (2-3 sentences describing sights, sounds, smells, atmosphere)",
  "significance": "Why this location matters to the story",
  "atmosphere": "The mood/feeling this location evokes"
}

Only respond with valid JSON, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        // Try to parse JSON response
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          updateLocation(id, {
            name: parsed.name || '',
            description: parsed.description || '',
            significance: parsed.significance || '',
            atmosphere: parsed.atmosphere || '',
          });
        }
      } catch {
        // Fallback: use the result as description
        updateLocation(id, {
          name: `Location ${locations.length + 1}`,
          description: result,
          significance: 'Key story location',
          atmosphere: tone,
        });
      }
    }
    
    setIsGenerating(null);
  };

  // Generate rule with LLM
  const generateRule = async (id: string) => {
    setIsGenerating(id);
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const worldName = data.name || 'this world';
    const existingRules = rules.filter(r => r.id !== id);
    
    const prompt = `You are a creative world-building assistant. Generate a unique law or rule for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}
- Existing rules: ${existingRules.map(r => r.rule).join('; ') || 'None yet'}

Create a compelling world axiom (physical law, social rule, magical principle, or technological constraint).

Respond in JSON format:
{
  "rule": "The law or rule description (clear and impactful)",
  "implications": "How this affects the story, characters, and world (2-3 sentences)",
  "category": "physical|social|magical|technological"
}

Only respond with valid JSON, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          updateRule(id, {
            rule: parsed.rule || '',
            implications: parsed.implications || '',
            category: parsed.category || 'physical',
          });
        }
      } catch {
        updateRule(id, {
          rule: result,
          implications: 'This rule shapes the world and creates narrative tension.',
          category: 'physical',
        });
      }
    }
    
    setIsGenerating(null);
  };

  // Generate object with LLM
  const generateObject = async (id: string) => {
    setIsGenerating(id);
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const tone = data.tone?.join(', ') || 'mysterious';
    const worldName = data.name || 'this world';
    
    const prompt = `You are a creative world-building assistant. Generate a unique artifact or significant object for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}
- Tone(s): ${tone}

Create a compelling object of significance.

Respond in JSON format:
{
  "name": "Object name (evocative and memorable)",
  "type": "Weapon|Relic|Artifact|Tool|Device|Tome|etc",
  "description": "Physical description and history (2-3 sentences)",
  "influence": "How this object affects the plot and characters (2-3 sentences)"
}

Only respond with valid JSON, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          updateObject(id, {
            name: parsed.name || '',
            type: parsed.type || 'Artifact',
            description: parsed.description || '',
            influence: parsed.influence || '',
          });
        }
      } catch {
        updateObject(id, {
          name: `Artifact ${objects.length + 1}`,
          type: 'Artifact',
          description: result,
          influence: 'This object holds significance in the story.',
        });
      }
    }
    
    setIsGenerating(null);
  };

  // Generate all locations
  const generateAllLocations = async () => {
    setIsGenerating('locations-all');
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const tone = data.tone?.join(', ') || 'adventurous';
    const worldName = data.name || 'this world';
    
    const prompt = `You are a creative world-building assistant. Generate 3 unique locations for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}
- Tone(s): ${tone}

Create 3 diverse and compelling locations.

Respond in JSON array format:
[
  {
    "name": "Location name",
    "description": "Rich sensory description (2-3 sentences)",
    "significance": "Story importance",
    "atmosphere": "Mood/feeling",
    "location_type": "interior|exterior"
  }
]

Only respond with valid JSON array, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const newLocations = parsed.map((loc: Partial<Location>) => ({
            id: crypto.randomUUID(),
            name: loc.name || '',
            description: loc.description || '',
            significance: loc.significance || '',
            atmosphere: loc.atmosphere || '',
            location_type: loc.location_type || 'exterior',
          }));
          onUpdate({ locations: [...locations, ...newLocations] });
        }
      } catch {
        logger.error('[LocationsRulesStep] Failed to parse locations JSON');
      }
    }
    
    setIsGenerating(null);
  };

  // Generate all rules
  const generateAllRules = async () => {
    setIsGenerating('rules-all');
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const worldName = data.name || 'this world';
    
    const prompt = `You are a creative world-building assistant. Generate 3 unique laws or rules for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}

Create 3 diverse world axioms covering different aspects.

Respond in JSON array format:
[
  {
    "rule": "The law description",
    "implications": "How this affects the story",
    "category": "physical|social|magical|technological"
  }
]

Only respond with valid JSON array, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const newRules = parsed.map((rule: Partial<WorldRule>) => ({
            id: crypto.randomUUID(),
            rule: rule.rule || '',
            implications: rule.implications || '',
            category: rule.category || 'physical',
          }));
          onUpdate({ rules: [...rules, ...newRules] });
        }
      } catch {
        logger.error('[LocationsRulesStep] Failed to parse rules JSON');
      }
    }
    
    setIsGenerating(null);
  };

  // Generate all objects
  const generateAllObjects = async () => {
    setIsGenerating('objects-all');
    
    const genre = data.genre?.join(', ') || 'fantasy';
    const tone = data.tone?.join(', ') || 'mysterious';
    const worldName = data.name || 'this world';
    
    const prompt = `You are a creative world-building assistant. Generate 3 unique artifacts or objects for a story world.

World Context:
- Name: ${worldName}
- Genre(s): ${genre}
- Tone(s): ${tone}

Create 3 diverse objects of significance.

Respond in JSON array format:
[
  {
    "name": "Object name",
    "type": "Weapon|Relic|Artifact|Tool|Device|Tome|etc",
    "description": "Physical description and history",
    "influence": "How this affects the plot"
  }
]

Only respond with valid JSON array, no additional text.`;

    const result = await callLLM(prompt);
    
    if (result) {
      try {
        const jsonMatch = result.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const newObjects = parsed.map((obj: Partial<WorldObject>) => ({
            id: crypto.randomUUID(),
            name: obj.name || '',
            type: obj.type || 'Artifact',
            description: obj.description || '',
            influence: obj.influence || '',
          }));
          onUpdate({ keyObjects: [...objects, ...newObjects] });
        }
      } catch {
        logger.error('[LocationsRulesStep] Failed to parse objects JSON');
      }
    }
    
    setIsGenerating(null);
  };

  // Main generateField dispatcher
  const generateField = async (type: string, id?: string) => {
    if (type === 'location' && id) {
      await generateLocation(id);
    } else if (type === 'rule' && id) {
      await generateRule(id);
    } else if (type === 'object' && id) {
      await generateObject(id);
    } else if (type === 'locations-all') {
      await generateAllLocations();
    } else if (type === 'rules-all') {
      await generateAllRules();
    } else if (type === 'objects-all') {
      await generateAllObjects();
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Locations Section */}
      <section className="relative group/section">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100/50 dark:bg-blue-900/20 backdrop-blur-md rounded-2xl border border-blue-200/20 dark:border-blue-500/20 shadow-inner">
              <MapPin className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Prime Locations</h3>
              <p className="text-sm text-gray-500 font-medium">Define the theaters of your narrative.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={() => generateField('locations-all')}
              disabled={isGenerating === 'locations-all'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                isGenerating === 'locations-all' 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30 cursor-wait' 
                  : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating === 'locations-all' ? 'animate-pulse' : ''}`} />
              {isGenerating === 'locations-all' ? 'Generating...' : 'Auto-Seed'}
            </button>
            <button
              onClick={onAddLocation}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-95 border-b-4 border-blue-800"
            >
              <Plus className="w-4 h-4" />
              Record Site
            </button>
          </div>
        </div>

        {locations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-blue-500/5 dark:bg-blue-500/5 border-2 border-dashed border-blue-200/30 dark:border-blue-800/30 rounded-3xl backdrop-blur-sm">
            <div className="p-5 bg-white/50 dark:bg-gray-900/50 rounded-full mb-4 shadow-xl border border-white/20 dark:border-white/5">
              <MapPin className="w-10 h-10 text-blue-400/50" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-bold text-lg">The world is uncharted.</p>
            <p className="text-sm text-gray-400 mb-6">Start by recording your first significant location.</p>
            <button onClick={onAddLocation} className="px-8 py-3 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 font-black rounded-2xl shadow-sm hover:shadow-md transition-all border border-blue-100 dark:border-blue-900/50 active:scale-95">
              Establish Outpost
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {locations.map((location) => (
              <div 
                key={location.id} 
                className="group relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute -top-2 -right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => generateField('location', location.id)}
                    className={`p-2 bg-amber-500 text-white rounded-lg shadow-lg hover:bg-amber-600 transition-all ${isGenerating === location.id ? 'animate-spin' : ''}`}
                    title="Generate with AI"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveLocation(location.id!)}
                    className="p-2 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      value={location.name}
                      onChange={(e) => updateLocation(location.id!, { name: e.target.value })}
                      placeholder="Title of Location..."
                      className="flex-1 text-xl font-black bg-transparent border-none focus:ring-0 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 text-gray-800 dark:text-white"
                    />
                    <select
                      value={location.location_type || 'exterior'}
                      onChange={(e) => updateLocation(location.id!, { location_type: e.target.value as 'interior' | 'exterior' })}
                      className="px-3 py-1 bg-blue-100/50 dark:bg-blue-900/30 border-none rounded-lg text-[10px] font-black uppercase tracking-tighter focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer text-blue-700 dark:text-blue-300"
                    >
                      <option value="exterior">🌍 Exterior</option>
                      <option value="interior">🏠 Interior</option>
                    </select>
                  </div>
                  
                  <div className="relative">
                    <textarea
                      value={location.description}
                      onChange={(e) => updateLocation(location.id!, { description: e.target.value })}
                      placeholder="Atmospheric metadata & sensory details..."
                      className="w-full bg-gray-100/30 dark:bg-black/20 p-4 rounded-2xl text-sm font-medium resize-none focus:ring-2 focus:ring-blue-500/50 outline-none transition-all border border-transparent focus:border-blue-500/30 min-h-[100px]"
                    />
                    {isGenerating === location.id && (
                      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <Sparkles className="w-6 h-6 text-blue-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Rules Section */}
      <section className="relative group/section">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-100/50 dark:bg-emerald-900/20 backdrop-blur-md rounded-2xl border border-emerald-200/20 dark:border-emerald-500/20 shadow-inner">
              <ScrollText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">World Axioms</h3>
              <p className="text-sm text-gray-500 font-medium">The immutable laws governing your dimension.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => generateField('rules-all')}
              disabled={isGenerating === 'rules-all'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                isGenerating === 'rules-all' 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-wait' 
                  : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating === 'rules-all' ? 'animate-pulse' : ''}`} />
              {isGenerating === 'rules-all' ? 'Generating...' : 'Manifest Laws'}
            </button>
            <button
              onClick={onAddRule}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/25 active:scale-95 border-b-4 border-emerald-800"
            >
              <Plus className="w-4 h-4" />
              Legislate
            </button>
          </div>
        </div>

        {rules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-emerald-500/5 border-2 border-dashed border-emerald-200/30 dark:border-emerald-800/30 rounded-3xl backdrop-blur-sm">
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-4">Chaos reigns here.</p>
            <button onClick={onAddRule} className="text-emerald-600 dark:text-emerald-400 font-black hover:underline px-6 py-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-xl">
              Establish First Order
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {rules.map((rule) => (
              <div 
                key={rule.id} 
                className="group p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-sm hover:shadow-xl transition-all flex gap-6"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <select
                        value={rule.category}
                        onChange={(e) => updateRule(rule.id!, { category: e.target.value as 'physical' | 'social' | 'magical' | 'technological' })}
                        className="px-4 py-1.5 bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-emerald-500 outline-none border-none transition-all cursor-pointer"
                      >
                        {RULE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-gray-100/50 dark:bg-gray-800/50 rounded-lg text-[10px] text-gray-400 font-bold">
                        <AlertCircle className="w-3 h-3" />
                        SYSTEM IMPACT: HIGH
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => generateField('rule', rule.id)}
                        className={`p-2 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-all ${isGenerating === rule.id ? 'animate-spin' : ''}`}
                      >
                        <Wand2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onRemoveRule(rule.id!)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={rule.rule}
                    onChange={(e) => updateRule(rule.id!, { rule: e.target.value })}
                    placeholder="Describe the Law (e.g. Gravity is lateral in the 4th quadrant)"
                    className="w-full text-lg font-black bg-transparent border-none focus:ring-0 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 text-gray-800 dark:text-white"
                  />
                  <div className="relative">
                    <textarea
                      value={rule.implications}
                      onChange={(e) => updateRule(rule.id!, { implications: e.target.value })}
                      placeholder="List the narrative & mechanical implications..."
                      className="w-full bg-emerald-100/10 dark:bg-black/20 p-4 rounded-2xl text-sm font-medium resize-none focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all border border-transparent focus:border-emerald-500/30"
                      rows={2}
                    />
                     {isGenerating === rule.id && (
                      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* World Objects Section */}
      <section className="relative group/section">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-100/50 dark:bg-amber-900/20 backdrop-blur-md rounded-2xl border border-amber-200/20 dark:border-amber-500/20 shadow-inner">
              <Box className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">World Objects</h3>
              <p className="text-sm text-gray-500 font-medium">Relics, artifacts, and items of significance.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button
              onClick={() => generateField('objects-all')}
              disabled={isGenerating === 'objects-all'}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                isGenerating === 'objects-all' 
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 cursor-wait' 
                  : 'bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating === 'objects-all' ? 'animate-pulse' : ''}`} />
              {isGenerating === 'objects-all' ? 'Generating...' : 'Conjure'}
            </button>
            <button
              onClick={onAddKeyObject}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-amber-500/25 active:scale-95 border-b-4 border-amber-800"
            >
              <Plus className="w-4 h-4" />
              Manifest Item
            </button>
          </div>
        </div>

        {objects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-amber-500/5 border-2 border-dashed border-amber-200/30 dark:border-amber-800/30 rounded-3xl backdrop-blur-sm">
            <p className="text-gray-500 dark:text-gray-400 font-bold mb-4">No legendary items detected.</p>
            <button onClick={onAddKeyObject} className="text-amber-600 dark:text-amber-400 font-black hover:underline px-6 py-2 bg-amber-100/50 dark:bg-amber-900/30 rounded-xl">
              Forge Artifact
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {objects.map((obj) => (
              <div 
                key={obj.id} 
                className="group relative p-6 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300"
              >
                 <div className="absolute top-4 right-4 flex gap-2">
                    <button
                      onClick={() => generateField('object', obj.id)}
                      className={`p-2 text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-all ${isGenerating === obj.id ? 'animate-spin' : ''}`}
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveKeyObject(obj.id!)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      value={obj.name}
                      onChange={(e) => updateObject(obj.id!, { name: e.target.value })}
                      placeholder="Object Name..."
                      className="text-lg font-black bg-transparent border-none focus:ring-0 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-700 text-gray-800 dark:text-white"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={obj.type}
                        onChange={(e) => updateObject(obj.id!, { type: e.target.value })}
                        placeholder="Type (e.g. Weapon, Relic)"
                        className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-black uppercase text-gray-500 dark:text-gray-400 outline-none border-none"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <label className="text-[10px] font-black text-amber-600/50 dark:amber-400/30 uppercase flex items-center gap-1 mb-1">
                        <Info className="w-3 h-3" /> Description
                      </label>
                      <textarea
                        value={obj.description}
                        onChange={(e) => updateObject(obj.id!, { description: e.target.value })}
                        placeholder="Tell its story..."
                        className="w-full bg-amber-100/10 dark:bg-black/20 p-3 rounded-2xl text-xs font-medium resize-none focus:ring-2 focus:ring-amber-500/50 outline-none border border-transparent min-h-[60px]"
                      />
                    </div>
                    
                    <div className="relative">
                      <label className="text-[10px] font-black text-amber-600/50 dark:amber-400/30 uppercase flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3" /> Narrative Influence
                      </label>
                      <textarea
                        value={obj.influence}
                        onChange={(e) => updateObject(obj.id!, { influence: e.target.value })}
                        placeholder="How does it change the plot?"
                        className="w-full bg-amber-100/10 dark:bg-black/20 p-3 rounded-2xl text-xs font-medium resize-none focus:ring-2 focus:ring-amber-500/50 outline-none border border-transparent min-h-[60px]"
                      />
                    </div>
                    
                    {isGenerating === obj.id && (
                      <div className="absolute inset-0 bg-white/40 dark:bg-black/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl z-10">
                        <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

