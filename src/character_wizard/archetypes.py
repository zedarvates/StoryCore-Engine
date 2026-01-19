"""
Character Archetype Definitions and Loading

This module defines character archetypes and provides loading functionality
for the AutoCharacterGenerator system.
"""

from enum import Enum
from typing import Dict
from dataclasses import dataclass


class ArchetypeRole(Enum):
    """Character archetype roles"""
    HERO = "hero"
    MENTOR = "mentor"
    VILLAIN = "villain"
    ALLY = "ally"
    TRICKSTER = "trickster"
    GUARDIAN = "guardian"
    INNOCENT = "innocent"
    REBEL = "rebel"


@dataclass
class CharacterArchetype:
    """Character archetype definition"""
    role: ArchetypeRole
    name: str
    description: str
    typical_traits: list[str]
    strengths: list[str]
    flaws: list[str]
    motivations: list[str]
    fears: list[str]
    voice_style: str
    appearance_notes: str


def load_archetypes() -> Dict[str, CharacterArchetype]:
    """Load character archetype definitions"""
    return {
        "hero": CharacterArchetype(
            role=ArchetypeRole.HERO,
            name="Hero",
            description="The protagonist who drives the story forward",
            typical_traits=["brave", "determined", "loyal", "curious", "resilient", "compassionate"],
            strengths=["leadership", "courage", "empathy", "perseverance"],
            flaws=["impulsive", "stubborn", "self-doubting", "reckless"],
            motivations=["save others", "find truth", "restore justice", "protect loved ones"],
            fears=["failure", "losing loved ones", "not being good enough", "betrayal"],
            voice_style="confident but humble",
            appearance_notes="strong, approachable, distinctive"
        ),
        "villain": CharacterArchetype(
            role=ArchetypeRole.VILLAIN,
            name="Villain",
            description="The antagonist who opposes the hero",
            typical_traits=["cunning", "ambitious", "ruthless", "charismatic", "intelligent", "manipulative"],
            strengths=["strategic thinking", "persuasion", "resource control", "intimidation"],
            flaws=["arrogant", "obsessive", "paranoid", "cruel"],
            motivations=["gain power", "seek revenge", "impose order", "prove superiority"],
            fears=["losing control", "being exposed", "weakness", "irrelevance"],
            voice_style="commanding and sophisticated",
            appearance_notes="imposing, elegant, memorable"
        ),
        "mentor": CharacterArchetype(
            role=ArchetypeRole.MENTOR,
            name="Mentor",
            description="The wise guide who helps the hero",
            typical_traits=["wise", "patient", "experienced", "caring", "insightful", "mysterious"],
            strengths=["knowledge", "guidance", "emotional support", "connections"],
            flaws=["secretive", "overprotective", "haunted by past", "cryptic"],
            motivations=["guide others", "pass on knowledge", "atone for past", "prevent mistakes"],
            fears=["student's failure", "repeating past mistakes", "being forgotten", "inadequacy"],
            voice_style="wise and measured",
            appearance_notes="distinguished, weathered, trustworthy"
        ),
        "ally": CharacterArchetype(
            role=ArchetypeRole.ALLY,
            name="Ally",
            description="The loyal companion who supports the hero",
            typical_traits=["loyal", "supportive", "reliable", "skilled", "brave", "friendly"],
            strengths=["specialized skills", "unwavering support", "complementary abilities", "connections"],
            flaws=["dependent", "jealous", "impulsive", "overconfident"],
            motivations=["support friends", "prove worth", "find belonging", "seek adventure"],
            fears=["abandonment", "inadequacy", "letting others down", "being replaced"],
            voice_style="supportive and energetic",
            appearance_notes="approachable, competent, distinctive"
        ),
        "trickster": CharacterArchetype(
            role=ArchetypeRole.TRICKSTER,
            name="Trickster",
            description="The unpredictable character who brings chaos and insight",
            typical_traits=["clever", "unpredictable", "humorous", "rebellious", "insightful", "chaotic"],
            strengths=["creativity", "adaptability", "humor", "unconventional thinking"],
            flaws=["unreliable", "selfish", "destructive", "immature"],
            motivations=["seek freedom", "expose truth", "cause change", "entertain self"],
            fears=["being controlled", "boredom", "conformity", "being ignored"],
            voice_style="witty and unpredictable",
            appearance_notes="quirky, colorful, memorable"
        )
    }