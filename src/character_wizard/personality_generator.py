"""
Personality Generation Module

This module handles personality generation using psychological models and archetype traits.
"""

import random
from typing import Dict, List
from .models import AutoGenerationParams, PersonalityProfile
from .archetypes import CharacterArchetype, ArchetypeRole


class PersonalityGenerator:
    """Handles personality generation for characters"""

    def __init__(self):
        """Initialize the personality generator"""
        self.trait_combinations = self._load_trait_combinations()

    def generate_personality(self, params: AutoGenerationParams, archetype: CharacterArchetype) -> PersonalityProfile:
        """
        Generate personality using psychological models

        This method uses the Big Five personality model (OCEAN) combined with
        archetype-specific traits to create psychologically coherent characters.

        The Big Five Model:
        - Openness: Creativity, curiosity, open to new experiences
        - Conscientiousness: Organization, dependability, self-discipline
        - Extraversion: Sociability, assertiveness, energy level
        - Agreeableness: Compassion, cooperation, trust
        - Neuroticism: Emotional stability, anxiety, mood swings

        Algorithm:
        1. Start with archetype-based Big Five baseline
        2. Apply genre-specific modifiers
        3. Add controlled randomization for uniqueness
        4. Ensure trait coherence and avoid contradictions
        5. Generate derived behavioral patterns
        6. Create motivations aligned with personality
        """
        personality = PersonalityProfile()

        # Step 1: Get archetype baseline for Big Five traits
        trait_base = self.trait_combinations[archetype.role.value]

        # Step 2: Apply genre modifiers to traits
        genre_modifiers = self._get_genre_personality_modifiers(params.genre)

        # Step 3: Generate Big Five traits with controlled variation
        # Use a smaller random range for more consistent personalities
        variation_range = 0.15  # ±15% variation from baseline

        personality.openness = self._apply_trait_modifiers(
            trait_base["openness"],
            genre_modifiers.get("openness", 0.0),
            variation_range
        )
        personality.conscientiousness = self._apply_trait_modifiers(
            trait_base["conscientiousness"],
            genre_modifiers.get("conscientiousness", 0.0),
            variation_range
        )
        personality.extraversion = self._apply_trait_modifiers(
            trait_base["extraversion"],
            genre_modifiers.get("extraversion", 0.0),
            variation_range
        )
        personality.agreeableness = self._apply_trait_modifiers(
            trait_base["agreeableness"],
            genre_modifiers.get("agreeableness", 0.0),
            variation_range
        )
        personality.neuroticism = self._apply_trait_modifiers(
            trait_base["neuroticism"],
            genre_modifiers.get("neuroticism", 0.0),
            variation_range
        )

        # Step 4: Generate primary traits based on Big Five scores
        personality.primary_traits = self._derive_traits_from_big_five(
            personality, archetype
        )

        # Step 5: Generate strengths and flaws with coherence checking
        personality.strengths = self._generate_coherent_strengths(
            personality, archetype
        )
        personality.flaws = self._generate_coherent_flaws(
            personality, archetype
        )

        # Step 6: Generate goals and motivations aligned with personality
        personality.external_goal = self._generate_external_goal(
            archetype, personality, params.genre
        )
        personality.internal_need = self._generate_internal_need(
            archetype, personality
        )
        personality.fears = self._generate_coherent_fears(
            personality, archetype
        )
        personality.values = self._generate_values(
            archetype, params.genre
        )

        # Step 7: Generate behavioral patterns derived from Big Five
        personality.stress_response = self._generate_stress_response(personality)
        personality.conflict_style = self._generate_conflict_style(personality)
        personality.emotional_expression = self._generate_emotional_expression(personality)
        personality.decision_making_style = self._generate_decision_making_style(personality)

        # Step 8: Generate relationship patterns
        personality.attachment_style = self._generate_attachment_style(personality)
        personality.social_preferences = self._generate_social_preferences(personality)
        personality.trust_patterns = self._generate_trust_patterns(personality)

        # Step 9: Validate personality coherence
        self._validate_personality_coherence(personality)

        return personality

    def _get_genre_personality_modifiers(self, genre: str) -> Dict[str, float]:
        """
        Get genre-specific personality modifiers

        Different genres tend to favor certain personality traits.
        These modifiers adjust the baseline archetype traits to fit genre conventions.
        """
        modifiers = {
            "fantasy": {
                "openness": 0.1,  # Fantasy characters tend to be more open to magic/wonder
                "conscientiousness": 0.05,
                "extraversion": 0.0,
                "agreeableness": 0.05,
                "neuroticism": -0.05
            },
            "sci-fi": {
                "openness": 0.15,  # Sci-fi characters embrace new technology/ideas
                "conscientiousness": 0.1,  # Often more methodical
                "extraversion": -0.05,
                "agreeableness": 0.0,
                "neuroticism": 0.0
            },
            "horror": {
                "openness": -0.05,
                "conscientiousness": 0.0,
                "extraversion": -0.1,  # Horror characters often more introverted
                "agreeableness": 0.0,
                "neuroticism": 0.15  # Higher anxiety/stress
            },
            "modern": {
                "openness": 0.0,
                "conscientiousness": 0.0,
                "extraversion": 0.05,
                "agreeableness": 0.05,
                "neuroticism": 0.0
            },
            "romance": {
                "openness": 0.1,
                "conscientiousness": 0.0,
                "extraversion": 0.1,
                "agreeableness": 0.15,  # Romance characters tend to be more agreeable
                "neuroticism": 0.05
            }
        }
        return modifiers.get(genre, {})

    def _apply_trait_modifiers(self, base_value: float, modifier: float, variation_range: float) -> float:
        """
        Apply modifiers and variation to a trait value

        Args:
            base_value: Base trait value from archetype (0.0 to 1.0)
            modifier: Genre-specific modifier (-1.0 to 1.0)
            variation_range: Random variation range (e.g., 0.15 for ±15%)

        Returns:
            Modified trait value clamped to [0.0, 1.0]
        """
        # Apply modifier
        value = base_value + modifier

        # Add controlled random variation
        variation = random.uniform(-variation_range, variation_range)
        value += variation

        # Clamp to valid range
        return max(0.0, min(1.0, value))

    def _derive_traits_from_big_five(self, personality: PersonalityProfile,
                                     archetype: CharacterArchetype) -> List[str]:
        """
        Derive descriptive traits from Big Five scores

        This creates human-readable trait descriptions based on the
        quantitative Big Five personality scores.
        """
        traits = []

        # Start with archetype base traits
        archetype_traits = list(archetype.typical_traits)

        # Add traits based on Big Five scores
        # High Openness (> 0.6)
        if personality.openness > 0.7:
            traits.extend(["creative", "imaginative", "curious"])
        elif personality.openness > 0.6:
            traits.extend(["open-minded", "adventurous"])

        # High Conscientiousness (> 0.6)
        if personality.conscientiousness > 0.7:
            traits.extend(["disciplined", "organized", "reliable"])
        elif personality.conscientiousness > 0.6:
            traits.extend(["responsible", "thorough"])

        # High Extraversion (> 0.6)
        if personality.extraversion > 0.7:
            traits.extend(["outgoing", "energetic", "sociable"])
        elif personality.extraversion > 0.6:
            traits.extend(["friendly", "talkative"])
        elif personality.extraversion < 0.4:
            traits.extend(["reserved", "introspective"])

        # High Agreeableness (> 0.6)
        if personality.agreeableness > 0.7:
            traits.extend(["compassionate", "cooperative", "trusting"])
        elif personality.agreeableness > 0.6:
            traits.extend(["kind", "empathetic"])
        elif personality.agreeableness < 0.4:
            traits.extend(["skeptical", "competitive"])

        # High Neuroticism (> 0.6)
        if personality.neuroticism > 0.7:
            traits.extend(["anxious", "sensitive", "emotional"])
        elif personality.neuroticism > 0.6:
            traits.extend(["cautious", "self-aware"])
        elif personality.neuroticism < 0.4:
            traits.extend(["calm", "resilient"])

        # Combine archetype traits with derived traits, avoiding duplicates
        all_traits = list(set(archetype_traits + traits))

        # Select 4-5 most relevant traits
        # Prioritize archetype traits, then add derived traits
        final_traits = []
        for trait in archetype_traits:
            if trait in all_traits and len(final_traits) < 5:
                final_traits.append(trait)
                all_traits.remove(trait)

        # Fill remaining slots with derived traits
        while len(final_traits) < 5 and all_traits:
            trait = random.choice(all_traits)
            final_traits.append(trait)
            all_traits.remove(trait)

        return final_traits

    def _generate_coherent_strengths(self, personality: PersonalityProfile,
                                     archetype: CharacterArchetype) -> List[str]:
        """
        Generate strengths that align with personality traits

        Ensures strengths are coherent with Big Five scores and don't
        contradict the character's personality profile.
        """
        potential_strengths = list(archetype.strengths)

        # Add strengths based on high Big Five scores
        if personality.openness > 0.7:
            potential_strengths.extend(["creativity", "adaptability", "innovation"])
        if personality.conscientiousness > 0.7:
            potential_strengths.extend(["reliability", "organization", "persistence"])
        if personality.extraversion > 0.7:
            potential_strengths.extend(["leadership", "communication", "enthusiasm"])
        if personality.agreeableness > 0.7:
            potential_strengths.extend(["empathy", "cooperation", "diplomacy"])
        if personality.neuroticism < 0.3:
            potential_strengths.extend(["emotional stability", "composure", "confidence"])

        # Remove duplicates and select 2-3 strengths
        unique_strengths = list(set(potential_strengths))
        return random.sample(unique_strengths, min(3, len(unique_strengths)))

    def _generate_coherent_flaws(self, personality: PersonalityProfile,
                                 archetype: CharacterArchetype) -> List[str]:
        """
        Generate flaws that align with personality traits

        Flaws should be logical consequences of personality traits,
        creating psychologically realistic characters.
        """
        potential_flaws = list(archetype.flaws)

        # Add flaws based on extreme Big Five scores
        if personality.openness > 0.8:
            potential_flaws.extend(["impractical", "easily distracted", "unrealistic"])
        elif personality.openness < 0.3:
            potential_flaws.extend(["rigid", "close-minded", "resistant to change"])

        if personality.conscientiousness > 0.8:
            potential_flaws.extend(["perfectionist", "inflexible", "workaholic"])
        elif personality.conscientiousness < 0.3:
            potential_flaws.extend(["disorganized", "unreliable", "impulsive"])

        if personality.extraversion > 0.8:
            potential_flaws.extend(["attention-seeking", "impulsive", "overwhelming"])
        elif personality.extraversion < 0.3:
            potential_flaws.extend(["withdrawn", "socially awkward", "isolated"])

        if personality.agreeableness > 0.8:
            potential_flaws.extend(["naive", "pushover", "conflict-avoidant"])
        elif personality.agreeableness < 0.3:
            potential_flaws.extend(["cynical", "antagonistic", "uncooperative"])

        if personality.neuroticism > 0.7:
            potential_flaws.extend(["anxious", "insecure", "emotionally volatile"])

        # Remove duplicates and select 2-3 flaws
        unique_flaws = list(set(potential_flaws))
        return random.sample(unique_flaws, min(3, len(unique_flaws)))

    def _generate_external_goal(self, archetype: CharacterArchetype,
                                personality: PersonalityProfile, genre: str) -> str:
        """
        Generate external goal aligned with archetype and personality

        External goals are what the character consciously wants to achieve.
        """
        # Get base motivations from archetype
        base_goals = list(archetype.motivations)

        # Add genre-specific goals
        genre_goals = {
            "fantasy": ["find magical artifact", "defeat dark lord", "save the kingdom"],
            "sci-fi": ["discover new technology", "prevent catastrophe", "explore unknown space"],
            "horror": ["survive the night", "uncover the truth", "escape the threat"],
            "modern": ["achieve success", "find love", "solve the mystery"],
            "romance": ["win their heart", "overcome obstacles to love", "find true connection"]
        }

        if genre in genre_goals:
            base_goals.extend(genre_goals[genre])

        # Select goal that fits personality
        # High conscientiousness prefers structured goals
        if personality.conscientiousness > 0.7:
            structured_goals = [g for g in base_goals if any(word in g for word in ["achieve", "complete", "master"])]
            if structured_goals:
                return random.choice(structured_goals)

        return random.choice(base_goals)

    def _generate_coherent_fears(self, personality: PersonalityProfile,
                                 archetype: CharacterArchetype) -> List[str]:
        """
        Generate fears that align with personality and archetype

        Fears should be psychologically consistent with the character's
        personality traits and life experiences.
        """
        potential_fears = list(archetype.fears)

        # Add fears based on personality traits
        if personality.neuroticism > 0.7:
            potential_fears.extend(["making mistakes", "being judged", "losing control"])
        if personality.agreeableness > 0.7:
            potential_fears.extend(["conflict", "disappointing others", "being disliked"])
        if personality.extraversion < 0.3:
            potential_fears.extend(["social situations", "public speaking", "being center of attention"])
        if personality.conscientiousness > 0.7:
            potential_fears.extend(["failure", "chaos", "unpredictability"])
        if personality.openness < 0.3:
            potential_fears.extend(["change", "unknown", "new experiences"])

        # Remove duplicates and select 2-3 fears
        unique_fears = list(set(potential_fears))
        return random.sample(unique_fears, min(3, len(unique_fears)))

    def _validate_personality_coherence(self, personality: PersonalityProfile) -> None:
        """
        Validate personality coherence and fix contradictions

        Ensures that traits, strengths, and flaws don't contradict each other.
        This is a final validation step to catch any logical inconsistencies.
        """
        # Check for contradictory traits
        contradictions = {
            "brave": ["cowardly", "fearful"],
            "loyal": ["disloyal", "betrayer"],
            "honest": ["deceitful", "liar"],
            "kind": ["cruel", "mean"],
            "confident": ["insecure", "self-doubting"]
        }

        # Remove contradictory flaws
        for trait in personality.primary_traits:
            if trait in contradictions:
                for contradiction in contradictions[trait]:
                    if contradiction in personality.flaws:
                        personality.flaws.remove(contradiction)

        # Ensure we have minimum required elements
        if len(personality.primary_traits) < 3:
            personality.primary_traits.extend(["determined", "capable", "complex"][:3 - len(personality.primary_traits)])

        if len(personality.strengths) < 2:
            personality.strengths.extend(["resilience", "adaptability"][:2 - len(personality.strengths)])

        if len(personality.flaws) < 2:
            personality.flaws.extend(["stubborn", "impulsive"][:2 - len(personality.flaws)])

    def _generate_internal_need(self, archetype: CharacterArchetype, personality: PersonalityProfile) -> str:
        """Generate internal need based on archetype and personality"""
        needs_by_archetype = {
            ArchetypeRole.HERO: ["acceptance", "self-worth", "belonging", "purpose"],
            ArchetypeRole.VILLAIN: ["control", "recognition", "revenge", "validation"],
            ArchetypeRole.MENTOR: ["redemption", "legacy", "peace", "wisdom"],
            ArchetypeRole.ALLY: ["belonging", "recognition", "friendship", "purpose"],
            ArchetypeRole.TRICKSTER: ["freedom", "attention", "chaos", "fun"]
        }
        return random.choice(needs_by_archetype.get(archetype.role, ["acceptance", "purpose"]))

    def _generate_values(self, archetype: CharacterArchetype, genre: str) -> List[str]:
        """Generate character values"""
        base_values = {
            ArchetypeRole.HERO: ["justice", "loyalty", "courage", "compassion"],
            ArchetypeRole.VILLAIN: ["power", "control", "superiority", "order"],
            ArchetypeRole.MENTOR: ["wisdom", "guidance", "tradition", "growth"],
            ArchetypeRole.ALLY: ["friendship", "loyalty", "support", "teamwork"],
            ArchetypeRole.TRICKSTER: ["freedom", "creativity", "change", "humor"]
        }
        values = base_values.get(archetype.role, ["honesty", "family", "growth"])
        return random.sample(values, min(3, len(values)))

    def _generate_stress_response(self, personality: PersonalityProfile) -> str:
        """Generate stress response based on personality"""
        if personality.neuroticism > 0.7:
            return random.choice(["anxiety", "panic", "withdrawal", "aggression"])
        elif personality.extraversion > 0.6:
            return random.choice(["seek support", "become more active", "talk it out"])
        else:
            return random.choice(["internalize", "analyze", "seek solitude"])

    def _generate_conflict_style(self, personality: PersonalityProfile) -> str:
        """Generate conflict style based on personality"""
        if personality.agreeableness > 0.7:
            return "collaborative"
        elif personality.extraversion > 0.6:
            return "confrontational"
        elif personality.conscientiousness > 0.7:
            return "systematic"
        else:
            return "avoidant"

    def _generate_emotional_expression(self, personality: PersonalityProfile) -> str:
        """Generate emotional expression style"""
        if personality.extraversion > 0.6:
            return "expressive and open"
        elif personality.neuroticism > 0.6:
            return "intense and variable"
        else:
            return "controlled and measured"

    def _generate_decision_making_style(self, personality: PersonalityProfile) -> str:
        """Generate decision making style"""
        if personality.conscientiousness > 0.7:
            return "methodical and planned"
        elif personality.openness > 0.7:
            return "intuitive and creative"
        else:
            return "practical and cautious"

    def _generate_attachment_style(self, personality: PersonalityProfile) -> str:
        """Generate attachment style"""
        if personality.agreeableness > 0.7 and personality.neuroticism < 0.4:
            return "secure"
        elif personality.neuroticism > 0.6:
            return "anxious"
        elif personality.agreeableness < 0.4:
            return "avoidant"
        else:
            return "mixed"

    def _generate_social_preferences(self, personality: PersonalityProfile) -> str:
        """Generate social preferences"""
        if personality.extraversion > 0.6:
            return "enjoys large groups and social events"
        elif personality.extraversion < 0.4:
            return "prefers small groups or one-on-one interactions"
        else:
            return "comfortable in various social settings"

    def _generate_trust_patterns(self, personality: PersonalityProfile) -> str:
        """Generate trust patterns"""
        if personality.agreeableness > 0.7:
            return "trusts easily but can be hurt by betrayal"
        elif personality.agreeableness < 0.4:
            return "slow to trust but loyal once trust is earned"
        else:
            return "balanced approach to trust"

    def _load_trait_combinations(self) -> Dict[str, Dict[str, float]]:
        """Load Big Five trait combinations for different archetypes"""
        return {
            "hero": {
                "openness": 0.7,
                "conscientiousness": 0.8,
                "extraversion": 0.6,
                "agreeableness": 0.8,
                "neuroticism": 0.4
            },
            "villain": {
                "openness": 0.6,
                "conscientiousness": 0.7,
                "extraversion": 0.5,
                "agreeableness": 0.2,
                "neuroticism": 0.6
            },
            "mentor": {
                "openness": 0.9,
                "conscientiousness": 0.8,
                "extraversion": 0.4,
                "agreeableness": 0.7,
                "neuroticism": 0.3
            },
            "ally": {
                "openness": 0.6,
                "conscientiousness": 0.7,
                "extraversion": 0.7,
                "agreeableness": 0.8,
                "neuroticism": 0.4
            },
            "trickster": {
                "openness": 0.9,
                "conscientiousness": 0.3,
                "extraversion": 0.8,
                "agreeableness": 0.4,
                "neuroticism": 0.5
            }
        }