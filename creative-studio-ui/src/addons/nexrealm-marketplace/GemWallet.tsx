/**
 * NexRealm GEM Wallet Component
 * Affichage du solde GEM, historique des transactions, achat de GEMmes
 * et explication du système de récompenses.
 */

import React, { useState } from 'react';
import { useNexRealmStore } from './nexrealmStore';
import { CREATOR_TIER_CONFIG, GEM_PACKAGES, GEM_REWARDS } from './gemTypes';
import type { GemTransaction, GemPackage, CreatorTier } from './gemTypes';
import styles from './GemWallet.module.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TX_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  earn_download:    { label: 'Téléchargement reçu',   icon: '⬇️', color: '#10b981' },
  earn_share:       { label: 'Bonus publication',      icon: '🚀', color: '#6366f1' },
  earn_featured:    { label: 'Asset mis en avant',     icon: '⭐', color: '#f59e0b' },
  earn_rating:      { label: 'Avis 5 étoiles reçu',   icon: '★',  color: '#f59e0b' },
  earn_referral:    { label: 'Parrainage',             icon: '👥', color: '#06b6d4' },
  earn_daily:       { label: 'Bonus quotidien',        icon: '🎁', color: '#8b5cf6' },
  earn_bonus:       { label: 'Bonus événement',        icon: '🎉', color: '#ec4899' },
  spend_download:   { label: 'Asset téléchargé',       icon: '📦', color: '#f87171' },
  spend_featured:   { label: 'Slot Featured acheté',   icon: '💡', color: '#f87171' },
  purchase_gems:    { label: 'Achat GEMmes',           icon: '💳', color: '#10b981' },
  purchase_crypto:  { label: 'Achat crypto',           icon: '₿',  color: '#f59e0b' },
  payout_requested: { label: 'Retrait demandé',        icon: '💰', color: '#06b6d4' },
  refund:           { label: 'Remboursement',          icon: '↩️', color: '#6366f1' },
  transfer_sent:    { label: 'Transfert envoyé',       icon: '→',  color: '#f87171' },
  transfer_received:{ label: 'Transfert reçu',         icon: '←',  color: '#10b981' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const formatGems = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

// ─── Tier Progress Bar ────────────────────────────────────────────────────────

const TierProgress: React.FC<{ tier: CreatorTier; lifetime: number }> = ({ tier, lifetime }) => {
  const cfg = CREATOR_TIER_CONFIG[tier];
  const tiers = Object.keys(CREATOR_TIER_CONFIG) as CreatorTier[];
  const nextTierKey = tiers[tiers.indexOf(tier) + 1] as CreatorTier | undefined;
  const nextCfg = nextTierKey ? CREATOR_TIER_CONFIG[nextTierKey] : null;
  const pct = nextCfg
    ? Math.min(100, ((lifetime - cfg.minGems) / (nextCfg.minGems - cfg.minGems)) * 100)
    : 100;

  return (
    <div className={styles.tierProgress}>
      <div className={styles.tierBadge} style={{ background: `${cfg.color}22`, borderColor: `${cfg.color}55` }}>
        <span className={styles.tierIcon}>{cfg.icon}</span>
        <div>
          <div className={styles.tierName} style={{ color: cfg.color }}>{cfg.label}</div>
          <div className={styles.tierRevShare}>{cfg.revenueShare}% des GEMs vous reviennent</div>
        </div>
      </div>
      {nextCfg && (
        <>
          <div className={styles.progressBarWrap}>
            <div className={styles.progressBarFill} style={{ width: `${pct}%`, background: cfg.color }} />
          </div>
          <div className={styles.tierNextLabel}>
            <span style={{ color: cfg.color }}>{formatGems(lifetime)} GEMs générés</span>
            <span className={styles.tierNextInfo}>
              Prochain tier : <span style={{ color: nextCfg.color }}>{nextCfg.icon} {nextCfg.label}</span>
              {' '}à {formatGems(nextCfg.minGems)} GEMs
            </span>
          </div>
        </>
      )}
      {!nextCfg && (
        <div className={styles.tierNextLabel}>
          <span style={{ color: cfg.color }}>👑 Rang Maximum atteint — {formatGems(lifetime)} GEMs générés</span>
        </div>
      )}
    </div>
  );
};

// ─── Transaction Item ─────────────────────────────────────────────────────────

const TransactionItem: React.FC<{ tx: GemTransaction }> = ({ tx }) => {
  const conf = TX_TYPE_CONFIG[tx.type] ?? { label: tx.type, icon: '💎', color: '#6366f1' };
  const isEarn = tx.amount > 0;
  return (
    <div className={styles.txItem}>
      <div className={styles.txIcon} style={{ background: `${conf.color}22`, color: conf.color }}>
        {conf.icon}
      </div>
      <div className={styles.txBody}>
        <div className={styles.txLabel}>{tx.label || conf.label}</div>
        {tx.assetName && <div className={styles.txSub}>{tx.assetName}</div>}
        <div className={styles.txDate}>{formatDate(tx.createdAt)}</div>
      </div>
      <div className={`${styles.txAmount} ${isEarn ? styles.txEarn : styles.txSpend}`}>
        {isEarn ? '+' : ''}{tx.amount} <span className={styles.txGemIcon}>💎</span>
      </div>
    </div>
  );
};

// ─── GEM Package Card ─────────────────────────────────────────────────────────

const PackageCard: React.FC<{ pkg: GemPackage; onBuy: (pkg: GemPackage) => void }> = ({ pkg, onBuy }) => (
  <div className={`${styles.pkgCard} ${pkg.popular ? styles.pkgPopular : ''} ${pkg.bestValue ? styles.pkgBest : ''}`}>
    {pkg.popular && <div className={styles.pkgBadge}>⭐ Populaire</div>}
    {pkg.bestValue && <div className={`${styles.pkgBadge} ${styles.pkgBadgeBest}`}>🏆 Meilleure valeur</div>}
    <div className={styles.pkgIcon}>{pkg.icon}</div>
    <div className={styles.pkgLabel}>{pkg.label}</div>
    <div className={styles.pkgGems}>
      <span className={styles.pkgGemsMain}>{formatGems(pkg.totalGems)}</span>
      <span className={styles.pkgGemsUnit}>GEMmes</span>
    </div>
    {pkg.bonusGems > 0 && (
      <div className={styles.pkgBonus}>+{pkg.bonusGems} GEMs bonus offerts !</div>
    )}
    <div className={styles.pkgEur}>€{pkg.eurPrice}</div>
    <button className={styles.pkgBtn} onClick={() => onBuy(pkg)}>
      Acheter →
    </button>
  </div>
);

// ─── How It Works ─────────────────────────────────────────────────────────────

const HowItWorks: React.FC = () => (
  <div className={styles.howItWorks}>
    <h3 className={styles.howTitle}>Comment fonctionnent les GEMmes ? 💎</h3>
    <div className={styles.howGrid}>
      <div className={styles.howStep}>
        <div className={styles.howStepIcon}>🚀</div>
        <div className={styles.howStepTitle}>1. Publiez</div>
        <div className={styles.howStepText}>
          Partagez vos créations (personnages, scènes, add-ons…). Vous recevez {GEM_REWARDS.PUBLISH_ASSET} GEMs à la publication.
        </div>
      </div>
      <div className={styles.howStep}>
        <div className={styles.howStepIcon}>⬇️</div>
        <div className={styles.howStepTitle}>2. Gagnez</div>
        <div className={styles.howStepText}>
          À chaque téléchargement de vos assets, vous gagnez automatiquement des GEMmes. +{GEM_REWARDS.DOWNLOAD_FREE_ASSET} GEMs par téléchargement.
        </div>
      </div>
      <div className={styles.howStep}>
        <div className={styles.howStepIcon}>🛍️</div>
        <div className={styles.howStepTitle}>3. Dépensez</div>
        <div className={styles.howStepText}>
          Utilisez vos GEMmes pour télécharger les créations de la communauté. 1 GEM ≈ 0,10 €.
        </div>
      </div>
      <div className={styles.howStep}>
        <div className={styles.howStepIcon}>🔄</div>
        <div className={styles.howStepTitle}>Boucle Créative</div>
        <div className={styles.howStepText}>
          Le partage génère des GEMs, les GEMs permettent d'acquérir plus d'assets, qui enrichissent vos projets.
        </div>
      </div>
    </div>

    <div className={styles.earningTable}>
      <h4 className={styles.earningTitle}>💰 Tableau des récompenses</h4>
      <div className={styles.earningRows}>
        {[
          { action: 'Publication initiale d\'un asset', gems: `+${GEM_REWARDS.PUBLISH_ASSET} GEMs` },
          { action: 'Chaque téléchargement de votre asset gratuit', gems: `+${GEM_REWARDS.DOWNLOAD_FREE_ASSET} GEMs` },
          { action: 'Chaque vente de votre asset payant', gems: `+${GEM_REWARDS.DOWNLOAD_PAID_ASSET_PCT}% du prix` },
          { action: 'Avis 5★ reçu (premier du jour)', gems: `+${GEM_REWARDS.FIRST_5_STAR_REVIEW} GEMs` },
          { action: 'Connexion quotidienne', gems: `+${GEM_REWARDS.DAILY_BONUS} GEMs` },
          { action: 'Parrainage d\'un ami', gems: `+${GEM_REWARDS.REFERRAL} GEMs` },
          { action: 'Asset mis en Featured', gems: `+${GEM_REWARDS.FEATURED_BONUS_PER_DAY} GEMs/jour` },
        ].map((row, i) => (
          <div key={i} className={styles.earningRow}>
            <span className={styles.earningAction}>{row.action}</span>
            <span className={styles.earningGems}>{row.gems}</span>
          </div>
        ))}
      </div>
    </div>

    <div className={styles.cryptoNote}>
      <span className={styles.cryptoIcon}>₿</span>
      <div>
        <strong>Crypto à venir :</strong> Nous étudions l'intégration de stablecoins (USDC/EURS sur Polygon ou Solana)
        pour permettre des retraits décentralisés de vos revenus GEM. Rejoignez la liste d'attente.
      </div>
    </div>
  </div>
);

// ─── Main GemWallet Component ─────────────────────────────────────────────────

type WalletTab = 'overview' | 'history' | 'shop' | 'earn';

interface GemWalletProps {
  onClose?: () => void;
}

export const GemWallet: React.FC<GemWalletProps> = ({ onClose }) => {
  const { wallet, transactions } = useNexRealmStore();
  const [activeTab, setActiveTab] = useState<WalletTab>('overview');
  const [purchaseConfirm, setPurchaseConfirm] = useState<GemPackage | null>(null);

  const handleBuyPackage = (pkg: GemPackage) => {
    setPurchaseConfirm(pkg);
  };

  const handleConfirmPurchase = () => {
    if (!purchaseConfirm) return;
    useNexRealmStore.getState().buyGemPackage(purchaseConfirm);
    setPurchaseConfirm(null);
  };

  if (!wallet) {
    return (
      <div className={styles.wallet}>
        <div className={styles.walletEmpty}>
          <span style={{ fontSize: 40 }}>💎</span>
          <p>Connectez-vous pour accéder à votre wallet GEM</p>
        </div>
      </div>
    );
  }

  const tierConfig = CREATOR_TIER_CONFIG[wallet.tier];

  return (
    <div className={styles.wallet}>
      {/* Header */}
      <div className={styles.walletHeader}>
        <div className={styles.walletBrand}>
          <span className={styles.walletGemIcon}>💎</span>
          <div>
            <div className={styles.walletTitle}>GEM Wallet</div>
            <div className={styles.walletSub}>NexRealm Economy</div>
          </div>
        </div>
        {onClose && (
          <button className={styles.walletClose} onClick={onClose} aria-label="Fermer">✕</button>
        )}
      </div>

      {/* Balance Hero */}
      <div className={styles.balanceHero}>
        <div className={styles.balanceGlow} />
        <div className={styles.balanceMain}>
          <span className={styles.balanceBigIcon}>💎</span>
          <div>
            <div className={styles.balanceAmount}>{wallet.balance.total.toLocaleString()}</div>
            <div className={styles.balanceLabel}>GEMmes disponibles</div>
          </div>
        </div>
        <div className={styles.balanceBreakdown}>
          <div className={styles.balanceSub}>
            <span>🔷 Standard</span>
            <strong>{wallet.balance.standard.toLocaleString()}</strong>
          </div>
          <div className={styles.balanceSub}>
            <span>👑 Premium</span>
            <strong>{wallet.balance.premium.toLocaleString()}</strong>
          </div>
          <div className={styles.balanceSub}>
            <span>🎁 Bonus</span>
            <strong>{wallet.balance.bonus.toLocaleString()}</strong>
          </div>
          {wallet.balance.pendingPayout > 0 && (
            <div className={styles.balanceSub}>
              <span>⏳ En attente</span>
              <strong style={{ color: '#f59e0b' }}>{wallet.balance.pendingPayout.toLocaleString()}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Tier Progress */}
      <TierProgress tier={wallet.tier} lifetime={wallet.balance.lifetime} />

      {/* Tabs */}
      <div className={styles.tabs}>
        {([
          { key: 'overview', label: '🏠 Vue d\'ensemble' },
          { key: 'history',  label: '📜 Historique' },
          { key: 'shop',     label: '🛒 Acheter des GEMs' },
          { key: 'earn',     label: '💡 Gagner des GEMs' },
        ] as { key: WalletTab; label: string }[]).map(t => (
          <button
            key={t.key}
            className={`${styles.tab} ${activeTab === t.key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(t.key)}
            id={`gem-tab-${t.key}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>

        {/* ── Overview ── */}
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* Stats Cards */}
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{ background: '#10b98122' }}>⬇️</div>
              <div className={styles.statCardValue} style={{ color: '#10b981' }}>
                +{wallet.balance.lifetime.toLocaleString()}
              </div>
              <div className={styles.statCardLabel}>GEMs générés (total)</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{ background: '#6366f122' }}>💎</div>
              <div className={styles.statCardValue} style={{ color: '#6366f1' }}>
                {wallet.balance.total.toLocaleString()}
              </div>
              <div className={styles.statCardLabel}>GEMs disponibles</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{ background: '#f59e0b22' }}>⭐</div>
              <div className={styles.statCardValue} style={{ color: tierConfig.color }}>
                {tierConfig.icon} {tierConfig.label}
              </div>
              <div className={styles.statCardLabel}>Tier créateur</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statCardIcon} style={{ background: '#06b6d422' }}>💰</div>
              <div className={styles.statCardValue} style={{ color: '#06b6d4' }}>
                €{(wallet.balance.lifetime * 0.10 * tierConfig.revenueShare / 100).toFixed(2)}
              </div>
              <div className={styles.statCardLabel}>Revenus estimés</div>
            </div>

            {/* Recent Transactions */}
            <div className={styles.recentTx}>
              <h4 className={styles.recentTitle}>Transactions récentes</h4>
              {transactions.length === 0 ? (
                <div className={styles.emptyTx}>Aucune transaction pour le moment</div>
              ) : (
                transactions.slice(0, 5).map(tx => <TransactionItem key={tx.id} tx={tx} />)
              )}
              {transactions.length > 5 && (
                <button className={styles.seeAllBtn} onClick={() => setActiveTab('history')}>
                  Voir tout l'historique →
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── History ── */}
        {activeTab === 'history' && (
          <div className={styles.historyList}>
            {transactions.length === 0 ? (
              <div className={styles.emptyTx}>Aucune transaction pour le moment.<br />Publiez votre premier asset pour commencer à gagner des GEMs ! 🚀</div>
            ) : (
              transactions.map(tx => <TransactionItem key={tx.id} tx={tx} />)
            )}
          </div>
        )}

        {/* ── Shop ── */}
        {activeTab === 'shop' && (
          <div className={styles.shopWrap}>
            <div className={styles.shopHeader}>
              <h3 className={styles.shopTitle}>Acheter des GEMmes</h3>
              <p className={styles.shopSub}>
                Les GEMmes premium permettent de télécharger des assets exclusifs et d'accéder aux fonctionnalités avancées du marketplace.
                <br />
                <span style={{ color: 'var(--g-text-3)', fontSize: 11 }}>1 GEM ≈ 0,10 € · TVA incluse selon votre pays</span>
              </p>
            </div>
            <div className={styles.pkgGrid}>
              {GEM_PACKAGES.map(pkg => (
                <PackageCard key={pkg.id} pkg={pkg} onBuy={handleBuyPackage} />
              ))}
            </div>
            <div className={styles.shopNote}>
              💡 Vous pouvez aussi gagner des GEMs <strong>gratuitement</strong> en partageant vos créations avec la communauté.
            </div>
          </div>
        )}

        {/* ── Earn ── */}
        {activeTab === 'earn' && <HowItWorks />}
      </div>

      {/* Purchase Confirm Modal */}
      {purchaseConfirm && (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>{purchaseConfirm.icon}</div>
            <h3 className={styles.confirmTitle}>Confirmer l'achat</h3>
            <p className={styles.confirmText}>
              Vous allez acheter <strong>{purchaseConfirm.totalGems.toLocaleString()} GEMmes</strong> pour <strong>€{purchaseConfirm.eurPrice}</strong>.
            </p>
            {purchaseConfirm.bonusGems > 0 && (
              <p className={styles.confirmBonus}>🎁 +{purchaseConfirm.bonusGems} GEMs bonus inclus !</p>
            )}
            <p className={styles.confirmNote}>
              (Simulation — Le paiement réel sera disponible sur nexrealm.shop)
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setPurchaseConfirm(null)}>Annuler</button>
              <button className={styles.confirmOk} onClick={handleConfirmPurchase}>
                💳 Confirmer — €{purchaseConfirm.eurPrice}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GemWallet;
