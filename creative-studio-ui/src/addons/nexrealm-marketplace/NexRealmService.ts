/**
 * NexRealm Service
 * Client API pour le marketplace nexrealm.shop
 * Gère la recherche, le téléchargement et l'installation d'assets.
 */

import type {
  NexRealmAsset,
  NexRealmSearchFilters,
  NexRealmSearchResult,
  NexRealmHomepage,
  NexRealmApiResponse,
  InstallProgress,
  NexRealmCollection,
} from './nexrealmTypes';

// ─── Config ──────────────────────────────────────────────────────────────────

const NEXREALM_BASE_URL = 'https://nexrealm.store/api/v1';
const NEXREALM_MARKETPLACE_URL = `${NEXREALM_BASE_URL}/marketplace`;
const REQUEST_TIMEOUT_MS = 15000;

// ─── Mock Data (fallback offline) ────────────────────────────────────────────

const MOCK_AUTHORS = {
  storyCoreTeam: {
    id: 'storycore-team',
    username: 'StoryCoreTeam',
    displayName: 'StoryCore Official',
    avatarUrl: '',
    verified: true,
    totalAssets: 24,
    rating: 4.9,
    joinedAt: '2025-01-01',
    bio: 'Official StoryCore Engine development team.'
  },
  nexCreator: {
    id: 'nex-creator-01',
    username: 'PixelForge3D',
    displayName: 'PixelForge 3D Studio',
    avatarUrl: '',
    verified: true,
    totalAssets: 87,
    rating: 4.7,
    joinedAt: '2025-03-15',
    bio: 'Spécialiste en assets 3D cinématographiques.'
  },
  indie01: {
    id: 'indie-01',
    username: 'NarrativeArts',
    displayName: 'Narrative Arts',
    avatarUrl: '',
    verified: false,
    totalAssets: 12,
    rating: 4.3,
    joinedAt: '2025-09-01',
  },
};

const MOCK_COMPATIBILITY = {
  standard: {
    storyCoreMinVersion: '3.0.0',
    platforms: ['windows', 'linux'] as ('windows' | 'linux' | 'macos')[],
    requires: [],
    conflicts: [],
  }
};

const MOCK_ASSETS: NexRealmAsset[] = [
  // ─── ADDONS OFFICIELS ───────────────────────────────────────────────────
  {
    id: 'addon-nexrealm-video-gen',
    slug: 'seedance-pro-video-generator',
    name: 'Seedance Pro Video Generator',
    tagline: 'Génération vidéo AI haute fidélité via Seedance API',
    description: 'Générez des vidéos cinématographiques avec synchronisation audio native et assets 3D via Seedance 2.0.',
    category: 'addon',
    subcategory: 'processing',
    tags: ['video', 'ai', 'seedance', 'generation', 'cinematic'],
    author: MOCK_AUTHORS.storyCoreTeam,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Seedance Pro preview' }],
    thumbnail: '',
    price: { model: 'freemium', amount: 29, currency: 'EUR', freeFeatures: ['720p export', '10 renders/month'], premiumFeatures: ['4K export', 'Unlimited renders', 'Priority queue'] },
    rating: 4.8, reviewCount: 143, downloadCount: 5420, likeCount: 892, viewCount: 21000,
    trending: true, featured: true, newRelease: false,
    version: '2.1.0', releaseDate: '2026-01-15', updatedAt: '2026-02-20',
    fileSize: 2400000, fileFormat: ['.zip'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: false,
  },
  {
    id: 'addon-asset-creator',
    slug: 'storycore-asset-creator-3d',
    name: 'StoryCore Asset Creator 3D',
    tagline: 'De l\'image 2D à l\'objet 3D en un clic avec Trellis2 + Blender',
    description: 'Bridge entre ComfyUI Trellis2 et Blender pour générer props 3D et puppets de personnages instantanément.',
    category: 'addon',
    subcategory: 'processing',
    tags: ['3d', 'blender', 'trellis', 'comfyui', 'assets'],
    author: MOCK_AUTHORS.storyCoreTeam,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Asset Creator 3D preview' }],
    thumbnail: '',
    price: { model: 'free' },
    rating: 4.9, reviewCount: 204, downloadCount: 8750, likeCount: 1450, viewCount: 32000,
    trending: true, featured: true, newRelease: false,
    version: '1.5.0', releaseDate: '2025-12-01', updatedAt: '2026-02-10',
    fileSize: 1800000, fileFormat: ['.zip'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },

  // ─── PERSONNAGES ──────────────────────────────────────────────────────────
  {
    id: 'char-detective-noir',
    slug: 'detective-noir-pack',
    name: 'Detective Noir — Character Pack',
    tagline: 'Personnage complet pour films noirs : fiche, lore, LoRA inclus',
    description: 'Pack personnage complet : Character Sheet (face/profil/dos), lore de 1500 mots, prompts optimisés Flux, LoRA fine-tuné pour cohérence visuelle.',
    category: 'character',
    subcategory: 'human',
    tags: ['noir', 'detective', 'lora', 'character-sheet', 'cinematic'],
    author: MOCK_AUTHORS.nexCreator,
    previews: [
      { type: 'image', url: '', thumbnail: '', alt: 'Detective Noir front' },
      { type: 'image', url: '', thumbnail: '', alt: 'Detective Noir profile' },
    ],
    thumbnail: '',
    price: { model: 'paid', amount: 12, currency: 'EUR' },
    rating: 4.7, reviewCount: 89, downloadCount: 1240, likeCount: 310, viewCount: 8900,
    trending: false, featured: true, newRelease: false,
    version: '1.2.0', releaseDate: '2025-11-01', updatedAt: '2026-01-05',
    fileSize: 45000000,
    fileFormat: ['.json', '.safetensors', '.png'],
    compatibility: { ...MOCK_COMPATIBILITY.standard },
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },
  {
    id: 'char-sci-fi-crew',
    slug: 'sci-fi-crew-5-characters',
    name: 'Sci-Fi Crew — 5 Characters Bundle',
    tagline: '5 personnages SF prêts pour votre pipeline StoryCore',
    description: 'Bundle de 5 personnages SF cohérents (Captain, Engineer, Medic, Pilot, AI Companion). Fiches complètes, lore, palettes couleurs, LoRAs.',
    category: 'character',
    subcategory: 'sci-fi',
    tags: ['sci-fi', 'bundle', 'crew', 'spaceship', 'characters'],
    author: MOCK_AUTHORS.nexCreator,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Sci-Fi Crew preview' }],
    thumbnail: '',
    price: { model: 'paid', amount: 39, currency: 'EUR', originalAmount: 55, discount: 29 },
    rating: 4.9, reviewCount: 51, downloadCount: 780, likeCount: 220, viewCount: 5600,
    trending: true, featured: false, newRelease: true,
    version: '1.0.0', releaseDate: '2026-02-15', updatedAt: '2026-02-15',
    fileSize: 180000000,
    fileFormat: ['.zip', '.json', '.safetensors'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },

  // ─── LOCATIONS / LIEUX ────────────────────────────────────────────────────
  {
    id: 'loc-paris-1920',
    slug: 'paris-1920s-location-pack',
    name: 'Paris 1920s — Location Pack',
    tagline: 'Ambiances authentiques Paris années folles pour vos scènes',
    description: 'Pack complet de 8 décors parisiens années 1920 : cafés, rues pavées, appartements, cabarets. Inclut style guides, lighting references et prompts cinématiques optimisés.',
    category: 'location',
    subcategory: 'historical',
    tags: ['paris', 'historical', '1920s', 'jazz-age', 'interior', 'exterior'],
    author: MOCK_AUTHORS.indie01,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Paris 1920s location' }],
    thumbnail: '',
    price: { model: 'paid', amount: 18, currency: 'EUR' },
    rating: 4.6, reviewCount: 34, downloadCount: 620, likeCount: 180, viewCount: 4200,
    trending: false, featured: false, newRelease: false,
    version: '1.1.0', releaseDate: '2025-10-01', updatedAt: '2025-12-10',
    fileSize: 85000000,
    fileFormat: ['.zip', '.json', '.png'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },
  {
    id: 'loc-space-station',
    slug: 'orbital-station-nexus-location',
    name: 'Orbital Station "Nexus" — Location',
    tagline: 'Station spatiale complète pour vos récits SF',
    description: 'Station spatiale orbitale modulaire : 12 zones (pont commandement, laboratoire, salle des machines, dortoirs, sas). Style guides hard-SF inclus.',
    category: 'location',
    subcategory: 'sci-fi',
    tags: ['space', 'sci-fi', 'station', 'interior', 'futuristic'],
    author: MOCK_AUTHORS.nexCreator,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Orbital Station' }],
    thumbnail: '',
    price: { model: 'free' },
    rating: 4.8, reviewCount: 127, downloadCount: 4100, likeCount: 780, viewCount: 15000,
    trending: true, featured: true, newRelease: false,
    version: '2.0.0', releaseDate: '2025-09-01', updatedAt: '2026-01-20',
    fileSize: 120000000,
    fileFormat: ['.zip', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'cc-by', allowsRedistribution: true, allowsModification: true,
  },

  // ─── SCENES 3D ─────────────────────────────────────────────────────────────
  {
    id: 'scene3d-cinematic-studio',
    slug: 'cinematic-studio-3d-scene',
    name: 'Cinematic Studio — Complete 3D Scene',
    tagline: 'Studio photo/cinéma professionnel entièrement configuré',
    description: 'Scène 3D de studio cinéma complet : cycloramas, rigging lumière 3-points, fond noir/blanc/vert, caméras préconfigurées, props. Format GLB + StoryCore VDC.',
    category: 'scene3d',
    subcategory: 'studio',
    tags: ['studio', '3d', 'cinema', 'lights', 'glb', 'vdc'],
    author: MOCK_AUTHORS.nexCreator,
    previews: [{ type: 'model3d', url: '', thumbnail: '', alt: 'Studio 3D' }],
    thumbnail: '',
    price: { model: 'paid', amount: 24, currency: 'EUR' },
    rating: 4.5, reviewCount: 67, downloadCount: 1890, likeCount: 410, viewCount: 11000,
    trending: false, featured: true, newRelease: false,
    version: '1.3.0', releaseDate: '2025-08-01', updatedAt: '2026-02-01',
    fileSize: 250000000,
    fileFormat: ['.glb', '.blend', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },
  {
    id: 'scene3d-enchanted-forest',
    slug: 'enchanted-forest-procedural-scene',
    name: 'Enchanted Forest — Procedural 3D Scene',
    tagline: 'Forêt enchantée procédurale compatible ProceduralTree Engine',
    description: 'Forêt fantasy procédurale : 15 espèces d\'arbres, sous-bois, cours d\'eau, éclairage volumétrique magique. Compatible avec le moteur ProceduralTree de StoryCore.',
    category: 'scene3d',
    subcategory: 'outdoor',
    tags: ['forest', 'fantasy', 'procedural', '3d', 'nature', 'magic'],
    author: MOCK_AUTHORS.indie01,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Enchanted Forest' }],
    thumbnail: '',
    price: { model: 'paid', amount: 15, currency: 'EUR' },
    rating: 4.7, reviewCount: 42, downloadCount: 980, likeCount: 290, viewCount: 7800,
    trending: true, featured: false, newRelease: true,
    version: '1.0.0', releaseDate: '2026-02-20', updatedAt: '2026-02-20',
    fileSize: 190000000,
    fileFormat: ['.glb', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },

  // ─── OBJETS / PROPS ────────────────────────────────────────────────────────
  {
    id: 'obj-vehicles-urban',
    slug: 'urban-vehicles-pack-2026',
    name: 'Urban Vehicles Pack 2026',
    tagline: '50 véhicules urbains prêts pour vos scènes citadines',
    description: 'Collection de 50 véhicules urbains contemporains (voitures, bus, motos, vélos, camions). Textures PBR, LODs multiples, compatible VDC pour placement vocal.',
    category: 'object',
    subcategory: 'vehicle',
    tags: ['vehicles', 'urban', 'pbr', '3d', 'city', 'vdc'],
    author: MOCK_AUTHORS.nexCreator,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Urban Vehicles' }],
    thumbnail: '',
    price: { model: 'paid', amount: 35, currency: 'EUR', originalAmount: 50, discount: 30 },
    rating: 4.6, reviewCount: 95, downloadCount: 2340, likeCount: 560, viewCount: 13000,
    trending: false, featured: false, newRelease: false,
    version: '2.0.0', releaseDate: '2025-07-01', updatedAt: '2026-01-10',
    fileSize: 800000000,
    fileFormat: ['.glb', '.fbx', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: true,
  },

  // ─── STYLES / LUTS ────────────────────────────────────────────────────────
  {
    id: 'style-cyberpunk-luts',
    slug: 'cyberpunk-cinematic-luts-pack',
    name: 'Cyberpunk Cinematic LUTs Pack',
    tagline: '20 LUTs cinématiques pour un rendu cyberpunk authentique',
    description: '20 LUTs professionnelles inspirées des films cyberpunk. Neon nights, acid rain, holo-district, corporate grey. Compatible tous générateurs images StoryCore.',
    category: 'style',
    subcategory: 'cinematic',
    tags: ['lut', 'cyberpunk', 'color-grading', 'cinematic', 'neon'],
    author: MOCK_AUTHORS.indie01,
    previews: [{ type: 'image', url: '', thumbnail: '', alt: 'Cyberpunk LUTs' }],
    thumbnail: '',
    price: { model: 'free' },
    rating: 4.9, reviewCount: 312, downloadCount: 15600, likeCount: 2800, viewCount: 48000,
    trending: true, featured: true, newRelease: false,
    version: '1.0.0', releaseDate: '2025-05-01', updatedAt: '2025-05-01',
    fileSize: 12000000,
    fileFormat: ['.cube', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'cc0', allowsRedistribution: true, allowsModification: true,
  },

  // ─── AUDIO ────────────────────────────────────────────────────────────────
  {
    id: 'audio-sci-fi-ambiances',
    slug: 'sci-fi-ambient-soundscapes',
    name: 'Sci-Fi Ambient Soundscapes Pack',
    tagline: '40 ambiances SF pour vos projets cinématographiques',
    description: '40 soundscapes d\'ambiance SF (vaisseaux, stations, planètes, hyperdrive, laboratoires). Formats WAV 24-bit + metadata StoryCore pour synchronisation automatique.',
    category: 'audio',
    subcategory: 'ambient',
    tags: ['audio', 'sci-fi', 'ambiance', 'soundscape', 'wav'],
    author: MOCK_AUTHORS.indie01,
    previews: [{ type: 'audio', url: '', thumbnail: '', alt: 'Sci-Fi Ambient' }],
    thumbnail: '',
    price: { model: 'paid', amount: 22, currency: 'EUR' },
    rating: 4.8, reviewCount: 78, downloadCount: 2100, likeCount: 490, viewCount: 9500,
    trending: false, featured: false, newRelease: false,
    version: '1.0.0', releaseDate: '2025-06-01', updatedAt: '2025-10-15',
    fileSize: 680000000,
    fileFormat: ['.wav', '.mp3', '.json'],
    compatibility: MOCK_COMPATIBILITY.standard,
    license: 'commercial', allowsRedistribution: false, allowsModification: false,
  },
];

const MOCK_HOMEPAGE: NexRealmHomepage = {
  hero: MOCK_ASSETS[0],
  featured: MOCK_ASSETS.filter(a => a.featured).slice(0, 4),
  trending: MOCK_ASSETS.filter(a => a.trending).slice(0, 6),
  newReleases: MOCK_ASSETS.filter(a => a.newRelease).slice(0, 4),
  freeOfWeek: MOCK_ASSETS.find(a => a.price.model === 'free' && a.featured),
  collections: [
    {
      id: 'col-sci-fi-starter',
      name: 'Starter Pack Sci-Fi',
      description: 'Tout ce qu\'il faut pour démarrer un projet de science-fiction',
      coverImage: '',
      assets: MOCK_ASSETS.filter(a => a.tags.includes('sci-fi')),
      curatedBy: 'StoryCore Team',
      totalAssets: MOCK_ASSETS.filter(a => a.tags.includes('sci-fi')).length,
    },
    {
      id: 'col-free-assets',
      name: 'Assets 100% Gratuits',
      description: 'Des assets de qualité professionnelle, entièrement gratuits',
      coverImage: '',
      assets: MOCK_ASSETS.filter(a => a.price.model === 'free'),
      curatedBy: 'NexRealm Community',
      totalAssets: MOCK_ASSETS.filter(a => a.price.model === 'free').length,
    },
  ],
  byCategory: {
    character: MOCK_ASSETS.filter(a => a.category === 'character'),
    location: MOCK_ASSETS.filter(a => a.category === 'location'),
    scene3d: MOCK_ASSETS.filter(a => a.category === 'scene3d'),
    addon: MOCK_ASSETS.filter(a => a.category === 'addon'),
    object: MOCK_ASSETS.filter(a => a.category === 'object'),
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────

class NexRealmServiceClass {
  private baseUrl = NEXREALM_MARKETPLACE_URL;
  private isOnline = false;
  private installJobs = new Map<string, InstallProgress>();
  private listeners = new Map<string, ((progress: InstallProgress) => void)[]>();

  constructor() {
    this.checkConnectivity();
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${NEXREALM_BASE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      this.isOnline = true;
    } catch {
      this.isOnline = false;
    }
  }

  private async fetchApi<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<NexRealmApiResponse<T>> {
    if (!this.isOnline) {
      throw new Error('NexRealm offline — using local cache');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-StoryCore-Client': '3.2.0',
          ...options?.headers,
        },
        signal: controller.signal,
        ...options,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Récupère la page d'accueil du marketplace (featured, trending, etc.)
   */
  async getHomepage(): Promise<NexRealmHomepage> {
    try {
      const res = await this.fetchApi<NexRealmHomepage>('/homepage');
      return res.data;
    } catch {
      // Fallback sur les données mock
      return MOCK_HOMEPAGE;
    }
  }

  /**
   * Recherche d'assets avec filtres
   */
  async search(filters: NexRealmSearchFilters): Promise<NexRealmSearchResult> {
    try {
      const params = new URLSearchParams();
      if (filters.query) params.set('q', filters.query);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.pricingModel && filters.pricingModel !== 'all') params.set('pricing', filters.pricingModel);
      if (filters.sortBy) params.set('sort', filters.sortBy);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('limit', String(filters.pageSize));
      if (filters.minRating) params.set('min_rating', String(filters.minRating));
      if (filters.maxPrice) params.set('max_price', String(filters.maxPrice));
      if (filters.tags?.length) params.set('tags', filters.tags.join(','));

      const res = await this.fetchApi<NexRealmSearchResult>(`/search?${params}`);
      return res.data;
    } catch {
      // Fallback sur les données mock avec filtre local
      return this.mockSearch(filters);
    }
  }

  /**
   * Recherche locale dans les mocks data
   */
  private mockSearch(filters: NexRealmSearchFilters): NexRealmSearchResult {
    let results = [...MOCK_ASSETS];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.tags.some(t => t.includes(q)) ||
        a.tagline.toLowerCase().includes(q)
      );
    }

    if (filters.category && filters.category !== 'all') {
      results = results.filter(a => a.category === filters.category);
    }

    if (filters.pricingModel && filters.pricingModel !== 'all') {
      results = results.filter(a => a.price.model === filters.pricingModel);
    }

    if (filters.minRating) {
      results = results.filter(a => a.rating >= filters.minRating!);
    }

    if (filters.maxPrice !== undefined) {
      results = results.filter(a =>
        a.price.model === 'free' ||
        (a.price.amount !== undefined && a.price.amount <= filters.maxPrice!)
      );
    }

    // Tri
    switch (filters.sortBy) {
      case 'top-rated':
        results.sort((a, b) => b.rating - a.rating);
        break;
      case 'bestseller':
        results.sort((a, b) => b.downloadCount - a.downloadCount);
        break;
      case 'newest':
        results.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        break;
      case 'price-asc':
        results.sort((a, b) => (a.price.amount ?? 0) - (b.price.amount ?? 0));
        break;
      case 'price-desc':
        results.sort((a, b) => (b.price.amount ?? 0) - (a.price.amount ?? 0));
        break;
      case 'trending':
        results = results.filter(a => a.trending).concat(results.filter(a => !a.trending));
        break;
    }

    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 12;
    const start = (page - 1) * pageSize;
    const paginated = results.slice(start, start + pageSize);

    return {
      assets: paginated,
      total: results.length,
      page,
      pageSize,
      totalPages: Math.ceil(results.length / pageSize),
      filters,
      facets: {
        categories: results.reduce<Record<string, number>>((acc, a) => {
          acc[a.category] = (acc[a.category] ?? 0) + 1;
          return acc;
        }, {}),
        pricingModels: results.reduce<Record<string, number>>((acc, a) => {
          acc[a.price.model] = (acc[a.price.model] ?? 0) + 1;
          return acc;
        }, {}),
        ratings: {},
        tags: [],
      }
    };
  }

  /**
   * Récupère les détails d'un asset
   */
  async getAsset(id: string): Promise<NexRealmAsset | null> {
    try {
      const res = await this.fetchApi<NexRealmAsset>(`/assets/${id}`);
      return res.data;
    } catch {
      return MOCK_ASSETS.find(a => a.id === id) ?? null;
    }
  }

  /**
   * Récupère les assets d'une collection
   */
  async getCollection(id: string): Promise<NexRealmCollection | null> {
    try {
      const res = await this.fetchApi<NexRealmCollection>(`/collections/${id}`);
      return res.data;
    } catch {
      const hp = await this.getHomepage();
      return hp.collections.find(c => c.id === id) ?? null;
    }
  }

  /**
   * Installe un asset localement (simulation)
   */
  async installAsset(
    asset: NexRealmAsset,
    onProgress?: (progress: InstallProgress) => void
  ): Promise<boolean> {
    const progress: InstallProgress = {
      assetId: asset.id,
      status: 'downloading',
      progress: 0,
      message: 'Initialisation du téléchargement...',
    };

    this.installJobs.set(asset.id, progress);
    onProgress?.(progress);

    // Simulation d'un téléchargement progressif
    return new Promise((resolve) => {
      const steps = [
        { pct: 10, msg: 'Connexion à NexRealm...', delay: 400 },
        { pct: 30, msg: `Téléchargement de ${asset.name}...`, delay: 800 },
        { pct: 60, msg: 'Vérification de l\'intégrité...', delay: 600 },
        { pct: 75, msg: 'Extraction des fichiers...', status: 'installing' as const, delay: 700 },
        { pct: 90, msg: 'Enregistrement dans StoryCore...', delay: 500 },
        { pct: 100, msg: 'Installation terminée !', status: 'installed' as const, delay: 300 },
      ];

      let i = 0;
      const run = () => {
        if (i >= steps.length) {
          resolve(true);
          return;
        }
        const step = steps[i++];
        const updated: InstallProgress = {
          assetId: asset.id,
          status: ('status' in step ? step.status : 'downloading') as InstallProgress['status'],
          progress: step.pct,
          message: step.msg,
        };
        this.installJobs.set(asset.id, updated);
        onProgress?.(updated);
        setTimeout(run, step.delay);
      };
      setTimeout(run, 200);
    });
  }

  /**
   * Vérifie si le service NexRealm est accessible
   */
  get online(): boolean {
    return this.isOnline;
  }

  /**
   * Retourne tous les assets mock (pour les tests)
   */
  getAllMockAssets(): NexRealmAsset[] {
    return MOCK_ASSETS;
  }
}

export const NexRealmService = new NexRealmServiceClass();
