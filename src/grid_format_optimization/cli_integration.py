"""
Intégration CLI pour l'optimisation des formats de grille.
Étend le CLI StoryCore existant avec les fonctionnalités d'optimisation.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, Optional

from .grid_format_optimizer import GridFormatOptimizer
from .types import GridFormat, FormatPreferences, OptimizationConfig
from .exceptions import GridFormatError


class GridFormatOptimizationCLI:
    """Interface CLI pour l'optimisation des formats de grille."""
    
    def __init__(self):
        """Initialise l'interface CLI."""
        self.optimizer = GridFormatOptimizer()
    
    def add_optimization_commands(self, parser: argparse.ArgumentParser) -> None:
        """
        Ajoute les commandes d'optimisation au parser CLI existant.
        
        Args:
            parser: Parser argparse principal de StoryCore
        """
        # Sous-commande pour l'optimisation des formats
        subparsers = parser.add_subparser if hasattr(parser, 'add_subparser') else parser.add_subparsers()
        
        # Commande principale d'optimisation
        optimize_parser = subparsers.add_parser(
            "optimize-format",
            help="Optimise le format de grille pour un projet"
        )
        optimize_parser.add_argument(
            "--project", 
            default=".", 
            help="Répertoire du projet (défaut: répertoire courant)"
        )
        optimize_parser.add_argument(
            "--analyze-only",
            action="store_true",
            help="Analyse seulement, sans appliquer les recommandations"
        )
        optimize_parser.add_argument(
            "--format",
            choices=["3x3", "1x2", "1x3", "1x4"],
            help="Force un format spécifique (ignore l'analyse automatique)"
        )
        optimize_parser.add_argument(
            "--quality-threshold",
            type=float,
            default=75.0,
            help="Seuil minimum de qualité (0-100, défaut: 75)"
        )
        optimize_parser.add_argument(
            "--max-time",
            type=float,
            help="Temps maximum de traitement en secondes"
        )
        optimize_parser.add_argument(
            "--export-report",
            help="Chemin pour exporter le rapport d'analyse"
        )
        optimize_parser.set_defaults(func=self.handle_optimize_format)
        
        # Commande de validation de format
        validate_parser = subparsers.add_parser(
            "validate-format",
            help="Valide la compatibilité d'un format"
        )
        validate_parser.add_argument(
            "format_spec",
            help="Spécification du format à valider (ex: 1x3)"
        )
        validate_parser.set_defaults(func=self.handle_validate_format)
        
        # Commande d'analyse de contenu
        analyze_parser = subparsers.add_parser(
            "analyze-content",
            help="Analyse le contenu d'un projet pour recommandation de format"
        )
        analyze_parser.add_argument(
            "--project",
            default=".",
            help="Répertoire du projet (défaut: répertoire courant)"
        )
        analyze_parser.add_argument(
            "--detailed",
            action="store_true",
            help="Affichage détaillé de l'analyse"
        )
        analyze_parser.set_defaults(func=self.handle_analyze_content)
    
    def handle_optimize_format(self, args: argparse.Namespace) -> int:
        """
        Gère la commande d'optimisation de format.
        
        Args:
            args: Arguments de la ligne de commande
            
        Returns:
            int: Code de sortie (0 = succès, 1 = erreur)
        """
        try:
            project_path = Path(args.project)
            
            # Chargement du projet
            project_data = self._load_project_data(project_path)
            if not project_data:
                print("✗ Impossible de charger les données du projet")
                return 1
            
            print(f"📊 Analyse du projet: {project_data.get('project_name', 'Sans nom')}")
            
            # Configuration des préférences
            preferences = FormatPreferences(
                preferred_formats=list(GridFormat),
                quality_vs_speed_preference=0.7,
                auto_format_selection=not bool(args.format),
                minimum_quality_threshold=args.quality_threshold,
                maximum_processing_time=args.max_time,
                custom_format_weights={}
            )
            
            # Analyse du contenu
            content_analysis = self.optimizer.analyze_content(project_data)
            
            if args.format:
                # Format forcé
                forced_format = GridFormat(args.format)
                print(f"🎯 Format forcé: {forced_format.value}")
                
                # Validation du format forcé
                validation = self.optimizer.validate_format_compatibility(args.format)
                if not validation.is_valid:
                    print(f"✗ Format invalide: {validation.error_message}")
                    return 1
                
                # Création d'une recommandation factice pour le format forcé
                from .format_selector import FormatSelector
                selector = FormatSelector()
                recommendation = selector.select_optimal_format(content_analysis, preferences)
                recommendation.recommended_format = forced_format
                recommendation.justification = f"Format {args.format} forcé par l'utilisateur"
            else:
                # Recommandation automatique
                recommendation = self.optimizer.get_optimal_format(content_analysis, preferences)
            
            # Affichage des résultats
            self._display_recommendation(recommendation, content_analysis, args.analyze_only)
            
            # Export du rapport si demandé
            if args.export_report:
                self._export_analysis_report(
                    recommendation, content_analysis, args.export_report
                )
                print(f"📄 Rapport exporté: {args.export_report}")
            
            # Application des recommandations si pas en mode analyse seule
            if not args.analyze_only:
                success = self._apply_recommendation(project_path, recommendation, project_data)
                return 0 if success else 1
            
            return 0
            
        except Exception as e:
            print(f"✗ Erreur lors de l'optimisation: {str(e)}")
            return 1
    
    def handle_validate_format(self, args: argparse.Namespace) -> int:
        """
        Gère la commande de validation de format.
        
        Args:
            args: Arguments de la ligne de commande
            
        Returns:
            int: Code de sortie
        """
        try:
            validation = self.optimizer.validate_format_compatibility(args.format_spec)
            
            if validation.is_valid:
                print(f"✓ Format {args.format_spec} est compatible")
                return 0
            else:
                print(f"✗ Format {args.format_spec} incompatible: {validation.error_message}")
                if validation.supported_formats:
                    print(f"  Formats supportés: {', '.join(f.value for f in validation.supported_formats)}")
                return 1
                
        except Exception as e:
            print(f"✗ Erreur de validation: {str(e)}")
            return 1
    
    def handle_analyze_content(self, args: argparse.Namespace) -> int:
        """
        Gère la commande d'analyse de contenu.
        
        Args:
            args: Arguments de la ligne de commande
            
        Returns:
            int: Code de sortie
        """
        try:
            project_path = Path(args.project)
            project_data = self._load_project_data(project_path)
            
            if not project_data:
                print("✗ Impossible de charger les données du projet")
                return 1
            
            # Analyse du contenu
            content_analysis = self.optimizer.analyze_content(project_data)
            
            # Affichage de l'analyse
            self._display_content_analysis(content_analysis, args.detailed)
            
            return 0
            
        except Exception as e:
            print(f"✗ Erreur lors de l'analyse: {str(e)}")
            return 1
    
    def _load_project_data(self, project_path: Path) -> Optional[Dict[str, Any]]:
        """Charge les données du projet depuis project.json."""
        project_file = project_path / "project.json"
        
        if not project_file.exists():
            return None
        
        try:
            with open(project_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return None
    
    def _display_recommendation(self, recommendation, content_analysis, analyze_only: bool) -> None:
        """Affiche la recommandation de format."""
        print("\n🎯 Recommandation de Format")
        print("=" * 50)
        
        print(f"Format recommandé: {recommendation.recommended_format.value}")
        print(f"Confiance: {recommendation.confidence_score:.1%}")
        print(f"Amélioration prédite: +{recommendation.predicted_quality_improvement:.1f}%")
        print(f"Temps estimé: {recommendation.estimated_processing_time:.1f}s")
        print(f"Justification: {recommendation.justification}")
        
        if recommendation.alternatives:
            print("\n📋 Alternatives:")
            for alt_format, score in recommendation.alternatives[:3]:
                print(f"  • {alt_format.value}: {score:.1%}")
        
        # Affichage du type d'action
        if analyze_only:
            print("\n📊 Mode analyse - Aucune modification appliquée")
        else:
            print(f"\n🚀 Prêt à appliquer le format {recommendation.recommended_format.value}")
    
    def _display_content_analysis(self, analysis, detailed: bool) -> None:
        """Affiche l'analyse de contenu."""
        print("\n📊 Analyse de Contenu")
        print("=" * 40)
        
        print(f"Type de contenu: {analysis.content_type}")
        print(f"Complexité de scène: {analysis.scene_complexity:.1%}")
        print(f"Intensité de mouvement: {analysis.motion_intensity:.1%}")
        print(f"Nombre de personnages: {analysis.character_count}")
        print(f"Exigences temporelles: {'Oui' if analysis.temporal_requirements else 'Non'}")
        
        if detailed:
            print(f"Couleurs dominantes: {', '.join(analysis.dominant_colors)}")
            print(f"Ratio d'aspect préféré: {analysis.aspect_ratio_preference}")
    
    def _apply_recommendation(self, project_path: Path, recommendation, project_data: Dict[str, Any]) -> bool:
        """Applique la recommandation au projet."""
        try:
            # Mise à jour du project.json avec la recommandation
            project_data["format_optimization"] = {
                "enabled": True,
                "recommended_format": recommendation.recommended_format.value,
                "confidence_score": recommendation.confidence_score,
                "predicted_improvement": recommendation.predicted_quality_improvement,
                "estimated_time": recommendation.estimated_processing_time,
                "justification": recommendation.justification,
                "applied_at": "now"  # À remplacer par un timestamp réel
            }
            
            # Sauvegarde
            project_file = project_path / "project.json"
            with open(project_file, 'w', encoding='utf-8') as f:
                json.dump(project_data, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Recommandation appliquée au projet")
            print(f"  Format: {recommendation.recommended_format.value}")
            print(f"  Utilisez: storycore.py grid --grid {recommendation.recommended_format.value}")
            
            return True
            
        except Exception as e:
            print(f"✗ Erreur lors de l'application: {str(e)}")
            return False
    
    def _export_analysis_report(self, recommendation, content_analysis, output_path: str) -> None:
        """Exporte un rapport d'analyse détaillé."""
        report = {
            "analysis_timestamp": "now",  # À remplacer par un timestamp réel
            "content_analysis": {
                "content_type": content_analysis.content_type,
                "scene_complexity": content_analysis.scene_complexity,
                "motion_intensity": content_analysis.motion_intensity,
                "character_count": content_analysis.character_count,
                "temporal_requirements": content_analysis.temporal_requirements,
                "dominant_colors": content_analysis.dominant_colors,
                "aspect_ratio_preference": content_analysis.aspect_ratio_preference
            },
            "recommendation": {
                "recommended_format": recommendation.recommended_format.value,
                "confidence_score": recommendation.confidence_score,
                "predicted_quality_improvement": recommendation.predicted_quality_improvement,
                "estimated_processing_time": recommendation.estimated_processing_time,
                "justification": recommendation.justification,
                "alternatives": [
                    {"format": alt[0].value, "score": alt[1]}
                    for alt in recommendation.alternatives
                ]
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)


def extend_storycore_cli(parser: argparse.ArgumentParser) -> None:
    """
    Étend le CLI StoryCore existant avec les commandes d'optimisation.
    
    Args:
        parser: Parser principal de StoryCore
    """
    cli = GridFormatOptimizationCLI()
    cli.add_optimization_commands(parser)


# Fonction utilitaire pour intégration directe
def optimize_project_format(project_path: str, **kwargs) -> Dict[str, Any]:
    """
    Optimise le format d'un projet de manière programmatique.
    
    Args:
        project_path: Chemin vers le projet
        **kwargs: Options d'optimisation
        
    Returns:
        Dict contenant les résultats de l'optimisation
    """
    optimizer = GridFormatOptimizer()
    
    # Chargement du projet
    project_file = Path(project_path) / "project.json"
    with open(project_file, 'r') as f:
        project_data = json.load(f)
    
    # Analyse et recommandation
    content_analysis = optimizer.analyze_content(project_data)
    
    preferences = FormatPreferences(
        preferred_formats=kwargs.get('preferred_formats', list(GridFormat)),
        quality_vs_speed_preference=kwargs.get('quality_vs_speed', 0.7),
        auto_format_selection=kwargs.get('auto_selection', True),
        minimum_quality_threshold=kwargs.get('min_quality', 75.0),
        maximum_processing_time=kwargs.get('max_time'),
        custom_format_weights=kwargs.get('format_weights', {})
    )
    
    recommendation = optimizer.get_optimal_format(content_analysis, preferences)
    
    return {
        "content_analysis": content_analysis,
        "recommendation": recommendation,
        "success": True
    }