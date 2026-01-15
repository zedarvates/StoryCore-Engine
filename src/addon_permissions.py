"""
Addon Permission System for StoryCore-Engine
Système de gestion des permissions pour les add-ons.
"""

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Set, Any
from pathlib import Path

from src.addon_manager import AddonManifest


class PermissionLevel(Enum):
    """Niveaux de permission"""
    NONE = "none"
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    ADMIN = "admin"


class PermissionScope(Enum):
    """Périmètres des permissions"""
    GLOBAL = "global"      # Accès global au système
    PROJECT = "project"    # Accès limité au projet courant
    SESSION = "session"    # Accès limité à la session courante
    SANDBOX = "sandbox"    # Accès isolé dans un environnement sécurisé


@dataclass
class PermissionRequest:
    """Requête de permission"""
    permission: str
    level: PermissionLevel
    scope: PermissionScope
    justification: str
    addon_name: str
    context: Dict[str, Any]


@dataclass
class PermissionGrant:
    """Octroi de permission"""
    request: PermissionRequest
    granted: bool
    granted_by: str  # "auto", "user", "admin"
    timestamp: float
    conditions: Dict[str, Any]  # Conditions supplémentaires
    expires_at: Optional[float] = None


class PermissionManager:
    """
    Gestionnaire des permissions pour les add-ons

    Responsabilités:
    - Validation des permissions requises
    - Gestion des politiques de sécurité
    - Audit des accès
    - Application des restrictions
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Base de données des permissions
        self.granted_permissions: Dict[str, List[PermissionGrant]] = {}
        self.permission_policies: Dict[str, Dict[str, Any]] = {}

        # Politiques par défaut
        self._initialize_default_policies()

        # Statistiques
        self.stats = {
            "requests_total": 0,
            "requests_granted": 0,
            "requests_denied": 0,
            "violations": 0
        }

    def _initialize_default_policies(self):
        """Initialise les politiques de sécurité par défaut"""
        self.permission_policies = {
            "model_access": {
                "auto_grant": False,
                "requires_user_approval": True,
                "max_level": PermissionLevel.READ,
                "allowed_scopes": [PermissionScope.PROJECT, PermissionScope.SESSION],
                "risk_level": "medium"
            },
            "file_system_read": {
                "auto_grant": True,
                "requires_user_approval": False,
                "max_level": PermissionLevel.READ,
                "allowed_scopes": [PermissionScope.PROJECT],
                "risk_level": "low",
                "path_restrictions": ["*.json", "*.txt", "*.md", "*.yaml", "*.yml"]
            },
            "file_system_write": {
                "auto_grant": False,
                "requires_user_approval": True,
                "max_level": PermissionLevel.WRITE,
                "allowed_scopes": [PermissionScope.PROJECT],
                "risk_level": "high",
                "path_restrictions": ["exports/", "temp/", "cache/"]
            },
            "network_access": {
                "auto_grant": False,
                "requires_user_approval": True,
                "max_level": PermissionLevel.EXECUTE,
                "allowed_scopes": [PermissionScope.SESSION],
                "risk_level": "high",
                "url_whitelist": ["huggingface.co", "githubusercontent.com"]
            },
            "ui_access": {
                "auto_grant": True,
                "requires_user_approval": False,
                "max_level": PermissionLevel.WRITE,
                "allowed_scopes": [PermissionScope.SESSION],
                "risk_level": "low"
            },
            "config_access": {
                "auto_grant": False,
                "requires_user_approval": True,
                "max_level": PermissionLevel.READ,
                "allowed_scopes": [PermissionScope.PROJECT],
                "risk_level": "medium"
            },
            "database_access": {
                "auto_grant": False,
                "requires_user_approval": True,
                "max_level": PermissionLevel.WRITE,
                "allowed_scopes": [PermissionScope.PROJECT],
                "risk_level": "high"
            },
            "system_info_access": {
                "auto_grant": True,
                "requires_user_approval": False,
                "max_level": PermissionLevel.READ,
                "allowed_scopes": [PermissionScope.GLOBAL],
                "risk_level": "low"
            }
        }

    async def validate_addon_permissions(self, manifest: AddonManifest) -> Dict[str, Any]:
        """
        Valide les permissions demandées par un add-on

        Args:
            manifest: Manifest de l'add-on

        Returns:
            Résultat de validation avec détails
        """
        validation_result = {
            "valid": True,
            "issues": [],
            "warnings": [],
            "auto_grantable": [],
            "requires_approval": []
        }

        for permission in manifest.permissions:
            if permission not in self.permission_policies:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "permission": permission,
                    "issue": "unknown_permission",
                    "message": f"Permission inconnue: {permission}"
                })
                continue

            policy = self.permission_policies[permission]

            # Vérifier les restrictions de sécurité
            security_check = self._check_permission_security(permission, policy)
            if not security_check["safe"]:
                validation_result["valid"] = False
                validation_result["issues"].append({
                    "permission": permission,
                    "issue": "security_violation",
                    "message": security_check["message"]
                })

            # Classer les permissions
            if policy["auto_grant"]:
                validation_result["auto_grantable"].append(permission)
            else:
                validation_result["requires_approval"].append(permission)

            # Avertissements pour permissions risquées
            if policy["risk_level"] in ["high", "medium"]:
                validation_result["warnings"].append({
                    "permission": permission,
                    "risk_level": policy["risk_level"],
                    "message": f"Permission {policy['risk_level']} risk: {permission}"
                })

        return validation_result

    async def request_permission(self, request: PermissionRequest) -> PermissionGrant:
        """
        Traite une requête de permission

        Args:
            request: Requête de permission

        Returns:
            Octroi ou refus de permission
        """
        self.stats["requests_total"] += 1

        # Vérifier la politique
        if request.permission not in self.permission_policies:
            grant = PermissionGrant(
                request=request,
                granted=False,
                granted_by="system",
                timestamp=asyncio.get_event_loop().time(),
                conditions={"reason": "unknown_permission"}
            )
            self.stats["requests_denied"] += 1
            return grant

        policy = self.permission_policies[request.permission]

        # Vérifier si l'octroi automatique est possible
        if policy["auto_grant"] and self._can_auto_grant(request, policy):
            grant = PermissionGrant(
                request=request,
                granted=True,
                granted_by="auto",
                timestamp=asyncio.get_event_loop().time(),
                conditions=self._get_auto_grant_conditions(policy)
            )
            self.stats["requests_granted"] += 1
            self._store_grant(request.addon_name, grant)
            return grant

        # Nécessite une approbation manuelle
        # Pour l'instant, on refuse automatiquement (devrait être géré par UI)
        grant = PermissionGrant(
            request=request,
            granted=False,
            granted_by="system",
            timestamp=asyncio.get_event_loop().time(),
            conditions={"reason": "requires_user_approval"}
        )
        self.stats["requests_denied"] += 1
        return grant

    async def grant_permission_manually(self, request: PermissionRequest, approved: bool,
                                      granted_by: str, conditions: Dict[str, Any] = None) -> PermissionGrant:
        """
        Octroi manuel d'une permission (par utilisateur ou admin)

        Args:
            request: Requête de permission
            approved: Si approuvée
            granted_by: Qui a approuvé
            conditions: Conditions supplémentaires

        Returns:
            Octroi de permission
        """
        conditions = conditions or {}

        grant = PermissionGrant(
            request=request,
            granted=approved,
            granted_by=granted_by,
            timestamp=asyncio.get_event_loop().time(),
            conditions=conditions
        )

        if approved:
            self.stats["requests_granted"] += 1
            self._store_grant(request.addon_name, grant)
        else:
            self.stats["requests_denied"] += 1

        return grant

    async def check_permission(self, addon_name: str, permission: str,
                             level: PermissionLevel = PermissionLevel.READ,
                             scope: PermissionScope = PermissionScope.PROJECT) -> bool:
        """
        Vérifie si un add-on a une permission

        Args:
            addon_name: Nom de l'add-on
            permission: Permission à vérifier
            level: Niveau requis
            scope: Périmètre requis

        Returns:
            True si la permission est accordée
        """
        if addon_name not in self.granted_permissions:
            return False

        grants = self.granted_permissions[addon_name]

        for grant in grants:
            if (grant.request.permission == permission and
                grant.granted and
                grant.request.level.value >= level.value and
                grant.request.scope == scope):

                # Vérifier l'expiration
                if grant.expires_at and asyncio.get_event_loop().time() > grant.expires_at:
                    continue

                return True

        return False

    async def revoke_permission(self, addon_name: str, permission: str) -> bool:
        """
        Révoque une permission

        Args:
            addon_name: Nom de l'add-on
            permission: Permission à révoquer

        Returns:
            True si révoquée avec succès
        """
        if addon_name not in self.granted_permissions:
            return False

        grants = self.granted_permissions[addon_name]
        original_count = len(grants)

        # Filtrer les grants actifs pour cette permission
        self.granted_permissions[addon_name] = [
            grant for grant in grants
            if not (grant.request.permission == permission and grant.granted)
        ]

        return len(self.granted_permissions[addon_name]) < original_count

    def get_addon_permissions(self, addon_name: str) -> List[PermissionGrant]:
        """Retourne toutes les permissions accordées à un add-on"""
        return self.granted_permissions.get(addon_name, [])

    def get_permission_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques des permissions"""
        return {
            **self.stats,
            "active_grants": sum(len(grants) for grants in self.granted_permissions.values())
        }

    # Méthodes privées

    def _check_permission_security(self, permission: str, policy: Dict[str, Any]) -> Dict[str, Any]:
        """Vérifie les aspects de sécurité d'une permission"""
        result = {"safe": True, "message": ""}

        # Vérifications spécifiques selon le type de permission
        if permission == "file_system_write":
            if "path_restrictions" not in policy:
                result["safe"] = False
                result["message"] = "Permission d'écriture sans restrictions de chemin"
        elif permission == "network_access":
            if "url_whitelist" not in policy:
                result["safe"] = False
                result["message"] = "Accès réseau sans liste blanche d'URLs"

        return result

    def _can_auto_grant(self, request: PermissionRequest, policy: Dict[str, Any]) -> bool:
        """Détermine si une permission peut être accordée automatiquement"""
        # Vérifications de sécurité pour l'octroi automatique
        if request.level.value > policy["max_level"].value:
            return False

        if request.scope not in policy["allowed_scopes"]:
            return False

        # Vérifications de risque
        if policy["risk_level"] == "high":
            return False  # Jamais d'octroi automatique pour les permissions haute risque

        return True

    def _get_auto_grant_conditions(self, policy: Dict[str, Any]) -> Dict[str, Any]:
        """Retourne les conditions pour un octroi automatique"""
        conditions = {
            "auto_granted": True,
            "risk_level": policy["risk_level"]
        }

        # Conditions spécifiques selon la politique
        if "path_restrictions" in policy:
            conditions["path_restrictions"] = policy["path_restrictions"]

        if "url_whitelist" in policy:
            conditions["url_whitelist"] = policy["url_whitelist"]

        return conditions

    def _store_grant(self, addon_name: str, grant: PermissionGrant):
        """Stocke un octroi de permission"""
        if addon_name not in self.granted_permissions:
            self.granted_permissions[addon_name] = []

        self.granted_permissions[addon_name].append(grant)

    def create_permission_request(self, addon_name: str, permission: str,
                                level: PermissionLevel = PermissionLevel.READ,
                                scope: PermissionScope = PermissionScope.PROJECT,
                                justification: str = "",
                                context: Dict[str, Any] = None) -> PermissionRequest:
        """Crée une requête de permission"""
        return PermissionRequest(
            permission=permission,
            level=level,
            scope=scope,
            justification=justification,
            addon_name=addon_name,
            context=context or {}
        )
