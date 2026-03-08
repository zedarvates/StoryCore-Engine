/**
 * ImageGalleryModal - Project Asset Library
 *
 * Manage all generated images for characters, objects, worlds, and scenes.
 * Premium UI with category filters, favorites, and collections.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './ImageGalleryModal.css';
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
import { useAppStore } from '@/stores/useAppStore';
import { imageGalleryService, type ImageMetadata, type ImageCollection } from '@/services/ImageGalleryService';
import { notificationService } from '@/services/NotificationService';
import { I18nContext } from '@/utils/i18nContext';
import { useContext } from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen as BookOpenIcon,
  Plus as PlusIcon,
  Edit as EditIcon,
  Trash as TrashIcon,
  Save as SaveIcon,
  X as XIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Heart as HeartIcon,
  Star as StarIcon,
  Folder as FolderIcon,
  Image as ImageIcon,
  Sparkles as SparklesIcon,
  Filter as FilterIcon,
  Grid as GridIcon,
  List as ListIcon,
  Eye as EyeIcon,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  User as UserIcon,
  Globe as GlobeIcon,
  MapPin as MapPinIcon,
  Gem as GemIcon,
  Target as TargetIcon,
  Camera as CameraIcon,
  Users as UsersIcon,
  Map as MapIcon,
  Package as PackageIcon,
  Film as FilmIcon,
} from 'lucide-react';

interface GalleryStats {
  totalImages: number;
  favoriteImages: number;
  totalCollections: number;
  imagesByType: Record<string, number>;
  storageUsed?: number;
}

interface ImageGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImageGalleryModal({ isOpen, onClose }: ImageGalleryModalProps) {
  const project = useAppStore((state) => state.project);
  const context = useContext(I18nContext);
  const t = context?.t || ((key: string) => key);

  // local state
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [collections, setCollections] = useState<ImageCollection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContext, setSelectedContext] = useState<ImageMetadata['contextType'] | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'grid' | 'collections'>('grid');
  const [showImageDetails, setShowImageDetails] = useState<ImageMetadata | null>(null);
  const [stats, setStats] = useState<GalleryStats>({
    totalImages: 0,
    favoriteImages: 0,
    totalCollections: 0,
    imagesByType: {},
  });

  const loadGallery = useCallback(() => {
    if (!project) return;
    
    // Ensure service knows current project
    imageGalleryService.setCurrentProject(project.id);

    try {
      const projectImages = imageGalleryService.getProjectImages();
      const projectCollections = imageGalleryService.getProjectCollections();
      const galleryStats = imageGalleryService.getGalleryStats();

      setImages(projectImages);
      setCollections(projectCollections);
      setStats(galleryStats);
    } catch (error) {
      console.error('Failed to load gallery:', error);
    }
  }, [project]);

  useEffect(() => {
    if (project && isOpen) {
      loadGallery();
    }
  }, [project, isOpen, loadGallery]);

  // Combined filtering
  const filteredImages = useMemo(() => {
    let filtered = [...images];

    // Query search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(img =>
        img.prompt.toLowerCase().includes(query) ||
        (img.revisedPrompt && img.revisedPrompt.toLowerCase().includes(query)) ||
        img.contextName?.toLowerCase().includes(query) ||
        img.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Context filter
    if (selectedContext !== 'all') {
      filtered = filtered.filter(img => img.contextType === selectedContext);
    }

    // Favorites filter
    if (showOnlyFavorites) {
      filtered = filtered.filter(img => img.favorite);
    }

    // Collection filter
    if (selectedCollection) {
      const collection = collections.find(c => c.id === selectedCollection);
      if (collection) {
        filtered = filtered.filter(img => collection.imageIds.includes(img.id));
      }
    }

    return filtered; // Service already sorts them by date
  }, [images, searchQuery, selectedContext, showOnlyFavorites, selectedCollection, collections]);

  const handleDownloadImage = (image: ImageMetadata) => {
    imageGalleryService.downloadImage(image.id);
  };

  const handleToggleFavorite = (image: ImageMetadata) => {
    const success = imageGalleryService.toggleFavorite(image.id);
    if (success) {
      setImages(prev => prev.map(img =>
        img.id === image.id ? { ...img, favorite: !img.favorite } : img
      ));
      // Refresh stats
      loadGallery();
    }
  };

  const handleDeleteImage = (image: ImageMetadata) => {
    if (confirm(`Are you sure you want to delete this asset?`)) {
      const success = imageGalleryService.deleteImage(image.id);
      if (success) {
        setImages(prev => prev.filter(img => img.id !== image.id));
        loadGallery();
      }
    }
  };

  const handleCreateCollection = () => {
    const collectionName = prompt('New Collection Name:');
    if (collectionName?.trim()) {
      const newCollection = imageGalleryService.createCollection(collectionName.trim());
      setCollections(prev => [newCollection, ...prev]);
      loadGallery();
    }
  };

  const handleAddToCollection = (imageId: string, collectionId: string) => {
    const success = imageGalleryService.addImageToCollection(collectionId, imageId);
    if (success) {
      loadGallery();
      notificationService.success('Added', 'Asset added to collection');
    }
  };

  const handleRemoveFromCollection = (imageId: string, collectionId: string) => {
    const success = imageGalleryService.removeImageFromCollection(collectionId, imageId);
    if (success) {
      loadGallery();
    }
  };

  const getContextIcon = (contextType: ImageMetadata['contextType']) => {
    switch (contextType) {
      case 'character': return <UsersIcon className="w-4 h-4 text-blue-500" />;
      case 'world': return <GlobeIcon className="w-4 h-4 text-green-500" />;
      case 'location': return <MapIcon className="w-4 h-4 text-purple-500" />;
      case 'object': return <PackageIcon className="w-4 h-4 text-orange-500" />;
      case 'scene': return <FilmIcon className="w-4 h-4 text-red-500" />;
      default: return <ImageIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getContextLabel = (contextType: ImageMetadata['contextType']) => {
    switch (contextType) {
      case 'character': return t('imageGallery.characters');
      case 'world': return t('imageGallery.worlds');
      case 'location': return t('imageGallery.locations');
      case 'object': return t('imageGallery.objects');
      case 'scene': return t('imageGallery.scenes');
      default: return t('imageGallery.general');
    }
  };

  if (!project) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('imageGallery.title')}</DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center text-gray-500">
            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('imageGallery.noProject')}</p>
            <p className="text-sm">{t('imageGallery.openToAccess')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="image-gallery-dialog max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpenIcon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t('imageGallery.title')}</h2>
                  <p className="text-sm text-muted-foreground font-normal">{project.project_name}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm font-normal">
                <div className="flex flex-col items-end">
                   <span className="font-semibold">{stats.totalImages}</span>
                   <span className="text-[10px] uppercase text-muted-foreground">Assets</span>
                </div>
                <div className="h-8 w-[1px] bg-border" />
                <div className="flex flex-col items-end">
                   <span className="font-semibold">{stats.favoriteImages}</span>
                   <span className="text-[10px] uppercase text-muted-foreground">Favorites</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {/* New Toolbar */}
          <div className="p-4 bg-muted/30 border-b space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder={t('imageGallery.searchPlaceholder')} 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  variant={showOnlyFavorites ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className="gap-2"
                >
                  <HeartIcon className={cn("w-4 h-4", showOnlyFavorites && "fill-current")} />
                  {t('imageGallery.favorites')}
                </Button>
                
                <div className="h-6 w-[1px] bg-border mx-1" />

                <Button 
                  variant={viewMode === 'grid' ? "secondary" : "ghost"} 
                  size="icon" 
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon className="w-4 h-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? "secondary" : "ghost"} 
                  size="icon" 
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="w-4 h-4" />
                </Button>
                
                <Button onClick={handleCreateCollection} size="sm" className="gap-2">
                  <PlusIcon className="w-4 h-4" />
                  New Collection
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                {[
                  { id: 'all', label: t('imageGallery.all'), icon: GlobeIcon },
                  { id: 'character', label: t('imageGallery.characters'), icon: UsersIcon },
                  { id: 'world', label: t('imageGallery.worlds'), icon: GlobeIcon },
                  { id: 'location', label: t('imageGallery.locations'), icon: MapIcon },
                  { id: 'object', label: t('imageGallery.objects'), icon: PackageIcon },
                  { id: 'scene', label: t('imageGallery.scenes'), icon: FilmIcon },
                ].map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedContext === cat.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setSelectedContext(cat.id as any)}
                    className={cn(
                      "rounded-full gap-2 px-4 whitespace-nowrap",
                      selectedContext === cat.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.label}
                    {stats.imagesByType?.[cat.id] > 0 && (
                       <Badge variant="outline" className="ml-1 px-1 h-4 min-w-[1.25rem] border-none bg-black/20 text-[10px]">
                         {stats.imagesByType[cat.id]}
                       </Badge>
                    )}
                  </Button>
                ))}
              </div>

              {collections.length > 0 && (
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">Collection:</span>
                  <select
                    value={selectedCollection || ''}
                    onChange={e => setSelectedCollection(e.target.value || null)}
                    className="h-8 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">All Collections</option>
                    {collections.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-60">
                <ImageIcon className="w-16 h-16 mb-4" />
                <h3 className="text-lg font-medium">{t('imageGallery.noImages')}</h3>
                <p className="text-sm">{t('imageGallery.emptyState')}</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {filteredImages.map(image => (
                  <div key={image.id} className="group relative bg-card rounded-xl border overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="aspect-square relative overflow-hidden bg-muted">
                      <img
                        src={image.url}
                        alt={image.prompt}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" className="rounded-full w-8 h-8" onClick={() => setShowImageDetails(image)}>
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="rounded-full w-8 h-8" onClick={() => handleDownloadImage(image)}>
                          <DownloadIcon className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className={cn("rounded-full w-8 h-8", image.favorite && "text-red-500")}
                          onClick={() => handleToggleFavorite(image)}
                        >
                          <HeartIcon className={cn("w-4 h-4", image.favorite && "fill-current")} />
                        </Button>
                      </div>
                      
                      <div className="absolute top-2 left-2">
                         <div className="bg-black/60 backdrop-blur-md rounded-full p-1.5 border border-white/10">
                           {getContextIcon(image.contextType)}
                         </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="text-xs font-semibold truncate text-foreground">{image.contextName || "Untitled Asset"}</h4>
                      <div className="flex items-center justify-between mt-2">
                         <span className="text-[10px] text-muted-foreground">{image.createdAt.toLocaleDateString()}</span>
                         <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{image.size}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                 {filteredImages.map(image => (
                    <div key={image.id} className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
                       <div className="w-16 h-16 rounded overflow-hidden flex-shrink-0">
                          <img src={image.url} className="w-full h-full object-cover" />
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                             <h4 className="text-sm font-semibold truncate">{image.contextName || "Untitled Asset"}</h4>
                             {image.favorite && <HeartIcon className="w-3 h-3 text-red-500 fill-current" />}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">{image.prompt}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                             <span className="flex items-center gap-1">{getContextIcon(image.contextType)} {getContextLabel(image.contextType)}</span>
                             <span>{image.model}</span>
                             <span>{image.createdAt.toLocaleDateString()}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="sm" variant="ghost" onClick={() => setShowImageDetails(image)}><EyeIcon className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownloadImage(image)}><DownloadIcon className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleToggleFavorite(image)} className={cn(image.favorite && "text-red-500")}><HeartIcon className="w-4 h-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteImage(image)} className="text-destructive"><TrashIcon className="w-4 h-4" /></Button>
                       </div>
                    </div>
                 ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

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

function ImageDetailsModal({ image, collections, onAddToCollection, onRemoveFromCollection, onClose }: any) {
  // Simple implementation redirecting to original logic
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-background">
        <div className="flex h-[80vh]">
          <div className="flex-1 bg-black flex items-center justify-center p-4">
             <img src={image.url} className="max-w-full max-h-full object-contain" />
          </div>
          <div className="w-80 border-l p-6 flex flex-col gap-6 overflow-y-auto">
             <div className="space-y-1">
                <h3 className="text-lg font-bold">Asset Details</h3>
                <p className="text-xs text-muted-foreground">ID: {image.id}</p>
             </div>

             <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Prompt</h4>
                  <div className="p-3 bg-muted rounded-lg text-xs leading-relaxed max-h-40 overflow-y-auto">
                    {image.prompt}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Model</span>
                      <p className="text-xs font-medium">{image.model}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Size</span>
                      <p className="text-xs font-medium">{image.size}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Date</span>
                      <p className="text-xs font-medium">{image.createdAt.toLocaleDateString()}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">Type</span>
                      <p className="text-xs font-medium">{image.contextType}</p>
                   </div>
                </div>

                <div>
                   <h4 className="text-xs font-bold uppercase text-muted-foreground mb-3">Add to Collection</h4>
                   <div className="flex gap-2">
                      <select 
                        className="flex-1 h-8 rounded border bg-background text-xs px-2"
                        onChange={e => e.target.value && onAddToCollection(image.id, e.target.value)}
                        value=""
                      >
                         <option value="">Select collection...</option>
                         {collections.filter((c:any) => !c.imageIds.includes(image.id)).map((c:any) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                         ))}
                      </select>
                   </div>
                </div>
                
                {collections.filter((c:any) => c.imageIds.includes(image.id)).length > 0 && (
                   <div>
                      <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">In Collections</h4>
                      <div className="flex flex-wrap gap-1">
                         {collections.filter((c:any) => c.imageIds.includes(image.id)).map((c:any) => (
                            <Badge key={c.id} variant="secondary" className="gap-1 px-2 py-0.5 text-[10px]">
                               {c.name}
                               <XIcon className="w-2 h-2 cursor-pointer hover:text-destructive" onClick={() => onRemoveFromCollection(image.id, c.id)} />
                            </Badge>
                         ))}
                      </div>
                   </div>
                )}
             </div>

             <div className="mt-auto pt-6 flex flex-col gap-2">
                <Button className="w-full gap-2" size="sm" onClick={() => imageGalleryService.downloadImage(image.id)}>
                   <DownloadIcon className="w-4 h-4" />
                   Download Original
                </Button>
                <Button variant="outline" className="w-full gap-2" size="sm" onClick={onClose}>
                   Close
                </Button>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageGalleryModal;
