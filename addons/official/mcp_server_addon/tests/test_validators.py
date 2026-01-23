"""
Tests for MCP Validators Module
Tests unitaires pour le module validateurs MCP.
"""

import json
import pytest
from unittest.mock import Mock, patch

from src.validators import (
    MCPValidator, ValidationResult, SecurityCheck, ValidationSeverity
)


class TestMCPValidator:
    """Tests pour la classe MCPValidator"""
    
    @pytest.fixture
    def config(self):
        """Configuration de test pour le validateur"""
        return {
            "max_request_size": 1024 * 1024,  # 1MB
            "max_response_size": 10 * 1024 * 1024,  # 10MB
            "security": {
                "enabled": True,
                "rate_limit": {"enabled": True, "requests_per_minute": 60},
                "allowed_schemes": ["file", "http", "https"],
                "allowed_tools": ["file_search", "text_analysis"],
                "forbidden_paths": ["/etc", "/system"],
                "allowed_extensions": [".json", ".txt", ".md"],
                "dangerous_methods": ["exec", "eval"],
                "method_permissions": {
                    "dangerous_method": {
                        "allowed": False,
                        "recommendations": ["Cette méthode est interdite"]
                    }
                }
            }
        }
    
    @pytest.fixture
    def validator(self, config):
        """Validateur MCP pour les tests"""
        return MCPValidator(config)
    
    def test_validate_message_valid(self, validator):
        """Test de la validation d'un message valide"""
        # Message JSON-RPC valide
        message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"}'
        
        # Exécuter le test
        result = validator.validate_message(message)
        
        # Vérifier les résultats
        assert result is True
        assert validator.validation_stats['total_validations'] == 1
        assert validator.validation_stats['passed_validations'] == 1
    
    def test_validate_message_invalid_json(self, validator):
        """Test de la validation d'un message JSON invalide"""
        # Message JSON invalide
        message = '{"jsonrpc": "2.0", "method": "ping", "id": "test"'
        
        # Exécuter le test
        result = validator.validate_message(message)
        
        # Vérifier les résultats
        assert result is False
        assert validator.validation_stats['failed_validations'] == 1
    
    def test_validate_message_too_large(self, validator):
        """Test de la validation d'un message trop volumineux"""
        # Créer un message trop volumineux
        large_message = '{"jsonrpc": "2.0", "method": "test", "id": "test"}' * (1024 * 1024 + 1)
        
        # Exécuter le test
        result = validator.validate_message(large_message)
        
        # Vérifier les résultats
        assert result is False
        assert validator.validation_stats['failed_validations'] == 1
    
    def test_validate_message_invalid_structure(self, validator):
        """Test de la validation d'un message avec structure invalide"""
        # Message sans méthode
        message = '{"jsonrpc": "2.0", "id": "test"}'
        
        # Exécuter le test
        result = validator.validate_message(message)
        
        # Vérifier les résultats
        assert result is False
    
    def test_validate_message_dangerous_method(self, validator):
        """Test de la validation d'un message avec méthode dangereuse"""
        # Message avec méthode dangereuse
        message = '{"jsonrpc": "2.0", "method": "exec", "id": "test"}'
        
        # Exécuter le test
        result = validator.validate_message(message)
        
        # Vérifier les résultats
        assert result is False
    
    def test_validate_resource_access_valid(self, validator):
        """Test de la validation d'accès à une ressource valide"""
        # URI valide
        uri = "file:///path/to/file.json"
        method = "read"
        
        # Exécuter le test
        result = validator.validate_resource_access(uri, method)
        
        # Vérifier les résultats
        assert result.passed is True
        assert len(result.issues) == 0
    
    def test_validate_resource_access_invalid_uri(self, validator):
        """Test de la validation d'accès à une ressource avec URI invalide"""
        # URI invalide
        uri = "invalid-uri"
        method = "read"
        
        # Exécuter le test
        result = validator.validate_resource_access(uri, method)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Format d'URI invalide" in result.issues[0]
    
    def test_validate_resource_access_forbidden_path(self, validator):
        """Test de la validation d'accès à une ressource avec chemin interdit"""
        # URI avec chemin interdit
        uri = "file:///etc/passwd"
        method = "read"
        
        # Exécuter le test
        result = validator.validate_resource_access(uri, method)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Accès à un chemin interdit" in result.issues[0]
    
    def test_validate_resource_access_unallowed_extension(self, validator):
        """Test de la validation d'accès à une ressource avec extension non autorisée"""
        # URI avec extension non autorisée
        uri = "file:///path/to/file.exe"
        method = "read"
        
        # Exécuter le test
        result = validator.validate_resource_access(uri, method)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Extension non autorisée" in result.issues[0]
    
    def test_validate_tool_call_valid(self, validator):
        """Test de la validation d'un appel d'outil valide"""
        # Appel d'outil valide
        tool_name = "file_search"
        arguments = {"pattern": "*.txt"}
        
        # Exécuter le test
        result = validator.validate_tool_call(tool_name, arguments)
        
        # Vérifier les résultats
        assert result.passed is True
        assert len(result.issues) == 0
    
    def test_validate_tool_call_invalid_name(self, validator):
        """Test de la validation d'un appel d'outil avec nom invalide"""
        # Nom d'outil invalide
        tool_name = "invalid-tool-name!"
        arguments = {"pattern": "*.txt"}
        
        # Exécuter le test
        result = validator.validate_tool_call(tool_name, arguments)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Nom d'outil invalide" in result.issues[0]
    
    def test_validate_tool_call_not_allowed(self, validator):
        """Test de la validation d'un appel d'outil non autorisé"""
        # Outil non autorisé
        tool_name = "dangerous_tool"
        arguments = {"pattern": "*.txt"}
        
        # Exécuter le test
        result = validator.validate_tool_call(tool_name, arguments)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Outil non autorisé" in result.issues[0]
    
    def test_validate_tool_call_invalid_arguments(self, validator):
        """Test de la validation d'un appel d'outil avec arguments invalides"""
        # Arguments invalides
        tool_name = "file_search"
        arguments = "not_a_dict"
        
        # Exécuter le test
        result = validator.validate_tool_call(tool_name, arguments)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Les arguments doivent être un objet JSON" in result.issues[0]
    
    def test_validate_configuration_valid(self, validator):
        """Test de la validation d'une configuration valide"""
        # Configuration valide
        config = {
            "server": {
                "host": "localhost",
                "port": 8080
            },
            "security": {
                "allowed_schemes": ["file", "http"],
                "allowed_tools": ["test_tool"]
            }
        }
        
        # Exécuter le test
        result = validator.validate_configuration(config)
        
        # Vérifier les résultats
        assert result.is_valid is True
        assert len(result.errors) == 0
        assert result.score > 0
    
    def test_validate_configuration_missing_sections(self, validator):
        """Test de la validation d'une configuration avec sections manquantes"""
        # Configuration avec sections manquantes
        config = {
            "server": {
                "host": "localhost"
                # Port manquant
            }
            # Section security manquante
        }
        
        # Exécuter le test
        result = validator.validate_configuration(config)
        
        # Vérifier les résultats
        assert result.is_valid is False
        assert len(result.warnings) > 0
        assert "Configuration 'port' manquante" in result.warnings[0]
    
    def test_validate_configuration_invalid_limits(self, validator):
        """Test de la validation d'une configuration avec limites invalides"""
        # Configuration avec limites invalides
        config = {
            "server": {
                "host": "localhost",
                "port": 8080
            },
            "limits": {
                "max_connections": -1,  # Valeur invalide
                "timeout": 0  # Valeur invalide
            }
        }
        
        # Exécuter le test
        result = validator.validate_configuration(config)
        
        # Vérifier les résultats
        assert result.is_valid is False
        assert len(result.errors) > 0
        assert "max_connections doit être un entier positif" in result.errors[0]
    
    def test_get_validation_stats(self, validator):
        """Test de la récupération des statistiques de validation"""
        # Effectuer quelques validations
        validator.validate_message('{"jsonrpc": "2.0", "method": "test", "id": "1"}')
        validator.validate_message('invalid json')
        
        # Récupérer les statistiques
        stats = validator.get_validation_stats()
        
        # Vérifier les résultats
        assert 'total_validations' in stats
        assert 'passed_validations' in stats
        assert 'failed_validations' in stats
        assert 'security_checks' in stats
        assert 'success_rate' in stats
        assert stats['total_validations'] == 2
        assert stats['success_rate'] == 50.0  # 1 réussi sur 2
    
    # Tests des méthodes privées
    
    def test_validate_jsonrpc_structure_valid(self, validator):
        """Test de la validation de structure JSON-RPC valide"""
        # Structure valide
        message_data = {
            "jsonrpc": "2.0",
            "method": "test",
            "params": {"key": "value"},
            "id": "test"
        }
        
        # Exécuter le test
        result = validator._validate_jsonrpc_structure(message_data)
        
        # Vérifier les résultats
        assert result is True
    
    def test_validate_jsonrpc_structure_invalid(self, validator):
        """Test de la validation de structure JSON-RPC invalide"""
        # Structure invalide
        message_data = {
            "jsonrpc": "2.0",
            "method": "test"
            # ID manquant
        }
        
        # Exécuter le test
        result = validator._validate_jsonrpc_structure(message_data)
        
        # Vérifier les résultats
        assert result is False
    
    def test_validate_file_path_valid(self, validator):
        """Test de la validation de chemin de fichier valide"""
        # Chemin valide
        uri = "file:///path/to/file.json"
        
        # Exécuter le test
        result = validator._validate_file_path(uri)
        
        # Vérifier les résultats
        assert len(result['issues']) == 0
        assert len(result['recommendations']) == 0
    
    def test_validate_file_path_forbidden(self, validator):
        """Test de la validation de chemin de fichier interdit"""
        # Chemin interdit
        uri = "file:///etc/passwd"
        
        # Exécuter le test
        result = validator._validate_file_path(uri)
        
        # Vérifier les résultats
        assert len(result['issues']) > 0
        assert "Accès à un chemin interdit" in result['issues'][0]
    
    def test_validate_file_path_unallowed_extension(self, validator):
        """Test de la validation de chemin de fichier avec extension non autorisée"""
        # Extension non autorisée
        uri = "file:///path/to/file.exe"
        
        # Exécuter le test
        result = validator._validate_file_path(uri)
        
        # Vérifier les résultats
        assert len(result['issues']) > 0
        assert "Extension non autorisée" in result['issues'][0]
    
    def test_check_suspicious_payload_valid(self, validator):
        """Test de la vérification de payload suspect valide"""
        # Payload valide
        message_data = {
            "jsonrpc": "2.0",
            "method": "test",
            "params": {"normal": "value"}
        }
        
        # Exécuter le test
        result = validator._check_suspicious_payload(message_data)
        
        # Vérifier les résultats
        assert result.passed is True
        assert len(result.issues) == 0
    
    def test_check_suspicious_payload_dangerous(self, validator):
        """Test de la vérification de payload suspect dangereux"""
        # Payload dangereux
        message_data = {
            "jsonrpc": "2.0",
            "method": "test",
            "params": {"command": "rm -rf /"}
        }
        
        # Exécuter le test
        result = validator._check_suspicious_payload(message_data)
        
        # Vérifier les résultats
        assert result.passed is False
        assert len(result.issues) > 0
        assert "Pattern suspect détecté" in result.issues[0]


class TestValidationResult:
    """Tests pour la classe ValidationResult"""
    
    def test_validation_result_creation(self):
        """Test de la création d'un résultat de validation"""
        # Créer un résultat
        result = ValidationResult(
            is_valid=True,
            errors=[],
            warnings=[],
            info=[],
            score=100.0
        )
        
        # Vérifier les attributs
        assert result.is_valid is True
        assert result.errors == []
        assert result.warnings == []
        assert result.info == []
        assert result.score == 100.0
    
    def test_validation_result_with_issues(self):
        """Test d'un résultat de validation avec problèmes"""
        # Créer un résultat avec problèmes
        result = ValidationResult(
            is_valid=False,
            errors=["Erreur critique"],
            warnings=["Avertissement"],
            info=["Information"],
            score=50.0
        )
        
        # Vérifier les attributs
        assert result.is_valid is False
        assert len(result.errors) == 1
        assert len(result.warnings) == 1
        assert len(result.info) == 1
        assert result.score == 50.0


class TestSecurityCheck:
    """Tests pour la classe SecurityCheck"""
    
    def test_security_check_passed(self):
        """Test d'une vérification de sécurité réussie"""
        # Créer une vérification réussie
        check = SecurityCheck(
            passed=True,
            issues=[],
            recommendations=[]
        )
        
        # Vérifier les attributs
        assert check.passed is True
        assert len(check.issues) == 0
        assert len(check.recommendations) == 0
    
    def test_security_check_failed(self):
        """Test d'une vérification de sécurité échouée"""
        # Créer une vérification échouée
        check = SecurityCheck(
            passed=False,
            issues=["Problème de sécurité"],
            recommendations=["Solution proposée"]
        )
        
        # Vérifier les attributs
        assert check.passed is False
        assert len(check.issues) == 1
        assert len(check.recommendations) == 1


if __name__ == '__main__':
    pytest.main([__file__, '-v'])