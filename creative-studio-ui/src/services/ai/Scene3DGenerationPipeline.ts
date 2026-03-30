import { Location } from '../../types/location';
import { backgroundRemovalService } from './BackgroundRemovalService';
import { promptOptimizer } from './PromptOptimizationService';
import { logger } from '@/utils/logger';
import { BACKEND_URL } from '@/config/apiConfig';

export interface Scene3DGenerationState {
  status: 'idle' | 'generating_skybox' | 'generating_terrain_textures' | 'analyzing_elements' | 'erasing_mobiles' | 'extracting_assets' | 'matching_assets' | 'generating_3d_models' | 'composing_scene' | 'complete' | 'error';
  progress: number;
  message: string;
}

export interface TerrainTextureMap {
  diffuseUrl: string; // The generated 512x512 tile
  normalUrl?: string; // Optional normal map
  type: 'grass' | 'road' | 'moss' | 'dirt' | 'custom';
  alphaMaskUrl?: string; // Black and white mask for blending/splat map
}

export interface ExtractedElement {
  id: string;
  type: 'mountain' | 'tree' | 'road' | 'building' | 'other';
  originalImageCoords: { x: number; y: number; w: number; h: number };
  studioImageUrl?: string; // Image with white background
  model3DUrl?: string; // Generated GLB/GLTF
  position: { x: number; y: number; z: number };
  assetSource?: 'generated' | 'reused'; // Indique si l'asset a été généré ou réutilisé depuis la bibliothèque
  metadata?: Record<string, unknown>;
}

export interface ComposedScene {
  skyboxUrl: string;
  elements: ExtractedElement[];
  terrainTextures?: TerrainTextureMap[]; // Textures multi-couches (Splat mapping)
}

export interface Scene3DGenerationOptions {
  mode: 'perspective' | 'isometric';
  extractBuildingsIndividually?: boolean;
}

/**
 * Service expérimental pour la modélisation complète de scènes 3D automatisées.
 * Se base sur le flux : 
 * 1. Générer le cube (skybox)
 * 2. Analyser les éléments pertinents (montagnes, arbres, routes, bâtiments)
 * 3. Effacer les éléments mobiles (personnages, véhicules, animaux)
 * 4. Extraire chaque élément sur fond blanc
 * 5. Recréer en 3D via API
 * 6. Replacer dans la position déterminée
 * 
 * NOTE SUR L'ISOMÉTRIE :
 * L'utilisateur a suggéré une approche isométrique. Cette approche est effectivement 
 * BEAUCOUP plus robuste et "facile" pour l'IA actuelle.
 * 1. La grille isométrique simplifie le placement (pas de calcul de projection de profondeur complexe).
 * 2. Générer des bâtiments individuellement en iso donne d'excellents assets réutilisables.
 * 3. On évite l'effet "carton plat" (billboarding) des extractions de perspective.
 */
export class Scene3DGenerationPipeline {
  
  /**
   * Lance le pipeline de conversion d'une location 2D vers une scène 3D (ou Isométrique)
   */
  static async buildSceneFromLocation(
    location: Location, 
    options: Scene3DGenerationOptions = { mode: 'isometric', extractBuildingsIndividually: true },
    onProgress?: (state: Scene3DGenerationState) => void
  ): Promise<ComposedScene> {
    
    // Étape 1 : Génération du Cube / fond de base (Skybox ou Terrain + Ciel Iso)
    this.updateProgress(onProgress, 'generating_skybox', 10, options.mode === 'isometric' ? 'Génération de la grille isométrique de base...' : 'Génération des faces de la skybox (cube) depuis la base du lieu...');
    const skyboxUrl = await this.generateSkybox(location, options.mode);

    // Étape 1.5 : Génération des textures de sol (Top-Down Splat Mapping)
    let terrainTextures: TerrainTextureMap[] = [];
    if (options.mode === 'isometric') {
      this.updateProgress(onProgress, 'generating_terrain_textures', 20, 'Génération des tuiles de texture (Herbe, Route, Mousse) depuis la vue de dessus...');
      terrainTextures = await this.generateTerrainTextures(skyboxUrl);
    }

    // Étape 2 : Analyse et détection (Segmentation)
    this.updateProgress(onProgress, 'analyzing_elements', 30, options.extractBuildingsIndividually ? 'Analyse de la scène : repérage individuel de chaque bâtiment/élément...' : 'Analyse de la scène : repérage des montagnes, arbres, routes et bâtiments...');
    const detectedElements = await this.analyzeSceneElements(skyboxUrl, options.mode);
    
    // Détection des éléments mobiles (à jeter)
    const mobileElements = await this.detectMobileElements(skyboxUrl);

    // Étape 3 : Effacer les éléments mobiles (Inpainting)
    this.updateProgress(onProgress, 'erasing_mobiles', 45, 'Effacement des éléments mobiles (personnages, véhicules)...');
    const cleanSkyboxUrl = await this.eraseElements(skyboxUrl, mobileElements);

    // Étape 4 : Isoler sur fond studio blanc
    this.updateProgress(onProgress, 'extracting_assets', 60, 'Extraction des éléments de décor sur fond blanc...');
    const extractedAssets = await Promise.all(
      detectedElements.map(el => this.extractToStudioBackground(cleanSkyboxUrl, el))
    );

    // Étape 4.5 : Réutilisation d'assets existants (Optimisation)
    this.updateProgress(onProgress, 'matching_assets', 70, 'Recherche d\'assets existants dans la bibliothèque pour réutilisation...');
    const matchedAssets = await this.matchWithExistingAssets(extractedAssets);

    // Étape 5 : Génération 3D via API (uniquement pour les assets non réutilisés)
    this.updateProgress(onProgress, 'generating_3d_models', 80, 'Génération des modèles 3D individuels via API...');
    const models3D = await Promise.all(
      matchedAssets.map(asset => this.generate3DModel(asset))
    );

    // Étape 6 : Composition
    this.updateProgress(onProgress, 'composing_scene', 95, 'Replacement spatial des modèles 3D dans le cube...');
    const composedElements = this.composeSpatialScene(cleanSkyboxUrl, models3D, options.mode);

    this.updateProgress(onProgress, 'complete', 100, options.mode === 'isometric' ? 'Scène Isométrique générée avec succès !' : 'Scène 3D générée avec succès !');

    return {
      skyboxUrl: cleanSkyboxUrl,
      elements: composedElements,
      terrainTextures
    };
  }

  // ---- DUMMY IMPLEMENTATIONS POUR LA STRUCTURE ----

  private static updateProgress(cb: ((s: Scene3DGenerationState) => void) | undefined, status: Scene3DGenerationState['status'], progress: number, message: string) {
    if (cb) cb({ status, progress, message });
  }

  private static async generateSkybox(location: Location, mode: 'perspective' | 'isometric'): Promise<string> {
    await new Promise(r => setTimeout(r, 1000));
    return location.metadata.tile_image_path || (mode === 'isometric' ? 'iso_grid_base.png' : 'default_skybox.png');
  }

  private static async generateTerrainTextures(_skyboxUrl: string): Promise<TerrainTextureMap[]> {
    await new Promise(r => setTimeout(r, 1200));
    return [
      { diffuseUrl: 'grass_512.png', type: 'grass', alphaMaskUrl: 'grass_mask.png' },
      { diffuseUrl: 'moss_512.png', type: 'moss', alphaMaskUrl: 'moss_mask.png' },
      { diffuseUrl: 'road_512.png', type: 'road', alphaMaskUrl: 'road_mask.png' }
    ];
  }

  private static async analyzeSceneElements(_imageUrl: string, _mode: 'perspective' | 'isometric'): Promise<ExtractedElement[]> {
    await new Promise(r => setTimeout(r, 1000));
    return [
      { id: 'tree-1', type: 'tree', originalImageCoords: { x: 10, y: 10, w: 100, h: 200 }, position: { x: -2, y: 0, z: -5 } },
      { id: 'building-1', type: 'building', originalImageCoords: { x: 300, y: 50, w: 200, h: 400 }, position: { x: 4, y: 0, z: -10 } }
    ];
  }

  private static async detectMobileElements(_imageUrl: string): Promise<{ type: string }[]> {
    await new Promise(r => setTimeout(r, 500));
    return [{ type: 'character' }, { type: 'vehicle' }];
  }

  private static async eraseElements(imageUrl: string, _elementsToRemove: { type: string }[]): Promise<string> {
    await new Promise(r => setTimeout(r, 800));
    return imageUrl; // Renvoie la version inpaintée
  }

  private static async extractToStudioBackground(imageUrl: string, element: ExtractedElement): Promise<ExtractedElement> {
    logger.info(`[Scene3DGeneration] Extracting element ${element.id} to studio background...`);
    
    try {
      // Use real background removal service instead of simulation
      const result = await backgroundRemovalService.removeBackground(imageUrl, {
        backend: 'rembg',
        alphaMatting: true,
        outputFormat: 'png'
      });

      if (result.success && result.foregroundUrl) {
        return { ...element, studioImageUrl: result.foregroundUrl };
      } else {
        logger.warn(`[Scene3DGeneration] Background removal failed for ${element.id}: ${result.error}`);
        return { ...element, studioImageUrl: imageUrl }; // Fallback to original
      }
    } catch (error) {
      logger.error(`[Scene3DGeneration] Error extracting element ${element.id}:`, error);
      return { ...element, studioImageUrl: imageUrl };
    }
  }

  private static async matchWithExistingAssets(elements: ExtractedElement[]): Promise<ExtractedElement[]> {
    await new Promise(r => setTimeout(r, 500));
    return elements.map(el => {
      // Simulation: on décide aléatoirement si un asset existant correspond (ex: un arbre ou une poubelle)
      // Dans le vrai code, on comparerait les tags/features de l'image extraite avec notre base d'assets.
      // 
      // TODO (Future) : Mettre en place un "Asset Shop / Marketplace" communautaire !
      // Les utilisateurs pourront poster, partager, ou même vendre leurs modèles 3D générés.
      // Cela créera une gigantesque bibliothèque partagée, permettant à tout le monde 
      // de gagner énormément de temps de calcul/génération IA !
      const isCommonProp = ['tree', 'other'].includes(el.type);
      if (isCommonProp && Math.random() > 0.5) {
        return { 
          ...el, 
          assetSource: 'reused', 
          model3DUrl: 'reused_asset_from_library.glb' 
        };
      }
      return el;
    });
  }

  /**
   * Utilisation de la technologie tttLRM pour une reconstruction de haute qualité
   */
  private static async generate3DModel(element: ExtractedElement): Promise<ExtractedElement> {
    if (element.assetSource === 'reused') return element;

    // 1. Optimisation du Prompt via GDPval (3D Technical Artist)
    const elementDesc = `${element.type} for a cinematic scene`;
    const technicalPrompt = await promptOptimizer.optimize3DPrompt(elementDesc);
    logger.info(`[Scene3DGeneration] Optimized prompt for ${element.id}: ${technicalPrompt}`);

    // 2. Génération avec tttLRM
    if (element.type === 'building' || element.type === 'other') {
      const modelUrl = await this.generate3DWithTTTLRM(element.studioImageUrl || '', technicalPrompt);
      if (modelUrl) {
        return { ...element, model3DUrl: modelUrl, metadata: { technicalPrompt } };
      }
    }

    // Fallback pour les arbres ou en cas d'échec de tttLRM
    if (element.type === 'tree') {
      await new Promise(r => setTimeout(r, 1000));
    } else {
      await new Promise(r => setTimeout(r, 1500));
    }
    
    return { ...element, model3DUrl: 'generated_model.glb' };
  }

  /**
   * Intègre la technologie tttLRM pour une reconstruction de haute qualité (Gaussian Splatting)
   */
  private static async generate3DWithTTTLRM(imagePath: string, prompt: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ttt-lrm/reconstruct/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: imagePath,
          promptHint: prompt,
          mode: 'ttt_adapted',
          output_format: '3dgs'
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      
      const data = await response.json();
      return data.output_path;
    } catch (error) {
      console.error('TTT-LRM Reconstruction failed, falling back to legacy generation:', error);
      return '';
    }
  }

  /**
   * Reconstruction complète de scène 360 via tttLRM Autoregressive
   */
  public static async reconstructFullScene360(videoPath: string): Promise<string> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ttt-lrm/reconstruct/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_path: videoPath,
          mode: 'autoregressive',
          output_format: '3dgs'
        })
      });
      
      const data = await response.json();
      return data.output_path;
    } catch (error) {
      console.error('Full 360 scene reconstruction failed:', error);
      return '';
    }
  }

  private static composeSpatialScene(_skyboxUrl: string, elements: ExtractedElement[], _mode: 'perspective' | 'isometric'): ExtractedElement[] {
    // Calcul de la profondeur et map 2D -> 3D
    // En isométrique, c'est beaucoup plus simple, on snap sur une grille (x, z)
    return elements;
  }
}
