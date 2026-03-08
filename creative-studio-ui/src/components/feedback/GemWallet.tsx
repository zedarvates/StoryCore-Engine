/**
 * GemWallet — StoryCore GemReward UI Component
 * =============================================
 * Widget compact affiché dans la navbar / barre de tâches.
 * Montre le solde de gemmes, le tier, et la progression.
 *
 * Ongle dans le "nouveau monde" donde humains et agents IA
 * collaborent dans le même écosystème de confiance.
 *
 * Features :
 * - Solde de gemmes animé (animation de particules lors d'un gain)
 * - Indicateur de tier avec couleur dynamique
 * - Barre de progression vers le tier suivant
 * - Panel expansible avec historique des transactions
 * - Réception des notifications WebSocket (gem_awarded)
 * - Badge spécial pour les agents automatisés
 */

import React, { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export type GemTier = 'contributor' | 'silver' | 'gold' | 'legend';

export interface GemBalance {
  user_id: string;
  gem_balance: number;
  gem_total_earned: number;
  gem_tier: GemTier;
  tier_label: string;
  tier_progress: number;     // 0.0 → 1.0
  next_tier: GemTier | null;
  gems_to_next_tier: number | null;
}

export interface GemTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  contributor_type?: string;
  agent_name?: string;
  github_issue_number?: number;
  github_issue_url?: string;
  github_issue_title?: string;
  description?: string;
  status: string;
  created_at: string;
}

interface GemAwardedEvent {
  type: 'gem_awarded';
  gems: number;
  new_balance: number;
  new_tier: GemTier;
  issue_number: number;
  issue_url: string;
  issue_title: string;
  contributor_type: string;
  message: string;
}

// ─────────────────────────────────────────────────────────────────
// Config des tiers
// ─────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<GemTier, {
  label: string;
  color: string;
  glowColor: string;
  icon: string;
  gradient: string;
}> = {
  contributor: {
    label: 'Contributeur',
    color: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.3)',
    icon: '💎',
    gradient: 'linear-gradient(135deg, #64748b, #94a3b8)',
  },
  silver: {
    label: 'Argent',
    color: '#cbd5e1',
    glowColor: 'rgba(203, 213, 225, 0.4)',
    icon: '💎',
    gradient: 'linear-gradient(135deg, #94a3b8, #e2e8f0)',
  },
  gold: {
    label: 'Or',
    color: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.4)',
    icon: '💎',
    gradient: 'linear-gradient(135deg, #d97706, #fbbf24)',
  },
  legend: {
    label: 'Légende',
    color: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.5)',
    icon: '👑',
    gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa, #c4b5fd)',
  },
};

// ─────────────────────────────────────────────────────────────────
// GemParticle — Particule d'animation lors d'un gain
// ─────────────────────────────────────────────────────────────────

interface GemParticleProps {
  id: number;
  gems: number;
  onComplete: (id: number) => void;
}

const GemParticle: React.FC<GemParticleProps> = ({ id, gems, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(id), 1800);
    return () => clearTimeout(timer);
  }, [id, onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        zIndex: 9999,
        animation: 'gemFloat 1.8s ease-out forwards',
        pointerEvents: 'none',
        fontSize: '18px',
        fontWeight: 700,
        color: '#fbbf24',
        textShadow: '0 0 12px rgba(251, 191, 36, 0.8)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
    >
      +{gems} 💎
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// GemWallet — Composant principal
// ─────────────────────────────────────────────────────────────────

interface GemWalletProps {
  /** Token JWT ou API Key de l'utilisateur connecté */
  authToken?: string;
  /** URL de base de l'API */
  apiBaseUrl?: string;
  /** Compact (navbar) ou expanded (page profil) — prévu pour Phase 2 */
  _variant?: 'compact' | 'expanded';
  /** Classe CSS personnalisée */
  className?: string;
}

export const GemWallet: React.FC<GemWalletProps> = ({
  authToken,
  apiBaseUrl = 'http://localhost:8080',
  _variant = 'compact',
  className = '',
}) => {
  const [balance, setBalance] = useState<GemBalance | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [transactions, setTransactions] = useState<GemTransaction[]>([]);
  const [particles, setParticles] = useState<{ id: number; gems: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentAward, setRecentAward] = useState<GemAwardedEvent | null>(null);
  const [particleCounter, setParticleCounter] = useState(0);

  // ─── Fetch balance ───
  const fetchBalance = useCallback(async () => {
    if (!authToken) return;
    try {
      setIsLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/gems/balance`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data);
      }
    } catch (e) {
      console.warn('GemWallet: Failed to fetch balance', e);
    } finally {
      setIsLoading(false);
    }
  }, [authToken, apiBaseUrl]);

  // ─── Fetch history ───
  const fetchHistory = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/gems/history`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (e) {
      console.warn('GemWallet: Failed to fetch history', e);
    }
  }, [authToken, apiBaseUrl]);

  // ─── Init ───
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // ─── Open panel ───
  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) fetchHistory();
  };

  // ─── Notification WebSocket simulée (en prod : via useWebSocket hook) ───
  // Exposé pour les tests et debug dev (préfixé _ = intentionnellement non utilisé en prod)
  const _simulateGemAward = (gems: number, issueNumber: number) => {
    const event: GemAwardedEvent = {
      type: 'gem_awarded',
      gems,
      new_balance: (balance?.gem_balance || 0) + gems,
      new_tier: balance?.gem_tier || 'contributor',
      issue_number: issueNumber,
      issue_url: `https://github.com/zedarvates/StoryCore-Engine/issues/${issueNumber}`,
      issue_title: `Issue #${issueNumber}`,
      contributor_type: 'human',
      message: `🎉 +${gems} gemme(s) !`,
    };
    handleGemAwarded(event);
  };

  const handleGemAwarded = (event: GemAwardedEvent) => {
    // Mettre à jour le solde
    setBalance(prev => prev ? {
      ...prev,
      gem_balance: event.new_balance,
      gem_tier: event.new_tier,
    } : null);

    // Afficher la particule
    const newId = particleCounter + 1;
    setParticleCounter(newId);
    setParticles(prev => [...prev, { id: newId, gems: event.gems }]);

    // Afficher le toast
    setRecentAward(event);
    setTimeout(() => setRecentAward(null), 4000);
  };

  const removeParticle = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  if (!authToken) return null;

  const tierConf = balance ? TIER_CONFIG[balance.gem_tier] : TIER_CONFIG.contributor;

  // ─────────────────────────────────────────────────────────────────
  // Render compact (pour la navbar)
  // ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Animations CSS */}
      <style>{`
        @keyframes gemFloat {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          60%  { opacity: 1; transform: translateY(-60px) scale(1.3); }
          100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
        }
        @keyframes gemPulse {
          0%, 100% { box-shadow: 0 0 8px ${tierConf.glowColor}; }
          50%       { box-shadow: 0 0 20px ${tierConf.glowColor}, 0 0 40px ${tierConf.glowColor}; }
        }
        @keyframes tierShimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes fadeInUp {
          from { transform: translateY(8px); opacity: 0; }
          to   { transform: translateY(0);   opacity: 1; }
        }
      `}</style>

      {/* Particules de gemmes */}
      {particles.map(p => (
        <GemParticle key={p.id} id={p.id} gems={p.gems} onComplete={removeParticle} />
      ))}

      {/* Toast notification */}
      {recentAward && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9998,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${tierConf.color}40`,
          borderRadius: '12px',
          padding: '14px 18px',
          maxWidth: '320px',
          animation: 'slideInRight 0.3s ease-out',
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 16px ${tierConf.glowColor}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>💎</span>
            <div>
              <div style={{ color: tierConf.color, fontWeight: 700, fontSize: '14px' }}>
                +{recentAward.gems} gemme{recentAward.gems > 1 ? 's' : ''} !
              </div>
              <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                Issue #{recentAward.issue_number} validée par les mainteneurs
              </div>
            </div>
          </div>
          <div style={{
            marginTop: '8px',
            height: '2px',
            background: `linear-gradient(to right, ${tierConf.color}, transparent)`,
            borderRadius: '2px',
          }} />
        </div>
      )}

      {/* Bouton GemWallet dans la navbar */}
      <div className={className} style={{ position: 'relative' }}>
        <button
          id="gem-wallet-btn"
          onClick={handleToggle}
          title={`💎 ${balance?.gem_balance ?? '...'} gemmes — ${tierConf.label}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${tierConf.color}50`,
            borderRadius: '20px',
            cursor: 'pointer',
            color: tierConf.color,
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            animation: recentAward ? 'gemPulse 0.8s ease 3' : 'none',
          }}
          onMouseEnter={e => {
            (e.target as HTMLElement).style.borderColor = tierConf.color;
            (e.target as HTMLElement).style.boxShadow = `0 0 12px ${tierConf.glowColor}`;
          }}
          onMouseLeave={e => {
            (e.target as HTMLElement).style.borderColor = `${tierConf.color}50`;
            (e.target as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <span style={{ fontSize: '16px' }}>{tierConf.icon}</span>
          <span>{isLoading ? '...' : (balance?.gem_balance ?? 0)}</span>
        </button>

        {/* Panel expansible */}
        {isOpen && (
          <div
            id="gem-wallet-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '300px',
              background: 'rgba(10, 15, 30, 0.95)',
              backdropFilter: 'blur(20px)',
              border: `1px solid ${tierConf.color}30`,
              borderRadius: '16px',
              boxShadow: `0 16px 48px rgba(0,0,0,0.5), 0 0 24px ${tierConf.glowColor}`,
              animation: 'fadeInUp 0.2s ease-out',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              background: tierConf.gradient,
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#fff' }}>
                    {tierConf.icon} {balance?.gem_balance ?? 0}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                    gemmes disponibles
                  </div>
                </div>
                <div style={{
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#fff',
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  {tierConf.label}
                </div>
              </div>

              {/* Barre de progression */}
              {balance && balance.next_tier && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.6)',
                    marginBottom: '4px',
                  }}>
                    <span>{tierConf.label}</span>
                    <span>{TIER_CONFIG[balance.next_tier].label} ({balance.gems_to_next_tier} 💎)</span>
                  </div>
                  <div style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${(balance.tier_progress * 100).toFixed(0)}%`,
                      background: 'rgba(255,255,255,0.8)',
                      borderRadius: '2px',
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )}
            </div>

            {/* Transactions récentes */}
            <div style={{ padding: '12px', maxHeight: '220px', overflowY: 'auto' }}>
              <div style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#64748b',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: '8px',
              }}>
                Transactions récentes
              </div>

              {transactions.length === 0 ? (
                <div style={{ color: '#475569', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                  Soumettez votre premier bug ou idée pour gagner des gemmes !
                </div>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#e2e8f0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {tx.github_issue_title || tx.description || 'Transaction'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        {tx.contributor_type === 'automated_agent'
                          ? `🤖 ${tx.agent_name}`
                          : '👤 Direct'
                        }
                        {tx.github_issue_number && ` · #${tx.github_issue_number}`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: tx.amount > 0 ? '#34d399' : '#f87171',
                      marginLeft: '8px',
                      flexShrink: 0,
                    }}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount} 💎
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <a
                href="#"
                id="gem-report-bug-link"
                style={{ fontSize: '11px', color: '#60a5fa', textDecoration: 'none' }}
                onClick={(e) => {
                  e.preventDefault();
                  setIsOpen(false);
                  // Ouvrir le FeedbackPanel
                  document.getElementById('open-feedback-btn')?.click();
                }}
              >
                + Signaler un bug
              </a>
              <a
                href="#"
                id="gem-history-link"
                style={{ fontSize: '11px', color: '#64748b', textDecoration: 'none' }}
              >
                Tout voir →
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GemWallet;
