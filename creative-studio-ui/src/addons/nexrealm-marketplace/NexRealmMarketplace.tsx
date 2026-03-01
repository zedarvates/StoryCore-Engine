/**
 * NexRealm Marketplace — Main Component
 * Marketplace d'assets et d'addons pour StoryCore via nexrealm.shop
 *
 * Features:
 *  - Vue Accueil (Hero, Trending, Featured, Free of the week)
 *  - Recherche fulltext + filtres avancés (catégorie, prix, rating, tri)
 *  - Détail d'asset avec installation en un clic
 *  - Wishlist locale
 *  - 💎 GEM Economy : wallet, publication, récompenses créateur
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useNexRealmStore, selectIsWishlisted, selectIsInstalled, selectInstallProgress, selectHasActiveFilters } from './nexrealmStore';
import type { NexRealmAsset, NexRealmAssetCategory, PricingModel, NexRealmSortBy } from './nexrealmTypes';
import { GemWallet } from './GemWallet';
import { PublishModal } from './PublishModal';
import styles from './NexRealmMarketplace.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { key: NexRealmAssetCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all',       label: 'Tout',         icon: '🏪' },
  { key: 'addon',     label: 'Add-ons',      icon: '🧩' },
  { key: 'character', label: 'Personnages',  icon: '👤' },
  { key: 'location',  label: 'Locations',    icon: '🗺️' },
  { key: 'scene3d',   label: 'Scènes 3D',   icon: '🎬' },
  { key: 'object',    label: 'Objets',       icon: '📦' },
  { key: 'texture',   label: 'Textures',     icon: '🎨' },
  { key: 'audio',     label: 'Audio',        icon: '🎵' },
  { key: 'template',  label: 'Templates',    icon: '📋' },
  { key: 'style',     label: 'Styles',       icon: '✨' },
  { key: 'bundle',    label: 'Bundles',      icon: '🎁' },
];

const CATEGORY_EMOJI: Record<string, string> = {
  addon: '🧩', character: '👤', location: '🗺️', scene3d: '🎬',
  object: '📦', texture: '🎨', audio: '🎵', template: '📋',
  style: '✨', script: '📝', bundle: '🎁',
};

// ─── Sub-components ────────────────────────────────────────────────────────────

interface StarRatingProps { rating: number; size?: 'sm' | 'md'; }
const StarRating: React.FC<StarRatingProps> = ({ rating, size = 'sm' }) => {
  const filled = Math.floor(rating);
  const half = rating - filled >= 0.5;
  const empty = 5 - filled - (half ? 1 : 0);
  return (
    <span className={styles.stars} title={`${rating.toFixed(1)} / 5`}>
      {Array.from({ length: filled }).map((_, i) => (
        <span key={`f${i}`} className={`${styles.star} ${styles.starFull}`} style={{ fontSize: size === 'md' ? 14 : 11 }}>★</span>
      ))}
      {half && <span className={`${styles.star} ${styles.starFull}`} style={{ opacity: 0.6, fontSize: size === 'md' ? 14 : 11 }}>★</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className={`${styles.star} ${styles.starEmpty}`} style={{ fontSize: size === 'md' ? 14 : 11 }}>★</span>
      ))}
    </span>
  );
};

interface PriceDisplayProps { asset: NexRealmAsset; large?: boolean; }
const PriceDisplay: React.FC<PriceDisplayProps> = ({ asset, large }) => {
  const { price } = asset;
  if (price.model === 'free') return <span className={styles.priceFree}>GRATUIT</span>;
  if (price.model === 'freemium') return (
    <span className={styles.priceFreemium}>
      Freemium {price.amount ? `• €${price.amount}` : ''}
    </span>
  );
  if (price.amount !== undefined) return (
    <span className={styles.priceTag} style={{ fontSize: large ? 28 : undefined }}>
      {price.originalAmount && (
        <span className={styles.priceOriginal}>€{price.originalAmount}</span>
      )}
      €{price.amount}
      {price.discount && <span className={styles.priceDiscount}>-{price.discount}%</span>}
    </span>
  );
  return <span className={styles.priceTag}>–</span>;
};

interface AssetCardProps {
  asset: NexRealmAsset;
  onSelect: (asset: NexRealmAsset) => void;
  compact?: boolean;
}
const AssetCard: React.FC<AssetCardProps> = ({ asset, onSelect, compact = false }) => {
  const isWishlisted = useNexRealmStore(selectIsWishlisted(asset.id));
  const isInstalled = useNexRealmStore(selectIsInstalled(asset.id));
  const installProgress = useNexRealmStore(selectInstallProgress(asset.id));
  const toggleWishlist = useNexRealmStore(s => s.toggleWishlist);

  const emoji = CATEGORY_EMOJI[asset.category] ?? '📦';
  const downloading = installProgress && installProgress.status !== 'installed' && installProgress.status !== 'idle';

  return (
    <div
      className={styles.assetCard}
      onClick={() => onSelect(asset)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(asset)}
    >
      {/* Thumbnail */}
      <div className={styles.cardThumb}>
        <div className={styles.cardThumbPlaceholder}>{emoji}</div>
        {/* Badges */}
        <div className={styles.cardBadges}>
          {asset.trending && <span className={`${styles.cardBadge} ${styles.badgeTrending}`}>🔥 Trending</span>}
          {asset.featured && !asset.trending && <span className={`${styles.cardBadge} ${styles.badgeFeatured}`}>⭐ Featured</span>}
          {asset.newRelease && <span className={`${styles.cardBadge} ${styles.badgeNew}`}>🆕 Nouveau</span>}
        </div>
        {/* Wishlist */}
        <button
          className={`${styles.cardWishlistBtn} ${isWishlisted ? styles.cardWishlistActive : ''}`}
          onClick={(e) => { e.stopPropagation(); toggleWishlist(asset.id); }}
          title={isWishlisted ? 'Retirer de la wishlist' : 'Ajouter à la wishlist'}
          aria-label="Toggle wishlist"
        >
          {isWishlisted ? '❤️' : '🤍'}
        </button>
        {/* Install progress overlay */}
        {downloading && installProgress && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(8,12,20,0.75)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16,
          }}>
            <div className={styles.progressBar} style={{ width: '80%' }}>
              <div className={styles.progressFill} style={{ width: `${installProgress.progress}%` }} />
            </div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{installProgress.message}</span>
          </div>
        )}
        {/* Installed badge */}
        {isInstalled && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'rgba(16,185,129,0.85)', borderRadius: 20,
            padding: '3px 9px', fontSize: 10, fontWeight: 700, color: '#fff',
          }}>✓ Installé</div>
        )}
      </div>

      {/* Body */}
      <div className={styles.cardBody}>
        <span className={styles.cardCategory}>{emoji} {asset.category}</span>
        <h3 className={styles.cardTitle}>{asset.name}</h3>
        {!compact && <p className={styles.cardTagline}>{asset.tagline}</p>}
        <div className={styles.cardMeta}>
          <span className={styles.cardRating}>
            <StarRating rating={asset.rating} />
            <span style={{ color: '#8b98c4', fontSize: 10.5 }}>({asset.reviewCount})</span>
          </span>
          <span className={styles.cardDownloads}>⬇ {asset.downloadCount.toLocaleString()}</span>
          <span className={styles.cardPrice}>
            <PriceDisplay asset={asset} />
          </span>
        </div>
      </div>
    </div>
  );
};

interface HeroBannerProps { asset: NexRealmAsset; onSelect: (a: NexRealmAsset) => void; }
const HeroBanner: React.FC<HeroBannerProps> = ({ asset, onSelect }) => {
  const emoji = CATEGORY_EMOJI[asset.category] ?? '📦';
  return (
    <div className={styles.hero} onClick={() => onSelect(asset)}>
      <div className={styles.heroGlow} />
      <div className={styles.heroOrb}>{emoji}</div>
      <div className={styles.heroContent}>
        <div className={styles.heroTag}>⭐ Featured du Moment</div>
        <h2 className={styles.heroTitle}>{asset.name}</h2>
        <p className={styles.heroTagline}>{asset.tagline}</p>
        <div className={styles.heroActions}>
          <button className={styles.heroCTA} onClick={(e) => { e.stopPropagation(); onSelect(asset); }}>
            Voir l&apos;asset →
          </button>
          <span className={styles.heroPriceTag}><PriceDisplay asset={asset} /></span>
        </div>
      </div>
    </div>
  );
};

interface AssetDetailModalProps { asset: NexRealmAsset; onClose: () => void; }
const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
  const installAsset = useNexRealmStore(s => s.installAsset);
  const toggleWishlist = useNexRealmStore(s => s.toggleWishlist);
  const isWishlisted = useNexRealmStore(selectIsWishlisted(asset.id));
  const isInstalled = useNexRealmStore(selectIsInstalled(asset.id));
  const installProgress = useNexRealmStore(selectInstallProgress(asset.id));
  const wallet = useNexRealmStore(s => s.wallet);
  const emoji = CATEGORY_EMOJI[asset.category] ?? '📦';

  const isDownloading = installProgress && installProgress.status !== 'installed' && installProgress.status !== 'idle';

  // Prix GEM de l'asset (si applicable)
  const gemPricing = (asset as unknown as { gemPricing?: { gemCost?: number } }).gemPricing;
  const gemCost = gemPricing?.gemCost;
  const canAfford = !gemCost || (wallet ? wallet.balance.total >= gemCost : false);

  const handleInstall = useCallback(async () => {
    await installAsset(asset);
  }, [asset, installAsset]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Libellé du bouton d'installation
  const installLabel = (() => {
    if (asset.price.model === 'free') return '⬇ Installer gratuitement';
    if (asset.price.model === 'freemium') return '⬇ Installer (Freemium)';
    if (gemCost) return `💎 ${gemCost} GEMs — Obtenir`;
    return `💳 Acheter — €${asset.price.amount}`;
  })();

  return (
    <div className={styles.modalOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={asset.name}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <span style={{ fontSize: 22 }}>{emoji}</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--nr-text-2)' }}>{asset.category}</div>
          </div>
          <button className={styles.modalClose} onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Preview */}
          <div className={styles.modalPreviewArea}>
            <div className={styles.modalPreviewGlow} />
            <span style={{ fontSize: 80, opacity: 0.7 }}>{emoji}</span>
          </div>

          {/* Meta + Purchase */}
          <div className={styles.modalMeta}>
            <div>
              <h2 className={styles.modalTitle}>{asset.name}</h2>
              <p className={styles.modalTagline}>{asset.tagline}</p>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <StarRating rating={asset.rating} size="md" />
                <span style={{ fontSize: 13, color: 'var(--nr-text-2)' }}>
                  {asset.rating.toFixed(1)} · {asset.reviewCount} avis
                </span>
                <span className={styles.authorBadge}>
                  <span className={styles.authorAvatar}>{asset.author.displayName[0]}</span>
                  {asset.author.displayName}
                  {asset.author.verified && <span className={styles.authorVerified} title="Auteur vérifié">✓</span>}
                </span>
              </div>
            </div>

            {/* Purchase Box */}
            <div className={styles.modalPurchaseBox}>
              <div className={asset.price.model === 'free' ? styles.modalPriceFree : styles.modalPriceMain}>
                <PriceDisplay asset={asset} large />
              </div>

              {isInstalled ? (
                <div style={{
                  padding: '10px', borderRadius: 8, background: 'rgba(16,185,129,0.1)',
                  border: '1px solid rgba(16,185,129,0.3)', color: 'var(--nr-free)',
                  fontWeight: 700, fontSize: 13, textAlign: 'center',
                }}>
                  ✓ Installé
                </div>
              ) : isDownloading && installProgress ? (
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ width: `${installProgress.progress}%` }} />
                  </div>
                  <div className={styles.progressMsg}>{installProgress.message}</div>
                </div>
              ) : (
                <>
                  <button
                    className={`${styles.installBtn} ${asset.price.model === 'free' ? styles.installBtnFree : ''} ${!canAfford ? styles.installBtnDisabled : ''}`}
                    onClick={handleInstall}
                    disabled={!!isDownloading || !canAfford}
                    title={!canAfford ? `Solde insuffisant — il vous faut ${gemCost} GEMs` : ''}
                  >
                    {installLabel}
                  </button>
                  {/* Avertissement solde insuffisant */}
                  {!canAfford && gemCost && (
                    <div style={{
                      fontSize: 11, color: '#f59e0b', textAlign: 'center',
                      padding: '6px 8px', borderRadius: 6,
                      background: 'rgba(245,158,11,0.08)',
                      border: '1px solid rgba(245,158,11,0.2)',
                    }}>
                      💎 Solde insuffisant ({wallet?.balance.total ?? 0} / {gemCost} GEMs)
                      <br />
                      <span style={{ color: '#8b98c4' }}>Publiez des assets pour en gagner !</span>
                    </div>
                  )}
                </>
              )}

              <button
                className={`${styles.wishlistBtn2} ${isWishlisted ? styles.wishlistBtn2Active : ''}`}
                onClick={() => toggleWishlist(asset.id)}
              >
                {isWishlisted ? '❤️ Dans la wishlist' : '🤍 Wishlist'}
              </button>

              {/* Quick info */}
              <div style={{ fontSize: 11, color: 'var(--nr-text-3)', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>📁 {(asset.fileSize ? (asset.fileSize / 1e6).toFixed(1) : '?')} MB</span>
                <span>🔄 v{asset.version}</span>
                <span>⚖️ {asset.license}</span>
                <span>🖥️ {asset.compatibility.platforms.join(' · ')}</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.modalStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Downloads</span>
              <span className={styles.statValue}>⬇ {asset.downloadCount.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Likes</span>
              <span className={styles.statValue}>❤️ {asset.likeCount.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Vues</span>
              <span className={styles.statValue}>👁 {asset.viewCount.toLocaleString()}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Mise à jour</span>
              <span className={styles.statValue}>{new Date(asset.updatedAt).toLocaleDateString('fr-FR')}</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Licence</span>
              <span className={styles.statValue}>{asset.license}</span>
            </div>
            {asset.fileFormat && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Formats</span>
                <span className={styles.statValue}>{asset.fileFormat.join(' · ')}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--nr-text)', marginBottom: 10 }}>
              À propos de cet asset
            </h4>
            <p className={styles.modalDescription}>{asset.description}</p>
            {asset.longDescription && (
              <p className={styles.modalDescription} style={{ marginTop: 10 }}>{asset.longDescription}</p>
            )}
          </div>

          {/* Compatibility */}
          <div>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--nr-text)', marginBottom: 10 }}>
              Compatibilité
            </h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className={styles.tag}>🎬 StoryCore ≥ {asset.compatibility.storyCoreMinVersion}</span>
              {asset.compatibility.platforms.map(p => (
                <span key={p} className={styles.tag}>
                  {p === 'windows' ? '🪟' : p === 'linux' ? '🐧' : '🍎'} {p}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          {asset.tags.length > 0 && (
            <div>
              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--nr-text)', marginBottom: 10 }}>Tags</h4>
              <div className={styles.modalTags}>
                {asset.tags.map(tag => (
                  <span key={tag} className={styles.tag}>#{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Skeleton
const SkeletonGrid: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className={styles.assetGrid}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={styles.skeletonCard}>
        <div className={styles.skeletonThumb} />
        <div className={styles.skeletonBody}>
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
        </div>
      </div>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const NexRealmMarketplace: React.FC = () => {
  const {
    homepage,
    searchResult,
    selectedAsset,
    activeView,
    activeCategory,
    isLoading,
    isLoadingMore,
    error,
    filters,
    wallet,
    loadHomepage,
    search,
    loadMore,
    setCategory,
    setPricingFilter,
    setSortBy,
    clearFilters,
    selectAsset,
    setError,
  } = useNexRealmStore();

  const hasActiveFilters = useNexRealmStore(selectHasActiveFilters);
  const [searchInput, setSearchInput] = useState('');
  const [isOnline] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [showPublish, setShowPublish] = useState(false);

  // Load homepage on mount
  useEffect(() => {
    loadHomepage();
  }, [loadHomepage]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    search(searchInput);
  }, [searchInput, search]);

  const handleAssetSelect = useCallback((asset: NexRealmAsset) => {
    selectAsset(asset);
  }, [selectAsset]);

  const handleModalClose = useCallback(() => {
    selectAsset(null);
  }, [selectAsset]);

  const handleCategoryChange = useCallback((cat: NexRealmAssetCategory | 'all') => {
    setCategory(cat);
  }, [setCategory]);

  return (
    <div className={styles.marketplace} id="nexrealm-marketplace">
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <div className={styles.topbar}>
        {/* Brand */}
        <div className={styles.brand}>
          <div className={styles.brandLogo}>🌐</div>
          <div>
            <div className={styles.brandName}>NexRealm</div>
            <div className={styles.brandSub}>nexrealm.shop · StoryCore Marketplace</div>
          </div>
        </div>

        {/* Search */}
        <form className={styles.searchWrap} onSubmit={handleSearch}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            id="nexrealm-search"
            type="search"
            className={styles.searchInput}
            placeholder="Rechercher assets, add-ons, personnages…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(e as unknown as React.FormEvent)}
          />
        </form>

        {/* Actions */}
        <div className={styles.topbarActions}>
          {/* Status badge */}
          <div className={`${styles.onlineBadge} ${isOnline ? '' : styles.offlineBadge}`}>
            <span className={`${styles.onlineDot} ${isOnline ? '' : styles.offlineDot}`} />
            {isOnline ? 'En ligne' : 'Démo'}
          </div>

          {/* GEM Balance */}
          {wallet && (
            <button
              className={styles.gemBalanceBtn}
              onClick={() => setShowWallet(true)}
              id="nexrealm-gem-wallet-btn"
              title="Ouvrir mon GEM Wallet"
            >
              <span className={styles.gemBtnIcon}>💎</span>
              <span className={styles.gemBtnAmount}>{wallet.balance.total.toLocaleString()}</span>
              <span className={styles.gemBtnLabel}>GEMs</span>
            </button>
          )}

          {/* Publish Button */}
          <button
            className={styles.publishBtn}
            onClick={() => setShowPublish(true)}
            id="nexrealm-publish-btn"
            title="Publier ma création et gagner des GEMs"
          >
            <span>🚀</span> Publier
          </button>
        </div>
      </div>

      {/* ── Category Tabs ───────────────────────────────────────────────────── */}
      <div className={styles.navTabs} role="tablist">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            role="tab"
            aria-selected={activeCategory === cat.key}
            className={`${styles.navTab} ${activeCategory === cat.key ? styles.navTabActive : ''}`}
            onClick={() => handleCategoryChange(cat.key)}
            id={`nexrealm-cat-${cat.key}`}
          >
            <span className={styles.navTabIcon}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className={styles.content} id="nexrealm-content">

        {/* Error Banner */}
        {error && (
          <div style={{
            padding: '12px 18px', background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            color: '#f87171', fontSize: 13,
          }}>
            ⚠️ {error}
            <button onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* ── HOME VIEW ─────────────────────────────────────────────────────── */}
        {activeView === 'home' && !isLoading && homepage && (
          <>
            {/* Hero */}
            {homepage.hero && (
              <HeroBanner asset={homepage.hero} onSelect={handleAssetSelect} />
            )}

            {/* Free of The Week */}
            {homepage.freeOfWeek && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>🎁 Gratuit de la Semaine</h2>
                </div>
                <div className={styles.assetGrid}>
                  <AssetCard asset={homepage.freeOfWeek} onSelect={handleAssetSelect} />
                </div>
              </div>
            )}

            {/* Trending */}
            {homepage.trending.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>🔥 Trending</h2>
                  <button className={styles.sectionViewAll} onClick={() => { setSortBy('trending'); search(); }}>
                    Voir tout →
                  </button>
                </div>
                <div className={styles.scrollRow}>
                  {homepage.trending.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onSelect={handleAssetSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* Featured */}
            {homepage.featured.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>⭐ Sélection du Marketplace</h2>
                  <button className={styles.sectionViewAll} onClick={() => search()}>Voir tout →</button>
                </div>
                <div className={styles.assetGrid}>
                  {homepage.featured.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onSelect={handleAssetSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* New Releases */}
            {homepage.newReleases.length > 0 && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>🆕 Nouveautés</h2>
                  <button className={styles.sectionViewAll} onClick={() => { setSortBy('newest'); search(); }}>
                    Voir tout →
                  </button>
                </div>
                <div className={styles.scrollRow}>
                  {homepage.newReleases.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onSelect={handleAssetSelect} />
                  ))}
                </div>
              </div>
            )}

            {/* By Category */}
            {Object.entries(homepage.byCategory).map(([cat, assets]) => assets && assets.length > 0 && (
              <div key={cat} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {CATEGORY_EMOJI[cat] ?? '📦'} {CATEGORIES.find(c => c.key === cat)?.label ?? cat}
                  </h2>
                  <button
                    className={styles.sectionViewAll}
                    onClick={() => handleCategoryChange(cat as NexRealmAssetCategory)}
                  >
                    Voir tout →
                  </button>
                </div>
                <div className={styles.scrollRow}>
                  {assets.map((asset) => (
                    <AssetCard key={asset.id} asset={asset} onSelect={handleAssetSelect} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── SEARCH VIEW ───────────────────────────────────────────────────── */}
        {activeView === 'search' && (
          <>
            {/* Filter Bar */}
            <div className={styles.filterBar}>
              <span className={styles.filterLabel}>Filtres</span>

              {/* Pricing */}
              <select
                className={styles.filterSelect}
                value={filters.pricingModel ?? 'all'}
                onChange={(e) => setPricingFilter(e.target.value as PricingModel | 'all')}
                id="nexrealm-filter-pricing"
              >
                <option value="all">Tous les prix</option>
                <option value="free">Gratuit</option>
                <option value="freemium">Freemium</option>
                <option value="paid">Payant</option>
              </select>

              {/* Sort */}
              <select
                className={styles.filterSelect}
                value={filters.sortBy ?? 'relevance'}
                onChange={(e) => setSortBy(e.target.value as NexRealmSortBy)}
                id="nexrealm-filter-sort"
              >
                <option value="relevance">Pertinence</option>
                <option value="trending">Trending</option>
                <option value="newest">Plus récent</option>
                <option value="top-rated">Mieux noté</option>
                <option value="bestseller">Best-sellers</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>

              {/* Min Rating */}
              <select
                className={styles.filterSelect}
                value={String(filters.minRating ?? '')}
                onChange={(e) => useNexRealmStore.getState().setMinRating(e.target.value ? Number(e.target.value) : undefined)}
                id="nexrealm-filter-rating"
              >
                <option value="">Note min. (toutes)</option>
                <option value="3">★★★ 3+</option>
                <option value="4">★★★★ 4+</option>
                <option value="4.5">★★★★★ 4.5+</option>
              </select>

              {/* Clear */}
              {hasActiveFilters && (
                <button className={styles.filterClear} onClick={clearFilters}>
                  ✕ Réinitialiser
                </button>
              )}
            </div>

            {/* Results Header */}
            {!isLoading && searchResult && (
              <div className={styles.resultsHeader}>
                <span className={styles.resultsCount}>
                  <strong>{searchResult.total}</strong> asset{searchResult.total > 1 ? 's' : ''} trouvé{searchResult.total > 1 ? 's' : ''}
                  {filters.query && <span style={{ color: 'var(--nr-accent)' }}> pour « {filters.query} »</span>}
                </span>
              </div>
            )}

            {/* Loading */}
            {isLoading && <SkeletonGrid count={8} />}

            {/* Results Grid */}
            {!isLoading && searchResult?.assets.length === 0 && (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}>🔍</span>
                <h3 className={styles.emptyTitle}>Aucun résultat</h3>
                <p className={styles.emptyText}>
                  Essayez d&apos;ajuster vos filtres ou de lancer une recherche différente.
                </p>
                <button className={styles.filterClear} style={{ marginTop: 8 }} onClick={clearFilters}>
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {!isLoading && searchResult && searchResult.assets.length > 0 && (
              <>
                <div className={styles.assetGrid}>
                  {searchResult.assets.map(asset => (
                    <AssetCard key={asset.id} asset={asset} onSelect={handleAssetSelect} />
                  ))}
                </div>

                {/* Load More */}
                {searchResult.page < searchResult.totalPages && (
                  <button
                    className={styles.loadMoreBtn}
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    id="nexrealm-load-more"
                  >
                    {isLoadingMore ? '⏳ Chargement…' : '⬇ Charger plus'}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ── LOADING HOME ──────────────────────────────────────────────────── */}
        {isLoading && activeView === 'home' && (
          <>
            <div style={{ height: 220, borderRadius: 20, background: 'var(--nr-surface)', animation: 'shimmer 1.5s infinite' }} />
            <SkeletonGrid count={6} />
          </>
        )}
      </div>

      {/* ── Asset Detail Modal ─────────────────────────────────────────────── */}
      {selectedAsset && (
        <AssetDetailModal asset={selectedAsset} onClose={handleModalClose} />
      )}

      {/* ── GEM Wallet Drawer ─────────────────────────────────────────────── */}
      {showWallet && (
        <div className={styles.walletDrawerOverlay} onClick={() => setShowWallet(false)}>
          <div
            className={styles.walletDrawer}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-label="GEM Wallet"
          >
            <GemWallet onClose={() => setShowWallet(false)} />
          </div>
        </div>
      )}

      {/* ── Publish Modal ─────────────────────────────────────────────────── */}
      {showPublish && (
        <PublishModal onClose={() => setShowPublish(false)} />
      )}
    </div>
  );
};

export default NexRealmMarketplace;
