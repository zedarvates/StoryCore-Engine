"""
rig_generator.py — Générateur de rigs placeholder humanoïdes
============================================================

Crée des "pantins" 3D à partir des personnages du système existant StoryCore.

Ces rigs sont :
  - Volontairement simples (primitives géométriques)
  - Nommés depuis les personnages existants du système
  - Positionnables dans la scène
  - Exportables vers Blender (script Python)

Ils servent de PLACEHOLDER pour :
  - Calcul des occlusions et ombres
  - Positionnement dans le cadre
  - Vérification des cadrages avant génération IA
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
import math

from blender_bridge.scene_types import CharacterRig, RigType, CameraConfig


# ─────────────────────────────────────────────────────────────────────────────
#  PROFILS CORPORELS PRÉDÉFINIS
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class BodyProfile:
    """Proportions corporelles pour un rig humanoïde."""
    height:         float = 1.75  # taille totale en mètres
    shoulder_width: float = 0.44  # largeur épaules
    hip_width:      float = 0.36  # largeur bassin
    head_ratio:     float = 0.13  # taille tête / taille totale
    torso_ratio:    float = 0.32  # torse / taille totale
    leg_ratio:      float = 0.47  # jambes / taille totale
    arm_ratio:      float = 0.32  # bras / taille totale

    @classmethod
    def standard(cls) -> "BodyProfile":
        """Proportions adulte standard."""
        return cls()

    @classmethod
    def athletic(cls) -> "BodyProfile":
        """Proportions athlète (plus large, plus musclé)."""
        return cls(shoulder_width=0.52, hip_width=0.38, torso_ratio=0.33)

    @classmethod
    def slim(cls) -> "BodyProfile":
        """Proportions svelte."""
        return cls(shoulder_width=0.36, hip_width=0.30, torso_ratio=0.30)

    @classmethod
    def child(cls) -> "BodyProfile":
        """Proportions enfant (6-10 ans)."""
        return cls(height=1.2, shoulder_width=0.28, hip_width=0.24, head_ratio=0.18, leg_ratio=0.38)

    @classmethod
    def tall(cls) -> "BodyProfile":
        """Grand gabarit."""
        return cls(height=1.95, shoulder_width=0.50, leg_ratio=0.50)


# ─────────────────────────────────────────────────────────────────────────────
#  MATÉRIAUX PAR PERSONNAGE
# ─────────────────────────────────────────────────────────────────────────────

# Palette de couleurs pour distinguer visuellement les personnages
_CHARACTER_PALETTE = [
    (0.70, 0.55, 0.45),  # Beige peau
    (0.25, 0.45, 0.75),  # Bleu
    (0.75, 0.30, 0.30),  # Rouge
    (0.30, 0.70, 0.40),  # Vert
    (0.80, 0.65, 0.20),  # Jaune/Or
    (0.60, 0.25, 0.70),  # Violet
    (0.25, 0.70, 0.75),  # Cyan
    (0.75, 0.45, 0.15),  # Orange
]


# ─────────────────────────────────────────────────────────────────────────────
#  GÉNÉRATEUR DE RIGS
# ─────────────────────────────────────────────────────────────────────────────

class RigGenerator:
    """
    Génère des CharacterRig (pantins placeholder) depuis les personnages existants.

    Intégration avec le système de personnages StoryCore :
      - utilise le nom du personnage comme identifiant
      - assigne automatiquement une couleur unique par personnage
      - peut lire les profils depuis le stockage de personnages existant
    """

    def __init__(self):
        self._color_index = 0
        self._character_colors: Dict[str, Tuple[float, float, float]] = {}

    def create_rig(
        self,
        name: str,
        position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        rig_type: RigType = RigType.HUMANOID,
        height: float = 1.75,
        profile: Optional[BodyProfile] = None,
        facing_camera: bool = True,
    ) -> CharacterRig:
        """
        Crée un rig placeholder pour un personnage.

        Args:
            name          : nom du personnage (doit correspondre au système de personnages)
            position      : position (x, y, z) dans la scène Blender
            rig_type      : type de rig
            height        : hauteur en mètres
            profile       : profil corporel (BodyProfile)
            facing_camera : orienter automatiquement vers la caméra

        Returns:
            CharacterRig prêt à injecter dans un SceneJSON
        """
        color = self._get_character_color(name)
        profile = profile or BodyProfile.standard()

        return CharacterRig(
            name=name,
            rig_type=rig_type,
            position=position,
            rotation=(0.0, 0.0, 0.0),
            height=height or profile.height,
            material_color=color,
            pose="T_POSE",
            facing_camera=facing_camera,
        )

    def create_from_character_data(
        self,
        character_data: Dict[str, Any],
        position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> CharacterRig:
        """
        Crée un rig depuis un dictionnaire personnage du système existant.

        Compatible avec characterStorage.ts / character_ai_service.py

        Args:
            character_data : dict personnage (name, height, build, ...)
            position       : position dans la scène

        Returns:
            CharacterRig
        """
        name = character_data.get("name", "Character")

        # Profil corporel depuis les données existantes
        build = character_data.get("build", "standard").lower()
        profile = self._build_to_profile(build)

        height = character_data.get("height", profile.height)
        if isinstance(height, str):
            # Convertir "1m75" ou "175cm" en float
            height = self._parse_height(height)

        return self.create_rig(
            name=name,
            position=position,
            height=height,
            profile=profile,
        )

    def place_multiple(
        self,
        characters: List[str],
        camera_config: Optional[CameraConfig] = None,
        spacing: float = 0.8,
        formation: str = "line",
    ) -> List[CharacterRig]:
        """
        Place plusieurs personnages en formation dans la scène.

        Args:
            characters    : liste de noms de personnages
            camera_config : config caméra pour orienter vers elle
            spacing       : espacement entre personnages en mètres
            formation     : "line", "arc", "cluster"

        Returns:
            Liste de CharacterRig positionnés
        """
        positions = self._compute_formation(len(characters), spacing, formation)
        rigs = []

        for i, (name, pos) in enumerate(zip(characters, positions)):
            rig = self.create_rig(
                name=name,
                position=pos,
                facing_camera=camera_config is not None,
            )
            rigs.append(rig)

        return rigs

    def place_at_distance(
        self,
        character_name: str,
        camera_config: CameraConfig,
        distance_from_camera: float = 2.0,
        lateral_offset: float = 0.0,
    ) -> CharacterRig:
        """
        Place un personnage à une distance précise devant la caméra.

        Exemple vocal : "Place Alpha à 2 mètres devant la caméra"

        Args:
            character_name      : nom du personnage
            camera_config       : configuration de la caméra
            distance_from_camera: distance en mètres
            lateral_offset      : décalage latéral (positif = droite)

        Returns:
            CharacterRig positionné
        """
        cam_pos = camera_config.position
        cam_rot = camera_config.rotation  # degrés Euler

        # Calculer la direction de la caméra (axe Y avant en Blender)
        yaw_rad = math.radians(cam_rot[2])  # rotation Z

        # Position devant la caméra
        char_x = cam_pos[0] + distance_from_camera * math.sin(yaw_rad) + lateral_offset * math.cos(yaw_rad)
        char_y = cam_pos[1] + distance_from_camera * math.cos(yaw_rad) - lateral_offset * math.sin(yaw_rad)
        char_z = 0.0  # au sol

        return self.create_rig(
            name=character_name,
            position=(char_x, char_y, char_z),
            facing_camera=True,
        )

    def generate_armature_script(self, rig: CharacterRig) -> str:
        """
        Génère un bloc Python Blender pour créer une armature complète.
        Version avancée avec vrai squelette Blender (bones).

        Returns:
            Code Python Blender (à intégrer dans un script généré)
        """
        safe_name = rig.name.replace(" ", "_").replace("-", "_")
        h = rig.height
        pos = list(rig.position)
        mc = rig.material_color
        color_str = f"({mc[0]:.3f}, {mc[1]:.3f}, {mc[2]:.3f}, 1.0)"

        return f"""\
# ═══════════════════════════════════════════════════════════════
#  ARMATURE BLENDER : {rig.name}
# ═══════════════════════════════════════════════════════════════
def create_armature_{safe_name}():
    sc = {h:.3f} / 1.75  # scale factor

    # Créer l'armature
    bpy.ops.object.armature_add(enter_editmode=True, location={pos})
    arm_obj = bpy.context.active_object
    arm_obj.name = "{safe_name}_Armature"
    arm_data = arm_obj.data
    arm_data.name = "{safe_name}_Rig"

    # Mode édition pour créer les os
    bones = arm_data.edit_bones

    # Supprimer l'os par défaut
    for b in bones:
        bones.remove(b)

    def add_bone(name, head, tail, parent=None, roll=0):
        b = bones.new(name)
        b.head = tuple(h * sc for h in head)
        b.tail = tuple(t * sc for t in tail)
        b.roll = roll
        if parent:
            b.parent = bones[parent]
            b.use_connect = True if parent else False
        return b

    # Squelette humanoïde minimal (proportions 1.75m → normalisées en unités)
    add_bone("Hips",       (0, 0, 0.55),     (0, 0, 0.65))
    add_bone("Spine",      (0, 0, 0.65),     (0, 0, 0.80),  "Hips")
    add_bone("Chest",      (0, 0, 0.80),     (0, 0, 0.93),  "Spine")
    add_bone("Neck",       (0, 0, 0.93),     (0, 0, 0.98),  "Chest")
    add_bone("Head",       (0, 0, 0.98),     (0, 0, 1.10),  "Neck")

    add_bone("Shoulder_L", (-0.04, 0, 0.91), (-0.14, 0, 0.91), "Chest")
    add_bone("UpperArm_L", (-0.14, 0, 0.91), (-0.34, 0, 0.91), "Shoulder_L")
    add_bone("ForeArm_L",  (-0.34, 0, 0.91), (-0.52, 0, 0.81), "UpperArm_L")
    add_bone("Hand_L",     (-0.52, 0, 0.81), (-0.58, 0, 0.78), "ForeArm_L")

    add_bone("Shoulder_R", (0.04, 0, 0.91),  (0.14, 0, 0.91),  "Chest")
    add_bone("UpperArm_R", (0.14, 0, 0.91),  (0.34, 0, 0.91),  "Shoulder_R")
    add_bone("ForeArm_R",  (0.34, 0, 0.91),  (0.52, 0, 0.81),  "UpperArm_R")
    add_bone("Hand_R",     (0.52, 0, 0.81),  (0.58, 0, 0.78),  "ForeArm_R")

    add_bone("UpperLeg_L", (-0.10, 0, 0.52), (-0.10, 0, 0.28), "Hips")
    add_bone("LowerLeg_L", (-0.10, 0, 0.28), (-0.10, 0, 0.04), "UpperLeg_L")
    add_bone("Foot_L",     (-0.10, 0, 0.04), (-0.10, 0.10, 0), "LowerLeg_L")

    add_bone("UpperLeg_R", (0.10, 0, 0.52),  (0.10, 0, 0.28),  "Hips")
    add_bone("LowerLeg_R", (0.10, 0, 0.28),  (0.10, 0, 0.04),  "UpperLeg_R")
    add_bone("Foot_R",     (0.10, 0, 0.04),  (0.10, 0.10, 0),  "UpperLeg_R")

    bpy.ops.object.mode_set(mode='OBJECT')

    # Matériau d'affichage
    arm_obj.display_type = 'SOLID'
    return arm_obj

armature_{safe_name} = create_armature_{safe_name}()
"""

    # ─── PRIVÉ ──────────────────────────────────────────────────────────────

    def _get_character_color(self, name: str) -> Tuple[float, float, float]:
        """Assigne une couleur unique et persistante à un personnage."""
        if name not in self._character_colors:
            idx = len(self._character_colors) % len(_CHARACTER_PALETTE)
            self._character_colors[name] = _CHARACTER_PALETTE[idx]
        return self._character_colors[name]

    def _build_to_profile(self, build: str) -> BodyProfile:
        """Convertit un type de morphologie en BodyProfile."""
        mapping = {
            "athletic":  BodyProfile.athletic(),
            "sportif":   BodyProfile.athletic(),
            "musclé":    BodyProfile.athletic(),
            "slim":      BodyProfile.slim(),
            "svelte":    BodyProfile.slim(),
            "mince":     BodyProfile.slim(),
            "child":     BodyProfile.child(),
            "enfant":    BodyProfile.child(),
            "tall":      BodyProfile.tall(),
            "grand":     BodyProfile.tall(),
        }
        return mapping.get(build, BodyProfile.standard())

    def _parse_height(self, height_str: str) -> float:
        """Parse une hauteur depuis une chaîne ('1m75', '175cm', '1.75')."""
        import re
        height_str = height_str.strip().lower()

        # Format "1m75" ou "1,75m"
        m = re.match(r"(\d+)m(\d+)", height_str)
        if m:
            return float(m.group(1)) + float(m.group(2)) / 100.0

        # Format "175cm"
        m = re.match(r"(\d+)\s*cm", height_str)
        if m:
            return float(m.group(1)) / 100.0

        # Format décimal
        m = re.match(r"([\d.,]+)", height_str)
        if m:
            val = float(m.group(1).replace(",", "."))
            if val > 3.0:  # probablement en cm
                return val / 100.0
            return val

        return 1.75  # défaut

    def _compute_formation(
        self,
        count: int,
        spacing: float,
        formation: str,
    ) -> List[Tuple[float, float, float]]:
        """Calcule les positions pour une formation de personnages."""
        positions = []

        if count == 0:
            return positions

        if formation == "line":
            # Ligne horizontale centrée
            total_width = (count - 1) * spacing
            start_x = -total_width / 2.0
            for i in range(count):
                positions.append((start_x + i * spacing, 0.0, 0.0))

        elif formation == "arc":
            # Arc de cercle
            radius = max(1.5, spacing * count / (2 * math.pi) * 2)
            angle_step = math.pi / max(count - 1, 1)
            start_angle = -math.pi / 2
            for i in range(count):
                angle = start_angle + i * angle_step
                x = radius * math.cos(angle)
                y = radius * math.sin(angle) + radius
                positions.append((x, y, 0.0))

        elif formation == "cluster":
            # Groupe semi-aléatoire
            import random
            random.seed(42)
            for i in range(count):
                x = random.uniform(-spacing * count / 4, spacing * count / 4)
                y = random.uniform(0, spacing * count / 4)
                positions.append((x, y, 0.0))

        else:
            # Défaut : ligne
            for i in range(count):
                positions.append((i * spacing - (count - 1) * spacing / 2, 0.0, 0.0))

        return positions
