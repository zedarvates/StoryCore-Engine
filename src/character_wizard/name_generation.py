"""
Name Generation Module for Character Generation

This module handles character name generation using AI-powered and fallback methods.
"""

import random

from .models import AutoGenerationParams
from .name_generator import CharacterNameGenerator
from .archetypes import CharacterArchetype


class NameGenerator:
    """Handles character name generation"""

    def __init__(self):
        """Initialize the name generator"""
        self.name_databases = self._load_name_databases()
        self.name_generator = CharacterNameGenerator()

    def generate_character_name(self, params: AutoGenerationParams, archetype: CharacterArchetype) -> str:
        """
        Generate appropriate character name using AI-powered name generation

        This method uses the CharacterNameGenerator to create contextually
        appropriate names based on:
        - Cultural context
        - Genre conventions
        - Character archetype
        - Personality traits (if available)

        Falls back to simple name selection if AI generation fails.
        """
        try:
            # Get cultural context
            culture = params.cultural_context or "western"
            genre = params.genre

            # Use AI-powered name generation
            name = self.name_generator.generate_name(
                culture=culture,
                genre=genre,
                archetype_role=archetype.role.value,
                personality_traits=archetype.typical_traits,
                style_preference=None  # Let the generator decide based on genre
            )

            # Validate generated name
            if name and len(name) >= 2:
                return name

        except Exception as e:
            # Log error and fall back to simple generation
            print(f"AI name generation failed: {e}. Using fallback method.")

        # Fallback to simple name selection from database
        return self._generate_simple_name_fallback(params, archetype)

    def _generate_simple_name_fallback(self, params: AutoGenerationParams, archetype: CharacterArchetype) -> str:
        """Fallback method for name generation using predefined databases"""
        # Get name database for genre/culture
        culture = params.cultural_context or "western"
        genre = params.genre

        # Select name database
        name_db_key = f"{culture}_{genre}"
        if name_db_key not in self.name_databases:
            name_db_key = culture
        if name_db_key not in self.name_databases:
            name_db_key = "western"

        name_db = self.name_databases[name_db_key]

        # Select appropriate name list based on archetype
        if archetype.role in [self._get_archetype_role("hero"), self._get_archetype_role("mentor")]:
            names = name_db.get("strong_names", name_db["common"])
        elif archetype.role == self._get_archetype_role("villain"):
            names = name_db.get("dark_names", name_db["common"])
        else:
            names = name_db["common"]

        return random.choice(names)

    def _load_name_databases(self) -> dict[str, dict[str, list[str]]]:
        """Load name databases for different cultures and genres"""
        return {
            "western": {
                "common": ["Alex", "Jordan", "Sam", "Riley", "Casey", "Morgan", "Taylor", "Avery"],
                "strong_names": ["Alexander", "Victoria", "William", "Elizabeth", "James", "Catherine", "Michael", "Sarah"],
                "dark_names": ["Damien", "Raven", "Victor", "Lilith", "Adrian", "Morgana", "Sebastian", "Scarlett"]
            },
            "fantasy": {
                "common": ["Aeliana", "Thorin", "Lyralei", "Gareth", "Seraphina", "Kael", "Aria", "Daven"],
                "strong_names": ["Aragorn", "Galadriel", "Theron", "Elara", "Aldric", "Celestine", "Valerian", "Isadora"],
                "dark_names": ["Malachar", "Nyx", "Vex", "Bellatrix", "Draven", "Morwyn", "Zephyr", "Ravenna"]
            },
            "sci-fi": {
                "common": ["Zara", "Kai", "Nova", "Orion", "Luna", "Phoenix", "Sage", "Atlas"],
                "strong_names": ["Commander Nova", "Captain Orion", "Admiral Zara", "General Phoenix", "Major Atlas"],
                "dark_names": ["Vex", "Cipher", "Shadow", "Void", "Nexus", "Echo", "Wraith", "Phantom"]
            },
            "modern": {
                "common": ["Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia", "Mason"],
                "strong_names": ["Alexander", "Victoria", "Benjamin", "Charlotte", "Theodore", "Amelia", "Sebastian", "Grace"],
                "dark_names": ["Raven", "Damien", "Scarlett", "Victor", "Lilith", "Adrian", "Morgana", "Sebastian"]
            }
        }

    def _get_archetype_role(self, role_name: str):
        """Helper to get archetype role enum"""
        from .archetypes import ArchetypeRole
        return ArchetypeRole[role_name.upper()]