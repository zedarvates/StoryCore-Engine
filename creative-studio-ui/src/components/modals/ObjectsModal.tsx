/**
 * ObjectsModal - Game Object management modal with AI assistance
 *
 * Allows viewing, creating, editing, and analyzing story objects.
 * Uses file-based storage and integrated AI services.
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  BookOpenIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  SearchIcon,
  SparklesIcon,
  Wand2Icon,
  TargetIcon,
  ZapIcon,
  StarIcon,
  CrownIcon,
  GemIcon,
  LightbulbIcon,
  CpuIcon,
  RefreshCwIcon,
  MapPinIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useObjectStore } from '@/stores/objectStore';
import { objectsAIService, type ObjectAnalysis, type ObjectGenerationOptions } from '@/services/ObjectsAIService';
import { notificationService } from '@/services/NotificationService';
import { StoryObject, ObjectType, ObjectRarity } from '@/types/object';

interface ObjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectsModal({ isOpen, onClose }: ObjectsModalProps) {
  const project = useAppStore((state) => state.project);
  const {
    objects,
    fetchProjectObjects,
    addObject,
    updateObject,
    removeObject,
    isLoading
  } = useObjectStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ObjectType | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<ObjectRarity | 'all'>('all');
  const [editingObject, setEditingObject] = useState<StoryObject | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [analyzingObject, setAnalyzingObject] = useState<StoryObject | null>(null);
  const [objectAnalysis, setObjectAnalysis] = useState<ObjectAnalysis | null>(null);

  // Load project objects when modal opens
  useEffect(() => {
    if (project && isOpen) {
      const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;
      fetchProjectObjects(projectId);
    }
  }, [project, isOpen, fetchProjectObjects]);

  const filteredObjects = objects.filter(obj => {
    const matchesSearch = searchQuery === '' ||
      obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (obj.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || obj.type === selectedType;
    const matchesRarity = selectedRarity === 'all' || obj.rarity === selectedRarity;

    return matchesSearch && matchesType && matchesRarity;
  });

  const handleCreateObject = () => {
    const newObject: StoryObject = {
      id: `obj_${Date.now()}`,
      name: '',
      description: '',
      type: 'prop',
      rarity: 'common',
      power: 10,
      lore: '',
      abilityStrings: [],
      requirements: '',
      properties: {
        value: 100,
        weight: 1,
      },
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setEditingObject(newObject);
    setShowCreateForm(true);
  };

  const handleEditObject = (obj: StoryObject) => {
    setEditingObject({ ...obj });
    setShowCreateForm(true);
  };

  const handleSaveObject = async (obj: StoryObject) => {
    if (!project) return;
    const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;

    try {
      const exists = objects.some(o => o.id === obj.id);
      if (exists) {
        await updateObject(projectId, { ...obj, updatedAt: new Date() });
      } else {
        await addObject(projectId, obj);
      }

      setShowCreateForm(false);
      setEditingObject(null);
      notificationService.success('Object saved', `Object "${obj.name}" has been saved.`);
    } catch (error) {
      console.error('Failed to save object:', error);
      notificationService.error('Error', 'Failed to save object');
    }
  };

  const handleDeleteObject = async (id: string) => {
    if (!project) return;
    const projectId = project?.path ? project.path.split(/[/\\]/).pop() || project.id : project.id;

    const obj = objects.find(o => o.id === id);
    if (!obj) return;

    if (confirm(`Are you sure you want to delete "${obj.name}"?`)) {
      try {
        await removeObject(projectId, id);
        notificationService.info('Object deleted', `Object "${obj.name}" has been removed.`);
      } catch (error) {
        console.error('Failed to delete object:', error);
        notificationService.error('Error', 'Failed to delete object');
      }
    }
  };

  const handleAnalyzeObject = async (obj: StoryObject) => {
    setAnalyzingObject(obj);
    try {
      const analysis = await objectsAIService.analyzeObject(obj);
      setObjectAnalysis(analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
      notificationService.error('Analysis Error', 'Failed to analyze object.');
    }
  };

  const getRarityColor = (rarity: ObjectRarity) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-200';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'legendary': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'mythical': return 'bg-red-100 text-red-800 border-red-200';
      case 'unique': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type: ObjectType) => {
    switch (type) {
      case 'weapon': return <ZapIcon className="w-4 h-4" />;
      case 'armor': return <TargetIcon className="w-4 h-4" />;
      case 'artifact': return <SparklesIcon className="w-4 h-4" />;
      case 'consumable': return <ZapIcon className="w-4 h-4" />;
      case 'tool': return <CpuIcon className="w-4 h-4" />;
      case 'treasure': return <CrownIcon className="w-4 h-4" />;
      case 'magical': return <SparklesIcon className="w-4 h-4" />;
      case 'quest': return <BookOpenIcon className="w-4 h-4" />;
      case 'key': return <GemIcon className="w-4 h-4" />;
      default: return <PlusIcon className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 overflow-hidden bg-white">
          <DialogHeader className="p-6 border-b bg-black text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <StarIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-white">Object Management</DialogTitle>
                  <DialogDescription className="text-gray-400">Create and manage magical artifacts and equipment</DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowGenerationForm(true)}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                >
                  <Wand2Icon className="w-4 h-4 mr-2" />
                  AI Generate
                </Button>
                <Button
                  onClick={handleCreateObject}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  <PlusIcon className="w-4 h-4 mr-2" />
                  New Object
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-6 sticky top-0 z-10 bg-gray-50/95 py-2 backdrop-blur-sm">
              <div className="relative flex-1 max-w-sm">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search objects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as any)}
                className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
              >
                <option value="all">All Types</option>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="artifact">Artifact</option>
                <option value="consumable">Consumable</option>
                <option value="tool">Tool</option>
                <option value="treasure">Treasure</option>
                <option value="magical">Magical</option>
                <option value="quest">Quest</option>
                <option value="key">Key</option>
              </select>

              <select
                value={selectedRarity}
                onChange={(e) => setSelectedRarity(e.target.value as any)}
                className="h-10 px-3 rounded-md border border-gray-200 bg-white text-sm"
              >
                <option value="all">All Rarities</option>
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythical">Mythical</option>
                <option value="unique">Unique</option>
              </select>

              <Button variant="ghost" className="h-10 ml-auto" onClick={() => project && fetchProjectObjects(project.id)}>
                <RefreshCwIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Reload
              </Button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredObjects.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400">
                  <StarIcon className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-lg">No objects found</p>
                  <p className="text-sm">Try generating some with AI or create them manually.</p>
                </div>
              ) : (
                filteredObjects.map((obj) => (
                  <div
                    key={obj.id}
                    className="group bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden flex flex-col h-full"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${getRarityColor(obj.rarity)}`}>
                          {getTypeIcon(obj.type)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                            {obj.name}
                          </h3>
                          <Badge variant="outline" className={`text-[10px] mt-1 ${getRarityColor(obj.rarity)}`}>
                            {obj.rarity.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1 italic">
                      {obj.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[10px]">
                          Power {obj.power || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnalyzeObject(obj)}
                          className="h-8 px-2 text-purple-600 hover:text-purple-800"
                        >
                          <LightbulbIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditObject(obj)}
                          className="h-8 px-2 text-gray-600 hover:text-blue-600"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteObject(obj.id)}
                          className="h-8 px-2 text-gray-600 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Form Modal */}
      {showCreateForm && editingObject && (
        <ObjectEditModal
          object={editingObject}
          onSave={handleSaveObject}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingObject(null);
          }}
        />
      )}

      {/* Generation Modal */}
      {showGenerationForm && (
        <ObjectGenerationModal
          onGenerated={handleSaveObject}
          onCancel={() => setShowGenerationForm(false)}
        />
      )}

      {/* Analysis Modal */}
      {analyzingObject && objectAnalysis && (
        <ObjectAnalysisModal
          object={analyzingObject}
          analysis={objectAnalysis}
          onClose={() => {
            setAnalyzingObject(null);
            setObjectAnalysis(null);
          }}
        />
      )}
    </>
  );
}

// === INTERNAL COMPONENTS ===

function ObjectEditModal({ object, onSave, onCancel }: { object: StoryObject, onSave: (obj: StoryObject) => void, onCancel: () => void }) {
  const [edited, setEdited] = useState<StoryObject>({ ...object });
  const [newAbility, setNewAbility] = useState('');

  const handleAddAbility = () => {
    if (newAbility.trim()) {
      setEdited({
        ...edited,
        abilityStrings: [...(edited.abilityStrings || []), newAbility.trim()]
      });
      setNewAbility('');
    }
  };

  const handleUpdateProperty = (key: string, value: any) => {
    setEdited({
      ...edited,
      properties: {
        ...edited.properties,
        [key]: value
      }
    });
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-2xl bg-white p-0">
        <DialogHeader className="p-6 bg-gray-900 text-white">
          <DialogTitle>{object.name ? `Edit: ${object.name}` : 'New Object'}</DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
              <Input value={edited.name} onChange={e => setEdited({ ...edited, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                value={edited.type}
                onChange={e => setEdited({ ...edited, type: e.target.value as any })}
              >
                <option value="prop">Prop</option>
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="artifact">Artifact</option>
                <option value="consumable">Consumable</option>
                <option value="tool">Tool</option>
                <option value="treasure">Treasure</option>
                <option value="magical">Magical</option>
                <option value="quest">Quest</option>
                <option value="key">Key</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
            <Textarea value={edited.description} onChange={e => setEdited({ ...edited, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Rarity</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
                value={edited.rarity}
                onChange={e => setEdited({ ...edited, rarity: e.target.value as any })}
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
                <option value="mythical">Mythical</option>
                <option value="unique">Unique</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Power (1-100)</label>
              <Input type="number" value={edited.power || 0} onChange={e => setEdited({ ...edited, power: parseInt(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Value</label>
              <Input type="number" value={edited.properties.value as number || 0} onChange={e => handleUpdateProperty('value', parseInt(e.target.value))} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">Weight</label>
              <Input type="number" step="0.1" value={edited.properties.weight as number || 0} onChange={e => handleUpdateProperty('weight', parseFloat(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Lore / Legend</label>
            <Textarea value={edited.lore || ''} onChange={e => setEdited({ ...edited, lore: e.target.value })} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Abilities</label>
            <div className="flex gap-2">
              <Input value={newAbility} onChange={e => setNewAbility(e.target.value)} placeholder="New ability..." onKeyDown={e => e.key === 'Enter' && handleAddAbility()} />
              <Button onClick={handleAddAbility}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {(edited.abilityStrings || []).map((ability, i) => (
                <Badge key={i} className="flex gap-1 items-center">
                  {ability}
                  <XIcon className="w-3 h-3 cursor-pointer" onClick={() => setEdited({ ...edited, abilityStrings: (edited.abilityStrings || []).filter((_, idx) => idx !== i) })} />
                </Badge>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-3 bg-gray-50">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(edited)} className="bg-black text-white">Save Object</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ObjectGenerationModal({ onGenerated, onCancel }: { onGenerated: (obj: StoryObject) => void, onCancel: () => void }) {
  const [options, setOptions] = useState<ObjectGenerationOptions>({
    theme: '',
    powerLevel: 50,
    objectType: 'weapon',
    rarity: 'common'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!options.theme.trim()) {
      notificationService.warning('Required', 'Please enter a theme for generation.');
      return;
    }
    setIsGenerating(true);
    try {
      const result = await objectsAIService.generateObject(options);
      onGenerated(result);
      onCancel();
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2Icon className="w-5 h-5 text-purple-600" />
            AI Object Generator
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Theme or concept</label>
            <Input
              placeholder="Ex: Fallen star, Deep sea, Dragon's fire..."
              value={options.theme}
              onChange={e => setOptions({ ...options, theme: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Object Type</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-gray-200"
                value={options.objectType}
                onChange={e => setOptions({ ...options, objectType: e.target.value as any })}
              >
                <option value="weapon">Weapon</option>
                <option value="armor">Armor</option>
                <option value="artifact">Artifact</option>
                <option value="consumable">Consumable</option>
                <option value="treasure">Treasure</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Rarity</label>
              <select
                className="w-full h-10 px-3 rounded-md border border-gray-200"
                value={options.rarity}
                onChange={e => setOptions({ ...options, rarity: e.target.value as any })}
              >
                <option value="common">Common</option>
                <option value="uncommon">Uncommon</option>
                <option value="rare">Rare</option>
                <option value="epic">Epic</option>
                <option value="legendary">Legendary</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={isGenerating}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            className="bg-purple-600 text-white"
            disabled={isGenerating}
          >
            {isGenerating ? <RefreshCwIcon className="w-4 h-4 mr-2 animate-spin" /> : <SparklesIcon className="w-4 h-4 mr-2" />}
            Generate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ObjectAnalysisModal({ object, analysis, onClose }: { object: StoryObject, analysis: ObjectAnalysis, onClose: () => void }) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden">
        <DialogHeader className="p-6 bg-purple-900 text-white">
          <DialogTitle className="flex items-center gap-2">
            <LightbulbIcon className="w-5 h-5" />
            Narrative Analysis: {object.name}
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Narrative Role</h3>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                  {analysis.narrativeRole.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Thematic Connections</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.thematicConnections.map(tag => (
                    <Badge key={tag} variant="outline">{tag}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Conflict Potential</h3>
                <Badge variant={analysis.conflictPotential === 'high' ? 'destructive' : 'secondary' as any}>
                  {analysis.conflictPotential.toUpperCase()}
                </Badge>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Plot Hooks</h3>
                <ul className="text-sm space-y-1 text-gray-600">
                  {analysis.plotHooks.map((hook, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <ZapIcon className="w-3 h-3 text-purple-500 mt-1 shrink-0" />
                      {hook}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {analysis.locationConnections.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Connections to Locations</h3>
              <div className="grid grid-cols-2 gap-3">
                {analysis.locationConnections.map((conn, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="font-bold flex items-center gap-1 mb-1">
                      <MapPinIcon className="w-3 h-3" />
                      at {conn.locationId}
                    </div>
                    <div className="text-gray-600 italic mb-1">{conn.connection}</div>
                    <p className="text-gray-700">{conn.significance}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="p-6 border-t flex justify-end bg-gray-50">
          <Button onClick={onClose}>Close Analysis</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
