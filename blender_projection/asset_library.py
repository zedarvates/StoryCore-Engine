"""
asset_library.py — Catalogue d'assets 3D et sprites 2D pour la plantation procédurale
=======================================================================================

Deux types d'assets supportés :

  MESH_3D   : objet 3D complet (généré procéduralement en Python Blender
               ou importé depuis un fichier .blend/.obj/.fbx)

  SPRITE_2D : plan plat (billboard) avec texture PNG/EXR —
               le plan regarde toujours la caméra (Track To Constraint).
               Parfait pour les assets de fond sans besoin de géométrie
               complète : feuillages lointains, herbe, effets atmosphériques.

Catalogue intégré :
  TREES     : conifère, feuilu, palmier, arbre mort
  ROCKS     : rocher isolé, groupe de pierres, falaise
  PLANTS    : buisson, herbes hautes, fougère, cactus
  FOLIAGE   : lierre, mousse, fleurs de sol
  PROPS     : lampadaire, caisse, baril, barrière
  SPRITES   : herbe sprite, feuillage distant, nuage billboard

Usage (dans un script Blender) :
    from asset_library import AssetLibrary, AssetType, AssetCategory

    lib = AssetLibrary()
    assets = lib.get_by_category(AssetCategory.ROCKS)
    for asset in assets:
        print(asset.name, asset.asset_type.value)
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Tuple


# ─────────────────────────────────────────────────────────────────────────────
#  ENUMS
# ─────────────────────────────────────────────────────────────────────────────

class AssetType(Enum):
    MESH_3D   = "mesh_3d"    # géométrie 3D complète, générée ou importée
    SPRITE_2D = "sprite_2d"  # plan billboard toujours face caméra


class AssetCategory(Enum):
    TREES   = "trees"
    ROCKS   = "rocks"
    PLANTS  = "plants"
    FOLIAGE = "foliage"
    PROPS   = "props"
    SPRITES = "sprites"


class SceneContext(Enum):
    EXTERIOR = "exterior"
    INTERIOR = "interior"
    BOTH     = "both"


# ─────────────────────────────────────────────────────────────────────────────
#  STRUCTURE D'UN ASSET
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class AssetDef:
    """
    Définition d'un asset de la bibliothèque.

    Attributes :
        id           : identifiant unique (snake_case)
        name         : nom lisible
        category     : catégorie (TREES, ROCKS, etc.)
        asset_type   : MESH_3D ou SPRITE_2D
        context      : EXTERIOR / INTERIOR / BOTH
        source       : "procedural" (généré par Blender Python)
                       ou chemin relatif vers un fichier asset
        scale_range  : (min, max) variation d'échelle lors du placement
        rot_y_range  : (min°, max°) variation de rotation Y aléatoire
        height_offset: décalage Z par rapport au sol (négatif = enterré)
        cast_shadow  : projette une ombre
        receive_shadow: reçoit les ombres
        tags         : mots-clés narratifs pour le placement automatique
        description  : description courte
    """
    id:             str
    name:           str
    category:       AssetCategory
    asset_type:     AssetType
    context:        SceneContext = SceneContext.EXTERIOR
    source:         str = "procedural"
    scale_range:    Tuple[float, float] = (0.85, 1.15)
    rot_y_range:    Tuple[float, float] = (0.0, 360.0)
    height_offset:  float = 0.0
    cast_shadow:    bool = True
    receive_shadow: bool = True
    tags:           List[str] = field(default_factory=list)
    description:    str = ""


# ─────────────────────────────────────────────────────────────────────────────
#  CATALOGUE INTÉGRÉ
# ─────────────────────────────────────────────────────────────────────────────

_CATALOG: List[AssetDef] = [

    # ── ARBRES (3D) ──────────────────────────────────────────────────────────
    AssetDef(
        id="tree_conifer",
        name="Conifère",
        category=AssetCategory.TREES,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.8, 1.4),
        rot_y_range=(0.0, 360.0),
        tags=["conifere", "pin", "sapin", "foret", "montagne", "nordique"],
        description="Arbre conifère généré procéduralement (pin, sapin)",
    ),
    AssetDef(
        id="tree_deciduous",
        name="Feuilu",
        category=AssetCategory.TREES,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.9, 1.6),
        rot_y_range=(0.0, 360.0),
        tags=["feuilu", "arbre", "foret", "printemps", "ete"],
        description="Arbre à feuilles caduques généré procéduralement",
    ),
    AssetDef(
        id="tree_palm",
        name="Palmier",
        category=AssetCategory.TREES,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.7, 1.3),
        rot_y_range=(0.0, 360.0),
        tags=["palmier", "tropical", "plage", "desert", "exotique"],
        description="Palmier procédural",
    ),
    AssetDef(
        id="tree_dead",
        name="Arbre mort",
        category=AssetCategory.TREES,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.6, 1.2),
        rot_y_range=(0.0, 360.0),
        tags=["mort", "fantome", "hiver", "post-apo", "desert", "sombre"],
        description="Arbre mort sans feuilles, ambiance dramatique",
    ),
    AssetDef(
        id="tree_willow",
        name="Saule pleureur",
        category=AssetCategory.TREES,
        asset_type=AssetType.MESH_3D,
        scale_range=(1.0, 1.8),
        rot_y_range=(0.0, 360.0),
        tags=["saule", "pleureur", "eau", "melancolie", "brume"],
        description="Saule pleureur avec branches tombantes",
    ),

    # ── ARBRES SPRITES (2D billboard — fond lointain) ──────────────────────
    AssetDef(
        id="sprite_tree_forest",
        name="Forêt lointaine (sprite)",
        category=AssetCategory.SPRITES,
        asset_type=AssetType.SPRITE_2D,
        scale_range=(1.5, 3.0),
        rot_y_range=(0.0, 0.0),          # sprite : pas de rotation Y
        tags=["foret", "fond", "lointain", "distance"],
        description="Sprite billboard forêt dense pour fond de scène",
    ),

    # ── ROCHERS (3D) ─────────────────────────────────────────────────────────
    AssetDef(
        id="rock_medium",
        name="Rocher moyen",
        category=AssetCategory.ROCKS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.4, 1.2),
        rot_y_range=(0.0, 360.0),
        height_offset=-0.1,
        tags=["rocher", "pierre", "montagne", "desert", "cave"],
        description="Rocher générique généré par subdivision + displacement",
    ),
    AssetDef(
        id="rock_boulder",
        name="Gros rocher",
        category=AssetCategory.ROCKS,
        asset_type=AssetType.MESH_3D,
        scale_range=(1.2, 3.0),
        rot_y_range=(0.0, 360.0),
        height_offset=-0.3,
        tags=["rocher", "boulder", "massif", "falaise"],
        description="Gros bloc rocheux dominant",
    ),
    AssetDef(
        id="rock_cluster",
        name="Groupe de pierres",
        category=AssetCategory.ROCKS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.3, 0.8),
        rot_y_range=(0.0, 360.0),
        height_offset=-0.05,
        tags=["pierres", "cailloux", "sol", "detail"],
        description="Groupe de petites pierres pour le sol",
    ),
    AssetDef(
        id="rock_cliff_face",
        name="Paroi rocheuse (sprite)",
        category=AssetCategory.SPRITES,
        asset_type=AssetType.SPRITE_2D,
        scale_range=(3.0, 6.0),
        rot_y_range=(0.0, 0.0),
        tags=["falaise", "paroi", "montagne", "fond", "cliff"],
        description="Sprite billboard de paroi rocheuse pour fond",
    ),

    # ── PLANTES (3D) ─────────────────────────────────────────────────────────
    AssetDef(
        id="plant_bush",
        name="Buisson",
        category=AssetCategory.PLANTS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.5, 1.2),
        rot_y_range=(0.0, 360.0),
        height_offset=0.0,
        tags=["buisson", "arbuste", "jardin", "nature"],
        description="Buisson arrondi généré procéduralement",
    ),
    AssetDef(
        id="plant_tall_grass",
        name="Herbes hautes",
        category=AssetCategory.PLANTS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.6, 1.4),
        rot_y_range=(0.0, 360.0),
        height_offset=0.0,
        tags=["herbe", "haute", "prairie", "champ", "nature"],
        description="Herbes hautes agitées par le vent (hair particles)",
    ),
    AssetDef(
        id="plant_fern",
        name="Fougère",
        category=AssetCategory.PLANTS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.4, 1.0),
        rot_y_range=(0.0, 360.0),
        tags=["fougere", "foret", "sol", "ombre"],
        description="Fougère procédurale, idéale pour le sol de forêt",
    ),
    AssetDef(
        id="plant_cactus",
        name="Cactus",
        category=AssetCategory.PLANTS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.5, 2.0),
        rot_y_range=(0.0, 360.0),
        tags=["cactus", "desert", "aride", "sec", "western"],
        description="Cactus saguaro procédural",
    ),
    AssetDef(
        id="plant_mushroom",
        name="Champignon",
        category=AssetCategory.PLANTS,
        asset_type=AssetType.MESH_3D,
        scale_range=(0.2, 0.8),
        rot_y_range=(0.0, 360.0),
        tags=["champignon", "foret", "humide", "fantastique"],
        description="Champignon procédural (peut être géant en scale)",
    ),

    # ── FEUILLAGES (sprites 2D) ──────────────────────────────────────────────
    AssetDef(
        id="sprite_grass_ground",
        name="Herbe au sol (sprite)",
        category=AssetCategory.SPRITES,
        asset_type=AssetType.SPRITE_2D,
        scale_range=(0.3, 0.7),
        rot_y_range=(0.0, 30.0),
        height_offset=0.0,
        cast_shadow=False,
        tags=["herbe", "sol", "detail", "remplissage"],
        description="Touffe d'herbe en sprite billboard pour remplissage de sol",
    ),
    AssetDef(
        id="sprite_foliage_distant",
        name="Feuillage lointain (sprite)",
        category=AssetCategory.SPRITES,
        asset_type=AssetType.SPRITE_2D,
        scale_range=(1.0, 2.5),
        rot_y_range=(0.0, 0.0),
        cast_shadow=False,
        tags=["feuillage", "fond", "lointain", "verdure"],
        description="Masse de feuillage en sprite pour fond de scène",
    ),
    AssetDef(
        id="sprite_cloud",
        name="Nuage (sprite)",
        category=AssetCategory.SPRITES,
        asset_type=AssetType.SPRITE_2D,
        scale_range=(2.0, 5.0),
        rot_y_range=(0.0, 0.0),
        height_offset=5.0,
        cast_shadow=False,
        tags=["nuage", "ciel", "atmosphere", "exterior"],
        description="Nuage billboard pour remplissage du ciel",
    ),

    # ── FOLIAGE INTÉRIEUR ────────────────────────────────────────────────────
    AssetDef(
        id="plant_pot",
        name="Plante en pot",
        category=AssetCategory.FOLIAGE,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.INTERIOR,
        scale_range=(0.3, 0.8),
        rot_y_range=(0.0, 360.0),
        tags=["plante", "pot", "interieur", "bureau", "decoration"],
        description="Plante verte en pot pour intérieurs",
    ),
    AssetDef(
        id="foliage_ivy",
        name="Lierre",
        category=AssetCategory.FOLIAGE,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.BOTH,
        scale_range=(0.5, 2.0),
        rot_y_range=(0.0, 180.0),
        tags=["lierre", "mur", "facade", "abandonne", "nature"],
        description="Lierre grimpant sur mur ou sol",
    ),
    AssetDef(
        id="foliage_moss",
        name="Mousse",
        category=AssetCategory.FOLIAGE,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.BOTH,
        scale_range=(0.2, 0.6),
        rot_y_range=(0.0, 360.0),
        height_offset=-0.02,
        tags=["mousse", "pierre", "humide", "nature", "abandonne"],
        description="Mousse procédurale sur pierres ou sol",
    ),

    # ── PROPS / ACCESSOIRES (3D) ──────────────────────────────────────────────
    AssetDef(
        id="prop_streetlamp",
        name="Lampadaire",
        category=AssetCategory.PROPS,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.EXTERIOR,
        scale_range=(0.95, 1.05),
        rot_y_range=(0.0, 0.0),
        tags=["lampadaire", "rue", "urbain", "nuit", "eclairage"],
        description="Lampadaire métallique de rue",
    ),
    AssetDef(
        id="prop_crate",
        name="Caisse en bois",
        category=AssetCategory.PROPS,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.BOTH,
        scale_range=(0.6, 1.2),
        rot_y_range=(0.0, 360.0),
        tags=["caisse", "bois", "entrepot", "post-apo", "prop"],
        description="Caisse en bois empilable",
    ),
    AssetDef(
        id="prop_barrel",
        name="Baril",
        category=AssetCategory.PROPS,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.BOTH,
        scale_range=(0.8, 1.1),
        rot_y_range=(0.0, 360.0),
        tags=["baril", "tonneau", "entrepot", "western", "prop"],
        description="Baril métallique ou en bois",
    ),
    AssetDef(
        id="prop_fence",
        name="Barrière",
        category=AssetCategory.PROPS,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.EXTERIOR,
        scale_range=(1.0, 1.0),
        rot_y_range=(0.0, 90.0),
        tags=["barriere", "cloture", "limite", "rural", "western"],
        description="Section de barrière en bois",
    ),
    AssetDef(
        id="prop_debris",
        name="Débris au sol",
        category=AssetCategory.PROPS,
        asset_type=AssetType.MESH_3D,
        context=SceneContext.BOTH,
        scale_range=(0.2, 0.8),
        rot_y_range=(0.0, 360.0),
        height_offset=0.0,
        tags=["debris", "ruine", "post-apo", "abandonne", "sol"],
        description="Amas de débris et fragments divers",
    ),
]


# ─────────────────────────────────────────────────────────────────────────────
#  GESTIONNAIRE DE BIBLIOTHÈQUE
# ─────────────────────────────────────────────────────────────────────────────

class AssetLibrary:
    """
    Catalogue d'assets disponibles pour la plantation procédurale.

    Fournit des méthodes de filtrage par catégorie, type, contexte, tags.

    Usage :
        lib = AssetLibrary()
        rocks = lib.get_by_category(AssetCategory.ROCKS)
        trees = lib.get_for_context(SceneContext.EXTERIOR, AssetCategory.TREES)
        sprites = lib.get_by_type(AssetType.SPRITE_2D)
    """

    def __init__(self):
        self._catalog: List[AssetDef] = _CATALOG

    def get_all(self) -> List[AssetDef]:
        """Retourne tous les assets du catalogue."""
        return list(self._catalog)

    def get_by_id(self, asset_id: str) -> Optional[AssetDef]:
        """Retourne un asset par son ID."""
        for asset in self._catalog:
            if asset.id == asset_id:
                return asset
        return None

    def get_by_category(self, category: AssetCategory) -> List[AssetDef]:
        """Retourne tous les assets d'une catégorie."""
        return [a for a in self._catalog if a.category == category]

    def get_by_type(self, asset_type: AssetType) -> List[AssetDef]:
        """Retourne tous les assets d'un type (MESH_3D ou SPRITE_2D)."""
        return [a for a in self._catalog if a.asset_type == asset_type]

    def get_for_context(
        self,
        context: SceneContext,
        category: Optional[AssetCategory] = None,
    ) -> List[AssetDef]:
        """
        Retourne les assets compatibles avec un contexte (EXTERIOR/INTERIOR).

        Args:
            context  : SceneContext.EXTERIOR ou SceneContext.INTERIOR
            category : filtre optionnel par catégorie

        Returns:
            Liste d'AssetDef compatibles
        """
        result = [
            a for a in self._catalog
            if a.context == context or a.context == SceneContext.BOTH
        ]
        if category:
            result = [a for a in result if a.category == category]
        return result

    def get_by_tags(self, tags: List[str]) -> List[AssetDef]:
        """
        Retourne les assets correspondant à au moins un des tags.

        Args:
            tags : liste de mots-clés narratifs

        Returns:
            Assets triés par nombre de tags correspondants
        """
        scored = []
        tags_lower = [t.lower() for t in tags]
        for asset in self._catalog:
            asset_tags = [t.lower() for t in asset.tags]
            score = sum(1 for t in tags_lower if t in asset_tags)
            if score > 0:
                scored.append((score, asset))
        scored.sort(key=lambda x: -x[0])
        return [a for _, a in scored]

    def suggest_for_scene(
        self,
        narrative_tags: List[str],
        context: SceneContext = SceneContext.EXTERIOR,
        max_per_category: int = 3,
    ) -> Dict[AssetCategory, List[AssetDef]]:
        """
        Suggère des assets adaptés à une scène narrative.

        Args:
            narrative_tags  : tags narratifs de la scène (ex: ['cyberpunk', 'urban', 'rain'])
            context         : intérieur ou extérieur
            max_per_category: max d'assets par catégorie

        Returns:
            Dict {catégorie: [assets]}
        """
        candidates = self.get_by_tags(narrative_tags)
        # Filtrer par contexte
        candidates = [
            a for a in candidates
            if a.context == context or a.context == SceneContext.BOTH
        ]

        result: Dict[AssetCategory, List[AssetDef]] = {}
        category_counts: Dict[AssetCategory, int] = {}

        for asset in candidates:
            count = category_counts.get(asset.category, 0)
            if count < max_per_category:
                if asset.category not in result:
                    result[asset.category] = []
                result[asset.category].append(asset)
                category_counts[asset.category] = count + 1

        return result

    def list_summary(self) -> str:
        """Retourne un résumé formaté du catalogue."""
        lines = [f"  {'ID':30s} {'TYPE':10s} {'CATÉGORIE':12s} DESCRIPTION"]
        lines.append(f"  {'─'*30} {'─'*10} {'─'*12} {'─'*35}")
        for a in sorted(self._catalog, key=lambda x: (x.category.value, x.id)):
            lines.append(
                f"  {a.id:30s} {a.asset_type.value:10s} {a.category.value:12s} {a.description[:35]}"
            )
        return "\n".join(lines)
