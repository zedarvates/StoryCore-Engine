"""
Unit tests for connection pool service
"""

import pytest
import time
import threading
from unittest.mock import Mock, patch
from datetime import datetime

from src.api.services.connection_pool import (
    ConnectionPool,
    ConnectionConfig,
    ConnectionStats,
    ConnectionState,
    BackendType,
    PooledConnection,
    ConnectionPoolManager,
    get_pool_manager
)


class MockConnection:
    """Mock connection for testing"""
    
    def __init__(self):
        self.connected = False
        self.healthy = True
        self.operations = []
    
    def connect(self):
        self.connected = True
    
    def disconnect(self):
        self.connected = False
    
    def is_healthy(self):
        return self.healthy and self.connected
    
    def execute(self, operation, **kwargs):
        self.operations.append((operation, kwargs))
        return {"result": "success"}


def test_connection_config_creation():
    """Test connection configuration creation"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=2,
        max_connections=10
    )
    
    assert config.backend_type == BackendType.COMFYUI
    assert config.host == "localhost"
    assert config.port == 8188
    assert config.min_connections == 2
    assert config.max_connections == 10
    assert config.connection_timeout == 30.0
    assert config.idle_timeout == 300.0


def test_pooled_connection_lifecycle():
    """Test pooled connection lifecycle"""
    mock_conn = MockConnection()
    mock_pool = Mock()
    
    pooled = PooledConnection(mock_conn, mock_pool)
    
    # Initial state
    assert pooled.state == ConnectionState.IDLE
    assert pooled.use_count == 0
    
    # Acquire
    conn = pooled.acquire()
    assert conn == mock_conn
    assert pooled.state == ConnectionState.ACTIVE
    assert pooled.use_count == 1
    
    # Release
    pooled.release()
    assert pooled.state == ConnectionState.IDLE
    
    # Close
    pooled.close()
    assert pooled.state == ConnectionState.CLOSED


def test_pooled_connection_error_handling():
    """Test pooled connection error handling"""
    mock_conn = MockConnection()
    mock_pool = Mock()
    
    pooled = PooledConnection(mock_conn, mock_pool)
    
    # Mark error
    pooled.mark_error()
    assert pooled.state == ConnectionState.ERROR
    assert pooled.error_count == 1


def test_pooled_connection_idle_timeout():
    """Test pooled connection idle timeout detection"""
    mock_conn = MockConnection()
    mock_pool = Mock()
    
    pooled = PooledConnection(mock_conn, mock_pool)
    
    # Not idle timeout immediately
    assert not pooled.is_idle_timeout(1.0)
    
    # Wait and check
    time.sleep(0.1)
    assert pooled.is_idle_timeout(0.05)


def test_connection_pool_initialization():
    """Test connection pool initialization"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=2,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Check initial state
    stats = pool.get_stats()
    assert stats.total_connections == 2
    assert stats.idle_connections == 2


def test_connection_pool_get_connection():
    """Test getting connection from pool"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=1,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Get connection
    with pool.get_connection() as conn:
        assert conn.connected
        assert isinstance(conn, MockConnection)
    
    # Check stats
    stats = pool.get_stats()
    assert stats.total_requests == 1
    assert stats.successful_requests == 1


def test_connection_pool_concurrent_access():
    """Test concurrent connection access"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=2,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    results = []
    errors = []
    
    def worker():
        try:
            with pool.get_connection() as conn:
                time.sleep(0.01)
                results.append(conn.execute("test"))
        except Exception as e:
            errors.append(e)
    
    # Start multiple threads
    threads = [threading.Thread(target=worker) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    
    # Check results
    assert len(results) == 10
    assert len(errors) == 0
    
    stats = pool.get_stats()
    assert stats.total_requests == 10
    assert stats.successful_requests == 10


def test_connection_pool_max_connections():
    """Test connection pool respects max connections"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=1,
        max_connections=2,
        connection_timeout=0.1,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Acquire all connections
    conn1 = pool.get_connection()
    conn1.__enter__()
    
    conn2 = pool.get_connection()
    conn2.__enter__()
    
    # Try to get third connection (should timeout)
    with pytest.raises(TimeoutError):
        with pool.get_connection(timeout=0.1):
            pass
    
    # Release connections
    conn1.__exit__(None, None, None)
    conn2.__exit__(None, None, None)


def test_connection_pool_unhealthy_connection():
    """Test pool handles unhealthy connections"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=1,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Get connection and mark as unhealthy
    with pool.get_connection() as conn:
        conn.healthy = False
    
    # Connection should be removed from pool
    stats = pool.get_stats()
    assert stats.total_connections == 0


def test_connection_pool_stats():
    """Test connection pool statistics"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=2,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Initial stats
    stats = pool.get_stats()
    assert stats.total_connections == 2
    assert stats.total_requests == 0
    
    # Use connection
    with pool.get_connection():
        pass
    
    # Updated stats
    stats = pool.get_stats()
    assert stats.total_requests == 1
    assert stats.successful_requests == 1
    assert stats.average_wait_time >= 0


def test_connection_pool_reset_stats():
    """Test resetting pool statistics"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=1,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Use connection
    with pool.get_connection():
        pass
    
    # Reset stats
    pool.reset_stats()
    
    stats = pool.get_stats()
    assert stats.total_requests == 0
    assert stats.successful_requests == 0


def test_connection_pool_shutdown():
    """Test connection pool shutdown"""
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=2,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    pool = ConnectionPool(config, factory)
    
    # Shutdown
    pool.shutdown()
    
    # Check all connections closed
    stats = pool.get_stats()
    assert stats.total_connections == 0


def test_connection_pool_manager():
    """Test connection pool manager"""
    manager = ConnectionPoolManager()
    
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        min_connections=1,
        max_connections=5,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    # Create pool
    pool = manager.create_pool("test-pool", config, factory)
    assert pool is not None
    
    # Get pool
    retrieved_pool = manager.get_pool("test-pool")
    assert retrieved_pool == pool
    
    # Get all stats
    all_stats = manager.get_all_stats()
    assert "test-pool" in all_stats
    
    # Remove pool
    manager.remove_pool("test-pool")
    
    with pytest.raises(KeyError):
        manager.get_pool("test-pool")


def test_connection_pool_manager_duplicate_pool():
    """Test manager prevents duplicate pool names"""
    manager = ConnectionPoolManager()
    
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    # Create pool
    manager.create_pool("test-pool", config, factory)
    
    # Try to create duplicate
    with pytest.raises(ValueError):
        manager.create_pool("test-pool", config, factory)
    
    # Cleanup
    manager.remove_pool("test-pool")


def test_connection_pool_manager_shutdown_all():
    """Test shutting down all pools"""
    manager = ConnectionPoolManager()
    
    config = ConnectionConfig(
        backend_type=BackendType.COMFYUI,
        host="localhost",
        port=8188,
        enable_health_check=False
    )
    
    def factory():
        return MockConnection()
    
    # Create multiple pools
    manager.create_pool("pool1", config, factory)
    manager.create_pool("pool2", config, factory)
    
    # Shutdown all
    manager.shutdown_all()
    
    # Check all pools removed
    all_stats = manager.get_all_stats()
    assert len(all_stats) == 0


def test_get_pool_manager_singleton():
    """Test global pool manager is singleton"""
    manager1 = get_pool_manager()
    manager2 = get_pool_manager()
    
    assert manager1 is manager2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
