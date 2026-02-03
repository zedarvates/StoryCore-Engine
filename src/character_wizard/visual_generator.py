"""
Enhanced Visual Generator Module - Complete Personality-to-Appearance Mapping

This module handles personality-to-appearance mapping, generating visual characteristics
that align with a character's personality traits, archetype, and backstory.

Based on the Big Five Personality Model (OCEAN):
- Openness: Creativity, curiosity, open to new experiences
- Conscientiousness: Organization, dependability, self-discipline
- Extraversion: Sociability, assertiveness, energy level
- Agreeableness: Compassion, cooperation, trust
- Neuroticism: Emotional stability, anxiety, mood swings

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import random
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


# =============================================================================
# ENUMS
# =============================================================================

class ClothingStyle(Enum):
    """Character clothing styles mapped from personality traits."""
    CASUAL = "casual"
    FORMAL = "formal"
    ELEGANT = "elegant"
    EDGY = "edgy"
    BOHEMIAN = "bohemian"
    SPORTY = "sporty"
    VINTAGE = "vintage"
    MINIMALIST = "minimalist"
    MAXIMALIST = "maximalist"
    MILITARY = "military"
    FANTASY = "fantasy"
    SCI_FI = "sci_fi"
    GOTHIC = "gothic"
    PREPPY = "preppy"
    GRUNGE = "grunge"
    CLASSIC = "classic"
    ATHLEISURE = "athleisure"


class ColorPalette(Enum):
    """Character color palettes mapped from personality traits."""
    WARM = "warm"
    COOL = "cool"
    NEUTRAL = "neutral"
    EARTH = "earth"
    PASTEL = "pastel"
    VIBRANT = "vibrant"
    DARK = "dark"
    MONOCHROME = "monochrome"
    ANALOGOUS = "analogous"
    COMPLEMENTARY = "complementary"


class AccessoryType(Enum):
    """Types of accessories characters might wear."""
    JEWELRY = "jewelry"
    HEADWEAR = "headwear"
    EYEWEAR = "eyewear"
    BAGS = "bags"
    BELTS = "belts"
    SCARVES = "scarves"
    GLOVES = "gloves"
    FOOTWEAR = "footwear"
    WATCHES = "watches"
    TECH = "tech"


class GroomingLevel(Enum):
    """Grooming and maintenance levels."""
    MINIMAL = "minimal"
    PRACTICAL = "practical"
    AVERAGE = "average"
    POLISHED = "polished"
    METICULOUS = "meticulous"


class VisualImpression(Enum):
    """Overall visual impressions characters convey."""
    APPROACHABLE = "approachable"
    AUTHORITATIVE = "authoritative"
    MYSTERIOUS = "mysterious"
    ENERGETIC = "energetic"
    SOPHISTICATED = "sophisticated"
    REBEL = "rebel"
    NURTURING = "nurturing"
    INTELLECTUAL = "intellectual"
    PLAYFUL = "playful"
    STOIC = "stoic"


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class PersonalityTraits:
    """Big Five personality traits with normalized values (0.0 to 1.0)."""
    openness: float = 0.5
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5
    
    def get_trait(self, trait_name: str) -> float:
        """Get a trait value by name."""
        return getattr(self, trait_name.lower(), 0.5)
    
    def get_all_traits(self) -> Dict[str, float]:
        """Return all traits as a dictionary."""
        return {
            "openness": self.openness,
            "conscientiousness": self.conscientiousness,
            "extraversion": self.extraversion,
            "agreeableness": self.agreeableness,
            "neuroticism": self.neuroticism
        }


@dataclass
class AppearanceSuggestion:
    """Complete appearance characteristics based on personality."""
    clothing_style: ClothingStyle
    color_palette: ColorPalette
    accessories: List[str]
    grooming_level: GroomingLevel
    overall_impression: VisualImpression
    clothing_colors: List[str]
    recommended_colors_avoid: List[str]
    accessory_types: List[AccessoryType]
    grooming_notes: List[str]
    formality_level: float
    expressiveness: float
    confidence_score: float
    reasoning: List[str] = field(default_factory=list)


# =============================================================================
# VISUAL GENERATOR CLASS
# =============================================================================

class VisualGenerator:
    """
    Generates appearance characteristics based on personality traits and archetype.
    
    Creates visually coherent characters where:
    - Clothing style reflects personality (e.g., formal = conscientious)
    - Color choices match emotional tone (e.g., dark = introverted)
    - Accessories align with values (e.g., minimal = practical)
    """

    # Trait-to-Clothing Style Correlations
    CLOTHING_CORRELATIONS = {
        "openness": {
            ClothingStyle.BOHEMIAN: 0.9,
            ClothingStyle.VINTAGE: 0.8,
            ClothingStyle.EDGY: 0.7,
            ClothingStyle.MAXIMALIST: 0.7,
            ClothingStyle.GOTHIC: 0.5,
            ClothingStyle.FANTASY: 0.6,
            ClothingStyle.CLASSIC: -0.3,
            ClothingStyle.MINIMALIST: -0.2,
            ClothingStyle.PREPPY: -0.4,
        },
        "conscientiousness": {
            ClothingStyle.FORMAL: 0.9,
            ClothingStyle.MINIMALIST: 0.8,
            ClothingStyle.PREPPY: 0.7,
            ClothingStyle.CLASSIC: 0.6,
            ClothingStyle.ATHLEISURE: 0.5,
            ClothingStyle.GRUNGE: -0.8,
            ClothingStyle.EDGY: -0.5,
            ClothingStyle.BOHEMIAN: -0.4,
        },
        "extraversion": {
            ClothingStyle.MAXIMALIST: 0.9,
            ClothingStyle.BOHEMIAN: 0.7,
            ClothingStyle.EDGY: 0.6,
            ClothingStyle.SPORTY: 0.5,
            ClothingStyle.VIBRANT: 0.8,
            ClothingStyle.MINIMALIST: -0.6,
            ClothingStyle.CLASSIC: -0.3,
            ClothingStyle.GOTHIC: -0.2,
        },
        "agreeableness": {
            ClothingStyle.BOHEMIAN: 0.6,
            ClothingStyle.CASUAL: 0.5,
            ClothingStyle.PASTEL: 0.7,
            ClothingStyle.PREPPY: 0.5,
            ClothingStyle.EDGY: -0.5,
            ClothingStyle.GOTHIC: -0.4,
            ClothingStyle.MILITARY: -0.3,
        },
        "neuroticism": {
            ClothingStyle.DARK: 0.7,
            ClothingStyle.BLACK: 0.6,
            ClothingStyle.VIBRANT: -0.4,
            ClothingStyle.LIGHT: -0.3,
            ClothingStyle.PASTEL: -0.5,
            ClothingStyle.BOHEMIAN: 0.2,
        },
    }
    
    # Trait-to-Color Palette Correlations
    COLOR_CORRELATIONS = {
        "openness": {
            ColorPalette.VIBRANT: 0.8,
            ColorPalette.COMPLEMENTARY: 0.7,
            ColorPalette.WARM: 0.4,
            ColorPalette.NEUTRAL: -0.3,
            ColorPalette.MONOCHROME: -0.5,
        },
        "conscientiousness": {
            ColorPalette.NEUTRAL: 0.8,
            ColorPalette.MONOCHROME: 0.7,
            ColorPalette.ANALOGOUS: 0.6,
            ColorPalette.VIBRANT: -0.4,
            ColorPalette.COMPLEMENTARY: -0.3,
        },
        "extraversion": {
            ColorPalette.WARM: 0.8,
            ColorPalette.VIBRANT: 0.9,
            ColorPalette.PASTEL: 0.4,
            ColorPalette.COOL: -0.2,
            ColorPalette.DARK: -0.4,
            ColorPalette.NEUTRAL: -0.5,
        },
        "agreeableness": {
            ColorPalette.WARM: 0.7,
            ColorPalette.PASTEL: 0.8,
            ColorPalette.EARTH: 0.6,
            ColorPalette.DARK: -0.3,
            ColorPalette.VIBRANT: -0.2,
        },
        "neuroticism": {
            ColorPalette.DARK: 0.8,
            ColorPalette.COOL: 0.5,
            ColorPalette.NEUTRAL: 0.3,
            ColorPalette.VIBRANT: -0.6,
            ColorPalette.PASTEL: -0.5,
            ColorPalette.WARM: -0.3,
        },
    }
    
    # Trait-to-Accessory Correlations
    ACCESSORY_CORRELATIONS = {
        "openness": {
            "vintage brooch": 0.8,
            "handmade jewelry": 0.7,
            "artistic accessories": 0.8,
            "statement pieces": 0.6,
            "minimal items": -0.5,
        },
        "conscientiousness": {
            "watch": 0.9,
            "practical bag": 0.8,
            "classic wallet": 0.7,
            "minimal jewelry": 0.5,
            "flashy items": -0.6,
        },
        "extraversion": {
            "statement necklace": 0.9,
            "bold rings": 0.8,
            "bright scarves": 0.7,
            "eye-catching accessories": 0.9,
            "subtle items": -0.5,
        },
        "agreeableness": {
            "soft scarves": 0.7,
            "friendly pins": 0.6,
            "warm accessories": 0.7,
            "metal/industrial": -0.4,
        },
        "neuroticism": {
            "practical layers": 0.7,
            "covering hat": 0.6,
            "sunglasses": 0.5,
            "protective accessories": 0.6,
            "showy items": -0.4,
        },
    }
    
    # Color definitions for each palette
    PALETTE_COLORS = {
        ColorPalette.WARM: ["#E74C3C", "#F39C12", "#F1C40F", "#E67E22", "#D35400"],
        ColorPalette.COOL: ["#3498DB", "#2980B9", "#1ABC9C", "#8E44AD", "#34495E"],
        ColorPalette.NEUTRAL: ["#2C3E50", "#7F8C8D", "#BDC3C7", "#ECF0F1", "#95A5A6"],
        ColorPalette.EARTH: ["#8B4513", "#556B2F", "#A0522D", "#6B8E23", "#BC8F8F"],
        ColorPalette.PASTEL: ["#FFB6C1", "#87CEEB", "#DDA0DD", "#F0E68C", "#B0E0E6"],
        ColorPalette.VIBRANT: ["#FF1493", "#00CED1", "#FFD700", "#FF4500", "#9370DB"],
        ColorPalette.DARK: ["#1A1A2E", "#16213E", "#0F3460", "#2C0000", "#1B262C"],
        ColorPalette.MONOCHROME: ["#000000", "#1A1A1A", "#4D4D4D", "#808080", "#B3B3B3"],
        ColorPalette.ANALOGOUS: ["#2E86AB", "#48A9A6", "#4E8C71", "#8CB369", "#F4D35E"],
        ColorPalette.COMPLEMENTARY: ["#E63946", "#457B9D", "#1D3557", "#A8DADC", "#F1FAEE"],
    }
    
    # Colors to avoid for each palette
    PALETTE_AVOID = {
        ColorPalette.WARM: ["#3498DB", "#2980B9", "#1ABC9C"],
        ColorPalette.COOL: ["#E74C3C", "#F39C12", "#F1C40F"],
        ColorPalette.NEUTRAL: [],
        ColorPalette.EARTH: ["#FF1493", "#00CED1", "#9370DB"],
        ColorPalette.PASTEL: ["#000000", "#1A1A2E", "#E74C3C"],
        ColorPalette.VIBRANT: ["#FFFFFF", "#F5F5F5", "#BDC3C7"],
        ColorPalette.DARK: ["#FFFF00", "#00FF00", "#FF00FF"],
        ColorPalette.MONOCHROME: ["#FF0000", "#00FF00", "#0000FF"],
        ColorPalette.ANALOGOUS: [],
        ColorPalette.COMPLEMENTARY: [],
    }

    def __init__(self, seed: Optional[int] = None):
        """Initialize the visual generator with optional random seed."""
        if seed is not None:
            random.seed(seed)
        self._reasoning: List[str] = []
        
    def generate_appearance(
        self,
        personality_traits: Dict[str, float],
        archetype: str = "hero",
        genre: str = "modern"
    ) -> AppearanceSuggestion:
        """
        Generate complete appearance suggestions based on personality and archetype.
        
        Args:
            personality_traits: Dictionary of Big Five trait names to scores (0.0 to 1.0)
                Expected keys: openness, conscientiousness, extraversion, agreeableness, neuroticism
            archetype: Character archetype (hero, villain, mentor, ally, trickster)
            genre: Story genre (fantasy, sci-fi, modern, horror, romance)
            
        Returns:
            AppearanceSuggestion with comprehensive clothing, colors, accessories
        """
        self._reasoning = []
        
        # Normalize and validate traits
        traits = self._normalize_traits(personality_traits)
        
        # Calculate style scores
        clothing_score = self._calculate_clothing_scores(traits, archetype)
        color_score = self._calculate_color_scores(traits)
        accessory_score = self._calculate_accessory_scores(traits)
        grooming_score = self._calculate_grooming_scores(traits)
        
        # Select best options
        clothing_style = self._select_best_option(clothing_score, ClothingStyle)
        color_palette = self._select_best_option(color_score, ColorPalette)
        grooming_level = self._select_best_grooming(grooming_score)
        
        # Generate detailed recommendations
        clothing_colors = self._get_palette_colors(color_palette)
        colors_to_avoid = self.PALETTE_AVOID.get(color_palette, [])
        accessories = self._select_accessories(accessory_score, traits)
        accessory_types = self._categorize_accessories(accessories)
        grooming_notes = self._generate_grooming_notes(traits, grooming_level)
        
        # Calculate style parameters
        formality_level = self._calculate_formality(clothing_style, traits)
        expressiveness = self._calculate_expressiveness(traits, color_palette)
        
        # Determine overall impression
        overall_impression = self._determine_impression(traits, clothing_style, color_palette)
        
        # Calculate confidence
        confidence = self._calculate_confidence(traits)
        
        return AppearanceSuggestion(
            clothing_style=clothing_style,
            color_palette=color_palette,
            accessories=accessories,
            grooming_level=grooming_level,
            overall_impression=overall_impression,
            clothing_colors=clothing_colors,
            recommended_colors_avoid=colors_to_avoid,
            accessory_types=accessory_types,
            grooming_notes=grooming_notes,
            formality_level=formality_level,
            expressiveness=expressiveness,
            confidence_score=confidence,
            reasoning=self._reasoning
        )

    def _normalize_traits(self, traits: Dict[str, float]) -> Dict[str, float]:
        """Normalize trait values to 0.0-1.0 range and provide defaults."""
        normalized = {}
        default_value = 0.5
        
        trait_keys = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"]
        
        for key in trait_keys:
            value = traits.get(key, default_value)
            normalized[key] = max(0.0, min(1.0, float(value)))
        
        missing = [k for k in trait_keys if k not in traits]
        if missing:
            self._reasoning.append(f"Note: Used default value (0.5) for missing traits: {', '.join(missing)}")
        
        return normalized

    def _calculate_clothing_scores(
        self,
        traits: Dict[str, float],
        archetype: str
    ) -> Dict[ClothingStyle, float]:
        """Calculate clothing style scores based on personality traits."""
        style_scores: Dict[ClothingStyle, float] = {style: 0.0 for style in ClothingStyle}
        
        for trait_name, trait_value in traits.items():
            correlations = self.CLOTHING_CORRELATIONS.get(trait_name, {})
            
            for style, correlation in correlations.items():
                weight = trait_value if correlation > 0 else (1.0 - trait_value)
                style_scores[style] += correlation * weight
        
        # Apply archetype modifiers
        archetype_modifiers = self._get_archetype_clothing_modifiers(archetype)
        for style, modifier in archetype_modifiers.items():
            if style in style_scores:
                style_scores[style] += modifier
        
        return style_scores

    def _calculate_color_scores(self, traits: Dict[str, float]) -> Dict[ColorPalette, float]:
        """Calculate color palette scores based on personality traits."""
        palette_scores: Dict[ColorPalette, float] = {palette: 0.0 for palette in ColorPalette}
        
        for trait_name, trait_value in traits.items():
            correlations = self.COLOR_CORRELATIONS.get(trait_name, {})
            
            for palette, correlation in correlations.items():
                weight = trait_value if correlation > 0 else (1.0 - trait_value)
                palette_scores[palette] += correlation * weight
        
        return palette_scores

    def _calculate_accessory_scores(self, traits: Dict[str, float]) -> Dict[str, float]:
        """Calculate accessory scores based on personality traits."""
        accessory_scores: Dict[str, float] = {}
        
        for trait_name, trait_value in traits.items():
            correlations = self.ACCESSORY_CORRELATIONS.get(trait_name, {})
            
            for accessory, correlation in correlations.items():
                weight = trait_value if correlation > 0 else (1.0 - trait_value)
                if accessory in accessory_scores:
                    accessory_scores[accessory] += correlation * weight
                else:
                    accessory_scores[accessory] = correlation * weight
        
        return accessory_scores

    def _calculate_grooming_scores(self, traits: Dict[str, float]) -> Dict[GroomingLevel, float]:
        """Calculate grooming level scores based on personality traits."""
        grooming_scores: Dict[GroomingLevel, float] = {level: 0.5 for level in GroomingLevel}
        
        cons = traits.get("conscientiousness", 0.5)
        grooming_scores[GroomingLevel.METICULOUS] = 0.3 + (cons * 0.7)
        grooming_scores[GroomingLevel.POLISHED] = 0.4 + (cons * 0.5)
        grooming_scores[GroomingLevel.AVERAGE] = 0.5
        grooming_scores[GroomingLevel.PRACTICAL] = 0.3 + ((1.0 - cons) * 0.5)
        grooming_scores[GroomingLevel.MINIMAL] = 0.2 + ((1.0 - cons) * 0.6)
        
        extra = traits.get("extraversion", 0.5)
        grooming_scores[GroomingLevel.POLISHED] += extra * 0.2
        
        neur = traits.get("neuroticism", 0.5)
        if neur > 0.7:
            grooming_scores[GroomingLevel.METICULOUS] += 0.2
            grooming_scores[GroomingLevel.PRACTICAL] += 0.1
        
        return grooming_scores

    def _select_best_option(self, scores: Dict, enum_class) -> Any:
        """Select the best option from scored items with controlled randomness."""
        sorted_items = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_items = sorted_items[:3]
        
        weighted_items = []
        for item, score in top_items:
            noise = random.uniform(-0.1, 0.1)
            weighted_items.append((item, score + noise))
        
        weighted_items.sort(key=lambda x: x[1], reverse=True)
        selected, _ = weighted_items[0]
        return selected

    def _select_best_grooming(self, scores: Dict[GroomingLevel, float]) -> GroomingLevel:
        """Select the best grooming level."""
        sorted_levels = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return sorted_levels[0][0]

    def _select_accessories(
        self,
        scores: Dict[str, float],
        traits: Dict[str, float]
    ) -> List[str]:
        """Select accessories based on scores."""
        sorted_accessories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        
        selected = [acc for acc, score in sorted_accessories if score > 0.0]
        
        if len(selected) < 3:
            moderate = [acc for acc, score in sorted_accessories if -0.2 < score <= 0.0]
            random.shuffle(moderate)
            selected.extend(moderate[:3 - len(selected)])
        
        random.shuffle(selected)
        return selected[:5]

    def _categorize_accessories(self, accessories: List[str]) -> List[AccessoryType]:
        """Categorize accessories by type."""
        categories = []
        
        category_keywords = {
            AccessoryType.JEWELRY: ["necklace", "ring", "bracelet", "earring", "brooch", "chain", "jewelry"],
            AccessoryType.HEADWEAR: ["hat", "cap", "beanie", "headband"],
            AccessoryType.EYEWEAR: ["glasses", "sunglasses", "eyewear"],
            AccessoryType.BAGS: ["bag", "purse", "backpack", "wallet", "pouch"],
            AccessoryType.BELTS: ["belt"],
            AccessoryType.SCARVES: ["scarf"],
            AccessoryType.FOOTWEAR: ["shoes", "boots", "sandals"],
            AccessoryType.WATCHES: ["watch"],
            AccessoryType.TECH: ["phone", "headphones", "device"],
        }
        
        for accessory in accessories:
            for category, keywords in category_keywords.items():
                if any(kw.lower() in accessory.lower() for kw in keywords):
                    if category not in categories:
                        categories.append(category)
                    break
        
        if not categories:
            categories.append(AccessoryType.JEWELRY)
        
        return categories

    def _get_archetype_clothing_modifiers(self, archetype: str) -> Dict[ClothingStyle, float]:
        """Get clothing style modifiers based on archetype."""
        modifiers = {
            "hero": {ClothingStyle.CLASSIC: 0.3, ClothingStyle.FORMAL: 0.2, ClothingStyle.CASUAL: 0.1},
            "villain": {ClothingStyle.GOTHIC: 0.4, ClothingStyle.DARK: 0.3, ClothingStyle.MILITARY: 0.3, ClothingStyle.FORMAL: 0.2},
            "mentor": {ClothingStyle.CLASSIC: 0.4, ClothingStyle.FORMAL: 0.3, ClothingStyle.MINIMALIST: 0.2},
            "ally": {ClothingStyle.CASUAL: 0.4, ClothingStyle.BOHEMIAN: 0.3, ClothingStyle.SPORTY: 0.2},
            "trickster": {ClothingStyle.EDGY: 0.4, ClothingStyle.VINTAGE: 0.3, ClothingStyle.MAXIMALIST: 0.2},
        }
        return modifiers.get(archetype.lower(), {})

    def _get_palette_colors(self, palette: ColorPalette) -> List[str]:
        """Get specific colors for a palette."""
        return self.PALETTE_COLORS.get(palette, ["#FFFFFF", "#000000"])

    def _generate_grooming_notes(
        self,
        traits: Dict[str, float],
        level: GroomingLevel
    ) -> List[str]:
        """Generate grooming notes based on personality."""
        notes = []
        
        cons = traits.get("conscientiousness", 0.5)
        extra = traits.get("extraversion", 0.5)
        openn = traits.get("openness", 0.5)
        
        if level == GroomingLevel.METICULOUS:
            notes.extend(["Maintains immaculate appearance at all times", "Follows strict grooming routine", "Attention to detail in every aspect"])
        elif level == GroomingLevel.POLISHED:
            notes.extend(["Well-groomed with consistent care", "Regular maintenance routine", "Looks put-together without effort"])
        elif level == GroomingLevel.AVERAGE:
            notes.extend(["Basic grooming habits maintained", "Practical approach to appearance"])
        elif level == GroomingLevel.PRACTICAL:
            notes.extend(["Functional rather than decorative", "Low-maintenance approach", "Prioritizes comfort and utility"])
        else:
            notes.extend(["Minimal grooming effort", "Natural, unfiltered appearance", "Practical approach to personal care"])
        
        if extra > 0.7:
            notes.append("Expresses personality through grooming choices")
        if openn > 0.7:
            notes.append("Open to unique or unconventional styles")
        if cons > 0.7:
            notes.append("Consistent grooming habits")
        
        return notes[:4]

    def _calculate_formality(self, style: ClothingStyle, traits: Dict[str, float]) -> float:
        """Calculate formality level (0.0 to 1.0)."""
        formality_map = {
            ClothingStyle.FORMAL: 1.0, ClothingStyle.CLASSIC: 0.8,
            ClothingStyle.PREPPY: 0.7, ClothingStyle.MINIMALIST: 0.6,
            ClothingStyle.CASUAL: 0.4, ClothingStyle.SPORTY: 0.3,
            ClothingStyle.ATHLEISURE: 0.35, ClothingStyle.BOHEMIAN: 0.3,
            ClothingStyle.VINTAGE: 0.4, ClothingStyle.EDGY: 0.4,
            ClothingStyle.GOTHIC: 0.5, ClothingStyle.GRUNGE: 0.2,
            ClothingStyle.FANTASY: 0.4, ClothingStyle.SCI_FI: 0.5,
            ClothingStyle.MILITARY: 0.7,
        }
        
        base_formality = formality_map.get(style, 0.5)
        cons = traits.get("conscientiousness", 0.5)
        formality = base_formality * 0.7 + cons * 0.3
        
        return min(1.0, max(0.0, formality))

    def _calculate_expressiveness(self, traits: Dict[str, float], palette: ColorPalette) -> float:
        """Calculate expressiveness level (0.0 to 1.0)."""
        extra = traits.get("extraversion", 0.5)
        openn = traits.get("openness", 0.5)
        
        expressiveness = (extra + openn) / 2
        
        if palette in [ColorPalette.VIBRANT, ColorPalette.COMPLEMENTARY]:
            expressiveness += 0.15
        elif palette in [ColorPalette.NEUTRAL, ColorPalette.MONOCHROME]:
            expressiveness -= 0.2
        
        return min(1.0, max(0.0, expressiveness))

    def _determine_impression(
        self,
        traits: Dict[str, float],
        style: ClothingStyle,
        palette: ColorPalette
    ) -> VisualImpression:
        """Determine overall visual impression."""
        extra = traits.get("extraversion", 0.5)
        cons = traits.get("conscientiousness", 0.5)
        agree = traits.get("agreeableness", 0.5)
        neur = traits.get("neuroticism", 0.5)
        openn = traits.get("openness", 0.5)
        
        impressions = {
            VisualImpression.APPROACHABLE: agree * 0.4 + extra * 0.3 + 0.2,
            VisualImpression.AUTHORITATIVE: cons * 0.4 + extra * 0.2 + 0.2,
            VisualImpression.MYSTERIOUS: neur * 0.3 + extra * -0.2 + 0.5,
            VisualImpression.ENERGETIC: extra * 0.5 + openn * 0.3 + 0.1,
            VisualImpression.SOPHISTICATED: cons * 0.3 + openn * 0.3 + 0.3,
            VisualImpression.REBEL: openn * 0.4 + extra * 0.2 + agree * -0.3,
            VisualImpression.NURTURING: agree * 0.5 + cons * 0.2 + 0.2,
            VisualImpression.INTELLECTUAL: cons * 0.3 + openn * 0.4 + 0.2,
            VisualImpression.PLAYFUL: extra * 0.4 + openn * 0.3 + 0.2,
            VisualImpression.STOIC: neur * -0.2 + cons * 0.3 + 0.4,
        }
        
        sorted_impressions = sorted(impressions.items(), key=lambda x: x[1], reverse=True)
        return sorted_impressions[0][0]

    def _calculate_confidence(self, traits: Dict[str, float]) -> float:
        """Calculate confidence score based on data completeness."""
        base_confidence = 0.7
        
        trait_count = len([v for v in traits.values() if v != 0.5])
        if trait_count >= 5:
            base_confidence += 0.15
        elif trait_count >= 3:
            base_confidence += 0.1
        
        key_traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism']
        present_traits = sum(1 for t in key_traits if t in traits)
        base_confidence += (present_traits / 5) * 0.15
        
        return min(0.95, base_confidence)


# =============================================================================
# INTEGRATION FUNCTION
# =============================================================================

def generate_appearance_from_personality(
    openness: float,
    conscientiousness: float,
    extraversion: float,
    agreeableness: float,
    neuroticism: float,
    archetype: str = "hero",
    genre: str = "modern",
    seed: Optional[int] = None
) -> AppearanceSuggestion:
    """
    Convenience function to generate appearance from Big Five traits.
    
    Args:
        openness: Openness trait (0.0 to 1.0)
        conscientiousness: Conscientiousness trait (0.0 to 1.0)
        extraversion: Extraversion trait (0.0 to 1.0)
        agreeableness: Agreeableness trait (0.0 to 1.0)
        neuroticism: Neuroticism trait (0.0 to 1.0)
        archetype: Character archetype
        genre: Story genre
        seed: Optional random seed for reproducibility
        
    Returns:
        Complete AppearanceSuggestion
        
    Example:
        >>> appearance = generate_appearance_from_personality(
        ...     openness=0.8, conscientiousness=0.7, extraversion=0.6,
        ...     agreeableness=0.8, neuroticism=0.3, archetype="hero"
        ... )
        >>> print(appearance.clothing_style)
    """
    traits = {
        "openness": openness,
        "conscientiousness": conscientiousness,
        "extraversion": extraversion,
        "agreeableness": agreeableness,
        "neuroticism": neuroticism
    }
    
    generator = VisualGenerator(seed=seed)
    return generator.generate_appearance(traits, archetype, genre)

