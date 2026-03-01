/**
 * NexRealm Store — Zustand
 * State management pour le Marketplace NexRealm + Système GEM Economy
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { NexRealmService } from './NexRealmService';
import { GEM_REWARDS, CREATOR_TIER_CONFIG } from './gemTypes';
import type {
  NexRealmAsset,
  NexRealmSearchFilters,
  NexRealmSearchResult,
  NexRealmHomepage,
  NexRealmAssetCategory,
  InstallProgress,
  PricingModel,
  NexRealmSortBy,
} from './nexrealmTypes';
import type {
  GemWallet,
  GemTransaction,
  GemPackage,
  CreatorTier,
} from './gemTypes';

// ─── State ────────────────────────────────────────────────────────────────────

interface PublishPayload {
  name: string;
  tagline: string;
  description: string;
  category: string;
  tags: string[];
  files: File[];
  thumbnail: File | null;
  pricingModel: string;
  gemCost: number;
  eurPrice: number;
  gemsPerDownload: number;
  license: string;
  allowsRedistribution: boolean;
  allowsModification: boolean;
  isNSFW: boolean;
  minVersion: string;
}

interface NexRealmState {
  // Data
  homepage: NexRealmHomepage | null;
  searchResult: NexRealmSearchResult | null;
  selectedAsset: NexRealmAsset | null;

  // UI
  activeView: 'home' | 'search' | 'asset-detail' | 'collection';
  activeCategory: NexRealmAssetCategory | 'all';
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;

  // Filters
  filters: NexRealmSearchFilters;

  // Install
  installJobs: Map<string, InstallProgress>;

  // Wishlist (local session)
  wishlist: string[];

  // ─── GEM Economy ─────────────────────────────────────────────────────────
  wallet: GemWallet | null;
  transactions: GemTransaction[];

  // Actions
  loadHomepage: () => Promise<void>;
  search: (query?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  setCategory: (cat: NexRealmAssetCategory | 'all') => void;
  setPricingFilter: (model: PricingModel | 'all') => void;
  setSortBy: (sort: NexRealmSortBy) => void;
  setMinRating: (rating: number | undefined) => void;
  setMaxPrice: (price: number | undefined) => void;
  clearFilters: () => void;
  selectAsset: (asset: NexRealmAsset | null) => void;
  installAsset: (asset: NexRealmAsset) => Promise<void>;
  toggleWishlist: (assetId: string) => void;
  setError: (error: string | null) => void;
  setView: (view: NexRealmState['activeView']) => void;

  // GEM actions
  buyGemPackage: (pkg: GemPackage) => void;
  publishAsset: (payload: PublishPayload) => Promise<number>; // retourne GEMs gagnés
  claimDailyBonus: () => void;
}

// ─── Mock Wallet ──────────────────────────────────────────────────────────────

const computeTier = (lifetime: number): CreatorTier => {
  const entries = Object.entries(CREATOR_TIER_CONFIG) as [CreatorTier, typeof CREATOR_TIER_CONFIG[CreatorTier]][];
  let tier: CreatorTier = 'newcomer';
  for (const [key, cfg] of entries) {
    if (lifetime >= cfg.minGems) tier = key;
  }
  return tier;
};

const MOCK_WALLET: GemWallet = {
  userId: 'demo-user-01',
  balance: {
    standard: 285,
    premium: 0,
    bonus: 15,
    total: 300,
    lifetime: 420,
    pendingPayout: 0,
  },
  tier: 'newcomer',
  nextTier: 'contributor',
  gemsToNextTier: 0,
  updatedAt: new Date().toISOString(),
};

const MOCK_TRANSACTIONS: GemTransaction[] = [
  {
    id: 'tx-001', type: 'earn_bonus', amount: 15, gemType: 'bonus',
    balance_after: 300, label: 'Bonus bienvenue NexRealm',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
    status: 'completed',
  },
  {
    id: 'tx-002', type: 'earn_download', amount: 2, gemType: 'standard',
    balance_after: 302, label: 'Téléchargement de votre asset',
    assetName: 'Mon premier character pack',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    status: 'completed',
  },
  {
    id: 'tx-003', type: 'spend_download', amount: -10, gemType: 'standard',
    balance_after: 292, label: 'Téléchargement d\'un asset',
    assetName: 'Paris 1920s — Location Pack',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
    status: 'completed',
  },
  {
    id: 'tx-004', type: 'earn_daily', amount: 5, gemType: 'bonus',
    balance_after: 297, label: 'Bonus quotidien',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: 'completed',
  },
  {
    id: 'tx-005', type: 'earn_share', amount: 10, gemType: 'standard',
    balance_after: 307, label: 'Bonus publication de votre asset',
    assetName: 'Sci-Fi Props Bundle',
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    status: 'completed',
  },
];


const DEFAULT_FILTERS: NexRealmSearchFilters = {
  query: '',
  category: 'all',
  pricingModel: 'all',
  sortBy: 'relevance',
  page: 1,
  pageSize: 12,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useNexRealmStore = create<NexRealmState>()(
  devtools(
    (set, get) => ({
      // Initial State
      homepage: null,
      searchResult: null,
      selectedAsset: null,
      activeView: 'home',
      activeCategory: 'all',
      isLoading: false,
      isLoadingMore: false,
      error: null,
      filters: { ...DEFAULT_FILTERS },
      installJobs: new Map(),
      wishlist: [],
      // GEM Economy — initialisé avec le wallet mock (sera remplacé par API)
      wallet: MOCK_WALLET,
      transactions: MOCK_TRANSACTIONS,

      // ─── Actions ───────────────────────────────────────────────────────────

      loadHomepage: async () => {
        set({ isLoading: true, error: null });
        try {
          const homepage = await NexRealmService.getHomepage();
          set({ homepage, isLoading: false, activeView: 'home' });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Erreur chargement marketplace',
            isLoading: false,
          });
        }
      },

      search: async (query?: string) => {
        const { filters } = get();
        const newFilters: NexRealmSearchFilters = {
          ...filters,
          query: query !== undefined ? query : filters.query,
          page: 1,
        };
        set({ isLoading: true, error: null, filters: newFilters, activeView: 'search' });
        try {
          const result = await NexRealmService.search(newFilters);
          set({ searchResult: result, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Erreur de recherche',
            isLoading: false,
          });
        }
      },

      loadMore: async () => {
        const { filters, searchResult } = get();
        if (!searchResult || searchResult.page >= searchResult.totalPages) return;

        const newFilters = { ...filters, page: (filters.page ?? 1) + 1 };
        set({ isLoadingMore: true, filters: newFilters });
        try {
          const result = await NexRealmService.search(newFilters);
          set((state) => ({
            searchResult: {
              ...result,
              assets: [...(state.searchResult?.assets ?? []), ...result.assets],
            },
            isLoadingMore: false,
          }));
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'Erreur chargement',
            isLoadingMore: false,
          });
        }
      },

      setCategory: (cat) => {
        set((state) => ({
          activeCategory: cat,
          filters: { ...state.filters, category: cat, page: 1 },
        }));
        get().search();
      },

      setPricingFilter: (model) => {
        set((state) => ({
          filters: { ...state.filters, pricingModel: model, page: 1 },
        }));
        get().search();
      },

      setSortBy: (sort) => {
        set((state) => ({
          filters: { ...state.filters, sortBy: sort, page: 1 },
        }));
        get().search();
      },

      setMinRating: (rating) => {
        set((state) => ({
          filters: { ...state.filters, minRating: rating, page: 1 },
        }));
        get().search();
      },

      setMaxPrice: (price) => {
        set((state) => ({
          filters: { ...state.filters, maxPrice: price, page: 1 },
        }));
        get().search();
      },

      clearFilters: () => {
        set({ filters: { ...DEFAULT_FILTERS }, activeCategory: 'all' });
        get().search();
      },

      selectAsset: (asset) => {
        set({ selectedAsset: asset, activeView: asset ? 'asset-detail' : 'search' });
      },

      installAsset: async (asset) => {
        const startProgress: InstallProgress = {
          assetId: asset.id,
          status: 'downloading',
          progress: 0,
          message: 'Démarrage...',
        };
        set((state) => ({
          installJobs: new Map(state.installJobs).set(asset.id, startProgress),
        }));

        await NexRealmService.installAsset(asset, (progress) => {
          set((state) => ({
            installJobs: new Map(state.installJobs).set(asset.id, progress),
          }));
        });
      },

      toggleWishlist: (assetId) => {
        set((state) => ({
          wishlist: state.wishlist.includes(assetId)
            ? state.wishlist.filter((id) => id !== assetId)
            : [...state.wishlist, assetId],
        }));
      },

      setError: (error) => set({ error }),

      setView: (view) => set({ activeView: view }),

      // ─── GEM Actions ────────────────────────────────────────────────────────

      buyGemPackage: (pkg) => {
        set((state) => {
          if (!state.wallet) return {};
          const gained = pkg.totalGems;
          const newTotal = state.wallet.balance.total + gained;
          const newPremium = state.wallet.balance.premium + gained;
          const newLifetime = state.wallet.balance.lifetime + gained;
          const newTier = computeTier(newLifetime);
          const tx: GemTransaction = {
            id: `tx-buy-${Date.now()}`,
            type: 'purchase_gems',
            amount: gained,
            gemType: 'premium',
            balance_after: newTotal,
            label: `Achat ${pkg.label}`,
            createdAt: new Date().toISOString(),
            status: 'completed',
          };
          return {
            wallet: {
              ...state.wallet,
              balance: {
                ...state.wallet.balance,
                premium: newPremium,
                total: newTotal,
                lifetime: newLifetime,
              },
              tier: newTier,
              updatedAt: new Date().toISOString(),
            },
            transactions: [tx, ...state.transactions],
          };
        });
      },

      publishAsset: async (payload) => {
        // Simuler un délai réseau
        await new Promise(r => setTimeout(r, 1200));
        const gemsEarned = GEM_REWARDS.PUBLISH_ASSET;
        set((state) => {
          if (!state.wallet) return {};
          const newTotal = state.wallet.balance.total + gemsEarned;
          const newStandard = state.wallet.balance.standard + gemsEarned;
          const newLifetime = state.wallet.balance.lifetime + gemsEarned;
          const newTier = computeTier(newLifetime);
          const tx: GemTransaction = {
            id: `tx-pub-${Date.now()}`,
            type: 'earn_share',
            amount: gemsEarned,
            gemType: 'standard',
            balance_after: newTotal,
            label: `Bonus publication : ${payload.name}`,
            assetName: payload.name,
            createdAt: new Date().toISOString(),
            status: 'completed',
          };
          return {
            wallet: {
              ...state.wallet,
              balance: {
                ...state.wallet.balance,
                standard: newStandard,
                total: newTotal,
                lifetime: newLifetime,
              },
              tier: newTier,
              updatedAt: new Date().toISOString(),
            },
            transactions: [tx, ...state.transactions],
          };
        });
        return gemsEarned;
      },

      claimDailyBonus: () => {
        const gained = GEM_REWARDS.DAILY_BONUS;
        set((state) => {
          if (!state.wallet) return {};
          const newTotal = state.wallet.balance.total + gained;
          const newBonus = state.wallet.balance.bonus + gained;
          const tx: GemTransaction = {
            id: `tx-daily-${Date.now()}`,
            type: 'earn_daily',
            amount: gained,
            gemType: 'bonus',
            balance_after: newTotal,
            label: 'Bonus quotidien de connexion',
            createdAt: new Date().toISOString(),
            status: 'completed',
          };
          return {
            wallet: {
              ...state.wallet,
              balance: { ...state.wallet.balance, bonus: newBonus, total: newTotal },
              updatedAt: new Date().toISOString(),
            },
            transactions: [tx, ...state.transactions],
          };
        });
      },
    }),
    { name: 'NexRealmStore' }
  )
);

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectInstallProgress = (assetId: string) => (state: NexRealmState) =>
  state.installJobs.get(assetId);

export const selectIsWishlisted = (assetId: string) => (state: NexRealmState) =>
  state.wishlist.includes(assetId);

export const selectIsInstalled = (assetId: string) => (state: NexRealmState) => {
  const job = state.installJobs.get(assetId);
  return job?.status === 'installed';
};

export const selectHasActiveFilters = (state: NexRealmState) => {
  const { filters } = state;
  return (
    (filters.query && filters.query.trim() !== '') ||
    (filters.category && filters.category !== 'all') ||
    (filters.pricingModel && filters.pricingModel !== 'all') ||
    filters.minRating !== undefined ||
    filters.maxPrice !== undefined ||
    (filters.sortBy && filters.sortBy !== 'relevance')
  );
};
