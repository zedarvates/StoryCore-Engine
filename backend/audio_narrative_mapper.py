from typing import Dict
from backend.ai_audio_service import AudioEnvironment


class AudioNarrativeMapper:
    """
    Maps narrative keywords to AI Audio Worldization environments.
    Standardizes how the story's location and mood affect the soundscape.
    """

    KEYWORD_MAPPING = {
        # Core Locations
        "grotte": AudioEnvironment.CAVE,
        "cave": AudioEnvironment.CAVE,
        "caverne": AudioEnvironment.CAVE,
        "stade": AudioEnvironment.STADIUM,
        "stadium": AudioEnvironment.STADIUM,
        "arene": AudioEnvironment.STADIUM,
        "salle": AudioEnvironment.SMALL_ROOM,
        "chambre": AudioEnvironment.SMALL_ROOM,
        "salon": AudioEnvironment.SMALL_ROOM,
        "cuisine": AudioEnvironment.SMALL_ROOM,
        "salle de bain": AudioEnvironment.BATHROOM,
        "toilettes": AudioEnvironment.BATHROOM,
        "concert": AudioEnvironment.CONCERT_HALL,
        "theatre": AudioEnvironment.CONCERT_HALL,
        "opera": AudioEnvironment.CONCERT_HALL,
        "voiture": AudioEnvironment.CAR,
        "vehicule": AudioEnvironment.CAR,
        "vaisseau": AudioEnvironment.CAR,  # Close acoustic for small cockpits
        "foret": AudioEnvironment.FOREST,
        "bois": AudioEnvironment.FOREST,
        "jungle": AudioEnvironment.FOREST,
        "sous l'eau": AudioEnvironment.UNDERWATER,
        "ocean": AudioEnvironment.UNDERWATER,
        "plonge": AudioEnvironment.UNDERWATER,
        "telephone": AudioEnvironment.PHONE,
        "appel": AudioEnvironment.PHONE,
        "radio": AudioEnvironment.PHONE,
    }

    @classmethod
    def suggest_environment(cls, narrative_text: str) -> AudioEnvironment:
        """
        Analyzes narrative text to suggest the best audio worldization preset.
        """
        text_low = narrative_text.lower()

        for keyword, environment in cls.KEYWORD_MAPPING.items():
            if keyword in text_low:
                return environment

        # Fallback to small room (neutral/indoor)
        return AudioEnvironment.SMALL_ROOM

    @classmethod
    def get_worldization_params(cls, environment: AudioEnvironment) -> Dict[str, any]:
        """
        Returns recommended intensity and parameters for a given environment.
        """
        configs = {
            AudioEnvironment.CAVE: {"intensity": 0.8, "reverb": "wet"},
            AudioEnvironment.STADIUM: {"intensity": 0.9, "reverb": "large"},
            AudioEnvironment.SMALL_ROOM: {"intensity": 0.3, "reverb": "dry"},
            AudioEnvironment.BATHROOM: {"intensity": 0.7, "reverb": "tiled"},
            AudioEnvironment.FOREST: {"intensity": 0.4, "reverb": "open"},
            AudioEnvironment.UNDERWATER: {"intensity": 1.0, "muffled": True},
            AudioEnvironment.PHONE: {"intensity": 1.0, "lofi": True},
        }
        return configs.get(environment, {"intensity": 0.5, "reverb": "balanced"})
