"""
MCP Handlers for StoryCore Engine
Gestionnaires d'événements et de messages pour le serveur MCP.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional, List, Union
from pathlib import Path
from dataclasses import dataclass

from .mcp_client import MCPClient, MCPRequest, MCPResponse, MCPNotification
from .validators import MCPValidator


@dataclass
class HandlerResult:
    """Résultat d'un handler"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class MCPHandler:
    """
    Gestionnaire principal des messages MCP
    
    Responsabilités:
    - Router les messages vers les bons handlers
    - Gérer le cycle de vie des requêtes
    - Appliquer les validations de sécurité
    - Gérer les erreurs et les timeouts
    """
    
    def __init__(self, mcp_client: MCPClient, validator: MCPValidator, logger: logging.Logger):
        """
        Initialise le handler MCP
        
        Args:
            mcp_client: Client MCP pour la communication
            validator: Validateur pour les messages
            logger: Logger pour les messages de debug
        """
        self.mcp_client = mcp_client
        self.validator = validator
        self.logger = logger
        
        # Registre des handlers
        self.handlers: Dict[str, callable] = {}
        
        # Configuration
        self.config = {
            'max_request_size': 1024 * 1024,  # 1MB
            'timeout': 30,
            'retry_attempts': 3
        }
        
        # Statistiques
        self.stats = {
            'requests_processed': 0,
            'errors_count': 0,
            'validation_failures': 0,
            'timeouts_count': 0
        }
        
        # Initialiser les handlers par défaut
        self._initialize_default_handlers()
    
    async def handle_message(self, message: str) -> str:
        """
        Traite un message JSON-RCP entrant
        
        Args:
            message: Message JSON à traiter
            
        Returns:
            Réponse JSON formatée
        """
        try:
            # Désérialiser le message
            message_data = json.loads(message)
            
            # Valider le message
            if not self.validator.validate_message(message):
                self.stats['validation_failures'] += 1
                return self._create_error_response(
                    -32600, "Invalid Request", None
                )
            
            # Traiter le message selon son type
            if 'id' in message_data:
                # C'est une requête
                response = await self._handle_request(message_data)
            else:
                # C'est une notification
                await self._handle_notification(message_data)
                response = '{"jsonrpc": "2.0", "result": null}'
            
            self.stats['requests_processed'] += 1
            return response
            
        except json.JSONDecodeError as e:
            self.stats['errors_count'] += 1
            self.logger.error(f"Erreur JSON: {e}")
            return self._create_error_response(
                -32700, "Parse Error", None
            )
            
        except Exception as e:
            self.stats['errors_count'] += 1
            self.logger.error(f"Erreur lors du traitement: {e}")
            return self._create_error_response(
                -32603, "Internal Error", None
            )
    
    async def _handle_request(self, request_data: Dict[str, Any]) -> str:
        """
        Gère une requête JSON-RPC
        
        Args:
            request_data: Données de la requête
            
        Returns:
            Réponse JSON formatée
        """
        request_id = request_data.get('id')
        method = request_data.get('method')
        params = request_data.get('params', {})
        
        if not method:
            return self._create_error_response(
                -32601, "Method not found", request_id
            )
        
        # Vérifier si le handler existe
        if method not in self.handlers:
            self.logger.warning(f"Méthode non trouvée: {method}")
            return self._create_error_response(
                -32601, "Method not found", request_id
            )
        
        try:
            # Exécuter le handler avec retry
            handler = self.handlers[method]
            result = await self._execute_with_retry(handler, params)
            
            # Créer la réponse
            response_data = {
                "jsonrpc": "2.0",
                "result": result.data,
                "id": request_id
            }
            
            # Ajouter les métadonnées si disponibles
            if result.metadata:
                response_data["metadata"] = result.metadata
            
            return json.dumps(response_data, ensure_ascii=False)
            
        except Exception as e:
            self.logger.error(f"Erreur dans le handler {method}: {e}")
            return self._create_error_response(
                -32603, f"Handler error: {str(e)}", request_id
            )
    
    async def _handle_notification(self, notification_data: Dict[str, Any]) -> None:
        """
        Gère une notification JSON-RPC
        
        Args:
            notification_data: Données de la notification
        """
        method = notification_data.get('method')
        params = notification_data.get('params', {})
        
        if not method:
            self.logger.error("Notification sans méthode")
            return
        
        # Vérifier si le handler existe
        if method in self.handlers:
            try:
                await self.handlers[method](params)
            except Exception as e:
                self.logger.error(f"Erreur dans le handler de notification {method}: {e}")
    
    async def _execute_with_retry(self, handler: callable, params: Dict[str, Any]) -> HandlerResult:
        """
        Exécute un handler avec mécanisme de retry
        
        Args:
            handler: Fonction à exécuter
            params: Paramètres de la fonction
            
        Returns:
            Résultat de l'exécution
            
        Raises:
            Exception: Si toutes les tentatives échouent
        """
        last_error = None
        
        for attempt in range(self.config['retry_attempts']):
            try:
                # Exécuter le handler
                if asyncio.iscoroutinefunction(handler):
                    result = await handler(params)
                else:
                    result = handler(params)
                
                return HandlerResult(success=True, data=result)
                
            except Exception as e:
                last_error = e
                self.logger.warning(f"Tentative {attempt + 1} échouée: {e}")
                
                # Attendre avant de réessayer
                if attempt < self.config['retry_attempts'] - 1:
                    await asyncio.sleep(1 * (attempt + 1))  # Backoff exponentiel
        
        # Toutes les tentatives ont échoué
        raise Exception(f"Toutes les tentatives ont échoué: {last_error}")
    
    def _create_error_response(self, code: int, message: str, request_id: Optional[str]) -> str:
        """
        Crée une réponse d'erreur JSON-RPC
        
        Args:
            code: Code d'erreur
            message: Message d'erreur
            request_id: ID de la requête
            
        Returns:
            Réponse d'erreur formatée
        """
        error_data = {
            "jsonrpc": "2.0",
            "error": {
                "code": code,
                "message": message
            }
        }
        
        if request_id:
            error_data["id"] = request_id
        
        return json.dumps(error_data, ensure_ascii=False)
    
    def _initialize_default_handlers(self) -> None:
        """Initialise les handlers par défaut"""
        # Handler pour l'initialisation MCP
        self.handlers["initialize"] = self._handle_initialize
        
        # Handlers pour les ressources
        self.handlers["resources/list"] = self._handle_list_resources
        self.handlers["resources/read"] = self._handle_read_resource
        
        # Handlers pour les outils
        self.handlers["tools/list"] = self._handle_list_tools
        self.handlers["tools/call"] = self._handle_call_tool
        
        # Handlers pour les notifications
        self.handlers["notifications/send"] = self._handle_send_notification
        
        # Handler pour le ping
        self.handlers["ping"] = self._handle_ping
        
        self.logger.info(f"Initialisation de {len(self.handlers)} handlers par défaut")
    
    # Handlers par défaut
    
    async def _handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler d'initialisation MCP"""
        return {
            "protocolVersion": "2024-11-05",
            "capabilities": {
                "resources": {
                    "subscribe": False,
                    "listChanged": False
                },
                "tools": {},
                "logging": {}
            },
            "serverInfo": {
                "name": "StoryCore MCP Server",
                "version": "1.0.0"
            }
        }
    
    async def _handle_list_resources(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler pour lister les ressources"""
        # Filtrer par URI si spécifié
        uri_filter = params.get("uri")
        
        # Lister les ressources disponibles
        resources = []
        
        # Parcourir les répertoires configurés
        base_paths = params.get("basePaths", ["."])
        for base_path in base_paths:
            path = Path(base_path)
            if path.exists():
                for file_path in path.rglob("*"):
                    if file_path.is_file():
                        # Vérifier l'extension
                        if self._is_allowed_extension(file_path.suffix):
                            resource_uri = f"file://{file_path.absolute()}"
                            
                            # Filtrer si URI spécifiée
                            if uri_filter and not resource_uri.startswith(uri_filter):
                                continue
                            
                            resources.append({
                                "uri": resource_uri,
                                "name": file_path.name,
                                "description": f"Fichier: {file_path.name}",
                                "mimeType": self._get_mime_type(file_path.suffix)
                            })
        
        return {"resources": resources}
    
    async def _handle_read_resource(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler pour lire une ressource"""
        uri = params.get("uri")
        if not uri:
            raise ValueError("URI manquante")
        
        # Extraire le chemin du fichier
        if uri.startswith("file://"):
            file_path = Path(uri[7:])  # Enlever "file://"
        else:
            file_path = Path(uri)
        
        # Vérifier si le fichier existe
        if not file_path.exists():
            raise FileNotFoundError(f"Fichier non trouvé: {file_path}")
        
        # Vérifier les permissions
        if not file_path.is_file():
            raise ValueError(f"Ce n'est pas un fichier: {file_path}")
        
        # Lire le contenu
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return {
                "contents": [
                    {
                        "uri": uri,
                        "mimeType": self._get_mime_type(file_path.suffix),
                        "text": content
                    }
                ]
            }
            
        except UnicodeDecodeError:
            # Essayer avec d'autres encodages
            for encoding in ['latin-1', 'utf-16', 'cp1252']:
                try:
                    with open(file_path, 'r', encoding=encoding) as f:
                        content = f.read()
                    
                    return {
                        "contents": [
                            {
                                "uri": uri,
                                "mimeType": self._get_mime_type(file_path.suffix),
                                "text": content
                            }
                        ]
                    }
                except:
                    continue
            
            raise ValueError("Impossible de décoder le fichier")
    
    async def _handle_list_tools(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler pour lister les outils"""
        tools = [
            {
                "name": "file_search",
                "description": "Rechercher des fichiers dans le système",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "pattern": {
                            "type": "string",
                            "description": "Pattern de recherche (ex: *.txt)"
                        },
                        "path": {
                            "type": "string",
                            "description": "Chemin de base pour la recherche"
                        }
                    },
                    "required": ["pattern"]
                }
            },
            {
                "name": "text_analysis",
                "description": "Analyser du texte pour en extraire des informations",
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "Texte à analyser"
                        },
                        "analysis_type": {
                            "type": "string",
                            "enum": ["sentiment", "keywords", "summary"],
                            "description": "Type d'analyse à effectuer"
                        }
                    },
                    "required": ["text"]
                }
            }
        ]
        
        return {"tools": tools}
    
    async def _handle_call_tool(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler pour exécuter un outil"""
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if not tool_name:
            raise ValueError("Nom de l'outil manquant")
        
        # Router vers l'outil approprié
        if tool_name == "file_search":
            return await self._execute_file_search(arguments)
        elif tool_name == "text_analysis":
            return await self._execute_text_analysis(arguments)
        else:
            raise ValueError(f"Outil non supporté: {tool_name}")
    
    async def _handle_send_notification(self, params: Dict[str, Any]) -> None:
        """Handler pour envoyer des notifications"""
        level = params.get("level", "info")
        message = params.get("message", "")
        
        # Logger la notification
        log_method = getattr(self.logger, level.lower(), self.logger.info)
        log_method(f"Notification MCP: {message}")
    
    async def _handle_ping(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handler pour le ping de santé"""
        return {
            "status": "pong",
            "timestamp": asyncio.get_event_loop().time(),
            "version": "1.0.0"
        }
    
    # Méthodes utilitaires
    
    def _is_allowed_extension(self, extension: str) -> bool:
        """Vérifie si une extension de fichier est autorisée"""
        allowed_extensions = {
            '.json', '.txt', '.md', '.yaml', '.yml',
            '.csv', '.xml', '.html', '.htm', '.js', '.ts'
        }
        return extension.lower() in allowed_extensions
    
    def _get_mime_type(self, extension: str) -> str:
        """Retourne le MIME type pour une extension de fichier"""
        mime_types = {
            '.json': 'application/json',
            '.txt': 'text/plain',
            '.md': 'text/markdown',
            '.yaml': 'application/yaml',
            '.yml': 'application/yaml',
            '.csv': 'text/csv',
            '.xml': 'application/xml',
            '.html': 'text/html',
            '.htm': 'text/html',
            '.js': 'application/javascript',
            '.ts': 'application/typescript'
        }
        return mime_types.get(extension.lower(), 'application/octet-stream')
    
    # Méthodes pour l'enregistrement de handlers personnalisés
    
    def register_handler(self, method: str, handler: callable) -> None:
        """
        Enregistre un handler personnalisé
        
        Args:
            method: Méthode à gérer
            handler: Fonction de traitement
        """
        self.handlers[method] = handler
        self.logger.info(f"Handler enregistré pour: {method}")
    
    def unregister_handler(self, method: str) -> None:
        """
        Désenregistre un handler
        
        Args:
            method: Méthode à désenregistrer
        """
        if method in self.handlers:
            del self.handlers[method]
            self.logger.info(f"Handler désenregistré pour: {method}")
    
    def get_registered_handlers(self) -> List[str]:
        """Retourne la liste des handlers enregistrés"""
        return list(self.handlers.keys())