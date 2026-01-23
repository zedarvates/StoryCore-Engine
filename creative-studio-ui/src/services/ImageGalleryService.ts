/**
 * ImageGalleryService - Service de gestion des images générées
 *
 * Permet de sauvegarder, organiser et accéder aux images générées par IA
 * pour les personnages, objets, mondes et scènes
 */

import { GeneratedImage } from '@/services/llmService';
import { notificationService } from './NotificationService';

export interface ImageMetadata {
  id: string;
  prompt: string;
  revisedPrompt?: string;
  model: string;
  size: string;
  quality: string;
  style: string;
  url: string;
  thumbnailUrl?: string;
  localPath?: string;
  createdAt: Date;
  updatedAt: Date;

  // Métadonnées contextuelles
  contextType: 'character' | 'world' | 'location' | 'object' | 'scene' | 'general';
  contextId?: string; // ID de l'élément associé (personnage, objet, etc.)
  contextName?: string; // Nom de l'élément associé
  projectId?: string; // ID du projet
  tags: string[];

  // Métadonnées techniques
  fileSize?: number;
  format: 'png' | 'jpg' | 'webp';
  width?: number;
  height?: number;

  // Métadonnées utilisateur
  favorite: boolean;
  rating?: number; // 1-5 étoiles
  notes?: string;
  usedIn?: string[]; // Liste des utilisations (storyboard, concept art, etc.)
}

export interface ImageCollection {
  id: string;
  name: string;
  description?: string;
  projectId?: string;
  imageIds: string[];
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublic: boolean;
}

export interface ImageGenerationContext {
  type: 'character' | 'world' | 'location' | 'object' | 'scene' | 'general';
  id?: string;
  name?: string;
  description?: string;
  additionalContext?: Record<string, any>;
}

/**
 * Service de gestion des images générées
 */
export class ImageGalleryService {
  private static instance: ImageGalleryService;
  private images: Map<string, ImageMetadata> = new Map();
  private collections: Map<string, ImageCollection> = new Map();
  private currentProjectId?: string;

  private constructor() {}

  static getInstance(): ImageGalleryService {
    if (!ImageGalleryService.instance) {
      ImageGalleryService.instance = new ImageGalleryService();
    }
    return ImageGalleryService.instance;
  }

  /**
   * Définit le projet actuel
   */
  setCurrentProject(projectId?: string): void {
    this.currentProjectId = projectId;
    this.loadProjectImages();
  }

  /**
   * Charge les images du projet actuel
   */
  private loadProjectImages(): void {
    if (!this.currentProjectId) return;

    try {
      const storedImages = localStorage.getItem(`images_${this.currentProjectId}`);
      if (storedImages) {
        const parsed = JSON.parse(storedImages);
        this.images.clear();

        parsed.forEach((imgData: any) => {
          const image: ImageMetadata = {
            ...imgData,
            createdAt: new Date(imgData.createdAt),
            updatedAt: new Date(imgData.updatedAt),
          };
          this.images.set(image.id, image);
        });
      }

      const storedCollections = localStorage.getItem(`image_collections_${this.currentProjectId}`);
      if (storedCollections) {
        const parsed = JSON.parse(storedCollections);
        this.collections.clear();

        parsed.forEach((collData: any) => {
          const collection: ImageCollection = {
            ...collData,
            createdAt: new Date(collData.createdAt),
            updatedAt: new Date(collData.updatedAt),
          };
          this.collections.set(collection.id, collection);
        });
      }
    } catch (error) {
      console.error('Failed to load project images:', error);
      notificationService.error('Erreur', 'Impossible de charger les images du projet');
    }
  }

  /**
   * Sauvegarde les images du projet actuel
   */
  private saveProjectImages(): void {
    if (!this.currentProjectId) return;

    try {
      const imagesArray = Array.from(this.images.values());
      localStorage.setItem(`images_${this.currentProjectId}`, JSON.stringify(imagesArray));

      const collectionsArray = Array.from(this.collections.values());
      localStorage.setItem(`image_collections_${this.currentProjectId}`, JSON.stringify(collectionsArray));
    } catch (error) {
      console.error('Failed to save project images:', error);
      notificationService.error('Erreur', 'Impossible de sauvegarder les images');
    }
  }

  /**
   * Ajoute une image générée à la galerie
   */
  addGeneratedImage(
    generatedImage: GeneratedImage,
    context: ImageGenerationContext,
    tags: string[] = []
  ): ImageMetadata {
    const metadata: ImageMetadata = {
      id: generatedImage.id,
      prompt: generatedImage.prompt,
      revisedPrompt: generatedImage.revisedPrompt,
      model: generatedImage.model,
      size: generatedImage.size,
      quality: generatedImage.metadata?.quality || 'standard',
      style: generatedImage.metadata?.style || 'vivid',
      url: generatedImage.url,
      createdAt: generatedImage.createdAt,
      updatedAt: new Date(),

      // Contexte
      contextType: context.type,
      contextId: context.id,
      contextName: context.name,
      projectId: this.currentProjectId,
      tags: [...tags, context.type, context.name].filter(Boolean),

      // Métadonnées techniques
      format: 'png', // DALL-E génère en PNG par défaut

      // Métadonnées utilisateur
      favorite: false,
      usedIn: [],
    };

    this.images.set(metadata.id, metadata);
    this.saveProjectImages();

    notificationService.success(
      'Image ajoutée',
      `Image générée ajoutée à la galerie pour ${context.type}`
    );

    return metadata;
  }

  /**
   * Génère un prompt optimisé pour l'image basé sur le contexte
   */
  generateImagePrompt(
    basePrompt: string,
    context: ImageGenerationContext,
    style: 'realistic' | 'fantasy' | 'anime' | 'concept' = 'fantasy'
  ): string {
    const stylePrompts = {
      realistic: 'photorealistic, highly detailed, professional photography',
      fantasy: 'fantasy art, detailed, vibrant colors, magical atmosphere',
      anime: 'anime style, detailed character design, vibrant colors',
      concept: 'concept art, detailed illustration, professional design'
    };

    let enhancedPrompt = `${basePrompt}, ${stylePrompts[style]}`;

    // Ajouter le contexte spécifique
    switch (context.type) {
      case 'character':
        enhancedPrompt += ', character portrait, detailed face and expression, costume design';
        if (context.description) {
          enhancedPrompt += `, ${context.description}`;
        }
        break;

      case 'object':
        enhancedPrompt += ', object on display, detailed item design, magical glow if applicable';
        if (context.description) {
          enhancedPrompt += `, ${context.description}`;
        }
        break;

      case 'location':
        enhancedPrompt += ', landscape view, detailed environment, atmospheric lighting';
        if (context.description) {
          enhancedPrompt += `, ${context.description}`;
        }
        break;

      case 'world':
        enhancedPrompt += ', world overview, grand scale, detailed landscape';
        if (context.description) {
          enhancedPrompt += `, ${context.description}`;
        }
        break;

      case 'scene':
        enhancedPrompt += ', scene composition, character interaction, detailed background';
        if (context.description) {
          enhancedPrompt += `, ${context.description}`;
        }
        break;
    }

    // Ajouter des éléments de qualité
    enhancedPrompt += ', high quality, detailed, professional art, cinematic lighting';

    return enhancedPrompt;
  }

  /**
   * Récupère toutes les images du projet
   */
  getProjectImages(): ImageMetadata[] {
    return Array.from(this.images.values())
      .filter(img => img.projectId === this.currentProjectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Récupère les images par contexte
   */
  getImagesByContext(type: ImageGenerationContext['type'], contextId?: string): ImageMetadata[] {
    return this.getProjectImages().filter(img => {
      if (img.contextType !== type) return false;
      if (contextId && img.contextId !== contextId) return false;
      return true;
    });
  }

  /**
   * Récupère les images favorites
   */
  getFavoriteImages(): ImageMetadata[] {
    return this.getProjectImages().filter(img => img.favorite);
  }

  /**
   * Recherche d'images par tags ou prompt
   */
  searchImages(query: string, tags: string[] = []): ImageMetadata[] {
    const lowercaseQuery = query.toLowerCase();

    return this.getProjectImages().filter(img => {
      // Recherche dans le prompt
      const promptMatch = img.prompt.toLowerCase().includes(lowercaseQuery) ||
                         (img.revisedPrompt && img.revisedPrompt.toLowerCase().includes(lowercaseQuery));

      // Recherche dans les tags
      const tagMatch = tags.length === 0 || tags.some(tag =>
        img.tags.some(imgTag => imgTag.toLowerCase().includes(tag.toLowerCase()))
      );

      // Recherche dans le contexte
      const contextMatch = !query || (
        (img.contextName && img.contextName.toLowerCase().includes(lowercaseQuery)) ||
        img.contextType.toLowerCase().includes(lowercaseQuery)
      );

      return (promptMatch || contextMatch) && tagMatch;
    });
  }

  /**
   * Met à jour les métadonnées d'une image
   */
  updateImageMetadata(imageId: string, updates: Partial<ImageMetadata>): boolean {
    const image = this.images.get(imageId);
    if (!image) return false;

    const updatedImage = {
      ...image,
      ...updates,
      updatedAt: new Date()
    };

    this.images.set(imageId, updatedImage);
    this.saveProjectImages();

    notificationService.success('Image mise à jour', 'Les métadonnées ont été sauvegardées');
    return true;
  }

  /**
   * Marque/démarque une image comme favorite
   */
  toggleFavorite(imageId: string): boolean {
    const image = this.images.get(imageId);
    if (!image) return false;

    return this.updateImageMetadata(imageId, { favorite: !image.favorite });
  }

  /**
   * Ajoute une note à une image
   */
  addImageNote(imageId: string, note: string): boolean {
    const image = this.images.get(imageId);
    if (!image) return false;

    const currentNotes = image.notes || '';
    const updatedNotes = currentNotes ? `${currentNotes}\n\n${note}` : note;

    return this.updateImageMetadata(imageId, { notes: updatedNotes });
  }

  /**
   * Marque une utilisation de l'image
   */
  markImageUsage(imageId: string, usage: string): boolean {
    const image = this.images.get(imageId);
    if (!image) return false;

    const usedIn = image.usedIn || [];
    if (usedIn.includes(usage)) return true; // Déjà marqué

    return this.updateImageMetadata(imageId, {
      usedIn: [...usedIn, usage]
    });
  }

  /**
   * Supprime une image
   */
  deleteImage(imageId: string): boolean {
    const image = this.images.get(imageId);
    if (!image) return false;

    // Supprimer des collections
    this.collections.forEach(collection => {
      collection.imageIds = collection.imageIds.filter(id => id !== imageId);
    });

    this.images.delete(imageId);
    this.saveProjectImages();

    notificationService.info('Image supprimée', 'L\'image a été retirée de la galerie');
    return true;
  }

  /**
   * Crée une nouvelle collection
   */
  createCollection(name: string, description?: string, imageIds: string[] = []): ImageCollection {
    const collection: ImageCollection = {
      id: `coll_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      projectId: this.currentProjectId,
      imageIds,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      isPublic: false,
    };

    this.collections.set(collection.id, collection);
    this.saveProjectImages();

    notificationService.success('Collection créée', `Collection "${name}" créée avec succès`);
    return collection;
  }

  /**
   * Ajoute une image à une collection
   */
  addImageToCollection(collectionId: string, imageId: string): boolean {
    const collection = this.collections.get(collectionId);
    if (!collection) return false;

    if (collection.imageIds.includes(imageId)) return true; // Déjà dans la collection

    collection.imageIds.push(imageId);
    collection.updatedAt = new Date();
    this.saveProjectImages();

    return true;
  }

  /**
   * Retire une image d'une collection
   */
  removeImageFromCollection(collectionId: string, imageId: string): boolean {
    const collection = this.collections.get(collectionId);
    if (!collection) return false;

    collection.imageIds = collection.imageIds.filter(id => id !== imageId);
    collection.updatedAt = new Date();
    this.saveProjectImages();

    return true;
  }

  /**
   * Récupère toutes les collections du projet
   */
  getProjectCollections(): ImageCollection[] {
    return Array.from(this.collections.values())
      .filter(coll => coll.projectId === this.currentProjectId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Supprime une collection
   */
  deleteCollection(collectionId: string): boolean {
    const collection = this.collections.get(collectionId);
    if (!collection) return false;

    this.collections.delete(collectionId);
    this.saveProjectImages();

    notificationService.info('Collection supprimée', `Collection "${collection.name}" supprimée`);
    return true;
  }

  /**
   * Télécharge une image (utilise une API Electron ou ouvre dans un nouvel onglet)
   */
  downloadImage(imageId: string): void {
    const image = this.images.get(imageId);
    if (!image) {
      notificationService.error('Erreur', 'Image non trouvée');
      return;
    }

    // Dans un environnement Electron, utiliser l'API de téléchargement
    if (window.electronAPI) {
      window.electronAPI.downloadFile(image.url, `storycore_image_${image.id}.png`);
    } else {
      // Ouvrir dans un nouvel onglet pour téléchargement manuel
      window.open(image.url, '_blank');
    }

    notificationService.success('Téléchargement', 'Image ouverte pour téléchargement');
  }

  /**
   * Exporte les métadonnées des images (JSON)
   */
  exportImageMetadata(): string {
    const exportData = {
      projectId: this.currentProjectId,
      exportedAt: new Date().toISOString(),
      images: this.getProjectImages(),
      collections: this.getProjectCollections(),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importe des métadonnées d'images
   */
  importImageMetadata(jsonData: string): boolean {
    try {
      const importData = JSON.parse(jsonData);

      if (importData.images && Array.isArray(importData.images)) {
        importData.images.forEach((imgData: any) => {
          const image: ImageMetadata = {
            ...imgData,
            createdAt: new Date(imgData.createdAt),
            updatedAt: new Date(),
            projectId: this.currentProjectId, // Assigner au projet actuel
          };
          this.images.set(image.id, image);
        });
      }

      if (importData.collections && Array.isArray(importData.collections)) {
        importData.collections.forEach((collData: any) => {
          const collection: ImageCollection = {
            ...collData,
            createdAt: new Date(collData.createdAt),
            updatedAt: new Date(),
            projectId: this.currentProjectId, // Assigner au projet actuel
          };
          this.collections.set(collection.id, collection);
        });
      }

      this.saveProjectImages();
      notificationService.success('Import réussi', `${importData.images?.length || 0} images et ${importData.collections?.length || 0} collections importées`);
      return true;
    } catch (error) {
      console.error('Failed to import image metadata:', error);
      notificationService.error('Erreur d\'import', 'Format de données invalide');
      return false;
    }
  }

  /**
   * Statistiques de la galerie
   */
  getGalleryStats() {
    const images = this.getProjectImages();
    const collections = this.getProjectCollections();

    return {
      totalImages: images.length,
      favoriteImages: images.filter(img => img.favorite).length,
      totalCollections: collections.length,
      imagesByType: {
        character: images.filter(img => img.contextType === 'character').length,
        world: images.filter(img => img.contextType === 'world').length,
        location: images.filter(img => img.contextType === 'location').length,
        object: images.filter(img => img.contextType === 'object').length,
        scene: images.filter(img => img.contextType === 'scene').length,
        general: images.filter(img => img.contextType === 'general').length,
      },
      storageUsed: images.reduce((total, img) => total + (img.fileSize || 0), 0),
    };
  }
}

// Export de l'instance singleton
export const imageGalleryService = ImageGalleryService.getInstance();
