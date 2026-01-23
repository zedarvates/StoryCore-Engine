"""
MCP Server Addon for StoryCore Engine
Point d'entrée principal du serveur MCP (Model Context Protocol).
"""

import asyncio
import json
import logging
import sys
from pathlib import Path
from typing import Dict, Any, Optional

from src.addon_manager import AddonManager
from src.addon_hooks import HookManager, HookPriority
from src.addon_permissions import PermissionManager, PermissionLevel, PermissionScope

from .mcp_client import MCPClient
from .handlers import MCPHandler
from .validators import MCPValidator


class MCPServerAddon:
    """
    Addon MCP Server pour StoryCore Engine
    
    Responsabilités:
    - Initialisation du serveur MCP
    - Gestion de la communication JSON-RPC 2.0
    - Intégration avec le système d'addons StoryCore
    - Gestion des hooks et permissions
    """
    
    def __init__(self, context: Dict[str, Any]):
        """
        Initialise l'addon MCP Server
        
        Args:
            context: Contexte d'exécution fourni par le gestionnaire d'addons
        """
        self.context = context
        self.addon_name = context.get('addon_name', 'mcp_server_addon')
        self.logger = logging.getLogger(f'{self.addon_name}')
        
        # Composants principaux
        self.mcp_client: Optional[MCPClient] = None
        self.mcp_handler: Optional[MCPHandler] = None
        self.validator: Optional[MCPValidator] = None
        
        # Gestionnaires système
        self.hook_manager = HookManager()
        self.permission_manager = PermissionManager()
        
        # État de l'addon
        self.is_running = False
        self.config = self._load_config()
        
        # Statistiques
        self.stats = {
            'messages_processed': 0,
            'errors_count': 0,
            'active_connections': 0,
            'resources_accessed': 0
        }
    
    async def initialize(self) -> bool:
        """
        Initialise l'addon MCP Server
        
        Returns:
            True si l'initialisation réussit
        """
        try:
            self.logger.info("Initialisation du serveur MCP...")
            
            # Initialiser le validateur
            self.validator = MCPValidator(self.config)
            
            # Initialiser le client MCP
            self.mcp_client = MCPClient(
                server_config=self.config.get('server', {}),
                logger=self.logger
            )
            
            # Initialiser le handler MCP
            self.mcp_handler = MCPHandler(
                mcp_client=self.mcp_client,
                validator=self.validator,
                logger=self.logger
            )
            
            # Enregistrer les hooks
            await self._register_hooks()
            
            # Valider les permissions
            await self._validate_permissions()
            
            self.logger.info("Serveur MCP initialisé avec succès")
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'initialisation: {e}")
            return False
    
    async def start(self) -> bool:
        """
        Démarre le serveur MCP
        
        Returns:
            True si le démarrage réussit
        """
        if self.is_running:
            self.logger.warning("Le serveur MCP est déjà en cours d'exécution")
            return True
        
        try:
            self.logger.info("Démarrage du serveur MCP...")
            
            # Démarrer le client MCP
            if not await self.mcp_client.start():
                self.logger.error("Échec du démarrage du client MCP")
                return False
            
            self.is_running = True
            self.logger.info("Serveur MCP démarré avec succès")
            
            # Déclencher le hook de démarrage
            await self.hook_manager.execute_hook('addon_enabled', self.addon_name)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors du démarrage: {e}")
            return False
    
    async def stop(self) -> bool:
        """
        Arrête le serveur MCP
        
        Returns:
            True si l'arrêt réussit
        """
        if not self.is_running:
            self.logger.warning("Le serveur MCP n'est pas en cours d'exécution")
            return True
        
        try:
            self.logger.info("Arrêt du serveur MCP...")
            
            # Arrêter le client MCP
            if self.mcp_client:
                await self.mcp_client.stop()
            
            self.is_running = False
            self.logger.info("Serveur MCP arrêté avec succès")
            
            # Déclencher le hook d'arrêt
            await self.hook_manager.execute_hook('addon_disabled', self.addon_name)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'arrêt: {e}")
            return False
    
    async def process_message(self, message: str) -> str:
        """
        Traite un message JSON-RPC entrant
        
        Args:
            message: Message JSON-RPC à traiter
            
        Returns:
            Réponse JSON-RPC formatée
        """
        try:
            # Valider le message entrant
            if not self.validator.validate_message(message):
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32600,
                        "message": "Invalid Request"
                    }
                }
                return json.dumps(error_response)
            
            # Traiter le message
            response = await self.mcp_handler.handle_message(message)
            self.stats['messages_processed'] += 1
            
            return response
            
        except Exception as e:
            self.logger.error(f"Erreur lors du traitement du message: {e}")
            self.stats['errors_count'] += 1
            
            error_response = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {
                    "code": -32603,
                    "message": "Internal Error"
                }
            }
            return json.dumps(error_response)
    
    async def get_status(self) -> Dict[str, Any]:
        """
        Retourne l'état actuel du serveur MCP
        
        Returns:
            Dictionnaire contenant l'état et les statistiques
        """
        return {
            "running": self.is_running,
            "stats": self.stats,
            "config": self.config,
            "active_connections": self.mcp_client.get_connections_count() if self.mcp_client else 0
        }
    
    async def cleanup(self) -> None:
        """Nettoyage des ressources avant la désactivation"""
        try:
            await self.stop()
            
            # Nettoyer les hooks
            self.hook_manager.unregister_all_addon_hooks(self.addon_name)
            
            # Nettoyer les ressources
            if self.mcp_client:
                await self.mcp_client.cleanup()
            
            self.logger.info("Nettoyage du serveur MCP terminé")
            
        except Exception as e:
            self.logger.error(f"Erreur lors du nettoyage: {e}")
    
    # Méthodes privées
    
    def _load_config(self) -> Dict[str, Any]:
        """Charge la configuration depuis le manifest et les fichiers de config"""
        config = {
            "server": {
                "host": "localhost",
                "port": 8080,
                "max_connections": 10,
                "timeout": 30
            },
            "security": {
                "enable_ssl": False,
                "validate_certificates": True,
                "allowed_origins": ["*"],
                "rate_limit": {
                    "enabled": True,
                    "requests_per_minute": 60
                }
            },
            "logging": {
                "level": "INFO",
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
            },
            "resources": {
                "base_path": str(Path(__file__).parent.parent.parent),
                "allowed_extensions": [".json", ".txt", ".md", ".yaml", ".yml"]
            }
        }
        
        # Charger la configuration depuis le manifest si disponible
        if 'metadata' in self.context:
            metadata = self.context['metadata']
            if 'server_config' in metadata:
                config.update(metadata['server_config'])
        
        return config
    
    async def _register_hooks(self) -> None:
        """Enregistre les hooks système"""
        try:
            # Hook de pré-traitement
            await self.hook_manager.register_hook(
                self.addon_name,
                'pre_processing',
                self._pre_processing_hook,
                HookPriority.HIGH,
                {'description': 'Validation avant traitement MCP'}
            )
            
            # Hook de post-traitement
            await self.hook_manager.register_hook(
                self.addon_name,
                'post_processing',
                self._post_processing_hook,
                HookPriority.NORMAL,
                {'description': 'Log après traitement MCP'}
            )
            
            # Hook de sécurité
            await self.hook_manager.register_hook(
                self.addon_name,
                'security_check',
                self._security_check_hook,
                HookPriority.HIGHEST,
                {'description': 'Vérification de sécurité pour les requêtes MCP'}
            )
            
            self.logger.info(f"Enregistrement de {len(self.hook_manager.hooks)} hooks terminé")
            
        except Exception as e:
            self.logger.error(f"Erreur lors de l'enregistrement des hooks: {e}")
    
    async def _validate_permissions(self) -> None:
        """Valide les permissions requises"""
        try:
            required_permissions = [
                ('network_access', PermissionLevel.EXECUTE),
                ('file_system_read', PermissionLevel.READ),
                ('file_system_write', PermissionLevel.WRITE),
                ('system_info_access', PermissionLevel.READ)
            ]
            
            for permission, level in required_permissions:
                if not await self.permission_manager.check_permission(
                    self.addon_name, 
                    permission, 
                    level, 
                    PermissionScope.SESSION
                ):
                    self.logger.warning(f"Permission manquante: {permission}")
            
            self.logger.info("Validation des permissions terminée")
            
        except Exception as e:
            self.logger.error(f"Erreur lors de la validation des permissions: {e}")
    
    # Hooks système
    
    async def _pre_processing_hook(self, *args, **kwargs) -> None:
        """Hook de pré-traitement"""
        self.logger.debug("Démarrage du pré-traitement MCP")
        # TODO: Implémenter la logique de pré-traitement
    
    async def _post_processing_hook(self, *args, **kwargs) -> None:
        """Hook de post-traitement"""
        self.logger.debug("Post-traitement MCP terminé")
        # TODO: Implémenter la logique de post-traitement
    
    async def _security_check_hook(self, *args, **kwargs) -> bool:
        """Hook de vérification de sécurité"""
        self.logger.debug("Vérification de sécurité MCP")
        # TODO: Implémenter la vérification de sécurité
        return True


# Point d'entrée pour le gestionnaire d'addons
async def initialize(context: Dict[str, Any]) -> MCPServerAddon:
    """
    Fonction d'initialisation pour le gestionnaire d'addons
    
    Args:
        context: Contexte d'exécution
        
    Returns:
        Instance de l'addon initialisée
    """
    addon = MCPServerAddon(context)
    
    if await addon.initialize():
        return addon
    else:
        raise RuntimeError("Échec de l'initialisation de l'addon MCP Server")


async def cleanup() -> None:
    """Fonction de nettoyage pour le gestionnaire d'addons"""
    pass