"""
MCP Client for StoryCore Engine
Client MCP (Model Context Protocol) pour la communication JSON-RPC 2.0 via stdio.
"""

import asyncio
import json
import logging
import sys
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass
from enum import Enum


class MCPMethod(Enum):
    """Méthodes MCP supportées"""
 INITIALIZE = "initialize"
    LIST_RESOURCES = "resources/list"
    READ_RESOURCE = "resources/read"
    LIST_TOOLS = "tools/list"
    CALL_TOOL = "tools/call"
    SEND_NOTIFICATION = "notifications/send"
    PING = "ping"


@dataclass
class MCPRequest:
    """Requête MCP formatée"""
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None
    id: Optional[str] = None


@dataclass
class MCPResponse:
    """Réponse MCP formatée"""
    jsonrpc: str = "2.0"
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None
    id: Optional[str] = None


@dataclass
class MCPNotification:
    """Notification MCP formatée"""
    jsonrpc: str = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPClient:
    """
    Client MCP pour la communication JSON-RPC 2.0 via stdio
    
    Responsabilités:
    - Gestion de la communication JSON-RPC 2.0
    - Validation des messages entrants/sortants
    - Gestion des connexions et timeouts
    - Traitement des erreurs
    """
    
    def __init__(self, server_config: Dict[str, Any], logger: logging.Logger):
        """
        Initialise le client MCP
        
        Args:
            server_config: Configuration du serveur
            logger: Logger pour les messages de debug
        """
        self.config = server_config
        self.logger = logger
        
        # Gestion des connexions
        self.is_connected = False
        self.active_connections: List[Dict[str, Any]] = []
        
        # Gestion des requêtes
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.request_counter = 0
        
        # Callbacks
        self.message_handlers: Dict[str, Callable] = {}
        
        # Configuration de sécurité
        self.security_config = server_config.get('security', {})
        
        # Statistiques
        self.stats = {
            'requests_sent': 0,
            'responses_received': 0,
            'errors_count': 0,
            'notifications_sent': 0
        }
    
    async def start(self) -> bool:
        """
        Démarre le client MCP
        
        Returns:
            True si le démarrage réussit
        """
        try:
            self.logger.info("Démarrage du client MCP...")
            
            # Initialiser la communication stdio
            await self._initialize_stdio()
            
            # Démarrer le loop de traitement
            asyncio.create_task(self._message_loop())
            
            self.is_connected = True
            self.logger.info("Client MCP démarré avec succès")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors du démarrage: {e}")
            return False
    
    async def stop(self) -> bool:
        """
        Arrête le client MCP
        
        Returns:
            True si l'arrêt réussit
        """
        try:
            self.logger.info("Arrêt du client MCP...")
            
            # Arrêter la communication stdio
            await self._cleanup_stdio()
            
            # Annuler les requêtes en attente
            for request_id, future in self.pending_requests.items():
                if not future.done():
                    future.cancel()
                    self.logger.debug(f"Requête annulée: {request_id}")
            
            self.pending_requests.clear()
            self.is_connected = False
            
            self.logger.info("Client MCP arrêté avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'arrêt: {e}")
            return False
    
    async def send_request(self, method: str, params: Optional[Dict[str, Any]] = None) -> Any:
        """
        Envoie une requête MCP et attend la réponse
        
        Args:
            method: Méthode MCP à appeler
            params: Paramètres de la méthode
            
        Returns:
            Résultat de la requête
            
        Raises:
            asyncio.TimeoutError: Si la requête expire
            RuntimeError: Si la requête échoue
        """
        if not self.is_connected:
            raise RuntimeError("Le client MCP n'est pas connecté")
        
        # Générer un ID unique pour la requête
        request_id = self._generate_request_id()
        
        # Créer la requête
        request = MCPRequest(
            method=method,
            params=params,
            id=request_id
        )
        
        # Envoyer la requête
        await self._send_message(request)
        
        # Attendre la réponse
        future = asyncio.Future()
        self.pending_requests[request_id] = future
        
        try:
            # Attendre avec timeout
            timeout = self.config.get('timeout', 30)
            result = await asyncio.wait_for(future, timeout=timeout)
            
            self.stats['responses_received'] += 1
            return result
            
        except asyncio.TimeoutError:
            self.logger.error(f"Timeout pour la requête {request_id}")
            self.stats['errors_count'] += 1
            raise
            
        finally:
            # Nettoyer la requête
            self.pending_requests.pop(request_id, None)
    
    async def send_notification(self, method: str, params: Optional[Dict[str, Any]] = None) -> None:
        """
        Envoie une notification (requête sans attente de réponse)
        
        Args:
            method: Méthode de la notification
            params: Paramètres de la notification
        """
        if not self.is_connected:
            raise RuntimeError("Le client MCP n'est pas connecté")
        
        notification = MCPNotification(
            method=method,
            params=params
        )
        
        await self._send_message(notification)
        self.stats['notifications_sent'] += 1
    
    def register_handler(self, method: str, handler: Callable) -> None:
        """
        Enregistre un handler pour une méthode spécifique
        
        Args:
            method: Méthode à gérer
            handler: Fonction de traitement
        """
        self.message_handlers[method] = handler
        self.logger.debug(f"Handler enregistré pour: {method}")
    
    def unregister_handler(self, method: str) -> None:
        """
        Désenregistre un handler
        
        Args:
            method: Méthode à désenregistrer
        """
        self.message_handlers.pop(method, None)
        self.logger.debug(f"Handler désenregistré pour: {method}")
    
    def get_connections_count(self) -> int:
        """Retourne le nombre de connexions actives"""
        return len(self.active_connections)
    
    async def cleanup(self) -> None:
        """Nettoyage des ressources"""
        await self.stop()
        self.message_handlers.clear()
        self.active_connections.clear()
    
    # Méthodes privées
    
    async def _initialize_stdio(self) -> None:
        """Initialise la communication stdio"""
        try:
            # Vérifier que stdio est disponible
            if not sys.stdin or not sys.stdout:
                raise RuntimeError("Stdio non disponible")
            
            self.logger.debug("Communication stdio initialisée")
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'initialisation stdio: {e}")
            raise
    
    async def _cleanup_stdio(self) -> None:
        """Nettoie la communication stdio"""
        try:
            # Fermer les descripteurs de fichier si nécessaire
            pass
            
        except Exception as e:
            self.logger.error(f"Erreur lors du nettoyage stdio: {e}")
    
    async def _message_loop(self) -> None:
        """Boucle principale de traitement des messages"""
        while self.is_connected:
            try:
                # Lire un message depuis stdio
                message = await self._read_message()
                
                if not message:
                    continue
                
                # Traiter le message
                await self._process_message(message)
                
            except asyncio.CancelledError:
                self.logger.debug("Message loop annulé")
                break
                
            except Exception as e:
                self.logger.error(f"Erreur dans le message loop: {e}")
                self.stats['errors_count'] += 1
    
    async def _read_message(self) -> Optional[str]:
        """
        Lit un message depuis stdio
        
        Returns:
            Message lu ou None si erreur
        """
        try:
            # Lire une ligne depuis stdin
            line = await asyncio.get_event_loop().run_in_executor(
                None, sys.stdin.readline
            )
            
            if not line:
                return None
            
            # Nettoyer le message
            line = line.strip()
            if not line:
                return None
            
            return line
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la lecture du message: {e}")
            return None
    
    async def _send_message(self, message: Dict[str, Any]) -> None:
        """
        Envoie un message via stdio
        
        Args:
            message: Message à envoyer
        """
        try:
            # Sérialiser le message
            message_str = json.dumps(message, ensure_ascii=False)
            
            # Envoyer via stdout
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: print(message_str, flush=True)
            )
            
            self.stats['requests_sent'] += 1
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'envoi du message: {e}")
            self.stats['errors_count'] += 1
            raise
    
    async def _process_message(self, message_str: str) -> None:
        """
        Traite un message JSON-RPC entrant
        
        Args:
            message_str: Message JSON à traiter
        """
        try:
            # Désérialiser le message
            message_data = json.loads(message_str)
            
            # Valider le format JSON-RPC
            if not self._validate_jsonrpc(message_data):
                self.logger.error("Message JSON-RPC invalide")
                return
            
            # Traiter selon le type de message
            if 'id' in message_data:
                # C'est une réponse
                await self._handle_response(message_data)
            elif 'method' in message_data:
                # C'est une requête ou notification
                await self._handle_request(message_data)
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Erreur JSON lors du traitement: {e}")
            self.stats['errors_count'] += 1
            
        except Exception as e:
            self.logger.error(f"Erreur lors du traitement du message: {e}")
            self.stats['errors_count'] += 1
    
    async def _handle_response(self, response_data: Dict[str, Any]) -> None:
        """Gère une réponse JSON-RPC"""
        request_id = response_data.get('id')
        
        if not request_id:
            self.logger.error("Réponse sans ID")
            return
        
        # Trouver la requête correspondante
        future = self.pending_requests.get(request_id)
        
        if not future:
            self.logger.warning(f"Réponse pour une requête inconnue: {request_id}")
            return
        
        # Compléter la future avec la réponse
        if 'error' in response_data:
            error = response_data['error']
            future.set_exception(RuntimeError(f"RPC Error: {error.get('message', 'Unknown error')}"))
        else:
            future.set_result(response_data.get('result'))
    
    async def _handle_request(self, request_data: Dict[str, Any]) -> None:
        """Gère une requête ou notification JSON-RPC entrante"""
        method = request_data.get('method')
        params = request_data.get('params', {})
        
        if not method:
            self.logger.error("Requête sans méthode")
            return
        
        # Vérifier si c'est une notification (pas d'ID)
        if 'id' not in request_data:
            # C'est une notification, pas de réponse attendue
            await self._execute_method(method, params)
            return
        
        # C'est une requête, on doit répondre
        try:
            result = await self._execute_method(method, params)
            
            # Envoyer la réponse
            response = MCPResponse(
                result=result,
                id=request_data['id']
            )
            
            await self._send_message(response)
            
        except Exception as e:
            # Envoyer une erreur
            error_response = MCPResponse(
                error={
                    'code': -32603,
                    'message': str(e)
                },
                id=request_data['id']
            )
            
            await self._send_message(error_response)
    
    async def _execute_method(self, method: str, params: Dict[str, Any]) -> Any:
        """
        Exécute une méthode MCP
        
        Args:
            method: Méthode à exécuter
            params: Paramètres de la méthode
            
        Returns:
            Résultat de l'exécution
        """
        # Vérifier si un handler est enregistré
        if method in self.message_handlers:
            handler = self.message_handlers[method]
            return await handler(params)
        
        # Handlers par défaut pour les méthodes standard
        if method == MCPMethod.PING.value:
            return {"status": "pong", "timestamp": asyncio.get_event_loop().time()}
        
        elif method == MCPMethod.LIST_RESOURCES.value:
            return await self._list_resources(params)
        
        elif method == MCPMethod.READ_RESOURCE.value:
            return await self._read_resource(params)
        
        elif method == MCPMethod.LIST_TOOLS.value:
            return await self._list_tools(params)
        
        elif method == MCPMethod.CALL_TOOL.value:
            return await self._call_tool(params)
        
        else:
            raise RuntimeError(f"Méthode non supportée: {method}")
    
    # Méthodes MCP standard
    
    async def _list_resources(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Liste les ressources disponibles"""
        # Implémentation de base
        return {
            "resources": [
                {
                    "uri": "file:///example.json",
                    "name": "Exemple de ressource",
                    "description": "Une ressource d'exemple",
                    "mimeType": "application/json"
                }
            ]
        }
    
    async def _read_resource(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Lit une ressource spécifique"""
        uri = params.get("uri")
        if not uri:
            raise ValueError("URI manquante")
        
        # Implémentation de base
        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": '{"example": "content"}'
                }
            ]
        }
    
    async def _list_tools(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Liste les outils disponibles"""
        return {
            "tools": [
                {
                    "name": "example_tool",
                    "description": "Un outil d'exemple",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "input": {
                                "type": "string",
                                "description": "Entrée de l'outil"
                            }
                        }
                    }
                }
            ]
        }
    
    async def _call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Exécute un outil spécifique"""
        tool_name = params.get("name")
        tool_args = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Nom de l'outil manquant")
        
        # Implémentation de base
        return {
            "content": [
                {
                    "type": "text",
                    "text": f"Résultat de {tool_name}: {tool_args}"
                }
            ]
        }
    
    def _validate_jsonrpc(self, message: Dict[str, Any]) -> bool:
        """Valide un message JSON-RPC"""
        if not isinstance(message, dict):
            return False
        
        if message.get('jsonrpc') != '2.0':
            return False
        
        if 'method' not in message:
            return False
        
        return True
    
    def _generate_request_id(self) -> str:
        """Génère un ID unique pour les requêtes"""
        self.request_counter += 1
        return f"req_{self.request_counter}_{asyncio.get_event_loop().time()}"