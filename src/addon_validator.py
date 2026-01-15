"""
Addon Validator for StoryCore-Engine
Validateur de sécurité et conformité pour les add-ons.
"""

import ast
import hashlib
import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional, Any, Set, Tuple
from dataclasses import dataclass
from enum import Enum

from src.addon_manager import AddonManifest, AddonType


class ValidationSeverity(Enum):
    """Niveaux de sévérité pour les problèmes de validation"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class ValidationIssue:
    """Représente un problème de validation"""
    severity: ValidationSeverity
    category: str
    message: str
    file_path: Optional[Path] = None
    line_number: Optional[int] = None
    suggestion: Optional[str] = None


@dataclass
class ValidationResult:
    """Résultat complet de validation"""
    is_valid: bool
    issues: List[ValidationIssue]
    score: float  # Score de confiance (0-100)
    checksum: str


class CodeAnalyzer(ast.NodeVisitor):
    """Analyseur statique du code Python des add-ons"""

    def __init__(self, source_code: str, file_path: Path):
        self.source_code = source_code
        self.file_path = file_path
        self.issues: List[ValidationIssue] = []
        self.dangerous_imports = {
            'os', 'subprocess', 'sys', 'shutil', 'platform',
            'socket', 'urllib', 'http', 'ftplib', 'telnetlib'
        }
        self.dangerous_functions = {
            'eval', 'exec', 'compile', '__import__',
            'open', 'input', 'raw_input'
        }
        self.allowed_modules = {
            'pathlib', 'json', 'logging', 'asyncio', 'typing',
            'dataclasses', 'enum', 'functools', 'itertools'
        }

    def visit_Import(self, node: ast.Import) -> None:
        """Vérifie les imports directs"""
        for alias in node.names:
            if alias.name in self.dangerous_imports:
                self.issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="security",
                    message=f"Import potentiellement dangereux: {alias.name}",
                    file_path=self.file_path,
                    line_number=node.lineno,
                    suggestion="Utilisez des alternatives sûres ou demandez la permission appropriée"
                ))

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        """Vérifie les imports from"""
        if node.module and node.module in self.dangerous_imports:
            for alias in node.names:
                if alias.name in self.dangerous_functions:
                    self.issues.append(ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="security",
                        message=f"Import de fonction dangereuse: {node.module}.{alias.name}",
                        file_path=self.file_path,
                        line_number=node.lineno,
                        suggestion="Évitez l'usage de fonctions d'exécution dynamique"
                    ))

    def visit_Call(self, node: ast.Call) -> None:
        """Vérifie les appels de fonctions"""
        if isinstance(node.func, ast.Name):
            if node.func.id in self.dangerous_functions:
                self.issues.append(ValidationIssue(
                    severity=ValidationSeverity.CRITICAL,
                    category="security",
                    message=f"Appel de fonction dangereuse: {node.func.id}()",
                    file_path=self.file_path,
                    line_number=node.lineno,
                    suggestion="Supprimez cet appel ou utilisez une alternative sécurisée"
                ))

    def visit_Str(self, node: ast.Str) -> None:
        """Vérifie les chaînes de caractères pour patterns suspects"""
        suspicious_patterns = [
            r'rm\s+-rf\s+/',  # Commandes de suppression dangereuses
            r'format\s*\(.*%.*\)',  # Format strings potentiellement vulnérables
            r'exec\s*\(',  # Exécution de code
            r'eval\s*\('   # Évaluation de code
        ]

        for pattern in suspicious_patterns:
            if re.search(pattern, node.s, re.IGNORECASE):
                self.issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="security",
                    message=f"Pattern potentiellement dangereux dans chaîne: {node.s[:50]}...",
                    file_path=self.file_path,
                    line_number=node.lineno,
                    suggestion="Vérifiez le contenu de cette chaîne"
                ))


class AddonValidator:
    """
    Validateur complet pour les add-ons StoryCore

    Responsabilités:
    - Validation de sécurité du code
    - Vérification de conformité
    - Analyse statique
    - Calcul de score de confiance
    """

    def __init__(self):
        self.logger = logging.getLogger(__name__)

        # Seuils de validation
        self.min_score_threshold = 70.0  # Score minimum pour validation
        self.max_critical_issues = 0     # Nombre max d'issues critiques
        self.max_error_issues = 2        # Nombre max d'issues erreurs

        # Patterns de validation
        self.valid_name_pattern = re.compile(r'^[a-z][a-z0-9_-]*$')
        self.valid_version_pattern = re.compile(r'^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$')

    async def validate_addon(self, manifest: AddonManifest, addon_path: Path) -> ValidationResult:
        """
        Validation complète d'un add-on

        Args:
            manifest: Manifest de l'add-on
            addon_path: Chemin vers l'add-on

        Returns:
            Résultat détaillé de validation
        """
        issues: List[ValidationIssue] = []

        # Validation du manifest
        manifest_issues = await self._validate_manifest(manifest, addon_path)
        issues.extend(manifest_issues)

        # Validation de la structure
        structure_issues = await self._validate_structure(manifest, addon_path)
        issues.extend(structure_issues)

        # Validation du code (si applicable)
        if manifest.type in [AddonType.WORKFLOW, AddonType.PROCESSING, AddonType.MODEL]:
            code_issues = await self._validate_code(manifest, addon_path)
            issues.extend(code_issues)

        # Validation des dépendances
        dependency_issues = await self._validate_dependencies(manifest)
        issues.extend(dependency_issues)

        # Calcul du score et détermination de validité
        score = self._calculate_trust_score(issues)
        is_valid = self._determine_validity(issues, score)

        # Génération du checksum
        checksum = self._generate_checksum(manifest, addon_path, issues)

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            score=score,
            checksum=checksum
        )

    async def _validate_manifest(self, manifest: AddonManifest, addon_path: Path) -> List[ValidationIssue]:
        """Validation du manifest"""
        issues = []

        # Validation du nom
        if not self.valid_name_pattern.match(manifest.name):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category="manifest",
                message=f"Nom d'add-on invalide: {manifest.name}",
                suggestion="Utilisez uniquement lettres minuscules, chiffres, tirets et underscores"
            ))

        # Validation de la version
        if not self.valid_version_pattern.match(manifest.version):
            issues.append(ValidationIssue(
                severity=ValidationSeverity.ERROR,
                category="manifest",
                message=f"Version invalide: {manifest.version}",
                suggestion="Utilisez le format sémantique: x.y.z ou x.y.z-suffix"
            ))

        # Validation de la description
        if len(manifest.description) < 10:
            issues.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category="manifest",
                message="Description trop courte",
                suggestion="Fournissez une description plus détaillée (min 10 caractères)"
            ))

        # Validation des permissions
        valid_permissions = {
            "model_access", "file_system_read", "file_system_write",
            "network_access", "ui_access", "config_access",
            "database_access", "system_info_access"
        }

        for permission in manifest.permissions:
            if permission not in valid_permissions:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="manifest",
                    message=f"Permission inconnue: {permission}",
                    suggestion=f"Permissions valides: {', '.join(valid_permissions)}"
                ))

        # Validation de compatibilité
        if "engine_version" in manifest.compatibility:
            # TODO: Vérifier contre la version actuelle du moteur
            pass

        return issues

    async def _validate_structure(self, manifest: AddonManifest, addon_path: Path) -> List[ValidationIssue]:
        """Validation de la structure des fichiers"""
        issues = []

        required_dirs = ["src"]
        required_files = ["addon.json"]

        # Vérification des répertoires requis
        for dir_name in required_dirs:
            dir_path = addon_path / dir_name
            if not dir_path.exists():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="structure",
                    message=f"Répertoire manquant: {dir_name}/",
                    suggestion=f"Créez le répertoire {dir_name}/ dans votre add-on"
                ))

        # Vérification des fichiers requis
        for file_name in required_files:
            file_path = addon_path / file_name
            if not file_path.exists():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.CRITICAL,
                    category="structure",
                    message=f"Fichier requis manquant: {file_name}",
                    suggestion="Assurez-vous que tous les fichiers requis sont présents"
                ))

        # Validation des entry points
        for entry_name, entry_path in manifest.entry_points.items():
            full_path = addon_path / entry_path
            if not full_path.exists():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="structure",
                    message=f"Entry point manquant: {entry_path}",
                    suggestion=f"Vérifiez que le fichier {entry_path} existe"
                ))
            elif not full_path.is_file():
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="structure",
                    message=f"Entry point n'est pas un fichier: {entry_path}",
                    suggestion="Les entry points doivent être des fichiers"
                ))

        # Vérification des fichiers Python dans src/
        src_dir = addon_path / "src"
        if src_dir.exists():
            for py_file in src_dir.rglob("*.py"):
                # Vérification de base du fichier Python
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    ast.parse(content)  # Validation syntaxique
                except SyntaxError as e:
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="code",
                        message=f"Erreur de syntaxe Python: {e.msg}",
                        file_path=py_file,
                        line_number=e.lineno,
                        suggestion="Corrigez l'erreur de syntaxe"
                    ))
                except Exception as e:
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.WARNING,
                        category="code",
                        message=f"Erreur lors de la lecture du fichier: {e}",
                        file_path=py_file,
                        suggestion="Vérifiez que le fichier est lisible"
                    ))

        return issues

    async def _validate_code(self, manifest: AddonManifest, addon_path: Path) -> List[ValidationIssue]:
        """Validation du code Python"""
        issues = []

        # Analyser les fichiers Python
        src_dir = addon_path / "src"
        if src_dir.exists():
            for py_file in src_dir.rglob("*.py"):
                try:
                    with open(py_file, 'r', encoding='utf-8') as f:
                        source_code = f.read()

                    # Analyseur statique
                    analyzer = CodeAnalyzer(source_code, py_file)
                    tree = ast.parse(source_code)
                    analyzer.visit(tree)

                    issues.extend(analyzer.issues)

                except Exception as e:
                    issues.append(ValidationIssue(
                        severity=ValidationSeverity.ERROR,
                        category="code",
                        message=f"Erreur lors de l'analyse du code: {e}",
                        file_path=py_file,
                        suggestion="Vérifiez la syntaxe et la structure du fichier"
                    ))

        return issues

    async def _validate_dependencies(self, manifest: AddonManifest) -> List[ValidationIssue]:
        """Validation des dépendances"""
        issues = []

        # Liste des dépendances potentiellement dangereuses
        risky_deps = {
            "requests": "Considérez utiliser aiohttp pour la compatibilité async",
            "urllib3": "Préférez les bibliothèques async natives",
            "subprocess": "Opérations système limitées",
            "os": "Accès système restreint"
        }

        for dep, version_req in manifest.dependencies.items():
            if dep in risky_deps:
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category="dependencies",
                    message=f"Dépendance potentiellement risquée: {dep}",
                    suggestion=risky_deps[dep]
                ))

            # Validation du format de version
            if not self._validate_version_requirement(version_req):
                issues.append(ValidationIssue(
                    severity=ValidationSeverity.ERROR,
                    category="dependencies",
                    message=f"Format de version invalide pour {dep}: {version_req}",
                    suggestion="Utilisez des spécificateurs PEP 508 valides"
                ))

        return issues

    def _validate_version_requirement(self, version_req: str) -> bool:
        """Validation basique des exigences de version"""
        # Patterns simples pour les spécificateurs de version courants
        patterns = [
            r'^==\d+\.\d+\.\d+.*$',  # ==1.0.0
            r'^>=\d+\.\d+\.\d+.*$',  # >=1.0.0
            r'^>\d+\.\d+\.\d+.*$',   # >1.0.0
            r'^<=\d+\.\d+\.\d+.*$',  # <=1.0.0
            r'^<\d+\.\d+\.\d+.*$',   # <1.0.0
            r'^\d+\.\d+\.\d+.*$'     # 1.0.0 (implicite ==)
        ]

        return any(re.match(pattern, version_req) for pattern in patterns)

    def _calculate_trust_score(self, issues: List[ValidationIssue]) -> float:
        """Calcule un score de confiance basé sur les issues"""
        if not issues:
            return 100.0

        # Pondération par sévérité
        weights = {
            ValidationSeverity.INFO: 1,
            ValidationSeverity.WARNING: 5,
            ValidationSeverity.ERROR: 20,
            ValidationSeverity.CRITICAL: 50
        }

        total_penalty = sum(weights[issue.severity] for issue in issues)
        score = max(0, 100 - total_penalty)

        return score

    def _determine_validity(self, issues: List[ValidationIssue], score: float) -> bool:
        """Détermine si l'add-on est valide"""
        if score < self.min_score_threshold:
            return False

        # Compter les issues par sévérité
        critical_count = sum(1 for issue in issues if issue.severity == ValidationSeverity.CRITICAL)
        error_count = sum(1 for issue in issues if issue.severity == ValidationSeverity.ERROR)

        if critical_count > self.max_critical_issues:
            return False

        if error_count > self.max_error_issues:
            return False

        return True

    def _generate_checksum(self, manifest: AddonManifest, addon_path: Path, issues: List[ValidationIssue]) -> str:
        """Génère un checksum pour l'add-on"""
        # Créer une chaîne représentative de l'état de l'add-on
        checksum_data = {
            "name": manifest.name,
            "version": manifest.version,
            "files": {},
            "issues_count": len(issues)
        }

        # Inclure les checksums des fichiers principaux
        important_files = ["addon.json"]
        if "main" in manifest.entry_points:
            important_files.append(manifest.entry_points["main"])

        for file_name in important_files:
            file_path = addon_path / file_name
            if file_path.exists():
                with open(file_path, 'rb') as f:
                    file_hash = hashlib.sha256(f.read()).hexdigest()
                checksum_data["files"][file_name] = file_hash

        # Générer le checksum final
        checksum_str = json.dumps(checksum_data, sort_keys=True)
        return hashlib.sha256(checksum_str.encode()).hexdigest()

    def get_validation_report(self, result: ValidationResult) -> str:
        """Génère un rapport de validation lisible"""
        report = f"""
Validation Report for Add-on
{'='*50}
Valid: {result.is_valid}
Score: {result.score:.1f}/100
Checksum: {result.checksum[:16]}...

Issues Found: {len(result.issues)}
"""

        if result.issues:
            report += "\nIssues:\n"
            for i, issue in enumerate(result.issues, 1):
                report += f"{i}. [{issue.severity.value.upper()}] {issue.category}: {issue.message}\n"
                if issue.file_path:
                    report += f"   File: {issue.file_path}\n"
                if issue.line_number:
                    report += f"   Line: {issue.line_number}\n"
                if issue.suggestion:
                    report += f"   Suggestion: {issue.suggestion}\n"
                report += "\n"

        return report
