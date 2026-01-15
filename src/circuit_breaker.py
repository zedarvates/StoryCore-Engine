#!/usr/bin/env python3
"""
Circuit Breaker Pattern pour éviter les blocages et cascades d'erreurs.
Implémente une protection contre les boucles infinies et les opérations qui échouent répétitivement.
"""

import time
import logging
from enum import Enum
from typing import Callable, Any, Optional, Dict
from dataclasses import dataclass, field
from threading import Lock
import functools

logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """États du circuit breaker."""
    CLOSED = "closed"      # Fonctionnement normal
    OPEN = "open"          # Circuit ouvert, rejette les requêtes
    HALF_OPEN = "half_open"  # Test de récupération


@dataclass
class CircuitBreakerConfig:
    """Configuration du circuit breaker."""
    failure_threshold: int = 5          # Nombre d'échecs avant ouverture
    recovery_timeout: float = 60.0      # Temps avant test de récupération (secondes)
    success_threshold: int = 3          # Succès requis pour fermer le circuit
    timeout: float = 30.0               # Timeout par opération
    max_concurrent: int = 10            # Limite de concurrence


@dataclass
class CircuitBreakerStats:
    """Statistiques du circuit breaker."""
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    rejected_requests: int = 0
    state_changes: int = 0
    last_failure_time: Optional[float] = None
    last_success_time: Optional[float] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0


class CircuitBreakerError(Exception):
    """Exception levée quand le circuit est ouvert."""
    pass


class TimeoutError(Exception):
    """Exception levée en cas de timeout."""
    pass


class CircuitBreaker:
    """
    Circuit Breaker pour protéger contre les opérations défaillantes.
    
    Évite les boucles infinies et les cascades d'erreurs en:
    - Surveillant les échecs d'opérations
    - Ouvrant le circuit après trop d'échecs
    - Permettant des tests de récupération périodiques
    - Limitant la concurrence
    """
    
    def __init__(self, name: str, config: Optional[CircuitBreakerConfig] = None):
        """Initialise le circuit breaker."""
        self.name = name
        self.config = config or CircuitBreakerConfig()
        self.state = CircuitState.CLOSED
        self.stats = CircuitBreakerStats()
        self._lock = Lock()
        self._concurrent_requests = 0
        
        logger.info(f"Circuit breaker '{name}' initialisé avec config: {self.config}")
    
    def __call__(self, func: Callable) -> Callable:
        """Décorateur pour protéger une fonction."""
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return self.call(func, *args, **kwargs)
        return wrapper
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Exécute une fonction protégée par le circuit breaker.
        
        Args:
            func: Fonction à exécuter
            *args, **kwargs: Arguments de la fonction
            
        Returns:
            Résultat de la fonction
            
        Raises:
            CircuitBreakerError: Si le circuit est ouvert
            TimeoutError: Si l'opération dépasse le timeout
        """
        with self._lock:
            self.stats.total_requests += 1
            
            # Vérifier l'état du circuit
            current_state = self._get_current_state()
            
            if current_state == CircuitState.OPEN:
                self.stats.rejected_requests += 1
                raise CircuitBreakerError(
                    f"Circuit breaker '{self.name}' est ouvert. "
                    f"Dernière erreur: {time.time() - (self.stats.last_failure_time or 0):.1f}s ago"
                )
            
            # Vérifier la limite de concurrence
            if self._concurrent_requests >= self.config.max_concurrent:
                self.stats.rejected_requests += 1
                raise CircuitBreakerError(
                    f"Circuit breaker '{self.name}' limite de concurrence atteinte: {self.config.max_concurrent}"
                )
            
            self._concurrent_requests += 1
        
        # Exécuter l'opération avec timeout
        start_time = time.time()
        try:
            result = self._execute_with_timeout(func, *args, **kwargs)
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure(e)
            raise
            
        finally:
            with self._lock:
                self._concurrent_requests -= 1
    
    def _execute_with_timeout(self, func: Callable, *args, **kwargs) -> Any:
        """Exécute une fonction avec timeout."""
        import signal
        import threading
        
        result = [None]
        exception = [None]
        
        def target():
            try:
                result[0] = func(*args, **kwargs)
            except Exception as e:
                exception[0] = e
        
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        thread.join(timeout=self.config.timeout)
        
        if thread.is_alive():
            # Thread encore actif = timeout
            logger.warning(f"Opération timeout après {self.config.timeout}s dans circuit '{self.name}'")
            raise TimeoutError(f"Opération timeout après {self.config.timeout}s")
        
        if exception[0]:
            raise exception[0]
        
        return result[0]
    
    def _get_current_state(self) -> CircuitState:
        """Détermine l'état actuel du circuit."""
        now = time.time()
        
        if self.state == CircuitState.OPEN:
            # Vérifier si on peut passer en half-open
            if (self.stats.last_failure_time and 
                now - self.stats.last_failure_time >= self.config.recovery_timeout):
                self._change_state(CircuitState.HALF_OPEN)
                logger.info(f"Circuit breaker '{self.name}' passe en HALF_OPEN pour test de récupération")
        
        return self.state
    
    def _on_success(self):
        """Appelé après une opération réussie."""
        with self._lock:
            self.stats.successful_requests += 1
            self.stats.last_success_time = time.time()
            self.stats.consecutive_failures = 0
            self.stats.consecutive_successes += 1
            
            # Si en half-open, vérifier si on peut fermer le circuit
            if self.state == CircuitState.HALF_OPEN:
                if self.stats.consecutive_successes >= self.config.success_threshold:
                    self._change_state(CircuitState.CLOSED)
                    logger.info(f"Circuit breaker '{self.name}' fermé après {self.stats.consecutive_successes} succès")
    
    def _on_failure(self, exception: Exception):
        """Appelé après une opération échouée."""
        with self._lock:
            self.stats.failed_requests += 1
            self.stats.last_failure_time = time.time()
            self.stats.consecutive_successes = 0
            self.stats.consecutive_failures += 1
            
            logger.warning(f"Échec dans circuit breaker '{self.name}': {exception}")
            
            # Vérifier si on doit ouvrir le circuit
            if (self.state == CircuitState.CLOSED and 
                self.stats.consecutive_failures >= self.config.failure_threshold):
                self._change_state(CircuitState.OPEN)
                logger.error(f"Circuit breaker '{self.name}' OUVERT après {self.stats.consecutive_failures} échecs")
            
            elif self.state == CircuitState.HALF_OPEN:
                # Retour en open si échec pendant le test
                self._change_state(CircuitState.OPEN)
                logger.warning(f"Circuit breaker '{self.name}' retour en OPEN après échec du test")
    
    def _change_state(self, new_state: CircuitState):
        """Change l'état du circuit."""
        old_state = self.state
        self.state = new_state
        self.stats.state_changes += 1
        
        if new_state == CircuitState.CLOSED:
            # Reset des compteurs lors de la fermeture
            self.stats.consecutive_failures = 0
            self.stats.consecutive_successes = 0
    
    def force_open(self):
        """Force l'ouverture du circuit (pour maintenance)."""
        with self._lock:
            self._change_state(CircuitState.OPEN)
            logger.info(f"Circuit breaker '{self.name}' forcé en OPEN")
    
    def force_close(self):
        """Force la fermeture du circuit (pour récupération manuelle)."""
        with self._lock:
            self._change_state(CircuitState.CLOSED)
            self.stats.consecutive_failures = 0
            logger.info(f"Circuit breaker '{self.name}' forcé en CLOSED")
    
    def get_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques du circuit breaker."""
        with self._lock:
            success_rate = (
                (self.stats.successful_requests / self.stats.total_requests * 100)
                if self.stats.total_requests > 0 else 0
            )
            
            return {
                "name": self.name,
                "state": self.state.value,
                "config": {
                    "failure_threshold": self.config.failure_threshold,
                    "recovery_timeout": self.config.recovery_timeout,
                    "success_threshold": self.config.success_threshold,
                    "timeout": self.config.timeout,
                    "max_concurrent": self.config.max_concurrent
                },
                "stats": {
                    "total_requests": self.stats.total_requests,
                    "successful_requests": self.stats.successful_requests,
                    "failed_requests": self.stats.failed_requests,
                    "rejected_requests": self.stats.rejected_requests,
                    "success_rate_percent": success_rate,
                    "consecutive_failures": self.stats.consecutive_failures,
                    "consecutive_successes": self.stats.consecutive_successes,
                    "state_changes": self.stats.state_changes,
                    "concurrent_requests": self._concurrent_requests
                },
                "timing": {
                    "last_failure_time": self.stats.last_failure_time,
                    "last_success_time": self.stats.last_success_time,
                    "time_since_last_failure": (
                        time.time() - self.stats.last_failure_time
                        if self.stats.last_failure_time else None
                    )
                }
            }


class CircuitBreakerManager:
    """Gestionnaire global des circuit breakers."""
    
    def __init__(self):
        """Initialise le gestionnaire."""
        self._breakers: Dict[str, CircuitBreaker] = {}
        self._lock = Lock()
    
    def get_breaker(self, name: str, config: Optional[CircuitBreakerConfig] = None) -> CircuitBreaker:
        """Récupère ou crée un circuit breaker."""
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreaker(name, config)
            return self._breakers[name]
    
    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Retourne les statistiques de tous les circuit breakers."""
        with self._lock:
            return {name: breaker.get_stats() for name, breaker in self._breakers.items()}
    
    def force_open_all(self):
        """Force l'ouverture de tous les circuits (arrêt d'urgence)."""
        with self._lock:
            for breaker in self._breakers.values():
                breaker.force_open()
            logger.warning("Tous les circuit breakers forcés en OPEN")
    
    def force_close_all(self):
        """Force la fermeture de tous les circuits (récupération)."""
        with self._lock:
            for breaker in self._breakers.values():
                breaker.force_close()
            logger.info("Tous les circuit breakers forcés en CLOSED")


# Instance globale
circuit_manager = CircuitBreakerManager()


def circuit_breaker(name: str, config: Optional[CircuitBreakerConfig] = None):
    """
    Décorateur circuit breaker.
    
    Usage:
        @circuit_breaker("video_processing", CircuitBreakerConfig(failure_threshold=3))
        def process_video(data):
            # Opération potentiellement défaillante
            return result
    """
    def decorator(func: Callable) -> Callable:
        breaker = circuit_manager.get_breaker(name, config)
        return breaker(func)
    return decorator


# Exemple d'utilisation
if __name__ == "__main__":
    import random
    
    # Configuration pour test
    config = CircuitBreakerConfig(
        failure_threshold=3,
        recovery_timeout=5.0,
        success_threshold=2,
        timeout=2.0
    )
    
    @circuit_breaker("test_operation", config)
    def operation_test():
        """Opération de test qui échoue parfois."""
        if random.random() < 0.7:  # 70% de chance d'échec
            raise Exception("Opération échouée")
        return "Succès!"
    
    # Test du circuit breaker
    for i in range(20):
        try:
            result = operation_test()
            print(f"Tentative {i+1}: {result}")
        except (CircuitBreakerError, Exception) as e:
            print(f"Tentative {i+1}: ÉCHEC - {e}")
        
        time.sleep(1)
        
        # Afficher les stats périodiquement
        if i % 5 == 4:
            stats = circuit_manager.get_all_stats()
            print(f"\nStats: {stats['test_operation']['stats']}")
            print(f"État: {stats['test_operation']['state']}\n")