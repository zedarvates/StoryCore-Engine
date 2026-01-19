"""
Character Setup Wizard for StoryCore-Engine

This module provides comprehensive character creation capabilities including:
- Automatic character generation using AI
- Reference image-based character creation
- Character profile building and validation
- Integration with existing StoryCore-Engine systems
"""

from .character_wizard_orchestrator import CharacterWizardOrchestrator
from .state_manager import WizardStateManager
from .models import (
    CharacterProfile,
    VisualIdentity,
    PersonalityProfile,
    VoiceIdentity,
    BackstoryProfile,
    CoherenceAnchors,
    CharacterCreationResult,
    CreationMethod,
    PuppetCategory
)
from .config import CharacterWizardConfig
from .error_handler import CharacterWizardErrorHandler

__version__ = "1.0.0"
__all__ = [
    "CharacterWizardOrchestrator",
    "WizardStateManager",
    "CharacterProfile",
    "VisualIdentity", 
    "PersonalityProfile",
    "VoiceIdentity",
    "BackstoryProfile",
    "CoherenceAnchors",
    "CharacterCreationResult",
    "CreationMethod",
    "PuppetCategory",
    "CharacterWizardConfig",
    "CharacterWizardErrorHandler"
]