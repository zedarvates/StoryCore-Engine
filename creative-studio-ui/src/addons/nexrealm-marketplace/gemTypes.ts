/**
 * NexRealm GEM Economy — Types
 *
 * Système d'économie circulaire basé sur les GEMmes (cristaux).
 * Les créateurs gagnent des GEMmes à chaque téléchargement de leurs assets.
 * Les membres utilisent leurs GEMmes pour télécharger les créations des autres.
 * Cela encourage le partage, la créativité et la participation communautaire.
 *
 * 1 GEM  ≈ 0.10 EUR (taux de référence indicatif, non contractuel)
 * Future: intégration crypto / stablecoin optionnelle (ex: USDC sur Polygon)
 */

// ─── GEM Denominations ───────────────────────────────────────────────────────

/**
 * Types de GEMmes dans le système
 * - standard : gagné par partage, utilisable pour télécharger
 * - premium  : acheté avec de la monnaie réelle ou crypto, plus de valeur
 * - bonus    : offert par le système (bienvenue, événements, promotions)
 */
export type GemType = 'standard' | 'premium' | 'bonus';

/**
 * Tier créateur selon ses contributions à la communauté
 */
export type CreatorTier =
  | 'newcomer'     // < 100 GEMs générés (débutant)
  | 'contributor'  // 100–999 GEMs générés
  | 'creator'      // 1 000–9 999 GEMs générés
  | 'artisan'      // 10 000–49 999 GEMs générés
  | 'master'       // 50 000–199 999 GEMs générés
  | 'legend';      // 200 000+ GEMs générés (top 1%)

export const CREATOR_TIER_CONFIG: Record<CreatorTier, {
  label: string;
  icon: string;
  color: string;
  minGems: number;
  revenueShare: number;   // % des GEMs générés qui reviennent au créateur
  uploadLimit: number;    // Nb max d'assets publiés simultanément
  featuredBonus: boolean; // Accès au slot "Featured"
}> = {
  newcomer:    { label: 'Newcomer',    icon: '🌱', color: '#6b7280', minGems: 0,       revenueShare: 60, uploadLimit: 5,   featuredBonus: false },
  contributor: { label: 'Contributor', icon: '💎', color: '#8b5cf6', minGems: 100,    revenueShare: 65, uploadLimit: 20,  featuredBonus: false },
  creator:     { label: 'Creator',     icon: '🔷', color: '#6366f1', minGems: 1000,   revenueShare: 70, uploadLimit: 50,  featuredBonus: false },
  artisan:     { label: 'Artisan',     icon: '🌀', color: '#06b6d4', minGems: 10000,  revenueShare: 75, uploadLimit: 100, featuredBonus: true  },
  master:      { label: 'Master',      icon: '⚡', color: '#f59e0b', minGems: 50000,  revenueShare: 80, uploadLimit: 250, featuredBonus: true  },
  legend:      { label: 'Legend',      icon: '👑', color: '#ec4899', minGems: 200000, revenueShare: 85, uploadLimit: -1,  featuredBonus: true  },
};

// ─── GEM Wallet ───────────────────────────────────────────────────────────────

export interface GemBalance {
  standard: number;   // GEMmes gagnés via partage/téléchargements reçus
  premium: number;    // GEMmes achetés avec argent réel
  bonus: number;      // GEMmes offerts par le système
  total: number;      // Total disponible (standard + premium + bonus)
  lifetime: number;   // Total cumulé généré depuis la création du compte
  pendingPayout: number; // GEMmes en attente de versement (délai 7 jours)
}

export interface GemWallet {
  userId: string;
  balance: GemBalance;
  tier: CreatorTier;
  nextTier: CreatorTier | null;
  gemsToNextTier: number;   // GEMmes à générer pour le prochain tier
  updatedAt: string;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type GemTransactionType =
  | 'earn_download'      // Quelqu'un a téléchargé votre asset
  | 'earn_share'         // Bonus de publication initiale
  | 'earn_featured'      // Votre asset a été mis en avant
  | 'earn_rating'        // Vous avez reçu des avis positifs (5★)
  | 'earn_referral'      // Parrainage d'un nouvel utilisateur
  | 'earn_daily'         // Bonus quotidien de connexion
  | 'earn_bonus'         // Bonus événementiel (hackathon, promo)
  | 'spend_download'     // Vous avez téléchargé un asset
  | 'spend_featured'     // Vous avez acheté un slot "Featured"
  | 'purchase_gems'      // Achat de GEMmes premium avec monnaie réelle
  | 'purchase_crypto'    // Achat de GEMmes via crypto
  | 'payout_requested'   // Demande de virement de vos revenus GEM → EUR/crypto
  | 'refund'             // Remboursement suite à litige/suppression
  | 'transfer_sent'      // Transfert à un autre utilisateur
  | 'transfer_received'; // Transfert reçu d'un autre utilisateur

export interface GemTransaction {
  id: string;
  type: GemTransactionType;
  amount: number;          // Positif = gain, négatif = dépense
  gemType: GemType;
  balance_after: number;
  label: string;           // Description humaine
  assetId?: string;        // Asset concerné (si applicable)
  assetName?: string;
  otherUserId?: string;    // Autre utilisateur impliqué (si applicable)
  otherUsername?: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
  metadata?: Record<string, string | number>;
}

// ─── GEM Pricing for Assets ───────────────────────────────────────────────────

/**
 * Modèle de prix GEM d'un asset
 * Un asset peut être : gratuit, payant en GEMs, payant en EUR, ou un mix
 */
export interface GemPricing {
  // Prix en GEMmes
  gemCost?: number;         // Coût en GEMs standard
  premiumGemCost?: number;  // Coût en GEMs premium uniquement (assets exclusifs)

  // Gains du créateur par téléchargement
  gemsPerDownload: number;  // GEMs que le créateur reçoit à chaque téléchargement gratuit
  gemsPerPurchase?: number; // GEMs que le créateur reçoit si l'asset est payant

  // Modèle mixte (GEMs + EU)
  eurPrice?: number;        // Prix en EUR (en plus ou à la place des GEMs)

  // Crypto (futur)
  cryptoAccepted?: boolean;
  cryptoChains?: ('polygon' | 'solana' | 'base')[];

  // Bouquet / Abonnement
  includedInSubscription?: boolean; // Inclus dans l'abonnement NexRealm Pro
}

// ─── Publish / Share Asset ────────────────────────────────────────────────────

export type AssetFileType =
  | 'character_pack'   // Fiche personnage + LoRA + prompts
  | 'location_pack'    // Fiches décors + style guide
  | 'scene3d_glb'      // Scène 3D au format GLB/GLTF
  | 'object_glb'       // Objet/prop 3D
  | 'addon_zip'        // Add-on StoryCore (code)
  | 'audio_pack'       // Sons et musiques
  | 'style_lut'        // LUTs et presets visuels
  | 'template_zip'     // Template de workflow
  | 'texture_pack'     // Pack de textures
  | 'bundle_zip';      // Bundle multi-catégories

export interface PublishDraft {
  // Informations de base
  name: string;
  tagline: string;
  description: string;
  category: string;
  subcategory?: string;
  tags: string[];

  // Fichiers
  files: File[];
  thumbnail?: File;
  previews: File[];
  fileType: AssetFileType;

  // Pricing GEM
  gemPricing: GemPricing;

  // Licence
  license: 'personal' | 'commercial' | 'cc0' | 'cc-by' | 'cc-by-sa';
  allowsRedistribution: boolean;
  allowsModification: boolean;

  // Compatibilité
  compatibility: {
    storyCoreMinVersion: string;
    platforms: string[];
  };

  // Metadata
  isNSFW: boolean;
  ageRating: 'all' | '13+' | '18+';
}

export interface PublishResult {
  success: boolean;
  assetId?: string;
  gemsEarned?: number;     // Bonus de publication
  message: string;
}

// ─── GEM Shop / Purchase ──────────────────────────────────────────────────────

export interface GemPackage {
  id: string;
  label: string;
  gems: number;
  bonusGems: number;   // GEMs bonus offerts
  totalGems: number;   // gems + bonusGems
  eurPrice: number;
  popular?: boolean;
  bestValue?: boolean;
  icon: string;
}

export const GEM_PACKAGES: GemPackage[] = [
  {
    id: 'starter',
    label: 'Starter Crystal',
    gems: 100,
    bonusGems: 0,
    totalGems: 100,
    eurPrice: 1.99,
    icon: '💎',
  },
  {
    id: 'explorer',
    label: 'Explorer Pack',
    gems: 500,
    bonusGems: 50,
    totalGems: 550,
    eurPrice: 7.99,
    popular: true,
    icon: '🔷',
  },
  {
    id: 'creator',
    label: 'Creator Bundle',
    gems: 1500,
    bonusGems: 250,
    totalGems: 1750,
    eurPrice: 19.99,
    icon: '🌀',
  },
  {
    id: 'studio',
    label: 'Studio Pack',
    gems: 5000,
    bonusGems: 1500,
    totalGems: 6500,
    eurPrice: 59.99,
    bestValue: true,
    icon: '⚡',
  },
  {
    id: 'legend',
    label: 'Legend Reserve',
    gems: 15000,
    bonusGems: 7500,
    totalGems: 22500,
    eurPrice: 149.99,
    icon: '👑',
  },
];

// GEMs gagnés par actions spéciales
export const GEM_REWARDS = {
  PUBLISH_FIRST_ASSET: 50,      // Bonus publication de votre 1er asset
  PUBLISH_ASSET: 10,            // Bonus à chaque nouvelle publication
  FIRST_5_STAR_REVIEW: 25,      // Premier avis 5 étoiles reçu
  DAILY_BONUS: 5,               // Connexion quotidienne
  REFERRAL: 100,                // Parrainage d'un nouvel utilisateur
  FEATURED_BONUS_PER_DAY: 20,   // Par jour en "Featured"
  DOWNLOAD_FREE_ASSET: 2,       // Par téléchargement de votre asset gratuit
  DOWNLOAD_PAID_ASSET_PCT: 70,  // % du prix GEM de votre asset payant
} as const;
