/**
 * ImageGalleryModal - Galerie d'images générées par IA
 *
 * Permet de voir, organiser et gérer toutes les images générées
 * pour les personnages, objets, mondes et scènes
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  DownloadIcon,
  HeartIcon,
  StarIcon,
  FolderIcon,
  ImageIcon,
  SparklesIcon,
  FilterIcon,
  GridIcon,
  ListIcon,
  EyeIcon,
  TagIcon,
  CalendarIcon,
  UserIcon,
  GlobeIcon,
  MapPinIcon,
  GemIcon,
  TargetIcon,
  CameraIcon,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { imageGalleryService, type ImageMetadata, type ImageCollection } from '@/services/ImageGalleryService';
import { notificationService } from '@/services/NotificationService';

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ isOpen, onClose }: ImageGalleryModalProps) {
  const project = useAppStore((state) => state.project);

  // État local pour la galerie
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<ImageMetadata['contextType'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showImageDetails, setShowImageDetails] = useState<ImageMetadata | null>(null);

  // Charger les images et collections du projet
  useEffect(() => {
    if (project && isOpen) {
      loadGallery();
    }
  }, [project, isOpen]);

  const loadGallery = () => {
    if (!project) return;

    try {
      const projectImages = imageGalleryService.getProjectImages();
      const projectCollections = imageGalleryService.getProjectCollections();

      setImages(projectImages);
      setCollections(projectCollections);
    } catch (error) {
      console.error('Failed to load gallery:', error);
      notificationService.error('Erreur', 'Impossible de charger la galerie d\'images');
    }
  };

  // Images filtrées
  const filteredImages = useMemo(() => {
    let filtered = images;

    // Filtre par recherche
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.prompt.toLowerCase().includes(query) ||
        (img.revisedPrompt && img.revisedPrompt.toLowerCase().includes(query)) ||
        img.contextName?.toLowerCase().includes(query) ||
        img.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Filtre par contexte
    if (selectedContext !== 'all') {
      filtered = filtered.filter(img => img.contextType === selectedContext);
    }

    // Filtre par favoris
    if (showOnlyFavorites) {
      filtered = filtered.filter(img => img.favorite);
    }

    // Filtre par collection
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection);
      if (collection) {
        filtered = filtered.filter(img => collection.imageIds.includes(img.id));
      }
    }

    // Tri par date de création (plus récent en premier)
    return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [images, searchQuery, selectedContext, showOnlyFavorites, selectedCollection, collections]);

  const handleDownloadImage = (image: ImageMetadata) => {
    imageGalleryService.downloadImage(image.id);
  };

  const handleToggleFavorite = (image: ImageMetadata) => {
    const success = imageGalleryService.toggleFavorite(image.id);
    if (success) {
      // Mettre à jour l'état local
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, favorite: !img.favorite } : img
      ));
    }
  };

  const handleDeleteImage = (image: ImageMetadata) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'image "${image.prompt.substring(0, 50)}..." ?`)) {
      const success = imageGalleryService.deleteImage(image.id);
      if (success) {
        setImages(prev => prev.filter(img => img.id !== image.id));
        notificationService.success('Image supprimée', 'L\'image a été retirée de la galerie');
      }
    }
  };

  const handleCreateCollection = () => {
    const collectionName = prompt('Nom de la nouvelle collection:');
    if (collectionName?.trim()) {
      const newCollection = imageGalleryService.createCollection(collectionName.trim());
      setCollections(prev => [...prev, newCollection]);
    }
  };

  const handleAddToCollection = (imageId: string, collectionId: string) => {
    const success = imageGalleryService.addImageToCollection(collectionId, imageId);
    if (success) {
      // Mettre à jour l'état local des collections
      setCollections(prev => prev.map(coll =>
        coll.id === collectionId
          ? { ...coll, imageIds: [...coll.imageIds, imageId], updatedAt: new Date() }
          : coll
      ));
      notificationService.success('Image ajoutée', 'L\'image a été ajoutée à la collection');
    }
  };

  const handleRemoveFromCollection = (imageId: string, collectionId: string) => {
    const success = imageGalleryService.removeImageFromCollection(collectionId, imageId);
    if (success) {
      setCollections(prev => prev.map(coll =>
        coll.id === collectionId
          ? { ...coll, imageIds: coll.imageIds.filter(id => id !== imageId), updatedAt: new Date() }
          : coll
      ));
    }
  };

  const getContextIcon = (contextType: ImageMetadata['contextType']) => {
    switch (contextType) {
      case 'character':
        return <UserIcon className="w-4 h-4 text-blue-500" />;
      case 'world':
        return <GlobeIcon className="w-4 h-4 text-green-500" />;
      case 'location':
        return <MapPinIcon className="w-4 h-4 text-purple-500" />;
      case 'object':
        return <GemIcon className="w-4 h-4 text-orange-500" />;
      case 'scene':
        return <CameraIcon className="w-4 h-4 text-red-500" />;
      default:
        return <ImageIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getContextLabel = (contextType: ImageMetadata['contextType']) => {
    switch (contextType) {
      case 'character':
        return 'Personnage';
      case 'world':
        return 'Monde';
      case 'location':
        return 'Lieu';
      case 'object':
        return 'Objet';
      case 'scene':
        return 'Scène';
      default:
        return 'Général';
    }
  };

  const stats = imageGalleryService.getGalleryStats();

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Galerie d'images</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucun projet ouvert</p>
            <p className="text-sm">Ouvrez un projet pour accéder à la galerie d'images</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <BookOpenIcon className="w-5 h-5" />
              Galerie d'images - {project.project_name}
            </DialogTitle>
          </DialogHeader>

          {/* Stats Bar */}
          <div className="flex-shrink-0 px-6 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>{stats.totalImages} images</span>
                <span>{stats.favoriteImages} favoris</span>
                <span>{stats.totalCollections} collections</span>
              </div>
              <div className="flex items-center gap-2">
                {Object.entries(stats.imagesByType).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {getContextLabel(type as ImageMetadata['contextType'])}: {count}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex-shrink-0 p-4 border-b border-gray-200">
            <div className="flex items-center justify-between gap-4">
              {/* Search and filters */}
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher dans les prompts, noms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <select
                  value={selectedContext}
                  onChange={(e) => setSelectedContext(e.target.value as ImageMetadata['contextType'] | 'all')}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Tous les contextes</option>
                  <option value="character">Personnages</option>
                  <option value="world">Mondes</option>
                  <option value="location">Lieux</option>
                  <option value="object">Objets</option>
                  <option value="scene">Scènes</option>
                  <option value="general">Général</option>
                </select>

                <select
                  value={selectedCollection || ''}
                  onChange={(e) => setSelectedCollection(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Toutes les images</option>
                  {collections.map(collection => (
                    <option key={collection.id} value={collection.id}>
                      📁 {collection.name} ({collection.imageIds.length})
                    </option>
                  ))}
                </select>

                <Button
                  variant={showOnlyFavorites ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className="flex items-center gap-1"
                >
                  <HeartIcon className="w-4 h-4" />
                  Favoris
                </Button>
              </div>

              {/* View controls */}
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                <Button onClick={handleCreateCollection} className="flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Collection
                </Button>
              </div>
            </div>
          </div>

          {/* Images Display */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredImages.length === 0 ? (
              <div className="text-center py-12">
                <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchQuery || selectedContext !== 'all' || showOnlyFavorites || selectedCollection
                    ? 'Aucune image trouvée'
                    : 'Aucune image dans la galerie'}
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || selectedContext !== 'all' || showOnlyFavorites || selectedCollection
                    ? 'Essayez de modifier vos critères de recherche.'
                    : 'Générez des images avec l\'IA pour commencer votre collection.'}
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredImages.map(image => (
                  <div
                    key={image.id}
                    className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Image */}
                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjIwQzE0IDIxLjEgMTMuMSAyMiAxMiAyMkMxMC45IDIyIDEwIDIxLjEgMTAgMjBWNEMxMCAyLjkgMTAuOSAyIDEyIDJaTTEyIDE2QzEzLjY1NjkgMTYgMTUgMTQuNjU2OSAxNSAxM0MxNC42NTY5IDEyIDEzLjY1NjkgMTIgMTIgMTJDMTAuMzQzMSAxMiA5LjY1Njg1IDEyLjY1NjkgOS44NDMxIDE0QzEwLjE4MzEgMTQuNjU2OSAxMC42MzEzIDE1IDExLjMxMjUgMTVDMTEuOTg0NCAxNSAxMi42NDM4IDE0LjY1NjkgMTIuODQzMSAxNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                        }}
                      />

                      {/* Overlay avec actions */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowImageDetails(image)}
                            className="bg-white/90 hover:bg-white"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownloadImage(image)}
                            className="bg-white/90 hover:bg-white"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleToggleFavorite(image)}
                            className={`bg-white/90 hover:bg-white ${image.favorite ? 'text-red-500' : ''}`}
                          >
                            <HeartIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Badge favori */}
                      {image.favorite && (
                        <div className="absolute top-2 right-2">
                          <HeartIcon className="w-5 h-5 text-red-500 bg-white rounded-full p-1" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {getContextIcon(image.contextType)}
                        <span className="text-xs text-gray-600">
                          {getContextLabel(image.contextType)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-800 line-clamp-2 mb-1">
                        {image.contextName || image.prompt.substring(0, 50) + '...'}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <CalendarIcon className="w-3 h-3" />
                        {image.createdAt.toLocaleDateString('fr-FR')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Vue liste */
              <div className="space-y-2">
                {filteredImages.map(image => (
                  <div
                    key={image.id}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  >
                    {/* Miniature */}
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>

                    {/* Infos */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getContextIcon(image.contextType)}
                        <span className="text-sm font-medium text-gray-900">
                          {image.contextName || 'Image générée'}
                        </span>
                        {image.favorite && <HeartIcon className="w-4 h-4 text-red-500" />}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-1 mb-1">
                        {image.prompt}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{getContextLabel(image.contextType)}</span>
                        <span>{image.model} • {image.size}</span>
                        <span>{image.createdAt.toLocaleDateString('fr-FR')}</span>
                        {image.quality && <span>Qualité: {image.quality}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowImageDetails(image)}
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadImage(image)}
                      >
                        <DownloadIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleFavorite(image)}
                        className={image.favorite ? 'text-red-500' : ''}
                      >
                        <HeartIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteImage(image)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal détails d'image */}
      {showImageDetails && (
        <ImageDetailsModal
          image={showImageDetails}
          collections={collections}
          onAddToCollection={handleAddToCollection}
          onRemoveFromCollection={handleRemoveFromCollection}
          onClose={() => setShowImageDetails(null)}
        />
      )}
    </>
  );
}

/**
 * ImageDetailsModal - Détails complets d'une image
 */
interface ImageDetailsModalProps {
  image: ImageMetadata;
  collections: ImageCollection[];
  onAddToCollection: (imageId: string, collectionId: string) => void;
  onRemoveFromCollection: (imageId: string, collectionId: string) => void;
  onClose: () => void;
}

function ImageDetailsModal({ image, collections, onAddToCollection, onRemoveFromCollection, onClose }: ImageDetailsModalProps) {
  const [notes, setNotes] = useState(image.notes || '');
  const [rating, setRating] = useState(image.rating || 0);
  const [selectedCollection, setSelectedCollection] = useState('');

  const handleSaveNotes = () => {
  };

  const handleRateImage = (newRating: number) => {
    setRating(newRating);
  };

  const handleAddToCollection = () => {
    if (selectedCollection) {
      onAddToCollection(image.id, selectedCollection);
      setSelectedCollection('');
    }
  };

  const availableCollections = collections.filter(coll => !coll.imageIds.includes(image.id));

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Détails de l'image
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Actions rapides */}
              <div className="flex gap-2">
                <Button className="flex-1" variant="outline">
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Télécharger
                </Button>
                <Button variant={image.favorite ? "default" : "outline"}>
                  <HeartIcon className="w-4 h-4 mr-2" />
                  {image.favorite ? 'Favori' : 'Ajouter aux favoris'}
                </Button>
              </div>
            </div>

            {/* Métadonnées */}
            <div className="space-y-6">
              {/* Informations de base */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Contexte:</span>
                    <Badge variant="outline">{image.contextType}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Modèle:</span>
                    <span>{image.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taille:</span>
                    <span>{image.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Qualité:</span>
                    <span>{image.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Créée le:</span>
                    <span>{image.createdAt.toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>

              {/* Prompt */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Prompt original</h3>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                  {image.prompt}
                </p>
                {image.revisedPrompt && (
                  <div className="mt-2">
                    <h4 className="text-sm font-medium text-gray-700 mb-1">Prompt révisé par IA:</h4>
                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      {image.revisedPrompt}
                    </p>
                  </div>
                )}
              </div>

              {/* Évaluation */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Évaluation</h3>
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => handleRateImage(star)}
                      className={`w-6 h-6 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                    >
                      <StarIcon className="w-full h-full fill-current" />
                    </button>
                  ))}
                  <span className="ml-2 text-sm text-gray-600">
                    {rating > 0 ? `${rating}/5 étoiles` : 'Non évaluée'}
                  </span>
                </div>
              </div>

              {/* Notes personnelles */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Notes personnelles</h3>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ajoutez vos notes sur cette image..."
                  rows={4}
                />
                <Button onClick={handleSaveNotes} className="mt-2" size="sm">
                  Sauvegarder les notes
                </Button>
              </div>

              {/* Collections */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Collections</h3>
                <div className="flex gap-2 mb-3">
                  <select
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">Choisir une collection...</option>
                    {availableCollections.map(collection => (
                      <option key={collection.id} value={collection.id}>
                        {collection.name}
                      </option>
                    ))}
                  </select>
                  <Button onClick={handleAddToCollection} disabled={!selectedCollection}>
                    Ajouter
                  </Button>
                </div>

                {/* Collections actuelles */}
                {collections.filter(coll => coll.imageIds.includes(image.id)).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dans les collections:</h4>
                    <div className="flex flex-wrap gap-2">
                      {collections
                        .filter(coll => coll.imageIds.includes(image.id))
                        .map(collection => (
                          <Badge key={collection.id} variant="secondary" className="flex items-center gap-1">
                            {collection.name}
                            <button
                              onClick={() => onRemoveFromCollection(image.id, collection.id)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              <XIcon className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {image.tags.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {image.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        <TagIcon className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
