# StoryCore Integration Package
# Provides integration management for audio, 3D, and HTTP components

from .integration_manager import IntegrationManager, create_integration_manager

__all__ = [
    'IntegrationManager',
    'create_integration_manager'
]

# Package metadata
__version__ = "1.0.0"
__author__ = "StoryCore Team"
__description__ = "Integration management for StoryCore components"