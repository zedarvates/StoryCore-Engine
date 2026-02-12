/**
 * WorldModal - Modale de gestion du monde
 *
 * Permet de voir, créer, modifier et supprimer les éléments du monde du projet
 */

import React, { useState, useEffect } from 'react';
import './SharedModalStyles.css';
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
  GlobeIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  SearchIcon,
  StarIcon,
  MapPinIcon,
  MountainIcon,
  CastleIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { notificationService } from '@/services/NotificationService';

interface WorldElement {
  id: string;
  name: string;
  description: string;
  type: 'location' | 'landmark' | 'region' | 'realm' | 'dimension';
  geography: string;
  culture: string;
  history: string;
  significance: string;
  importance: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface WorldModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WorldModal({ isOpen, onClose }: WorldModalProps) {
  const project = useAppStore((state) => state.project);

  // État local pour les éléments du monde
  const [worldElements, setWorldElements] = useState<WorldElement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<WorldElement['type'] | 'all'>('all');
  const [selectedImportance, setSelectedImportance] = useState<WorldElement['importance'] | 'all'>('all');
  const [editingElement, setEditingElement] = useState<WorldElement | null>(null);

  // Charger les éléments du monde du projet
  useEffect(() => {
    if (project && isOpen) {
      loadWorldElements();
    }
  }, [project, isOpen]);

  const loadWorldElements = () => {
    if (!project) return;

    try {
      // Dans un vrai système, cela viendrait du projet ou d'une API
      // Pour l'instant, on simule avec des données locales
      const projectWorldElements = localStorage.getItem(`world_elements_${project.id}`);
      if (projectWorldElements) {
        const parsed = JSON.parse(projectWorldElements);
        const elementsWithDates = parsed.map((element: unknown) => ({
          ...element,
          createdAt: new Date(element.createdAt),
          updatedAt: new Date(element.updatedAt)
        }));
        setWorldElements(elementsWithDates);
      } else {
        // Éléments du monde par défaut pour la démonstration
        const defaultElements: WorldElement[] = [
          {
            id: 'world_1',
            name: 'Royaume d\'Eldoria',
            description: 'Un royaume majestueux avec des châteaux imposants et des forêts enchantées.',
            type: 'realm',
            geography: 'Vallées verdoyantes, montagnes escarpées, rivières cristallines',
            culture: 'Chevalerie, magie ancienne, festivals des saisons',
            history: 'Fondé il y a 500 ans par le Roi Arthur après la Grande Guerre',
            significance: 'Centre politique et culturel du continent',
            importance: 'high',
            tags: ['royaume', 'magie', 'chevalerie', 'politique'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'world_2',
            name: 'Forêt de Cristal',
            description: 'Une forêt mystique où les arbres scintillent comme des diamants.',
            type: 'location',
            geography: 'Forêt dense avec des arbres de cristal, ruisseaux magiques',
            culture: 'Esprits de la nature, druides protecteurs',
            history: 'Créée par les anciens elfes pour protéger les secrets de la magie',
            significance: 'Source de magie pure et lieu de pèlerinage',
            importance: 'medium',
            tags: ['magie', 'nature', 'elfes', 'mystère'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'world_3',
            name: 'Montagnes de Feu',
            description: 'Des montagnes volcaniques où le feu et la lave règnent en maîtres.',
            type: 'region',
            geography: 'Chaîne de volcans actifs, rivières de lave, terres stériles',
            culture: 'Forgeurs de métal, gardiens du feu, rituels volcaniques',
            history: 'Formées lors de la chute des anciens dieux du feu',
            significance: 'Source de métaux précieux et lieu de pouvoir élémentaire',
            importance: 'medium',
            tags: ['volcan', 'feu', 'métal', 'danger'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setWorldElements(defaultElements);
        saveWorldElements(defaultElements);
      }
    } catch (error) {
      console.error('Failed to load world elements:', error);
      notificationService.error('Erreur', 'Impossible de charger les éléments du monde');
    }
  };

  const saveWorldElements = (elements: WorldElement[]) => {
    if (!project) return;

    try {
      localStorage.setItem(`world_elements_${project.id}`, JSON.stringify(elements));
    } catch (error) {
      console.error('Failed to save world elements:', error);
      notificationService.error('Erreur', 'Impossible de sauvegarder les éléments du monde');
    }
  };

  const filteredElements = worldElements.filter(element => {
    const matchesSearch = searchQuery === '' ||
      element.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      element.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || element.type === selectedType;
    const matchesImportance = selectedImportance === 'all' || element.importance === selectedImportance;

    return matchesSearch && matchesType && matchesImportance;
  });

  const handleCreateElement = () => {
    const newElement: WorldElement = {
      id: `world_${Date.now()}`,
      name: '',
      description: '',
      type: 'location',
      geography: '',
      culture: '',
      history: '',
      significance: '',
      importance: 'low',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setEditingElement(newElement);
  };

const handleEditElement = (element: WorldElement) => {
    setEditingElement({ ...element });
  };

  const handleSaveElement = (element: WorldElement) => {
    if (!element.name.trim()) {
      notificationService.warning('Erreur', 'Le nom de l\'élément est requis');
      return;
    }

    const updatedElements = editingElement?.id
      ? worldElements.map(e => e.id === element.id ? { ...element, updatedAt: new Date() } : e)
      : [...worldElements, element];

    setWorldElements(updatedElements);
    saveWorldElements(updatedElements);
    setEditingElement(null);

    notificationService.success(
      'Élément sauvegardé',
      `L'élément "${element.name}" a été ${editingElement?.id ? 'modifié' : 'créé'} avec succès.`
    );
  };

  const handleDeleteElement = (elementId: string) => {
    const element = worldElements.find(e => e.id === elementId);
    if (!element) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer l'élément "${element.name}" ?`)) {
      const updatedElements = worldElements.filter(e => e.id !== elementId);
      setWorldElements(updatedElements);
      saveWorldElements(updatedElements);

      notificationService.info('Élément supprimé', `L'élément "${element.name}" a été supprimé.`);
    }
  };

  const getTypeIcon = (type: WorldElement['type']) => {
    switch (type) {
      case 'realm':
        return <CastleIcon className="w-4 h-4 text-purple-500" />;
      case 'region':
        return <MountainIcon className="w-4 h-4 text-green-500" />;
      case 'location':
        return <MapPinIcon className="w-4 h-4 text-blue-500" />;
      case 'landmark':
        return <StarIcon className="w-4 h-4 text-yellow-500" />;
      case 'dimension':
        return <GlobeIcon className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: WorldElement['type']) => {
    switch (type) {
      case 'realm':
        return 'Royaume';
      case 'region':
        return 'Région';
      case 'location':
        return 'Lieu';
      case 'landmark':
        return 'Point de repère';
      case 'dimension':
        return 'Dimension';
    }
  };

  const getImportanceColor = (importance: WorldElement['importance']) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Éléments du monde</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center no-project-state">
            <GlobeIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="title">Aucun projet ouvert</p>
            <p className="text-sm subtitle">Ouvrez un projet pour gérer les éléments du monde</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="shared-modal-dialog max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <GlobeIcon className="w-5 h-5" />
              Monde - {project.project_name}
            </DialogTitle>
          </DialogHeader>

          {/* Toolbar */}
          <div className="flex-shrink-0 p-4 toolbar border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Search and filters */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--modal-text-muted)' }} />
                  <Input
                    placeholder="Rechercher des éléments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    aria-label="Rechercher des éléments du monde"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as WorldElement['type'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Filtrer par type"
                  title="Filtrer les éléments par type"
                >
                  <option value="all">Tous les types</option>
                  <option value="realm">Royaumes</option>
                  <option value="region">Régions</option>
                  <option value="location">Lieux</option>
                  <option value="landmark">Points de repère</option>
                  <option value="dimension">Dimensions</option>
                </select>

                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value as WorldElement['importance'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  aria-label="Filtrer par importance"
                  title="Filtrer les éléments par importance"
                >
                  <option value="all">Toute importance</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleCreateElement} className="flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Nouvel élément
                </Button>
              </div>
            </div>
          </div>

          {/* World Elements List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredElements.length === 0 ? (
                <div className="col-span-full text-center py-12 empty-state">
                  <GlobeIcon className="w-12 h-12 mx-auto mb-4 empty-state-icon" />
                  <h3 className="text-lg font-medium empty-state-title mb-2">
                    Aucun élément trouvé
                  </h3>
                  <p className="empty-state-text mb-4">
                    {searchQuery || selectedType !== 'all' || selectedImportance !== 'all'
                      ? 'Essayez de modifier vos critères de recherche.'
                      : 'Créez votre premier élément de monde pour commencer.'}
                  </p>
                  {!searchQuery && selectedType === 'all' && selectedImportance === 'all' && (
                    <Button onClick={handleCreateElement} className="flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" />
                      Créer un élément
                    </Button>
                  )}
                </div>
              ) : (
                filteredElements.map(element => (
                  <div
                    key={element.id}
                    className="element-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(element.type)}
                        <h3 className="text-lg font-semibold element-title">
                          {element.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getImportanceColor(element.importance)}>
                          {element.importance === 'high' ? 'Élevé' :
                           element.importance === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm meta-label">Type:</span>
                      <Badge variant="outline">
                        {getTypeLabel(element.type)}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm element-description mb-3 line-clamp-3">
                      {element.description}
                    </p>

                    {/* Tags */}
                    {element.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {element.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {element.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{element.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs element-meta">
                        Modifié {element.updatedAt.toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditElement(element)}
                          className="text-blue-600 hover:text-blue-800"
                          aria-label={`Modifier ${element.name}`}
                          title={`Modifier ${element.name}`}
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteElement(element.id)}
                          className="text-red-600 hover:text-red-800"
                          aria-label={`Supprimer ${element.name}`}
                          title={`Supprimer ${element.name}`}
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
      {editingElement && (
        <WorldElementEditModal
          element={editingElement}
          isCreate={!worldElements.some(e => e.id === editingElement.id)}
          onSave={handleSaveElement}
          onCancel={() => setEditingElement(null)}
        />
      )}
    </>
  );
}

/**
 * WorldElementEditModal - Modale d'édition d'élément du monde
 */
interface WorldElementEditModalProps {
  element: WorldElement;
  isCreate: boolean;
  onSave: (element: WorldElement) => void;
  onCancel: () => void;
}

function WorldElementEditModal({ element, isCreate, onSave, onCancel }: WorldElementEditModalProps) {
  const [editedElement, setEditedElement] = useState<WorldElement>(element);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    onSave(editedElement);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedElement.tags.includes(newTag.trim())) {
      setEditedElement(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedElement(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isCreate ? 'Créer un élément du monde' : 'Modifier l\'élément du monde'}
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
                  value={editedElement.name}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de l'élément"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--modal-text-secondary)' }}>
                  Type
                </label>
                <select
                  value={editedElement.type}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, type: e.target.value as WorldElement['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-label="Sélectionner le type d'élément"
                >
                  <option value="realm">Royaume</option>
                  <option value="region">Région</option>
                  <option value="location">Lieu</option>
                  <option value="landmark">Point de repère</option>
                  <option value="dimension">Dimension</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={editedElement.description}
                onChange={(e) => setEditedElement(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Courte description de l'élément"
                rows={3}
              />
            </div>

            {/* Detailed Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Géographie
                </label>
                <Textarea
                  value={editedElement.geography}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, geography: e.target.value }))}
                  placeholder="Description géographique"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Culture
                </label>
                <Textarea
                  value={editedElement.culture}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, culture: e.target.value }))}
                  placeholder="Éléments culturels"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Histoire
                </label>
                <Textarea
                  value={editedElement.history}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, history: e.target.value }))}
                  placeholder="Histoire et origines"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--modal-text-secondary)' }}>
                  Importance
                </label>
                <select
                  value={editedElement.importance}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, importance: e.target.value as WorldElement['importance'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  aria-label="Sélectionner le niveau d'importance"
                >
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signification
                </label>
                <Textarea
                  value={editedElement.significance}
                  onChange={(e) => setEditedElement(prev => ({ ...prev, significance: e.target.value }))}
                  placeholder="Importance narrative et rôle dans l'histoire"
                  rows={2}
                />
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
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                />
                <Button onClick={handleAddTag} variant="outline" aria-label="Ajouter un tag" title="Ajouter un tag">
                  <PlusIcon className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editedElement.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                      aria-label={`Retirer le tag ${tag}`}
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

