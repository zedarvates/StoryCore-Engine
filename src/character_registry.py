import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional, List

@dataclass
class VoiceProfile:
    voice_id: str               # Identifiant unique de la voix
    provider: str = "qwen3-tts" # Fournisseur TTS
    base_model: str = ""        # Modèle de base (ex: qwen3-tts-1.7b)
    reference_audio_path: Optional[str] = None  # Pour le clonage
    parameters: Dict[str, Any] = field(default_factory=lambda: {
        "pitch": 1.0,
        "speed": 1.0,
        "accent": "neutral",
        "emotion_map": {
            "happy": "cheerful",
            "sad": "melancholic",
            "angry": "aggressive"
        }
    })

    def to_dict(self) -> Dict[str, Any]:
        return {
            "voice_id": self.voice_id,
            "provider": self.provider,
            "base_model": self.base_model,
            "reference_audio_path": self.reference_audio_path,
            "parameters": self.parameters
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VoiceProfile':
        return cls(**data)

@dataclass
class CharacterIdentity:
    character_id: str
    name: str
    
    # Description physique pour les prompts (LLM-ready)
    physical_description: str 
    
    # Référence visuelle pour IP-Adapter
    reference_image_path: Optional[str] = None
    
    # Référence LoRA spécifique (optionnel)
    lora_weights_path: Optional[str] = None
    
    # Profil vocal
    voice_profile: Optional[VoiceProfile] = None
    
    # Métadonnées de cohérence
    consistency_seeds: Dict[str, int] = field(default_factory=lambda: {
        "appearance": 42,
        "pose_variation": 123
    })

    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "name": self.name,
            "physical_description": self.physical_description,
            "reference_image_path": self.reference_image_path,
            "lora_weights_path": self.lora_weights_path,
            "voice_profile": self.voice_profile.to_dict() if self.voice_profile else None,
            "consistency_seeds": self.consistency_seeds
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CharacterIdentity':
        voice_data = data.get("voice_profile")
        if voice_data:
            data["voice_profile"] = VoiceProfile.from_dict(voice_data)
        return cls(**data)

class CharacterRegistry:
    """Gère le stockage et la récupération des identités de personnages."""
    
    def __init__(self, storage_path: str = "data/characters"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self._cache: Dict[str, CharacterIdentity] = {}

    def register(self, identity: CharacterIdentity) -> None:
        """Persiste l'identité en JSON."""
        file_path = self.storage_path / f"{identity.character_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(identity.to_dict(), f, indent=2, ensure_ascii=False)
        self._cache[identity.character_id] = identity

    def get_by_id(self, character_id: str) -> Optional[CharacterIdentity]:
        """Récupère une identité par son ID."""
        if character_id in self._cache:
            return self._cache[character_id]
        
        file_path = self.storage_path / f"{character_id}.json"
        if not file_path.exists():
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                identity = CharacterIdentity.from_dict(data)
                self._cache[character_id] = identity
                return identity
        except Exception as e:
            print(f"Erreur lors du chargement du personnage {character_id}: {e}")
            return None

    def resolve_for_prompt(self, character_id: str) -> str:
        """Génère le fragment de prompt physique."""
        identity = self.get_by_id(character_id)
        if identity:
            return identity.physical_description
        return ""

    def get_ip_adapter_config(self, character_id: str) -> Dict[str, Any]:
        """Prépare la config IP-Adapter pour ComfyUI."""
        identity = self.get_by_id(character_id)
        if identity and identity.reference_image_path:
            return {
                "image_path": identity.reference_image_path,
                "weight": 0.7,
                "noise": 0.0
            }
        return {}
