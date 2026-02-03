"""
Integration tests for connection pool with real backend services
"""

import pytest
import time
from unittest.mock import Mock, patch

from src.api.services.connection_pool import (
    ConnectionConfig,
    BackendType,
    get_pool_manager
)
from src.api.services.comfyui_connection import (
    ComfyUIConnection,
    ComfyUIConfig,
    create_comfyui_pool,
    get_comfyui_pool
)
from src.api.services.llm_connection import (
    LLMConnection,
    LLMConfig,
    LLMProvider,
    create_llm_pool,
    get_llm_pool
)


@pytest.fixture
def mock_comfyui_server():
    """Mock ComfyUI server responses"""
    with patch('requests.Session') as mock_session:
        mock_instance = Mock()
        mock_session.return_value = mock_instance
        
        # Mock system_stats endpoint
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "system": {"ram_total": 16000, "ram_used": 8000}
        }
        mock_instance.get.return_value = mock_response
        mock_instance.post.return_value = mock_response
        
        yield mock_instance


@pytest.fixture
def mock_llm_server():
    """Mock LLM server responses"""
    with patch('requests.Session') as mock_session:
        mock_instance = Mock()
        mock_session.return_value = mock_instance
        
        # Mock models endpoint
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": [{"id": "gpt-4"}, {"id": "gpt-3.5-turbo"}]
        }
        mock_instance.get.return_value = mock_response
        
        # Mock completions endpoint
        mock_completion = Mock()
        mock_completion.status_code = 200
        mock_completion.json.return_value = {
            "choices": [{"text": "Generated text"}]
        }
        mock_instance.post.return_value = mock_completion
        
        yield mock_instance


def test_comfyui_connection_lifecycle(mock_comfyui_server):
    """Test ComfyUI connection lifecycle"""
    config = ComfyUIConfig(host="localhost", port=8188)
    conn = ComfyUIConnection(config)
    
    # Connect
    conn.connect()
    assert conn._connected
    
    # Health check
    assert conn.is_healthy()
    
    # Execute operation
    result = conn.execute("get_system_stats")
    assert result is not None
    
    # Disconnect
    conn.disconnect()
    assert not conn._connected


def test_comfyui_connection_operations(mock_comfyui_server):
    """Test ComfyUI connection operations"""
    config = ComfyUIConfig(host="localhost", port=8188)
    conn = ComfyUIConnection(config)
    conn.connect()
    
    # Queue prompt
    workflow = {"nodes": []}
    result = conn.execute("queue_prompt", workflow=workflow, client_id="test")
    assert result is not None
    
    # Get queue
    result = conn.execute("get_queue")
    assert result is not None
    
    # Interrupt
    result = conn.execute("interrupt")
    assert result is not None
    
    conn.disconnect()


def test_comfyui_pool_creation(mock_comfyui_server):
    """Test ComfyUI connection pool creation"""
    config = ComfyUIConfig(host="localhost", port=8188)
    
    pool = create_comfyui_pool(
        name="test-comfyui",
        comfyui_config=config,
        min_connections=1,
        max_connections=3
    )
    
    assert pool is not None
    
    stats = pool.get_stats()
    assert stats.total_connections == 1
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-comfyui")


def test_comfyui_pool_usage(mock_comfyui_server):
    """Test using ComfyUI connection pool"""
    config = ComfyUIConfig(host="localhost", port=8188)
    
    pool = create_comfyui_pool(
        name="test-comfyui-usage",
        comfyui_config=config,
        min_connections=1,
        max_connections=3
    )
    
    # Use connection from pool
    with pool.get_connection() as conn:
        result = conn.execute("get_system_stats")
        assert result is not None
    
    # Check stats
    stats = pool.get_stats()
    assert stats.total_requests == 1
    assert stats.successful_requests == 1
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-comfyui-usage")


def test_comfyui_pool_concurrent_requests(mock_comfyui_server):
    """Test concurrent requests to ComfyUI pool"""
    import threading
    
    config = ComfyUIConfig(host="localhost", port=8188)
    
    pool = create_comfyui_pool(
        name="test-comfyui-concurrent",
        comfyui_config=config,
        min_connections=2,
        max_connections=5
    )
    
    results = []
    errors = []
    
    def worker():
        try:
            with pool.get_connection() as conn:
                result = conn.execute("get_system_stats")
                results.append(result)
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
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-comfyui-concurrent")


def test_llm_connection_lifecycle(mock_llm_server):
    """Test LLM connection lifecycle"""
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key="test-key",
        model="gpt-4"
    )
    conn = LLMConnection(config)
    
    # Connect
    conn.connect()
    assert conn._connected
    
    # Health check
    assert conn.is_healthy()
    
    # Execute operation
    result = conn.execute("list_models")
    assert result is not None
    
    # Disconnect
    conn.disconnect()
    assert not conn._connected


def test_llm_connection_operations(mock_llm_server):
    """Test LLM connection operations"""
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key="test-key",
        model="gpt-4"
    )
    conn = LLMConnection(config)
    conn.connect()
    
    # Complete
    result = conn.execute("complete", prompt="Test prompt")
    assert result is not None
    
    # Chat
    messages = [{"role": "user", "content": "Hello"}]
    result = conn.execute("chat", messages=messages)
    assert result is not None
    
    # List models
    result = conn.execute("list_models")
    assert result is not None
    
    conn.disconnect()


def test_llm_pool_creation(mock_llm_server):
    """Test LLM connection pool creation"""
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key="test-key",
        model="gpt-4"
    )
    
    pool = create_llm_pool(
        name="test-llm",
        llm_config=config,
        min_connections=1,
        max_connections=5
    )
    
    assert pool is not None
    
    stats = pool.get_stats()
    assert stats.total_connections == 1
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-llm")


def test_llm_pool_usage(mock_llm_server):
    """Test using LLM connection pool"""
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key="test-key",
        model="gpt-4"
    )
    
    pool = create_llm_pool(
        name="test-llm-usage",
        llm_config=config,
        min_connections=1,
        max_connections=5
    )
    
    # Use connection from pool
    with pool.get_connection() as conn:
        result = conn.execute("complete", prompt="Test prompt")
        assert result is not None
    
    # Check stats
    stats = pool.get_stats()
    assert stats.total_requests == 1
    assert stats.successful_requests == 1
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-llm-usage")


def test_llm_pool_concurrent_requests(mock_llm_server):
    """Test concurrent requests to LLM pool"""
    import threading
    
    config = LLMConfig(
        provider=LLMProvider.OPENAI,
        api_key="test-key",
        model="gpt-4"
    )
    
    pool = create_llm_pool(
        name="test-llm-concurrent",
        llm_config=config,
        min_connections=2,
        max_connections=5
    )
    
    results = []
    errors = []
    
    def worker():
        try:
            with pool.get_connection() as conn:
                result = conn.execute("complete", prompt="Test prompt")
                results.append(result)
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
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-llm-concurrent")


def test_multiple_pools_coexist(mock_comfyui_server, mock_llm_server):
    """Test multiple connection pools can coexist"""
    comfyui_config = ComfyUIConfig(host="localhost", port=8188)
    llm_config = LLMConfig(provider=LLMProvider.OPENAI, api_key="test-key")
    
    # Create both pools
    comfyui_pool = create_comfyui_pool(
        name="test-comfyui-multi",
        comfyui_config=comfyui_config,
        min_connections=1,
        max_connections=3
    )
    
    llm_pool = create_llm_pool(
        name="test-llm-multi",
        llm_config=llm_config,
        min_connections=1,
        max_connections=3
    )
    
    # Use both pools
    with comfyui_pool.get_connection() as conn:
        result = conn.execute("get_system_stats")
        assert result is not None
    
    with llm_pool.get_connection() as conn:
        result = conn.execute("list_models")
        assert result is not None
    
    # Check stats
    manager = get_pool_manager()
    all_stats = manager.get_all_stats()
    assert "test-comfyui-multi" in all_stats
    assert "test-llm-multi" in all_stats
    
    # Cleanup
    comfyui_pool.shutdown()
    llm_pool.shutdown()
    manager.remove_pool("test-comfyui-multi")
    manager.remove_pool("test-llm-multi")


def test_pool_recovery_after_connection_failure(mock_comfyui_server):
    """Test pool recovers after connection failures"""
    config = ComfyUIConfig(host="localhost", port=8188)
    
    pool = create_comfyui_pool(
        name="test-comfyui-recovery",
        comfyui_config=config,
        min_connections=1,
        max_connections=3
    )
    
    # Simulate connection failure
    with pool.get_connection() as conn:
        conn._connected = False
        conn.healthy = False
    
    # Pool should create new connection
    with pool.get_connection() as conn:
        assert conn._connected
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-comfyui-recovery")


def test_pool_statistics_accuracy(mock_comfyui_server):
    """Test connection pool statistics are accurate"""
    config = ComfyUIConfig(host="localhost", port=8188)
    
    pool = create_comfyui_pool(
        name="test-comfyui-stats",
        comfyui_config=config,
        min_connections=2,
        max_connections=5
    )
    
    # Initial stats
    stats = pool.get_stats()
    assert stats.total_connections == 2
    assert stats.total_requests == 0
    
    # Make requests
    for _ in range(5):
        with pool.get_connection() as conn:
            conn.execute("get_system_stats")
    
    # Check updated stats
    stats = pool.get_stats()
    assert stats.total_requests == 5
    assert stats.successful_requests == 5
    assert stats.average_wait_time >= 0
    
    # Cleanup
    pool.shutdown()
    manager = get_pool_manager()
    manager.remove_pool("test-comfyui-stats")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
