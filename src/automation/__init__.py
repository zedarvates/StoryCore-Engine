"""
Automation Module for StoryCore-Engine

Centralizes all automation functionality:
- Dialogue generation and management
- Character grid generation
- Prompt enhancement
- Automation API endpoints
"""

from .dialogue_automation import (
    DialogueAutomation,
    DialogueContext,
    DialogueLine,
    DialogueScene,
    DialogueType,
    EmotionIntensity
)

from .character_grid import (
    CharacterGridAutomation,
    CharacterGridConfig,
    CharacterGridBundle,
    CharacterOutfit,
    CharacterPose,
    Expression,
    GridPanel,
    GridSize
)

from .prompt_enhancer import (
    PromptEnhancer,
    PromptStyle,
    LightingType,
    CameraAngle,
    MoodType,
    QualityTier,
    EnhancedPrompt
)

__all__ = [
    # Dialogue
    "DialogueAutomation",
    "DialogueContext", 
    "DialogueLine",
    "DialogueScene",
    "DialogueType",
    "EmotionIntensity",
    
    # Character Grid
    "CharacterGridAutomation",
    "CharacterGridConfig",
    "CharacterGridBundle",
    "CharacterOutfit",
    "CharacterPose",
    "Expression",
    "GridPanel",
    "GridSize",
    
    # Prompt Enhancement
    "PromptEnhancer",
    "PromptStyle",
    "LightingType",
    "CameraAngle",
    "MoodType",
    "QualityTier",
    "EnhancedPrompt"
]

