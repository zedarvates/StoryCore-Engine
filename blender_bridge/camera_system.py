"""
camera_system.py — Système de caméras cinématographiques avancées
=================================================================

Gère la logique de positionnement et configuration des caméras
selon des modes cinématographiques prédéfinis.

Grammaire cinématographique : position + focale + DoF + shot_type
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Optional, Tuple
import math
import re

from blender_bridge.scene_types import CameraConfig, ShotType


# ─────────────────────────────────────────────────────────────────────────────
#  PRESETS DE CAMÉRAS CINÉMATOGRAPHIQUES
# ─────────────────────────────────────────────────────────────────────────────

# Format : (position_xyz, rotation_xyz_deg, lens_mm, f_stop, focus_dist)
_SHOT_PRESETS: Dict[ShotType, dict] = {
    ShotType.WIDE: {
        "position":   (0.0, -8.0, 1.7),
        "rotation":   (88.0, 0.0, 0.0),
        "lens":       24.0,
        "f_stop":     5.6,
        "focus_dist": 8.0,
        "description": "Plan large - établit l'espace, montre l'environnement complet",
    },
    ShotType.MEDIUM: {
        "position":   (0.0, -3.5, 1.6),
        "rotation":   (88.0, 0.0, 0.0),
        "lens":       50.0,
        "f_stop":     2.8,
        "focus_dist": 3.5,
        "description": "Plan moyen - taille humaine, dialogue standard",
    },
    ShotType.CLOSE_UP: {
        "position":   (0.0, -1.2, 1.65),
        "rotation":   (88.0, 0.0, 0.0),
        "lens":       85.0,
        "f_stop":     1.8,
        "focus_dist": 1.2,
        "description": "Gros plan - visage, émotion intense, détail important",
    },
    ShotType.OVER_SHOULDER: {
        "position":   (0.4, -1.8, 1.7),
        "rotation":   (80.0, 0.0, -8.0),
        "lens":       50.0,
        "f_stop":     2.8,
        "focus_dist": 2.5,
        "description": "Over-shoulder - dialogue entre 2 personnages",
    },
    ShotType.LOW_ANGLE: {
        "position":   (0.0, -4.0, 0.4),
        "rotation":   (70.0, 0.0, 0.0),
        "lens":       28.0,
        "f_stop":     4.0,
        "focus_dist": 4.0,
        "description": "Contre-plongée - personnage dominant, imposant, héroïque",
    },
    ShotType.HIGH_ANGLE: {
        "position":   (0.0, -3.0, 5.0),
        "rotation":   (120.0, 0.0, 0.0),
        "lens":       35.0,
        "f_stop":     4.0,
        "focus_dist": 4.0,
        "description": "Plongée - personnage vulnérable, écrasé, environnement dominé",
    },
    ShotType.LOW_ANGLE_CLOSE: {
        "position":   (0.0, -1.5, 0.3),
        "rotation":   (65.0, 0.0, 0.0),
        "lens":       35.0,
        "f_stop":     2.0,
        "focus_dist": 1.6,
        "description": "Contre-plongée serrée - héroïsme dramatique, tension maximale",
    },
    ShotType.BIRD_EYE: {
        "position":   (0.0, 0.0, 12.0),
        "rotation":   (0.0, 0.0, 0.0),
        "lens":       28.0,
        "f_stop":     8.0,
        "focus_dist": 12.0,
        "description": "Vue aérienne - vue d'ensemble, cartographie de l'espace",
    },
    ShotType.WORM_EYE: {
        "position":   (0.0, -2.0, 0.05),
        "rotation":   (60.0, 0.0, 0.0),
        "lens":       14.0,
        "f_stop":     5.6,
        "focus_dist": 2.0,
        "description": "Oeil de ver - perspective extrême depuis le sol",
    },
    ShotType.DUTCH_ANGLE: {
        "position":   (0.0, -3.5, 1.6),
        "rotation":   (88.0, 0.0, 18.0),
        "lens":       35.0,
        "f_stop":     3.2,
        "focus_dist": 3.5,
        "description": "Angle hollandais - déstabilisant, inquiétant, psychologique",
    },
    ShotType.POV: {
        "position":   (0.0, -0.3, 1.7),
        "rotation":   (88.0, 0.0, 0.0),
        "lens":       50.0,
        "f_stop":     1.4,
        "focus_dist": 3.0,
        "description": "Point de vue subjectif - immersion totale dans le personnage",
    },
}


# ─────────────────────────────────────────────────────────────────────────────
#  SYSTÈME DE CAMÉRAS CINÉMATOGRAPHIQUES
# ─────────────────────────────────────────────────────────────────────────────

class CinematicCameraSystem:
    """
    Système de configuration de caméras cinématographiques.

    Fournit :
    - Presets par type de plan (ShotType)
    - Ajustement de focale
    - Calcul de position relative à un personnage
    - Configuration DoF avancée
    """

    def __init__(self):
        self._presets = _SHOT_PRESETS

    def get_camera_for_shot(
        self,
        shot_type: ShotType,
        lens_override: Optional[float] = None,
        subject_position: Tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> CameraConfig:
        """
        Retourne une configuration caméra complète pour un type de plan.

        Args:
            shot_type        : type de plan cinématographique
            lens_override    : focale personnalisée en mm (None = preset)
            subject_position : position du sujet principal pour calcul DoF

        Returns:
            CameraConfig prête à injecter dans SceneJSON
        """
        preset = self._presets.get(shot_type, self._presets[ShotType.MEDIUM])

        # Position ajustée selon le sujet
        pos = self._offset_position(preset["position"], subject_position)
        focus = self._compute_focus_distance(pos, subject_position)

        return CameraConfig(
            position=pos,
            rotation=preset["rotation"],
            lens=lens_override or preset["lens"],
            dof_enabled=True,
            f_stop=preset["f_stop"],
            focus_dist=focus,
            shot_type=shot_type,
        )

    def adjust_lens(self, config: CameraConfig, lens_mm: float) -> CameraConfig:
        """
        Ajuste la focale d'une config caméra existante.

        Focale → effet visuel :
          14mm  : ultra grand angle, distorsion, immersion totale
          24mm  : grand angle, espace ouvert, dynamique
          35mm  : proche œil humain, naturaliste
          50mm  : "normal", le plus neutre
          85mm  : portrait, compression légère, flatteur
          135mm : télé, compression forte, bokeh intense
          200mm+: très compressé, surveillance, distance
        """
        from dataclasses import replace
        return CameraConfig(
            position=config.position,
            rotation=config.rotation,
            lens=lens_mm,
            dof_enabled=config.dof_enabled,
            f_stop=config.f_stop,
            focus_dist=config.focus_dist,
            shot_type=config.shot_type,
            sensor_width=config.sensor_width,
        )

    def set_aperture(self, config: CameraConfig, f_stop: float) -> CameraConfig:
        """
        Règle l'ouverture (f-stop) pour contrôler la profondeur de champ.

        f/1.4 → très ouvert : bokeh fort, faible profondeur de champ
        f/2.8 → ouvert : portrait cinématographique classique
        f/5.6 → mi-ouvert : plan large avec mise au point étendue
        f/8.0 → fermé : tout net, paysages
        f/16  → très fermé : hyperfocale
        """
        return CameraConfig(
            position=config.position,
            rotation=config.rotation,
            lens=config.lens,
            dof_enabled=True,
            f_stop=f_stop,
            focus_dist=config.focus_dist,
            shot_type=config.shot_type,
            sensor_width=config.sensor_width,
        )

    def list_shot_types(self) -> Dict[str, str]:
        """Retourne un dictionnaire shot_type → description."""
        return {
            shot_type.value: preset["description"]
            for shot_type, preset in self._presets.items()
        }

    def from_voice_description(self, description: str) -> CameraConfig:
        """
        Interprète une description verbale et retourne une config caméra.

        Exemples :
            "caméra basse 35mm légère contre-plongée"
            "plan serré sur visage"
            "grand angle large"
            "over shoulder dialogue"
        """
        desc_lower = description.lower()

        # Détection du type de plan
        shot_type = self._detect_shot_type(desc_lower)

        # Détection de la focale
        lens = self._detect_lens(desc_lower)

        # Configuration de base
        config = self.get_camera_for_shot(shot_type, lens_override=lens)

        # Ajustements supplémentaires
        config = self._apply_voice_adjustments(config, desc_lower)

        return config

    # ─── PRIVÉ ──────────────────────────────────────────────────────────────

    def _detect_shot_type(self, desc: str) -> ShotType:
        """Détecte le type de plan depuis une description textuelle."""
        # Over shoulder (avant "sol" pour éviter le faux positif sur "shoulder")
        if any(k in desc for k in ["over", "épaule", "epaule", "shoulder"]):
            return ShotType.OVER_SHOULDER

        # Contre-plongée — AVANT plongée pour éviter le faux positif
        # "contre-plongee" contient "plongee" donc tester en premier
        if any(k in desc for k in [
            "contre-plongée", "contre-plongee", "contre plongée", "contre plongee",
            "low angle", "basse", "sol", "contreplon",
        ]):
            if any(k in desc for k in ["serrée", "serree", "serre", "gros", "close", "visage"]):
                return ShotType.LOW_ANGLE_CLOSE
            return ShotType.LOW_ANGLE

        # Plongée (après contre-plongée pour éviter le faux positif)
        if any(k in desc for k in ["plongée", "plongee", "high angle", "haute", "au-dessus", "dessus"]):
            return ShotType.HIGH_ANGLE

        # Vue aérienne
        if any(k in desc for k in ["aérien", "aérie", "bird", "oiseau", "drone", "aerial"]):
            return ShotType.BIRD_EYE

        # Oeil de ver (seulement si "sol" est un mot isolé ou combiné à worm/ver/terre)
        if any(k in desc for k in ["worm", "ver", "terre"]) or re.search(r"\bsol\b", desc):
            return ShotType.WORM_EYE

        # Gros plan / close-up
        if any(k in desc for k in ["gros plan", "close", "serré", "visage", "face", "portrait"]):
            return ShotType.CLOSE_UP

        # Plan large
        if any(k in desc for k in ["large", "wide", "grand", "ensemble", "establishing"]):
            return ShotType.WIDE

        # Plan moyen (défaut)
        if any(k in desc for k in ["moyen", "medium", "normal", "standard"]):
            return ShotType.MEDIUM

        # POV
        if any(k in desc for k in ["pov", "subjectif", "point de vue"]):
            return ShotType.POV

        # Dutch angle
        if any(k in desc for k in ["dutch", "penché", "incliné", "oblique"]):
            return ShotType.DUTCH_ANGLE

        return ShotType.MEDIUM  # Défaut

    def _detect_lens(self, desc: str) -> Optional[float]:
        """Extrait la focale en mm depuis une description textuelle."""
        import re
        # Chercher des patterns comme "35mm", "85 mm", "24mm"
        match = re.search(r"(\d+)\s*mm", desc)
        if match:
            return float(match.group(1))

        # Termes qualitatifs
        if any(k in desc for k in ["ultra grand angle", "très large", "14mm"]):
            return 14.0
        if any(k in desc for k in ["grand angle", "wide", "24mm"]):
            return 24.0
        if any(k in desc for k in ["35mm", "naturaliste"]):
            return 35.0
        if any(k in desc for k in ["télé", "tele", "long", "135mm", "200mm"]):
            return 135.0

        return None  # Utiliser le preset par défaut

    def _apply_voice_adjustments(self, config: CameraConfig, desc: str) -> CameraConfig:
        """Applique des ajustements fins depuis la description verbale."""
        f_stop = config.f_stop

        # Ouverture
        if any(k in desc for k in ["bokeh", "flou", "très ouvert", "ouverture max"]):
            f_stop = 1.4
        elif any(k in desc for k in ["légère profondeur", "léger flou"]):
            f_stop = 2.0
        elif any(k in desc for k in ["net", "tout net", "profondeur totale"]):
            f_stop = 8.0

        return CameraConfig(
            position=config.position,
            rotation=config.rotation,
            lens=config.lens,
            dof_enabled=True,
            f_stop=f_stop,
            focus_dist=config.focus_dist,
            shot_type=config.shot_type,
            sensor_width=config.sensor_width,
        )

    def _offset_position(
        self,
        base_pos: Tuple[float, float, float],
        subject_pos: Tuple[float, float, float],
    ) -> Tuple[float, float, float]:
        """Décale la position de la caméra selon la position du sujet."""
        return (
            base_pos[0] + subject_pos[0],
            base_pos[1] + subject_pos[1],
            base_pos[2] + subject_pos[2] * 0.1,  # légère correction hauteur
        )

    def _compute_focus_distance(
        self,
        cam_pos: Tuple[float, float, float],
        subject_pos: Tuple[float, float, float],
    ) -> float:
        """Calcule la distance de mise au point caméra → sujet."""
        dx = subject_pos[0] - cam_pos[0]
        dy = subject_pos[1] - cam_pos[1]
        dz = subject_pos[2] - cam_pos[2]
        dist = math.sqrt(dx * dx + dy * dy + dz * dz)
        return max(0.3, dist)  # minimum 30cm
