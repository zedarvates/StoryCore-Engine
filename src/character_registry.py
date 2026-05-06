import json
import logging
from pathlib import Path
from typing import Dict, Any, Optional, Union
from datetime import datetime

from src.models.character_ccd import (
    CharacterCoreData,
    VisualProfile,
    NarrativeProfile,
    VoiceProfile,
    CreationMethod,
)

# LEGACY Support (V1)
from dataclasses import dataclass, field


@dataclass
class LegacyVoiceProfile:
    voice_id: str
    provider: str = "qwen3-tts"
    base_model: str = ""
    reference_audio_path: Optional[str] = None
    parameters: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "voice_id": self.voice_id,
            "provider": self.provider,
            "base_model": self.base_model,
            "reference_audio_path": self.reference_audio_path,
            "parameters": self.parameters,
        }


@dataclass
class CharacterIdentity:
    character_id: str
    name: str
    physical_description: str
    reference_image_path: Optional[str] = None
    lora_weights_path: Optional[str] = None
    voice_profile: Optional[LegacyVoiceProfile] = None
    consistency_seeds: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "name": self.name,
            "physical_description": self.physical_description,
            "reference_image_path": self.reference_image_path,
            "lora_weights_path": self.lora_weights_path,
            "voice_profile": self.voice_profile.to_dict()
            if self.voice_profile
            else None,
            "consistency_seeds": self.consistency_seeds,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterIdentity":
        voice_data = data.get("voice_profile")
        if voice_data and isinstance(voice_data, dict):
            data["voice_profile"] = LegacyVoiceProfile(**voice_data)
        return cls(**data)


class CharacterRegistry:
    """
    Manages characters persistence. Supports both Legacy (V1) and CCD (V2).
    Automatically migrates V1 to V2 on write.
    """

    def __init__(self, storage_path: str = "data/characters"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        self._cache: Dict[str, Union[CharacterCoreData, CharacterIdentity]] = {}

    def register(self, character: Union[CharacterCoreData, CharacterIdentity]) -> None:
        """Persists a character. If it's V1, it can be saved as is or migrated."""
        character_id = character.character_id

        # Auto-migration logic: if we register a V1, we should probably keep it V1 unless requested
        # but for the Multi-Method feature, we prefer V2.

        if isinstance(character, CharacterIdentity):
            data = character.to_dict()
        else:
            character.updated_at = datetime.now()
            data = character.model_dump()

        file_path = self.storage_path / f"{character_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)

        self._cache[character_id] = character
        self.logger.info(f"Registered character: {character.name} ({character_id})")

    def get_by_id(
        self, character_id: str
    ) -> Optional[Union[CharacterCoreData, CharacterIdentity]]:
        """Retrieves a character by ID, returning V2 if available, else V1."""
        if character_id in self._cache:
            return self._cache[character_id]

        file_path = self.storage_path / f"{character_id}.json"
        if not file_path.exists():
            return None

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

                # Identify version
                if data.get("version") and data.get("version").startswith("2"):
                    # Handle datetime strings from JSON
                    character = CharacterCoreData.model_validate(data)
                else:
                    character = CharacterIdentity.from_dict(data)

                self._cache[character_id] = character
                return character
        except Exception as e:
            self.logger.error(f"Error loading character {character_id}: {e}")
            return None

    def migrate_to_v2(self, character_id: str) -> Optional[CharacterCoreData]:
        """Explicitly migrates a V1 character to V2."""
        char = self.get_by_id(character_id)
        if not char:
            return None

        if isinstance(char, CharacterCoreData):
            return char

        # Perform migration
        v2 = CharacterCoreData(
            character_id=char.character_id,
            name=char.name,
            creation_method=CreationMethod.NARRATIVE_FIRST,
            visual=VisualProfile(
                physical_description=char.physical_description,
                reference_image_path=char.reference_image_path,
                lora_weights_path=char.lora_weights_path,
            ),
            narrative=NarrativeProfile(personality_traits=[]),
            voice=VoiceProfile(
                kitten_voice_id=char.voice_profile.voice_id
                if char.voice_profile
                else None,
                reference_audio_path=char.voice_profile.reference_audio_path
                if char.voice_profile
                else None,
            ),
            metadata=char.consistency_seeds,
        )

        self.register(v2)
        return v2

    def resolve_for_prompt(self, character_id: str) -> str:
        """Generates the physical prompt fragment for the character."""
        char = self.get_by_id(character_id)
        if not char:
            return ""

        if isinstance(char, CharacterCoreData):
            return char.visual.physical_description
        return char.physical_description

    def get_comfy_config(self, character_id: str) -> Dict[str, Any]:
        """Prepares ComfyUI / IP-Adapter configuration."""
        char = self.get_by_id(character_id)
        if not char:
            return {}

        if isinstance(char, CharacterCoreData):
            return char.to_comfy_params()

        # Legacy fallback
        if char.reference_image_path:
            return {
                "image_path": char.reference_image_path,
                "weight": 0.7,
                "noise": 0.0,
            }
        return {}
