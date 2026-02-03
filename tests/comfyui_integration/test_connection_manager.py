"""
Unit tests for ComfyUIConnectionManager.

Tests connection management, health checks, authentication, and error handling.
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
import aiohttp

from src.comfyui_test_framework.connection_manager import (
    ComfyUIConnectionManager,
    ConnectionError,
    AuthenticationError,
    TimeoutError,
)


class TestComfyUIConnectionManager:
    """Test ComfyUIConnectionManager functionality."""
    
    @pytest.fixture
    def base_url(self):
        """Test ComfyUI URL."""
        return "http://localhost:8188"
    
    @pytest.fixture
    def manager(self, base_url):
        """Create ConnectionManager instance."""
        return ComfyUIConnectionManager(base_url=base_url, timeout=10)
    
    @pytest.fixture
    def manager_with_auth(self, base_url):
        """Create ConnectionManager with authentication."""
        auth = {"username": "testuser", "password": "testpass"}
        return ComfyUIConnectionManager(base_url=base_url, timeout=10, auth=auth)
    
    def test_initialization(self, manager, base_url):
        """Test ConnectionManager initialization."""
        assert manager.base_url == base_url
        assert manager.timeout == 10
        assert manager.auth is None
        assert manager.session is None
    
    def test_initialization_with_auth(self, manager_with_auth, base_url):
        """Test ConnectionManager initialization with authentication."""
        assert manager_with_auth.base_url == base_url
        assert manager_with_auth.auth == {"username": "testuser", "password": "testpass"}
    
    def test_base_url_trailing_slash_removed(self):
        """Test that trailing slash is removed from base_url."""
        manager = ComfyUIConnectionManager(base_url="http://localhost:8188/", timeout=10)
        assert manager.base_url == "http://localhost:8188"
    
    @pytest.mark.asyncio
    async def test_connect_success(self, manager):
        """Test successful connection."""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"system": "stats"})
        
        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        ))
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            result = await manager.connect()
            assert result is True
            assert manager.session is not None
    
    @pytest.mark.asyncio
    async def test_connect_server_unreachable(self, manager):
        """Test connection when server is unreachable."""
        mock_session = AsyncMock()
        mock_session.get = MagicMock(side_effect=aiohttp.ClientConnectorError(
            connection_key=None,
            os_error=OSError("Connection refused")
        ))
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            with pytest.raises(ConnectionError) as exc_info:
                await manager.connect()
            
            assert "Cannot connect to ComfyUI" in str(exc_info.value)
            assert "Please ensure ComfyUI is running" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_connect_authentication_failure(self, manager_with_auth):
        """Test connection with authentication failure."""
        # Create a mock response with 401 status
        mock_response = MagicMock()
        mock_response.status = 401
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        
        # Create a mock session
        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_response)
        mock_session.close = AsyncMock()
        
        # Patch ClientSession to return our mock
        with patch('aiohttp.ClientSession') as mock_client_session:
            mock_client_session.return_value = mock_session
            
            with pytest.raises(AuthenticationError) as exc_info:
                await manager_with_auth.connect()
            
            assert "Authentication failed" in str(exc_info.value)
            assert "check your credentials" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_connect_timeout(self, manager):
        """Test connection timeout."""
        mock_session = AsyncMock()
        mock_session.get = MagicMock(side_effect=asyncio.TimeoutError())
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            with pytest.raises(TimeoutError) as exc_info:
                await manager.connect()
            
            assert "timed out" in str(exc_info.value)
            assert "10 seconds" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_check_health_success(self, manager):
        """Test successful health check."""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            "system": {"version": "1.0.0", "queue": 0}
        })
        
        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        ))
        
        manager.session = mock_session
        
        result = await manager.check_health()
        assert result == {"system": {"version": "1.0.0", "queue": 0}}
    
    @pytest.mark.asyncio
    async def test_get_request_success(self, manager):
        """Test successful GET request."""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"data": "test"})
        
        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        ))
        
        manager.session = mock_session
        
        result = await manager.get("/test")
        assert result == {"data": "test"}
    
    @pytest.mark.asyncio
    async def test_get_request_404(self, manager):
        """Test GET request with 404 error."""
        # Create a mock response with 404 status
        mock_response = MagicMock()
        mock_response.status = 404
        mock_response.__aenter__ = AsyncMock(return_value=mock_response)
        mock_response.__aexit__ = AsyncMock(return_value=None)
        
        # Create a mock session
        mock_session = MagicMock()
        mock_session.get = MagicMock(return_value=mock_response)
        
        manager.session = mock_session
        
        with pytest.raises(ConnectionError) as exc_info:
            await manager.get("/nonexistent")
        
        assert "Endpoint not found" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_post_request_success(self, manager):
        """Test successful POST request."""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"prompt_id": "12345"})
        
        mock_session = AsyncMock()
        mock_session.post = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        ))
        
        manager.session = mock_session
        
        result = await manager.post("/prompt", {"workflow": "test"})
        assert result == {"prompt_id": "12345"}
    
    @pytest.mark.asyncio
    async def test_post_request_timeout(self, manager):
        """Test POST request timeout."""
        mock_session = AsyncMock()
        mock_session.post = MagicMock(side_effect=asyncio.TimeoutError())
        
        manager.session = mock_session
        
        with pytest.raises(TimeoutError) as exc_info:
            await manager.post("/prompt", {"workflow": "test"})
        
        assert "timed out" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_close_cleanup(self, manager):
        """Test close method cleans up resources."""
        mock_session = AsyncMock()
        manager.session = mock_session
        
        await manager.close()
        
        mock_session.close.assert_called_once()
        assert manager.session is None
    
    @pytest.mark.asyncio
    async def test_context_manager(self, manager):
        """Test async context manager usage."""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"system": "stats"})
        
        mock_session = AsyncMock()
        mock_session.get = MagicMock(return_value=AsyncMock(
            __aenter__=AsyncMock(return_value=mock_response),
            __aexit__=AsyncMock()
        ))
        mock_session.close = AsyncMock()
        
        with patch('aiohttp.ClientSession', return_value=mock_session):
            async with manager as conn:
                assert conn is manager
                assert manager.session is not None
            
            # Verify close was called
            mock_session.close.assert_called_once()
            assert manager.session is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
