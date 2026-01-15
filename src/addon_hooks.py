"""
Addon Hook System for StoryCore-Engine
Système de hooks (points d'extension) pour les add-ons.
"""

import asyncio
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Awaitable
from pathlib import Path


class HookPriority(Enum):
    """Priorités d'exécution des hooks"""
    LOWEST = 0
    LOW = 25
    NORMAL = 50
    HIGH = 75
    HIGHEST = 100


@dataclass
class HookRegistration:
    """Enregistrement d'un hook"""
    addon_name: str
    hook_name: str
    callback: Callable[..., Awaitable[Any]]
    priority: HookPriority
    metadata: Dict[str, Any]


@dataclass
class HookContext:
    """Contexte d'exécution d'un hook"""
    hook_name: str
    args: List[Any]
    kwargs: Dict[str, Any]
    addon_context: Dict[str, Any]
    execution_metadata: Dict[str, Any]


@dataclass
class HookResult:
    """Résultat d'exécution d'un hook"""
    hook_name: str
    addon_name: str
    success: bool
    result: Any
    error: Optional[str]
    execution_time: float
    priority: HookPriority


class HookManager:
    """
    Gestionnaire des hooks pour les add-ons

    Responsabilités:
    - Gestion des points d'extension
    - Exécution ordonnée des hooks
    - Gestion des priorités
    - Gestion des erreurs
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Registre des hooks
        self.hooks: Dict[str, List[HookRegistration]] = {}

        # Hooks prédéfinis du système
        self._initialize_system_hooks()

        # Statistiques
        self.stats = {
            "executions_total": 0,
            "executions_successful": 0,
            "executions_failed": 0,
            "hooks_registered": 0
        }

    def _initialize_system_hooks(self):
        """Initialise les hooks système prédéfinis"""
        self.system_hooks = {
            # Hooks du cycle de vie des add-ons
            "addon_loaded": "Déclenché quand un add-on est chargé",
            "addon_enabled": "Déclenché quand un add-on est activé",
            "addon_disabled": "Déclenché quand un add-on est désactivé",

            # Hooks de traitement
            "pre_processing": "Avant le début du traitement",
            "post_processing": "Après la fin du traitement",
            "processing_error": "En cas d'erreur de traitement",

            # Hooks de génération de contenu
            "pre_generation": "Avant la génération de contenu",
            "post_generation": "Après la génération de contenu",
            "content_filter": "Pour filtrer/modifier le contenu généré",

            # Hooks de workflow
            "workflow_start": "Début d'un workflow",
            "workflow_step": "À chaque étape du workflow",
            "workflow_end": "Fin d'un workflow",

            # Hooks d'export
            "pre_export": "Avant l'export",
            "post_export": "Après l'export",
            "export_filter": "Filtrage du contenu d'export",

            # Hooks UI
            "ui_render": "Rendu d'interface utilisateur",
            "ui_event": "Gestion des événements UI",

            # Hooks de sécurité
            "security_check": "Vérifications de sécurité",
            "permission_request": "Demandes de permissions",

            # Hooks de monitoring
            "metrics_collect": "Collecte de métriques",
            "health_check": "Vérifications de santé"
        }

    def register_hook(self, addon_name: str, hook_name: str,
                     callback: Callable[..., Awaitable[Any]],
                     priority: HookPriority = HookPriority.NORMAL,
                     metadata: Dict[str, Any] = None) -> bool:
        """
        Enregistre un hook pour un add-on

        Args:
            addon_name: Nom de l'add-on
            hook_name: Nom du hook
            callback: Fonction à exécuter
            priority: Priorité d'exécution
            metadata: Métadonnées supplémentaires

        Returns:
            True si enregistré avec succès
        """
        if hook_name not in self.system_hooks and not hook_name.startswith("custom_"):
            self.logger.warning(f"Hook inconnu: {hook_name}. Utilisez custom_* pour les hooks personnalisés.")
            return False

        if not asyncio.iscoroutinefunction(callback):
            self.logger.error(f"Le callback pour {hook_name} doit être une fonction async")
            return False

        registration = HookRegistration(
            addon_name=addon_name,
            hook_name=hook_name,
            callback=callback,
            priority=priority,
            metadata=metadata or {}
        )

        if hook_name not in self.hooks:
            self.hooks[hook_name] = []

        # Insérer selon la priorité (ordre décroissant)
        self.hooks[hook_name].append(registration)
        self.hooks[hook_name].sort(key=lambda x: x.priority.value, reverse=True)

        self.stats["hooks_registered"] += 1
        self.logger.debug(f"Hook enregistré: {addon_name}.{hook_name} (priorité: {priority.name})")

        return True

    def unregister_hook(self, addon_name: str, hook_name: str) -> bool:
        """
        Désenregistre un hook

        Args:
            addon_name: Nom de l'add-on
            hook_name: Nom du hook

        Returns:
            True si désenregistré avec succès
        """
        if hook_name not in self.hooks:
            return False

        original_count = len(self.hooks[hook_name])
        self.hooks[hook_name] = [
            reg for reg in self.hooks[hook_name]
            if reg.addon_name != addon_name
        ]

        if len(self.hooks[hook_name]) < original_count:
            self.stats["hooks_registered"] -= 1
            self.logger.debug(f"Hook désenregistré: {addon_name}.{hook_name}")
            return True

        return False

    def unregister_all_addon_hooks(self, addon_name: str):
        """Désenregistre tous les hooks d'un add-on"""
        for hook_name in list(self.hooks.keys()):
            self.unregister_hook(addon_name, hook_name)

        self.logger.debug(f"Tous les hooks désenregistrés pour: {addon_name}")

    async def execute_hook(self, hook_name: str, *args, **kwargs) -> List[HookResult]:
        """
        Exécute tous les hooks enregistrés pour un point d'extension

        Args:
            hook_name: Nom du hook à exécuter
            *args: Arguments positionnels
            **kwargs: Arguments nommés

        Returns:
            Liste des résultats d'exécution
        """
        if hook_name not in self.hooks:
            return []

        registrations = self.hooks[hook_name]
        if not registrations:
            return []

        results = []
        addon_context = self._get_addon_context()

        for registration in registrations:
            result = await self._execute_single_hook(
                registration, args, kwargs, addon_context
            )
            results.append(result)

            # Gestion des erreurs selon la politique
            if not result.success:
                self.stats["executions_failed"] += 1
                if self._should_stop_on_error(hook_name):
                    self.logger.error(f"Arrêt sur erreur pour hook {hook_name}")
                    break
            else:
                self.stats["executions_successful"] += 1

        self.stats["executions_total"] += len(results)
        return results

    async def execute_hook_with_filter(self, hook_name: str, initial_value: Any,
                                     *args, **kwargs) -> Any:
        """
        Exécute des hooks de filtrage qui peuvent modifier une valeur

        Args:
            hook_name: Nom du hook
            initial_value: Valeur initiale à filtrer
            *args: Arguments supplémentaires
            **kwargs: Arguments nommés

        Returns:
            Valeur filtrée après tous les hooks
        """
        if hook_name not in self.hooks:
            return initial_value

        current_value = initial_value
        registrations = self.hooks[hook_name]

        for registration in registrations:
            try:
                # Les hooks de filtrage reçoivent la valeur courante
                result = await registration.callback(current_value, *args, **kwargs)
                if result is not None:
                    current_value = result
            except Exception as e:
                self.logger.error(f"Erreur dans hook de filtrage {registration.addon_name}.{hook_name}: {e}")
                # En cas d'erreur, on garde la valeur précédente

        return current_value

    def get_registered_hooks(self, hook_name: Optional[str] = None) -> Dict[str, List[str]]:
        """
        Retourne les hooks enregistrés

        Args:
            hook_name: Nom spécifique du hook, ou None pour tous

        Returns:
            Dictionnaire des hooks par nom
        """
        if hook_name:
            if hook_name in self.hooks:
                return {hook_name: [reg.addon_name for reg in self.hooks[hook_name]]}
            return {}

        return {
            name: [reg.addon_name for reg in registrations]
            for name, registrations in self.hooks.items()
        }

    def get_hook_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques des hooks"""
        return {
            **self.stats,
            "hooks_by_type": {
                hook_name: len(registrations)
                for hook_name, registrations in self.hooks.items()
            }
        }

    def get_available_hooks(self) -> Dict[str, str]:
        """Retourne la liste des hooks disponibles"""
        return self.system_hooks.copy()

    # Méthodes privées

    async def _execute_single_hook(self, registration: HookRegistration,
                                 args: List[Any], kwargs: Dict[str, Any],
                                 addon_context: Dict[str, Any]) -> HookResult:
        """Exécute un seul hook"""
        import time
        start_time = time.time()

        try:
            # Préparer le contexte
            hook_context = HookContext(
                hook_name=registration.hook_name,
                args=args,
                kwargs=kwargs,
                addon_context=addon_context,
                execution_metadata={
                    "priority": registration.priority.value,
                    "metadata": registration.metadata
                }
            )

            # Exécuter le callback
            result = await registration.callback(*args, **kwargs)

            execution_time = time.time() - start_time

            return HookResult(
                hook_name=registration.hook_name,
                addon_name=registration.addon_name,
                success=True,
                result=result,
                error=None,
                execution_time=execution_time,
                priority=registration.priority
            )

        except Exception as e:
            execution_time = time.time() - start_time
            error_msg = f"{type(e).__name__}: {str(e)}"

            self.logger.error(f"Erreur dans hook {registration.addon_name}.{registration.hook_name}: {error_msg}")

            return HookResult(
                hook_name=registration.hook_name,
                addon_name=registration.addon_name,
                success=False,
                result=None,
                error=error_msg,
                execution_time=execution_time,
                priority=registration.priority
            )

    def _should_stop_on_error(self, hook_name: str) -> bool:
        """Détermine si l'exécution doit s'arrêter en cas d'erreur"""
        # Hooks critiques qui doivent s'arrêter sur erreur
        critical_hooks = {
            "security_check",
            "permission_request",
            "pre_processing"
        }

        return hook_name in critical_hooks

    def _get_addon_context(self) -> Dict[str, Any]:
        """Retourne le contexte global des add-ons"""
        # TODO: Intégrer avec AddonManager pour le contexte réel
        return {
            "engine_version": "2.0.0",
            "active_addons": [],  # Liste des add-ons actifs
            "system_state": "running"
        }

    # Méthodes utilitaires pour les add-ons

    def create_filter_hook(self, filter_function: Callable[[Any], Awaitable[Any]]) -> Callable[..., Awaitable[Any]]:
        """
        Crée un hook de filtrage à partir d'une fonction simple

        Args:
            filter_function: Fonction qui prend une valeur et la retourne modifiée

        Returns:
            Fonction compatible avec les hooks de filtrage
        """
        async def filter_hook(value: Any, *args, **kwargs) -> Any:
            return await filter_function(value)

        return filter_hook

    def create_event_hook(self, event_handler: Callable[..., Awaitable[None]]) -> Callable[..., Awaitable[Any]]:
        """
        Crée un hook d'événement à partir d'un gestionnaire simple

        Args:
            event_handler: Fonction qui gère l'événement

        Returns:
            Fonction compatible avec les hooks d'événement
        """
        async def event_hook(*args, **kwargs) -> None:
            await event_handler(*args, **kwargs)
            return None  # Les hooks d'événement ne retournent généralement rien

        return event_hook
