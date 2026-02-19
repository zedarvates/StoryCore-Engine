"""
location_manager.py — Gestionnaire de lieux et presets de scènes
================================================================

Gère les presets de lieux réutilisables entre projets.
Structure : Scene → Location → Props → Lighting → Atmosphere

Compatible avec le système de lieux existant (backend/location_api.py)
en ajoutant la couche 3D Blender.

Fichiers de stockage : blender_bridge/presets/locations/
"""

from __future__ import annotations
import json
import uuid
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime

from blender_bridge.scene_types import (
    LocationPreset, SceneType, LightingConfig, LightConfig,
    AtmosphereConfig, AtmosphereType, LightType, PropObject, SceneJSON,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  PRESETS INTÉGRÉS (livrés avec BlenderBridge)
# ─────────────────────────────────────────────────────────────────────────────

def _make_builtin_presets() -> Dict[str, LocationPreset]:
    """Crée les presets de lieux prédéfinis."""
    presets = {}

    # ── Ruelle cyberpunk ────────────────────────────────────────────────────
    presets["ruelle_cyberpunk"] = LocationPreset(
        id="ruelle_cyberpunk",
        name="Ruelle Cyberpunk",
        description="Ruelle urbaine sombre, ambiance néon, cyberpunk nocturne",
        scene_type=SceneType.EXTERIOR,
        tags=["cyberpunk", "urban", "night", "neon", "rain"],
        props=[
            PropObject(name="Container_L", position=(-3.0, 2.0, 0.0), scale=(1.0, 1.0, 1.0)),
            PropObject(name="Container_R", position=(3.0, 4.0, 0.0), scale=(1.0, 1.0, 1.0)),
            PropObject(name="Debris_Ground", position=(1.0, 1.5, 0.0), scale=(0.5, 0.5, 0.3)),
        ],
        lighting=LightingConfig(
            lights=[
                LightConfig(
                    name="Neon_Blue",
                    light_type=LightType.AREA,
                    position=(-2.0, 3.0, 3.5),
                    rotation=(90.0, 0.0, 0.0),
                    color=(0.2, 0.4, 1.0),
                    energy=15.0,
                    size=2.0,
                ),
                LightConfig(
                    name="Neon_Red",
                    light_type=LightType.AREA,
                    position=(2.5, 5.0, 3.0),
                    rotation=(90.0, 0.0, 0.0),
                    color=(1.0, 0.15, 0.2),
                    energy=10.0,
                    size=1.5,
                ),
                LightConfig(
                    name="Street_Lamp",
                    light_type=LightType.POINT,
                    position=(0.0, 0.0, 4.5),
                    rotation=(0.0, 0.0, 0.0),
                    color=(1.0, 0.85, 0.5),
                    energy=8.0,
                ),
            ],
            world_color=(0.01, 0.01, 0.03),
            world_strength=0.3,
        ),
        atmosphere=AtmosphereConfig(
            type=AtmosphereType.VOLUMETRIC,
            density=0.025,
            color=(0.3, 0.4, 0.8),
            anisotropy=0.2,
        ),
    )

    # ── Forêt brumeuse ────────────────────────────────────────────────────
    presets["foret_brumeuse"] = LocationPreset(
        id="foret_brumeuse",
        name="Forêt Brumeuse",
        description="Forêt dense avec brouillard au sol, ambiance mystérieuse",
        scene_type=SceneType.EXTERIOR,
        tags=["forest", "fog", "nature", "mystery", "dawn"],
        props=[],
        lighting=LightingConfig(
            lights=[
                LightConfig(
                    name="Dawn_Sun",
                    light_type=LightType.SUN,
                    position=(10.0, -5.0, 8.0),
                    rotation=(70.0, 0.0, 30.0),
                    color=(1.0, 0.85, 0.65),
                    energy=2.0,
                ),
                LightConfig(
                    name="Fill_Sky",
                    light_type=LightType.HEMI,
                    position=(0.0, 0.0, 10.0),
                    rotation=(0.0, 0.0, 0.0),
                    color=(0.6, 0.75, 0.9),
                    energy=1.5,
                ),
            ],
            world_color=(0.4, 0.5, 0.6),
            world_strength=0.8,
        ),
        atmosphere=AtmosphereConfig(
            type=AtmosphereType.MIST,
            density=0.04,
            color=(0.85, 0.9, 0.95),
            height_falloff=0.8,
        ),
    )

    # ── Bureau sombre ────────────────────────────────────────────────────
    presets["bureau_sombre"] = LocationPreset(
        id="bureau_sombre",
        name="Bureau Sombre",
        description="Bureau de détective ou de directeur, lumière d'ambiance dramatique",
        scene_type=SceneType.INTERIOR,
        tags=["interior", "office", "dark", "noir", "dramatic"],
        props=[
            PropObject(name="Desk", position=(0.0, 2.0, 0.0), scale=(1.5, 0.7, 0.8)),
            PropObject(name="Chair", position=(0.0, 1.0, 0.0), scale=(0.7, 0.7, 1.0)),
            PropObject(name="Lamp_Desk", position=(0.5, 2.0, 0.8)),
        ],
        lighting=LightingConfig(
            lights=[
                LightConfig(
                    name="Desk_Lamp",
                    light_type=LightType.SPOT,
                    position=(0.5, 2.0, 1.5),
                    rotation=(140.0, 0.0, 0.0),
                    color=(1.0, 0.9, 0.7),
                    energy=20.0,
                    size=0.3,
                ),
                LightConfig(
                    name="Window_Light",
                    light_type=LightType.AREA,
                    position=(-4.0, 0.0, 2.5),
                    rotation=(90.0, 0.0, 90.0),
                    color=(0.7, 0.8, 1.0),
                    energy=5.0,
                    size=3.0,
                ),
            ],
            world_color=(0.02, 0.02, 0.02),
            world_strength=0.1,
        ),
        atmosphere=AtmosphereConfig(
            type=AtmosphereType.FOG,
            density=0.015,
            color=(0.9, 0.85, 0.75),
        ),
    )

    # ── Studio neutre ──────────────────────────────────────────────────
    presets["studio_neutre"] = LocationPreset(
        id="studio_neutre",
        name="Studio Neutre",
        description="Studio de prise de vue neutre, éclairage trois points classique",
        scene_type=SceneType.INTERIOR,
        tags=["studio", "neutral", "clean", "portrait"],
        props=[],
        lighting=LightingConfig(
            lights=[
                LightConfig(
                    name="Key_Light",
                    light_type=LightType.AREA,
                    position=(3.0, -2.0, 3.0),
                    rotation=(55.0, 0.0, 45.0),
                    color=(1.0, 0.98, 0.95),
                    energy=30.0,
                    size=2.0,
                ),
                LightConfig(
                    name="Fill_Light",
                    light_type=LightType.AREA,
                    position=(-3.0, -1.0, 2.0),
                    rotation=(60.0, 0.0, -30.0),
                    color=(0.8, 0.85, 1.0),
                    energy=10.0,
                    size=3.0,
                ),
                LightConfig(
                    name="Rim_Light",
                    light_type=LightType.AREA,
                    position=(0.0, 3.0, 3.5),
                    rotation=(130.0, 0.0, 0.0),
                    color=(1.0, 1.0, 1.0),
                    energy=15.0,
                    size=1.0,
                ),
            ],
            world_color=(0.8, 0.8, 0.8),
            world_strength=0.5,
        ),
        atmosphere=AtmosphereConfig(type=AtmosphereType.NONE),
    )

    # ── Désert ────────────────────────────────────────────────────────
    presets["desert"] = LocationPreset(
        id="desert",
        name="Désert",
        description="Désert aride sous soleil intense, horizon dégagé",
        scene_type=SceneType.EXTERIOR,
        tags=["desert", "outdoor", "sun", "hot", "western"],
        props=[],
        lighting=LightingConfig(
            lights=[
                LightConfig(
                    name="Desert_Sun",
                    light_type=LightType.SUN,
                    position=(5.0, -3.0, 10.0),
                    rotation=(30.0, 0.0, 20.0),
                    color=(1.0, 0.97, 0.85),
                    energy=8.0,
                ),
            ],
            world_color=(0.85, 0.75, 0.55),
            world_strength=1.2,
        ),
        atmosphere=AtmosphereConfig(
            type=AtmosphereType.DUST,
            density=0.008,
            color=(0.9, 0.8, 0.6),
        ),
    )

    return presets


# ─────────────────────────────────────────────────────────────────────────────
#  GESTIONNAIRE DE LIEUX
# ─────────────────────────────────────────────────────────────────────────────

class LocationManager:
    """
    Gère les presets de lieux pour les scènes Blender.

    Fonctions :
    - Charger/sauvegarder des presets JSON
    - Rechercher par tag, nom, type de scène
    - Appliquer un preset à un SceneJSON existant
    - Importer depuis le système de lieux existant (location_api.py)
    """

    def __init__(self, presets_dir: str = "./blender_bridge/presets/locations"):
        self.presets_dir = Path(presets_dir)
        self.presets_dir.mkdir(parents=True, exist_ok=True)

        # Chargement des presets : builtins d'abord, puis fichiers JSON
        self._presets: Dict[str, LocationPreset] = _make_builtin_presets()
        self._load_from_disk()

    # ─── API PUBLIQUE ────────────────────────────────────────────────────────

    def get(self, preset_id: str) -> Optional[LocationPreset]:
        """Retourne un preset par son ID."""
        return self._presets.get(preset_id)

    def list_all(self) -> List[LocationPreset]:
        """Retourne tous les presets disponibles."""
        return list(self._presets.values())

    def search(
        self,
        query: str = "",
        scene_type: Optional[SceneType] = None,
        tags: Optional[List[str]] = None,
    ) -> List[LocationPreset]:
        """
        Recherche des presets par texte, type de scène ou tags.

        Args:
            query      : terme de recherche (nom, description)
            scene_type : filtre par type (EXTERIOR / INTERIOR)
            tags       : filtre par tags (correspond si AU MOINS un tag)

        Returns:
            Liste de presets correspondants
        """
        results = list(self._presets.values())

        if query:
            q = query.lower()
            results = [
                p for p in results
                if q in p.name.lower() or q in p.description.lower() or q in p.id.lower()
            ]

        if scene_type is not None:
            results = [p for p in results if p.scene_type == scene_type]

        if tags:
            tags_lower = [t.lower() for t in tags]
            results = [
                p for p in results
                if any(t in [pt.lower() for pt in p.tags] for t in tags_lower)
            ]

        return results

    def save_preset(self, preset: LocationPreset) -> str:
        """
        Sauvegarde un preset sur disque.

        Returns:
            Chemin du fichier JSON créé
        """
        if not preset.id:
            preset.id = str(uuid.uuid4())
        if not preset.created_at:
            preset.created_at = datetime.utcnow().isoformat()

        self._presets[preset.id] = preset

        path = self.presets_dir / f"{preset.id}.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(preset.to_dict(), f, indent=2, ensure_ascii=False)

        logger.info(f"[LocationManager] Preset sauvegardé : {preset.id} → {path}")
        return str(path)

    def delete_preset(self, preset_id: str) -> bool:
        """Supprime un preset (seulement les presets utilisateur, pas les builtins)."""
        builtin_ids = set(_make_builtin_presets().keys())
        if preset_id in builtin_ids:
            logger.warning(f"[LocationManager] Impossible de supprimer le preset builtin : {preset_id}")
            return False

        if preset_id in self._presets:
            del self._presets[preset_id]

        path = self.presets_dir / f"{preset_id}.json"
        if path.exists():
            path.unlink()
            logger.info(f"[LocationManager] Preset supprimé : {preset_id}")
            return True

        return False

    def apply_to_scene(self, scene: SceneJSON, preset_id: str) -> SceneJSON:
        """
        Applique un preset de lieu à un SceneJSON existant.

        Le preset remplace : lighting, atmosphere, props de base
        Il PRÉSERVE : camera, characters, render settings

        Args:
            scene     : SceneJSON existant à modifier
            preset_id : ID du preset à appliquer

        Returns:
            SceneJSON avec le preset appliqué
        """
        preset = self.get(preset_id)
        if not preset:
            logger.warning(f"[LocationManager] Preset introuvable : {preset_id}")
            return scene

        # Appliquer le type de scène
        scene.scene_type = preset.scene_type

        # Appliquer l'éclairage
        if preset.lighting:
            scene.lighting = preset.lighting

        # Appliquer l'atmosphère
        if preset.atmosphere:
            scene.atmosphere = preset.atmosphere

        # Ajouter les props du preset (sans dupliquer)
        existing_names = {p.name for p in scene.props}
        for prop in preset.props:
            if prop.name not in existing_names:
                scene.props.append(prop)

        # Enregistrer la référence au preset
        scene.location_preset_id = preset_id

        logger.info(f"[LocationManager] Preset '{preset_id}' appliqué à la scène '{scene.scene_id}'")
        return scene

    def create_from_narrative(self, description: str) -> Optional[LocationPreset]:
        """
        Tente de trouver le preset le plus adapté à une description narrative.

        Exemples :
            "ruelle cyberpunk sous pluie" → ruelle_cyberpunk
            "forêt brumeuse au lever du jour" → foret_brumeuse
            "bureau sombre de détective" → bureau_sombre

        Returns:
            LocationPreset correspondant ou None
        """
        desc_lower = description.lower()

        # Mapping de mots-clés → preset IDs
        keyword_map = {
            "ruelle_cyberpunk":  ["ruelle", "cyberpunk", "néon", "neon", "urbain", "urban", "dystop"],
            "foret_brumeuse":    ["forêt", "foret", "brume", "brouillard", "fog", "arbre", "nature", "bois"],
            "bureau_sombre":     ["bureau", "office", "détective", "detective", "noir", "sombre"],
            "studio_neutre":     ["studio", "neutre", "fond blanc", "portrait", "clean"],
            "desert":            ["désert", "desert", "sable", "aride", "western", "dune"],
        }

        best_match = None
        best_score = 0

        for preset_id, keywords in keyword_map.items():
            score = sum(1 for kw in keywords if kw in desc_lower)
            if score > best_score:
                best_score = score
                best_match = preset_id

        if best_match and best_score > 0:
            return self.get(best_match)

        return None

    def import_from_location_api(self, location_data: Dict[str, Any]) -> LocationPreset:
        """
        Importe un lieu depuis le format du système existant (location_api.py).

        Permet de convertir un lieu narratif en preset Blender 3D.

        Args:
            location_data : dict LocationResponse de l'API backend existante

        Returns:
            LocationPreset compatible BlenderBridge
        """
        loc_id = location_data.get("id", str(uuid.uuid4()))
        name = location_data.get("name", "Lieu importé")
        description = location_data.get("description", "")
        atmosphere_str = location_data.get("atmosphere", "")
        loc_type = location_data.get("location_type", "generic")

        # Déduire le type de scène
        scene_type = SceneType.INTERIOR if "intérieur" in loc_type.lower() else SceneType.EXTERIOR

        # Créer un preset basique depuis les métadonnées
        preset = LocationPreset(
            id=f"imported_{loc_id[:8]}",
            name=name,
            description=description,
            scene_type=scene_type,
            tags=[loc_type, "imported"],
            created_at=location_data.get("created_at", datetime.utcnow().isoformat()),
        )

        # Tenter d'appliquer un preset builtin similaire si disponible
        similar = self.create_from_narrative(f"{name} {description} {atmosphere_str}")
        if similar:
            preset.lighting = similar.lighting
            preset.atmosphere = similar.atmosphere
            preset.props = similar.props

        return preset

    def export_to_dict(self) -> Dict[str, Any]:
        """Exporte tous les presets utilisateur en dictionnaire."""
        builtin_ids = set(_make_builtin_presets().keys())
        user_presets = {
            pid: preset.to_dict()
            for pid, preset in self._presets.items()
            if pid not in builtin_ids
        }
        return {
            "builtin_count": len(builtin_ids),
            "user_count": len(user_presets),
            "user_presets": user_presets,
        }

    # ─── PRIVÉ ──────────────────────────────────────────────────────────────

    def _load_from_disk(self) -> None:
        """Charge les presets utilisateur depuis le dossier de presets."""
        count = 0
        for json_file in self.presets_dir.glob("*.json"):
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                preset = LocationPreset.from_dict(data)
                # Les presets disque ont la priorité sur les builtins uniquement
                # si leur ID ne correspond pas à un builtin
                if preset.id not in _make_builtin_presets():
                    self._presets[preset.id] = preset
                    count += 1
            except Exception as e:
                logger.warning(f"[LocationManager] Impossible de charger {json_file}: {e}")

        if count:
            logger.info(f"[LocationManager] {count} preset(s) utilisateur chargé(s)")
