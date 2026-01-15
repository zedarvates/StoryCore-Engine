"""
Database Connection Pool for Production Scalability

This module provides efficient database connection pooling with:
- Connection reuse to reduce overhead
- Automatic connection health checks
- Configurable pool sizing
- Prepared statement caching
- Transaction management
- Performance monitoring

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import sqlite3
import threading
import time
import logging
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable, Generator
from queue import Queue, Empty
from enum import Enum
import weakref


class ConnectionState(Enum):
    """Database connection states."""
    IDLE = "idle"
    IN_USE = "in_use"
    CLOSED = "closed"
    ERROR = "error"


@dataclass
class PooledConnection:
    """Pooled database connection wrapper."""
    connection: sqlite3.Connection
    pool: 'DatabaseConnectionPool' = field(repr=False)
    created_at: float = field(default_factory=time.time)
    last_used: float = field(default_factory=time.time)
    state: ConnectionState = ConnectionState.IDLE
    thread_id: Optional[int] = None
    transaction_depth: int = 0

    def __post_init__(self):
        # Set connection properties
        self.connection.row_factory = sqlite3.Row
        self.connection.execute("PRAGMA journal_mode=WAL")
        self.connection.execute("PRAGMA synchronous=NORMAL")
        self.connection.execute("PRAGMA cache_size=1000")
        self.connection.execute("PRAGMA temp_store=MEMORY")

    def is_healthy(self) -> bool:
        """Check if connection is healthy."""
        if self.state == ConnectionState.CLOSED:
            return False

        try:
            # Simple health check query
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
            cursor.close()
            return True
        except Exception:
            self.state = ConnectionState.ERROR
            return False

    def close(self):
        """Close the connection."""
        if self.state != ConnectionState.CLOSED:
            try:
                self.connection.close()
            except Exception:
                pass  # Ignore close errors
            finally:
                self.state = ConnectionState.CLOSED

    def __del__(self):
        """Ensure connection is closed on garbage collection."""
        self.close()


@dataclass
class PoolConfiguration:
    """Configuration for database connection pool."""
    database_path: str
    min_connections: int = 2
    max_connections: int = 10
    connection_timeout: float = 30.0
    max_idle_time: float = 300.0  # 5 minutes
    health_check_interval: float = 60.0
    enable_statement_cache: bool = True
    statement_cache_size: int = 100
    enable_metrics: bool = True


@dataclass
class PoolMetrics:
    """Connection pool performance metrics."""
    connections_created: int = 0
    connections_destroyed: int = 0
    connections_acquired: int = 0
    connections_released: int = 0
    connection_wait_time: float = 0.0
    connection_errors: int = 0
    cache_hits: int = 0
    cache_misses: int = 0

    def get_average_wait_time(self) -> float:
        """Calculate average connection wait time."""
        if self.connections_acquired == 0:
            return 0.0
        return self.connection_wait_time / self.connections_acquired


class PreparedStatementCache:
    """Cache for prepared SQL statements."""

    def __init__(self, max_size: int = 100):
        self.max_size = max_size
        self.cache: Dict[str, sqlite3.Statement] = {}
        self.access_order: List[str] = []
        self.lock = threading.RLock()

    def get(self, sql: str, connection: sqlite3.Connection) -> sqlite3.Statement:
        """Get prepared statement from cache or create new one."""
        with self.lock:
            if sql in self.cache:
                # Move to end (most recently used)
                self.access_order.remove(sql)
                self.access_order.append(sql)
                return self.cache[sql]
            else:
                # Create new statement
                try:
                    statement = connection.prepare(sql) if hasattr(connection, 'prepare') else None
                    if statement and len(self.cache) < self.max_size:
                        self.cache[sql] = statement
                        self.access_order.append(sql)
                    elif len(self.cache) >= self.max_size:
                        # Evict least recently used
                        evicted_sql = self.access_order.pop(0)
                        del self.cache[evicted_sql]

                    return statement
                except Exception:
                    return None

    def clear(self):
        """Clear statement cache."""
        with self.lock:
            self.cache.clear()
            self.access_order.clear()


class DatabaseConnectionPool:
    """
    Thread-safe database connection pool for SQLite with advanced features.
    """

    def __init__(self, config: PoolConfiguration):
        self.config = config
        self.logger = logging.getLogger(__name__)

        # Connection storage
        self.available_connections: Queue = Queue(maxsize=config.max_connections)
        self.in_use_connections: Dict[int, PooledConnection] = {}  # thread_id -> connection
        self.all_connections: set = set()  # All connections for cleanup

        # Synchronization
        self.lock = threading.RLock()
        self.condition = threading.Condition(self.lock)

        # Prepared statement cache
        self.statement_cache = PreparedStatementCache(config.statement_cache_size) if config.enable_statement_cache else None

        # Metrics
        self.metrics = PoolMetrics()

        # Background tasks
        self.health_check_thread: Optional[threading.Thread] = None
        self.cleanup_thread: Optional[threading.Thread] = None
        self.running = False

        # Initialize pool
        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize connection pool with minimum connections."""
        for _ in range(self.config.min_connections):
            try:
                conn = self._create_connection()
                if conn:
                    self.available_connections.put(conn, block=False)
                    self.all_connections.add(conn)
            except Exception as e:
                self.logger.error(f"Failed to create initial connection: {e}")

    def _create_connection(self) -> Optional[PooledConnection]:
        """Create a new database connection."""
        try:
            connection = sqlite3.connect(
                self.config.database_path,
                timeout=self.config.connection_timeout,
                check_same_thread=False  # Allow cross-thread usage with care
            )

            pooled_conn = PooledConnection(
                connection=connection,
                pool=self
            )

            self.metrics.connections_created += 1
            return pooled_conn

        except Exception as e:
            self.logger.error(f"Failed to create connection: {e}")
            self.metrics.connection_errors += 1
            return None

    def start(self):
        """Start background maintenance tasks."""
        if self.running:
            return

        self.running = True

        # Start health check thread
        self.health_check_thread = threading.Thread(
            target=self._health_check_loop,
            daemon=True,
            name="db-pool-health-check"
        )
        self.health_check_thread.start()

        # Start cleanup thread
        self.cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            daemon=True,
            name="db-pool-cleanup"
        )
        self.cleanup_thread.start()

        self.logger.info("Database connection pool started")

    def stop(self):
        """Stop background tasks and close all connections."""
        if not self.running:
            return

        self.running = False

        # Close all connections
        with self.lock:
            for conn in self.all_connections:
                try:
                    conn.close()
                except Exception:
                    pass

            self.all_connections.clear()
            self.in_use_connections.clear()

            # Clear available queue
            while not self.available_connections.empty():
                try:
                    conn = self.available_connections.get_nowait()
                    conn.close()
                except Exception:
                    pass

        # Clear caches
        if self.statement_cache:
            self.statement_cache.clear()

        self.logger.info("Database connection pool stopped")

    @contextmanager
    def get_connection(self, timeout: Optional[float] = None) -> Generator[PooledConnection, None, None]:
        """
        Context manager for getting a database connection.

        Args:
            timeout: Maximum time to wait for connection

        Yields:
            PooledConnection instance
        """
        conn = None
        thread_id = threading.get_ident()
        wait_start = time.time()

        try:
            with self.lock:
                # Check if this thread already has a connection
                if thread_id in self.in_use_connections:
                    conn = self.in_use_connections[thread_id]
                    conn.last_used = time.time()
                    self.metrics.connections_acquired += 1
                    yield conn
                    return

                # Wait for available connection
                timeout = timeout or self.config.connection_timeout
                if not self.condition.wait_for(
                    lambda: not self.available_connections.empty() or not self.running,
                    timeout=timeout
                ):
                    raise TimeoutError("Timeout waiting for database connection")

                if not self.running:
                    raise RuntimeError("Connection pool is shutting down")

                # Get connection from queue
                try:
                    conn = self.available_connections.get_nowait()
                except Empty:
                    raise RuntimeError("No connections available")

                # Mark as in use
                conn.state = ConnectionState.IN_USE
                conn.thread_id = thread_id
                conn.last_used = time.time()
                self.in_use_connections[thread_id] = conn

            wait_time = time.time() - wait_start
            self.metrics.connection_wait_time += wait_time
            self.metrics.connections_acquired += 1

            yield conn

        except Exception as e:
            self.metrics.connection_errors += 1
            raise
        finally:
            if conn:
                self._release_connection(conn)

    def _release_connection(self, conn: PooledConnection):
        """Release connection back to pool."""
        thread_id = threading.get_ident()

        with self.lock:
            if thread_id in self.in_use_connections:
                del self.in_use_connections[thread_id]

            # Check if connection is still healthy
            if conn.is_healthy() and conn.transaction_depth == 0:
                # Reset connection state
                conn.state = ConnectionState.IDLE
                conn.thread_id = None

                # Return to pool if not full
                try:
                    self.available_connections.put_nowait(conn)
                except Exception:
                    # Pool is full, close connection
                    conn.close()
                    self.all_connections.discard(conn)
                    self.metrics.connections_destroyed += 1
            else:
                # Connection is unhealthy or in transaction, close it
                conn.close()
                self.all_connections.discard(conn)
                self.metrics.connections_destroyed += 1

            self.metrics.connections_released += 1
            self.condition.notify()

    def execute_query(self, sql: str, parameters: tuple = (), timeout: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Execute a SELECT query and return results.

        Args:
            sql: SQL query string
            parameters: Query parameters
            timeout: Connection timeout

        Returns:
            List of result rows as dictionaries
        """
        with self.get_connection(timeout) as conn:
            try:
                cursor = conn.connection.cursor()

                # Use prepared statement if caching enabled
                if self.statement_cache:
                    statement = self.statement_cache.get(sql, conn.connection)
                    if statement:
                        cursor.execute(statement, parameters)
                        self.metrics.cache_hits += 1
                    else:
                        cursor.execute(sql, parameters)
                        self.metrics.cache_misses += 1
                else:
                    cursor.execute(sql, parameters)

                # Convert rows to dictionaries
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                results = [dict(zip(columns, row)) for row in cursor.fetchall()]

                cursor.close()
                return results

            except Exception as e:
                self.logger.error(f"Query execution failed: {e}")
                raise

    def execute_update(self, sql: str, parameters: tuple = (), timeout: Optional[float] = None) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query.

        Args:
            sql: SQL query string
            parameters: Query parameters
            timeout: Connection timeout

        Returns:
            Number of affected rows
        """
        with self.get_connection(timeout) as conn:
            try:
                cursor = conn.connection.cursor()

                # Use prepared statement if caching enabled
                if self.statement_cache:
                    statement = self.statement_cache.get(sql, conn.connection)
                    if statement:
                        cursor.execute(statement, parameters)
                        self.metrics.cache_hits += 1
                    else:
                        cursor.execute(sql, parameters)
                        self.metrics.cache_misses += 1
                else:
                    cursor.execute(sql, parameters)

                affected_rows = cursor.rowcount
                conn.connection.commit()
                cursor.close()

                return affected_rows

            except Exception as e:
                conn.connection.rollback()
                self.logger.error(f"Update execution failed: {e}")
                raise

    @contextmanager
    def transaction(self, timeout: Optional[float] = None):
        """
        Context manager for database transactions.

        Args:
            timeout: Connection timeout

        Yields:
            PooledConnection for transaction
        """
        with self.get_connection(timeout) as conn:
            conn.transaction_depth += 1
            try:
                yield conn
                conn.connection.commit()
            except Exception:
                conn.connection.rollback()
                raise
            finally:
                conn.transaction_depth -= 1

    def get_pool_status(self) -> Dict[str, Any]:
        """Get comprehensive pool status."""
        with self.lock:
            available_count = self.available_connections.qsize()
            in_use_count = len(self.in_use_connections)
            total_count = len(self.all_connections)

            return {
                'pool_size': {
                    'available': available_count,
                    'in_use': in_use_count,
                    'total': total_count,
                    'max': self.config.max_connections
                },
                'utilization_percent': (in_use_count / self.config.max_connections) * 100 if self.config.max_connections > 0 else 0,
                'metrics': {
                    'connections_created': self.metrics.connections_created,
                    'connections_destroyed': self.metrics.connections_destroyed,
                    'average_wait_time': self.metrics.get_average_wait_time(),
                    'connection_errors': self.metrics.connection_errors,
                    'statement_cache_hits': self.metrics.cache_hits,
                    'statement_cache_misses': self.metrics.cache_misses
                },
                'health': {
                    'pool_running': self.running,
                    'health_check_active': self.health_check_thread and self.health_check_thread.is_alive(),
                    'cleanup_active': self.cleanup_thread and self.cleanup_thread.is_alive()
                }
            }

    def _health_check_loop(self):
        """Background health check loop."""
        while self.running:
            try:
                time.sleep(self.config.health_check_interval)
                self._perform_health_checks()
            except Exception as e:
                self.logger.error(f"Health check error: {e}")

    def _perform_health_checks(self):
        """Perform health checks on connections."""
        with self.lock:
            unhealthy_connections = []

            # Check available connections
            temp_queue = Queue()
            while not self.available_connections.empty():
                try:
                    conn = self.available_connections.get_nowait()
                    if conn.is_healthy():
                        temp_queue.put(conn)
                    else:
                        unhealthy_connections.append(conn)
                except Empty:
                    break

            # Put healthy connections back
            while not temp_queue.empty():
                try:
                    self.available_connections.put_nowait(temp_queue.get_nowait())
                except Exception:
                    pass

            # Close unhealthy connections
            for conn in unhealthy_connections:
                conn.close()
                self.all_connections.discard(conn)
                self.metrics.connections_destroyed += 1

            if unhealthy_connections:
                self.logger.warning(f"Closed {len(unhealthy_connections)} unhealthy connections")

    def _cleanup_loop(self):
        """Background cleanup loop for idle connections."""
        while self.running:
            try:
                time.sleep(self.config.max_idle_time)

                current_time = time.time()
                with self.lock:
                    # Check for idle connections to close
                    temp_queue = Queue()
                    closed_count = 0

                    while not self.available_connections.empty():
                        try:
                            conn = self.available_connections.get_nowait()
                            if current_time - conn.last_used < self.config.max_idle_time:
                                # Still fresh, keep it
                                temp_queue.put(conn)
                            else:
                                # Too old, close it
                                conn.close()
                                self.all_connections.discard(conn)
                                self.metrics.connections_destroyed += 1
                                closed_count += 1
                        except Empty:
                            break

                    # Put remaining connections back
                    while not temp_queue.empty():
                        try:
                            self.available_connections.put_nowait(temp_queue.get_nowait())
                        except Exception:
                            pass

                    if closed_count > 0:
                        self.logger.info(f"Closed {closed_count} idle connections")

            except Exception as e:
                self.logger.error(f"Cleanup error: {e}")


# Global connection pool instance
_connection_pools: Dict[str, DatabaseConnectionPool] = {}


def get_database_pool(database_path: str, config: Optional[PoolConfiguration] = None) -> DatabaseConnectionPool:
    """
    Get or create a database connection pool for the given database.

    Args:
        database_path: Path to SQLite database file
        config: Optional pool configuration

    Returns:
        DatabaseConnectionPool instance
    """
    global _connection_pools

    if database_path not in _connection_pools:
        pool_config = config or PoolConfiguration(database_path=database_path)
        _connection_pools[database_path] = DatabaseConnectionPool(pool_config)
        _connection_pools[database_path].start()

    return _connection_pools[database_path]


def shutdown_all_pools():
    """Shutdown all active connection pools."""
    global _connection_pools

    for pool in _connection_pools.values():
        try:
            pool.stop()
        except Exception:
            pass

    _connection_pools.clear()