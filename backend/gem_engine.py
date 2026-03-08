"""
GemReward — Gem Engine
=======================
Moteur central de gestion des gemmes.

Responsabilités :
  - Créditer les gemmes après validation GitHub (webhook)
  - Calculer le nombre de gemmes selon les labels GitHub
  - Mettre à jour le solde et le tier de l'utilisateur
  - Notifier l'utilisateur via WebSocket
  - Détecter et gérer les agents abusifs

La récompense est TOUJOURS déclenchée par un événement GitHub
(label "gem-awarded" posé par un mainteneur humain).
Jamais automatiquement sans validation humaine.

Version: 1.0.0
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, Tuple

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# Barème des gemmes par labels GitHub
# ─────────────────────────────────────────────

GEM_RULES: Dict[str, int] = {
    # Sévérité bugs
    "severity:critical": 3,
    "severity:major":    2,
    "severity:minor":    1,
    # Impact features
    "roadmap":           3,
    "accepted":          2,
    # Par défaut
    "__default__":       1,
}

TIER_THRESHOLDS: Dict[int, str] = {
    0:   "contributor",
    10:  "silver",
    30:  "gold",
    100: "legend",
}


# ─────────────────────────────────────────────
# Calcul des gemmes
# ─────────────────────────────────────────────

def calculate_gems_from_labels(labels: list) -> int:
    """
    Calcule le nombre de gemmes à attribuer selon les labels GitHub.

    Prend le label le plus "valeur" (max).
    Les labels sont évalués dans l'ordre du barème GEM_RULES.
    """
    label_names = {l.get("name", "") if isinstance(l, dict) else str(l) for l in labels}
    max_gems = GEM_RULES["__default__"]

    for label_key, gems in GEM_RULES.items():
        if label_key == "__default__":
            continue
        if label_key in label_names:
            max_gems = max(max_gems, gems)

    return max_gems


def calculate_tier(total_gems: int) -> str:
    """Calcule le tier d'un utilisateur selon ses gemmes totales."""
    tier = "contributor"
    for threshold, tier_name in sorted(TIER_THRESHOLDS.items()):
        if total_gems >= threshold:
            tier = tier_name
    return tier


# ─────────────────────────────────────────────
# GemEngine
# ─────────────────────────────────────────────

class GemEngine:
    """
    Moteur de gestion des gemmes.

    Usage typique (depuis webhook_api.py) :
        engine = GemEngine(db_session, websocket_manager)
        await engine.process_gem_award(issue_number, issue_data)
    """

    def __init__(self, db_session=None, websocket_manager=None):
        self.db = db_session
        self.ws = websocket_manager

    # ─── Traitement d'une récompense ───

    async def process_gem_award(
        self,
        issue_number: int,
        issue_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Crédite les gemmes au reporter d'une issue validée (label "gem-awarded").

        Steps :
        1. Trouver le ContributionReport en status "pending"
        2. Calculer les gemmes selon les labels
        3. Créer la GemTransaction (atomique)
        4. Mettre à jour user.gem_balance + tier
        5. Marquer le report comme "rewarded"
        6. Notifier l'utilisateur (WebSocket)
        7. Gérer le suivi agent (stats + détection abus)

        Returns : dict avec les détails de la récompense, ou None si non traité.
        """
        if self.db is None:
            logger.error("GemEngine: no DB session provided")
            return None

        try:
            from backend.gem_models import ContributionReport, GemTransaction
            from sqlalchemy import select, update

            # 1. Trouver le report
            stmt = select(ContributionReport).where(
                ContributionReport.github_issue_number == issue_number,
                ContributionReport.reward_status == "pending",
            ).with_for_update()  # SELECT FOR UPDATE → évite race conditions

            result = await self.db.execute(stmt)
            report = result.scalar_one_or_none()

            if not report:
                logger.warning(
                    f"GemEngine: No pending report found for issue #{issue_number}"
                )
                return None

            # 2. Calculer les gemmes
            labels = issue_data.get("labels", [])
            gems = calculate_gems_from_labels(labels)

            logger.info(
                f"GemEngine: Awarding {gems}💎 for issue #{issue_number} "
                f"to user={report.user_id} [{report.contributor_type}]"
            )

            # 3. Récupérer le solde actuel de l'utilisateur
            user_balance, user_total = await self._get_user_gem_stats(report.user_id)

            # 4. Créer la GemTransaction
            transaction = GemTransaction(
                user_id=report.user_id,
                amount=gems,
                transaction_type=report.report_type,
                contributor_type=report.contributor_type,
                agent_name=report.agent_name,
                github_issue_number=issue_number,
                github_issue_url=issue_data.get("html_url"),
                github_issue_title=issue_data.get("title", "")[:255],
                description=(
                    f"Récompense #{issue_number}: "
                    f"{issue_data.get('title', '')[:80]}..."
                ),
                status="confirmed",
                balance_before=user_balance,
                balance_after=user_balance + gems,
            )
            self.db.add(transaction)
            await self.db.flush()  # Obtenir l'ID de la transaction

            # 5. Mettre à jour le solde utilisateur
            new_balance = user_balance + gems
            new_total = user_total + gems
            new_tier = calculate_tier(new_total)

            await self._update_user_gem_balance(
                report.user_id, new_balance, new_total, new_tier
            )

            # 6. Mettre à jour le ContributionReport
            report.reward_status = "rewarded"
            report.gems_awarded = gems
            report.gem_transaction_id = transaction.id
            report.rewarded_at = datetime.utcnow()
            report.github_labels_snapshot = [
                l.get("name") if isinstance(l, dict) else str(l)
                for l in labels
            ]

            await self.db.commit()

            logger.info(
                f"GemEngine: ✅ {gems}💎 credited to user={report.user_id} "
                f"(new balance: {new_balance}, tier: {new_tier})"
            )

            # 7. Mettre à jour les stats de l'agent (si applicable)
            if report.agent_api_key_id:
                await self._update_agent_stats(
                    report.agent_api_key_id,
                    gems_earned=gems,
                    was_duplicate=False,
                )

            # 8. Notifier l'utilisateur
            award_info = {
                "type": "gem_awarded",
                "gems": gems,
                "new_balance": new_balance,
                "new_tier": new_tier,
                "issue_number": issue_number,
                "issue_url": issue_data.get("html_url"),
                "issue_title": issue_data.get("title", ""),
                "contributor_type": report.contributor_type,
                "message": (
                    f"🎉 +{gems} gemme{'s' if gems > 1 else ''} ! "
                    f"Votre contribution #{issue_number} a été validée."
                ),
            }
            await self._notify_user(report.user_id, award_info)

            return award_info

        except Exception as e:
            logger.error(f"GemEngine.process_gem_award error: {e}", exc_info=True)
            if self.db:
                await self.db.rollback()
            return None

    # ─── Marquage doublon ───

    async def mark_as_duplicate(self, issue_number: int) -> bool:
        """
        Marque un ContributionReport comme doublon (label "duplicate" sur GitHub).
        Incrémente le compteur de doublons de l'agent si applicable.
        """
        if self.db is None:
            return False

        try:
            from backend.gem_models import ContributionReport
            from sqlalchemy import select

            stmt = select(ContributionReport).where(
                ContributionReport.github_issue_number == issue_number,
                ContributionReport.reward_status == "pending",
            )
            result = await self.db.execute(stmt)
            report = result.scalar_one_or_none()

            if not report:
                return False

            report.reward_status = "duplicate"
            report.rejected_at = datetime.utcnow()
            report.rejection_reason = "Marked as duplicate by maintainer"

            await self.db.commit()

            # Mettre à jour stats agent
            if report.agent_api_key_id:
                await self._update_agent_stats(
                    report.agent_api_key_id,
                    gems_earned=0,
                    was_duplicate=True,
                )
                await self._check_agent_abuse(report.agent_api_key_id)

            logger.info(f"GemEngine: Issue #{issue_number} marked as duplicate")

            # Notifier l'utilisateur
            await self._notify_user(report.user_id, {
                "type": "report_duplicate",
                "issue_number": issue_number,
                "message": (
                    f"ℹ️ Votre report #{issue_number} a été marqué comme doublon. "
                    f"Merci d'avoir contribué !"
                ),
            })
            return True

        except Exception as e:
            logger.error(f"GemEngine.mark_as_duplicate error: {e}")
            return False

    # ─── Rejet ───

    async def mark_as_rejected(self, issue_number: int, reason: str = "") -> bool:
        """Marque un report comme rejeté (hors-scope, invalide)."""
        if self.db is None:
            return False

        try:
            from backend.gem_models import ContributionReport
            from sqlalchemy import select

            stmt = select(ContributionReport).where(
                ContributionReport.github_issue_number == issue_number,
            )
            result = await self.db.execute(stmt)
            report = result.scalar_one_or_none()

            if not report:
                return False

            report.reward_status = "rejected"
            report.rejected_at = datetime.utcnow()
            report.rejection_reason = reason[:255] if reason else "Rejected by maintainer"
            await self.db.commit()

            await self._notify_user(report.user_id, {
                "type": "report_rejected",
                "issue_number": issue_number,
                "reason": reason,
                "message": f"❌ Report #{issue_number} rejeté. Raison: {reason}",
            })
            return True

        except Exception as e:
            logger.error(f"GemEngine.mark_as_rejected error: {e}")
            return False

    # ─── Utilitaires privés ───

    async def _get_user_gem_stats(self, user_id: str) -> Tuple[int, int]:
        """Retourne (gem_balance, gem_total_earned) depuis la DB utilisateur."""
        try:
            from sqlalchemy import text
            result = await self.db.execute(
                text("SELECT gem_balance, gem_total_earned FROM video_editor_users WHERE id = :uid"),
                {"uid": user_id}
            )
            row = result.fetchone()
            if row:
                return (row[0] or 0, row[1] or 0)
        except Exception as e:
            logger.warning(f"Could not fetch user gem stats: {e}")
        return (0, 0)

    async def _update_user_gem_balance(
        self,
        user_id: str,
        new_balance: int,
        new_total: int,
        new_tier: str,
    ):
        """Met à jour le solde de gemmes de l'utilisateur."""
        try:
            from sqlalchemy import text
            await self.db.execute(
                text(
                    "UPDATE video_editor_users "
                    "SET gem_balance = :balance, gem_total_earned = :total, "
                    "gem_tier = :tier, updated_at = :now "
                    "WHERE id = :uid"
                ),
                {
                    "balance": new_balance,
                    "total": new_total,
                    "tier": new_tier,
                    "now": datetime.utcnow(),
                    "uid": user_id,
                }
            )
        except Exception as e:
            logger.error(f"Failed to update user gem balance: {e}")
            raise

    async def _update_agent_stats(
        self,
        agent_key_id: str,
        gems_earned: int,
        was_duplicate: bool,
    ):
        """Met à jour les statistiques d'une clé agent."""
        try:
            from sqlalchemy import text
            await self.db.execute(
                text(
                    "UPDATE gem_agent_api_keys "
                    "SET total_reports_submitted = total_reports_submitted + 1, "
                    "    total_duplicates_submitted = total_duplicates_submitted + :dup, "
                    "    total_gems_earned = total_gems_earned + :gems "
                    "WHERE id = :kid"
                ),
                {
                    "dup": 1 if was_duplicate else 0,
                    "gems": gems_earned,
                    "kid": agent_key_id,
                }
            )
            await self.db.commit()
        except Exception as e:
            logger.warning(f"Failed to update agent stats: {e}")

    async def _check_agent_abuse(self, agent_key_id: str):
        """
        Vérifie si un agent génère trop de doublons et le flag automatiquement.
        Seuil : > 80% de doublons sur ≥ 10 reports.
        """
        try:
            from backend.gem_models import AgentApiKey
            from sqlalchemy import select

            stmt = select(AgentApiKey).where(AgentApiKey.id == agent_key_id)
            result = await self.db.execute(stmt)
            agent = result.scalar_one_or_none()

            if agent and agent.should_be_flagged and not agent.is_flagged:
                agent.is_flagged = True
                agent.flag_reason = (
                    f"Auto-flagged: {agent.duplicate_ratio:.0%} duplicate ratio "
                    f"over {agent.total_reports_submitted} reports"
                )
                agent.flagged_at = datetime.utcnow()
                await self.db.commit()

                logger.warning(
                    f"Agent auto-flagged: '{agent.agent_name}' "
                    f"({agent.flag_reason})"
                )

                # Notifier le propriétaire
                await self._notify_user(agent.owner_user_id, {
                    "type": "agent_flagged",
                    "agent_name": agent.agent_name,
                    "duplicate_ratio": agent.duplicate_ratio,
                    "message": (
                        f"⚠️ Votre agent '{agent.agent_name}' a été suspendu "
                        f"({agent.duplicate_ratio:.0%} de doublons). "
                        f"Contactez le support pour déblocage."
                    ),
                })

        except Exception as e:
            logger.error(f"Agent abuse check error: {e}")

    async def _notify_user(self, user_id: str, payload: Dict[str, Any]):
        """Envoie une notification WebSocket à l'utilisateur (si disponible)."""
        if self.ws is None:
            logger.debug(f"WebSocket not available, skipping notification for {user_id}")
            return
        try:
            # Match RealtimeConnectionManager.send_personal_message(message, user_id)
            await self.ws.send_personal_message(payload, user_id)
        except Exception as e:
            logger.warning(f"WebSocket notification failed for {user_id}: {e}")
