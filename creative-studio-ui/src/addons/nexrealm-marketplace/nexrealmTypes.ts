/**
 * NexRealm Marketplace Types
 * Types pour le marketplace d'assets et d'addons StoryCore via nexrealm.shop
 */

// ─── Asset Categories ────────────────────────────────────────────────────────

export type NexRealmAssetCategory =
  | 'addon'         // Add-ons StoryCore
  | 'character'     // Personnages (Character Sheets, rigs, etc.)
  | 'location'      // Lieux / Décors
  | 'scene3d'       // Scènes 3D complètes
  | 'object'        // Objets / Props
  | 'texture'       // Textures / Matériaux
  | 'audio'         // Sons / Musiques
  | 'template'      // Templates de workflow
  | 'style'         // Styles visuels / LUTs
  | 'script'        // Scripts / Dialogues de démo
  | 'bundle';       // Pack / Bundle multi-catégories

export type NexRealmAssetSubcategory = {
  addon: 'workflow' | 'ui' | 'processing' | 'integration' | 'export' | 'utility';
  character: 'human' | 'creature' | 'robot' | 'animal' | 'fantasy' | 'sci-fi';
  location: 'interior' | 'exterior' | 'urban' | 'nature' | 'fantasy' | 'sci-fi' | 'historical';
  scene3d: 'studio' | 'outdoor' | 'interior' | 'abstract' | 'cinematic';
  object: 'vehicle' | 'furniture' | 'weapon' | 'food' | 'decoration' | 'tech' | 'nature';
  texture: 'pbr' | 'stylized' | 'photorealistic' | 'abstract';
  audio: 'sfx' | 'music' | 'ambient' | 'voice' | 'foley';
  template: 'shortfilm' | 'documentary' | 'commercial' | 'comic' | 'animation';
  style: 'cinematic' | 'anime' | 'comic' | 'painterly' | 'photorealistic' | 'lo-fi';
  script: 'drama' | 'action' | 'comedy' | 'horror' | 'scifi' | 'romance';
  bundle: 'starter' | 'professional' | 'themed';
};

// ─── Pricing ─────────────────────────────────────────────────────────────────

export type PricingModel = 'free' | 'paid' | 'freemium' | 'subscription';

export interface NexRealmPrice {
  model: PricingModel;
  amount?: number;          // En euros
  currency?: string;        // 'EUR' | 'USD'
  originalAmount?: number;  // Prix avant remise
  discount?: number;        // Pourcentage de remise ex: 20 = 20%
  subscriptionPeriod?: 'monthly' | 'yearly' | 'lifetime';
  trialDays?: number;
  freeFeatures?: string[];  // Fonctionnalités disponibles en gratuit
  premiumFeatures?: string[]; // Fonctionnalités premium
}

// ─── Asset ──────────────────────────────────────────────────────────────────

export interface NexRealmAssetPreview {
  type: 'image' | 'video' | 'model3d' | 'audio';
  url: string;
  thumbnail?: string;
  alt?: string;
}

export interface NexRealmAuthor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  verified: boolean;
  totalAssets: number;
  rating: number;
  joinedAt: string;
  bio?: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    discord?: string;
  };
}

export interface NexRealmReview {
  id: string;
  authorUsername: string;
  authorAvatar?: string;
  rating: number;         // 1 à 5
  title?: string;
  body: string;
  helpful: number;        // Votes "utile"
  createdAt: string;
  verified: boolean;      // Achat vérifié
}

export interface NexRealmCompatibility {
  storyCoreMinVersion: string;
  storyCoreMaxVersion?: string;
  platforms: ('windows' | 'linux' | 'macos')[];
  requires?: string[];    // IDs d'addons requis
  conflicts?: string[];   // IDs d'addons incompatibles
}

export interface NexRealmAsset {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription?: string;
  category: NexRealmAssetCategory;
  subcategory?: string;
  tags: string[];

  // Auteur
  author: NexRealmAuthor;

  // Médias
  previews: NexRealmAssetPreview[];
  thumbnail: string;
  banner?: string;

  // Pricing
  price: NexRealmPrice;

  // Stats
  rating: number;           // 0 à 5
  reviewCount: number;
  downloadCount: number;
  likeCount: number;
  viewCount: number;
  trending: boolean;
  featured: boolean;
  newRelease: boolean;

  // Versions
  version: string;
  changelog?: string;
  releaseDate: string;
  updatedAt: string;

  // Technique
  fileSize?: number;        // En bytes
  fileFormat?: string[];    // '.json' | '.glb' | '.zip' etc.
  compatibility: NexRealmCompatibility;

  // Licence
  license: 'personal' | 'commercial' | 'cc0' | 'cc-by' | 'cc-by-sa' | 'proprietary';
  allowsRedistribution: boolean;
  allowsModification: boolean;

  // Reviews
  reviews?: NexRealmReview[];

  // État utilisateur
  isInstalled?: boolean;
  isOwned?: boolean;
  isWishlisted?: boolean;
  userRating?: number;
}

// ─── Search & Filters ────────────────────────────────────────────────────────

export type NexRealmSortBy =
  | 'relevance'
  | 'newest'
  | 'oldest'
  | 'bestseller'
  | 'top-rated'
  | 'price-asc'
  | 'price-desc'
  | 'trending'
  | 'name-asc';

export interface NexRealmSearchFilters {
  query?: string;
  category?: NexRealmAssetCategory | 'all';
  subcategory?: string;
  pricingModel?: PricingModel | 'all';
  minRating?: number;
  maxPrice?: number;
  license?: string;
  tags?: string[];
  sortBy?: NexRealmSortBy;
  page?: number;
  pageSize?: number;
  onlyInstalled?: boolean;
  onlyOwned?: boolean;
  onlyWishlisted?: boolean;
  compatibility?: string; // version StoryCore
}

export interface NexRealmSearchResult {
  assets: NexRealmAsset[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: NexRealmSearchFilters;
  facets?: {
    categories: Record<string, number>;
    pricingModels: Record<string, number>;
    ratings: Record<string, number>;
    tags: Array<{ tag: string; count: number }>;
  };
}

// ─── Collections & Bundles ───────────────────────────────────────────────────

export interface NexRealmCollection {
  id: string;
  name: string;
  description: string;
  coverImage: string;
  assets: NexRealmAsset[];
  curatedBy: string;
  totalAssets: number;
}

// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface NexRealmUser {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  tier: 'free' | 'creator' | 'pro' | 'studio';
  credits: number;           // NexCredits
  ownedAssets: string[];     // IDs des assets achetés
  wishlist: string[];        // IDs dans la wishlist
  installedAssets: string[]; // IDs installés localement
  publishedAssets: string[]; // IDs publiés par l'utilisateur
}

// ─── NexRealm API Response ───────────────────────────────────────────────────

export interface NexRealmApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  timestamp: string;
}

// ─── Install / Download ───────────────────────────────────────────────────────

export type InstallStatus = 'idle' | 'downloading' | 'installing' | 'installed' | 'error' | 'updating';

export interface InstallProgress {
  assetId: string;
  status: InstallStatus;
  progress: number;      // 0 à 100
  message?: string;
  error?: string;
}

// ─── Featured Sections ───────────────────────────────────────────────────────

export interface NexRealmHomepage {
  hero?: NexRealmAsset;
  featured: NexRealmAsset[];
  trending: NexRealmAsset[];
  newReleases: NexRealmAsset[];
  freeOfWeek?: NexRealmAsset;
  collections: NexRealmCollection[];
  byCategory: Partial<Record<NexRealmAssetCategory, NexRealmAsset[]>>;
}
