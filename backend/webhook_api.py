"""
GemReward — GitHub Webhook Handler
====================================
Reçoit et traite les événements GitHub pour déclencher les récompenses en gemmes.

Seuls les événements "issues" avec certains labels déclenchent des actions :
  - Label "gem-awarded"  → Crédite les gemmes au reporter
  - Label "duplicate"    → Marque le report comme doublon
  - Label "wontfix"      → Marque le report comme rejeté

Sécurité : Signature HMAC-SHA256 vérifiée sur chaque requête.

Version: 1.0.0
"""

import hashlib
import hmac
import json
import logging
import os
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["GemReward Webhooks"])


# ─────────────────────────────────────────────
# Vérification signature GitHub
# ─────────────────────────────────────────────

def verify_github_signature(body: bytes, signature_header: Optional[str], secret: str) -> bool:
    """
    Vérifie la signature HMAC-SHA256 d'un webhook GitHub.

    GitHub envoie : X-Hub-Signature-256: sha256={hex_digest}
    On calcule   : HMAC-SHA256(secret, body)

    Returns True si la signature est valide.
    """
    if not signature_header:
        logger.warning("Webhook received without X-Hub-Signature-256 header")
        return False

    if not signature_header.startswith("sha256="):
        logger.warning(f"Unexpected signature format: {signature_header[:20]}")
        return False

    received_sig = signature_header[len("sha256="):]
    expected_sig = hmac.new(
        secret.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()

    # Comparaison sécurisée (timing-safe)
    return hmac.compare_digest(received_sig, expected_sig)


# ─────────────────────────────────────────────
# Labels qui déclenchent des actions
# ─────────────────────────────────────────────

LABEL_ACTIONS = {
    "gem-awarded": "award",
    "duplicate":   "duplicate",
    "wontfix":     "reject",
    "invalid":     "reject",
}


# ─────────────────────────────────────────────
# Endpoint Webhook
# ─────────────────────────────────────────────

@router.post(
    "/api/webhooks/github",
    summary="GitHub Webhook — GemReward",
    description=(
        "Reçoit les événements GitHub Issues et déclenche les récompenses en gemmes. "
        "Sécurisé par signature HMAC-SHA256."
    ),
    include_in_schema=False,  # Ne pas exposer dans Swagger (endpoint interne)
)
async def handle_github_webhook(request: Request):
    """
    Handler principal des webhooks GitHub.

    Flux complet :
    1. Lire le body raw
    2. Vérifier la signature HMAC-SHA256
    3. Identifier le type d'événement (X-GitHub-Event)
    4. Router vers l'action correspondante selon le label
    """

    # 1. Lire le body
    try:
        body = await request.body()
    except Exception as e:
        logger.error(f"Failed to read webhook body: {e}")
        raise HTTPException(status_code=400, detail="Failed to read request body")

    # 2. Vérifier la signature
    webhook_secret = os.getenv("GITHUB_WEBHOOK_SECRET", "")
    if webhook_secret:
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not verify_github_signature(body, signature, webhook_secret):
            logger.warning(
                f"Invalid webhook signature from "
                f"{request.client.host if request.client else 'unknown'}"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook signature"
            )
    else:
        logger.warning(
            "GITHUB_WEBHOOK_SECRET not set — webhook signature verification disabled! "
            "Set this variable in production."
        )

    # 3. Parser le payload
    try:
        payload = json.loads(body)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = request.headers.get("X-GitHub-Event", "")
    delivery_id = request.headers.get("X-GitHub-Delivery", "unknown")

    logger.info(f"Webhook received: event={event_type}, delivery={delivery_id}")

    # 4. Router selon l'événement
    if event_type == "ping":
        # Événement de test envoyé lors de la configuration du webhook
        logger.info("GitHub webhook ping received — OK")
        return {"status": "pong", "message": "StoryCore GemReward webhook active"}

    if event_type == "issues":
        return await _handle_issues_event(payload)

    # Événements non gérés — on les ignore gracieusement
    logger.debug(f"Unhandled webhook event type: {event_type}")
    return {"status": "ignored", "event": event_type}


# ─────────────────────────────────────────────
# Handler des événements "issues"
# ─────────────────────────────────────────────

async def _handle_issues_event(payload: dict) -> dict:
    """
    Traite les événements de type "issues".

    Actions supportées :
      - labeled   : Un label a été ajouté → vérifier si gem-awarded, duplicate, etc.
      - unlabeled : Un label a été retiré → annuler si nécessaire (future)
      - closed    : Issue fermée → marquer comme expired si encore pending
    """
    action = payload.get("action", "")
    issue = payload.get("issue", {})
    issue_number = issue.get("number")
    label = payload.get("label", {})  # Présent uniquement pour "labeled" / "unlabeled"

    if not issue_number:
        logger.warning("Webhook: Missing issue number in payload")
        return {"status": "error", "reason": "missing_issue_number"}

    logger.info(f"Issues event: action={action}, issue=#{issue_number}")

    # ── Événement : label ajouté ──
    if action == "labeled":
        label_name = label.get("name", "")
        label_action = LABEL_ACTIONS.get(label_name)

        if label_action is None:
            logger.debug(f"Label '{label_name}' has no GemReward action, skipping")
            return {"status": "ignored", "label": label_name}

        logger.info(
            f"GemReward trigger: label='{label_name}' action='{label_action}' "
            f"on issue #{issue_number}"
        )

        # Initialiser le GemEngine (sans DB réelle pour l'instant — injection future)
        gem_engine = await _get_gem_engine()

        if label_action == "award":
            result = await gem_engine.process_gem_award(issue_number, issue)
            if result:
                return {
                    "status": "gem_awarded",
                    "issue_number": issue_number,
                    "gems_awarded": result.get("gems"),
                    "user_id": result.get("user_id") if "user_id" in (result or {}) else None,
                }
            else:
                return {
                    "status": "no_action",
                    "reason": "no_pending_report_found_for_issue",
                    "issue_number": issue_number,
                }

        elif label_action == "duplicate":
            success = await gem_engine.mark_as_duplicate(issue_number)
            return {
                "status": "duplicate_marked" if success else "no_action",
                "issue_number": issue_number,
            }

        elif label_action == "reject":
            reason = f"Issue closed with label: {label_name}"
            success = await gem_engine.mark_as_rejected(issue_number, reason)
            return {
                "status": "rejected" if success else "no_action",
                "issue_number": issue_number,
                "reason": reason,
            }

    # ── Événement : issue fermée ──
    elif action == "closed":
        # Si une issue est fermée sans "gem-awarded" ou "duplicate",
        # on peut optionnellement la marquer comme "expired" après X jours.
        # Pour l'instant, on log et on ne fait rien.
        logger.info(f"Issue #{issue_number} closed (no GemReward action for now)")
        return {"status": "ignored", "action": "closed", "issue_number": issue_number}

    return {"status": "ignored", "action": action}


# ─────────────────────────────────────────────
# Factory GemEngine (injection de dépendances)
# ─────────────────────────────────────────────

async def _get_gem_engine():
    """
    Crée une instance du GemEngine.
    En production, injecte une session DB et le WebSocket manager.
    """
    try:
        from backend.gem_engine import GemEngine
        from backend.database import AsyncSessionLocal
        from backend.realtime_api import manager as ws_manager

        # Créer une session DB manuellement pour le webhook (contexte hors-request)
        db_session = AsyncSessionLocal()
        
        return GemEngine(db_session=db_session, websocket_manager=ws_manager)

    except Exception as e:
        logger.error(f"Failed to initialize GemEngine in webhook: {e}")
        from backend.gem_engine import GemEngine
        return GemEngine()
