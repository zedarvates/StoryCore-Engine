"""
Connection Pool Service for Backend Services

This module provides connection pooling for external backend services including
ComfyUI, LLM services, and other external APIs. Connection pooling improves
performance by reusing connections and managing connection lifecycle.

Features:
- Generic connection pool with configurable size
- Connection health checking and automatic reconnection
- Connection timeout and idle timeout management
- Thread-safe connection acquisition and release
- Connection statistics and monitoring
- Support for multiple backend types (ComfyUI, LLM, etc.)
"""

import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from queue import Queue, Empty, Full
from typing import Any, Callable, Dict, Optional, Protocol, TypeVar, Generic
from contextlib import contextmanager

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """Connection state enumeration"""
    IDLE = "idle"
    ACTIVE = "active"
    CLOSED = "closed"
    ERROR = "error"


class BackendType(Enum):
    """Backend service types"""
    COMFYUI = "comfyui"
    LLM = "llm"
    STORAGE = "storage"
    CUSTOM = "custom"


@dataclass
class ConnectionConfig:
    """Configuration for connection pool"""
    backend_type: BackendType
    host: str
    port: int
    min_connections: int = 1
    max_connections: int = 10
    connection_timeout: float = 30.0  # seconds
    idle_timeout: float = 300.0  # seconds (5 minutes)
    max_retries: int = 3
    retry_delay: float = 1.0  # seconds
    health_check_interval: float = 60.0  # seconds
    enable_health_check: bool = True
    custom_params: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConnectionStats:
    """Connection pool statistics"""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    failed_connections: int = 0
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    average_wait_time: float = 0.0
    peak_connections: int = 0
    last_reset: datetime = field(default_factory=datetime.now)


class Connection(Protocol):
    """Protocol for connection objects"""
    
    def connect(self) -> None:
        """Establish connection"""
        ...
    
    def disconnect(self) -> None:
        """Close connection"""
        ...
    
    def is_healthy(self) -> bool:
        """Check if connection is healthy"""
        ...
    
    def execute(self, operation: str, **kwargs) -> Any:
        """Execute operation on connection"""
        ...


T = TypeVar('T', bound=Connection)


class PooledConnection(Generic[T]):
    """Wrapper for pooled connections with metadata"""
    
    def __init__(self, connection: T, pool: 'ConnectionPool'):
        self.connection = connection
        self.pool = pool
        self.state = ConnectionState.IDLE
        self.created_at = datetime.now()
        self.last_used = datetime.now()
        self.use_count = 0
        self.error_count = 0
        self._lock = threading.Lock()
    
    def acquire(self) -> T:
        """Acquire connection for use"""
        with self._lock:
            if self.state != ConnectionState.IDLE:
                raise RuntimeError(f"Connection is not idle: {self.state}")
            
            self.state = ConnectionState.ACTIVE
            self.last_used = datetime.now()
            self.use_count += 1
            
            return self.connection
    
    def release(self) -> None:
        """Release connection back to pool"""
        with self._lock:
            if self.state != ConnectionState.ACTIVE:
                logger.warning(f"Releasing connection that is not active: {self.state}")
            
            self.state = ConnectionState.IDLE
            self.last_used = datetime.now()
    
    def mark_error(self) -> None:
        """Mark connection as having an error"""
        with self._lock:
            self.error_count += 1
            self.state = ConnectionState.ERROR
    
    def close(self) -> None:
        """Close connection"""
        with self._lock:
            try:
                self.connection.disconnect()
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
            finally:
                self.state = ConnectionState.CLOSED
    
    def is_idle_timeout(self, timeout: float) -> bool:
        """Check if connection has been idle too long"""
        with self._lock:
            if self.state != ConnectionState.IDLE:
                return False
            
            idle_time = (datetime.now() - self.last_used).total_seconds()
            return idle_time > timeout
    
    def is_healthy(self) -> bool:
        """Check if connection is healthy"""
        with self._lock:
            if self.state == ConnectionState.CLOSED:
                return False
            
            try:
                return self.connection.is_healthy()
            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return False


class ConnectionPool(Generic[T]):
    """Generic connection pool for backend services"""
    
    def __init__(
        self,
        config: ConnectionConfig,
        connection_factory: Callable[[], T]
    ):
        self.config = config
        self.connection_factory = connection_factory
        self.stats = ConnectionStats()
        
        self._pool: Queue[PooledConnection[T]] = Queue(maxsize=config.max_connections)
        self._all_connections: list[PooledConnection[T]] = []
        self._lock = threading.Lock()
        self._health_check_thread: Optional[threading.Thread] = None
        self._shutdown = False
        
        # Initialize minimum connections
        self._initialize_pool()
        
        # Start health check thread
        if config.enable_health_check:
            self._start_health_check()
    
    def _initialize_pool(self) -> None:
        """Initialize pool with minimum connections"""
        for _ in range(self.config.min_connections):
            try:
                conn = self._create_connection()
                self._pool.put(conn, block=False)
            except Exception as e:
                logger.error(f"Failed to initialize connection: {e}")
                self.stats.failed_connections += 1
    
    def _create_connection(self) -> PooledConnection[T]:
        """Create a new pooled connection"""
        with self._lock:
            if len(self._all_connections) >= self.config.max_connections:
                raise RuntimeError("Maximum connections reached")
            
            try:
                # Create connection
                connection = self.connection_factory()
                connection.connect()
                
                # Wrap in pooled connection
                pooled = PooledConnection(connection, self)
                self._all_connections.append(pooled)
                
                # Update stats
                self.stats.total_connections += 1
                if self.stats.total_connections > self.stats.peak_connections:
                    self.stats.peak_connections = self.stats.total_connections
                
                logger.info(f"Created new connection (total: {self.stats.total_connections})")
                return pooled
                
            except Exception as e:
                logger.error(f"Failed to create connection: {e}")
                self.stats.failed_connections += 1
                raise
    
    @contextmanager
    def get_connection(self, timeout: Optional[float] = None):
        """
        Get connection from pool (context manager)
        
        Usage:
            with pool.get_connection() as conn:
                result = conn.execute("operation")
        """
        timeout = timeout or self.config.connection_timeout
        start_time = time.time()
        pooled_conn: Optional[PooledConnection[T]] = None
        
        try:
            # Try to get connection from pool
            try:
                pooled_conn = self._pool.get(block=True, timeout=timeout)
            except Empty:
                # Pool is empty, try to create new connection
                with self._lock:
                    if len(self._all_connections) < self.config.max_connections:
                        pooled_conn = self._create_connection()
                    else:
                        raise TimeoutError("Connection pool exhausted")
            
            # Update stats
            wait_time = time.time() - start_time
            self.stats.total_requests += 1
            self.stats.average_wait_time = (
                (self.stats.average_wait_time * (self.stats.total_requests - 1) + wait_time)
                / self.stats.total_requests
            )
            
            # Acquire connection
            connection = pooled_conn.acquire()
            self.stats.active_connections += 1
            
            # Yield connection to caller
            yield connection
            
            # Mark request as successful
            self.stats.successful_requests += 1
            
        except Exception as e:
            logger.error(f"Error using connection: {e}")
            self.stats.failed_requests += 1
            
            if pooled_conn:
                pooled_conn.mark_error()
            
            raise
            
        finally:
            # Release connection back to pool
            if pooled_conn:
                pooled_conn.release()
                self.stats.active_connections -= 1
                
                # Return to pool if healthy
                if pooled_conn.is_healthy():
                    try:
                        self._pool.put(pooled_conn, block=False)
                    except Full:
                        # Pool is full, close connection
                        pooled_conn.close()
                        with self._lock:
                            self._all_connections.remove(pooled_conn)
                            self.stats.total_connections -= 1
                else:
                    # Connection is unhealthy, close and remove
                    pooled_conn.close()
                    with self._lock:
                        self._all_connections.remove(pooled_conn)
                        self.stats.total_connections -= 1
    
    def _start_health_check(self) -> None:
        """Start background health check thread"""
        def health_check_loop():
            while not self._shutdown:
                try:
                    time.sleep(self.config.health_check_interval)
                    self._perform_health_check()
                except Exception as e:
                    logger.error(f"Health check error: {e}")
        
        self._health_check_thread = threading.Thread(
            target=health_check_loop,
            daemon=True,
            name=f"health-check-{self.config.backend_type.value}"
        )
        self._health_check_thread.start()
    
    def _perform_health_check(self) -> None:
        """Perform health check on all connections"""
        with self._lock:
            connections_to_remove = []
            
            for pooled_conn in self._all_connections:
                # Check idle timeout
                if pooled_conn.is_idle_timeout(self.config.idle_timeout):
                    logger.info("Closing idle connection")
                    pooled_conn.close()
                    connections_to_remove.append(pooled_conn)
                    continue
                
                # Check health
                if not pooled_conn.is_healthy():
                    logger.warning("Closing unhealthy connection")
                    pooled_conn.close()
                    connections_to_remove.append(pooled_conn)
            
            # Remove closed connections
            for conn in connections_to_remove:
                self._all_connections.remove(conn)
                self.stats.total_connections -= 1
            
            # Ensure minimum connections
            while len(self._all_connections) < self.config.min_connections:
                try:
                    conn = self._create_connection()
                    self._pool.put(conn, block=False)
                except Exception as e:
                    logger.error(f"Failed to create connection during health check: {e}")
                    break
    
    def get_stats(self) -> ConnectionStats:
        """Get current pool statistics"""
        with self._lock:
            self.stats.idle_connections = self._pool.qsize()
            return self.stats
    
    def reset_stats(self) -> None:
        """Reset statistics"""
        with self._lock:
            self.stats = ConnectionStats()
            self.stats.total_connections = len(self._all_connections)
            self.stats.idle_connections = self._pool.qsize()
            self.stats.active_connections = (
                self.stats.total_connections - self.stats.idle_connections
            )
    
    def shutdown(self) -> None:
        """Shutdown pool and close all connections"""
        logger.info(f"Shutting down connection pool ({self.config.backend_type.value})")
        self._shutdown = True
        
        # Wait for health check thread
        if self._health_check_thread:
            self._health_check_thread.join(timeout=5.0)
        
        # Close all connections
        with self._lock:
            for pooled_conn in self._all_connections:
                pooled_conn.close()
            
            self._all_connections.clear()
            self.stats.total_connections = 0
            
            # Clear pool queue
            while not self._pool.empty():
                try:
                    self._pool.get(block=False)
                except Empty:
                    break
        
        logger.info("Connection pool shutdown complete")


class ConnectionPoolManager:
    """Manager for multiple connection pools"""
    
    def __init__(self):
        self._pools: Dict[str, ConnectionPool] = {}
        self._lock = threading.Lock()
    
    def create_pool(
        self,
        name: str,
        config: ConnectionConfig,
        connection_factory: Callable[[], Connection]
    ) -> ConnectionPool:
        """Create a new connection pool"""
        with self._lock:
            if name in self._pools:
                raise ValueError(f"Pool '{name}' already exists")
            
            pool = ConnectionPool(config, connection_factory)
            self._pools[name] = pool
            
            logger.info(f"Created connection pool: {name}")
            return pool
    
    def get_pool(self, name: str) -> ConnectionPool:
        """Get connection pool by name"""
        with self._lock:
            if name not in self._pools:
                raise KeyError(f"Pool '{name}' not found")
            
            return self._pools[name]
    
    def remove_pool(self, name: str) -> None:
        """Remove and shutdown connection pool"""
        with self._lock:
            if name not in self._pools:
                raise KeyError(f"Pool '{name}' not found")
            
            pool = self._pools[name]
            pool.shutdown()
            del self._pools[name]
            
            logger.info(f"Removed connection pool: {name}")
    
    def get_all_stats(self) -> Dict[str, ConnectionStats]:
        """Get statistics for all pools"""
        with self._lock:
            return {
                name: pool.get_stats()
                for name, pool in self._pools.items()
            }
    
    def shutdown_all(self) -> None:
        """Shutdown all connection pools"""
        with self._lock:
            for name, pool in self._pools.items():
                logger.info(f"Shutting down pool: {name}")
                pool.shutdown()
            
            self._pools.clear()
            logger.info("All connection pools shutdown")


# Global connection pool manager
_pool_manager: Optional[ConnectionPoolManager] = None


def get_pool_manager() -> ConnectionPoolManager:
    """Get global connection pool manager"""
    global _pool_manager
    if _pool_manager is None:
        _pool_manager = ConnectionPoolManager()
    return _pool_manager
