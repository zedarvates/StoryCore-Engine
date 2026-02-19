"""
voice_bridge.py — Pont entre le système vocal et le moteur Blender
===================================================================

Transforme une commande vocale en langage naturel en un SceneJSON
structuré et stable.

Architecture intentionnellement NON-IA :
  → Grammaire figée + règles déterministes
  → Pas de génération libre de code
  → Résultat prévisible et versionnable

Règle d'or : séparer INTERPRÉTATION ARTISTIQUE et EXÉCUTION TECHNIQUE.

Exemples de commandes supportées :
  "Crée une ruelle cyberpunk sous pluie"
  "Caméra basse 35mm légère contre-plongée"
  "Ajoute brouillard volumétrique"
  "Place personnage Alpha à 2 mètres devant caméra"
  "Plan serré sur visage"
  "Fond désert aride avec soleil rasant"
"""

from __future__ import annotations
import re
import uuid
import logging
from typing import Optional, List, Tuple, Dict, Any

from blender_bridge.scene_types import (
    SceneJSON, SceneType, CameraConfig, ShotType,
    CharacterRig, RigType, AtmosphereConfig, AtmosphereType,
    LightingConfig, LightConfig, LightType, PropObject, RenderSettings,
)
from blender_bridge.camera_system import CinematicCameraSystem
from blender_bridge.location_manager import LocationManager

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  GRAMMAIRE DES COMMANDES VOCALES
# ─────────────────────────────────────────────────────────────────────────────

# Mots déclencheurs → type de commande
# Ordre d'importance : vérifier dans cet ordre
_COMMAND_TRIGGERS = {
    "create_scene":     ["crée", "cree", "créer", "créé", "génère", "genere", "nouvelle scène", "new scene"],
    "set_camera":       ["caméra", "camera", "plan", "cadrage", "focale", "angle", "vue"],
    "add_atmosphere":   ["brouillard", "fog", "pluie", "rain", "brume", "fumée", "poussière", "dust", "atmosphère"],
    "place_character":  ["place", "positionne", "ajoute personnage", "personnage", "character"],
    "set_location":     ["fond", "background", "lieu", "décor", "intérieur", "extérieur", "scène"],
    "set_lighting":     ["lumière", "éclairage", "nuit", "jour", "soleil", "ombre", "néon"],
    "render":           ["rends", "render", "génère image", "calcule", "lance rendu"],
}

# Mapping des ambiances vers des paramètres techniques
_ATMOSPHERE_PRESETS = {
    # ── Combinés en PREMIER — priorité max (évite faux positifs sur mots isolés) ──
    "brouillard volumétrique": AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.025, color=(0.7, 0.75, 0.9)),
    "brouillard volumetrique": AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.025, color=(0.7, 0.75, 0.9)),
    "fog volumetrique":        AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.025, color=(0.7, 0.75, 0.9)),
    # ── Simples ──
    "pluie":                AtmosphereConfig(type=AtmosphereType.RAIN,       density=0.03),
    "rain":                 AtmosphereConfig(type=AtmosphereType.RAIN,       density=0.03),
    "volumétrique":         AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.02,  color=(0.7, 0.75, 0.9)),
    "volumetrique":         AtmosphereConfig(type=AtmosphereType.VOLUMETRIC, density=0.02,  color=(0.7, 0.75, 0.9)),
    "brouillard":           AtmosphereConfig(type=AtmosphereType.FOG,        density=0.04),
    "fog":                  AtmosphereConfig(type=AtmosphereType.FOG,        density=0.04),
    "brume":                AtmosphereConfig(type=AtmosphereType.MIST,       density=0.025),
    "mist":                 AtmosphereConfig(type=AtmosphereType.MIST,       density=0.025),
    "fumée":                AtmosphereConfig(type=AtmosphereType.SMOKE,      density=0.05,  color=(0.6, 0.6, 0.6)),
    "fumee":                AtmosphereConfig(type=AtmosphereType.SMOKE,      density=0.05,  color=(0.6, 0.6, 0.6)),
    "poussière":            AtmosphereConfig(type=AtmosphereType.DUST,       density=0.015, color=(0.9, 0.8, 0.6)),
    "poussiere":            AtmosphereConfig(type=AtmosphereType.DUST,       density=0.015, color=(0.9, 0.8, 0.6)),
}

# Mots-clés qualifiant l'intensité de l'atmosphère
_ATMOSPHERE_INTENSITY = {
    "léger": 0.4, "legere": 0.4, "faible": 0.4, "light": 0.4,
    "modéré": 0.7, "modere": 0.7, "medium": 0.7,
    "dense": 1.5, "fort": 1.5, "épais": 1.5, "heavy": 1.5,
    "très dense": 2.5, "tres dense": 2.5,
}


# ─────────────────────────────────────────────────────────────────────────────
#  BRIDGE PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────

class VoiceToSceneBridge:
    """
    Transforme des commandes vocales en langage naturel (FR/EN) en SceneJSON.

    Stratégie : grammaire déterministe + règles explicites
    (PAS de génération libre par LLM pour garantir la stabilité)

    Usage :
        bridge = VoiceToSceneBridge()

        # Commande complète
        scene = bridge.parse("Crée une ruelle cyberpunk sous pluie avec Alpha devant")

        # Modifications successives sur une scène existante
        scene = bridge.apply_command(scene, "Caméra basse 35mm légère contre-plongée")
        scene = bridge.apply_command(scene, "Ajoute brouillard volumétrique")
        scene = bridge.apply_command(scene, "Place Alpha à 2 mètres devant caméra")
    """

    def __init__(self):
        self.camera_sys = CinematicCameraSystem()
        self.location_mgr = LocationManager()

    def parse(self, command: str) -> SceneJSON:
        """
        Parse une commande complète et retourne un SceneJSON.

        Une commande peut contenir plusieurs intentions :
          "Ruelle cyberpunk sous pluie, caméra basse 35mm, Alpha devant"

        Args:
            command : commande vocale en langage naturel

        Returns:
            SceneJSON structuré et complet
        """
        cmd_lower = command.lower().strip()

        # Créer une scène de base
        scene_id = self._extract_scene_id(cmd_lower)
        scene = SceneJSON(
            scene_id=scene_id,
            description=command,
            voice_command=command,
        )

        # Appliquer chaque intention détectée
        scene = self._parse_location(scene, cmd_lower)
        scene = self._parse_atmosphere(scene, cmd_lower)
        scene = self._parse_camera(scene, cmd_lower)
        scene = self._parse_characters(scene, cmd_lower, command)
        scene = self._parse_lighting(scene, cmd_lower)

        # Tags narratifs
        scene.narrative_tags = self._extract_tags(cmd_lower)

        logger.info(f"[VoiceBridge] Commande parsée → scène '{scene.scene_id}'")
        logger.info(f"  Shot type : {scene.camera.shot_type.value}")
        logger.info(f"  Atmosphère: {scene.atmosphere.type.value}")
        logger.info(f"  Personnages: {[c.name for c in scene.characters]}")

        return scene

    def apply_command(self, scene: SceneJSON, command: str) -> SceneJSON:
        """
        Applique une commande modificatrice sur une scène existante.

        Permet de construire une scène de façon incrémentale :
            scene = bridge.parse("Ruelle cyberpunk")
            scene = bridge.apply_command(scene, "Caméra basse 35mm")
            scene = bridge.apply_command(scene, "Brouillard dense")

        Args:
            scene   : scène existante à modifier
            command : commande de modification

        Returns:
            SceneJSON modifié
        """
        cmd_lower = command.lower().strip()
        scene.voice_command = f"{scene.voice_command} | {command}" if scene.voice_command else command

        command_type = self._detect_command_type(cmd_lower)

        if command_type == "set_camera":
            new_cam = self.camera_sys.from_voice_description(cmd_lower)
            scene.camera = new_cam

        elif command_type == "add_atmosphere":
            new_atm = self._parse_atmosphere_from_text(cmd_lower)
            if new_atm:
                scene.atmosphere = new_atm

        elif command_type == "place_character":
            new_chars = self._extract_characters_from_text(cmd_lower, command, scene.camera)
            for char in new_chars:
                # Éviter les doublons
                if not any(c.name == char.name for c in scene.characters):
                    scene.characters.append(char)

        elif command_type == "set_location":
            scene = self._parse_location(scene, cmd_lower)

        elif command_type == "set_lighting":
            scene = self._parse_lighting(scene, cmd_lower)

        elif command_type == "create_scene":
            # Recréer la scène entièrement
            return self.parse(command)

        # Mise à jour des tags
        new_tags = self._extract_tags(cmd_lower)
        for tag in new_tags:
            if tag not in scene.narrative_tags:
                scene.narrative_tags.append(tag)

        return scene

    def to_json(self, scene: SceneJSON) -> str:
        """Sérialise la scène en JSON formaté."""
        return scene.to_json(indent=2)

    # ─── PARSERS INTERNES ────────────────────────────────────────────────────

    def _parse_location(self, scene: SceneJSON, cmd: str) -> SceneJSON:
        """Détecte et applique un preset de lieu."""
        # Chercher un preset correspondant
        preset = self.location_mgr.create_from_narrative(cmd)
        if preset:
            scene = self.location_mgr.apply_to_scene(scene, preset.id)
            return scene

        # Déduire le type de scène (intérieur / extérieur)
        if any(k in cmd for k in ["intérieur", "interieur", "int.", "pièce", "piece", "salle", "bureau", "salon"]):
            scene.scene_type = SceneType.INTERIOR
        elif any(k in cmd for k in ["extérieur", "exterieur", "ext.", "dehors", "rue", "ruelle", "forêt", "plage"]):
            scene.scene_type = SceneType.EXTERIOR

        return scene

    def _parse_atmosphere(self, scene: SceneJSON, cmd: str) -> SceneJSON:
        """Détecte et applique la configuration d'atmosphère."""
        atm = self._parse_atmosphere_from_text(cmd)
        if atm:
            scene.atmosphere = atm
        return scene

    def _parse_atmosphere_from_text(self, cmd: str) -> Optional[AtmosphereConfig]:
        """Extrait la configuration d'atmosphère depuis le texte."""
        # Détecter le type d'atmosphère
        detected_atm = None
        for keyword, preset in _ATMOSPHERE_PRESETS.items():
            if keyword in cmd:
                detected_atm = AtmosphereConfig(
                    type=preset.type,
                    density=preset.density,
                    color=preset.color,
                )
                break

        if not detected_atm:
            return None

        # Ajuster l'intensité
        for intensity_kw, factor in _ATMOSPHERE_INTENSITY.items():
            if intensity_kw in cmd:
                detected_atm.density = detected_atm.density * factor
                break

        return detected_atm

    def _parse_camera(self, scene: SceneJSON, cmd: str) -> SceneJSON:
        """Détecte et applique la configuration caméra."""
        # Vérifier si la commande contient des éléments de caméra
        has_camera_info = any(
            k in cmd for k in [
                "caméra", "camera", "plan", "focale", "mm", "angle",
                "contre-plongée", "plongée", "wide", "close", "serré",
                "gros plan", "over", "épaule", "pov", "basse", "haute",
            ]
        )

        if has_camera_info:
            scene.camera = self.camera_sys.from_voice_description(cmd)

        return scene

    def _parse_characters(
        self,
        scene: SceneJSON,
        cmd_lower: str,
        cmd_original: str,
    ) -> SceneJSON:
        """Détecte et place les personnages dans la scène."""
        chars = self._extract_characters_from_text(cmd_lower, cmd_original, scene.camera)
        scene.characters.extend(chars)
        return scene

    def _extract_characters_from_text(
        self,
        cmd_lower: str,
        cmd_original: str,
        camera: CameraConfig,
    ) -> List[CharacterRig]:
        """Extrait la liste des personnages depuis le texte."""
        from blender_bridge.rig_generator import RigGenerator
        rig_gen = RigGenerator()
        characters = []

        # Pattern : "personnage <Nom>" ou "place <Nom>" ou "place personnage <Nom>"
        patterns = [
            r"personnage\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_-]*)",
            r"character\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_-]*)",
            r"place\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_-]*)",
            r"positionne\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9_-]*)",
        ]

        # Mots communs à exclure (ne sont pas des noms de personnages)
        _STOP_NAMES = {
            "le", "la", "les", "un", "une", "des", "devant", "derrière", "à",
            "personnage", "character", "caméra", "camera", "mètre", "metre",
            "avant", "après", "apres", "gauche", "droite", "centre", "center",
        }

        found_names = set()
        for pattern in patterns:
            for match in re.finditer(pattern, cmd_lower, re.IGNORECASE):
                name = match.group(1).capitalize()
                if name.lower() not in _STOP_NAMES:
                    found_names.add(name)

        # Pattern : "Alpha à 2 mètres devant" (nom en majuscule suivi d'une distance)
        # Supporte les accents (à) et sans accent (a) pour la robustesse vocale
        distance_pattern = r"([A-Z][a-zA-ZÀ-ÿ0-9]+)\s+[àa]\s+([\d.,]+)\s*m(?:[èe]tre)?s?\s+(?:devant|avant)"
        for match in re.finditer(distance_pattern, cmd_original):
            name = match.group(1)
            distance = float(match.group(2).replace(",", "."))
            found_names.discard(name)  # Éviter le doublon

            rig = rig_gen.place_at_distance(
                character_name=name,
                camera_config=camera,
                distance_from_camera=distance,
            )
            characters.append(rig)

        # Créer les rigs pour les noms simples
        for name in found_names:
            rig = rig_gen.create_rig(name=name, position=(0.0, 0.0, 0.0))
            characters.append(rig)

        return characters

    def _parse_lighting(self, scene: SceneJSON, cmd: str) -> SceneJSON:
        """Détecte et applique des modifications d'éclairage."""
        # Si déjà géré par un preset, ne pas écraser
        if scene.location_preset_id:
            return scene

        # Modifier la couleur du monde selon l'ambiance
        if any(k in cmd for k in ["nuit", "night", "sombre", "dark", "nocturne"]):
            scene.lighting.world_color = (0.01, 0.01, 0.03)
            scene.lighting.world_strength = 0.2
        elif any(k in cmd for k in ["aube", "lever", "dawn", "crépuscule", "crepuscule", "dusk"]):
            scene.lighting.world_color = (0.6, 0.4, 0.3)
            scene.lighting.world_strength = 0.8
        elif any(k in cmd for k in ["midi", "soleil", "sun", "ensoleillé", "ensoleille", "bright"]):
            scene.lighting.world_color = (0.7, 0.8, 1.0)
            scene.lighting.world_strength = 1.5
        elif any(k in cmd for k in ["coucher", "sunset", "orange", "rouge"]):
            scene.lighting.world_color = (0.8, 0.4, 0.2)
            scene.lighting.world_strength = 1.0

        # Néons
        if any(k in cmd for k in ["néon", "neon", "cyberpunk"]):
            # Néons déjà gérés par le preset cyberpunk
            pass

        return scene

    def _detect_command_type(self, cmd: str) -> str:
        """Détecte le type principal d'une commande."""
        best_type = "unknown"
        best_score = 0

        for cmd_type, triggers in _COMMAND_TRIGGERS.items():
            score = sum(1 for t in triggers if t in cmd)
            if score > best_score:
                best_score = score
                best_type = cmd_type

        return best_type

    def _extract_scene_id(self, cmd: str) -> str:
        """Génère un ID de scène depuis la commande."""
        # Supprimer les mots courants pour ne garder que les mots-clés
        stop_words = {
            "crée", "cree", "une", "un", "de", "la", "le", "les", "avec", "sous",
            "dans", "sur", "et", "ou", "pour", "par", "à", "en", "au", "aux",
            "nouvelle", "scène", "scene", "génère", "genere", "creer"
        }
        words = cmd.split()
        key_words = [
            w.strip(".,!?;:")
            for w in words
            if w not in stop_words and len(w) > 2
        ][:4]  # Garder les 4 premiers mots-clés

        if key_words:
            scene_id = "_".join(key_words[:3])
        else:
            scene_id = f"scene_{uuid.uuid4().hex[:8]}"

        # Nettoyer pour un ID valide
        scene_id = re.sub(r"[^a-zA-Z0-9_]", "_", scene_id).lower()
        return scene_id[:50]  # Limiter la longueur

    def _extract_tags(self, cmd: str) -> List[str]:
        """Extrait des tags narratifs depuis la commande."""
        tags = []
        tag_keywords = {
            "cyberpunk": ["cyberpunk", "cyber", "néon", "neon", "dystopie"],
            "nature":    ["forêt", "foret", "nature", "arbre", "bois"],
            "urban":     ["urbain", "ville", "rue", "ruelle"],
            "night":     ["nuit", "night", "nocturne", "sombre"],
            "rain":      ["pluie", "rain", "pluie", "mouillé"],
            "fog":       ["brume", "brouillard", "fog", "mist"],
            "interior":  ["intérieur", "bureau", "salle", "pièce"],
            "exterior":  ["extérieur", "dehors", "rue"],
            "dramatic":  ["dramatique", "intense", "tension"],
            "cinematic": ["cinéma", "cinema", "film", "cinématique"],
        }

        for tag, keywords in tag_keywords.items():
            if any(kw in cmd for kw in keywords):
                tags.append(tag)

        return tags


# ─────────────────────────────────────────────────────────────────────────────
#  FONCTION UTILITAIRE RAPIDE
# ─────────────────────────────────────────────────────────────────────────────

def voice_to_scene(command: str) -> SceneJSON:
    """
    Raccourci : commande vocale → SceneJSON.

    Exemple :
        scene = voice_to_scene("Crée une ruelle cyberpunk sous pluie avec Alpha devant")
        print(scene.to_json())
    """
    bridge = VoiceToSceneBridge()
    return bridge.parse(command)


def voice_to_json(command: str) -> str:
    """
    Raccourci : commande vocale → JSON string.

    Exemple :
        json_str = voice_to_json("Ruelle cyberpunk 35mm contre-plongée")
        print(json_str)
    """
    return voice_to_scene(command).to_json()
