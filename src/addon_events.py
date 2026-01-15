"""
Addon Event System for StoryCore-Engine
Système d'événements pour la communication entre add-ons et le moteur.
"""

import asyncio
import json
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any, Callable, Awaitable, Set
from datetime import datetime
import uuid


class EventPriority(Enum):
    """Priorités des événements"""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class EventScope(Enum):
    """Périmètres des événements"""
    LOCAL = "local"      # Add-on local uniquement
    PROJECT = "project"  # Projet courant
    GLOBAL = "global"    # Tout le système


@dataclass
class Event:
    """Structure d'un événement"""
    id: str
    name: str
    source: str  # Add-on source ou "system"
    scope: EventScope
    priority: EventPriority
    timestamp: datetime
    data: Dict[str, Any]
    metadata: Dict[str, Any]


@dataclass
class EventSubscription:
    """Abonnement à un événement"""
    addon_name: str
    event_pattern: str
    callback: Callable[[Event], Awaitable[None]]
    priority: EventPriority
    filters: Dict[str, Any]
    metadata: Dict[str, Any]


@dataclass
class EventResult:
    """Résultat de traitement d'un événement"""
    event_id: str
    subscriber: str
    success: bool
    error: Optional[str]
    processing_time: float
    actions_taken: List[str]


class EventBus:
    """
    Bus d'événements pour la communication asynchrone

    Responsabilités:
    - Publication d'événements
    - Gestion des abonnements
    - Routage des événements
    - Persistance optionnelle
    """

    def __init__(self, max_queue_size: int = 1000, enable_persistence: bool = False):
        self.logger = logging.getLogger(__name__)

        # Files d'attente par priorité
        self.event_queues = {
            EventPriority.LOW: asyncio.Queue(maxsize=max_queue_size),
            EventPriority.NORMAL: asyncio.Queue(maxsize=max_queue_size),
            EventPriority.HIGH: asyncio.Queue(maxsize=max_queue_size),
            EventPriority.CRITICAL: asyncio.PriorityQueue()
        }

        # Abonnements
        self.subscriptions: Dict[str, List[EventSubscription]] = {}

        # Tâche de traitement
        self.processing_task: Optional[asyncio.Task] = None
        self.is_running = False

        # Persistance
        self.enable_persistence = enable_persistence
        self.persistence_file = "event_log.jsonl"

        # Statistiques
        self.stats = {
            "events_published": 0,
            "events_processed": 0,
            "events_failed": 0,
            "subscribers_active": 0
        }

    async def start(self):
        """Démarre le bus d'événements"""
        if self.is_running:
            return

        self.is_running = True
        self.processing_task = asyncio.create_task(self._process_events())
        self.logger.info("Bus d'événements démarré")

    async def stop(self):
        """Arrête le bus d'événements"""
        if not self.is_running:
            return

        self.is_running = False
        if self.processing_task:
            self.processing_task.cancel()
            try:
                await self.processing_task
            except asyncio.CancelledError:
                pass

        self.logger.info("Bus d'événements arrêté")

    def subscribe(self, addon_name: str, event_pattern: str,
                 callback: Callable[[Event], Awaitable[None]],
                 priority: EventPriority = EventPriority.NORMAL,
                 filters: Dict[str, Any] = None,
                 metadata: Dict[str, Any] = None) -> str:
        """
        S'abonne à un pattern d'événements

        Args:
            addon_name: Nom de l'add-on
            event_pattern: Pattern d'événement (peut contenir wildcards)
            callback: Fonction à appeler
            priority: Priorité de traitement
            filters: Filtres supplémentaires
            metadata: Métadonnées

        Returns:
            ID d'abonnement
        """
        subscription_id = str(uuid.uuid4())

        subscription = EventSubscription(
            addon_name=addon_name,
            event_pattern=event_pattern,
            callback=callback,
            priority=priority,
            filters=filters or {},
            metadata=metadata or {}
        )

        if event_pattern not in self.subscriptions:
            self.subscriptions[event_pattern] = []

        self.subscriptions[event_pattern].append(subscription)
        self.stats["subscribers_active"] += 1

        self.logger.debug(f"Abonnement créé: {addon_name} -> {event_pattern}")
        return subscription_id

    def unsubscribe(self, addon_name: str, event_pattern: str = None) -> int:
        """
        Se désabonne d'événements

        Args:
            addon_name: Nom de l'add-on
            event_pattern: Pattern spécifique, ou None pour tous

        Returns:
            Nombre d'abonnements supprimés
        """
        removed_count = 0

        if event_pattern:
            if event_pattern in self.subscriptions:
                original_count = len(self.subscriptions[event_pattern])
                self.subscriptions[event_pattern] = [
                    sub for sub in self.subscriptions[event_pattern]
                    if sub.addon_name != addon_name
                ]
                removed_count = original_count - len(self.subscriptions[event_pattern])
        else:
            # Supprimer tous les abonnements de l'add-on
            for pattern in list(self.subscriptions.keys()):
                original_count = len(self.subscriptions[pattern])
                self.subscriptions[pattern] = [
                    sub for sub in self.subscriptions[pattern]
                    if sub.addon_name != addon_name
                ]
                removed_count += original_count - len(self.subscriptions[pattern])

        self.stats["subscribers_active"] -= removed_count
        self.logger.debug(f"Désabonnements supprimés: {removed_count} pour {addon_name}")

        return removed_count

    async def publish(self, event: Event):
        """
        Publie un événement

        Args:
            event: Événement à publier
        """
        if not self.is_running:
            self.logger.warning("Bus d'événements arrêté, événement ignoré")
            return

        try:
            # Ajouter à la file appropriée
            if event.priority == EventPriority.CRITICAL:
                await self.event_queues[EventPriority.CRITICAL].put((0, event))  # PriorityQueue
            else:
                await self.event_queues[event.priority].put(event)

            self.stats["events_published"] += 1

            # Persistance si activée
            if self.enable_persistence:
                await self._persist_event(event)

            self.logger.debug(f"Événement publié: {event.name} ({event.priority.value})")

        except asyncio.QueueFull:
            self.logger.error(f"File d'événements pleine pour priorité {event.priority.value}")
        except Exception as e:
            self.logger.error(f"Erreur lors de la publication d'événement: {e}")

    def create_event(self, name: str, source: str = "system",
                    scope: EventScope = EventScope.GLOBAL,
                    priority: EventPriority = EventPriority.NORMAL,
                    data: Dict[str, Any] = None,
                    metadata: Dict[str, Any] = None) -> Event:
        """
        Crée un événement

        Args:
            name: Nom de l'événement
            source: Source de l'événement
            scope: Périmètre de l'événement
            priority: Priorité de l'événement
            data: Données de l'événement
            metadata: Métadonnées

        Returns:
            Événement créé
        """
        return Event(
            id=str(uuid.uuid4()),
            name=name,
            source=source,
            scope=scope,
            priority=priority,
            timestamp=datetime.now(),
            data=data or {},
            metadata=metadata or {}
        )

    def get_subscriptions(self, addon_name: Optional[str] = None) -> Dict[str, List[str]]:
        """
        Retourne les abonnements actifs

        Args:
            addon_name: Nom d'add-on spécifique, ou None pour tous

        Returns:
            Dictionnaire des abonnements
        """
        if addon_name:
            return {
                pattern: [sub.addon_name for sub in subs if sub.addon_name == addon_name]
                for pattern, subs in self.subscriptions.items()
                if any(sub.addon_name == addon_name for sub in subs)
            }

        return {
            pattern: [sub.addon_name for sub in subs]
            for pattern, subs in self.subscriptions.items()
        }

    def get_event_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques des événements"""
        queue_sizes = {}
        for priority, queue in self.event_queues.items():
            if hasattr(queue, '_queue'):  # Pour PriorityQueue
                queue_sizes[priority.value] = queue.qsize()
            else:
                queue_sizes[priority.value] = queue.qsize()

        return {
            **self.stats,
            "queue_sizes": queue_sizes,
            "is_running": self.is_running,
            "subscriptions_count": sum(len(subs) for subs in self.subscriptions.values())
        }

    # Méthodes privées

    async def _process_events(self):
        """Traite les événements en continu"""
        self.logger.info("Début du traitement des événements")

        while self.is_running:
            try:
                # Traiter d'abord les événements critiques
                if not self.event_queues[EventPriority.CRITICAL].empty():
                    priority, event = await self.event_queues[EventPriority.CRITICAL].get()
                    await self._route_event(event)
                    self.event_queues[EventPriority.CRITICAL].task_done()
                    continue

                # Puis les autres priorités
                for priority in [EventPriority.HIGH, EventPriority.NORMAL, EventPriority.LOW]:
                    if not self.event_queues[priority].empty():
                        event = await self.event_queues[priority].get()
                        await self._route_event(event)
                        self.event_queues[priority].task_done()
                        break
                else:
                    # Aucune file non vide, attendre un peu
                    await asyncio.sleep(0.01)

            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Erreur dans le traitement d'événements: {e}")
                self.stats["events_failed"] += 1

        self.logger.info("Fin du traitement des événements")

    async def _route_event(self, event: Event):
        """Route un événement vers les abonnés appropriés"""
        matching_subscriptions = self._find_matching_subscriptions(event)

        if not matching_subscriptions:
            return

        # Traiter les abonnements en parallèle
        tasks = []
        for subscription in matching_subscriptions:
            if self._matches_filters(event, subscription):
                task = asyncio.create_task(
                    self._deliver_event(event, subscription)
                )
                tasks.append(task)

        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            successful_deliveries = sum(1 for r in results if not isinstance(r, Exception))
            self.stats["events_processed"] += successful_deliveries

    def _find_matching_subscriptions(self, event: Event) -> List[EventSubscription]:
        """Trouve les abonnements correspondant à un événement"""
        matching = []

        for pattern, subscriptions in self.subscriptions.items():
            if self._matches_pattern(event.name, pattern):
                matching.extend(subscriptions)

        return matching

    def _matches_pattern(self, event_name: str, pattern: str) -> bool:
        """Vérifie si un nom d'événement correspond à un pattern"""
        # Support basique des wildcards
        if '*' in pattern:
            import fnmatch
            return fnmatch.fnmatch(event_name, pattern)

        # Support des patterns avec séparateurs
        if '.' in pattern:
            pattern_parts = pattern.split('.')
            event_parts = event_name.split('.')

            if len(pattern_parts) != len(event_parts):
                return False

            for p_part, e_part in zip(pattern_parts, event_parts):
                if p_part != '*' and p_part != e_part:
                    return False

            return True

        return event_name == pattern

    def _matches_filters(self, event: Event, subscription: EventSubscription) -> bool:
        """Vérifie si un événement passe les filtres d'un abonnement"""
        for key, expected_value in subscription.filters.items():
            if key == "source":
                if event.source != expected_value:
                    return False
            elif key == "scope":
                if event.scope.value != expected_value:
                    return False
            elif key == "min_priority":
                if event.priority.value < expected_value:
                    return False
            elif key in event.data:
                if event.data[key] != expected_value:
                    return False
            elif key in event.metadata:
                if event.metadata[key] != expected_value:
                    return False
            else:
                return False  # Filtre non satisfait

        return True

    async def _deliver_event(self, event: Event, subscription: EventSubscription) -> EventResult:
        """Délivre un événement à un abonné"""
        import time
        start_time = time.time()

        actions_taken = []

        try:
            await subscription.callback(event)
            actions_taken.append("callback_executed")

            processing_time = time.time() - start_time

            return EventResult(
                event_id=event.id,
                subscriber=subscription.addon_name,
                success=True,
                error=None,
                processing_time=processing_time,
                actions_taken=actions_taken
            )

        except Exception as e:
            processing_time = time.time() - start_time
            error_msg = f"{type(e).__name__}: {str(e)}"

            self.logger.error(f"Erreur lors de la livraison d'événement à {subscription.addon_name}: {error_msg}")

            return EventResult(
                event_id=event.id,
                subscriber=subscription.addon_name,
                success=False,
                error=error_msg,
                processing_time=processing_time,
                actions_taken=actions_taken
            )

    async def _persist_event(self, event: Event):
        """Persiste un événement dans le journal"""
        try:
            event_dict = {
                "id": event.id,
                "name": event.name,
                "source": event.source,
                "scope": event.scope.value,
                "priority": event.priority.value,
                "timestamp": event.timestamp.isoformat(),
                "data": event.data,
                "metadata": event.metadata
            }

            with open(self.persistence_file, 'a', encoding='utf-8') as f:
                f.write(json.dumps(event_dict) + '\n')

        except Exception as e:
            self.logger.error(f"Erreur lors de la persistance d'événement: {e}")

    # Méthodes utilitaires

    async def publish_system_event(self, name: str, data: Dict[str, Any] = None,
                                 priority: EventPriority = EventPriority.NORMAL):
        """Publie un événement système"""
        event = self.create_event(
            name=name,
            source="system",
            scope=EventScope.GLOBAL,
            priority=priority,
            data=data or {}
        )
        await self.publish(event)

    async def publish_addon_event(self, addon_name: str, name: str,
                                data: Dict[str, Any] = None,
                                scope: EventScope = EventScope.PROJECT,
                                priority: EventPriority = EventPriority.NORMAL):
        """Publie un événement d'add-on"""
        event = self.create_event(
            name=name,
            source=addon_name,
            scope=scope,
            priority=priority,
            data=data or {}
        )
        await self.publish(event)
