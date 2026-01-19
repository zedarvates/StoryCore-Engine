"""
Shared test fixtures and mocks for CLI unit tests.
"""

import pytest
from unittest.mock import Mock, MagicMock
import sys


# Mock missing engine modules
@pytest.fixture(autouse=True)
def mock_missing_engines(monkeypatch):
    """Auto-mock all missing engine modules for testing."""
    
    # List of engine modules that may not exist
    engine_modules = [
        'audio_generation_engine',
        'image_generation_engine',
        'video_generation_engine',
        'character_wizard',
        'world_generator',
        'shot_planning_engine',
        'narrative_engine',
        'puppet_layer_engine',
        'scene_breakdown_engine',
        'script_engine',
        'shot_engine',
        'storyboard_engine',
        'video_plan_engine',
        'comfyui_audio_engine',
        'comfyui_image_engine',
        'comfyui_video_engine',
    ]
    
    for module_name in engine_modules:
        if module_name not in sys.modules:
            # Create a mock module
            mock_module = MagicMock()
            sys.modules[module_name] = mock_module
            
            # Add common engine classes
            if 'audio' in module_name.lower():
                mock_module.AudioGenerationEngine = Mock
                mock_module.ComfyUIAudioEngine = Mock
            elif 'image' in module_name.lower():
                mock_module.ImageGenerationEngine = Mock
                mock_module.ComfyUIImageEngine = Mock
            elif 'video' in module_name.lower():
                mock_module.VideoGenerationEngine = Mock
                mock_module.ComfyUIVideoEngine = Mock
            elif 'character' in module_name.lower():
                mock_module.CharacterWizard = Mock
                mock_module.CharacterWizardOrchestrator = Mock
            elif 'world' in module_name.lower():
                mock_module.WorldGenerator = Mock
            elif 'shot_planning' in module_name.lower():
                mock_module.ShotPlanningEngine = Mock
            elif 'narrative' in module_name.lower():
                mock_module.NarrativeEngine = Mock
            elif 'puppet' in module_name.lower():
                mock_module.PuppetLayerEngine = Mock
            elif 'scene_breakdown' in module_name.lower():
                mock_module.SceneBreakdownEngine = Mock
            elif 'script' in module_name.lower():
                mock_module.ScriptEngine = Mock
            elif 'shot_engine' in module_name.lower():
                mock_module.ShotEngine = Mock
            elif 'storyboard' in module_name.lower():
                mock_module.StoryboardEngine = Mock
            elif 'video_plan' in module_name.lower():
                mock_module.VideoPlanEngine = Mock
    
    yield
    
    # Cleanup: remove mocked modules
    for module_name in engine_modules:
        if module_name in sys.modules:
            del sys.modules[module_name]
