"""
Service de gestion du verrouillage d'identité pour la cohérence des personnages.
Basé sur le pattern "Identity Lock" de Robert's Tech Toolbox.

Ce module permet de maintenir la cohérence visuelle des personnages à travers
toutes les scènes générées en verrouillant leurs attributs visuels.

StoryCore-Engine - Identity Lock System
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from uuid import uuid4
import json
import os
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class VisualAttributes:
    """Attributs visuels verrouillés d'un personnage"""

    # Attributs faciaux
    face_shape: str = ""  # oval, round, square, heart
    skin_tone: str = ""  # description ou code couleur
    eye_color: str = ""
    hair_color: str = ""
    hair_style: str = ""
    hair_length: str = ""

    # Attributs corporels
    body_type: str = ""
    height: str = ""  # tall, average, short
    age_appearance: str = ""

    # Style vestimentaire par défaut
    clothing_style: str = ""
    accessories: List[str] = field(default_factory=list)

    # Traits distinctifs
    distinctive_features: List[str] = field(default_factory=list)
    scars_marks: List[str] = field(default_factory=list)

    # Métadonnées d'extraction
    extraction_confidence: float = 0.0
    source_image_path: str = ""

    def to_dict(self) -> Dict:
        """Convertit en dictionnaire pour sérialisation"""
        return {
            "face_shape": self.face_shape,
            "skin_tone": self.skin_tone,
            "eye_color": self.eye_color,
            "hair_color": self.hair_color,
            "hair_style": self.hair_style,
            "hair_length": self.hair_length,
            "body_type": self.body_type,
            "height": self.height,
            "age_appearance": self.age_appearance,
            "clothing_style": self.clothing_style,
            "accessories": self.accessories,
            "distinctive_features": self.distinctive_features,
            "scars_marks": self.scars_marks,
            "extraction_confidence": self.extraction_confidence,
            "source_image_path": self.source_image_path,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "VisualAttributes":
        """Crée une instance depuis un dictionnaire"""
        return cls(
            face_shape=data.get("face_shape", ""),
            skin_tone=data.get("skin_tone", ""),
            eye_color=data.get("eye_color", ""),
            hair_color=data.get("hair_color", ""),
            hair_style=data.get("hair_style", ""),
            hair_length=data.get("hair_length", ""),
            body_type=data.get("body_type", ""),
            height=data.get("height", ""),
            age_appearance=data.get("age_appearance", ""),
            clothing_style=data.get("clothing_style", ""),
            accessories=data.get("accessories", []),
            distinctive_features=data.get("distinctive_features", []),
            scars_marks=data.get("scars_marks", []),
            extraction_confidence=data.get("extraction_confidence", 0.0),
            source_image_path=data.get("source_image_path", ""),
        )


@dataclass
class IdentityProfile:
    """Profil d'identité complet d'un personnage"""

    id: str = field(default_factory=lambda: str(uuid4()))
    name: str = ""
    description: str = ""
    visual_attributes: VisualAttributes = field(default_factory=VisualAttributes)
    owner_id: Optional[str] = None

    # Prompts de référence générés
    base_prompt: str = ""  # Prompt de base pour toutes les générations
    variation_prompts: Dict[str, str] = field(default_factory=dict)  # Par type de scène

    # Métadonnées
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    project_id: str = ""
    is_locked: bool = False  # Verrouillé = ne peut plus être modifié

    def to_dict(self) -> Dict:
        """Convertit en dictionnaire pour sérialisation"""
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "visual_attributes": self.visual_attributes.to_dict(),
            "base_prompt": self.base_prompt,
            "variation_prompts": self.variation_prompts,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "project_id": self.project_id,
            "is_locked": self.is_locked,
            "owner_id": self.owner_id,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "IdentityProfile":
        """Crée une instance depuis un dictionnaire"""
        return cls(
            id=data.get("id", str(uuid4())),
            name=data.get("name", ""),
            description=data.get("description", ""),
            visual_attributes=VisualAttributes.from_dict(
                data.get("visual_attributes", {})
            ),
            base_prompt=data.get("base_prompt", ""),
            variation_prompts=data.get("variation_prompts", {}),
            created_at=datetime.fromisoformat(data["created_at"])
            if "created_at" in data
            else datetime.now(),
            updated_at=datetime.fromisoformat(data["updated_at"])
            if "updated_at" in data
            else datetime.now(),
            project_id=data.get("project_id", ""),
            is_locked=data.get("is_locked", False),
            owner_id=data.get("owner_id"),
        )


class IdentityLockService:
    """Service principal de gestion des identités"""

    def __init__(self, storage_path: str = "data/identities"):
        self.storage_path = storage_path
        self._identities: Dict[str, IdentityProfile] = {}
        self._loaded = False

    async def _ensure_loaded(self):
        """Charge les identités depuis le disque si pas encore fait"""
        if not self._loaded:
            await self._load_all_identities()
            self._loaded = True

    async def _load_all_identities(self):
        """Charge toutes les identités depuis le stockage"""
        if not os.path.exists(self.storage_path):
            os.makedirs(self.storage_path, exist_ok=True)
            return

        for filename in os.listdir(self.storage_path):
            if filename.endswith(".json"):
                try:
                    file_path = os.path.join(self.storage_path, filename)
                    with open(file_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        identity = IdentityProfile.from_dict(data)
                        self._identities[identity.id] = identity
                        logger.debug(
                            f"Loaded identity: {identity.name} ({identity.id})"
                        )
                except Exception as e:
                    logger.error(f"Error loading identity from {filename}: {e}")

        logger.info(f"Loaded {len(self._identities)} identities from storage")

    async def create_identity(
        self,
        name: str,
        description: str,
        project_id: str,
        source_image_path: Optional[str] = None,
        owner_id: Optional[str] = None,
    ) -> IdentityProfile:
        """Crée un nouveau profil d'identité"""
        await self._ensure_loaded()

        identity = IdentityProfile(
            name=name, description=description, project_id=project_id, owner_id=owner_id
        )
        if source_image_path:
            identity.visual_attributes.source_image_path = source_image_path

        self._identities[identity.id] = identity
        await self._save_identity(identity)

        logger.info(f"Created identity: {name} ({identity.id})")
        return identity

    async def extract_and_lock_attributes(
        self, identity_id: str, image_path: str, use_llm: bool = True
    ) -> IdentityProfile:
        """
        Extrait les attributs visuels depuis une image et verrouille l'identité.

        Args:
            identity_id: ID de l'identité à modifier
            image_path: Chemin vers l'image source
            use_llm: Si True, utilise LLM Vision pour l'extraction

        Returns:
            IdentityProfile mis à jour avec les attributs extraits
        """
        await self._ensure_loaded()

        identity = self._identities.get(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")

        if identity.is_locked:
            raise ValueError(f"Identity {identity_id} is already locked")

        # Mise à jour du chemin source
        identity.visual_attributes.source_image_path = image_path

        if use_llm:
            # L'extraction LLM sera gérée par IdentityExtractionService
            # Ici on simule une extraction de base
            identity.visual_attributes.extraction_confidence = 0.85
        else:
            identity.visual_attributes.extraction_confidence = 0.5

        # Générer le prompt de base
        identity.base_prompt = self._generate_base_prompt(identity)

        # Générer les prompts de variation par type de scène
        identity.variation_prompts = self._generate_variation_prompts(identity)

        # Verrouiller l'identité
        identity.is_locked = True
        identity.updated_at = datetime.now()

        await self._save_identity(identity)

        logger.info(
            f"Locked identity: {identity.name} with confidence {identity.visual_attributes.extraction_confidence}"
        )
        return identity

    def _generate_base_prompt(self, identity: IdentityProfile) -> str:
        """Génère le prompt de base à partir des attributs verrouillés"""
        attrs = identity.visual_attributes
        parts = [f"Character: {identity.name}"]

        if attrs.face_shape:
            parts.append(f"face shape: {attrs.face_shape}")
        if attrs.skin_tone:
            parts.append(f"skin tone: {attrs.skin_tone}")
        if attrs.eye_color:
            parts.append(f"eye color: {attrs.eye_color}")
        if attrs.hair_color or attrs.hair_style or attrs.hair_length:
            hair_parts = []
            if attrs.hair_color:
                hair_parts.append(attrs.hair_color)
            if attrs.hair_style:
                hair_parts.append(attrs.hair_style)
            if attrs.hair_length:
                hair_parts.append(attrs.hair_length)
            parts.append(f"hair: {' '.join(hair_parts)}")
        if attrs.body_type:
            parts.append(f"body type: {attrs.body_type}")
        if attrs.height:
            parts.append(f"height: {attrs.height}")
        if attrs.age_appearance:
            parts.append(f"age appearance: {attrs.age_appearance}")
        if attrs.clothing_style:
            parts.append(f"clothing style: {attrs.clothing_style}")
        if attrs.distinctive_features:
            parts.append(
                f"distinctive features: {', '.join(attrs.distinctive_features)}"
            )
        if attrs.scars_marks:
            parts.append(f"marks: {', '.join(attrs.scars_marks)}")

        return ", ".join(parts) + ". Maintain consistent appearance across all scenes."

    def _generate_variation_prompts(self, identity: IdentityProfile) -> Dict[str, str]:
        """Génère des prompts de variation pour différents types de scènes"""
        base = identity.base_prompt
        variations = {}

        # Variations par type de scène
        scene_types = {
            "close_up": "close-up portrait shot, detailed facial features",
            "medium_shot": "medium shot, upper body visible",
            "full_body": "full body shot, complete figure visible",
            "action": "dynamic action pose, movement implied",
            "emotional": "emotional expression, dramatic lighting",
            "outdoor": "outdoor setting, natural lighting",
            "indoor": "indoor setting, ambient lighting",
            "night": "night scene, dramatic shadows",
        }

        for scene_type, scene_desc in scene_types.items():
            variations[scene_type] = f"{base}. Scene type: {scene_desc}"

        return variations

    async def apply_identity_to_prompt(
        self, identity_id: str, scene_description: str, scene_type: str = "default"
    ) -> str:
        """
        Applique l'identité verrouillée à un prompt de scène.

        Args:
            identity_id: ID de l'identité à appliquer
            scene_description: Description de la scène
            scene_type: Type de scène pour la variation (optionnel)

        Returns:
            Prompt complet avec l'identité appliquée
        """
        await self._ensure_loaded()

        identity = self._identities.get(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")
        if not identity.is_locked:
            raise ValueError(f"Identity {identity_id} is not locked. Lock it first.")

        # Utiliser le prompt de variation si disponible
        if scene_type != "default" and scene_type in identity.variation_prompts:
            base = identity.variation_prompts[scene_type]
        else:
            base = identity.base_prompt

        return f"{base}. Scene: {scene_description}"

    async def get_identity(self, identity_id: str) -> Optional[IdentityProfile]:
        """Récupère un profil d'identité par ID"""
        await self._ensure_loaded()
        return self._identities.get(identity_id)

    async def list_identities(
        self, project_id: Optional[str] = None, owner_id: Optional[str] = None
    ) -> List[IdentityProfile]:
        """Liste toutes les identités, optionnellement filtrées par projet et propriétaire"""
        await self._ensure_loaded()

        results = list(self._identities.values())

        if project_id:
            results = [i for i in results if i.project_id == project_id]

        if owner_id:
            results = [i for i in results if getattr(i, "owner_id", None) == owner_id]

        return results

    async def update_identity(
        self, identity_id: str, updates: Dict[str, Any]
    ) -> IdentityProfile:
        """
        Met à jour un profil d'identité (si non verrouillé).

        Args:
            identity_id: ID de l'identité à modifier
            updates: Dictionnaire des champs à mettre à jour

        Returns:
            IdentityProfile mis à jour
        """
        await self._ensure_loaded()

        identity = self._identities.get(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")
        if identity.is_locked:
            raise ValueError(f"Identity {identity_id} is locked and cannot be modified")

        # Appliquer les mises à jour
        for key, value in updates.items():
            if key == "visual_attributes" and isinstance(value, dict):
                # Mise à jour des attributs visuels
                for attr_key, attr_value in value.items():
                    if hasattr(identity.visual_attributes, attr_key):
                        setattr(identity.visual_attributes, attr_key, attr_value)
            elif hasattr(identity, key) and key not in [
                "id",
                "created_at",
                "is_locked",
            ]:
                # SECURITY: is_locked can only be modified via dedicated unlock_identity method
                setattr(identity, key, value)

        identity.updated_at = datetime.now()
        await self._save_identity(identity)

        logger.info(f"Updated identity: {identity.name} ({identity.id})")
        return identity

    async def delete_identity(self, identity_id: str) -> bool:
        """Supprime un profil d'identité"""
        await self._ensure_loaded()

        if identity_id in self._identities:
            identity = self._identities[identity_id]
            del self._identities[identity_id]

            # Supprimer le fichier
            file_path = os.path.join(self.storage_path, f"{identity_id}.json")
            if os.path.exists(file_path):
                os.remove(file_path)

            logger.info(f"Deleted identity: {identity.name} ({identity_id})")
            return True
        return False

    async def unlock_identity(self, identity_id: str) -> IdentityProfile:
        """
        Déverrouille une identité pour permettre les modifications.
        Attention: Cette opération doit être utilisée avec précaution.
        """
        await self._ensure_loaded()

        identity = self._identities.get(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")

        identity.is_locked = False
        identity.updated_at = datetime.now()
        await self._save_identity(identity)

        logger.warning(f"Unlocked identity: {identity.name} ({identity_id})")
        return identity

    async def _save_identity(self, identity: IdentityProfile):
        """Sauvegarde l'identité sur disque"""
        os.makedirs(self.storage_path, exist_ok=True)
        file_path = os.path.join(self.storage_path, f"{identity.id}.json")

        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(identity.to_dict(), f, indent=2, ensure_ascii=False)

        logger.debug(f"Saved identity to {file_path}")

    async def update_visual_attributes(
        self,
        identity_id: str,
        attributes: Dict[str, Any],
        confidence: Optional[float] = None,
    ) -> IdentityProfile:
        """
        Met à jour les attributs visuels d'une identité.

        Args:
            identity_id: ID de l'identité
            attributes: Dictionnaire des attributs à mettre à jour
            confidence: Score de confiance de l'extraction (optionnel)

        Returns:
            IdentityProfile mis à jour
        """
        await self._ensure_loaded()

        identity = self._identities.get(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")

        if identity.is_locked:
            raise ValueError(f"Identity {identity_id} is locked and cannot be modified")

        # Mettre à jour les attributs
        for key, value in attributes.items():
            if hasattr(identity.visual_attributes, key):
                setattr(identity.visual_attributes, key, value)

        if confidence is not None:
            identity.visual_attributes.extraction_confidence = confidence

        identity.updated_at = datetime.now()
        await self._save_identity(identity)

        return identity

    async def get_identities_by_name(
        self, name: str, owner_id: Optional[str] = None
    ) -> List[IdentityProfile]:
        """Recherche des identités par nom (recherche partielle)"""
        await self._ensure_loaded()

        name_lower = name.lower()
        results = [i for i in self._identities.values() if name_lower in i.name.lower()]

        if owner_id:
            results = [i for i in results if getattr(i, "owner_id", None) == owner_id]

        return results

    async def export_identity(self, identity_id: str) -> str:
        """Exporte une identité en format JSON string"""
        identity = await self.get_identity(identity_id)
        if not identity:
            raise ValueError(f"Identity {identity_id} not found")

        return json.dumps(identity.to_dict(), indent=2, ensure_ascii=False)

    async def import_identity(self, json_data: str) -> IdentityProfile:
        """Importe une identité depuis un JSON string"""
        data = json.loads(json_data)
        identity = IdentityProfile.from_dict(data)

        # Générer un nouvel ID pour éviter les conflits
        identity.id = str(uuid4())
        identity.created_at = datetime.now()
        identity.updated_at = datetime.now()
        identity.is_locked = False  # L'identité importée n'est pas verrouillée

        self._identities[identity.id] = identity
        await self._save_identity(identity)

        logger.info(f"Imported identity: {identity.name} ({identity.id})")
        return identity


# Instance globale du service
_identity_lock_service: Optional[IdentityLockService] = None


def get_identity_lock_service() -> IdentityLockService:
    """Retourne l'instance globale du service Identity Lock"""
    global _identity_lock_service
    if _identity_lock_service is None:
        _identity_lock_service = IdentityLockService()
    return _identity_lock_service
