"""
MCP Validators for StoryCore Engine
Validateurs de sécurité et de conformité pour le serveur MCP.
"""

import asyncio
import json
import re
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass
from enum import Enum


class ValidationSeverity(Enum):
    """Niveaux de sévérité pour les problèmes de validation"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationResult:
    """Résultat de validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    info: List[str]
    score: float


@dataclass
class SecurityCheck:
    """Résultat d'une vérification de sécurité"""
    passed: bool
    issues: List[str]
    recommendations: List[str]


class MCPValidator:
    """
    Validateur complet pour les messages et configurations MCP
    
    Responsabilités:
    - Validation des messages JSON-RPC 2.0
    - Vérification de sécurité
    - Validation des ressources et outils
    - Gestion des quotas et limites
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialise le validateur MCP
        
        Args:
            config: Configuration du validateur
        """
        self.config = config
        self.security_config = config.get('security', {})
        
        # Patterns de validation
        self.jsonrpc_pattern = re.compile(r'^2\.0$')
        self.uri_pattern = re.compile(r'^[a-zA-Z][a-zA-Z0-9+.-]*://.+$')
        self.method_pattern = re.compile(r'^[a-zA-Z][a-zA-Z0-9_/-]*$')
        
        # Limites de sécurité
        self.max_request_size = config.get('max_request_size', 1024 * 1024)  # 1MB
        self.max_response_size = config.get('max_response_size', 10 * 1024 * 1024)  # 10MB
        self.rate_limit = self.security_config.get('rate_limit', {})
        
        # Statistiques
        self.validation_stats = {
            'total_validations': 0,
            'passed_validations': 0,
            'failed_validations': 0,
            'security_checks': 0
        }
    
    def validate_message(self, message: str) -> bool:
        """
        Valide un message JSON-RPC entrant
        
        Args:
            message: Message JSON à valider
            
        Returns:
            True si le message est valide
        """
        try:
            # Vérifier la taille du message
            if len(message) > self.max_request_size:
                self.validation_stats['failed_validations'] += 1
                return False
            
            # Parser le JSON
            message_data = json.loads(message)
            
            # Valider la structure JSON-RPC
            if not self._validate_jsonrpc_structure(message_data):
                self.validation_stats['failed_validations'] += 1
                return False
            
            # Valider le contenu spécifique
            if not self._validate_message_content(message_data):
                self.validation_stats['failed_validations'] += 1
                return False
            
            # Vérifier la sécurité
            security_result = self._validate_security(message_data)
            if not security_result.passed:
                self.validation_stats['failed_validations'] += 1
                return False
            
            self.validation_stats['passed_validations'] += 1
            self.validation_stats['total_validations'] += 1
            return True
            
        except json.JSONDecodeError:
            self.validation_stats['failed_validations'] += 1
            return False
        except Exception:
            self.validation_stats['failed_validations'] += 1
            return False
    
    def validate_resource_access(self, uri: str, method: str) -> SecurityCheck:
        """
        Valide l'accès à une ressource spécifique
        
        Args:
            uri: URI de la ressource
            method: Méthode d'accès
            
        Returns:
            Résultat de la vérification de sécurité
        """
        issues = []
        recommendations = []
        passed = True
        
        # Vérifier le format de l'URI
        if not self.uri_pattern.match(uri):
            passed = False
            issues.append("Format d'URI invalide")
            recommendations.append("Utilisez un URI valide (ex: file://chemin/fichier.json)")
        
        # Vérifier les schémas autorisés
        allowed_schemes = self.security_config.get('allowed_schemes', ['file', 'http', 'https'])
        scheme = uri.split('://')[0] if '://' in uri else ''
        
        if scheme not in allowed_schemes:
            passed = False
            issues.append(f"Schéma URI non autorisé: {scheme}")
            recommendations.append(f"Schémas autorisés: {', '.join(allowed_schemes)}")
        
        # Vérifier les chemins d'accès
        if scheme == 'file':
            path_issues = self._validate_file_path(uri)
            issues.extend(path_issues['issues'])
            recommendations.extend(path_issues['recommendations'])
            if path_issues['issues']:
                passed = False
        
        # Vérifier les permissions de méthode
        method_permissions = self._validate_method_permissions(method)
        if not method_permissions['allowed']:
            passed = False
            issues.append(f"Méthode non autorisée: {method}")
            recommendations.extend(method_permissions['recommendations'])
        
        self.validation_stats['security_checks'] += 1
        
        return SecurityCheck(
            passed=passed,
            issues=issues,
            recommendations=recommendations
        )
    
    def validate_tool_call(self, tool_name: str, arguments: Dict[str, Any]) -> SecurityCheck:
        """
        Valide un appel d'outil
        
        Args:
            tool_name: Nom de l'outil
            arguments: Arguments de l'outil
            
        Returns:
            Résultat de la vérification de sécurité
        """
        issues = []
        recommendations = []
        passed = True
        
        # Vérifier le nom de l'outil
        if not self.method_pattern.match(tool_name):
            passed = False
            issues.append("Nom d'outil invalide")
            recommendations.append("Utilisez uniquement des caractères alphanumériques, tirets et underscores")
        
        # Vérifier les arguments
        if not isinstance(arguments, dict):
            passed = False
            issues.append("Les arguments doivent être un objet JSON")
            recommendations.append("Fournissez un objet JSON valide pour les arguments")
        
        # Vérifier la taille des arguments
        args_size = len(json.dumps(arguments))
        if args_size > self.max_request_size:
            passed = False
            issues.append("Arguments trop volumineux")
            recommendations.append(f"Limite de taille: {self.max_request_size} octets")
        
        # Vérifier les outils autorisés
        allowed_tools = self.security_config.get('allowed_tools', [])
        if allowed_tools and tool_name not in allowed_tools:
            passed = False
            issues.append(f"Outil non autorisé: {tool_name}")
            recommendations.append(f"Outils autorisés: {', '.join(allowed_tools)}")
        
        self.validation_stats['security_checks'] += 1
        
        return SecurityCheck(
            passed=passed,
            issues=issues,
            recommendations=recommendations
        )
    
    def validate_configuration(self, config: Dict[str, Any]) -> ValidationResult:
        """
        Valide une configuration complète
        
        Args:
            config: Configuration à valider
            
        Returns:
            Résultat de validation détaillé
        """
        errors = []
        warnings = []
        info = []
        
        # Valider la configuration de base
        if 'server' not in config:
            errors.append("Section 'server' manquante")
        
        if 'security' not in config:
            warnings.append("Section 'security' manquante")
        
        # Valider la configuration du serveur
        server_config = config.get('server', {})
        if 'host' not in server_config:
            warnings.append("Configuration 'host' manquante, utilisation de 'localhost' par défaut")
        
        if 'port' not in server_config:
            warnings.append("Configuration 'port' manquante, utilisation de 8080 par défaut")
        
        # Valider la configuration de sécurité
        security_config = config.get('security', {})
        if 'allowed_schemes' not in security_config:
            warnings.append("Configuration 'allowed_schemes' manquante")
        
        if 'allowed_tools' not in security_config:
            warnings.append("Configuration 'allowed_tools' manquante")
        
        # Valider les limites
        limits = config.get('limits', {})
        if 'max_connections' in limits:
            if not isinstance(limits['max_connections'], int) or limits['max_connections'] <= 0:
                errors.append("max_connections doit être un entier positif")
        
        if 'timeout' in limits:
            if not isinstance(limits['timeout'], (int, float)) or limits['timeout'] <= 0:
                errors.append("timeout doit être un nombre positif")
        
        # Calculer le score de validation
        total_issues = len(errors) + len(warnings) + len(info)
        score = max(0, 100 - (len(errors) * 10 + len(warnings) * 5))
        
        is_valid = len(errors) == 0
        
        self.validation_stats['total_validations'] += 1
        if is_valid:
            self.validation_stats['passed_validations'] += 1
        else:
            self.validation_stats['failed_validations'] += 1
        
        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            info=info,
            score=score
        )
    
    def get_validation_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques de validation"""
        return {
            **self.validation_stats,
            'success_rate': (
                self.validation_stats['passed_validations'] / 
                max(1, self.validation_stats['total_validations'])
            ) * 100
        }
    
    # Méthodes privées
    
    def _validate_jsonrpc_structure(self, message_data: Dict[str, Any]) -> bool:
        """Valide la structure JSON-RPC"""
        # Vérifier le champ jsonrpc
        if 'jsonrpc' not in message_data:
            return False
        
        if not self.jsonrpc_pattern.match(str(message_data['jsonrpc'])):
            return False
        
        # Vérifier le champ method
        if 'method' not in message_data:
            return False
        
        method = str(message_data['method'])
        if not self.method_pattern.match(method):
            return False
        
        # Vérifier les champs optionnels
        if 'params' in message_data and message_data['params'] is not None:
            if not isinstance(message_data['params'], (dict, list)):
                return False
        
        if 'id' in message_data and message_data['id'] is not None:
            if not isinstance(message_data['id'], (str, int)):
                return False
        
        return True
    
    def _validate_message_content(self, message_data: Dict[str, Any]) -> bool:
        """Valide le contenu spécifique du message"""
        method = message_data['method']
        
        # Valider les paramètres selon la méthode
        if method in ['resources/read', 'resources/list']:
            return self._validate_resource_message(message_data)
        elif method in ['tools/call']:
            return self._validate_tool_message(message_data)
        elif method in ['notifications/send']:
            return self._validate_notification_message(message_data)
        
        # Pour les autres méthodes, considérer comme valide
        return True
    
    def _validate_resource_message(self, message_data: Dict[str, Any]) -> bool:
        """Valide un message de ressource"""
        params = message_data.get('params', {})
        
        if message_data['method'] == 'resources/read':
            uri = params.get('uri')
            if not uri or not self.uri_pattern.match(uri):
                return False
        
        return True
    
    def _validate_tool_message(self, message_data: Dict[str, Any]) -> bool:
        """Valide un message d'outil"""
        params = message_data.get('params', {})
        
        tool_name = params.get('name')
        arguments = params.get('arguments', {})
        
        if not tool_name:
            return False
        
        if not isinstance(arguments, dict):
            return False
        
        # Valider l'appel d'outil
        security_check = self.validate_tool_call(tool_name, arguments)
        return security_check.passed
    
    def _validate_notification_message(self, message_data: Dict[str, Any]) -> bool:
        """Valide un message de notification"""
        params = message_data.get('params', {})
        
        level = params.get('level', 'info')
        message = params.get('message', '')
        
        if not isinstance(message, str):
            return False
        
        # Vérifier le niveau de notification
        valid_levels = ['info', 'warning', 'error', 'debug']
        if level not in valid_levels:
            return False
        
        return True
    
    def _validate_security(self, message_data: Dict[str, Any]) -> SecurityCheck:
        """Vérifie la sécurité d'un message"""
        issues = []
        recommendations = []
        passed = True
        
        # Vérifier le taux de requêtes
        if self.rate_limit.get('enabled', False):
            rate_check = self._check_rate_limit()
            if not rate_check.passed:
                passed = False
                issues.extend(rate_check.issues)
                recommendations.extend(rate_check.recommendations)
        
        # Vérifier les méthodes dangereuses
        dangerous_methods = self.security_config.get('dangerous_methods', [])
        if message_data['method'] in dangerous_methods:
            passed = False
            issues.append(f"Méthode dangereuse détectée: {message_data['method']}")
            recommendations.append("Cette méthode est désactivée pour des raisons de sécurité")
        
        # Vérifier les payloads suspects
        payload_check = self._check_suspicious_payload(message_data)
        if not payload_check.passed:
            passed = False
            issues.extend(payload_check.issues)
            recommendations.extend(payload_check.recommendations)
        
        self.validation_stats['security_checks'] += 1
        
        return SecurityCheck(
            passed=passed,
            issues=issues,
            recommendations=recommendations
        )
    
    def _validate_file_path(self, uri: str) -> Dict[str, List[str]]:
        """Valide un chemin de fichier"""
        issues = []
        recommendations = []
        
        try:
            # Extraire le chemin
            if uri.startswith('file://'):
                path = uri[7:]  # Enlever "file://"
            else:
                path = uri
            
            # Vérifier les chemins interdits
            forbidden_paths = self.security_config.get('forbidden_paths', [])
            for forbidden in forbidden_paths:
                if forbidden in path:
                    issues.append(f"Accès à un chemin interdit: {forbidden}")
                    recommendations.append(f"Ce chemin est interdit pour des raisons de sécurité")
                    break
            
            # Vérifier les extensions autorisées
            allowed_extensions = self.security_config.get('allowed_extensions', [])
            if allowed_extensions:
                import os
                _, ext = os.path.splitext(path)
                if ext.lower() not in allowed_extensions:
                    issues.append(f"Extension non autorisée: {ext}")
                    recommendations.append(f"Extensions autorisées: {', '.join(allowed_extensions)}")
            
        except Exception as e:
            issues.append(f"Erreur de validation du chemin: {str(e)}")
            recommendations.append("Vérifiez le format du chemin de fichier")
        
        return {
            'issues': issues,
            'recommendations': recommendations
        }
    
    def _validate_method_permissions(self, method: str) -> Dict[str, Any]:
        """Valide les permissions d'une méthode"""
        method_permissions = self.security_config.get('method_permissions', {})
        
        if method not in method_permissions:
            return {
                'allowed': False,
                'recommendations': ['Configurez les permissions pour cette méthode']
            }
        
        permissions = method_permissions[method]
        if permissions.get('allowed', False):
            return {
                'allowed': True,
                'recommendations': []
            }
        else:
            return {
                'allowed': False,
                'recommendations': permissions.get('recommendations', [])
            }
    
    def _check_rate_limit(self) -> SecurityCheck:
        """Vérifie le taux de requêtes"""
        # Implémentation simplifiée
        issues = []
        recommendations = []
        
        # TODO: Implémenter un vrai système de rate limiting
        # Pour l'instant, toujours passer
        return SecurityCheck(
            passed=True,
            issues=issues,
            recommendations=recommendations
        )
    
    def _check_suspicious_payload(self, message_data: Dict[str, Any]) -> SecurityCheck:
        """Vérifie si le payload est suspect"""
        issues = []
        recommendations = []
        passed = True
        
        # Vérifier les chaînes suspectes
        suspicious_patterns = [
            r'rm\s+-rf\s+',
            r'exec\s*\(',
            r'eval\s*\(',
            r'subprocess\.call',
            r'os\.system'
        ]
        
        def check_string(value: str):
            for pattern in suspicious_patterns:
                if re.search(pattern, value, re.IGNORECASE):
                    issues.append(f"Pattern suspect détecté: {pattern}")
                    recommendations.append("Ce pattern peut être dangereux")
                    return False
            return True
        
        # Vérifier les chaînes dans les paramètres
        params = message_data.get('params', {})
        if isinstance(params, dict):
            for key, value in params.items():
                if isinstance(value, str):
                    if not check_string(value):
                        passed = False
        
        return SecurityCheck(
            passed=passed,
            issues=issues,
            recommendations=recommendations
        )