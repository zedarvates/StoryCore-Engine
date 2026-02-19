"""
scene_types.py — Structures de données pour les scènes BlenderBridge
=====================================================================

Définit le contrat de données entre :
  - le parser vocal
  - le générateur de scripts Blender
  - le gestionnaire de lieux
  - le système de caméras

Toutes les structures sont sérialisables en JSON pour persistence et API.
"""

from __future__ import annotations
from dataclasses import dataclass, field, asdict
from typing import Optional, List, Dict, Any, Tuple
from enum import Enum
import json


# ─────────────────────────────────────────────
#  ENUMERATIONS
# ─────────────────────────────────────────────

class ShotType(str, Enum):
    """Types de plans cinématographiques."""
    WIDE            = "wide"
    CLOSE_UP        = "close_up"
    MEDIUM          = "medium"
    OVER_SHOULDER   = "over_shoulder"
    LOW_ANGLE       = "low_angle"
    HIGH_ANGLE      = "high_angle"
    LOW_ANGLE_CLOSE = "low_angle_close"
    BIRD_EYE        = "bird_eye"
    WORM_EYE        = "worm_eye"
    DUTCH_ANGLE     = "dutch_angle"
    POV             = "pov"


class SceneType(str, Enum):
    """Type d'environnement de la scène."""
    EXTERIOR        = "exterior"
    INTERIOR        = "interior"
    SKYBOX          = "skybox"
    ABSTRACT        = "abstract"


class LightType(str, Enum):
    SUN     = "sun"
    AREA    = "area"
    POINT   = "point"
    SPOT    = "spot"
    HEMI    = "hemi"


class AtmosphereType(str, Enum):
    NONE        = "none"
    FOG         = "fog"
    VOLUMETRIC  = "volumetric_fog"
    RAIN        = "rain"
    DUST        = "dust"
    SMOKE       = "smoke"
    MIST        = "mist"


class RigType(str, Enum):
    HUMANOID    = "humanoid"
    ANIMAL      = "animal"
    ABSTRACT    = "abstract"


# ─────────────────────────────────────────────
#  CAMERA
# ─────────────────────────────────────────────

@dataclass
class CameraConfig:
    """
    Configuration complète d'une caméra cinématographique.

    position    : (x, y, z) en mètres Blender
    rotation    : (rx, ry, rz) en degrés Euler
    lens        : focale en mm (24 = grand angle, 85 = portrait, 135 = télé)
    dof_enabled : profondeur de champ activée
    f_stop      : ouverture (1.4 = ouvert, 22 = fermé)
    focus_dist  : distance de mise au point en mètres
    shot_type   : type de plan cinématographique
    """
    position:    Tuple[float, float, float] = (0.0, -5.0, 1.6)
    rotation:    Tuple[float, float, float] = (85.0, 0.0, 0.0)
    lens:        float                      = 50.0
    dof_enabled: bool                       = True
    f_stop:      float                      = 2.8
    focus_dist:  float                      = 5.0
    shot_type:   ShotType                   = ShotType.MEDIUM
    sensor_width: float                     = 36.0  # mm (format 35mm)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CameraConfig":
        d = d.copy()
        if "shot_type" in d:
            d["shot_type"] = ShotType(d["shot_type"])
        return cls(**d)


# ─────────────────────────────────────────────
#  LIGHTING
# ─────────────────────────────────────────────

@dataclass
class LightConfig:
    """Configuration d'une source lumineuse."""
    name:       str                         = "Light"
    light_type: LightType                   = LightType.SUN
    position:   Tuple[float, float, float]  = (4.0, -4.0, 6.0)
    rotation:   Tuple[float, float, float]  = (45.0, 0.0, 45.0)
    color:      Tuple[float, float, float]  = (1.0, 0.95, 0.9)
    energy:     float                       = 5.0
    size:       float                       = 1.0  # pour area lights
    cast_shadow: bool                       = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class LightingConfig:
    """Ensemble de l'éclairage d'une scène."""
    lights:         List[LightConfig]           = field(default_factory=list)
    world_color:    Tuple[float, float, float]  = (0.05, 0.05, 0.08)
    world_strength: float                       = 1.0
    use_hdri:       bool                        = False
    hdri_path:      Optional[str]               = None
    hdri_rotation:  float                       = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lights": [l.to_dict() for l in self.lights],
            "world_color": self.world_color,
            "world_strength": self.world_strength,
            "use_hdri": self.use_hdri,
            "hdri_path": self.hdri_path,
            "hdri_rotation": self.hdri_rotation,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "LightingConfig":
        lights = [LightConfig(**l) for l in d.get("lights", [])]
        return cls(
            lights=lights,
            world_color=tuple(d.get("world_color", (0.05, 0.05, 0.08))),
            world_strength=d.get("world_strength", 1.0),
            use_hdri=d.get("use_hdri", False),
            hdri_path=d.get("hdri_path"),
            hdri_rotation=d.get("hdri_rotation", 0.0),
        )


# ─────────────────────────────────────────────
#  ATMOSPHERE
# ─────────────────────────────────────────────

@dataclass
class AtmosphereConfig:
    """Configuration de l'atmosphère volumétrique."""
    type:           AtmosphereType  = AtmosphereType.NONE
    density:        float           = 0.02
    color:          Tuple[float, float, float] = (0.8, 0.85, 1.0)
    emission:       float           = 0.0
    anisotropy:     float           = 0.0  # direction du scatter (-1 à 1)
    height_falloff: float           = 0.5  # brouillard de sol

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  PROPS (objets de décor)
# ─────────────────────────────────────────────

@dataclass
class PropObject:
    """Objet de décor placé dans la scène."""
    name:       str
    asset_path: Optional[str]                   = None  # chemin vers .blend ou .obj
    position:   Tuple[float, float, float]      = (0.0, 0.0, 0.0)
    rotation:   Tuple[float, float, float]      = (0.0, 0.0, 0.0)
    scale:      Tuple[float, float, float]      = (1.0, 1.0, 1.0)
    material_override: Optional[str]            = None
    visible:    bool                            = True
    cast_shadow: bool                           = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  CHARACTER RIG (pantin placeholder)
# ─────────────────────────────────────────────

@dataclass
class CharacterRig:
    """
    Rig placeholder humanoïde lié à un personnage du système existant.

    name        : identifiant du personnage (ex: "Alpha")
    rig_type    : type de rig
    position    : position dans la scène
    rotation    : orientation (Y-up Blender)
    height      : taille en mètres
    material_color : couleur de base du matériau
    """
    name:           str
    rig_type:       RigType                         = RigType.HUMANOID
    position:       Tuple[float, float, float]      = (0.0, 0.0, 0.0)
    rotation:       Tuple[float, float, float]      = (0.0, 0.0, 0.0)
    height:         float                           = 1.75
    material_color: Tuple[float, float, float]      = (0.7, 0.6, 0.5)
    pose:           str                             = "T_POSE"
    facing_camera:  bool                            = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CharacterRig":
        d = d.copy()
        if "rig_type" in d:
            d["rig_type"] = RigType(d["rig_type"])
        return cls(**d)


# ─────────────────────────────────────────────
#  LOCATION PRESET
# ─────────────────────────────────────────────

@dataclass
class LocationPreset:
    """
    Preset de lieu sauvegardé, réutilisable entre projets.

    Structure : Scene → Location → Props → Lighting → Atmosphere
    """
    id:             str
    name:           str
    description:    str                     = ""
    scene_type:     SceneType               = SceneType.EXTERIOR
    tags:           List[str]               = field(default_factory=list)
    props:          List[PropObject]        = field(default_factory=list)
    lighting:       Optional[LightingConfig]    = None
    atmosphere:     Optional[AtmosphereConfig]  = None
    thumbnail_path: Optional[str]               = None
    created_at:     str                         = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "scene_type": self.scene_type.value,
            "tags": self.tags,
            "props": [p.to_dict() for p in self.props],
            "lighting": self.lighting.to_dict() if self.lighting else None,
            "atmosphere": self.atmosphere.to_dict() if self.atmosphere else None,
            "thumbnail_path": self.thumbnail_path,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "LocationPreset":
        lighting = LightingConfig.from_dict(d["lighting"]) if d.get("lighting") else None
        atmosphere = AtmosphereConfig(**d["atmosphere"]) if d.get("atmosphere") else None
        props = [PropObject(**p) for p in d.get("props", [])]
        return cls(
            id=d["id"],
            name=d["name"],
            description=d.get("description", ""),
            scene_type=SceneType(d.get("scene_type", "exterior")),
            tags=d.get("tags", []),
            props=props,
            lighting=lighting,
            atmosphere=atmosphere,
            thumbnail_path=d.get("thumbnail_path"),
            created_at=d.get("created_at", ""),
        )


# ─────────────────────────────────────────────
#  RENDER SETTINGS
# ─────────────────────────────────────────────

@dataclass
class RenderSettings:
    """Paramètres de rendu Blender."""
    engine:         str     = "CYCLES"          # ou EEVEE
    resolution_x:   int     = 1920
    resolution_y:   int     = 1080
    samples:        int     = 64
    use_denoiser:   bool    = True
    output_format:  str     = "PNG"             # PNG, JPEG, EXR
    output_path:    str     = "/tmp/render_"
    frame_start:    int     = 1
    frame_end:      int     = 1
    fps:            int     = 24

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


# ─────────────────────────────────────────────
#  SCENE JSON (structure principale)
# ─────────────────────────────────────────────

@dataclass
class SceneJSON:
    """
    Structure principale d'une scène StoryCore → Blender.

    C'est le contrat de données central entre :
      - le parser vocal
      - le gestionnaire de lieux
      - le générateur de scripts Blender
      - l'API backend

    Exemple :
        scene = SceneJSON(
            scene_id="ruelle_cyberpunk",
            scene_type=SceneType.EXTERIOR,
            description="Ruelle cyberpunk sous pluie nocturne",
            camera=CameraConfig(lens=35, shot_type=ShotType.LOW_ANGLE_CLOSE),
            characters=[CharacterRig(name="Alpha", position=(0, 0, 0))],
            atmosphere=AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.05),
        )
    """
    scene_id:       str
    scene_type:     SceneType               = SceneType.EXTERIOR
    description:    str                     = ""
    location_preset_id: Optional[str]       = None

    camera:         CameraConfig            = field(default_factory=CameraConfig)
    lighting:       LightingConfig          = field(default_factory=LightingConfig)
    atmosphere:     AtmosphereConfig        = field(default_factory=AtmosphereConfig)
    characters:     List[CharacterRig]      = field(default_factory=list)
    props:          List[PropObject]        = field(default_factory=list)
    render:         RenderSettings          = field(default_factory=RenderSettings)

    # Métadonnées narratives (séparées de la description technique)
    narrative_tags: List[str]               = field(default_factory=list)
    voice_command:  Optional[str]           = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_id":             self.scene_id,
            "scene_type":           self.scene_type.value,
            "description":          self.description,
            "location_preset_id":   self.location_preset_id,
            "camera":               self.camera.to_dict(),
            "lighting":             self.lighting.to_dict(),
            "atmosphere":           self.atmosphere.to_dict(),
            "characters":           [c.to_dict() for c in self.characters],
            "props":                [p.to_dict() for p in self.props],
            "render":               self.render.to_dict(),
            "narrative_tags":       self.narrative_tags,
            "voice_command":        self.voice_command,
        }

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SceneJSON":
        camera = CameraConfig.from_dict(d.get("camera", {})) if d.get("camera") else CameraConfig()
        lighting = LightingConfig.from_dict(d.get("lighting", {})) if d.get("lighting") else LightingConfig()
        atm_data = d.get("atmosphere", {})
        atmosphere = AtmosphereConfig(**atm_data) if atm_data else AtmosphereConfig()
        characters = [CharacterRig.from_dict(c) for c in d.get("characters", [])]
        props = [PropObject(**p) for p in d.get("props", [])]
        render = RenderSettings(**d.get("render", {})) if d.get("render") else RenderSettings()

        return cls(
            scene_id=d.get("scene_id", "scene_001"),
            scene_type=SceneType(d.get("scene_type", "exterior")),
            description=d.get("description", ""),
            location_preset_id=d.get("location_preset_id"),
            camera=camera,
            lighting=lighting,
            atmosphere=atmosphere,
            characters=characters,
            props=props,
            render=render,
            narrative_tags=d.get("narrative_tags", []),
            voice_command=d.get("voice_command"),
        )

    @classmethod
    def from_json(cls, json_str: str) -> "SceneJSON":
        return cls.from_dict(json.loads(json_str))
