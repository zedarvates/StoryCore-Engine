#!/usr/bin/env python3
"""
Test Runner for MCP Server Addon
Script de test complet pour l'addon MCP Server.
"""

import asyncio
import sys
import os
import json
import logging
from pathlib import Path

# Ajouter le répertoire source au Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from src.main import MCPServerAddon
from src.mcp_client import MCPClient
from src.validators import MCPValidator
from src.handlers import MCPHandler


class TestRunner:
    """
    Exécuteur de tests pour l'addon MCP Server
    
    Responsabilités:
    - Exécuter les tests unitaires
    - Exécuter les tests d'intégration
    - Générer un rapport de test
    - Valider la conformité
    """
    
    def __init__(self):
        """Initialise l'exécuteur de tests"""
        self.test_results = []
        self.logger = self._setup_logger()
        
        # Configuration de test
        self.test_config = {
            "server": {
                "host": "localhost",
                "port": 8080,
                "timeout": 5,
                "max_connections": 5
            },
            "security": {
                "enabled": True,
                "allowed_schemes": ["file", "http", "https"],
                "allowed_tools": ["file_search", "text_analysis"],
                "forbidden_paths": ["/etc", "/system"],
                "allowed_extensions": [".json", ".txt", ".md"]
            }
        }
    
    def _setup_logger(self) -> logging.Logger:
        """Configure le logger pour les tests"""
        logger = logging.getLogger("mcp_test_runner")
        logger.setLevel(logging.INFO)
        
        # Handler console
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.INFO)
        
        # Formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        console_handler.setFormatter(formatter)
        
        logger.addHandler(console_handler)
        return logger
    
    def run_all_tests(self) -> bool:
        """Exécute tous les tests"""
        self.logger.info("Démarrage des tests pour l'addon MCP Server...")
        
        # Tests unitaires
        unit_tests_passed = self.run_unit_tests()
        
        # Tests d'intégration
        integration_tests_passed = self.run_integration_tests()
        
        # Tests de conformité
        compliance_tests_passed = self.run_compliance_tests()
        
        # Générer le rapport
        self.generate_test_report()
        
        # Retourner le résultat global
        all_passed = unit_tests_passed and integration_tests_passed and compliance_tests_passed
        
        if all_passed:
            self.logger.info("✅ Tous les tests ont réussi!")
        else:
            self.logger.error("❌ Certains tests ont échoué!")
        
        return all_passed
    
    def run_unit_tests(self) -> bool:
        """Exécute les tests unitaires"""
        self.logger.info("Exécution des tests unitaires...")
        
        unit_results = []
        
        # Test du validateur
        unit_results.append(self.test_validator())
        
        # Test du client MCP
        unit_results.append(self.test_mcp_client())
        
        # Test des handlers
        unit_results.append(self.test_handlers())
        
        # Test de l'addon principal
        unit_results.append(self.test_main_addon())
        
        unit_passed = all(unit_results)
        
        if unit_passed:
            self.logger.info("✅ Tests unitaires réussis")
        else:
            self.logger.error("❌ Tests unitaires échoués")
        
        return unit_passed
    
    def run_integration_tests(self) -> bool:
        """Exécute les tests d'intégration"""
        self.logger.info("Exécution des tests d'intégration...")
        
        integration_results = []
        
        # Test du flux de message complet
        integration_results.append(self.test_full_message_flow())
        
        # Test du cycle de vie de l'addon
        integration_results.append(self test_addon_lifecycle())
        
        # Test de la sécurité
        integration_results.append(self.test_security_integration())
        
        integration_passed = all(integration_results)
        
        if integration_passed:
            self.logger.info("✅ Tests d'intégration réussis")
        else:
            self.logger.error("❌ Tests d'intégration échoués")
        
        return integration_passed
    
    def run_compliance_tests(self) -> bool:
        """Exécute les tests de conformité"""
        self.logger.info("Exécution des tests de conformité...")
        
        compliance_results = []
        
        # Test du manifest
        compliance_results.append(self.test_manifest_compliance())
        
        # Test des dépendances
        compliance_results.append(self.test_dependencies_compliance())
        
        # Test de la structure des fichiers
        compliance_results.append(self.test_file_structure_compliance())
        
        compliance_passed = all(compliance_results)
        
        if compliance_passed:
            self.logger.info("✅ Tests de conformité réussis")
        else:
            self.logger.error("❌ Tests de conformité échoués")
        
        return compliance_passed
    
    def test_validator(self) -> bool:
        """Test du validateur MCP"""
        try:
            validator = MCPValidator(self.test_config)
            
            # Test de validation de message valide
            valid_message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
            is_valid = validator.validate_message(valid_message)
            
            if not is_valid:
                self.logger.error("Test validateur: Message valide non validé")
                return False
            
            # Test de validation de message invalide
            invalid_message = '{"jsonrpc": "2.0", "method": "exec", "id": "test"}'
            is_valid = validator.validate_message(invalid_message)
            
            if is_valid:
                self.logger.error("Test validateur: Message dangereux validé")
                return False
            
            # Test de validation de ressource
            resource_check = validator.validate_resource_access(
                "file:///test.json", "read"
            )
            
            if not resource_check.passed:
                self.logger.error("Test validateur: Ressource valide non validée")
                return False
            
            self.test_results.append({
                "test": "validator",
                "status": "passed",
                "message": "Validateur MCP fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test validateur échoué: {e}")
            self.test_results.append({
                "test": "validator",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_mcp_client(self) -> bool:
        """Test du client MCP"""
        try:
            logger = logging.getLogger("test_mcp_client")
            client = MCPClient(self.test_config["server"], logger)
            
            # Test de l'initialisation
            if not asyncio.run(client.start()):
                self.logger.error("Test client MCP: Échec du démarrage")
                return False
            
            # Test de l'enregistrement de handler
            test_handler = lambda params: {"result": "test"}
            client.register_handler("test_method", test_handler)
            
            if "test_method" not in client.message_handlers:
                self.logger.error("Test client MCP: Handler non enregistré")
                return False
            
            # Test de l'arrêt
            if not asyncio.run(client.stop()):
                self.logger.error("Test client MCP: Échec de l'arrêt")
                return False
            
            self.test_results.append({
                "test": "mcp_client",
                "status": "passed",
                "message": "Client MCP fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test client MCP échoué: {e}")
            self.test_results.append({
                "test": "mcp_client",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_handlers(self) -> bool:
        """Test des handlers MCP"""
        try:
            # Créer les mocks
            mock_client = Mock()
            mock_validator = Mock()
            mock_validator.validate_message = Mock(return_value=True)
            
            logger = logging.getLogger("test_handlers")
            handler = MCPHandler(mock_client, mock_validator, logger)
            
            # Test du handler ping
            ping_result = asyncio.run(handler._handle_ping({}))
            
            if ping_result.get("status") != "pong":
                self.logger.error("Test handlers: Ping handler incorrect")
                return False
            
            # Test du listing d'outils
            tools_result = asyncio.run(handler._handle_list_tools({}))
            
            if "tools" not in tools_result or len(tools_result["tools"]) == 0:
                self.logger.error("Test handlers: Listing d'outils incorrect")
                return False
            
            self.test_results.append({
                "test": "handlers",
                "status": "passed",
                "message": "Handlers MCP fonctionnent correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test handlers échoué: {e}")
            self.test_results.append({
                "test": "handlers",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_main_addon(self) -> bool:
        """Test de l'addon principal"""
        try:
            context = {
                'addon_name': 'test_mcp_server',
                'permissions': ['network_access', 'file_system_read'],
                'metadata': self.test_config
            }
            
            addon = MCPServerAddon(context)
            
            # Test de la configuration
            config = addon._load_config()
            
            if config["server"]["host"] != "localhost":
                self.logger.error("Test addon principal: Configuration incorrecte")
                return False
            
            self.test_results.append({
                "test": "main_addon",
                "status": "passed",
                "message": "Addon principal fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test addon principal échoué: {e}")
            self.test_results.append({
                "test": "main_addon",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_full_message_flow(self) -> bool:
        """Test du flux de message complet"""
        try:
            # Créer les composants
            logger = logging.getLogger("test_message_flow")
            
            mock_validator = Mock()
            mock_validator.validate_message = Mock(return_value=True)
            
            mock_client = Mock()
            mock_handler = MCPHandler(mock_client, mock_validator, logger)
            
            # Simuler un message
            message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
            
            # Traiter le message
            result = asyncio.run(mock_handler.handle_message(message))
            
            # Vérifier le résultat
            if "pong" not in result:
                self.logger.error("Test flux de message: Réponse incorrecte")
                return False
            
            self.test_results.append({
                "test": "full_message_flow",
                "status": "passed",
                "message": "Flux de message fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test flux de message échoué: {e}")
            self.test_results.append({
                "test": "full_message_flow",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_addon_lifecycle(self) -> bool:
        """Test du cycle de vie de l'addon"""
        try:
            context = {
                'addon_name': 'test_lifecycle',
                'permissions': ['network_access', 'file_system_read'],
                'metadata': self.test_config
            }
            
            addon = MCPServerAddon(context)
            
            # Mock des dépendances
            addon.mcp_client = Mock()
            addon.mcp_client.start = Mock(return_value=True)
            addon.mcp_client.stop = Mock()
            
            addon.mcp_handler = Mock()
            addon.validator = Mock()
            
            addon.hook_manager = Mock()
            addon.hook_manager.execute_hook = Mock()
            
            addon.permission_manager = Mock()
            addon.permission_manager.check_permission = Mock(return_value=True)
            
            # Tester le cycle de vie
            # 1. Initialisation
            if not asyncio.run(addon.initialize()):
                self.logger.error("Test cycle de vie: Échec de l'initialisation")
                return False
            
            # 2. Démarrage
            if not asyncio.run(addon.start()):
                self.logger.error("Test cycle de vie: Échec du démarrage")
                return False
            
            # 3. Arrêt
            if not asyncio.run(addon.stop()):
                self.logger.error("Test cycle de vie: Échec de l'arrêt")
                return False
            
            self.test_results.append({
                "test": "addon_lifecycle",
                "status": "passed",
                "message": "Cycle de vie de l'addon fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test cycle de vie échoué: {e}")
            self.test_results.append({
                "test": "addon_lifecycle",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_security_integration(self) -> bool:
        """Test de l'intégration de sécurité"""
        try:
            validator = MCPValidator(self.test_config)
            
            # Test de validation de message dangereux
            dangerous_message = '{"jsonrpc": "2.0", "method": "exec", "params": {"cmd": "rm -rf /"}, "id": "test"}'
            
            if validator.validate_message(dangerous_message):
                self.logger.error("Test sécurité: Message dangereux validé")
                return False
            
            # Test de validation de ressource interdite
            forbidden_resource = validator.validate_resource_access(
                "file:///etc/passwd", "read"
            )
            
            if forbidden_resource.passed:
                self.logger.error("Test sécurité: Ressource interdite autorisée")
                return False
            
            self.test_results.append({
                "test": "security_integration",
                "status": "passed",
                "message": "Intégration de sécurité fonctionne correctement"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test sécurité échoué: {e}")
            self.test_results.append({
                "test": "security_integration",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_manifest_compliance(self) -> bool:
        """Test de conformité du manifest"""
        try:
            manifest_path = Path(__file__).parent / "addon.json"
            
            if not manifest_path.exists():
                self.logger.error("Test conformité: Manifest manquant")
                return False
            
            with open(manifest_path, 'r', encoding='utf-8') as f:
                manifest = json.load(f)
            
            # Vérifier les champs requis
            required_fields = ["name", "version", "type", "author", "description"]
            for field in required_fields:
                if field not in manifest:
                    self.logger.error(f"Test conformité: Champ requis manquant: {field}")
                    return False
            
            # Vérifier le type d'addon
            if manifest["type"] != "processing_addon":
                self.logger.error("Test conformité: Type d'addon incorrect")
                return False
            
            self.test_results.append({
                "test": "manifest_compliance",
                "status": "passed",
                "message": "Manifest conforme"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test conformité du manifest échoué: {e}")
            self.test_results.append({
                "test": "manifest_compliance",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_dependencies_compliance(self) -> bool:
        """Test de conformité des dépendances"""
        try:
            deps_path = Path(__file__).parent / "requirements.json"
            
            if not deps_path.exists():
                self.logger.error("Test conformité: Fichier de dépendances manquant")
                return False
            
            with open(deps_path, 'r', encoding='utf-8') as f:
                deps = json.load(f)
            
            # Vérifier la structure
            if "dependencies" not in deps:
                self.logger.error("Test conformité: Section dependencies manquante")
                return False
            
            # Vérifier les dépendances requises
            required_deps = ["asyncio", "json-rpc"]
            for dep in required_deps:
                if dep not in deps["dependencies"]:
                    self.logger.error(f"Test conformité: Dépendance requise manquante: {dep}")
                    return False
            
            self.test_results.append({
                "test": "dependencies_compliance",
                "status": "passed",
                "message": "Dépendances conformes"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test conformité des dépendances échoué: {e}")
            self.test_results.append({
                "test": "dependencies_compliance",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def test_file_structure_compliance(self) -> bool:
        """Test de conformité de la structure des fichiers"""
        try:
            addon_path = Path(__file__).parent
            
            # Vérifier les fichiers requis
            required_files = [
                "addon.json",
                "requirements.json",
                "src/main.py",
                "src/mcp_client.py",
                "src/handlers.py",
                "src/validators.py",
                "tests/__init__.py",
                "tests/test_main.py",
                "tests/test_mcp_client.py",
                "tests/test_handlers.py",
                "tests/test_validators.py"
            ]
            
            for file_path in required_files:
                full_path = addon_path / file_path
                if not full_path.exists():
                    self.logger.error(f"Test conformité: Fichier manquant: {file_path}")
                    return False
            
            self.test_results.append({
                "test": "file_structure_compliance",
                "status": "passed",
                "message": "Structure des fichiers conforme"
            })
            
            return True
            
        except Exception as e:
            self.logger.error(f"Test conformité de la structure échoué: {e}")
            self.test_results.append({
                "test": "file_structure_compliance",
                "status": "failed",
                "message": f"Exception: {str(e)}"
            })
            return False
    
    def generate_test_report(self) -> None:
        """Génère un rapport de test"""
        report_path = Path(__file__).parent / "test_report.json"
        
        report = {
            "test_timestamp": str(asyncio.get_event_loop().time()),
            "total_tests": len(self.test_results),
            "passed_tests": len([r for r in self.test_results if r["status"] == "passed"]),
            "failed_tests": len([r for r in self.test_results if r["status"] == "failed"]),
            "test_results": self.test_results
        }
        
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Rapport de test généré: {report_path}")


# Mock pour les tests
class Mock:
    """Mock de base pour les tests"""
    pass


if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all_tests()
    
    if success:
        print("\n🎉 Tous les tests ont réussi! L'addon MCP Server est prêt pour la production.")
        sys.exit(0)
    else:
        print("\n💥 Certains tests ont échoué. Veuillez corriger les problèmes avant de déployer.")
        sys.exit(1)