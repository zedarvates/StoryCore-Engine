"""
GemReward — Gems API
======================
Endpoints REST pour le système de récompenses par gemmes.

Endpoints :
  GET  /api/gems/balance          → Solde actuel de l'utilisateur connecté
  GET  /api/gems/history          → Historique des transactions (paginé)
  GET  /api/gems/stats            → Statistiques personnelles
  GET  /api/gems/leaderboard      → Top 20 contributeurs
  GET  /api/gems/tiers            → Définition des tiers et avantages
  POST /api/agent-keys            → Créer une clé API pour un agent
  GET  /api/agent-keys            → Lister ses clés agents
  DELETE /api/agent-keys/{id}     → Révoquer une clé agent
  POST /api/v1/report/check-dup   → Pré-vérification doublon avant soumission

Version: 1.0.0
"""

import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Request, Query, status
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/gems", tags=["💎 GemReward"])
agent_keys_router = APIRouter(
    prefix="/api/agent-keys", tags=["💎 GemReward - Agent Keys"]
)
report_router = APIRouter(prefix="/api/v1/report", tags=["💎 GemReward - Reports"])


# ─────────────────────────────────────────────
# Schémas Pydantic
# ─────────────────────────────────────────────


class GemBalanceResponse(BaseModel):
    user_id: str
    gem_balance: int
    gem_total_earned: int
    gem_tier: str
    tier_label: str
    tier_progress: float  # 0.0 → 1.0 (progression vers le tier suivant)
    next_tier: Optional[str]
    gems_to_next_tier: Optional[int]


class GemTransactionResponse(BaseModel):
    id: str
    amount: int
    transaction_type: str
    contributor_type: Optional[str]
    agent_name: Optional[str]
    github_issue_number: Optional[int]
    github_issue_url: Optional[str]
    github_issue_title: Optional[str]
    description: Optional[str]
    status: str
    created_at: str


class GemHistoryResponse(BaseModel):
    transactions: List[GemTransactionResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class GemStatsResponse(BaseModel):
    user_id: str
    total_reports: int
    accepted_reports: int
    rejected_reports: int
    duplicate_reports: int
    pending_reports: int
    acceptance_rate: float
    gem_balance: int
    gem_total_earned: int
    gem_tier: str
    human_contributions: int
    agent_contributions: int
    best_contribution_gems: int


class LeaderboardEntry(BaseModel):
    rank: int
    user_id: str
    display_name: str
    avatar_url: Optional[str]
    gem_total_earned: int
    gem_tier: str
    total_reports: int
    accepted_reports: int


class TierInfo(BaseModel):
    tier: str
    label: str
    min_gems: int
    max_gems: Optional[int]
    color: str
    icon: str
    benefits: List[str]


class CreateAgentKeyRequest(BaseModel):
    agent_name: str = Field(
        ...,
        min_length=3,
        max_length=100,
        description="Nom de l'agent (ex: 'MyAutoTester v2.1')",
    )
    agent_description: Optional[str] = Field(None, max_length=500)
    framework: Optional[str] = Field(
        None, max_length=50, description="Framework utilisé (MCP, LangChain, custom...)"
    )
    agent_version: Optional[str] = Field(None, max_length=50)


class AgentKeyResponse(BaseModel):
    id: str
    agent_name: str
    key_prefix: str  # "sc_agent_abc12345..."
    full_key: Optional[str]  # Retourné UNE SEULE FOIS à la création
    framework: Optional[str]
    agent_version: Optional[str]
    is_active: bool
    is_flagged: bool
    total_reports_submitted: int
    total_gems_earned: int
    duplicate_ratio: float
    rate_limit_per_hour: int
    created_at: str
    last_used_at: Optional[str]


class DuplicateCheckRequest(BaseModel):
    description: str = Field(..., min_length=10)
    report_type: str = Field(..., pattern="^(bug|enhancement|question)$")


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    confidence: float
    method: str
    existing_issue_url: Optional[str]
    existing_issue_number: Optional[int]
    existing_issue_title: Optional[str]
    warning_message: Optional[str]


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

TIER_CONFIG = {
    "contributor": {
        "label": "Contributeur",
        "min_gems": 0,
        "max_gems": 9,
        "color": "#94a3b8",
        "icon": "💎",
        "benefits": ["Badge Contributeur", "Accès au leaderboard"],
    },
    "silver": {
        "label": "Argent",
        "min_gems": 10,
        "max_gems": 29,
        "color": "#cbd5e1",
        "icon": "💎",
        "benefits": [
            "Badge Argent",
            "Preview des features en beta",
            "+5% gemmes bonus",
        ],
    },
    "gold": {
        "label": "Or",
        "min_gems": 30,
        "max_gems": 99,
        "color": "#fbbf24",
        "icon": "💎",
        "benefits": [
            "Badge Or",
            "Accès anticipé aux nouvelles versions",
            "+10% gemmes bonus",
            "Mention dans le CHANGELOG",
        ],
    },
    "legend": {
        "label": "Légende",
        "min_gems": 100,
        "max_gems": None,
        "color": "#a78bfa",
        "icon": "👑",
        "benefits": [
            "Badge Légende",
            "Crédit officiel dans le README",
            "Accès Bêta privée",
            "+20% gemmes bonus",
            "Invitation Discord contributeurs VIP",
        ],
    },
}

TIER_ORDER = ["contributor", "silver", "gold", "legend"]


def _tier_progress(current_tier: str, total_gems: int):
    """Calcule la progression vers le tier suivant."""
    tier_index = TIER_ORDER.index(current_tier)
    if tier_index == len(TIER_ORDER) - 1:
        return 1.0, None, None  # Déjà au max

    next_tier = TIER_ORDER[tier_index + 1]
    current_min = TIER_CONFIG[current_tier]["min_gems"]
    next_min = TIER_CONFIG[next_tier]["min_gems"]

    gems_in_tier = total_gems - current_min
    gems_needed = next_min - current_min
    progress = min(1.0, gems_in_tier / gems_needed)
    gems_to_next = max(0, next_min - total_gems)

    return progress, next_tier, gems_to_next


def _mock_user_gems(user_id: str) -> dict:
    """Données mock pour dev sans DB."""
    return {
        "gem_balance": 7,
        "gem_total_earned": 7,
        "gem_tier": "contributor",
    }


# ─────────────────────────────────────────────
# GET /api/gems/balance
# ─────────────────────────────────────────────


@router.get(
    "/balance",
    response_model=GemBalanceResponse,
    summary="Solde de gemmes de l'utilisateur connecté",
)
async def get_gem_balance(request: Request):
    """
    Retourne le solde actuel de gemmes, le tier, et la progression.
    Authentification requise (JWT ou API Key agent).
    """
    from backend.contributor_auth import resolve_contributor

    contributor = await resolve_contributor(request)
    user_id = contributor.user_id

    # Mock en attendant la DB
    data = _mock_user_gems(user_id)
    total = data["gem_total_earned"]
    tier = data["gem_tier"]
    progress, next_tier, gems_to_next = _tier_progress(tier, total)

    return GemBalanceResponse(
        user_id=user_id,
        gem_balance=data["gem_balance"],
        gem_total_earned=total,
        gem_tier=tier,
        tier_label=TIER_CONFIG[tier]["label"],
        tier_progress=progress,
        next_tier=next_tier,
        gems_to_next_tier=gems_to_next,
    )


# ─────────────────────────────────────────────
# GET /api/gems/history
# ─────────────────────────────────────────────


@router.get(
    "/history",
    response_model=GemHistoryResponse,
    summary="Historique des transactions de gemmes",
)
async def get_gem_history(
    request: Request,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """
    Retourne l'historique paginé des transactions de gemmes de l'utilisateur.
    """
    from backend.contributor_auth import resolve_contributor

    await resolve_contributor(request)

    # Mock en dev
    mock_transactions = [
        GemTransactionResponse(
            id="tx_001",
            amount=2,
            transaction_type="bug_report",
            contributor_type="human",
            agent_name=None,
            github_issue_number=42,
            github_issue_url="https://github.com/zedarvates/StoryCore-Engine/issues/42",
            github_issue_title="[Bug] Crash lors de la génération LTX2 Ultra",
            description="Récompense #42: Bug LTX2 corrigé",
            status="confirmed",
            created_at=datetime.utcnow().isoformat(),
        )
    ]

    return GemHistoryResponse(
        transactions=mock_transactions,
        total=1,
        page=page,
        per_page=per_page,
        has_more=False,
    )


# ─────────────────────────────────────────────
# GET /api/gems/stats
# ─────────────────────────────────────────────


@router.get(
    "/stats",
    response_model=GemStatsResponse,
    summary="Statistiques personnelles de contribution",
)
async def get_gem_stats(request: Request):
    """Retourne les statistiques de contribution de l'utilisateur."""
    from backend.contributor_auth import resolve_contributor

    contributor = await resolve_contributor(request)

    return GemStatsResponse(
        user_id=contributor.user_id,
        total_reports=1,
        accepted_reports=1,
        rejected_reports=0,
        duplicate_reports=0,
        pending_reports=0,
        acceptance_rate=1.0,
        gem_balance=7,
        gem_total_earned=7,
        gem_tier="contributor",
        human_contributions=1,
        agent_contributions=0,
        best_contribution_gems=2,
    )


# ─────────────────────────────────────────────
# GET /api/gems/leaderboard
# ─────────────────────────────────────────────


@router.get(
    "/leaderboard",
    response_model=List[LeaderboardEntry],
    summary="Top 20 contributeurs — Leaderboard",
)
async def get_leaderboard(
    period: Optional[str] = Query(
        None, description="Période : 'monthly' ou 'all-time'"
    ),
):
    """
    Retourne le classement des 20 meilleurs contributeurs.
    Accessible sans authentification (données publiques anonymisées).
    """
    # Mock
    return [
        LeaderboardEntry(
            rank=1,
            user_id="anon_hero",
            display_name="AlphaContributor",
            avatar_url=None,
            gem_total_earned=42,
            gem_tier="gold",
            total_reports=18,
            accepted_reports=14,
        )
    ]


# ─────────────────────────────────────────────
# GET /api/gems/tiers
# ─────────────────────────────────────────────


@router.get(
    "/tiers",
    response_model=List[TierInfo],
    summary="Définition des tiers et avantages",
)
async def get_tiers():
    """Retourne la liste de tous les tiers avec leurs avantages."""
    return [
        TierInfo(
            tier=tier_key,
            label=cfg["label"],
            min_gems=cfg["min_gems"],
            max_gems=cfg["max_gems"],
            color=cfg["color"],
            icon=cfg["icon"],
            benefits=cfg["benefits"],
        )
        for tier_key, cfg in TIER_CONFIG.items()
    ]


# ─────────────────────────────────────────────
# POST /api/v1/report/check-dup
# ─────────────────────────────────────────────


@report_router.post(
    "/check-dup",
    response_model=DuplicateCheckResponse,
    summary="Pré-vérification doublon avant soumission",
)
async def check_duplicate_before_report(
    request: Request,
    body: DuplicateCheckRequest,
):
    """
    Vérifie si un report potentiel est un doublon AVANT de le soumettre.
    Permet d'afficher un avertissement dans l'UI : "Cet issue semble déjà connu".
    Non-bloquant pour les humains, informatif uniquement.
    """
    from backend.contributor_auth import resolve_contributor
    from backend.duplicate_checker import check_duplicate_full
    import os

    contributor = await resolve_contributor(request)
    github_token = os.getenv("GITHUB_API_TOKEN")

    result = await check_duplicate_full(
        description=body.description,
        report_type=body.report_type,
        github_token=github_token,
        db_session=None,  # À injecter avec vraie DB
        is_agent=contributor.is_agent,
    )

    warning = None
    if result.details.get("human_warning"):
        warning = result.details["human_warning"]
    elif result.is_duplicate:
        confidence_pct = int(result.confidence * 100)
        warning = (
            f"Ce report ressemble à {confidence_pct}% à une issue existante : "
            f"{result.existing_issue_title}"
        )

    return DuplicateCheckResponse(
        is_duplicate=result.is_duplicate,
        confidence=result.confidence,
        method=result.method,
        existing_issue_url=result.existing_issue_url,
        existing_issue_number=result.existing_issue_number,
        existing_issue_title=result.existing_issue_title,
        warning_message=warning,
    )


# ─────────────────────────────────────────────
# POST /api/agent-keys — Créer une clé agent
# ─────────────────────────────────────────────


@agent_keys_router.post(
    "",
    response_model=AgentKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Créer une nouvelle clé API pour un agent automatisé",
)
async def create_agent_key(request: Request, body: CreateAgentKeyRequest):
    """
    Crée une nouvelle clé API pour un agent automatisé.

    ⚠️ La clé complète (full_key) est retournée UNE SEULE FOIS.
    Après cet appel, elle ne peut plus être récupérée — conservez-la précieusement.

    Format de la clé : sc_agent_{64_hex_chars}
    """
    from backend.contributor_auth import resolve_contributor, generate_agent_api_key

    contributor = await resolve_contributor(request)

    # Générer la clé
    full_key, key_prefix, key_hash = generate_agent_api_key()

    # Créer l'enregistrement DB (mock pour l'instant)
    key_id = f"key_{full_key[9:17]}"  # ID dérivé du début de la clé

    logger.info(
        f"Agent key created: '{body.agent_name}' "
        f"by user={contributor.user_id} [{key_prefix}]"
    )

    return AgentKeyResponse(
        id=key_id,
        agent_name=body.agent_name,
        key_prefix=key_prefix,
        full_key=full_key,  # ← Affiché UNE SEULE FOIS
        framework=body.framework,
        agent_version=body.agent_version,
        is_active=True,
        is_flagged=False,
        total_reports_submitted=0,
        total_gems_earned=0,
        duplicate_ratio=0.0,
        rate_limit_per_hour=20,
        created_at=datetime.utcnow().isoformat(),
        last_used_at=None,
    )


# ─────────────────────────────────────────────
# GET /api/agent-keys — Lister ses clés
# ─────────────────────────────────────────────


@agent_keys_router.get(
    "",
    response_model=List[AgentKeyResponse],
    summary="Lister mes clés API agents",
)
async def list_agent_keys(request: Request):
    """Retourne toutes les clés API agents de l'utilisateur connecté."""
    from backend.contributor_auth import resolve_contributor

    await resolve_contributor(request)

    # Mock — en prod : requête DB filtrée par owner_user_id
    return []


# ─────────────────────────────────────────────
# DELETE /api/agent-keys/{key_id} — Révoquer
# ─────────────────────────────────────────────


@agent_keys_router.delete(
    "/{key_id}",
    summary="Révoquer une clé API agent",
)
async def revoke_agent_key(key_id: str, request: Request):
    """
    Révoque une clé API agent. Action irréversible.
    La clé devient immédiatement invalide.
    """
    from backend.contributor_auth import resolve_contributor

    contributor = await resolve_contributor(request)

    # Mock — en prod : vérifier ownership + soft-delete
    logger.info(f"Agent key {key_id} revoked by user={contributor.user_id}")

    return {
        "status": "revoked",
        "key_id": key_id,
        "revoked_at": datetime.utcnow().isoformat(),
        "message": "La clé API a été révoquée avec succès.",
    }
