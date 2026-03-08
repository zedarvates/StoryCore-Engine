"""
GemReward Database Migration Script
=====================================
Script autonome pour créer les tables GemReward sans Alembic.
Peut être exécuté directement ou intégré dans le startup de l'API.

Usage :
    python -m backend.gem_migration

Ou pour initialiser au démarrage de l'API :
    from backend.gem_migration import run_gem_migration
    await run_gem_migration()

Version: 1.0.0
"""

import asyncio
import logging
import os
import sys

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# DDL SQL (fallback si SQLAlchemy non disponible)
# ─────────────────────────────────────────────

GEM_MIGRATION_SQL = """
-- ============================================================
-- GemReward Migration v1.0.0
-- Run once to create all GemReward tables
-- ============================================================

-- 1. Extension des colonnes User (gemmes)
-- Ces colonnes sont ajoutées à la table existante video_editor_users
ALTER TABLE video_editor_users
    ADD COLUMN IF NOT EXISTS gem_balance       INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gem_total_earned  INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS gem_tier          VARCHAR(50) DEFAULT 'contributor',
    ADD COLUMN IF NOT EXISTS github_username   VARCHAR(255);

-- 2. Table: Agent API Keys (pour agents automatisés)
CREATE TABLE IF NOT EXISTS gem_agent_api_keys (
    id                          VARCHAR(36)  PRIMARY KEY,
    owner_user_id               VARCHAR(36)  NOT NULL,
    agent_name                  VARCHAR(255) NOT NULL,
    agent_description           TEXT,
    framework                   VARCHAR(100),
    agent_version               VARCHAR(50),
    key_prefix                  VARCHAR(20)  NOT NULL,
    key_hash                    VARCHAR(128) NOT NULL UNIQUE,
    is_active                   BOOLEAN      NOT NULL DEFAULT TRUE,
    revoked_at                  TIMESTAMP,
    revoked_reason              VARCHAR(255),
    rate_limit_per_hour         INTEGER      NOT NULL DEFAULT 20,
    total_reports_submitted     INTEGER      NOT NULL DEFAULT 0,
    total_duplicates_submitted  INTEGER      NOT NULL DEFAULT 0,
    total_gems_earned           INTEGER      NOT NULL DEFAULT 0,
    is_flagged                  BOOLEAN      NOT NULL DEFAULT FALSE,
    flag_reason                 VARCHAR(255),
    flagged_at                  TIMESTAMP,
    last_used_at                TIMESTAMP,
    last_used_ip                VARCHAR(45),
    created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_key_owner  ON gem_agent_api_keys(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_key_active ON gem_agent_api_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_key_hash   ON gem_agent_api_keys(key_hash);

-- 3. Table: Gem Transactions (historique)
CREATE TABLE IF NOT EXISTS gem_transactions (
    id                      VARCHAR(36)  PRIMARY KEY,
    user_id                 VARCHAR(36)  NOT NULL,
    amount                  INTEGER      NOT NULL,
    transaction_type        VARCHAR(50)  NOT NULL,
    contributor_type        VARCHAR(50),
    agent_name              VARCHAR(255),
    github_issue_number     INTEGER,
    github_issue_url        VARCHAR(500),
    github_issue_title      VARCHAR(255),
    description             VARCHAR(500),
    status                  VARCHAR(50)  NOT NULL DEFAULT 'confirmed',
    balance_before          INTEGER,
    balance_after           INTEGER,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gem_tx_user_time ON gem_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_gem_tx_type      ON gem_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gem_tx_github    ON gem_transactions(github_issue_number);

-- 4. Table: Contribution Reports (tracking des rewards)
CREATE TABLE IF NOT EXISTS gem_contribution_reports (
    id                          VARCHAR(36)  PRIMARY KEY,
    user_id                     VARCHAR(36)  NOT NULL,
    contributor_type            VARCHAR(50)  NOT NULL DEFAULT 'human',
    agent_api_key_id            VARCHAR(36),
    agent_name                  VARCHAR(255),
    github_issue_number         INTEGER UNIQUE,
    github_issue_url            VARCHAR(500),
    github_issue_title          VARCHAR(255),
    report_type                 VARCHAR(50)  NOT NULL,
    severity                    VARCHAR(50),
    description_fingerprint     VARCHAR(64)  NOT NULL,
    description_summary         VARCHAR(300),
    reward_status               VARCHAR(50)  NOT NULL DEFAULT 'pending',
    gems_awarded                INTEGER      NOT NULL DEFAULT 0,
    gem_transaction_id          VARCHAR(36),
    github_created_at           TIMESTAMP,
    rewarded_at                 TIMESTAMP,
    rejected_at                 TIMESTAMP,
    rejection_reason            VARCHAR(255),
    github_labels_snapshot      JSONB,
    submitter_ip                VARCHAR(45),
    created_at                  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contrib_user_status   ON gem_contribution_reports(user_id, reward_status);
CREATE INDEX IF NOT EXISTS idx_contrib_fingerprint   ON gem_contribution_reports(description_fingerprint);
CREATE INDEX IF NOT EXISTS idx_contrib_github_issue  ON gem_contribution_reports(github_issue_number);
CREATE INDEX IF NOT EXISTS idx_contrib_type          ON gem_contribution_reports(report_type);

-- 5. Table: Leaderboard Cache
CREATE TABLE IF NOT EXISTS gem_leaderboard_cache (
    id                  VARCHAR(36)  PRIMARY KEY,
    user_id             VARCHAR(36)  NOT NULL UNIQUE,
    display_name        VARCHAR(100) NOT NULL,
    avatar_url          VARCHAR(500),
    gem_balance         INTEGER      NOT NULL DEFAULT 0,
    gem_total_earned    INTEGER      NOT NULL DEFAULT 0,
    gem_tier            VARCHAR(50)  NOT NULL DEFAULT 'contributor',
    total_reports       INTEGER      NOT NULL DEFAULT 0,
    accepted_reports    INTEGER      NOT NULL DEFAULT 0,
    human_reports       INTEGER      NOT NULL DEFAULT 0,
    agent_reports       INTEGER      NOT NULL DEFAULT 0,
    rank_overall        INTEGER,
    rank_monthly        INTEGER,
    period_month        VARCHAR(7),
    last_computed_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_gems   ON gem_leaderboard_cache(gem_total_earned DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON gem_leaderboard_cache(period_month);

-- ============================================================
-- Migration terminée ✅
-- ============================================================
"""


# ─────────────────────────────────────────────
# Migration via SQLAlchemy (méthode principale)
# ─────────────────────────────────────────────

async def run_gem_migration_sqlalchemy():
    """
    Crée les tables GemReward via create_all() SQLAlchemy.
    Utilisé au startup de l'API si DATABASE_URL est configuré.
    """
    database_url = os.getenv("DATABASE_URL", "")

    if not database_url:
        logger.info("DATABASE_URL not set — GemReward in mock mode (no DB tables created)")
        return False

    try:
        from sqlalchemy.ext.asyncio import create_async_engine
        from backend.database_models import Base as MainBase
        from backend.gem_models import (
            AgentApiKey, GemTransaction, ContributionReport, GemLeaderboardCache
        )

        # Convertir DATABASE_URL en async si nécessaire
        async_url = database_url.replace("postgresql://", "postgresql+asyncpg://")

        engine = create_async_engine(async_url, echo=False)

        async with engine.begin() as conn:
            # Créer les tables GemReward depuis les modèles
            await conn.run_sync(lambda sync_conn: (
                AgentApiKey.__table__.create(sync_conn, checkfirst=True),
                GemTransaction.__table__.create(sync_conn, checkfirst=True),
                ContributionReport.__table__.create(sync_conn, checkfirst=True),
                GemLeaderboardCache.__table__.create(sync_conn, checkfirst=True),
            ))

            # Ajouter les colonnes gem_ à la table users existante
            await conn.execute(
                __import__('sqlalchemy').text(
                    "ALTER TABLE video_editor_users "
                    "ADD COLUMN IF NOT EXISTS gem_balance INTEGER NOT NULL DEFAULT 0, "
                    "ADD COLUMN IF NOT EXISTS gem_total_earned INTEGER NOT NULL DEFAULT 0, "
                    "ADD COLUMN IF NOT EXISTS gem_tier VARCHAR(50) DEFAULT 'contributor', "
                    "ADD COLUMN IF NOT EXISTS github_username VARCHAR(255)"
                )
            )

        logger.info("✅ GemReward tables created via SQLAlchemy")
        return True

    except Exception as e:
        logger.error(f"GemReward migration (SQLAlchemy) failed: {e}")
        return False


# ─────────────────────────────────────────────
# Migration via SQL brut (fallback)
# ─────────────────────────────────────────────

async def run_gem_migration_raw_sql():
    """
    Exécute le DDL SQL directement via asyncpg.
    Utilisé en fallback si la migration SQLAlchemy échoue.
    """
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        return False

    try:
        import asyncpg
        conn = await asyncpg.connect(database_url)
        await conn.execute(GEM_MIGRATION_SQL)
        await conn.close()
        logger.info("✅ GemReward tables created via raw SQL")
        return True
    except ImportError:
        logger.warning("asyncpg not installed — cannot run raw SQL migration")
        return False
    except Exception as e:
        logger.error(f"GemReward migration (raw SQL) failed: {e}")
        return False


# ─────────────────────────────────────────────
# Point d'entrée principal
# ─────────────────────────────────────────────

async def run_gem_migration():
    """
    Lance la migration GemReward. Essaie SQLAlchemy d'abord, puis SQL brut.
    Idempotent : safe à appeler plusieurs fois (IF NOT EXISTS).
    """
    logger.info("💎 Running GemReward database migration...")

    # Essai 1 : SQLAlchemy
    success = await run_gem_migration_sqlalchemy()
    if success:
        return True

    # Essai 2 : SQL brut (asyncpg)
    success = await run_gem_migration_raw_sql()
    if success:
        return True

    # Pas de DB → mode mock
    logger.warning(
        "GemReward migration skipped (no DB connection). "
        "Running in mock mode. Set DATABASE_URL to enable persistent gem storage."
    )
    return False


# ─────────────────────────────────────────────
# Exécution directe
# ─────────────────────────────────────────────

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO,
                        format="%(asctime)s [%(levelname)s] %(message)s")

    print("\n💎 GemReward Database Migration")
    print("=" * 50)

    # Afficher le SQL si --show-sql
    if "--show-sql" in sys.argv:
        print("\nSQL à exécuter :")
        print(GEM_MIGRATION_SQL)
        sys.exit(0)

    result = asyncio.run(run_gem_migration())

    if result:
        print("\n✅ Migration terminée avec succès")
        print("Tables créées :")
        print("  - gem_agent_api_keys")
        print("  - gem_transactions")
        print("  - gem_contribution_reports")
        print("  - gem_leaderboard_cache")
        print("  - video_editor_users (colonnes gem_* ajoutées)")
    else:
        print("\n⚠️  Migration ignorée (mode mock — pas de DB configurée)")
        print("Configurez DATABASE_URL dans .env pour activer la persistance")
        print("\nPour voir le SQL : python -m backend.gem_migration --show-sql")
