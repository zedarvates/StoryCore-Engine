"""
GemReward System — Database Models
====================================
Modèles SQLAlchemy pour le système de récompenses par gemmes.

Supporte tous les types de contributeurs :
  - Humains (JWT)
  - LLM-assistés (JWT)
  - Semi-automatisés (JWT)
  - Agents entièrement automatisés (API Key → sc_agent_{uuid})

La règle universelle : un compte StoryCore identifié est toujours requis.

Version: 1.0.0
"""

from datetime import datetime

from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, JSON, Index
import enum

# Réutilise la même Base que database_models.py
try:
    from backend.database_models import Base, generate_uuid, TimestampMixin
except ImportError:
    from database_models import Base, generate_uuid, TimestampMixin


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────


class ContributorType(str, enum.Enum):
    human = "human"
    llm_assisted = "llm_assisted"
    semi_automated = "semi_automated"
    automated_agent = "automated_agent"


class RewardStatus(str, enum.Enum):
    pending = "pending"  # Issue créée, en attente validation mainteneur
    rewarded = "rewarded"  # Gemmes créditées
    rejected = "rejected"  # Report rejeté (non-valide, hors-scope)
    duplicate = "duplicate"  # Doublon d'une issue existante
    expired = "expired"  # Trop ancien sans réponse


class TransactionType(str, enum.Enum):
    bug_report = "bug_report"
    feature_request = "feature_request"
    roadmap_idea = "roadmap_idea"
    bonus = "bonus"
    streak_bonus = "streak_bonus"
    referral = "referral"
    spent = "spent"  # Utilisation future (marketplace, etc.)


class GemTier(str, enum.Enum):
    contributor = "contributor"  # 0–9 gemmes
    silver = "silver"  # 10–29 gemmes
    gold = "gold"  # 30–99 gemmes
    legend = "legend"  # 100+ gemmes


# ─────────────────────────────────────────────
# AgentApiKey — Clés d'API pour agents automatisés
# ─────────────────────────────────────────────


class AgentApiKey(Base, TimestampMixin):
    """
    Clé d'API dédiée aux agents automatisés (MCP, bots, scripts CI/CD).

    Chaque clé est liée à un compte StoryCore identifié (owner).
    Les gemmes sont créditées sur le compte owner.

    Format de la clé : sc_agent_{uuid_hex_32}
    """

    __tablename__ = "gem_agent_api_keys"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    owner_user_id = Column(String(36), nullable=False, index=True)
    # Note: ForeignKey vers video_editor_users, mais on ne crée pas la relation
    # pour garder ce module indépendant de database_models.py

    # Identité de l'agent
    agent_name = Column(String(255), nullable=False)
    agent_description = Column(Text, nullable=True)
    framework = Column(String(100), nullable=True)  # "MCP", "LangChain", "custom", etc.
    agent_version = Column(String(50), nullable=True)

    # La clé (stockée hashée en prod, affichée une seule fois à la création)
    key_prefix = Column(String(20), nullable=False)  # "sc_agent_" + 8 premiers chars
    key_hash = Column(
        String(128), nullable=False, unique=True
    )  # SHA256 de la clé complète

    # Statut
    is_active = Column(Boolean, default=True, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    revoked_reason = Column(String(255), nullable=True)

    # Limites et stats
    rate_limit_per_hour = Column(Integer, default=20)
    total_reports_submitted = Column(Integer, default=0)
    total_duplicates_submitted = Column(Integer, default=0)
    total_gems_earned = Column(Integer, default=0)

    # Flags anti-abus
    is_flagged = Column(Boolean, default=False)
    flag_reason = Column(String(255), nullable=True)
    flagged_at = Column(DateTime, nullable=True)

    # Dernier usage
    last_used_at = Column(DateTime, nullable=True)
    last_used_ip = Column(String(45), nullable=True)

    __table_args__ = (
        Index("idx_agent_key_owner", "owner_user_id"),
        Index("idx_agent_key_active", "is_active"),
        Index("idx_agent_key_hash", "key_hash"),
    )

    def __repr__(self):
        return f"<AgentApiKey(id={self.id}, agent={self.agent_name}, owner={self.owner_user_id})>"

    @property
    def duplicate_ratio(self) -> float:
        """Ratio de doublons soumis. > 0.80 = suspect."""
        if self.total_reports_submitted == 0:
            return 0.0
        return self.total_duplicates_submitted / self.total_reports_submitted

    @property
    def should_be_flagged(self) -> bool:
        """Détermine si la clé devrait être flaggée automatiquement."""
        return self.total_reports_submitted >= 10 and self.duplicate_ratio > 0.80


# ─────────────────────────────────────────────
# GemTransaction — Historique des gemmes
# ─────────────────────────────────────────────


class GemTransaction(Base, TimestampMixin):
    """
    Historique de toutes les transactions de gemmes.

    Chaque ligne représente un crédit ou débit de gemmes.
    Immuable une fois créée (pas de modification, uniquement annulation via nouvelle ligne).
    """

    __tablename__ = "gem_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, index=True)

    # Montant (positif = crédit, négatif = débit)
    amount = Column(Integer, nullable=False)

    # Type de transaction
    transaction_type = Column(String(50), nullable=False)

    # Type de contributeur à l'origine
    contributor_type = Column(String(50), nullable=True)
    agent_name = Column(String(255), nullable=True)  # Si agent automatisé

    # Référence GitHub
    github_issue_number = Column(Integer, nullable=True)
    github_issue_url = Column(String(500), nullable=True)
    github_issue_title = Column(String(255), nullable=True)

    # Description
    description = Column(String(500), nullable=True)

    # Statut de la transaction
    status = Column(String(50), default="confirmed", nullable=False)
    # confirmed | cancelled

    # Snapshot du solde AVANT cette transaction (pour audit)
    balance_before = Column(Integer, nullable=True)
    balance_after = Column(Integer, nullable=True)

    __table_args__ = (
        Index("idx_gem_tx_user_time", "user_id", "created_at"),
        Index("idx_gem_tx_type", "transaction_type"),
        Index("idx_gem_tx_github", "github_issue_number"),
    )

    def __repr__(self):
        sign = "+" if self.amount > 0 else ""
        return f"<GemTransaction(id={self.id}, user={self.user_id}, {sign}{self.amount}💎)>"


# ─────────────────────────────────────────────
# ContributionReport — Tracking des reports
# ─────────────────────────────────────────────


class ContributionReport(Base, TimestampMixin):
    """
    Tracking de chaque report soumis et son statut de récompense.

    Lié à un seul utilisateur (ou un agent via owner_user_id).
    Un report = une récompense maximum.
    """

    __tablename__ = "gem_contribution_reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)

    # Identité du contributeur
    user_id = Column(String(36), nullable=False, index=True)
    contributor_type = Column(String(50), nullable=False, default="human")
    agent_api_key_id = Column(String(36), nullable=True)  # Si agent automatisé
    agent_name = Column(String(255), nullable=True)

    # GitHub
    github_issue_number = Column(Integer, nullable=True, unique=True)
    github_issue_url = Column(String(500), nullable=True)
    github_issue_title = Column(String(255), nullable=True)

    # Métadonnées du report
    report_type = Column(String(50), nullable=False)  # bug | enhancement | question
    severity = Column(String(50), nullable=True)  # critical | major | minor

    # Duplicate detection
    description_fingerprint = Column(String(64), nullable=False)  # SHA256
    description_summary = Column(String(300), nullable=True)  # Résumé pour affichage

    # Statut de récompense
    reward_status = Column(String(50), default="pending", nullable=False)

    # Gemmes attribuées
    gems_awarded = Column(Integer, default=0)
    gem_transaction_id = Column(String(36), nullable=True)

    # Timestamps de workflow
    github_created_at = Column(DateTime, nullable=True)
    rewarded_at = Column(DateTime, nullable=True)
    rejected_at = Column(DateTime, nullable=True)

    # Raison du rejet (si applicable)
    rejection_reason = Column(String(255), nullable=True)

    # GitHub labels au moment de la récompense
    github_labels_snapshot = Column(JSON, nullable=True)

    # IP du soumetteur (pour analytics, non-affiché)
    submitter_ip = Column(String(45), nullable=True)

    __table_args__ = (
        Index("idx_contrib_user_status", "user_id", "reward_status"),
        Index("idx_contrib_fingerprint", "description_fingerprint"),
        Index("idx_contrib_github_issue", "github_issue_number"),
        Index("idx_contrib_type", "report_type"),
    )

    def __repr__(self):
        return (
            f"<ContributionReport(id={self.id}, "
            f"user={self.user_id}, "
            f"issue=#{self.github_issue_number}, "
            f"status={self.reward_status}, "
            f"gems={self.gems_awarded})>"
        )


# ─────────────────────────────────────────────
# GemLeaderboardEntry — Cache du leaderboard
# ─────────────────────────────────────────────


class GemLeaderboardCache(Base):
    """
    Cache calculé du leaderboard (mise à jour périodique).
    Évite les requêtes GROUP BY lourdes sur GemTransaction.
    """

    __tablename__ = "gem_leaderboard_cache"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), nullable=False, unique=True, index=True)

    # Pseudonyme public (peut être différent du vrai nom)
    display_name = Column(String(100), nullable=False)
    avatar_url = Column(String(500), nullable=True)

    # Stats
    gem_balance = Column(Integer, default=0)
    gem_total_earned = Column(Integer, default=0)
    gem_tier = Column(String(50), default="contributor")
    total_reports = Column(Integer, default=0)
    accepted_reports = Column(Integer, default=0)

    # Contributions humaines vs agents
    human_reports = Column(Integer, default=0)
    agent_reports = Column(Integer, default=0)

    # Rang
    rank_overall = Column(Integer, nullable=True)
    rank_monthly = Column(Integer, nullable=True)

    # Période
    period_month = Column(String(7), nullable=True)  # "2026-03"
    last_computed_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_leaderboard_gems", "gem_total_earned"),
        Index("idx_leaderboard_period", "period_month"),
    )

    def __repr__(self):
        return f"<GemLeaderboard(#{self.rank_overall} {self.display_name}: {self.gem_total_earned}💎)>"
