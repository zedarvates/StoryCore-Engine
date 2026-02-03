"""
Tests for ConnectionManager class.

Validates connection management, health checking, and fallback behavior.
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from src.end_to_end.connection_manager import ConnectionManager, ComfyUIConfig
from src.end_to_end.data_models import ComfyUIStatus


class TestComfyUIConfig:
    """Test ComfyUIConfig validation"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = ComfyUIConfig()
        
        assert config.host == "localhost"
        assert config.port == 8000
        assert config.timeout == 30
        assert config.max_retries == 3
        assert config.url == "http://localhost:8000"
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = ComfyUIConfig(
            host="192.168.1.100",
            port=8188,
            timeout=60
        )
        
        assert config.host == "192.168.1.100"
        assert config.port == 8188
        assert config.url == "http://192.168.1.100:8188"
    
    def test_config_validation_valid(self):
        """Test validation with valid config"""
        config = ComfyUIConfig()
        errors = config.validate()
        
        assert len(errors) == 0
    
    def test_config_validation_invalid_port(self):
        """Test validation with invalid port"""
        config = ComfyUIConfig(port=70000)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("port" in err.lower() for err in errors)
    
    def test_config_validation_invalid_timeout(self):
        """Test validation with invalid timeout"""
        config = ComfyUIConfig(timeout=-5)
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("timeout" in err.lower() for err in errors)
    
    def test_config_validation_invalid_fallback_mode(self):
        """Test validation with invalid fallback mode"""
        config = ComfyUIConfig(fallback_mode="invalid")
        errors = config.validate()
        
        assert len(errors) > 0
        assert any("fallback_mode" in err.lower() for err in errors)


class TestConnectionManager:
    """Test ConnectionManager functionality"""
    
    @pytest.fixture
    def config(self):
        """Create test configuration"""
        return ComfyUIConfig(timeout=5)
    
    @pytest.fixture
    def manager(self, config):
        """Create ConnectionManager instance"""
        return ConnectionManager(config)
    
    def test_initialization(self, manager, config):
        """Test ConnectionManager initialization"""
        assert manager.config == config
        assert not manager.status.available
        assert manager.status.url == config.url
    
    @pytest.mark.asyncio
    async def test_connect_success(self, manager):
        """Test successful connection"""
        # Mock successful response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'system': {
                'version': '1.0.0',
                'queue_remaining': 0
            }
        })
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value = mock_response
            
            status = await manager.connect()
            
            assert status.available
            assert status.version == '1.0.0'
            assert status.queue_size == 0
    
    @pytest.mark.asyncio
    async def test_connect_timeout(self, manager):
        """Test connection timeout"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = asyncio.TimeoutError()
            
            status = await manager.connect()
            
            assert not status.available
            assert "timeout" in status.error_message.lower()
    
    @pytest.mark.asyncio
    async def test_connect_http_error(self, manager):
        """Test connection with HTTP error"""
        mock_response = AsyncMock()
        mock_response.status = 500
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value = mock_response
            
            status = await manager.connect()
            
            assert not status.available
            assert "500" in status.error_message
    
    @pytest.mark.asyncio
    async def test_check_health_success(self, manager):
        """Test health check with available backend"""
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={
            'system': {
                'version': '1.0.0',
                'queue_remaining': 2
            }
        })
        
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.return_value.__aenter__.return_value = mock_response
            
            status = await manager.check_health()
            
            assert status.available
            assert status.queue_size == 2
    
    @pytest.mark.asyncio
    async def test_check_health_failure(self, manager):
        """Test health check with unavailable backend"""
        with patch('aiohttp.ClientSession.get') as mock_get:
            mock_get.side_effect = asyncio.TimeoutError()
            
            status = await manager.check_health()
            
            assert not status.available
    
    def test_status_callback_registration(self, manager):
        """Test status callback registration"""
        callback = Mock()
        
        manager.register_status_callback(callback)
        
        # Trigger status change
        manager._notify_status_change(manager.status)
        
        callback.assert_called_once_with(manager.status)
    
    def test_status_callback_unregistration(self, manager):
        """Test status callback unregistration"""
        callback = Mock()
        
        manager.register_status_callback(callback)
        manager.unregister_status_callback(callback)
        
        # Trigger status change
        manager._notify_status_change(manager.status)
        
        callback.assert_not_called()
    
    def test_get_status(self, manager):
        """Test get_status method"""
        status = manager.get_status()
        
        assert isinstance(status, ComfyUIStatus)
        assert status.url == manager.config.url
    
    def test_should_use_fallback_when_unavailable(self, manager):
        """Test fallback check when backend unavailable"""
        manager.status.available = False
        
        assert manager.should_use_fallback()
    
    def test_should_not_use_fallback_when_available(self, manager):
        """Test fallback check when backend available"""
        manager.status.available = True
        
        assert not manager.should_use_fallback()
    
    def test_get_fallback_mode(self, manager):
        """Test get_fallback_mode method"""
        mode = manager.get_fallback_mode()
        
        assert mode == manager.config.fallback_mode
    
    def test_trigger_fallback_warning(self, manager):
        """Test fallback warning generation"""
        manager.status.error_message = "Connection refused"
        
        warning = manager.trigger_fallback_warning()
        
        assert "unavailable" in warning.lower()
        assert "connection refused" in warning.lower()
        assert manager.config.fallback_mode in warning.lower()
    
    @pytest.mark.asyncio
    async def test_disconnect_cleanup(self, manager):
        """Test disconnect cleans up resources"""
        # Start monitoring
        await manager.start_health_monitoring(interval=1)
        
        # Disconnect
        await manager.disconnect()
        
        assert not manager._is_monitoring
        assert manager._health_check_task is None or manager._health_check_task.done()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
