"""
object_registry.py — Registre central des objets d'histoire
============================================================

Gère la persistance et la recherche de TOUS les StoryObject d'un projet.

Structure sur disque :
  projects/<project_id>/objects/
    ├── epee_alpha.json
    ├── manteau_alpha.json
    ├── lanterne_beta.json
    └── ...

Un objet peut aussi être "global" (partagé entre projets) :
  projects/global/objects/<id>.json

Usage :
    registry = StoryObjectRegistry(project_id="cyberpunk_001")

    # Ajouter
    registry.register(epee)

    # Chercher
    obj = registry.get("epee_alpha")
    weapons = registry.find_by_type("weapon")
    alpha_items = registry.find_by_owner("Alpha")

    # Inventaire complet d'un personnage
    inventory = registry.get_inventory("Alpha")
"""

from __future__ import annotations
import json
import logging
from pathlib import Path
from typing import Optional, List, Dict

from story_assets.story_object import StoryObject
from story_assets.character_inventory import CharacterInventory

logger = logging.getLogger(__name__)


class StoryObjectRegistry:
    """
    Registre central des objets d'histoire pour un projet.

    Responsabilités :
    - Créer, lire, mettre à jour, supprimer les StoryObject
    - Indexer les objets par ID, propriétaire, type, tag
    - Construire les inventaires des personnages
    - Exposer les objets au système Blender pour injection dans les scènes
    """

    def __init__(
        self,
        project_id: Optional[str] = None,
        projects_dir: str = "./projects",
    ):
        self.project_id = project_id
        self.projects_dir = Path(projects_dir)
        self._objects: Dict[str, StoryObject] = {}
        self._load_all()

    # ─── API PRINCIPALE ──────────────────────────────────────────────────────

    def register(self, obj: StoryObject) -> StoryObject:
        """
        Enregistre un objet dans le registre et le sauvegarde sur disque.

        Si l'objet existe déjà (même ID), il est mis à jour.

        Returns:
            Le StoryObject enregistré
        """
        if self.project_id:
            obj.project_id = self.project_id
        self._objects[obj.id] = obj
        self._save_object(obj)
        logger.info(f"[Registry] Enregistré : {obj}")
        return obj

    def get(self, object_id: str) -> Optional[StoryObject]:
        """Retourne un objet par son ID."""
        return self._objects.get(object_id)

    def get_or_raise(self, object_id: str) -> StoryObject:
        """Retourne un objet par son ID ou lève ValueError."""
        obj = self.get(object_id)
        if not obj:
            raise ValueError(f"Objet introuvable : '{object_id}'")
        return obj

    def delete(self, object_id: str) -> bool:
        """Supprime un objet du registre et du disque. Retourne True si trouvé."""
        if object_id not in self._objects:
            return False
        obj = self._objects.pop(object_id)
        path = self._object_path(obj.id)
        if path.exists():
            path.unlink()
        logger.info(f"[Registry] Supprimé : {obj.id}")
        return True

    def update(self, obj: StoryObject) -> StoryObject:
        """Met à jour un objet existant."""
        return self.register(obj)

    def all_objects(self) -> List[StoryObject]:
        """Retourne tous les objets enregistrés."""
        return list(self._objects.values())

    # ─── RECHERCHE ────────────────────────────────────────────────────────────

    def find_by_owner(self, character_name: str) -> List[StoryObject]:
        """Retourne tous les objets appartenant à un personnage."""
        return [o for o in self._objects.values() if o.owner == character_name]

    def find_by_type(self, object_type: str) -> List[StoryObject]:
        """Retourne tous les objets d'un type donné."""
        return [o for o in self._objects.values() if o.object_type == object_type]

    def find_by_tags(self, tags: List[str]) -> List[StoryObject]:
        """Retourne les objets contenant TOUS les tags demandés."""
        return [o for o in self._objects.values() if all(t in o.tags for t in tags)]

    def find_by_name(self, name: str) -> Optional[StoryObject]:
        """Recherche par nom (insensible à la casse)."""
        name_lower = name.lower()
        return next(
            (o for o in self._objects.values() if o.name.lower() == name_lower),
            None,
        )

    def search(self, query: str) -> List[StoryObject]:
        """
        Recherche textuelle dans ID, nom, description, tags.
        Insensible à la casse et aux accents.
        Retourne les objets les plus pertinents en premier.
        """
        import unicodedata

        def _norm(s: str) -> str:
            """Supprime les accents et met en minuscules."""
            return unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode("ascii")

        q = _norm(query)
        results = []
        for obj in self._objects.values():
            score = 0
            if q in _norm(obj.id):
                score += 4      # ID exact → priorité max
            if q in _norm(obj.name):
                score += 3
            if q in _norm(obj.description):
                score += 2
            if any(q in _norm(tag) for tag in obj.tags):
                score += 1
            if _norm(obj.object_type) == q:
                score += 2
            if score > 0:
                results.append((score, obj))
        results.sort(key=lambda x: x[0], reverse=True)
        return [obj for _, obj in results]

    # ─── INVENTAIRES ─────────────────────────────────────────────────────────

    def get_inventory(self, character_name: str) -> CharacterInventory:
        """
        Construit l'inventaire d'un personnage depuis les objets enregistrés.

        Charge aussi l'inventaire persisté (slots équipés).
        """
        # Charger les slots équipés depuis le disque
        inv = CharacterInventory.load(
            character_name=character_name,
            project_id=self.project_id,
            projects_dir=str(self.projects_dir),
        )

        # Synchroniser avec le registre (objets manquants → ajoutés)
        registry_items = self.find_by_owner(character_name)
        registered_ids = {i.id for i in inv.items}
        for obj in registry_items:
            if obj.id not in registered_ids:
                inv.items.append(obj)

        return inv

    def all_characters(self) -> List[str]:
        """Retourne la liste des personnages ayant des objets."""
        owners = {o.owner for o in self._objects.values() if o.owner}
        return sorted(owners)

    def objects_in_scene(self, scene_tags: List[str] = None) -> List[StoryObject]:
        """
        Retourne les objets pertinents pour une scène (par tags narratifs).

        Args:
            scene_tags : tags de la scène (ex: ["cyberpunk", "ruelle"])

        Returns:
            Objets dont les tags chevauchent ceux de la scène
        """
        if not scene_tags:
            return self.all_objects()

        scene_set = set(scene_tags)
        return [
            obj for obj in self._objects.values()
            if scene_set.intersection(set(obj.tags))
        ]

    # ─── PERSISTANCE ─────────────────────────────────────────────────────────

    @property
    def _objects_dir(self) -> Path:
        if self.project_id:
            return self.projects_dir / self.project_id / "objects"
        return self.projects_dir / "global" / "objects"

    def _object_path(self, object_id: str) -> Path:
        return self._objects_dir / f"{object_id}.json"

    def _save_object(self, obj: StoryObject) -> None:
        self._objects_dir.mkdir(parents=True, exist_ok=True)
        path = self._object_path(obj.id)
        with open(path, "w", encoding="utf-8") as f:
            f.write(obj.to_json())

    def _load_all(self) -> None:
        """Charge tous les objets depuis le disque au démarrage."""
        if not self._objects_dir.exists():
            return
        for json_file in self._objects_dir.glob("*.json"):
            try:
                obj = StoryObject.from_file(str(json_file))
                self._objects[obj.id] = obj
            except Exception as e:
                logger.warning(f"[Registry] Erreur chargement {json_file}: {e}")
        logger.debug(f"[Registry] {len(self._objects)} objet(s) chargé(s)")

    def reload(self) -> int:
        """Recharge depuis le disque. Retourne le nombre d'objets."""
        self._objects.clear()
        self._load_all()
        return len(self._objects)

    def export_manifest(self, output_path: Optional[str] = None) -> str:
        """
        Exporte la liste complète des objets en JSON.
        Utile pour debug, versioning, et synchronisation.
        """
        manifest = {
            "project_id": self.project_id,
            "total_objects": len(self._objects),
            "characters": self.all_characters(),
            "objects": [obj.to_dict() for obj in self._objects.values()],
        }
        if output_path is None:
            output_path = str(self._objects_dir / "manifest.json")
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)
        logger.info(f"[Registry] Manifest exporté : {output_path}")
        return output_path

    def __len__(self) -> int:
        return len(self._objects)

    def __repr__(self) -> str:
        return f"StoryObjectRegistry(project={self.project_id}, {len(self._objects)} objects)"
