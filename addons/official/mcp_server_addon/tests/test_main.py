"""
Tests for MCP Server Main Module
Tests unitaires pour le module principal de l'addon MCP Server.
"""

import asyncio
import json
import pytest
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, AsyncMock

from src.main import MCPServerAddon


class TestMCPServerAddon:
    """Tests pour la classe MCPServerAddon"""
    
    @pytest.fixture
    def mock_context(self):
        """Contexte de test simulé"""
        return {
            'addon_name': 'test_mcp_server',
            'permissions': ['network_access', 'file_system_read'],
            'metadata': {
                'server_config': {
                    'timeout': 10,
                    'max_connections': 5
                }
            }
        }
    
    @pytest.fixture
    def temp_dir(self):
        """Répertoire temporaire pour les tests"""
        with tempfile.TemporaryDirectory() as temp_dir:
            yield Path(temp_dir)
    
    @pytest.fixture
    def addon(self, mock_context, temp_dir):
        """Instance de l'addon pour les tests"""
        with patch('src.main.MCPClient'), \
             patch('src.main.MCPHandler'), \
             patch('src.main.MCPValidator'):
            
            addon = MCPServerAddon(mock_context)
            addon.config['resources']['base_path'] = str(temp_dir)
            return addon
    
    @pytest.mark.asyncio
    async def test_initialize_success(self, addon):
        """Test de l'initialisation réussie"""
        # Mock des dépendances
        addon.mcp_client = AsyncMock()
        addon.mcp_client.start = AsyncMock(return_value=True)
        addon.mcp_handler = AsyncMock()
        addon.validator = Mock()
        
        # Mock des méthodes
        addon._register_hooks = AsyncMock()
        addon._validate_permissions = AsyncMock()
        
        # Exécuter le test
        result = await addon.initialize()
        
        # Vérifier les résultats
        assert result is True
        addon._register_hooks.assert_called_once()
        addon._validate_permissions.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_initialize_failure(self, addon):
        """Test de l'échec de l'initialisation"""
        # Mock des dépendances qui échouent
        addon.mcp_client = AsyncMock()
        addon.mcp_client.start = AsyncMock(return_value=False)
        
        # Exécuter le test
        result = await addon.initialize()
        
        # Vérifier les résultats
        assert result is False
    
    @pytest.mark.asyncio
    async def test_start_success(self, addon):
        """Test du démarrage réussi"""
        # Mock des dépendances
        addon.is_running = False
        addon.mcp_client = AsyncMock()
        addon.mcp_client.start = AsyncMock(return_value=True)
        
        # Mock du hook manager
        addon.hook_manager = AsyncMock()
        addon.hook_manager.execute_hook = AsyncMock()
        
        # Exécuter le test
        result = await addon.start()
        
        # Vérifier les résultats
        assert result is True
        assert addon.is_running is True
        addon.hook_manager.execute_hook.assert_called_once_with('addon_enabled', addon.addon_name)
    
    @pytest.mark.asyncio
    async def test_start_already_running(self, addon):
        """Test du démarrage quand déjà en cours d'exécution"""
        addon.is_running = True
        
        # Exécuter le test
        result = await addon.start()
        
        # Vérifier les résultats
        assert result is True
    
    @pytest.mark.asyncio
    async def test_stop_success(self, addon):
        """Test de l'arrêt réussi"""
        # Mock des dépendances
        addon.is_running = True
        addon.mcp_client = AsyncMock()
        addon.mcp_client.stop = AsyncMock()
        
        # Mock du hook manager
        addon.hook_manager = AsyncMock()
        addon.hook_manager.execute_hook = AsyncMock()
        
        # Exécuter le test
        result = await addon.stop()
        
        # Vérifier les résultats
        assert result is True
        assert addon.is_running is False
        addon.hook_manager.execute_hook.assert_called_once_with('addon_disabled', addon.addon_name)
    
    @pytest.mark.asyncio
    async def test_stop_not_running(self, addon):
        """Test de l'arrêt quand pas en cours d'exécution"""
        addon.is_running = False
        
        # Exécuter le test
        result = await addon.stop()
        
        # Vérifier les résultats
        assert result is True
    
    @pytest.mark.asyncio
    async def test_process_message_valid(self, addon):
        """Test du traitement d'un message valide"""
        # Mock du handler
        addon.mcp_handler = AsyncMock()
        addon.mcp_handler.handle_message = AsyncMock(return_value='{"result": "success"}')
        
        # Mock du validateur
        addon.validator = Mock()
        addon.validator.validate_message = Mock(return_value=True)
        
        # Message de test
        message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
        
        # Exécuter le test
        result = await addon.process_message(message)
        
        # Vérifier les résultats
        assert 'success' in result
        addon.stats['messages_processed'] == 1
    
    @pytest.mark.asyncio
    async def test_process_message_invalid(self, addon):
        """Test du traitement d'un message invalide"""
        # Mock du validateur
        addon.validator = Mock()
        addon.validator.validate_message = Mock(return_value=False)
        
        # Message de test invalide
        message = '{"jsonrpc": "2.0", "method": "dangerous_exec", "id": "test"}'
        
        # Exécuter le test
        result = await addon.process_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Invalid Request' in result
        addon.stats['errors_count'] == 1
    
    @pytest.mark.asyncio
    async def test_process_message_exception(self, addon):
        """Test du traitement d'un message qui cause une exception"""
        # Mock du handler qui lève une exception
        addon.mcp_handler = AsyncMock()
        addon.mcp_handler.handle_message = AsyncMock(side_effect=Exception("Test error"))
        
        # Mock du validateur
        addon.validator = Mock()
        addon.validator.validate_message = Mock(return_value=True)
        
        # Message de test
        message = '{"jsonrpc": "2.0", "method": "test", "id": "test"}'
        
        # Exécuter le test
        result = await addon.process_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Internal Error' in result
        addon.stats['errors_count'] == 1
    
    def test_load_config_default(self, addon):
        """Test du chargement de la configuration par défaut"""
        config = addon._load_config()
        
        # Vérifier les valeurs par défaut
        assert config['server']['host'] == 'localhost'
        assert config['server']['port'] == 8080
        assert config['server']['max_connections'] == 10
        assert config['server']['timeout'] == 30
        assert config['security']['enable_ssl'] is False
        assert config['logging']['level'] == 'INFO'
    
    def test_load_config_with_metadata(self, addon, mock_context):
        """Test du chargement de la configuration avec métadonnées"""
        addon.context = mock_context
        
        config = addon._load_config()
        
        # Vérifier que les métadonnées sont appliquées
        assert config['server']['timeout'] == 10
        assert config['server']['max_connections'] == 5
    
    @pytest.mark.asyncio
    async def test_register_hooks(self, addon):
        """Test de l'enregistrement des hooks"""
        # Mock du hook manager
        addon.hook_manager = Mock()
        addon.hook_manager.register_hook = AsyncMock()
        
        # Exécuter le test
        await addon._register_hooks()
        
        # Vérifier que les hooks sont enregistrés
        assert addon.hook_manager.register_hook.call_count == 3
    
    @pytest.mark.asyncio
    async def test_validate_permissions(self, addon):
        """Test de la validation des permissions"""
        # Mock du permission manager
        addon.permission_manager = Mock()
        addon.permission_manager.check_permission = AsyncMock(return_value=True)
        
        # Exécuter le test
        await addon._validate_permissions()
        
        # Vérifier que les permissions sont validées
        assert addon.permission_manager.check_permission.call_count == 4
    
    @pytest.mark.asyncio
    async def test_cleanup(self, addon):
        """Test du nettoyage"""
        # Mock des dépendances
        addon.is_running = True
        addon.mcp_client = AsyncMock()
        addon.mcp_client.stop = AsyncMock()
        addon.mcp_client.cleanup = AsyncMock()
        
        # Mock du hook manager
        addon.hook_manager = Mock()
        addon.hook_manager.unregister_all_addon_hooks = Mock()
        
        # Exécuter le test
        await addon.cleanup()
        
        # Vérifier que le nettoyage est effectué
        addon.mcp_client.stop.assert_called_once()
        addon.mcp_client.cleanup.assert_called_once()
        addon.hook_manager.unregister_all_addon_hooks.assert_called_once_with(addon.addon_name)
    
    def test_get_status(self, addon):
        """Test de la récupération du statut"""
        # Mock du client MCP
        addon.mcp_client = Mock()
        addon.mcp_client.get_connections_count = Mock(return_value=3)
        
        # Exécuter le test
        status = addon.get_status()
        
        # Vérifier les résultats
        assert 'running' in status
        assert 'stats' in status
        assert 'config' in status
        assert 'active_connections' in status
        assert status['active_connections'] == 3


class TestMCPServerAddonIntegration:
    """Tests d'intégration pour l'addon MCP Server"""
    
    @pytest.mark.asyncio
    async def test_full_lifecycle(self):
        """Test du cycle de vie complet de l'addon"""
        # Créer un contexte de test
        context = {
            'addon_name': 'integration_test',
            'permissions': ['network_access', 'file_system_read']
        }
        
        # Créer l'addon
        with patch('src.main.MCPClient'), \
             patch('src.main.MCPHandler'), \
             patch('src.main.MCPValidator'):
            
            addon = MCPServerAddon(context)
            
            # Mock des dépendances
            addon.mcp_client = AsyncMock()
            addon.mcp_client.start = AsyncMock(return_value=True)
            addon.mcp_client.stop = AsyncMock()
            addon.mcp_client.cleanup = AsyncMock()
            addon.mcp_client.get_connections_count = Mock(return_value=0)
            
            addon.mcp_handler = AsyncMock()
            addon.validator = Mock()
            
            addon.hook_manager = AsyncMock()
            addon.hook_manager.register_hook = AsyncMock()
            addon.hook_manager.execute_hook = AsyncMock()
            addon.hook_manager.unregister_all_addon_hooks = Mock()
            
            addon.permission_manager = Mock()
            addon.permission_manager.check_permission = AsyncMock(return_value=True)
            
            # Tester le cycle de vie
            # 1. Initialisation
            init_result = await addon.initialize()
            assert init_result is True
            
            # 2. Démarrage
            start_result = await addon.start()
            assert start_result is True
            assert addon.is_running is True
            
            # 3. Traitement d'un message
            addon.mcp_handler.handle_message = AsyncMock(return_value='{"result": "ok"}')
            addon.validator.validate_message = Mock(return_value=True)
            
            message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
            response = await addon.process_message(message)
            assert 'ok' in response
            
            # 4. Statut
            status = addon.get_status()
            assert status['running'] is True
            assert status['stats']['messages_processed'] == 1
            
            # 5. Arrêt
            stop_result = await addon.stop()
            assert stop_result is True
            assert addon.is_running is False
            
            # 6. Nettoyage
            await addon.cleanup()
            
            # Vérifier que toutes les méthodes ont été appelées
            addon.hook_manager.unregister_all_addon_hooks.assert_called_once()


if __name__ == '__main__':
    pytest.main([__file__, '-v'])