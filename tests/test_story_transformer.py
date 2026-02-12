"""
StoryCore-Engine Story Transformer Tests

Unit tests for the story to scenario transformation module.
"""

import pytest
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.story_transformer import (
    StoryTransformer,
    StoryAnalyzer,
    transform_story_to_scenario,
    StructuredScenario
)


class TestStoryAnalyzer:
    """Tests for StoryAnalyzer class"""
    
    @pytest.fixture
    def sample_story(self):
        return """
        Marie is a young scientist who discovers a dangerous secret in her laboratory.
        She must choose between her career and the truth.
        Her mentor, Professor Dubois, helps her in her quest.
        But the antagonist, Mr. Noir, wants to use the discovery for evil.
        In a secret laboratory, Marie makes an unexpected encounter.
        The race against time begins.
        She must face her fears and find the strength to reveal the truth.
        """
    
    def test_extract_title(self, sample_story):
        """Test title extraction from story"""
        analyzer = StoryAnalyzer(sample_story)
        assert analyzer.title is not None
        assert len(analyzer.title) > 0
    
    def test_extract_characters(self, sample_story):
        """Test character extraction"""
        analyzer = StoryAnalyzer(sample_story)
        characters = analyzer.extract_characters_heuristic()
        assert len(characters) > 0
        assert "Marie" in characters
    
    def test_extract_locations(self, sample_story):
        """Test location extraction"""
        analyzer = StoryAnalyzer(sample_story)
        locations = analyzer.extract_locations_heuristic()
        assert locations is not None
    
    def test_extract_objects(self, sample_story):
        """Test object extraction"""
        analyzer = StoryAnalyzer(sample_story)
        objects = analyzer.extract_objects_heuristic()
        assert objects is not None
    
    def test_extract_theme(self, sample_story):
        """Test theme extraction"""
        analyzer = StoryAnalyzer(sample_story)
        theme, sous_themes = analyzer.extract_theme()
        assert theme is not None
    
    def test_extract_ton(self, sample_story):
        """Test ton/mood extraction"""
        analyzer = StoryAnalyzer(sample_story)
        ton, precisions = analyzer.extract_ton()
        assert ton is not None
    
    def test_extract_enjeux(self, sample_story):
        """Test enjeux extraction"""
        analyzer = StoryAnalyzer(sample_story)
        enjeux = analyzer.extract_enjeux()
        assert enjeux is not None


class TestStoryTransformer:
    """Tests for StoryTransformer class"""
    
    @pytest.fixture
    def sample_story(self):
        return """
        Marie is a young scientist who discovers a dangerous secret.
        Professor Dubois helps her in her quest.
        Mr. Noir is the antagonist who wants to use the discovery for evil.
        The story takes place in a secret laboratory.
        Marie must reveal the truth despite her fears.
        """
    
    def test_transform_returns_scenario(self, sample_story):
        """Test that transform returns a StructuredScenario"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert isinstance(scenario, StructuredScenario)
    
    def test_scenario_has_meta(self, sample_story):
        """Test that scenario has meta information"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.meta is not None
        assert "titre" in scenario.meta
        assert "pitch" in scenario.meta
        assert "theme" in scenario.meta
    
    def test_scenario_has_characters(self, sample_story):
        """Test that scenario has characters"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.personnages is not None
        assert len(scenario.personnages) > 0
    
    def test_scenario_has_locations(self, sample_story):
        """Test that scenario has locations"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.lieux is not None
    
    def test_scenario_has_structure(self, sample_story):
        """Test that scenario has narrative structure"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.structure is not None
        assert "acte_1" in scenario.structure
        assert "acte_2" in scenario.structure
        assert "acte_3" in scenario.structure
    
    def test_scenario_has_sequences(self, sample_story):
        """Test that scenario has sequences"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.sequences is not None
        assert len(scenario.sequences) == 10
    
    def test_scenario_has_scenes(self, sample_story):
        """Test that scenario has scenes"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        assert scenario.scenes is not None
        assert len(scenario.scenes) > 0
    
    def test_to_json_valid(self, sample_story):
        """Test that to_json produces valid JSON"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        json_str = scenario.to_json()
        parsed = json.loads(json_str)
        assert parsed is not None
    
    def test_sequence_ids_unique(self, sample_story):
        """Test that sequence IDs are unique"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        sequence_ids = [s["id"] for s in scenario.sequences]
        assert len(sequence_ids) == len(set(sequence_ids))
    
    def test_scene_ids_unique(self, sample_story):
        """Test that scene IDs are unique"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        scene_ids = [s["id"] for s in scenario.scenes]
        assert len(scene_ids) == len(set(scene_ids))
    
    def test_save_to_file(self, sample_story, tmp_path):
        """Test saving scenario to file"""
        transformer = StoryTransformer(sample_story, "Test Story")
        scenario = transformer.transform()
        filepath = os.path.join(tmp_path, "test_scenario.json")
        result = scenario.save_to_file(filepath)
        assert result is True
        assert os.path.exists(filepath)


class TestConvenienceFunction:
    """Tests for convenience functions"""
    
    def test_transform_story_to_scenario(self):
        """Test convenience function"""
        story = "A hero must save the world from evil."
        scenario = transform_story_to_scenario(story, "Test")
        assert isinstance(scenario, StructuredScenario)


class TestEdgeCases:
    """Tests for edge cases"""
    
    def test_very_short_story(self):
        """Test handling of very short story"""
        story = "A hero fights evil."
        scenario = transform_story_to_scenario(story)
        assert scenario is not None
    
    def test_story_with_special_characters(self):
        """Test story with special characters"""
        story = "C'est une histoire avec des caracteres speciaux."
        scenario = transform_story_to_scenario(story, "Special Chars")
        json_str = scenario.to_json()
        assert "C'est" in json_str or "une histoire" in json_str


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

