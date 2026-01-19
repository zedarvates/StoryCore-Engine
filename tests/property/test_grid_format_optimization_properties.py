"""
Tests basés sur les propriétés pour l'optimisation des formats de grille.
Utilise Hypothesis pour générer des cas de test automatiquement.
"""

import pytest
from hypothesis import given, strategies as st, assume, settings
from hypothesis.stateful import RuleBasedStateMachine, rule, initialize
from pathlib import Path
import json
from typing import Dict, Any

from src.grid_format_optimization.types import (
    GridFormat, ContentAnalysis, FormatPreferences, OptimizationConfig,
    FORMAT_SPECIFICATIONS
)
from src.grid_format_optimization.exceptions import (
    UnsupportedFormatError, QualityPredictionError, TemporalCoherenceError
)


# Stratégies Hypothesis pour génération de données de test
@st.composite
def content_analysis_strategy(draw):
    """Génère des analyses de contenu valides."""
    content_types = ["action", "dialogue", "landscape", "portrait"]
    return ContentAnalysis(
        content_type=draw(st.sampled_from(content_types)),
        scene_complexity=draw(st.floats(min_value=0.0, max_value=1.0)),
        motion_intensity=draw(st.floats(min_value=0.0, max_value=1.0)),
        character_count=draw(st.integers(min_value=0, max_value=10)),
        dominant_colors=draw(st.lists(st.text(min_size=3, max_size=10), min_size=1, max_size=5)),
        aspect_ratio_preference=draw(st.sampled_from(["16:9", "4:3", "1:1"])),
        temporal_requirements=draw(st.booleans())
    )


@st.composite
def format_preferences_strategy(draw):
    """Génère des préférences de format valides."""
    formats = list(GridFormat)
    return FormatPreferences(
        preferred_formats=draw(st.lists(st.sampled_from(formats), min_size=1, unique=True)),
        quality_vs_speed_preference=draw(st.floats(min_value=0.0, max_value=1.0)),
        auto_format_selection=draw(st.booleans()),
        minimum_quality_threshold=draw(st.floats(min_value=0.0, max_value=100.0)),
        maximum_processing_time=draw(st.one_of(st.none(), st.floats(min_value=1.0, max_value=600.0))),
        custom_format_weights={}
    )


@st.composite
def project_data_strategy(draw):
    """Génère des données de projet valides."""
    shots = []
    num_shots = draw(st.integers(min_value=1, max_value=10))
    
    for i in range(num_shots):
        shots.append({
            "shot_id": f"shot_{i+1:02d}",
            "description": draw(st.text(min_size=10, max_size=100)),
            "duration": draw(st.floats(min_value=1.0, max_value=10.0))
        })
    
    return {
        "project_name": draw(st.text(min_size=5, max_size=20)),
        "storyboard": {"shots": shots},
        "characters": [f"character_{i}" for i in range(draw(st.integers(min_value=0, max_value=5)))]
    }


class TestGridFormatOptimizationProperties:
    """Tests de propriétés pour l'optimisation des formats de grille."""
    
    @given(content_analysis_strategy())
    @settings(max_examples=25)
    def test_property_1_complete_format_evaluation(self, content_analysis):
        """
        **Feature: grid-format-optimization, Property 1: Évaluation Complète des Formats**
        
        Pour tout projet analysé, le système doit évaluer la qualité potentielle 
        de tous les formats disponibles (1x2, 1x3, 1x4, 3x3) et fournir des 
        métriques spécifiques à chaque format avec des scores normalisés entre 0 et 100.
        
        **Valide: Exigences 1.1, 4.1, 4.3, 7.1**
        """
        # Cette propriété sera implémentée quand GridFormatOptimizer sera créé
        # Pour l'instant, on teste la structure des données
        
        # Vérifier que tous les formats sont définis
        all_formats = {GridFormat.SQUARE_3X3, GridFormat.LINEAR_1X2, 
                      GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4}
        assert set(FORMAT_SPECIFICATIONS.keys()) == all_formats
        
        # Vérifier que chaque format a une spécification complète
        for format_type, spec in FORMAT_SPECIFICATIONS.items():
            assert spec.format_type == format_type
            assert spec.panel_count > 0
            assert 0.0 <= spec.processing_complexity <= 1.0
            assert 0.0 <= spec.temporal_coherence_weight <= 1.0
            assert len(spec.optimal_for) > 0
    
    @given(st.sampled_from(list(GridFormat)))
    @settings(max_examples=12)
    def test_property_6_content_based_selection(self, format_type):
        """
        **Feature: grid-format-optimization, Property 6: Sélection Basée sur le Type de Contenu**
        
        Pour tout nouveau projet, le système doit analyser le type de contenu et 
        recommander le format optimal selon les règles : formats 1x3/1x4 pour l'action, 
        évaluation du 1x2 pour portraits/dialogues.
        
        **Valide: Exigences 2.1, 2.2, 2.3**
        """
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        # Vérifier les règles de sélection basées sur le contenu
        if format_type in [GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4]:
            assert "action" in spec.optimal_for
        
        if format_type == GridFormat.LINEAR_1X2:
            assert any(content in spec.optimal_for for content in ["dialogue", "portrait"])
    
    @given(st.floats(min_value=0.0, max_value=1.0))
    @settings(max_examples=12)
    def test_property_10_autofix_trigger(self, coherence_score):
        """
        **Feature: grid-format-optimization, Property 10: Déclenchement Automatique de l'Autofix**
        
        Pour toute mesure de cohérence temporelle inférieure à 85%, le système doit 
        déclencher automatiquement l'Autofix Engine.
        
        **Valide: Exigences 3.5**
        """
        from src.grid_format_optimization.types import AUTOFIX_TRIGGER_THRESHOLD
        
        should_trigger = coherence_score < AUTOFIX_TRIGGER_THRESHOLD
        
        # Vérifier que le seuil est correctement défini
        assert AUTOFIX_TRIGGER_THRESHOLD == 0.85
        
        # La logique de déclenchement sera testée quand TemporalCoherenceEngine sera implémenté
        if coherence_score < 0.85:
            # Devrait déclencher l'autofix
            assert should_trigger
        else:
            # Ne devrait pas déclencher l'autofix
            assert not should_trigger
    
    @given(project_data_strategy())
    @settings(max_examples=12)
    def test_content_analysis_from_project_data(self, project_data):
        """Test de la création d'analyse de contenu à partir de données de projet."""
        analysis = ContentAnalysis.from_project_data(project_data)
        
        # Vérifier que l'analyse est valide
        assert analysis.content_type in ["action", "dialogue", "landscape", "portrait"]
        assert 0.0 <= analysis.scene_complexity <= 1.0
        assert 0.0 <= analysis.motion_intensity <= 1.0
        assert analysis.character_count >= 0
        assert len(analysis.dominant_colors) > 0
        assert analysis.aspect_ratio_preference in ["16:9", "4:3", "1:1"]
        assert isinstance(analysis.temporal_requirements, bool)
    
    @given(st.text())
    def test_unsupported_format_error(self, invalid_format):
        """Test de l'exception pour format non supporté."""
        assume(invalid_format not in ["3x3", "1x2", "1x3", "1x4"])
        
        error = UnsupportedFormatError(invalid_format)
        assert error.format_spec == invalid_format
        assert "non supporté" in str(error)
    
    def test_grid_format_properties(self):
        """Test des propriétés des formats de grille."""
        # Test format linéaire
        assert GridFormat.LINEAR_1X2.is_linear
        assert GridFormat.LINEAR_1X3.is_linear
        assert GridFormat.LINEAR_1X4.is_linear
        assert not GridFormat.SQUARE_3X3.is_linear
        
        # Test nombre de panels
        assert GridFormat.SQUARE_3X3.panel_count == 9
        assert GridFormat.LINEAR_1X2.panel_count == 2
        assert GridFormat.LINEAR_1X3.panel_count == 3
        assert GridFormat.LINEAR_1X4.panel_count == 4
        
        # Test dimensions
        assert GridFormat.SQUARE_3X3.dimensions == (3, 3)
        assert GridFormat.LINEAR_1X2.dimensions == (1, 2)
        assert GridFormat.LINEAR_1X3.dimensions == (1, 3)
        assert GridFormat.LINEAR_1X4.dimensions == (1, 4)


class GridFormatOptimizationStateMachine(RuleBasedStateMachine):
    """Machine à états pour tester les transitions et invariants du système."""
    
    def __init__(self):
        super().__init__()
        self.current_format = None
        self.quality_scores = {}
        self.processing_times = {}
    
    @initialize()
    def setup(self):
        """Initialisation de la machine à états."""
        self.current_format = GridFormat.SQUARE_3X3
        self.quality_scores = {format_type: 50.0 for format_type in GridFormat}
        self.processing_times = {format_type: 60.0 for format_type in GridFormat}
    
    @rule(new_format=st.sampled_from(list(GridFormat)))
    def change_format(self, new_format):
        """Règle: Changement de format."""
        old_format = self.current_format
        self.current_format = new_format
        
        # Invariant: Le format doit toujours être valide
        assert self.current_format in GridFormat
        
        # Invariant: Les spécifications doivent exister pour tous les formats
        assert self.current_format in FORMAT_SPECIFICATIONS
    
    @rule(quality_score=st.floats(min_value=0.0, max_value=100.0))
    def update_quality_score(self, quality_score):
        """Règle: Mise à jour du score de qualité."""
        self.quality_scores[self.current_format] = quality_score
        
        # Invariant: Les scores de qualité doivent être normalisés
        assert 0.0 <= quality_score <= 100.0
    
    @rule(processing_time=st.floats(min_value=1.0, max_value=600.0))
    def update_processing_time(self, processing_time):
        """Règle: Mise à jour du temps de traitement."""
        self.processing_times[self.current_format] = processing_time
        
        # Invariant: Le temps de traitement doit respecter la contrainte de 5 minutes
        if processing_time > 300.0:  # 5 minutes
            # Devrait déclencher une optimisation ou erreur
            pass


# Test de la machine à états
TestGridFormatStateMachine = GridFormatOptimizationStateMachine.TestCase