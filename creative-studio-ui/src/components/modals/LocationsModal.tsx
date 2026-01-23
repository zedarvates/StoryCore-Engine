/**
 * LocationsModal - Modale de gestion des lieux
 *
 * Permet de voir, créer, modifier et supprimer les lieux du projet
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
  FileTextIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  SaveIcon,
  XIcon,
  SearchIcon,
  MapPinIcon,
  HomeIcon,
  BuildingIcon,
  TreePineIcon,
  MountainIcon,
  WavesIcon,
  CastleIcon,
  StoreIcon,
  ChurchIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { notificationService } from '@/services/NotificationService';

interface Location {
  id: string;
  name: string;
  description: string;
  type: 'residence' | 'commercial' | 'public' | 'natural' | 'religious' | 'military' | 'underground' | 'other';
  address: string;
  coordinates: string;
  owner: string;
  purpose: string;
  atmosphere: string;
  secrets: string;
  importance: 'high' | 'medium' | 'low';
  accessibility: 'public' | 'private' | 'restricted';
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface LocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LocationsModal({ isOpen, onClose }: LocationsModalProps) {
  const project = useAppStore((state) => state.project);

  // État local pour les lieux
  const [locations, setLocations] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<Location['type'] | 'all'>('all');
  const [selectedImportance, setSelectedImportance] = useState<Location['importance'] | 'all'>('all');
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Charger les lieux du projet
  useEffect(() => {
    if (project && isOpen) {
      loadLocations();
    }
  }, [project, isOpen]);

  const loadLocations = () => {
    if (!project) return;

    try {
      // Dans un vrai système, cela viendrait du projet ou d'une API
      // Pour l'instant, on simule avec des données locales
      const projectLocations = localStorage.getItem(`locations_${project.id}`);
      if (projectLocations) {
        const parsed = JSON.parse(projectLocations);
        const locationsWithDates = parsed.map((location: any) => ({
          ...location,
          createdAt: new Date(location.createdAt),
          updatedAt: new Date(location.updatedAt)
        }));
        setLocations(locationsWithDates);
      } else {
        // Lieux par défaut pour la démonstration
        const defaultLocations: Location[] = [
          {
            id: 'loc_1',
            name: 'Château d\'Eldoria',
            description: 'Le majestueux château royal, siège du pouvoir politique du royaume.',
            type: 'military',
            address: 'Colline centrale d\'Eldoria',
            coordinates: '45.123, 2.456',
            owner: 'Roi Arthur',
            purpose: 'Siège du gouvernement, résidence royale, centre administratif',
            atmosphere: 'Majestueuse et intimidante, avec des salles immenses et des tapisseries anciennes',
            secrets: 'Passages secrets menant aux cachots et à la salle du trésor',
            importance: 'high',
            accessibility: 'restricted',
            tags: ['château', 'royal', 'politique', 'histoire'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'loc_2',
            name: 'Taverne du Sanglier Rieur',
            description: 'Une taverne populaire fréquentée par les aventuriers et les marchands.',
            type: 'commercial',
            address: 'Rue des Marchands, Quartier Sud',
            coordinates: '45.089, 2.412',
            owner: 'Madame Gertrude',
            purpose: 'Restauration, logement temporaire, lieu de rencontre pour les quêtes',
            atmosphere: 'Chaude et conviviale, remplie de rires et de musique',
            secrets: 'Pièce secrète pour les transactions illégales',
            importance: 'medium',
            accessibility: 'public',
            tags: ['taverne', 'rencontre', 'commerce', 'aventure'],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'loc_3',
            name: 'Grotte des Anciens',
            description: 'Une grotte mystérieuse cachée dans la forêt, abritant des ruines elfiques.',
            type: 'natural',
            address: 'Forêt de Cristal, 5km au nord du village',
            coordinates: '45.234, 2.567',
            owner: 'Aucun (site naturel)',
            purpose: 'Lieu de pèlerinage, source de magie ancienne',
            atmosphere: 'Mystérieuse et sacrée, avec une aura magique palpable',
            secrets: 'Artefacts elfiques cachés, accès à une dimension parallèle',
            importance: 'high',
            accessibility: 'restricted',
            tags: ['grotte', 'magie', 'elfes', 'mystère'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ];
        setLocations(defaultLocations);
        saveLocations(defaultLocations);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
      notificationService.error('Erreur', 'Impossible de charger les lieux');
    }
  };

  const saveLocations = (locs: Location[]) => {
    if (!project) return;

    try {
      localStorage.setItem(`locations_${project.id}`, JSON.stringify(locs));
    } catch (error) {
      console.error('Failed to save locations:', error);
      notificationService.error('Erreur', 'Impossible de sauvegarder les lieux');
    }
  };

  const filteredLocations = locations.filter(location => {
    const matchesSearch = searchQuery === '' ||
      location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      location.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || location.type === selectedType;
    const matchesImportance = selectedImportance === 'all' || location.importance === selectedImportance;

    return matchesSearch && matchesType && matchesImportance;
  });

  const handleCreateLocation = () => {
    const newLocation: Location = {
      id: `loc_${Date.now()}`,
      name: '',
      description: '',
      type: 'other',
      address: '',
      coordinates: '',
      owner: '',
      purpose: '',
      atmosphere: '',
      secrets: '',
      importance: 'low',
      accessibility: 'public',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setEditingLocation(newLocation);
    setShowCreateForm(true);
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation({ ...location });
    setShowCreateForm(false);
  };

  const handleSaveLocation = (location: Location) => {
    if (!location.name.trim()) {
      notificationService.warning('Erreur', 'Le nom du lieu est requis');
      return;
    }

    const updatedLocations = editingLocation?.id
      ? locations.map(l => l.id === location.id ? { ...location, updatedAt: new Date() } : l)
      : [...locations, location];

    setLocations(updatedLocations);
    saveLocations(updatedLocations);
    setEditingLocation(null);

    notificationService.success(
      'Lieu sauvegardé',
      `Le lieu "${location.name}" a été ${editingLocation?.id ? 'modifié' : 'créé'} avec succès.`
    );
  };

  const handleDeleteLocation = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    if (!location) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le lieu "${location.name}" ?`)) {
      const updatedLocations = locations.filter(l => l.id !== locationId);
      setLocations(updatedLocations);
      saveLocations(updatedLocations);

      notificationService.info('Lieu supprimé', `Le lieu "${location.name}" a été supprimé.`);
    }
  };

  const getTypeIcon = (type: Location['type']) => {
    switch (type) {
      case 'residence':
        return <HomeIcon className="w-4 h-4 text-blue-500" />;
      case 'commercial':
        return <StoreIcon className="w-4 h-4 text-green-500" />;
      case 'public':
        return <BuildingIcon className="w-4 h-4 text-gray-500" />;
      case 'natural':
        return <TreePineIcon className="w-4 h-4 text-green-600" />;
      case 'religious':
        return <ChurchIcon className="w-4 h-4 text-purple-500" />;
      case 'military':
        return <CastleIcon className="w-4 h-4 text-red-500" />;
      case 'underground':
        return <MountainIcon className="w-4 h-4 text-brown-500" />;
      case 'other':
        return <MapPinIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: Location['type']) => {
    switch (type) {
      case 'residence':
        return 'Résidentiel';
      case 'commercial':
        return 'Commercial';
      case 'public':
        return 'Public';
      case 'natural':
        return 'Naturel';
      case 'religious':
        return 'Religieux';
      case 'military':
        return 'Militaire';
      case 'underground':
        return 'Souterrain';
      case 'other':
        return 'Autre';
    }
  };

  const getImportanceColor = (importance: Location['importance']) => {
    switch (importance) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAccessibilityColor = (accessibility: Location['accessibility']) => {
    switch (accessibility) {
      case 'public':
        return 'bg-green-100 text-green-800';
      case 'private':
        return 'bg-blue-100 text-blue-800';
      case 'restricted':
        return 'bg-red-100 text-red-800';
    }
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Lieux du projet</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <FileTextIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun projet ouvert</p>
            <p className="text-sm">Ouvrez un projet pour gérer ses lieux</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileTextIcon className="w-5 h-5" />
              Lieux - {project.project_name}
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
                    placeholder="Rechercher des lieux..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as Location['type'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Tous les types</option>
                  <option value="residence">Résidentiels</option>
                  <option value="commercial">Commerciaux</option>
                  <option value="public">Publics</option>
                  <option value="natural">Naturels</option>
                  <option value="religious">Religieux</option>
                  <option value="military">Militaires</option>
                  <option value="underground">Souterrains</option>
                  <option value="other">Autres</option>
                </select>

                <select
                  value={selectedImportance}
                  onChange={(e) => setSelectedImportance(e.target.value as Location['importance'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Toute importance</option>
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleCreateLocation} className="flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Nouveau lieu
                </Button>
              </div>
            </div>
          </div>

          {/* Locations List - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLocations.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <FileTextIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Aucun lieu trouvé
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || selectedType !== 'all' || selectedImportance !== 'all'
                      ? 'Essayez de modifier vos critères de recherche.'
                      : 'Créez votre premier lieu pour commencer.'}
                  </p>
                  {!searchQuery && selectedType === 'all' && selectedImportance === 'all' && (
                    <Button onClick={handleCreateLocation} className="flex items-center gap-2">
                      <PlusIcon className="w-4 h-4" />
                      Créer un lieu
                    </Button>
                  )}
                </div>
              ) : (
                filteredLocations.map(location => (
                  <div
                    key={location.id}
                    className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(location.type)}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {location.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge className={getImportanceColor(location.importance)}>
                          {location.importance === 'high' ? 'Élevé' :
                           location.importance === 'medium' ? 'Moyen' : 'Faible'}
                        </Badge>
                      </div>
                    </div>

                    {/* Type and Accessibility */}
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline">
                        {getTypeLabel(location.type)}
                      </Badge>
                      <Badge className={getAccessibilityColor(location.accessibility)}>
                        {location.accessibility === 'public' ? 'Public' :
                         location.accessibility === 'private' ? 'Privé' : 'Restreint'}
                      </Badge>
                    </div>

                    {/* Description */}
                    <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                      {location.description}
                    </p>

                    {/* Address */}
                    {location.address && (
                      <div className="text-xs text-gray-600 mb-2">
                        📍 {location.address}
                      </div>
                    )}

                    {/* Tags */}
                    {location.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {location.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {location.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{location.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        Modifié {location.updatedAt.toLocaleDateString('fr-FR')}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditLocation(location)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLocation(location.id)}
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
      {editingLocation && (
        <LocationEditModal
          location={editingLocation}
          isCreate={!locations.some(l => l.id === editingLocation.id)}
          onSave={handleSaveLocation}
          onCancel={() => setEditingLocation(null)}
        />
      )}
    </>
  );
}

/**
 * LocationEditModal - Modale d'édition de lieu
 */
interface LocationEditModalProps {
  location: Location;
  isCreate: boolean;
  onSave: (location: Location) => void;
  onCancel: () => void;
}

function LocationEditModal({ location, isCreate, onSave, onCancel }: LocationEditModalProps) {
  const [editedLocation, setEditedLocation] = useState<Location>(location);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    onSave(editedLocation);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !editedLocation.tags.includes(newTag.trim())) {
      setEditedLocation(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setEditedLocation(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isCreate ? 'Créer un lieu' : 'Modifier le lieu'}
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
                  value={editedLocation.name}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom du lieu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={editedLocation.type}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, type: e.target.value as Location['type'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="residence">Résidentiel</option>
                  <option value="commercial">Commercial</option>
                  <option value="public">Public</option>
                  <option value="natural">Naturel</option>
                  <option value="religious">Religieux</option>
                  <option value="military">Militaire</option>
                  <option value="underground">Souterrain</option>
                  <option value="other">Autre</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                value={editedLocation.description}
                onChange={(e) => setEditedLocation(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Courte description du lieu"
                rows={3}
              />
            </div>

            {/* Location Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <Input
                  value={editedLocation.address}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse ou emplacement"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coordonnées
                </label>
                <Input
                  value={editedLocation.coordinates}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, coordinates: e.target.value }))}
                  placeholder="Latitude, Longitude"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Propriétaire
                </label>
                <Input
                  value={editedLocation.owner}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, owner: e.target.value }))}
                  placeholder="Propriétaire ou responsable"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accessibilité
                </label>
                <select
                  value={editedLocation.accessibility}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, accessibility: e.target.value as Location['accessibility'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="public">Public</option>
                  <option value="private">Privé</option>
                  <option value="restricted">Restreint</option>
                </select>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fonction
                </label>
                <Textarea
                  value={editedLocation.purpose}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, purpose: e.target.value }))}
                  placeholder="Rôle et fonction du lieu"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Atmosphère
                </label>
                <Textarea
                  value={editedLocation.atmosphere}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, atmosphere: e.target.value }))}
                  placeholder="Ambiance et sensations"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secrets
                </label>
                <Textarea
                  value={editedLocation.secrets}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, secrets: e.target.value }))}
                  placeholder="Secrets et éléments cachés"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importance
                </label>
                <select
                  value={editedLocation.importance}
                  onChange={(e) => setEditedLocation(prev => ({ ...prev, importance: e.target.value as Location['importance'] }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="high">Élevée</option>
                  <option value="medium">Moyenne</option>
                  <option value="low">Faible</option>
                </select>
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
                {editedLocation.tags.map(tag => (
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
