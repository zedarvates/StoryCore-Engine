"""
character_inventory.py — Inventaire d'objets par personnage
===========================================================

Chaque personnage de l'histoire possède un inventaire persistant :
  - Ses objets portés / équipés
  - Ses objets en possession
  - Ses objets liés à son arc narratif

L'inventaire est sauvegardé en JSON dans :
  projects/<project_id>/characters/<character_name>/inventory.json

Usage :
    inv = CharacterInventory("Alpha", project_id="cyberpunk_001")
    inv.add(epee)
    inv.add(manteau)
    inv.save()

    # Lire plus tard
    inv = CharacterInventory.load("Alpha", project_id="cyberpunk_001")
    for item in inv.equipped:
        print(item)
"""

from __future__ import annotations
import json
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, List, Dict, Any

from story_assets.story_object import StoryObject

logger = logging.getLogger(__name__)


# Slots d'équipement narratifs (pour organisation, pas technique)
INVENTORY_SLOTS = [
    "main_hand",     # Arme principale
    "off_hand",      # Arme secondaire / bouclier
    "head",          # Tête
    "chest",         # Torse
    "legs",          # Jambes
    "feet",          # Pieds
    "accessory_1",   # Accessoire 1
    "accessory_2",   # Accessoire 2
    "bag",           # Sac / inventaire
]


@dataclass
class CharacterInventory:
    """
    Inventaire d'objets d'histoire pour un personnage.

    Attributes:
        character_name : Nom du personnage (doit correspondre au CharacterRig)
        project_id     : ID du projet StoryCore
        items          : Tous les objets possédés
        equipped_slots : Mapping slot → item_id (objets équipés)
    """

    character_name: str
    project_id: Optional[str] = None
    items: List[StoryObject] = field(default_factory=list)
    equipped_slots: Dict[str, str] = field(default_factory=dict)   # slot → item.id
    notes: str = ""

    # ─── GESTION DES OBJETS ──────────────────────────────────────────────────

    def add(self, obj: StoryObject, slot: Optional[str] = None) -> None:
        """
        Ajoute un objet à l'inventaire.

        Args:
            obj  : StoryObject à ajouter
            slot : slot d'équipement optionnel (main_hand, chest, bag, ...)
        """
        # Forcer l'appartenance
        obj.owner = self.character_name
        if self.project_id:
            obj.project_id = self.project_id

        # Éviter les doublons
        if not any(i.id == obj.id for i in self.items):
            self.items.append(obj)

        # Équiper dans le slot si spécifié
        if slot and slot in INVENTORY_SLOTS:
            self.equipped_slots[slot] = obj.id

        logger.info(f"[Inventory] {self.character_name} → +{obj.name} (slot: {slot or 'bag'})")

    def remove(self, object_id: str) -> bool:
        """Retire un objet de l'inventaire. Retourne True si trouvé."""
        before = len(self.items)
        self.items = [i for i in self.items if i.id != object_id]
        # Désassigner le slot si c'était équipé
        self.equipped_slots = {
            slot: oid for slot, oid in self.equipped_slots.items()
            if oid != object_id
        }
        removed = len(self.items) < before
        if removed:
            logger.info(f"[Inventory] {self.character_name} → -{object_id}")
        return removed

    def equip(self, object_id: str, slot: str) -> bool:
        """Équipe un objet dans un slot. Retourne True si succès."""
        if slot not in INVENTORY_SLOTS:
            logger.warning(f"[Inventory] Slot inconnu: {slot}")
            return False
        obj = self.get(object_id)
        if not obj:
            logger.warning(f"[Inventory] Objet introuvable: {object_id}")
            return False
        self.equipped_slots[slot] = object_id
        logger.info(f"[Inventory] {self.character_name} équipe {obj.name} dans {slot}")
        return True

    def unequip(self, slot: str) -> Optional[StoryObject]:
        """Déséquipe un objet d'un slot. Retourne l'objet ou None."""
        oid = self.equipped_slots.pop(slot, None)
        if oid:
            return self.get(oid)
        return None

    def get(self, object_id: str) -> Optional[StoryObject]:
        """Cherche un objet par ID."""
        return next((i for i in self.items if i.id == object_id), None)

    def find_by_name(self, name: str) -> Optional[StoryObject]:
        """Cherche un objet par nom (insensible à la casse)."""
        name_lower = name.lower()
        return next((i for i in self.items if i.name.lower() == name_lower), None)

    def find_by_type(self, object_type: str) -> List[StoryObject]:
        """Retourne tous les objets d'un type donné."""
        return [i for i in self.items if i.object_type == object_type]

    def find_by_tags(self, tags: List[str]) -> List[StoryObject]:
        """Retourne les objets correspondant à tous les tags donnés."""
        return [i for i in self.items if all(t in i.tags for t in tags)]

    # ─── PROPRIÉTÉS ──────────────────────────────────────────────────────────

    @property
    def equipped(self) -> List[StoryObject]:
        """Retourne les objets actuellement équipés."""
        result = []
        for slot, oid in self.equipped_slots.items():
            obj = self.get(oid)
            if obj:
                result.append(obj)
        return result

    @property
    def unequipped(self) -> List[StoryObject]:
        """Retourne les objets non équipés (dans le sac)."""
        equipped_ids = set(self.equipped_slots.values())
        return [i for i in self.items if i.id not in equipped_ids]

    @property
    def weapons(self) -> List[StoryObject]:
        return self.find_by_type("weapon") + self.find_by_type("gun") + self.find_by_type("staff")

    @property
    def item_count(self) -> int:
        return len(self.items)

    def has_item(self, object_id: str) -> bool:
        return any(i.id == object_id for i in self.items)

    # ─── SÉRIALISATION ────────────────────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "project_id": self.project_id,
            "notes": self.notes,
            "equipped_slots": self.equipped_slots,
            "items": [item.to_dict() for item in self.items],
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CharacterInventory":
        inv = cls(
            character_name=data.get("character_name", "Unknown"),
            project_id=data.get("project_id"),
            notes=data.get("notes", ""),
            equipped_slots=data.get("equipped_slots", {}),
        )
        inv.items = [StoryObject.from_dict(i) for i in data.get("items", [])]
        return inv

    @classmethod
    def from_json(cls, json_str: str) -> "CharacterInventory":
        return cls.from_dict(json.loads(json_str))

    # ─── PERSISTANCE ─────────────────────────────────────────────────────────

    def _get_path(self, projects_dir: str = "./projects") -> Path:
        """Retourne le chemin du fichier inventory.json."""
        if self.project_id:
            return Path(projects_dir) / self.project_id / "characters" / self.character_name / "inventory.json"
        return Path(projects_dir) / "global" / "characters" / self.character_name / "inventory.json"

    def save(self, projects_dir: str = "./projects") -> str:
        """Sauvegarde l'inventaire en JSON. Retourne le chemin."""
        path = self._get_path(projects_dir)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.to_json())
        logger.info(f"[Inventory] Sauvegardé : {path}")
        return str(path)

    @classmethod
    def load(
        cls,
        character_name: str,
        project_id: Optional[str] = None,
        projects_dir: str = "./projects",
    ) -> "CharacterInventory":
        """
        Charge l'inventaire d'un personnage depuis le disque.
        Si introuvable, retourne un inventaire vide.
        """
        inv = cls(character_name=character_name, project_id=project_id)
        path = inv._get_path(projects_dir)

        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return cls.from_json(f.read())
            except Exception as e:
                logger.warning(f"[Inventory] Erreur lecture {path}: {e}")

        logger.debug(f"[Inventory] Inventaire vide créé pour {character_name}")
        return inv

    def summary(self) -> str:
        """Résumé textuel de l'inventaire pour le debug/logs."""
        lines = [f"Inventaire de {self.character_name} ({self.item_count} objets)"]
        for slot, oid in self.equipped_slots.items():
            obj = self.get(oid)
            if obj:
                lines.append(f"  [{slot:12s}] {obj.name} ({obj.object_type})")
        unequipped = self.unequipped
        if unequipped:
            lines.append(f"  Sac ({len(unequipped)} objets):")
            for obj in unequipped:
                lines.append(f"    - {obj.name} ({obj.object_type})")
        return "\n".join(lines)

    def __repr__(self) -> str:
        return f"CharacterInventory({self.character_name}, {self.item_count} items, {len(self.equipped_slots)} equipped)"
