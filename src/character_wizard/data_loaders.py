"""
Data Loading Module for Character Generation

This module provides data loading functionality for templates, databases,
and configuration data used in character generation.
"""

from typing import Dict, List, Any


def load_name_databases() -> Dict[str, Dict[str, List[str]]]:
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


def load_trait_combinations() -> Dict[str, Dict[str, float]]:
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


def load_visual_templates() -> Dict[str, Dict[str, List[str]]]:
    """Load visual appearance templates for different genres"""
    return {
        "fantasy": {
            "hair_colors": ["golden blonde", "auburn", "raven black", "silver", "copper", "chestnut brown"],
            "hair_styles": ["long flowing", "braided", "wild", "elegant updo", "warrior knot", "loose waves"],
            "eye_colors": ["emerald green", "sapphire blue", "amber", "violet", "silver", "deep brown"],
            "skin_tones": ["fair", "olive", "bronze", "pale", "sun-kissed", "dark"],
            "builds": ["athletic", "slender", "muscular", "graceful", "sturdy", "lithe"],
            "clothing_styles": ["medieval robes", "leather armor", "noble attire", "ranger gear", "mystical garments"],
            "aesthetic": "fantasy medieval"
        },
        "sci-fi": {
            "hair_colors": ["platinum", "electric blue", "silver", "black", "white", "neon green"],
            "hair_styles": ["sleek", "geometric cut", "shaved sides", "futuristic", "cyberpunk", "minimalist"],
            "eye_colors": ["ice blue", "silver", "violet", "amber", "green", "augmented"],
            "skin_tones": ["pale", "olive", "dark", "augmented", "synthetic", "natural"],
            "builds": ["lean", "augmented", "athletic", "cybernetic", "enhanced", "natural"],
            "clothing_styles": ["tech suit", "military uniform", "civilian clothes", "space gear", "cyberpunk fashion"],
            "aesthetic": "futuristic technological"
        },
        "modern": {
            "hair_colors": ["blonde", "brown", "black", "red", "gray", "dyed"],
            "hair_styles": ["short", "medium", "long", "curly", "straight", "styled", "casual"],
            "eye_colors": ["blue", "brown", "green", "hazel", "gray", "amber"],
            "skin_tones": ["fair", "medium", "olive", "dark", "tan", "pale"],
            "builds": ["average", "athletic", "slim", "muscular", "curvy", "tall"],
            "clothing_styles": ["casual", "business", "formal", "street", "trendy", "classic"],
            "aesthetic": "contemporary realistic"
        },
        "default": {
            "hair_colors": ["brown", "blonde", "black", "red"],
            "hair_styles": ["short", "medium", "long", "curly"],
            "eye_colors": ["brown", "blue", "green", "hazel"],
            "skin_tones": ["fair", "medium", "olive", "dark"],
            "builds": ["average", "athletic", "slim", "tall"],
            "clothing_styles": ["casual", "formal", "trendy", "classic"],
            "aesthetic": "realistic"
        }
    }


def load_voice_patterns() -> Dict[str, Dict[str, Any]]:
    """Load voice pattern templates for different archetypes"""
    return {
        "hero": {
            "speech_patterns": "clear and direct",
            "accent": None,
            "dialect": None
        },
        "villain": {
            "speech_patterns": "sophisticated and calculated",
            "accent": "refined",
            "dialect": None
        },
        "mentor": {
            "speech_patterns": "measured and thoughtful",
            "accent": None,
            "dialect": "formal"
        },
        "ally": {
            "speech_patterns": "friendly and supportive",
            "accent": None,
            "dialect": "casual"
        },
        "trickster": {
            "speech_patterns": "quick and playful",
            "accent": None,
            "dialect": "colloquial"
        },
        "default": {
            "speech_patterns": "natural and conversational",
            "accent": None,
            "dialect": None
        }
    }


def load_backstory_templates() -> Dict[str, Dict[str, Any]]:
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