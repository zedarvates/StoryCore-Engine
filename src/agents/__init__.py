"""
StoryCore Agents Package

This package contains tools for managing agent cards in StoryCore.

Modules:
    - card_generator: Generate and manage agent card JSON files
    - image_generator: Generate agent card images using ComfyUI

Usage:
    from src.agents.card_generator import AgentCardGenerator
    from src.agents.image_generator import AgentImageGenerator
"""

from .card_generator import (
    AgentCardGenerator,
    create_scientific_audit_card,
    create_antifake_card,
)
from .image_generator import (
    AgentImageGenerator,
    generate_agent_image,
    get_prompt_for_manual,
)

__all__ = [
    "AgentCardGenerator",
    "AgentImageGenerator",
    "create_scientific_audit_card",
    "create_antifake_card",
    "generate_agent_image",
    "get_prompt_for_manual",
]
