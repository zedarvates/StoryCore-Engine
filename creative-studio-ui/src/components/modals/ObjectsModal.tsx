/**
 * ObjectsModal - Modale de gestion des objets avec IA
 *
 * Permet de créer, modifier et analyser des objets fantastiques
 * avec génération automatique et analyse narrative IA
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { objectsAIService, type GameObject, type ObjectAnalysis, type ObjectGenerationOptions } from '@/services/ObjectsAIService';
import { notificationService } from '@/services/NotificationService';

interface ObjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ObjectsModal({ isOpen, onClose }: ObjectsModalProps) {
  const project = useAppStore((state) => state.project);

  // État local pour les objets
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<GameObject['type'] | 'all'>('all');
  const [selectedRarity, setSelectedRarity] = useState<GameObject['rarity'] | 'all'>('all');
  const [editingObject, setEditingObject] = useState<GameObject | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showGenerationForm, setShowGenerationForm] = useState(false);
  const [analyzingObject, setAnalyzingObject] = useState<GameObject | null>(null);
  const [objectAnalysis, setObjectAnalysis] = useState<ObjectAnalysis | null>(null);

  // Charger les objets du projet
  useEffect(() => {
    if (project && isOpen) {
      loadObjects();
    }
  }, [project, isOpen]);

  const loadObjects = () => {
    if (!project) return;

    try {
      const projectObjects = localStorage.getItem(`objects_${project.id}`);
      if (projectObjects) {
        const parsed = JSON.parse(projectObjects);
        const objectsWithDates = parsed.map((obj: any) => ({
          ...obj,
          createdAt: new Date(obj.createdAt),
          updatedAt: new Date(obj.updatedAt)
        }));
        setObjects(objectsWithDates);
      } else {
        // Quelques objets par défaut pour la démonstration
        const defaultObjects: GameObject[] = [
          {
            id: 'obj_1',
            name: 'Épée de Lumière',
            description: 'Une épée ancienne forgée dans un métal céleste, rayonnant d\'une lumière pure.',
            type: 'weapon',
            rarity: 'legendary',
            power: 95,
            lore: 'Forgée par les anciens gardiens des étoiles, cette épée fut perdue lors de la Grande Guerre Céleste.',
            abilities: ['Purification des ténèbres', 'Bouclier de lumière', 'Jugement divin'],
            requirements: 'Cœur pur et alignement lumineux',
            value: 50000,
            weight: 3.5,
            tags: ['magie', 'lumière', 'légendaire', 'arme'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'obj_2',
            name: 'Amulette des Anciens',
            description: 'Un pendentif en cristal ancien pulsant d\'une énergie mystique.',
            type: 'artifact',
            rarity: 'epic',
            power: 75,
            lore: 'Créée par les premiers mages elfiques, elle contient la sagesse des anciens.',
            abilities: ['Vision des anciens', 'Protection spirituelle', 'Sagesse accrue'],
            requirements: 'Sang elfique ou connexion spirituelle',
            value: 25000,
            weight: 0.2,
            tags: ['magie', 'elfes', 'sagesse', 'artefact'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setObjects(defaultObjects);
        saveObjects(defaultObjects);
      }
    } catch (error) {
      console.error('Failed to load objects:', error);
      notificationService.error('Erreur', 'Impossible de charger les objets');
    }
  };

  const saveObjects = (objs: GameObject[]) => {
    if (!project) return;

    try {
      localStorage.setItem(`objects_${project.id}`, JSON.stringify(objs));
    } catch (error) {
      console.error('Failed to save objects:', error);
      notificationService.error('Erreur', 'Impossible de sauvegarder les objets');
    }
  };

  const filteredObjects = objects.filter(obj => {
    const matchesSearch = searchQuery === '' ||
      obj.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || obj.type === selectedType;
    const matchesRarity = selectedRarity === 'all' || obj.rarity === selectedRarity;

    return matchesSearch && matchesType && matchesRarity;
  });

  const handleCreateObject = () => {
    const newObject: GameObject = {
      id: `obj_${Date.now()}`,
      name: '',
      description: '',
      type: 'artifact',
      rarity: 'common',
      power: 10,
      lore: '',
      abilities: [],
      requirements: '',
      value: 100,
      weight: 1,
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setEditingObject(newObject);
    setShowCreateForm(true);
  };

  const handleGenerateObject = () => {
    setShowGenerationForm(true);
  };

  const handleSaveObject = (object: GameObject) => {
    if (!object.name.trim()) {
      notificationService.warning('Erreur', 'Le nom de l\'objet est requis');
      return;
    }

    const updatedObjects = editingObject?.id
      ? objects.map(o => o.id === object.id ? { ...object, updatedAt: new Date() } : o)
      : [...objects, object];

    setObjects(updatedObjects);
    saveObjects(updatedObjects);
    setEditingObject(null);
    setShowCreateForm(false);
  };

  const handleDeleteObject = (objectId: string) => {
    const object = objects.find(o => o.id === objectId);
    if (!object) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'objet "${object.name}" ?`)) {
      const updatedObjects = objects.filter(o => o.id !== objectId);
      setObjects(updatedObjects);
      saveObjects(updatedObjects);

      notificationService.info('Objet supprimé', `L'objet "${object.name}" a été supprimé.`);
    }
  };

  const handleAnalyzeObject = async (object: GameObject) => {
    setAnalyzingObject(object);
    try {
      const analysis = await objectsAIService.analyzeObject(object);
      setObjectAnalysis(analysis);
    } catch (error) {
      notificationService.error('Erreur d\'analyse', 'Impossible d\'analyser l\'objet');
    }
  };

  const getTypeIcon = (type: GameObject['type']) => {
    switch (type) {
      case 'weapon':
        return <TargetIcon className="w-4 h-4 text-red-500" />;
      case 'armor':
        return <ZapIcon className="w-4 h-4 text-blue-500" />;
      case 'artifact':
        return <GemIcon className="w-4 h-4 text-purple-500" />;
      case 'consumable':
        return <LightbulbIcon className="w-4 h-4 text-green-500" />;
      case 'tool':
        return <Wand2Icon className="w-4 h-4 text-orange-500" />;
      case 'treasure':
        return <CrownIcon className="w-4 h-4 text-yellow-500" />;
      case 'magical':
        return <SparklesIcon className="w-4 h-4 text-indigo-500" />;
      case 'quest':
        return <StarIcon className="w-4 h-4 text-pink-500" />;
      case 'key':
        return <CpuIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: GameObject['type']) => {
    switch (type) {
      case 'weapon':
        return 'Arme';
      case 'armor':
        return 'Armure';
      case 'artifact':
        return 'Artefact';
      case 'consumable':
        return 'Consommable';
      case 'tool':
        return 'Outil';
      case 'treasure':
        return 'Trésor';
      case 'magical':
        return 'Magique';
      case 'quest':
        return 'Quête';
      case 'key':
        return 'Clé';
    }
  };

  const getRarityColor = (rarity: GameObject['rarity']) => {
    switch (rarity) {
      case 'common':
        return 'bg-gray-100 text-gray-800';
      case 'uncommon':
        return 'bg-green-100 text-green-800';
      case 'rare':
        return 'bg-blue-100 text-blue-800';
      case 'epic':
        return 'bg-purple-100 text-purple-800';
      case 'legendary':
        return 'bg-orange-100 text-orange-800';
      case 'mythical':
        return 'bg-red-100 text-red-800';
    }
  };

  const getPowerColor = (power: number) => {
    if (power >= 90) return 'text-red-500';
    if (power >= 70) return 'text-orange-500';
    if (power >= 50) return 'text-yellow-500';
    if (power >= 30) return 'text-blue-500';
    return 'text-gray-500';
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Objets du projet</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun projet ouvert</p>
            <p className="text-sm">Ouvrez un projet pour gérer ses objets</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5" />
              Objets - {project.project_name}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Search and filters */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher des objets..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as GameObject['type'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="weapon">Armes</option>
                  <option value="armor">Armures</option>
                  <option value="artifact">Artefacts</option>
                  <option value="consumable">Consommables</option>
                  <option value="tool">Outils</option>
                  <option value="treasure">Trésors</option>
                  <option value="magical">Magiques</option>
                  <option value="quest">Quêtes</option>
                  <option value="key">Clés</option>
                </select>

                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value as GameObject['rarity'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Toute rareté</option>
                  <option value="common">Commun</option>
                  <option value="uncommon">Peu commun</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Épique</option>
                  <option value="legendary">Légendaire</option>
                  <option value="mythical">Mythique</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleGenerateObject} className="flex items-center gap-2" variant="outline">
                  <SparklesIcon className="w-4 h-4" />
                  Générer IA
                </Button>
                <Button onClick={handleCreateObject} className="flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Nouvel objet
                </Button>
              </div>
            </div>
          </div>

          {/* Objects List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredObjects.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <BookOpenIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun objet trouvé
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedType !== 'all' || selectedRarity !== 'all'
                      ? 'Essayez de modifier vos critères de recherche.'
                      : 'Créez votre premier objet pour commencer.'}
                  </p>
                  {!searchQuery && selectedType === 'all' && selectedRarity === 'all' && (
                    <div className="flex gap-2 justify-center">
                      <Button onClick={handleGenerateObject} className="flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" />
                        Générer avec IA
                      </Button>
                      <Button onClick={handleCreateObject} className="flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" />
                        Créer manuellement
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                filteredObjects.map(object => (
                  <div
                    key={object.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(object.type)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {object.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getRarityColor(object.rarity)}>
                          {object.rarity === 'common' ? 'Commun' :
                           object.rarity === 'uncommon' ? 'Peu commun' :
                           object.rarity === 'rare' ? 'Rare' :
                           object.rarity === 'epic' ? 'Épique' :
                           object.rarity === 'legendary' ? 'Légendaire' : 'Mythique'}
                        </Badge>
                      </div>
                    </div>

                    {/* Type and Power */}
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="outline">
                        {getTypeLabel(object.type)}
                      </Badge>
                      <div className={`text-sm font-medium ${getPowerColor(object.power)}`}>
                        Puissance: {object.power}/100
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                      {object.description}
                    </p>

                    {/* Abilities preview */}
                    {object.abilities.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 mb-1">Capacités:</div>
                        <div className="flex flex-wrap gap-1">
                          {object.abilities.slice(0, 2).map((ability, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {ability}
                            </Badge>
                          ))}
                          {object.abilities.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{object.abilities.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {object.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {object.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {object.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{object.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Valeur: {object.value} pièces | Poids: {object.weight}kg
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAnalyzeObject(object)}
                          className="text-purple-600 hover:text-purple-800"
                          title="Analyser avec IA"
                        >
                          <SparklesIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditObject(object)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteObject(object.id)}
                          className="text-red-600 hover:text-red-800"
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

      {/* Edit/Create Modal */}
      {editingObject && (
        <ObjectEditModal
          object={editingObject}
          isCreate={!objects.some(o => o.id === editingObject.id)}
          onSave={handleSaveObject}
          onCancel={() => setEditingObject(null)}
        />
      )}

      {/* Generation Modal */}
      {showGenerationForm && (
        <ObjectGenerationModal
          onGenerate={async (options) => {
            const generatedObject = await objectsAIService.generateObject(options);
            setObjects(prev => [...prev, generatedObject]);
            saveObjects([...objects, generatedObject]);
            setShowGenerationForm(false);
          }}
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

/**
 * ObjectEditModal - Modale d'édition d'objet
 */
interface ObjectEditModalProps {
  object: GameObject;
  isCreate: boolean;
  onSave: (object: GameObject) => void;
  onCancel: () => void;
}

function ObjectEditModal({ object, isCreate, onSave, onCancel }: ObjectEditModalProps) {
  const [editedObject, setEditedObject] = useState<GameObject>(object);
  const [newTag, setNewTag] = useState('');
  const [newAbility, setNewAbility] = useState('');

  const handleSave = () => {
    onSave(editedObject);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedObject.tags.includes(newTag.trim())) {
      setEditedObject(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedObject(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleAddAbility = () => {
    if (newAbility.trim() && !editedObject.abilities.includes(newAbility.trim())) {
      setEditedObject(prev => ({
        ...prev,
        abilities: [...prev.abilities, newAbility.trim()]
      }));
      setNewAbility('');
    }
  };

  const handleRemoveAbility = (abilityToRemove: string) => {
    setEditedObject(prev => ({
      ...prev,
      abilities: prev.abilities.filter(ability => ability !== abilityToRemove)
    }));
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isCreate ? 'Créer un objet' : 'Modifier l\'objet'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom *
                </label>
                <Input
                  value={editedObject.name}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de l'objet"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={editedObject.type}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, type: e.target.value as GameObject['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="weapon">Arme</option>
                  <option value="armor">Armure</option>
                  <option value="artifact">Artefact</option>
                  <option value="consumable">Consommable</option>
                  <option value="tool">Outil</option>
                  <option value="treasure">Trésor</option>
                  <option value="magical">Magique</option>
                  <option value="quest">Quête</option>
                  <option value="key">Clé</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={editedObject.description}
                onChange={(e) => setEditedObject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description détaillée de l'objet"
                rows={3}
              />
            </div>

            {/* Stats and Rarity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rareté
                </label>
                <select
                  value={editedObject.rarity}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, rarity: e.target.value as GameObject['rarity'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="common">Commun</option>
                  <option value="uncommon">Peu commun</option>
                  <option value="rare">Rare</option>
                  <option value="epic">Épique</option>
                  <option value="legendary">Légendaire</option>
                  <option value="mythical">Mythique</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Puissance (1-100)
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={editedObject.power}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, power: parseInt(e.target.value) || 1 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valeur (pièces)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={editedObject.value}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, value: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>

            {/* Weight and Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Poids (kg)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={editedObject.weight}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, weight: parseFloat(e.target.value) || 0 }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions d'utilisation
                </label>
                <Input
                  value={editedObject.requirements}
                  onChange={(e) => setEditedObject(prev => ({ ...prev, requirements: e.target.value }))}
                  placeholder="Ex: Force 15+, Alignement bon"
                />
              </div>
            </div>

            {/* Lore */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Histoire/Légende
              </label>
              <Textarea
                value={editedObject.lore}
                onChange={(e) => setEditedObject(prev => ({ ...prev, lore: e.target.value }))}
                placeholder="Histoire et légende de l'objet"
                rows={4}
              />
            </div>

            {/* Abilities */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Capacités spéciales
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newAbility}
                  onChange={(e) => setNewAbility(e.target.value)}
                  placeholder="Nouvelle capacité"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddAbility()}
                />
                <Button onClick={handleAddAbility} variant="outline">
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedObject.abilities.map(ability => (
                  <Badge key={ability} variant="secondary" className="flex items-center gap-1">
                    {ability}
                    <button
                      onClick={() => handleRemoveAbility(ability)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Ajouter un tag"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} variant="outline">
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedObject.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <SaveIcon className="w-4 h-4" />
            Sauvegarder
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ObjectGenerationModal - Modale de génération IA
 */
interface ObjectGenerationModalProps {
  onGenerate: (options: ObjectGenerationOptions) => Promise<void>;
  onCancel: () => void;
}

function ObjectGenerationModal({ onGenerate, onCancel }: ObjectGenerationModalProps) {
  const [options, setOptions] = useState<ObjectGenerationOptions>({
    theme: '',
    powerLevel: 50,
    objectType: 'artifact',
    rarity: 'rare'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!options.theme.trim()) {
      notificationService.warning('Thème requis', 'Veuillez spécifier un thème pour l\'objet');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerate(options);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            Générer un objet avec IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thème *
            </label>
            <Input
              value={options.theme}
              onChange={(e) => setOptions(prev => ({ ...prev, theme: e.target.value }))}
              placeholder="Ex: magie ancienne, guerre céleste, trésor perdu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type d'objet
            </label>
            <select
              value={options.objectType}
              onChange={(e) => setOptions(prev => ({ ...prev, objectType: e.target.value as GameObject['type'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="weapon">Arme</option>
              <option value="armor">Armure</option>
              <option value="artifact">Artefact</option>
              <option value="consumable">Consommable</option>
              <option value="tool">Outil</option>
              <option value="treasure">Trésor</option>
              <option value="magical">Magique</option>
              <option value="quest">Quête</option>
              <option value="key">Clé</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rareté
            </label>
            <select
              value={options.rarity}
              onChange={(e) => setOptions(prev => ({ ...prev, rarity: e.target.value as GameObject['rarity'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="common">Commun</option>
              <option value="uncommon">Peu commun</option>
              <option value="rare">Rare</option>
              <option value="epic">Épique</option>
              <option value="legendary">Légendaire</option>
              <option value="mythical">Mythique</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Niveau de puissance (1-100)
            </label>
            <Input
              type="number"
              min="1"
              max="100"
              value={options.powerLevel}
              onChange={(e) => setOptions(prev => ({ ...prev, powerLevel: parseInt(e.target.value) || 50 }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isGenerating}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="flex items-center gap-2">
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Génération...
              </>
            ) : (
              <>
                <SparklesIcon className="w-4 h-4" />
                Générer
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * ObjectAnalysisModal - Modale d'analyse IA
 */
interface ObjectAnalysisModalProps {
  object: GameObject;
  analysis: ObjectAnalysis;
  onClose: () => void;
}

function ObjectAnalysisModal({ object, analysis, onClose }: ObjectAnalysisModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="w-5 h-5" />
            Analyse IA - {object.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Rôle narratif */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rôle narratif</h3>
              <Badge variant="outline" className="text-sm">
                {analysis.narrativeRole === 'plot_device' ? 'Élément d\'intrigue' :
                 analysis.narrativeRole === 'character_development' ? 'Développement de personnage' :
                 analysis.narrativeRole === 'world_building' ? 'Construction du monde' :
                 analysis.narrativeRole === 'macguffin' ? 'MacGuffin' :
                 analysis.narrativeRole === 'red_herring' ? 'Fausse piste' :
                 'Arme de Chekhov'}
              </Badge>
            </div>

            {/* Connexions thématiques */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connexions thématiques</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.thematicConnections.map(theme => (
                  <Badge key={theme} variant="secondary">{theme}</Badge>
                ))}
              </div>
            </div>

            {/* Relations avec personnages */}
            {analysis.characterRelationships.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Relations avec personnages</h3>
                <div className="space-y-2">
                  {analysis.characterRelationships.map((rel, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{rel.relationship}</Badge>
                        <span className="text-sm text-gray-600">avec {rel.characterId}</span>
                      </div>
                      <p className="text-sm text-gray-700">{rel.significance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Connexions avec lieux */}
            {analysis.locationConnections.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Connexions avec lieux</h3>
                <div className="space-y-2">
                  {analysis.locationConnections.map((conn, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{conn.connection}</Badge>
                        <span className="text-sm text-gray-600">à {conn.locationId}</span>
                      </div>
                      <p className="text-sm text-gray-700">{conn.significance}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Plot hooks */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Accroches pour l'intrigue</h3>
              <div className="space-y-2">
                {analysis.plotHooks.map((hook, index) => (
                  <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">{hook}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Potentiel de conflit */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Potentiel de conflit</h3>
              <Badge
                className={
                  analysis.conflictPotential === 'high' ? 'bg-red-100 text-red-800' :
                  analysis.conflictPotential === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }
              >
                {analysis.conflictPotential === 'high' ? 'Élevé' :
                 analysis.conflictPotential === 'medium' ? 'Moyen' : 'Faible'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-end p-6 border-t border-gray-200">
          <Button onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
