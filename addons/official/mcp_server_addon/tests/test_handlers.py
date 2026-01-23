"""
Tests for MCP Handlers Module
Tests unitaires pour le module handlers MCP.
"""

import asyncio
import json
import pytest
from unittest.mock import Mock, AsyncMock, patch

from src.handlers import MCPHandler, HandlerResult
from src.mcp_client import MCPClient
from src.validators import MCPValidator


class TestMCPHandler:
    """Tests pour la classe MCPHandler"""
    
    @pytest.fixture
    def mock_mcp_client(self):
        """Client MCP simulé"""
        client = Mock(spec=MCPClient)
        client.send_message = AsyncMock()
        return client
    
    @pytest.fixture
    def mock_validator(self):
        """Validateur simulé"""
        validator = Mock(spec=MCPValidator)
        validator.validate_message = Mock(return_value=True)
        return validator
    
    @pytest.fixture
    def mock_logger(self):
        """Logger simulé"""
        return Mock()
    
    @pytest.fixture
    def handler(self, mock_mcp_client, mock_validator, mock_logger):
        """Handler MCP pour les tests"""
        return MCPHandler(mock_mcp_client, mock_validator, mock_logger)
    
    @pytest.mark.asyncio
    async def test_handle_message_valid(self, handler):
        """Test du traitement d'un message valide"""
        # Message valide
        message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
        
        # Mock du handler
        handler.handlers = {"ping": Mock(return_value={"status": "pong"})}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'pong' in result
        assert handler.stats['requests_processed'] == 1
    
    @pytest.mark.asyncio
    async def test_handle_message_invalid_json(self, handler):
        """Test du traitement d'un message JSON invalide"""
        # Message JSON invalide
        message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"'
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Parse Error' in result
        assert handler.stats['errors_count'] == 1
    
    @pytest.mark.asyncio
    async def test_handle_message_invalid_request(self, handler):
        """Test du traitement d'une requête invalide"""
        # Requête invalide (pas de méthode)
        message = '{"jsonrpc": "2.0", "id": "test"}'
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Invalid Request' in result
        assert handler.stats['validation_failures'] == 1
    
    @pytest.mark.asyncio
    async def test_handle_message_method_not_found(self, handler):
        """Test du traitement d'une requête avec méthode non trouvée"""
        # Message avec méthode non trouvée
        message = '{"jsonrpc": "2.0", "method": "unknown_method", "id": "test"}'
        
        # Pas de handler enregistré
        handler.handlers = {}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Method not found' in result
    
    @pytest.mark.asyncio
    async def test_handle_notification(self, handler):
        """Test du traitement d'une notification"""
        # Notification
        message = '{"jsonrpc": "2.0", "method": "test_notification", "params": {"value": "test"}}'
        
        # Mock du handler
        handler.handlers = {"test_notification": AsyncMock()}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        # Les notifications ne retournent pas de contenu
        assert result == '{"jsonrpc": "2.0", "result": null}'
        # Le handler doit avoir été appelé
        handler.handlers["test_notification"].assert_called_once_with({"value": "test"})
    
    @pytest.mark.asyncio
    async def test_handle_request_with_retry_success(self, handler):
        """Test du traitement d'une requête avec retry réussi"""
        # Message
        message = '{"jsonrpc": "2.0", "method": "test_method", "id": "test"}'
        
        # Mock du handler qui réussit après 2 tentatives
        mock_handler = Mock(side_effect=[Exception("First try"), {"result": "success"}])
        handler.handlers = {"test_method": mock_handler}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'success' in result
        assert mock_handler.call_count == 2  # 2 tentatives
    
    @pytest.mark.asyncio
    async def test_handle_request_with_retry_failure(self, handler):
        """Test du traitement d'une requête avec retry qui échoue"""
        # Message
        message = '{"jsonrpc": "2.0", "method": "test_method", "id": "test"}'
        
        # Mock du handler qui échoue toujours
        mock_handler = Mock(side_effect=Exception("Always fails"))
        handler.handlers = {"test_method": mock_handler}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Handler error' in result
        assert mock_handler.call_count == 3  # 3 tentatives (configuré)
    
    @pytest.mark.asyncio
    async def test_handle_request_exception(self, handler):
        """Test du traitement d'une requête qui cause une exception"""
        # Message
        message = '{"jsonrpc": "2.0", "method": "test_method", "id": "test"}'
        
        # Mock du handler qui lève une exception
        mock_handler = Mock(side_effect=Exception("Handler error"))
        handler.handlers = {"test_method": mock_handler}
        
        # Exécuter le test
        result = await handler.handle_message(message)
        
        # Vérifier les résultats
        assert 'error' in result
        assert 'Handler error' in result
        assert handler.stats['errors_count'] == 1
    
    def test_create_error_response(self, handler):
        """Test de la création d'une réponse d'erreur"""
        # Créer une réponse d'erreur
        result = handler._create_error_response(-32601, "Method not found", "test_id")
        
        # Vérifier les résultats
        error_data = json.loads(result)
        assert error_data['jsonrpc'] == '2.0'
        assert error_data['error']['code'] == -32601
        assert error_data['error']['message'] == 'Method not found'
        assert error_data['id'] == 'test_id'
    
    def test_create_error_response_no_id(self, handler):
        """Test de la création d'une réponse d'erreur sans ID"""
        # Créer une réponse d'erreur sans ID
        result = handler._create_error_response(-32601, "Method not found", None)
        
        # Vérifier les résultats
        error_data = json.loads(result)
        assert error_data['jsonrpc'] == '2.0'
        assert error_data['error']['code'] == -32601
        assert error_data['error']['message'] == 'Method not found'
        assert 'id' not in error_data
    
    @pytest.mark.asyncio
    async def test_handle_initialize(self, handler):
        """Test du handler d'initialisation"""
        # Paramètres
        params = {"capabilities": {"resources": {}}}
        
        # Exécuter le test
        result = await handler._handle_initialize(params)
        
        # Vérifier les résultats
        assert 'protocolVersion' in result
        assert 'capabilities' in result
        assert 'serverInfo' in result
        assert result['protocolVersion'] == '2024-11-05'
        assert result['serverInfo']['name'] == 'StoryCore MCP Server'
    
    @pytest.mark.asyncio
    async def test_handle_list_resources(self, handler):
        """Test du handler de listing des ressources"""
        # Paramètres
        params = {"basePaths": ["test"]}
        
        # Mock de Path
        with patch('src.handlers.Path') as mock_path:
            # Mock du chemin
            mock_path_instance = Mock()
            mock_path_instance.exists.return_value = True
            mock_path_instance.rglob.return_value = [
                Mock(is_file=Mock(return_value=True), name="test.json", suffix=".json"),
                Mock(is_file=Mock(return_value=True), name="test.txt", suffix=".txt")
            ]
            mock_path.return_value = mock_path_instance
            
            # Exécuter le test
            result = await handler._handle_list_resources(params)
            
            # Vérifier les résultats
            assert 'resources' in result
            assert len(result['resources']) == 2
    
    @pytest.mark.asyncio
    async def test_handle_read_resource_success(self, handler):
        """Test du handler de lecture de ressource réussi"""
        # Paramètres
        params = {"uri": "file:///test.json"}
        
        # Mock de Path
        with patch('src.handlers.Path') as mock_path, \
             patch('builtins.open', create=True) as mock_open:
            
            # Mock du fichier
            mock_path.return_value = Mock(
                exists=Mock(return_value=True),
                is_file=Mock(return_value=True),
                __str__=Mock(return_value="test.json")
            )
            mock_open.return_value.__enter__.return_value.read.return_value = '{"test": "content"}'
            
            # Exécuter le test
            result = await handler._handle_read_resource(params)
            
            # Vérifier les résultats
            assert 'contents' in result
            assert len(result['contents']) == 1
            assert result['contents'][0]['text'] == '{"test": "content"}'
    
    @pytest.mark.asyncio
    async def test_handle_read_resource_not_found(self, handler):
        """Test du handler de lecture de ressource non trouvée"""
        # Paramètres
        params = {"uri": "file:///nonexistent.json"}
        
        # Mock de Path
        with patch('src.handlers.Path') as mock_path:
            # Mock du fichier non trouvé
            mock_path.return_value = Mock(
                exists=Mock(return_value=False)
            )
            
            # Exécuter le test
            with pytest.raises(FileNotFoundError):
                await handler._handle_read_resource(params)
    
    @pytest.mark.asyncio
    async def test_handle_list_tools(self, handler):
        """Test du handler de listing des outils"""
        # Paramètres
        params = {}
        
        # Exécuter le test
        result = await handler._handle_list_tools(params)
        
        # Vérifier les résultats
        assert 'tools' in result
        assert len(result['tools']) >= 2  # Au moins 2 outils par défaut
        tool_names = [tool['name'] for tool in result['tools']]
        assert 'file_search' in tool_names
        assert 'text_analysis' in tool_names
    
    @pytest.mark.asyncio
    async def test_handle_call_tool_success(self, handler):
        """Test du handler d'appel d'outil réussi"""
        # Paramètres
        params = {"name": "file_search", "arguments": {"pattern": "*.txt"}}
        
        # Exécuter le test
        result = await handler._handle_call_tool(params)
        
        # Vérifier les résultats
        assert 'content' in result
        assert len(result['content']) == 1
        assert result['content'][0]['type'] == 'text'
    
    @pytest.mark.asyncio
    async def test_handle_call_tool_unknown(self, handler):
        """Test du handler d'appel d'outil inconnu"""
        # Paramètres
        params = {"name": "unknown_tool", "arguments": {}}
        
        # Exécuter le test
        with pytest.raises(ValueError, match="Outil non supporté"):
            await handler._handle_call_tool(params)
    
    @pytest.mark.asyncio
    async def test_handle_send_notification(self, handler):
        """Test du handler d'envoi de notification"""
        # Paramètres
        params = {"level": "info", "message": "Test notification"}
        
        # Mock du logger
        handler.logger = Mock()
        
        # Exécuter le test
        await handler._handle_send_notification(params)
        
        # Vérifier que le logger a été appelé
        handler.logger.info.assert_called_once()
        call_args = handler.logger.info.call_args[0][0]
        assert "Notification MCP: Test notification" in call_args
    
    @pytest.mark.asyncio
    async def test_handle_ping(self, handler):
        """Test du handler ping"""
        # Paramètres
        params = {}
        
        # Exécuter le test
        result = await handler._handle_ping(params)
        
        # Vérifier les résultats
        assert 'status' in result
        assert 'timestamp' in result
        assert 'version' in result
        assert result['status'] == 'pong'
    
    def test_register_handler(self, handler):
        """Test de l'enregistrement d'un handler"""
        # Mock du handler
        mock_handler = Mock()
        
        # Exécuter le test
        handler.register_handler("custom_method", mock_handler)
        
        # Vérifier que le handler est enregistré
        assert "custom_method" in handler.handlers
        assert handler.handlers["custom_method"] == mock_handler
    
    def test_unregister_handler(self, handler):
        """Test du désenregistrement d'un handler"""
        # Préparer le handler
        mock_handler = Mock()
        handler.handlers = {"custom_method": mock_handler}
        
        # Exécuter le test
        handler.unregister_handler("custom_method")
        
        # Vérifier que le handler est désenregistré
        assert "custom_method" not in handler.handlers
    
    def test_get_registered_handlers(self, handler):
        """Test de la récupération des handlers enregistrés"""
        # Préparer les handlers
        handler.handlers = {
            "method1": Mock(),
            "method2": Mock()
        }
        
        # Exécuter le test
        handlers = handler.get_registered_handlers()
        
        # Vérifier les résultats
        assert len(handlers) == 2
        assert "method1" in handlers
        assert "method2" in handlers


class TestHandlerResult:
    """Tests pour la classe HandlerResult"""
    
    def test_handler_result_creation(self):
        """Test de la création d'un résultat de handler"""
        # Créer un résultat
        result = HandlerResult(
            success=True,
            data={"result": "success"},
            metadata={"processing_time": 1.5}
        )
        
        # Vérifier les attributs
        assert result.success is True
        assert result.data == {"result": "success"}
        assert result.metadata == {"processing_time": 1.5}
    
    def test_handler_result_failure(self):
        """Test d'un résultat de handler en échec"""
        # Créer un résultat d'échec
        result = HandlerResult(
            success=False,
            error="Handler failed"
        )
        
        # Vérifier les attributs
        assert result.success is False
        assert result.error == "Handler failed"
        assert result.data is None


if __name__ == '__main__':
    pytest.main([__file__, '-v'])