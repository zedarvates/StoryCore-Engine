"""
Moteur de cohérence temporelle pour formats linéaires.
Optimise la continuité visuelle entre panels adjacents.

Utilise numpy pour les opérations vectorisées afin d'optimiser les performances
dans les calculs de métriques de cohérence temporelle. Les structures de données
sont optimisées pour minimiser la mémoire et maximiser la localité de cache.
"""

from typing import List, Dict, Optional, Tuple
import math
from dataclasses import dataclass

try:
    import numpy as np
except ImportError:
    raise ImportError("numpy est requis pour les calculs vectorisés de cohérence temporelle")

from .types import GridFormat, CoherenceMetrics, FORMAT_SPECIFICATIONS
from .exceptions import TemporalCoherenceError


# Import de l'AutofixEngine pour intégration avec les corrections automatiques
try:
    from autofix_engine import AutofixEngine
    AUTOFIX_AVAILABLE = True
except ImportError:
    AUTOFIX_AVAILABLE = False


@dataclass
class Panel:
    """
    Représentation d'un panel avec ses propriétés visuelles.

    Structure de données optimisée pour la cohérence temporelle:
    - dominant_colors: Liste de tuples RGB (max 3 couleurs pour limiter mémoire)
    - brightness/contrast: Floats simples pour calculs vectorisés
    - style_features: Dict pour flexibilité, mais taille limitée pour performance
    - position_in_sequence: Index pour tracking temporel

    Choix de conception: Dataclass pour mémoire compacte et performances.
    Évite les objets lourds, privilégie les types primitifs.
    """
    panel_id: str
    image_path: str
    dominant_colors: List[Tuple[int, int, int]]  # Max 3 couleurs pour optimisation mémoire
    brightness: float
    contrast: float
    style_features: Dict[str, float]  # Features limités pour éviter surcharge
    position_in_sequence: int


@dataclass
class ContinuityReport:
    """Rapport de continuité visuelle."""
    overall_score: float
    color_continuity: float
    lighting_continuity: float
    style_continuity: float
    problem_areas: List[str]
    recommendations: List[str]


@dataclass
class AutofixAction:
    """Action d'autofix pour améliorer la cohérence."""
    action_type: str
    target_panels: List[str]
    parameters: Dict[str, float]
    expected_improvement: float


class TemporalCoherenceEngine:
    """
    Moteur de cohérence temporelle pour formats linéaires.
    
    Responsabilités:
    - Optimisation de la cohérence entre panels adjacents
    - Maintien de la continuité visuelle pour les formats linéaires
    - Calcul des métriques de cohérence temporelle
    """
    
    def __init__(self, coherence_threshold: float = 0.85, autofix_rules_path: Optional[str] = None):
        """
        Initialise le moteur de cohérence temporelle.

        Args:
            coherence_threshold: Seuil minimum de cohérence (0.0 à 1.0)
            autofix_rules_path: Chemin vers les règles d'autofix (optionnel)
        """
        self.coherence_threshold = coherence_threshold
        self._optimization_history = []
        self._autofix_triggers = 0

        # Initialisation de l'AutofixEngine pour les corrections automatiques
        # Utilise un seuil de cohérence pour déclencher les corrections (85% comme spécifié)
        if AUTOFIX_AVAILABLE:
            self.autofix_engine = AutofixEngine(autofix_rules_path)
        else:
            self.autofix_engine = None
    
    def optimize_panel_transitions(self, panels: List[Panel], 
                                 format_type: GridFormat) -> List[Panel]:
        """
        Optimise les transitions entre panels pour les formats linéaires.
        
        Args:
            panels: Liste des panels à optimiser
            format_type: Format de grille utilisé
            
        Returns:
            List[Panel]: Panels optimisés
            
        Raises:
            TemporalCoherenceError: Si l'optimisation échoue
        """
        if format_type == GridFormat.SQUARE_3X3:
            # Pas d'optimisation temporelle pour le format 3x3
            return panels
        
        if not panels:
            return panels
        
        optimized_panels = []
        
        for i, panel in enumerate(panels):
            if i == 0:
                # Premier panel - pas d'optimisation nécessaire
                optimized_panels.append(panel)
                continue
            
            previous_panel = optimized_panels[i-1]
            
            # Calcul de la cohérence avec le panel précédent
            coherence_score = self._calculate_panel_coherence(previous_panel, panel)
            
            if coherence_score < self.coherence_threshold:
                # Optimisation nécessaire
                optimized_panel = self._enhance_temporal_coherence(previous_panel, panel)
                optimized_panels.append(optimized_panel)
                
                # Enregistrement de l'optimisation
                self._record_optimization(panel.panel_id, coherence_score, "enhanced")
            else:
                # Cohérence suffisante
                optimized_panels.append(panel)
                self._record_optimization(panel.panel_id, coherence_score, "maintained")
        
        return optimized_panels
    
    def calculate_coherence_metrics(self, panels: List[Panel]) -> CoherenceMetrics:
        """
        Calcule les métriques de cohérence temporelle pour une séquence de panels.
        
        Args:
            panels: Liste des panels à analyser
            
        Returns:
            CoherenceMetrics: Métriques de cohérence complètes
        """
        if len(panels) < 2:
            # Cohérence parfaite pour un seul panel
            return CoherenceMetrics(
                inter_panel_similarity=1.0,
                color_transition_smoothness=1.0,
                style_consistency=1.0,
                lighting_coherence=1.0,
                temporal_coherence_score=1.0
            )
        
        # Calcul des métriques entre panels adjacents
        # Choix algorithmique: Boucle séquentielle plutôt que vectorisation complète
        # car les calculs impliquent des appels de méthodes avec logique conditionnelle,
        # ce qui rend la vectorisation numpy moins efficace. Les appels de méthodes
        # dominent le coût computationnel plutôt que les opérations arithmétiques.
        similarities = []
        color_smoothness = []
        style_consistencies = []
        lighting_coherences = []

        for i in range(len(panels) - 1):
            current_panel = panels[i]
            next_panel = panels[i + 1]

            # Similarité inter-panel (caching possible pour éviter recalculs)
            similarity = self._calculate_panel_similarity(current_panel, next_panel)
            similarities.append(similarity)

            # Fluidité des transitions de couleur (optimisée avec numpy dans _calculate_color_coherence)
            color_smooth = self._calculate_color_transition_smoothness(current_panel, next_panel)
            color_smoothness.append(color_smooth)

            # Consistance de style (calcul simple, peu d'opportunités de vectorisation)
            style_consistency = self._calculate_style_consistency(current_panel, next_panel)
            style_consistencies.append(style_consistency)

            # Cohérence d'éclairage (calculs arithmétiques simples, vectorisable si nécessaire)
            lighting_coherence = self._calculate_lighting_coherence(current_panel, next_panel)
            lighting_coherences.append(lighting_coherence)

        # Moyennes des métriques - utilisation de sum() native Python pour simplicité
        # Choix: sum() est optimisée en C et plus lisible que np.mean() pour ces cas simples
        # numpy pourrait être utilisé pour vectoriser complètement si len(panels) devient très grand
        avg_similarity = sum(similarities) / len(similarities)
        avg_color_smoothness = sum(color_smoothness) / len(color_smoothness)
        avg_style_consistency = sum(style_consistencies) / len(style_consistencies)
        avg_lighting_coherence = sum(lighting_coherences) / len(lighting_coherences)
        
        # Score de cohérence temporelle global
        temporal_score = (
            avg_similarity * 0.3 +
            avg_color_smoothness * 0.25 +
            avg_style_consistency * 0.25 +
            avg_lighting_coherence * 0.2
        )
        
        return CoherenceMetrics(
            inter_panel_similarity=avg_similarity,
            color_transition_smoothness=avg_color_smoothness,
            style_consistency=avg_style_consistency,
            lighting_coherence=avg_lighting_coherence,
            temporal_coherence_score=temporal_score
        )
    
    def ensure_visual_continuity(self, panels: List[Panel]) -> ContinuityReport:
        """
        Assure la continuité visuelle et génère un rapport.
        
        Args:
            panels: Liste des panels à vérifier
            
        Returns:
            ContinuityReport: Rapport de continuité avec recommandations
        """
        metrics = self.calculate_coherence_metrics(panels)
        
        # Identification des problèmes
        problems = []
        recommendations = []
        
        if metrics.color_transition_smoothness < 0.7:
            problems.append("Transitions de couleur abruptes")
            recommendations.append("Ajuster la palette de couleurs pour plus de fluidité")
        
        if metrics.style_consistency < 0.8:
            problems.append("Inconsistance de style entre panels")
            recommendations.append("Harmoniser les styles visuels")
        
        if metrics.lighting_coherence < 0.75:
            problems.append("Éclairage incohérent")
            recommendations.append("Normaliser l'éclairage entre panels")
        
        if metrics.inter_panel_similarity < 0.6:
            problems.append("Panels trop différents")
            recommendations.append("Augmenter la similarité visuelle")
        
        return ContinuityReport(
            overall_score=metrics.temporal_coherence_score,
            color_continuity=metrics.color_transition_smoothness,
            lighting_continuity=metrics.lighting_coherence,
            style_continuity=metrics.style_consistency,
            problem_areas=problems,
            recommendations=recommendations
        )
    
    def trigger_autofix_if_needed(self, coherence_score: float, panel_id: str = "temporal_coherence") -> Optional[AutofixAction]:
        """
        Déclenche l'autofix si la cohérence temporelle est insuffisante.

        Intègre avec l'AutofixEngine existant pour appliquer des corrections automatiques
        quand la cohérence tombe en dessous du seuil de 85%. Utilise les règles
        spécialisées pour la cohérence temporelle plutôt que la netteté.

        Args:
            coherence_score: Score de cohérence temporelle (0.0 à 1.0)
            panel_id: Identifiant du panel pour l'autofix (défaut: temporal_coherence)

        Returns:
            AutofixAction si autofix nécessaire, None sinon

        Raises:
            TemporalCoherenceError: Si la cohérence est critique (< 0.5)
        """
        if coherence_score >= self.coherence_threshold:
            return None

        self._autofix_triggers += 1

        if coherence_score < 0.5:
            # Cohérence critique - lever une exception personnalisée
            raise TemporalCoherenceError(coherence_score, self.coherence_threshold)

        # Intégration avec AutofixEngine si disponible
        if self.autofix_engine is not None:
            # Adapter la métrique de cohérence pour l'AutofixEngine (qui attend une métrique de netteté)
            # Convertir le score de cohérence en métrique d'autofix (0-255 similaire à la netteté)
            adapted_metric = int(coherence_score * 255)  # Cohérence 0.85 -> 216.75, proche de la netteté acceptable

            # Créer une métrique d'autofix adaptée pour la cohérence temporelle
            adapted_qa_metrics = {
                "sharpness_score": adapted_metric,  # Adapté pour l'autofix
                "temporal_coherence_score": coherence_score,  # Métrique originale
                "quality_tier": "temporal_coherence_issue"  # Tier spécial pour cohérence
            }

            # Vérifier si l'autofix est nécessaire selon les règles adaptées
            needs_retry, adjustments = self.autofix_engine.should_retry(panel_id, adapted_qa_metrics)

            if needs_retry:
                # Créer une action d'autofix spécialisée pour la cohérence temporelle
                action_type = "temporal_coherence_adjustment"
                expected_improvement = min(0.3, (self.coherence_threshold - coherence_score) * 0.5)

                return AutofixAction(
                    action_type=action_type,
                    target_panels=[panel_id],
                    parameters={
                        "coherence_adjustment": adjustments.get("denoising_strength", 0.1),
                        "temporal_smoothing": adjustments.get("sharpen_amount", 0.05),
                        "transition_harmonization": 0.15
                    },
                    expected_improvement=expected_improvement
                )

        # Fallback si AutofixEngine non disponible
        # Déterminer le type d'action d'autofix basé sur la sévérité
        if coherence_score < 0.65:
            action_type = "major_temporal_adjustment"
            expected_improvement = 0.3
        elif coherence_score < 0.75:
            action_type = "moderate_temporal_adjustment"
            expected_improvement = 0.2
        else:
            action_type = "minor_temporal_adjustment"
            expected_improvement = 0.1

        return AutofixAction(
            action_type=action_type,
            target_panels=[panel_id],
            parameters={
                "color_adjustment": 0.1,
                "brightness_normalization": 0.05,
                "style_harmonization": 0.15,
                "temporal_smoothing": 0.08
            },
            expected_improvement=expected_improvement
        )
    
    def get_optimization_statistics(self) -> Dict[str, float]:
        """
        Retourne les statistiques d'optimisation.
        
        Returns:
            Dict avec les statistiques d'optimisation
        """
        if not self._optimization_history:
            return {
                "total_optimizations": 0,
                "average_coherence_before": 0.0,
                "average_coherence_after": 0.0,
                "improvement_rate": 0.0,
                "autofix_trigger_rate": 0.0
            }
        
        enhanced_optimizations = [opt for opt in self._optimization_history if opt["action"] == "enhanced"]
        
        if enhanced_optimizations:
            avg_before = sum(opt["coherence_before"] for opt in enhanced_optimizations) / len(enhanced_optimizations)
            avg_after = sum(opt["coherence_after"] for opt in enhanced_optimizations) / len(enhanced_optimizations)
            improvement_rate = len(enhanced_optimizations) / len(self._optimization_history)
        else:
            avg_before = avg_after = improvement_rate = 0.0
        
        return {
            "total_optimizations": len(self._optimization_history),
            "average_coherence_before": avg_before,
            "average_coherence_after": avg_after,
            "improvement_rate": improvement_rate,
            "autofix_trigger_rate": self._autofix_triggers / max(1, len(self._optimization_history))
        }
    
    def _calculate_panel_coherence(self, panel1: Panel, panel2: Panel) -> float:
        """Calcule la cohérence entre deux panels adjacents."""
        # Cohérence des couleurs dominantes
        color_coherence = self._calculate_color_coherence(panel1.dominant_colors, panel2.dominant_colors)
        
        # Cohérence de luminosité
        brightness_diff = abs(panel1.brightness - panel2.brightness)
        brightness_coherence = max(0.0, 1.0 - brightness_diff)
        
        # Cohérence de contraste
        contrast_diff = abs(panel1.contrast - panel2.contrast)
        contrast_coherence = max(0.0, 1.0 - contrast_diff)
        
        # Cohérence de style
        style_coherence = self._calculate_style_coherence(panel1.style_features, panel2.style_features)
        
        # Score composite
        return (
            color_coherence * 0.4 +
            brightness_coherence * 0.2 +
            contrast_coherence * 0.2 +
            style_coherence * 0.2
        )
    
    def _enhance_temporal_coherence(self, previous_panel: Panel, current_panel: Panel) -> Panel:
        """Améliore la cohérence temporelle d'un panel."""
        # Création d'une copie du panel pour modification
        enhanced_panel = Panel(
            panel_id=current_panel.panel_id,
            image_path=current_panel.image_path,
            dominant_colors=current_panel.dominant_colors.copy(),
            brightness=current_panel.brightness,
            contrast=current_panel.contrast,
            style_features=current_panel.style_features.copy(),
            position_in_sequence=current_panel.position_in_sequence
        )
        
        # Ajustement des couleurs dominantes vers celles du panel précédent
        enhanced_panel.dominant_colors = self._blend_colors(
            previous_panel.dominant_colors, 
            current_panel.dominant_colors, 
            blend_factor=0.3
        )
        
        # Ajustement de la luminosité
        brightness_diff = previous_panel.brightness - current_panel.brightness
        enhanced_panel.brightness += brightness_diff * 0.2
        
        # Ajustement du contraste
        contrast_diff = previous_panel.contrast - current_panel.contrast
        enhanced_panel.contrast += contrast_diff * 0.15
        
        return enhanced_panel
    
    def _calculate_color_coherence(self, colors1: List[Tuple[int, int, int]], 
                                 colors2: List[Tuple[int, int, int]]) -> float:
        """Calcule la cohérence entre deux palettes de couleurs."""
        if not colors1 or not colors2:
            return 0.0
        
        # Conversion en arrays numpy pour vectorisation (optimise les accès mémoire)
        # Utilise float32 pour réduire l'usage mémoire tout en gardant la précision
        try:
            colors1_array = np.array(colors1[:3], dtype=np.float32)  # Top 3 couleurs max
            colors2_array = np.array(colors2[:3], dtype=np.float32)

            # Calcul vectorisé des différences (plus efficace que les boucles imbriquées)
            # Shape: (len(colors1), len(colors2), 3) pour broadcasting
            diff = colors1_array[:, np.newaxis, :] - colors2_array[np.newaxis, :, :]
            # Distance euclidienne vectorisée: sqrt(sum(diff^2, axis=2))
            distances = np.sqrt(np.sum(diff ** 2, axis=2))

            # Distance minimale pour chaque couleur de colors1 vers colors2 (vectorisé)
            min_distances = np.min(distances, axis=1)
            avg_distance = np.mean(min_distances)

        except (ValueError, TypeError) as e:
            # Fallback vers calcul non-vectorisé en cas d'erreur numpy
            # Gestion d'erreur robuste pour assurer la continuité du service
            print(f"Warning: Numpy calculation failed, falling back to sequential: {e}")
            min_distances = []
            for color1 in colors1[:3]:
                distances = [math.sqrt(sum((c1 - c2) ** 2 for c1, c2 in zip(color1, color2)))
                           for color2 in colors2[:3]]
                min_distances.append(min(distances))
            avg_distance = sum(min_distances) / len(min_distances)
        # Normalisation par la distance maximale théorique (diagonale RGB)
        max_distance = np.sqrt(3 * 255 ** 2)  # Distance maximale possible dans l'espace RGB
        
        # Clamping pour éviter les valeurs négatives dues aux erreurs de calcul flottant
        return np.clip(1.0 - (avg_distance / max_distance), 0.0, 1.0)
    
    def _calculate_style_coherence(self, features1: Dict[str, float], 
                                 features2: Dict[str, float]) -> float:
        """Calcule la cohérence entre caractéristiques de style."""
        if not features1 or not features2:
            return 0.5  # Score neutre si pas de données
        
        common_features = set(features1.keys()) & set(features2.keys())
        
        if not common_features:
            return 0.5
        
        differences = []
        for feature in common_features:
            diff = abs(features1[feature] - features2[feature])
            differences.append(diff)
        
        avg_difference = sum(differences) / len(differences)
        return max(0.0, 1.0 - avg_difference)
    
    def _blend_colors(self, colors1: List[Tuple[int, int, int]], 
                     colors2: List[Tuple[int, int, int]], 
                     blend_factor: float) -> List[Tuple[int, int, int]]:
        """Mélange deux palettes de couleurs."""
        if not colors1 or not colors2:
            return colors2
        
        blended = []
        max_colors = min(len(colors1), len(colors2))
        
        for i in range(max_colors):
            color1 = colors1[i]
            color2 = colors2[i]
            
            blended_color = tuple(
                int(c2 + (c1 - c2) * blend_factor)
                for c1, c2 in zip(color1, color2)
            )
            blended.append(blended_color)
        
        # Ajouter les couleurs restantes de colors2
        if len(colors2) > max_colors:
            blended.extend(colors2[max_colors:])
        
        return blended
    
    def _calculate_panel_similarity(self, panel1: Panel, panel2: Panel) -> float:
        """Calcule la similarité globale entre deux panels."""
        return self._calculate_panel_coherence(panel1, panel2)
    
    def _calculate_color_transition_smoothness(self, panel1: Panel, panel2: Panel) -> float:
        """Calcule la fluidité de transition des couleurs."""
        return self._calculate_color_coherence(panel1.dominant_colors, panel2.dominant_colors)
    
    def _calculate_style_consistency(self, panel1: Panel, panel2: Panel) -> float:
        """Calcule la consistance de style."""
        return self._calculate_style_coherence(panel1.style_features, panel2.style_features)
    
    def _calculate_lighting_coherence(self, panel1: Panel, panel2: Panel) -> float:
        """Calcule la cohérence d'éclairage."""
        brightness_coherence = max(0.0, 1.0 - abs(panel1.brightness - panel2.brightness))
        contrast_coherence = max(0.0, 1.0 - abs(panel1.contrast - panel2.contrast))
        
        return (brightness_coherence + contrast_coherence) / 2.0
    
    def _record_optimization(self, panel_id: str, coherence_score: float, action: str) -> None:
        """Enregistre une optimisation dans l'historique."""
        self._optimization_history.append({
            "panel_id": panel_id,
            "coherence_before": coherence_score,
            "coherence_after": min(1.0, coherence_score + 0.1) if action == "enhanced" else coherence_score,
            "action": action,
            "timestamp": "now"  # À remplacer par un timestamp réel
        })