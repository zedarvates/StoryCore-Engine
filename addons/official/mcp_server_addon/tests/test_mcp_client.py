"""
Tests for MCP Client Module
Tests unitaires pour le module client MCP.
"""

import asyncio
import json
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from src.mcp_client import (
    MCPClient, MCPRequest, MCPResponse, MCPNotification,
    MCPMethod
)


class TestMCPClient:
    """Tests pour la classe MCPClient"""
    
    @pytest.fixture
    def mock_logger(self):
        """Logger de test simulé"""
        return Mock()
    
    @pytest.fixture
    def server_config(self):
        """Configuration de serveur de test"""
        return {
            "host": "localhost",
            "port": 8080,
            "timeout": 30,
            "max_connections": 10,
            "security": {
                "enable_ssl": False,
                "rate_limit": {"enabled": True, "requests_per_minute": 60}
            }
        }
    
    @pytest.fixture
    def client(self, server_config, mock_logger):
        """Client MCP pour les tests"""
        return MCPClient(server_config, mock_logger)
    
    @pytest.mark.asyncio
    async def test_start_success(self, client):
        """Test du démarrage réussi du client"""
        # Mock de l'initialisation stdio
        with patch.object(client, '_initialize_stdio', AsyncMock()), \
             patch.object(client, '_message_loop', AsyncMock()) as mock_loop:
            
            # Exécuter le test
            result = await client.start()
            
            # Vérifier les résultats
            assert result is True
            assert client.is_connected is True
            mock_loop.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_start_failure(self, client):
        """Test de l'échec du démarrage du client"""
        # Mock de l'initialisation stdio qui échoue
        with patch.object(client, '_initialize_stdio', AsyncMock(side_effect=Exception("Test error"))):
            
            # Exécuter le test
            result = await client.start()
            
            # Vérifier les résultats
            assert result is False
            assert client.is_connected is False
    
    @pytest.mark.asyncio
    async def test_stop_success(self, client):
        """Test de l'arrêt réussi du client"""
        # Préparer le client
        client.is_connected = True
        client.pending_requests = {"test": Mock()}
        
        with patch.object(client, '_cleanup_stdio', AsyncMock()):
            
            # Exécuter le test
            result = await client.stop()
            
            # Vérifier les résultats
            assert result is True
            assert client.is_connected is False
            assert len(client.pending_requests) == 0
    
    @pytest.mark.asyncio
    async def test_stop_not_connected(self, client):
        """Test de l'arrêt quand le client n'est pas connecté"""
        client.is_connected = False
        
        # Exécuter le test
        result = await client.stop()
        
        # Vérifier les résultats
        assert result is True
    
    @pytest.mark.asyncio
    async def test_send_request_success(self, client):
        """Test de l'envoi réussi d'une requête"""
        # Préparer le client
        client.is_connected = True
        client._send_message = AsyncMock()
        
        # Mock de la réponse
        mock_future = Mock()
        mock_future.done.return_value = False
        mock_future.set_result = Mock()
        client.pending_requests = {"test_id": mock_future}
        
        # Exécuter le test
        result = await client.send_request("test_method", {"param": "value"})
        
        # Vérifier les résultats
        assert result is None  # Le résultat est dans le future
        client._send_message.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_request_not_connected(self, client):
        """Test de l'envoi d'une requête quand non connecté"""
        client.is_connected = False
        
        # Exécuter le test
        with pytest.raises(RuntimeError, match="Le client MCP n'est pas connecté"):
            await client.send_request("test_method")
    
    @pytest.mark.asyncio
    async def test_send_notification(self, client):
        """Test de l'envoi d'une notification"""
        # Préparer le client
        client.is_connected = True
        client._send_message = AsyncMock()
        
        # Exécuter le test
        await client.send_notification("test_notification", {"param": "value"})
        
        # Vérifier les résultats
        client._send_message.assert_called_once()
        assert client.stats['notifications_sent'] == 1
    
    @pytest.mark.asyncio
    async def test_send_notification_not_connected(self, client):
        """Test de l'envoi d'une notification quand non connecté"""
        client.is_connected = False
        
        # Exécuter le test
        with pytest.raises(RuntimeError, match="Le client MCP n'est pas connecté"):
            await client.send_notification("test_notification")
    
    def test_register_handler(self, client):
        """Test de l'enregistrement d'un handler"""
        mock_handler = Mock()
        
        # Exécuter le test
        client.register_handler("test_method", mock_handler)
        
        # Vérifier les résultats
        assert "test_method" in client.message_handlers
        assert client.message_handlers["test_method"] == mock_handler
    
    def test_unregister_handler(self, client):
        """Test du désenregistrement d'un handler"""
        # Préparer le client
        mock_handler = Mock()
        client.message_handlers = {"test_method": mock_handler}
        
        # Exécuter le test
        client.unregister_handler("test_method")
        
        # Vérifier les résultats
        assert "test_method" not in client.message_handlers
    
    def test_get_connections_count(self, client):
        """Test de la récupération du nombre de connexions"""
        # Préparer le client
        client.active_connections = [{"id": 1}, {"id": 2}]
        
        # Exécuter le test
        count = client.get_connections_count()
        
        # Vérifier les résultats
        assert count == 2
    
    @pytest.mark.asyncio
    async def test_cleanup(self, client):
        """Test du nettoyage du client"""
        # Préparer le client
        client.is_connected = True
        client.message_handlers = {"test": Mock()}
        client.active_connections = [{"id": 1}]
        
        with patch.object(client, 'stop', AsyncMock(return_value=True)):
            
            # Exécuter le test
            await client.cleanup()
            
            # Vérifier les résultats
            client.stop.assert_called_once()
            assert len(client.message_handlers) == 0
            assert len(client.active_connections) == 0
    
    # Tests des méthodes privées
    
    @pytest.mark.asyncio
    async def test_initialize_stdio_success(self, client):
        """Test de l'initialisation stdio réussie"""
        with patch('sys.stdin', Mock()), \
             patch('sys.stdout', Mock()):
            
            # Exécuter le test
            await client._initialize_stdio()
            
            # Aucune exception ne devrait être levée
            assert True
    
    @pytest.mark.asyncio
    async def test_initialize_stdio_failure(self, client):
        """Test de l'échec de l'initialisation stdio"""
        with patch('sys.stdin', None):
            
            # Exécuter le test
            with pytest.raises(RuntimeError, match="Stdio non disponible"):
                await client._initialize_stdio()
    
    @pytest.mark.asyncio
    async def test_read_message_success(self, client):
        """Test de la lecture réussie d'un message"""
        # Mock de stdin
        mock_stdin = Mock()
        mock_stdin.readline.return_value = '{"test": "message"}\\n'
        
        with patch('sys.stdin', mock_stdin), \
             patch('asyncio.get_event_loop', Mock(return_value=Mock(run_in_executor=Mock(return_value='{"test": "message"}'))):
            
            # Exécuter le test
            message = await client._read_message()
            
            # Vérifier les résultats
            assert message == '{"test": "message"}'
    
    @pytest.mark.asyncio
    async def test_read_message_empty(self, client):
        """Test de la lecture d'un message vide"""
        # Mock de stdin qui retourne une ligne vide
        mock_stdin = Mock()
        mock_stdin.readline.return_value = '\\n'
        
        with patch('sys.stdin', mock_stdin), \
             patch('asyncio.get_event_loop', Mock(return_value=Mock(run_in_executor=Mock(return_value=''))):
            
            # Exécuter le test
            message = await client._read_message()
            
            # Vérifier les résultats
            assert message is None
    
    @pytest.mark.asyncio
    async def test_send_message_success(self, client):
        """Test de l'envoi réussi d'un message"""
        # Mock de stdout
        mock_stdout = Mock()
        
        with patch('sys.stdout', mock_stdout), \
             patch('asyncio.get_event_loop', Mock(return_value=Mock(run_in_executor=Mock()))):
            
            # Message de test
            message = {"jsonrpc": "2.0", "method": "test", "id": "test"}
            
            # Exécuter le test
            await client._send_message(message)
            
            # Vérifier les résultats
            assert client.stats['requests_sent'] == 1
    
    @pytest.mark.asyncio
    async def test_process_message_valid(self, client):
        """Test du traitement d'un message valide"""
        # Mock de l'exécution de méthode
        client._execute_method = AsyncMock(return_value={"result": "success"})
        
        # Message de test
        message_str = '{"jsonrpc": "2.0", "method": "test", "id": "test"}'
        
        # Exécuter le test
        await client._process_message(message_str)
        
        # Vérifier que la méthode a été exécutée
        client._execute_method.assert_called_once_with("test", {})
    
    @pytest.mark.asyncio
    async def test_process_message_invalid_json(self, client):
        """Test du traitement d'un message JSON invalide"""
        # Message JSON invalide
        message_str = '{"jsonrpc": "2.0", "method": "test", "id": "test"'
        
        # Exécuter le test
        await client._process_message(message_str)
        
        # Vérifier que l'erreur est comptée
        assert client.stats['errors_count'] == 1
    
    @pytest.mark.asyncio
    async def test_handle_request_success(self, client):
        """Test du traitement réussi d'une requête"""
        # Mock du handler
        mock_handler = AsyncMock(return_value={"result": "success"})
        client.handlers = {"test_method": mock_handler}
        
        # Données de requête
        request_data = {
            "jsonrpc": "2.0",
            "method": "test_method",
            "params": {"param": "value"},
            "id": "test_id"
        }
        
        # Exécuter le test
        await client._handle_request(request_data)
        
        # Vérifier que le handler a été appelé
        mock_handler.assert_called_once_with({"param": "value"})
    
    @pytest.mark.asyncio
    async def test_handle_request_method_not_found(self, client):
        """Test du traitement d'une requête avec méthode non trouvée"""
        # Pas de handler enregistré
        client.handlers = {}
        
        # Données de requête
        request_data = {
            "jsonrpc": "2.0",
            "method": "unknown_method",
            "id": "test_id"
        }
        
        # Exécuter le test
        await client._handle_request(request_data)
        
        # Aucune exception ne devrait être levée, le handler gère l'erreur
    
    @pytest.mark.asyncio
    async def test_handle_notification(self, client):
        """Test du traitement d'une notification"""
        # Mock du handler
        mock_handler = AsyncMock()
        client.handlers = {"test_notification": mock_handler}
        
        # Données de notification
        notification_data = {
            "jsonrpc": "2.0",
            "method": "test_notification",
            "params": {"param": "value"}
        }
        
        # Exécuter le test
        await client._handle_notification(notification_data)
        
        # Vérifier que le handler a été appelé
        mock_handler.assert_called_once_with({"param": "value"})
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_success(self, client):
        """Test de l'exécution avec retry réussie"""
        # Mock du handler
        mock_handler = Mock(return_value="success")
        
        # Exécuter le test
        result = await client._execute_with_retry(mock_handler, {"param": "value"})
        
        # Vérifier les résultats
        assert result.success is True
        assert result.data == "success"
    
    @pytest.mark.asyncio
    async def test_execute_with_retry_failure(self, client):
        """Test de l'exécution avec retry qui échoue"""
        # Mock du handler qui lève toujours une exception
        mock_handler = Mock(side_effect=Exception("Test error"))
        
        # Exécuter le test
        with pytest.raises(Exception, match="Toutes les tentatives ont échoué"):
            await client._execute_with_retry(mock_handler, {"param": "value"})
    
    def test_validate_jsonrpc_valid(self, client):
        """Test de la validation JSON-RPC valide"""
        # Message valide
        message = {
            "jsonrpc": "2.0",
            "method": "test",
            "id": "test"
        }
        
        # Exécuter le test
        result = client._validate_jsonrpc(message)
        
        # Vérifier les résultats
        assert result is True
    
    def test_validate_jsonrpc_invalid(self, client):
        """Test de la validation JSON-RPC invalide"""
        # Message invalide
        message = {
            "jsonrpc": "2.0",
            "method": "test"
            # ID manquant
        }
        
        # Exécuter le test
        result = client._validate_jsonrpc(message)
        
        # Vérifier les résultats
        assert result is False
    
    def test_generate_request_id(self, client):
        """Test de la génération d'ID de requête"""
        # Exécuter le test
        id1 = client._generate_request_id()
        id2 = client._generate_request_id()
        
        # Vérifier les résultats
        assert id1 != id2
        assert "req_" in id1
        assert "req_" in id2


class TestMCPClientIntegration:
    """Tests d'intégration pour le client MCP"""
    
    @pytest.mark.asyncio
    async def test_full_message_flow(self):
        """Test du flux de message complet"""
        # Configuration de test
        config = {
            "host": "localhost",
            "port": 8080,
            "timeout": 5
        }
        
        logger = Mock()
        
        # Créer le client
        client = MCPClient(config, logger)
        
        # Mock stdio
        with patch('sys.stdin', Mock()), \
             patch('sys.stdout', Mock()), \
             patch('asyncio.get_event_loop') as mock_loop:
            
            # Configurer le mock du loop
            mock_loop.return_value.run_in_executor = Mock(side_effect=[
                '{"jsonrpc": "2.0", "method": "ping", "id": "test"}',  # Lecture
                None  # Écriture
            ])
            
            # Mock de l'exécution de méthode
            client._execute_method = AsyncMock(return_value={"status": "pong"})
            
            # Démarrer le client
            await client.start()
            
            # Envoyer une requête
            await client.send_request("ping")
            
            # Vérifier les statistiques
            assert client.stats['requests_sent'] == 1
            assert client.stats['responses_received'] == 0  # Non reçu car mocked
            
            # Arrêter le client
            await client.stop()
            
            # Vérifier que le client est arrêté
            assert client.is_connected is False


if __name__ == '__main__':
    pytest.main([__file__, '-v'])