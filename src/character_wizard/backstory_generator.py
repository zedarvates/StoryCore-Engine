"""
Backstory Generation Module

This module handles the generation of character backstories and histories.
"""

import random
from .models import AutoGenerationParams, BackstoryProfile
from .archetypes import CharacterArchetype


class BackstoryGenerator:
    """Handles backstory generation for characters"""

    def __init__(self):
        """Initialize the backstory generator"""
        self.backstory_templates = self._load_backstory_templates()

    def generate_backstory(self, params: AutoGenerationParams, archetype: CharacterArchetype,
                           personality) -> BackstoryProfile:
        """Generate character backstory and history"""
        backstory = BackstoryProfile()

        # Get backstory template for genre and archetype
        template_key = f"{params.genre}_{archetype.role.value}"
        if template_key not in self.backstory_templates:
            template_key = archetype.role.value

        template = self.backstory_templates.get(template_key, self.backstory_templates["default"])

        # Generate origin story
        backstory.origin_story = self._generate_origin_story(template, personality, params)

        # Generate key life events
        backstory.key_life_events = self._generate_life_events(template, personality, params.age_range)

        # Generate formative experiences
        backstory.formative_experiences = self._generate_formative_experiences(personality, archetype)

        # Generate family and relationships
        backstory.family_background = self._generate_family_background(template, personality)
        backstory.significant_relationships = self._generate_relationships(personality, archetype)
        backstory.relationship_patterns = self._generate_relationship_patterns(personality)

        # Generate professional/social background
        backstory.occupation = self._generate_occupation(archetype, params.genre, params.age_range)
        backstory.education_level = self._generate_education_level(personality, backstory.occupation)
        backstory.social_status = self._generate_social_status(archetype, backstory.occupation)
        backstory.cultural_background = params.cultural_context or "western"

        # Generate secrets and mysteries
        backstory.hidden_aspects = self._generate_hidden_aspects(personality, archetype)
        backstory.secrets = self._generate_secrets(personality, archetype, params.genre)
        backstory.unresolved_conflicts = self._generate_unresolved_conflicts(personality, archetype)

        # Generate character arc potential
        backstory.growth_opportunities = self._generate_growth_opportunities(personality, archetype)
        backstory.potential_conflicts = self._generate_potential_conflicts(personality, archetype)
        backstory.transformation_triggers = self._generate_transformation_triggers(personality, archetype)

        return backstory

    def _generate_origin_story(self, template: dict, personality, params: AutoGenerationParams) -> str:
        """Generate character origin story"""
        patterns = template.get("origin_patterns", ["ordinary upbringing with defining moments"])
        pattern = random.choice(patterns)
        return f"Character with {pattern} in a {params.genre} setting"

    def _generate_life_events(self, template: dict, personality, age_range: str) -> list[str]:
        """Generate key life events"""
        events = template.get("life_events", ["overcame a personal challenge", "formed important relationships"])
        num_events = {"child": 2, "teen": 3, "young_adult": 4, "adult": 5, "elderly": 6}.get(age_range, 3)
        return random.sample(events, min(num_events, len(events)))

    def _generate_formative_experiences(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate formative experiences"""
        experiences = [
            "early display of natural talents",
            "significant loss or trauma",
            "moment of moral choice",
            "discovery of personal values"
        ]
        return random.sample(experiences, random.randint(2, 3))

    def _generate_family_background(self, template: dict, personality) -> str:
        """Generate family background"""
        backgrounds = [
            "close-knit family with strong values",
            "complicated family with mixed relationships",
            "absent or distant family requiring self-reliance",
            "supportive family that encouraged growth"
        ]
        return random.choice(backgrounds)

    def _generate_relationships(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate significant relationships"""
        relationships = []
        if personality.agreeableness > 0.6:
            relationships.extend(["loyal best friend", "trusted mentor"])
        if archetype.role in [self._get_archetype_role("hero"), self._get_archetype_role("villain")]:
            relationships.extend(["love interest", "rival turned ally"])
        if personality.extraversion > 0.6:
            relationships.extend(["wide circle of acquaintances", "close team members"])

        return random.sample(relationships, min(3, len(relationships))) if relationships else ["few but deep friendships"]

    def _generate_relationship_patterns(self, personality) -> str:
        """Generate relationship patterns"""
        if personality.agreeableness > 0.7:
            return "forms deep, lasting bonds with others"
        elif personality.extraversion > 0.6:
            return "enjoys meeting new people and building networks"
        else:
            return "selective about relationships but deeply loyal"

    def _generate_occupation(self, archetype: CharacterArchetype, genre: str, age_range: str) -> str:
        """Generate character occupation"""
        occupations_by_genre = {
            "fantasy": ["warrior", "mage", "merchant", "noble", "scholar", "ranger"],
            "sci-fi": ["pilot", "engineer", "scientist", "soldier", "diplomat", "explorer"],
            "modern": ["teacher", "doctor", "artist", "business owner", "writer", "consultant"],
            "horror": ["investigator", "researcher", "journalist", "student", "caretaker", "local resident"]
        }

        occupations = occupations_by_genre.get(genre, occupations_by_genre["modern"])

        # Filter by age appropriateness
        if age_range in ["child", "teen"]:
            return "student"

        return random.choice(occupations)

    def _generate_education_level(self, personality, occupation: str) -> str:
        """Generate education level"""
        if occupation in ["doctor", "scientist", "scholar", "engineer"]:
            return "advanced degree"
        elif occupation in ["teacher", "business owner", "diplomat"]:
            return "college degree"
        elif personality.openness > 0.7:
            return "self-educated"
        else:
            return "practical training"

    def _generate_social_status(self, archetype: CharacterArchetype, occupation: str) -> str:
        """Generate social status"""
        if archetype.role in [self._get_archetype_role("hero"), self._get_archetype_role("villain")]:
            return random.choice(["rising", "established", "influential"])
        elif occupation in ["noble", "doctor", "business owner"]:
            return "upper class"
        elif occupation in ["warrior", "pilot", "teacher"]:
            return "middle class"
        else:
            return "working class"

    def _generate_hidden_aspects(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate hidden aspects of character"""
        aspects = []
        if personality.neuroticism > 0.6:
            aspects.append("struggles with self-doubt")
        if archetype.role == self._get_archetype_role("hero"):
            aspects.append("fears not living up to expectations")
        if personality.agreeableness < 0.4:
            aspects.append("has difficulty trusting others")

        return aspects[:2]  # Limit to 2 aspects

    def _generate_secrets(self, personality, archetype: CharacterArchetype, genre: str) -> list[str]:
        """Generate character secrets"""
        secrets = [
            "hidden talent or ability",
            "past mistake they regret",
            "family secret",
            "unrevealed connection to another character"
        ]
        return random.sample(secrets, random.randint(1, 2))

    def _generate_unresolved_conflicts(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate unresolved conflicts"""
        conflicts = [
            "conflict with family member",
            "professional rivalry",
            "moral dilemma from the past",
            "unfulfilled promise or obligation"
        ]
        return random.sample(conflicts, random.randint(1, 2))

    def _generate_growth_opportunities(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate character growth opportunities"""
        opportunities = []
        if personality.agreeableness < 0.5:
            opportunities.append("learning to trust and work with others")
        if personality.conscientiousness < 0.5:
            opportunities.append("developing discipline and follow-through")
        if personality.neuroticism > 0.6:
            opportunities.append("overcoming fears and self-doubt")

        return opportunities[:3]

    def _generate_potential_conflicts(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate potential conflicts"""
        conflicts = []
        if archetype.role == self._get_archetype_role("hero"):
            conflicts.extend(["moral dilemma", "choosing between duty and desire"])
        if personality.extraversion > 0.6:
            conflicts.append("conflict between individual and group needs")
        if personality.conscientiousness > 0.7:
            conflicts.append("perfectionism causing problems")

        return conflicts[:2]

    def _generate_transformation_triggers(self, personality, archetype: CharacterArchetype) -> list[str]:
        """Generate transformation triggers"""
        triggers = [
            "major loss or setback",
            "discovery of new truth",
            "meeting someone who challenges their worldview",
            "being forced to confront their greatest fear"
        ]
        return random.sample(triggers, random.randint(1, 2))

    def _load_backstory_templates(self) -> dict[str, dict[str, list[str]]]:
        """Load backstory templates for different archetypes and genres"""
        return {
            "hero": {
                "origin_patterns": [
                    "humble beginnings with hidden potential",
                    "tragic loss that sparked their journey",
                    "ordinary person thrust into extraordinary circumstances",
                    "chosen one with reluctant acceptance of destiny"
                ],
                "life_events": [
                    "discovered their abilities",
                    "lost a mentor figure",
                    "faced their greatest fear",
                    "made a difficult sacrifice"
                ]
            },
            "villain": {
                "origin_patterns": [
                    "corrupted by power or tragedy",
                    "born into darkness and embraced it",
                    "fell from grace due to pride",
                    "twisted by injustice or betrayal"
                ],
                "life_events": [
                    "betrayed by someone they trusted",
                    "gained significant power",
                    "lost everything they cared about",
                    "discovered a terrible truth"
                ]
            },
            "default": {
                "origin_patterns": [
                    "ordinary upbringing with defining moments",
                    "shaped by family and community",
                    "influenced by key relationships",
                    "molded by personal challenges"
                ],
                "life_events": [
                    "overcame a personal challenge",
                    "formed important relationships",
                    "made a life-changing decision",
                    "learned a valuable lesson"
                ]
            }
        }

    def _get_archetype_role(self, role_name: str):
        """Helper to get archetype role enum"""
        from .archetypes import ArchetypeRole
        return ArchetypeRole[role_name.upper()]