"""
GemReward — Duplicate Checker
==============================
Système de détection de doublons en 3 couches pour éviter
de récompenser des bugs / idées déjà connus.

Couche 1 — Hash SHA256 exact         (instantané, DB locale)
Couche 2 — GitHub Issues search      (mots-clés + similarité titre)
Couche 3 — Embedding sémantique      (Jina v5 réutilisé depuis project_translator)

Pour les agents automatisés, les 3 couches sont appliquées.
Pour les humains, un avertissement non-bloquant est affiché (Couche 1 + 2 seulement).

Version: 1.0.0
"""

import hashlib
import logging
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any

import requests

logger = logging.getLogger(__name__)

GITHUB_REPO_OWNER = "zedarvates"
GITHUB_REPO_NAME = "StoryCore-Engine"

# Seuils de détection
LEVENSHTEIN_DUPLICATE_THRESHOLD = 0.72  # Similarité titre ≥ 72% → doublon probable
EMBEDDING_DUPLICATE_THRESHOLD = 0.85  # Cosine similarity ≥ 85% → doublon sémantique


# ─────────────────────────────────────────────
# Résultat de la vérification de doublon
# ─────────────────────────────────────────────


@dataclass
class DuplicateResult:
    is_duplicate: bool
    confidence: float  # 0.0 → 1.0
    method: str  # "none" | "exact_hash" | "title_match" | "semantic"
    existing_issue_url: Optional[str] = None
    existing_issue_number: Optional[int] = None
    existing_issue_title: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_duplicate": self.is_duplicate,
            "confidence": round(self.confidence, 3),
            "method": self.method,
            "existing_issue_url": self.existing_issue_url,
            "existing_issue_number": self.existing_issue_number,
            "existing_issue_title": self.existing_issue_title,
            "details": self.details,
        }


# ─────────────────────────────────────────────
# Normalisation du texte
# ─────────────────────────────────────────────


def normalize_text(text: str) -> str:
    """
    Normalise le texte pour la comparaison :
    - Minuscules
    - Supprime accents
    - Supprime ponctuation non-significative
    - Colapser les espaces
    """
    # Minuscules
    text = text.lower()
    # Supprimer accents (NFD → ASCII)
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Supprimer caractères spéciaux sauf alphanumériques et espaces
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    # Collapser espaces multiples
    text = re.sub(r"\s+", " ", text).strip()
    return text


def compute_fingerprint(description: str) -> str:
    """
    Calcule le hash SHA256 d'une description normalisée.
    Utilisé comme fingerprint pour la détection de doublons exacts.
    """
    normalized = normalize_text(description)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def extract_keywords(text: str, top_n: int = 6) -> List[str]:
    """
    Extrait les mots-clés les plus significatifs d'un texte.
    Approche simple TF-based (sans NLTK pour garder les dépendances légères).
    """
    stopwords = {
        "le",
        "la",
        "les",
        "de",
        "du",
        "des",
        "un",
        "une",
        "et",
        "est",
        "en",
        "au",
        "aux",
        "que",
        "qui",
        "il",
        "elle",
        "on",
        "se",
        "ce",
        "the",
        "a",
        "an",
        "is",
        "in",
        "on",
        "at",
        "to",
        "for",
        "of",
        "and",
        "with",
        "this",
        "that",
        "are",
        "was",
        "be",
        "been",
        "have",
        "has",
        "par",
        "sur",
        "avec",
        "dans",
        "pour",
        "pas",
        "ne",
        "je",
        "vous",
    }
    words = normalize_text(text).split()
    # Filtrer stopwords et mots courts
    keywords = [w for w in words if w not in stopwords and len(w) >= 4]
    # Dédupliquer en gardant l'ordre
    seen = set()
    unique_keywords = []
    for w in keywords:
        if w not in seen:
            seen.add(w)
            unique_keywords.append(w)

    return unique_keywords[:top_n]


# ─────────────────────────────────────────────
# Similarité de chaînes (Levenshtein simplifié)
# ─────────────────────────────────────────────


def levenshtein_ratio(s1: str, s2: str) -> float:
    """
    Calcule le ratio de similarité entre deux chaînes (0.0 → 1.0).
    Utilise la distance de Levenshtein normalisée.
    """
    s1, s2 = s1.lower(), s2.lower()
    if s1 == s2:
        return 1.0

    len1, len2 = len(s1), len(s2)
    if len1 == 0 or len2 == 0:
        return 0.0

    # DP matrix
    dp = [[0] * (len2 + 1) for _ in range(len1 + 1)]
    for i in range(len1 + 1):
        dp[i][0] = i
    for j in range(len2 + 1):
        dp[0][j] = j

    for i in range(1, len1 + 1):
        for j in range(1, len2 + 1):
            cost = 0 if s1[i - 1] == s2[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost,
            )

    distance = dp[len1][len2]
    max_len = max(len1, len2)
    return 1.0 - (distance / max_len)


# ─────────────────────────────────────────────
# Couche 1 — Hash exact (DB locale)
# ─────────────────────────────────────────────


async def check_exact_duplicate(fingerprint: str, db_session=None) -> DuplicateResult:
    """
    Couche 1 : Vérifie si le fingerprint SHA256 existe déjà en DB.
    Temps : O(1) avec index.
    """
    if db_session is None:
        return DuplicateResult(
            is_duplicate=False,
            confidence=0.0,
            method="none",
            details={"reason": "no_db_session"},
        )

    try:
        from backend.gem_models import ContributionReport
        from sqlalchemy import select

        stmt = select(ContributionReport).where(
            ContributionReport.description_fingerprint == fingerprint,
            ContributionReport.reward_status.notin_(["rejected", "expired"]),
        )
        result = await db_session.execute(stmt)
        existing = result.scalar_one_or_none()

        if existing:
            return DuplicateResult(
                is_duplicate=True,
                confidence=1.0,
                method="exact_hash",
                existing_issue_url=existing.github_issue_url,
                existing_issue_number=existing.github_issue_number,
                existing_issue_title=existing.github_issue_title,
                details={"db_report_id": existing.id},
            )

    except Exception as e:
        logger.error(f"Exact duplicate check DB error: {e}")

    return DuplicateResult(is_duplicate=False, confidence=0.0, method="none")


# ─────────────────────────────────────────────
# Couche 2 — GitHub Search (mots-clés + titre)
# ─────────────────────────────────────────────


async def check_github_duplicate(
    description: str,
    report_type: str,
    github_token: Optional[str] = None,
) -> DuplicateResult:
    """
    Couche 2 : Interroge l'API GitHub Issues pour trouver des issues similaires.
    Utilise une recherche par mots-clés + comparaison de titre par Levenshtein.
    """
    keywords = extract_keywords(description)
    if not keywords:
        return DuplicateResult(
            is_duplicate=False,
            confidence=0.0,
            method="none",
            details={"reason": "no_keywords_extracted"},
        )

    # Requête GitHub search
    query = " ".join(keywords[:4])
    label_filter = "bug" if report_type == "bug" else "enhancement"
    search_url = (
        f"https://api.github.com/search/issues?"
        f"q={query}+repo:{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}"
        f"+label:{label_filter}&per_page=10&sort=created&order=desc"
    )

    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "StoryCore-GemReward-DuplicateChecker/1.0",
    }
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"

    try:
        response = requests.get(search_url, headers=headers, timeout=10)
        if response.status_code != 200:
            logger.warning(f"GitHub search returned {response.status_code}")
            return DuplicateResult(
                is_duplicate=False,
                confidence=0.0,
                method="none",
                details={"github_status": response.status_code},
            )

        data = response.json()
        items = data.get("items", [])
        description_short = description[:100]

        best_score = 0.0
        best_issue = None

        for issue in items:
            title = issue.get("title", "")
            # Comparer le titre avec la première ligne de la description
            score = levenshtein_ratio(title, description_short)
            if score > best_score:
                best_score = score
                best_issue = issue

        if best_score >= LEVENSHTEIN_DUPLICATE_THRESHOLD and best_issue:
            return DuplicateResult(
                is_duplicate=True,
                confidence=best_score,
                method="title_match",
                existing_issue_url=best_issue.get("html_url"),
                existing_issue_number=best_issue.get("number"),
                existing_issue_title=best_issue.get("title"),
                details={
                    "levenshtein_score": best_score,
                    "keywords_used": keywords[:4],
                },
            )

    except requests.exceptions.RequestException as e:
        logger.warning(f"GitHub search network error: {e}")
        return DuplicateResult(
            is_duplicate=False, confidence=0.0, method="none", details={"error": str(e)}
        )

    return DuplicateResult(
        is_duplicate=False,
        confidence=0.0,
        method="none",
        details={"keywords_tested": keywords[:4], "issues_checked": len(items)},
    )


# ─────────────────────────────────────────────
# Couche 3 — Embedding sémantique (Jina v5)
# ─────────────────────────────────────────────


async def check_semantic_duplicate(
    description: str,
    cached_embeddings: Optional[Dict[int, list]] = None,
) -> DuplicateResult:
    """
    Couche 3 : Comparaison sémantique par embeddings.
    Réutilise l'infrastructure Jina Embeddings v5 du Project Translator.

    cached_embeddings : Dict[issue_number → embedding_vector]
    Si le cache est vide, skip cette couche.
    """
    if not cached_embeddings:
        return DuplicateResult(
            is_duplicate=False,
            confidence=0.0,
            method="none",
            details={"reason": "no_embedding_cache"},
        )

    try:
        # Essaye d'importer le service d'embedding existant
        try:
            from addons.official.project_translator.src.embedding_service import (
                embed_text,
            )
        except ImportError:
            logger.debug("Embedding service not available, skipping semantic check")
            return DuplicateResult(
                is_duplicate=False,
                confidence=0.0,
                method="none",
                details={"reason": "embedding_service_unavailable"},
            )

        query_embedding = await embed_text(description)

        best_score = 0.0
        best_issue_number = None

        for issue_number, issue_embedding in cached_embeddings.items():
            score = _cosine_similarity(query_embedding, issue_embedding)
            if score > best_score:
                best_score = score
                best_issue_number = issue_number

        if best_score >= EMBEDDING_DUPLICATE_THRESHOLD and best_issue_number:
            issue_url = (
                f"https://github.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}"
                f"/issues/{best_issue_number}"
            )
            return DuplicateResult(
                is_duplicate=True,
                confidence=best_score,
                method="semantic",
                existing_issue_url=issue_url,
                existing_issue_number=best_issue_number,
                details={"cosine_similarity": best_score},
            )

    except Exception as e:
        logger.error(f"Semantic duplicate check error: {e}")

    return DuplicateResult(is_duplicate=False, confidence=0.0, method="none")


def _cosine_similarity(v1: list, v2: list) -> float:
    """Cosine similarity entre deux vecteurs."""
    if len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm1 = sum(a**2 for a in v1) ** 0.5
    norm2 = sum(b**2 for b in v2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return dot / (norm1 * norm2)


# ─────────────────────────────────────────────
# Vérification complète (point d'entrée principal)
# ─────────────────────────────────────────────


async def check_duplicate_full(
    description: str,
    report_type: str,
    github_token: Optional[str] = None,
    db_session=None,
    cached_embeddings: Optional[Dict[int, list]] = None,
    is_agent: bool = False,
) -> DuplicateResult:
    """
    Vérifie si un report est un doublon via les 3 couches.

    Pour les humains    → Couches 1 + 2 (non-bloquant si confident < 0.90)
    Pour les agents     → Couches 1 + 2 + 3 (strictement bloquant)

    Args:
        description    : Description du bug / idée
        report_type    : "bug" | "enhancement" | "question"
        github_token   : Token GitHub pour la couche 2
        db_session     : Session SQLAlchemy pour la couche 1
        cached_embeddings : Cache d'embeddings pour la couche 3
        is_agent       : True si contributeur automatisé (seuils plus stricts)

    Returns:
        DuplicateResult avec is_duplicate, confidence, et méthode utilisée
    """
    fingerprint = compute_fingerprint(description)

    # Couche 1 — Hash exact (le plus rapide)
    result = await check_exact_duplicate(fingerprint, db_session)
    if result.is_duplicate:
        logger.info(f"Duplicate detected [exact_hash]: {result.existing_issue_url}")
        return result

    # Couche 2 — GitHub search
    result = await check_github_duplicate(description, report_type, github_token)
    if result.is_duplicate:
        # Pour les humains : on remonte l'info mais on ne bloque pas si confidence < 0.90
        if not is_agent and result.confidence < 0.90:
            logger.info(
                f"Possible duplicate [title_match conf={result.confidence:.2f}] — "
                f"Not blocking (human contributor)"
            )
            result.is_duplicate = False
            result.details["human_warning"] = (
                f"Possible duplicate found (confidence: {result.confidence:.0%}). "
                f"See: {result.existing_issue_url}"
            )
            return result

        logger.info(
            f"Duplicate detected [title_match conf={result.confidence:.2f}]: "
            f"{result.existing_issue_url}"
        )
        return result

    # Couche 3 — Sémantique (agents uniquement par défaut, ou si cache dispo)
    if cached_embeddings or is_agent:
        result = await check_semantic_duplicate(description, cached_embeddings)
        if result.is_duplicate:
            logger.info(
                f"Duplicate detected [semantic conf={result.confidence:.2f}]: "
                f"#{result.existing_issue_number}"
            )
            return result

    return DuplicateResult(
        is_duplicate=False,
        confidence=0.0,
        method="none",
        details={"layers_checked": 3 if (cached_embeddings or is_agent) else 2},
    )


# ─────────────────────────────────────────────
# Utilitaire : compute_fingerprint exposé
# ─────────────────────────────────────────────

__all__ = [
    "check_duplicate_full",
    "compute_fingerprint",
    "DuplicateResult",
    "normalize_text",
    "extract_keywords",
]
