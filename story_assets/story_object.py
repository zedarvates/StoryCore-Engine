"""
story_object.py — Modèle de données pour les objets d'histoire
=============================================================

Un StoryObject représente n'importe quel objet persistant dans l'histoire :
  - Arme d'un personnage
  - Artefact narratif
  - Prop de décor (lanterne, coffre, tableau...)
  - Véhicule
  - Document / livre
  - Technologie / gadget

Chaque StoryObject possède :
  - Une identité narrative (nom, description, histoire)
  - Des propriétés visuelles (couleur, géométrie, matériau)
  - Une géométrie Blender générée procéduralement
  - Un lien optionnel vers un personnage propriétaire

Format de persistance : JSON dans projects/<id>/objects/<object_id>.json
"""

from __future__ import annotations
import json
import uuid
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Optional, List, Tuple, Dict, Any


# ─────────────────────────────────────────────────────────────────────────────
#  TYPES D'OBJETS
# ─────────────────────────────────────────────────────────────────────────────

# Catégories narratives → géométrie Blender correspondante
OBJECT_TYPES = {
    "weapon":      "blade",           # épées, couteaux → plan extrudé
    "gun":         "gun_body",        # armes à feu → boîte + cylindre
    "shield":      "disc",            # boucliers → disc aplati
    "armor":       "torso_shape",     # armures → plusieurs boîtes
    "staff":       "cylinder",        # bâtons, lances → cylindre allongé
    "potion":      "bottle",          # potions, flacons → sphère + cylindre
    "book":        "book",            # livres, grimoires → boîte plate
    "key":         "key_shape",       # clés → dent + anneau
    "jewel":       "gem",             # bijoux, gemmes → ico-sphere facettée
    "lantern":     "lantern",         # lanternes → cylindre + sphère
    "bag":         "bag",             # sacs → sphère aplatie
    "scroll":      "scroll",          # parchemins → cylindre plat
    "device":      "box",             # gadgets, tech → boîte + détails
    "vehicle":     "vehicle_body",    # véhicules → boîte complexe
    "furniture":   "box",             # mobilier → boîte
    "food":        "sphere",          # nourriture → sphère
    "tool":        "cylinder",        # outils → cylindre
    "container":   "box",             # caisses, coffres → boîte
    "document":    "flat_plane",      # documents → plan
    "misc":        "box",             # divers → boîte
}

# Presets de matériaux Blender (principled BSDF)
MATERIAL_PRESETS = {
    "metal_shiny":  {"base_color": (0.7, 0.7, 0.8, 1.0), "metallic": 1.0, "roughness": 0.1},
    "metal_rusty":  {"base_color": (0.4, 0.25, 0.15, 1.0), "metallic": 0.8, "roughness": 0.85},
    "metal_dark":   {"base_color": (0.15, 0.15, 0.2, 1.0), "metallic": 0.9, "roughness": 0.3},
    "wood_light":   {"base_color": (0.6, 0.45, 0.3, 1.0), "metallic": 0.0, "roughness": 0.8},
    "wood_dark":    {"base_color": (0.25, 0.15, 0.08, 1.0), "metallic": 0.0, "roughness": 0.9},
    "leather":      {"base_color": (0.35, 0.2, 0.1, 1.0), "metallic": 0.0, "roughness": 0.75},
    "cloth":        {"base_color": (0.5, 0.5, 0.6, 1.0), "metallic": 0.0, "roughness": 0.95},
    "glass":        {"base_color": (0.8, 0.9, 1.0, 1.0), "metallic": 0.0, "roughness": 0.0, "transmission": 0.95},
    "crystal":      {"base_color": (0.6, 0.8, 1.0, 1.0), "metallic": 0.1, "roughness": 0.05, "transmission": 0.7},
    "stone":        {"base_color": (0.55, 0.55, 0.5, 1.0), "metallic": 0.0, "roughness": 0.9},
    "plastic":      {"base_color": (0.2, 0.2, 0.25, 1.0), "metallic": 0.0, "roughness": 0.5},
    "glowing_blue": {"base_color": (0.2, 0.5, 1.0, 1.0), "metallic": 0.2, "roughness": 0.2, "emission": (0.2, 0.5, 1.0), "emission_strength": 2.0},
    "glowing_red":  {"base_color": (1.0, 0.2, 0.1, 1.0), "metallic": 0.1, "roughness": 0.2, "emission": (1.0, 0.2, 0.1), "emission_strength": 1.5},
    "gold":         {"base_color": (1.0, 0.8, 0.2, 1.0), "metallic": 1.0, "roughness": 0.2},
    "matte_black":  {"base_color": (0.05, 0.05, 0.05, 1.0), "metallic": 0.0, "roughness": 1.0},
}


# ─────────────────────────────────────────────────────────────────────────────
#  MODÈLE DE DONNÉES
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class StoryObject:
    """
    Objet d'histoire persistant avec représentation 3D Blender.

    Persistance : JSON dans projects/<project_id>/objects/<id>.json

    Exemples :
        epee = StoryObject(
            id="epee_alpha",
            name="Épée d'Alpha",
            object_type="weapon",
            owner="Alpha",
            material="metal_rusty",
            description="Lame brisée, gravée d'un symbole inconnu",
        )
    """

    # ── Identité ──────────────────────────────────────────────────────────────
    id: str = field(default_factory=lambda: f"obj_{uuid.uuid4().hex[:8]}")
    name: str = "Objet sans nom"
    object_type: str = "misc"           # voir OBJECT_TYPES
    description: str = ""
    story_notes: str = ""               # Notes narratives libres

    # ── Appartenance ──────────────────────────────────────────────────────────
    owner: Optional[str] = None         # Nom du personnage propriétaire
    project_id: Optional[str] = None    # Projet StoryCore associé

    # ── Propriétés visuelles ──────────────────────────────────────────────────
    material: str = "metal_shiny"       # voir MATERIAL_PRESETS
    color_override: Optional[Tuple[float, float, float]] = None  # surcharge couleur (R, G, B 0-1)
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)          # scale XYZ Blender

    # ── Métadonnées ────────────────────────────────────────────────────────────
    tags: List[str] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: date.today().isoformat())
    narrative_context: str = ""         # Contexte d'apparition dans l'histoire

    # ── État de génération 3D ─────────────────────────────────────────────────
    blender_script_path: Optional[str] = None   # Script .py généré
    preview_image_path: Optional[str] = None    # Rendu preview PNG
    blend_file_path: Optional[str] = None       # Fichier .blend exporté

    # ─── SÉRIALISATION ────────────────────────────────────────────────────────

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "object_type": self.object_type,
            "description": self.description,
            "story_notes": self.story_notes,
            "owner": self.owner,
            "project_id": self.project_id,
            "material": self.material,
            "color_override": list(self.color_override) if self.color_override else None,
            "scale": list(self.scale),
            "tags": self.tags,
            "created_at": self.created_at,
            "narrative_context": self.narrative_context,
            "blender_script_path": self.blender_script_path,
            "preview_image_path": self.preview_image_path,
            "blend_file_path": self.blend_file_path,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StoryObject":
        co = data.get("color_override")
        sc = data.get("scale", [1.0, 1.0, 1.0])
        return cls(
            id=data.get("id", f"obj_{uuid.uuid4().hex[:8]}"),
            name=data.get("name", "Objet sans nom"),
            object_type=data.get("object_type", "misc"),
            description=data.get("description", ""),
            story_notes=data.get("story_notes", ""),
            owner=data.get("owner"),
            project_id=data.get("project_id"),
            material=data.get("material", "metal_shiny"),
            color_override=tuple(co) if co else None,
            scale=tuple(sc),
            tags=data.get("tags", []),
            created_at=data.get("created_at", date.today().isoformat()),
            narrative_context=data.get("narrative_context", ""),
            blender_script_path=data.get("blender_script_path"),
            preview_image_path=data.get("preview_image_path"),
            blend_file_path=data.get("blend_file_path"),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "StoryObject":
        return cls.from_dict(json.loads(json_str))

    @classmethod
    def from_file(cls, path: str) -> "StoryObject":
        with open(path, "r", encoding="utf-8") as f:
            return cls.from_dict(json.load(f))

    def save(self, directory: str) -> str:
        """Sauvegarde l'objet en JSON. Retourne le chemin du fichier."""
        path = Path(directory) / f"{self.id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            f.write(self.to_json())
        return str(path)

    # ─── PROPRIÉTÉS UTILES ────────────────────────────────────────────────────

    @property
    def geometry_type(self) -> str:
        """Retourne le type de géométrie Blender pour cet objet."""
        return OBJECT_TYPES.get(self.object_type, "box")

    @property
    def material_preset(self) -> Dict[str, Any]:
        """Retourne les paramètres du matériau Blender."""
        preset = MATERIAL_PRESETS.get(self.material, MATERIAL_PRESETS["metal_shiny"]).copy()
        if self.color_override:
            preset["base_color"] = (*self.color_override, 1.0)
        return preset

    @property
    def blender_object_name(self) -> str:
        """Nom d'objet Blender (sans caractères spéciaux)."""
        import re
        name = f"{self.owner}_{self.name}" if self.owner else self.name
        return re.sub(r"[^a-zA-Z0-9_]", "_", name)[:63]

    def __repr__(self) -> str:
        owner_str = f" [{self.owner}]" if self.owner else ""
        return f"StoryObject('{self.id}' | {self.name}{owner_str} | {self.object_type} | {self.material})"
