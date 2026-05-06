"""
GemReward — Contributor Authentication Middleware
==================================================
Authentification universelle pour tous les types de contributeurs :
  - Humains / LLM-assistés / Semi-automatisés → JWT token
  - Agents entièrement automatisés            → API Key (sc_agent_...)

Dans tous les cas, un user_id StoryCore est résolu.
Sans user_id résolu → 401 Unauthorized.

Version: 1.0.0
"""

import hashlib
import secrets
import logging
from datetime import datetime
from typing import Optional, Tuple, Dict, Any

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Résultat de l'authentification
# ─────────────────────────────────────────────


class ContributorIdentity:
    """
    Représente l'identité résolue d'un contributeur.
    Valide qu'un compte StoryCore est toujours attaché.
    """

    def __init__(
        self,
        user_id: str,
        contributor_type: str,
        agent_api_key_id: Optional[str] = None,
        agent_name: Optional[str] = None,
        is_agent: bool = False,
        rate_limit_per_hour: int = 5,
    ):
        self.user_id = user_id
        self.contributor_type = contributor_type
        self.agent_api_key_id = agent_api_key_id
        self.agent_name = agent_name
        self.is_agent = is_agent
        self.rate_limit_per_hour = rate_limit_per_hour

    def to_dict(self) -> Dict[str, Any]:
        return {
            "user_id": self.user_id,
            "contributor_type": self.contributor_type,
            "agent_api_key_id": self.agent_api_key_id,
            "agent_name": self.agent_name,
            "is_agent": self.is_agent,
        }

    def __repr__(self):
        if self.is_agent:
            return (
                f"<ContributorIdentity agent='{self.agent_name}' owner={self.user_id}>"
            )
        return f"<ContributorIdentity human user={self.user_id}>"


# ─────────────────────────────────────────────
# Fonctions utilitaires API Key
# ─────────────────────────────────────────────


def generate_agent_api_key() -> Tuple[str, str, str]:
    """
    Génère une nouvelle API Key pour un agent.

    Returns:
        (full_key, key_prefix, key_hash)
        - full_key  : la clé complète à afficher UNE SEULE FOIS à l'utilisateur
        - key_prefix: préfixe visible (pour identification)
        - key_hash  : SHA256 de la clé complète (stockée en DB)
    """
    raw = secrets.token_hex(32)  # 64 chars hex = 256 bits d'entropie
    full_key = f"sc_agent_{raw}"
    key_prefix = f"sc_agent_{raw[:8]}..."
    key_hash = hashlib.sha256(full_key.encode()).hexdigest()
    return full_key, key_prefix, key_hash


def hash_api_key(raw_key: str) -> str:
    """Hash d'une API Key pour comparaison avec la DB."""
    return hashlib.sha256(raw_key.encode()).hexdigest()


def is_agent_key(token: str) -> bool:
    """Détecte si le token est une API Key d'agent (commence par sc_agent_)."""
    return token.startswith("sc_agent_")


# ─────────────────────────────────────────────
# Résolution de l'identité (sans DB — pour tests)
# ─────────────────────────────────────────────


async def resolve_contributor_identity_from_jwt(
    token: str,
) -> Optional[ContributorIdentity]:
    """
    Résout l'identité d'un contributeur humain depuis un JWT.
    Retourne None si le token est invalide.
    """
    try:
        from backend.auth import decode_jwt_token

        payload = decode_jwt_token(token)
        user_id = payload.get("sub") or payload.get("user_id")
        if not user_id:
            return None

        # Détermine le type de contributeur depuis le payload JWT
        contributor_type = payload.get("contributor_type", "human")

        return ContributorIdentity(
            user_id=str(user_id),
            contributor_type=contributor_type,
            is_agent=False,
            rate_limit_per_hour=5,
        )
    except Exception as e:
        logger.debug(f"JWT resolution failed: {e}")
        return None


async def resolve_contributor_identity_from_api_key(
    api_key: str, db_session=None
) -> Optional[ContributorIdentity]:
    """
    Résout l'identité d'un agent automatisé depuis une API Key.

    La clé est hashée puis cherchée en DB.
    Retourne None si la clé est invalide, inactive, ou flaggée.
    """
    key_hash = hash_api_key(api_key)

    if db_session is None:
        # Mode sans DB (dev/test) — refuser prudemment
        logger.warning(
            "resolve_contributor_identity_from_api_key called without DB session"
        )
        return None

    try:
        from backend.gem_models import AgentApiKey
        from sqlalchemy import select

        stmt = select(AgentApiKey).where(
            AgentApiKey.key_hash == key_hash,
            AgentApiKey.is_active.is_(True),
        )
        result = await db_session.execute(stmt)
        agent_key = result.scalar_one_or_none()

        if not agent_key:
            logger.warning(f"API Key not found or inactive: hash={key_hash[:16]}...")
            return None

        if agent_key.is_flagged:
            logger.warning(f"Flagged API Key attempted: agent={agent_key.agent_name}")
            return None

        # Mettre à jour last_used
        agent_key.last_used_at = datetime.utcnow()
        await db_session.commit()

        return ContributorIdentity(
            user_id=agent_key.owner_user_id,
            contributor_type="automated_agent",
            agent_api_key_id=agent_key.id,
            agent_name=agent_key.agent_name,
            is_agent=True,
            rate_limit_per_hour=agent_key.rate_limit_per_hour,
        )

    except Exception as e:
        logger.error(f"DB error resolving API Key: {e}")
        return None


# ─────────────────────────────────────────────
# FastAPI Dependency — resolve_contributor
# ─────────────────────────────────────────────


async def resolve_contributor(request: Request, db_session=None) -> ContributorIdentity:
    """
    FastAPI dependency : résout l'identité du contributeur depuis la requête.

    Stratégie :
    1. Lire l'en-tête Authorization: Bearer {token}
    2. Si le token commence par "sc_agent_" → API Key (agent automatisé)
    3. Sinon → JWT (humain / LLM-assisté / semi-auto)
    4. Si aucun token → 401

    Usage dans un endpoint :
        @router.post("/api/v1/report")
        async def submit_report(
            contributor: ContributorIdentity = Depends(resolve_contributor)
        ):
            user_id = contributor.user_id
    """
    auth_header = request.headers.get("Authorization", "")

    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Authorization required. "
                "Provide 'Authorization: Bearer {jwt_token}' for human users "
                "or 'Authorization: Bearer sc_agent_{key}' for automated agents. "
                "A StoryCore account is required to receive gem rewards."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = auth_header[len("Bearer ") :]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty authorization token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # --- Agent automatisé ---
    if is_agent_key(token):
        identity = await resolve_contributor_identity_from_api_key(token, db_session)
        if not identity:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=(
                    "Invalid, inactive, or flagged agent API key. "
                    "Generate a new key via POST /api/agent-keys."
                ),
                headers={"WWW-Authenticate": "Bearer"},
            )
        logger.info(
            f"Agent authenticated: '{identity.agent_name}' → owner={identity.user_id}"
        )
        return identity

    # --- Humain / LLM / Semi-auto ---
    identity = await resolve_contributor_identity_from_jwt(token)
    if not identity:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid or expired JWT token. Please log in to your StoryCore account."
            ),
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.debug(f"Human contributor authenticated: user={identity.user_id}")
    return identity


# ─────────────────────────────────────────────
# Optionnel : identité sans bloquer (pour fallback)
# ─────────────────────────────────────────────


async def resolve_contributor_optional(
    request: Request, db_session=None
) -> Optional[ContributorIdentity]:
    """
    Comme resolve_contributor mais retourne None au lieu de lever une exception.
    Utile pour les endpoints qui acceptent les requêtes anonymes (read-only).
    """
    try:
        return await resolve_contributor(request, db_session)
    except HTTPException:
        return None
