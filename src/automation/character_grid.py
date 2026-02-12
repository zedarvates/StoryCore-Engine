"""
Character Grid Automation Module
Étend le grid_generator.py existant pour les personnages.

Ce module fournit des fonctionnalités pour générer des grilles d'images
de personnages avec différentes poses, tenues et expressions.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
from pathlib import Path
from datetime import datetime
import json
import uuid

# Import du générateur de grille existant
try:
    from src.grid_generator import GridGenerator
except ImportError:
    from grid_generator import GridGenerator


class GridSize(Enum):
    """Tailles de grille supportées."""
    GRID_2X2 = "2x2"   # 4 images (2x2)
    GRID_3X3 = "3x3"   # 9 images (3x3)
    GRID_4X4 = "4x4"   # 16 images (4x4)


class CharacterPose(Enum):
    """Poses de personnage supportées."""
    # Positions de base
    STANDING = "standing"
    WALKING = "walking"
    SITTING = "sitting"
    KNEELING = "kneeling"
    LYING = "lying"
    
    # Actions
    FIGHTING = "fighting"
    RUNNING = "running"
    FLYING = "flying"
    SWIMMING = "swimming"
    CLIMBING = "climbing"
    
    # Combat et magie
    CASTING = "casting"
    DEFENDING = "defending"
    ATTACKING = "attacking"
    JUMPING = "jumping"
    
    # Expressions faciales (déplacé vers Expression enum)
    # NEUTRAL = "neutral"
    # HAPPY = "happy"


class CharacterOutfit(Enum):
    """Tenues de personnage supportées."""
    CASUAL = "casual"         # Vêtements quotidiens
    FORMAL = "formal"         # Vêtements élégants
    COMBAT = "combat"         # Équipement de combat
    ARMOR = "armor"           # Armure complète
    BATTLE = "battle"         # Tenue de bataille
    ROBE = "robe"             # Robes, tuniques
    WORK = "work"             # Vêtements de travail
    SLEEP = "sleep"           # Vêtements de nuit
    SWIM = "swim"             # Tenue de bain
    SPECIAL = "special"        # Tenue spéciale/cérémonie


class Expression(Enum):
    """Expressions faciales supportées."""
    NEUTRAL = "neutral"       # Neutre, impassible
    HAPPY = "happy"           # Joyeux, souriant
    SAD = "sad"               # Triste, mélancolique
    ANGRY = "angry"           # En colère, furieux
    FEARFUL = "fearful"       # Apeuré, terrorisé
    SURPRISED = "surprised"   # Surpris, choqué
    DISGUSTED = "disgusted"   # Dégoûté, écœuré
    CONTEMPTUOUS = "contempt" # Méprisant, arrogant
    DETERMINED = "determined" # Déterminé, résolu
    CONFUSED = "confused"     # Confus, perdu
    SMIRKING = "smirking"     # Sarcastique, narquois
    PAINED = "pained"         # Souffrant, endolori


class CameraAngle(Enum):
    """Angles de caméra pour les prises de vue."""
    EYE_LEVEL = "eye_level"      # Niveau des yeux
    LOW_ANGLE = "low_angle"      # Vue de dessous (heroic)
    HIGH_ANGLE = "high_angle"    # Vue de dessus
    BIRD_EYE = "bird_eye"        # Vue aérienne
    WORM_EYE = "worm_eye"        # Vue rasant le sol
    OVER_SHOULDER = "over_shoulder"  # Par-dessus l'épaule


class LightingType(Enum):
    """Types d'éclairage pour les prises."""
    NATURAL = "natural"         # Lumière naturelle
    CINEMATIC = "cinematic"     # Éclairage cinématographique
    DRAMATIC = "dramatic"       # Éclairage dramatique
    SOFT = "soft"               # Lumière douce
    HARD = "hard"               # Lumière dure
    RIM = "rim"                 # Contre-jour
    VOLUMETRIC = "volumetric"   # Lumière volumétrique


@dataclass
class GridCell:
    """Une cellule individuelle de la grille."""
    cell_id: str
    row: int
    col: int
    pose: CharacterPose
    expression: Expression
    outfit: CharacterOutfit
    camera_angle: CameraAngle = CameraAngle.EYE_LEVEL
    lighting: LightingType = LightingType.NATURAL
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cell_id": self.cell_id,
            "row": self.row,
            "col": self.col,
            "pose": self.pose.value,
            "expression": self.expression.value,
            "outfit": self.outfit.value,
            "camera_angle": self.camera_angle.value,
            "lighting": self.lighting.value
        }


@dataclass
class CharacterGridConfig:
    """Configuration pour la génération de grille personnage."""
    character_id: str
    character_name: str
    
    # Paramètres de grille
    grid_size: GridSize = GridSize.GRID_3X3
    
    # Éléments à inclure
    outfits: List[CharacterOutfit] = field(default_factory=lambda: [CharacterOutfit.CASUAL])
    poses: List[CharacterPose] = field(default_factory=lambda: [
        CharacterPose.STANDING,
        CharacterPose.WALKING,
        CharacterPose.FIGHTING,
        CharacterPose.CASTING
    ])
    expressions: List[Expression] = field(default_factory=lambda: [
        Expression.NEUTRAL,
        Expression.HAPPY,
        Expression.ANGRY,
        Expression.DETERMINED
    ])
    
    # Paramètres de génération
    camera_angles: List[CameraAngle] = field(default_factory=lambda: [CameraAngle.EYE_LEVEL])
    lighting_types: List[LightingType] = field(default_factory=lambda: [LightingType.CINEMATIC])
    
    # Paramètres de sortie
    output_dir: str = "assets/characters"
    image_format: str = "png"
    resolution: int = 512
    
    # Métadonnées
    style_reference: Optional[str] = None
    description: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_id": self.character_id,
            "character_name": self.character_name,
            "grid_size": self.grid_size.value,
            "outfits": [o.value for o in self.outfits],
            "poses": [p.value for p in self.poses],
            "expressions": [e.value for e in self.expressions],
            "camera_angles": [c.value for c in self.camera_angles],
            "lighting_types": [l.value for l in self.lighting_types],
            "output_dir": self.output_dir,
            "image_format": self.image_format,
            "resolution": self.resolution,
            "style_reference": self.style_reference,
            "description": self.description
        }


@dataclass
class GridPanel:
    """Un panneau individuel généré."""
    panel_id: str
    grid_cell: GridCell
    prompt_used: str
    negative_prompt: str
    image_path: str
    thumbnail_path: Optional[str] = None
    generation_seed: int = 0
    generation_time_ms: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "panel_id": self.panel_id,
            "cell": self.grid_cell.to_dict(),
            "prompt_used": self.prompt_used,
            "negative_prompt": self.negative_prompt,
            "image_path": self.image_path,
            "thumbnail_path": self.thumbnail_path,
            "generation_seed": self.generation_seed,
            "generation_time_ms": self.generation_time_ms
        }


@dataclass
class CharacterGridBundle:
    """Bundle complet de grille personnage."""
    bundle_id: str
    config: CharacterGridConfig
    grid_image_path: str
    panels: List[GridPanel]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "bundle_id": self.bundle_id,
            "config": self.config.to_dict(),
            "grid_image_path": self.grid_image_path,
            "panels": [p.to_dict() for p in self.panels],
            "metadata": self.metadata,
            "created_at": datetime.now().isoformat()
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2)


class CharacterGridAutomation:
    """
    Génération automatisée de grilles de personnages.
    
    Étend le GridGenerator existant pour fournir des fonctionnalités
    avancées spécifiques aux personnages avec poses, tenues et expressions.
    
    Attributes:
        grid_generator: Instance du générateur de grille de base
        generation_history: Historique des générations
    """
    
    # Layouts de grille
    GRID_LAYOUTS = {
        GridSize.GRID_2X2: {
            "rows": 2,
            "cols": 2,
            "total": 4,
            "positions": [(0, 0), (0, 1), (1, 0), (1, 1)]
        },
        GridSize.GRID_3X3: {
            "rows": 3,
            "cols": 3,
            "total": 9,
            "positions": [
                (0, 0), (0, 1), (0, 2),
                (1, 0), (1, 1), (1, 2),
                (2, 0), (2, 1), (2, 2)
            ]
        },
        GridSize.GRID_4X4: {
            "rows": 4,
            "cols": 4,
            "total": 16,
            "positions": [
                (i, j) for i in range(4) for j in range(4)
            ]
        }
    }
    
    # Mappings pour la génération de prompts
    POSE_DESCRIPTIONS = {
        CharacterPose.STANDING: "standing pose, full body, neutral stance",
        CharacterPose.WALKING: "walking pose, mid-stride, dynamic movement",
        CharacterPose.SITTING: "sitting pose, relaxed, natural position",
        CharacterPose.KNEELING: "kneeling pose, one knee down",
        CharacterPose.LYING: "lying down pose, relaxed, horizontal",
        CharacterPose.FIGHTING: "combat stance, ready for action, dynamic",
        CharacterPose.RUNNING: "running pose, high speed, motion blur",
        CharacterPose.FLYING: "flying pose, levitating, wings optional",
        CharacterPose.SWIMMING: "swimming pose, underwater context",
        CharacterPose.CLIMBING: "climbing pose, gripping surface",
        CharacterPose.CASTING: "casting spell, hands glowing, magical energy",
        CharacterPose.DEFENDING: "defensive stance, arms raised, shield ready",
        CharacterPose.ATTACKING: "attacking pose, weapon raised, strike ready",
        CharacterPose.JUMPING: "jumping pose, mid-air, dynamic action"
    }
    
    EXPRESSION_DESCRIPTIONS = {
        Expression.NEUTRAL: "neutral facial expression, calm, relaxed",
        Expression.HAPPY: "happy expression, smiling, joyful",
        Expression.SAD: "sad expression, frowning, melancholic",
        Expression.ANGRY: "angry expression, frowning, intense",
        Expression.FEARFUL: "fearful expression, wide-eyed, terrified",
        Expression.SURPRISED: "surprised expression, eyebrows raised, shocked",
        Expression.DISGUSTED: "disgusted expression, nose wrinkled, repulsed",
        Expression.CONTEMPTUOUS: "contemptuous expression, smirking, superior",
        Expression.DETERMINED: "determined expression, focused, resolute",
        Expression.CONFUSED: "confused expression, puzzled, uncertain",
        Expression.SMIRKING: "smirking expression, knowing grin, sarcastic",
        Expression.PAINED: "pained expression, suffering, agony"
    }
    
    OUTFIT_DESCRIPTIONS = {
        CharacterOutfit.CASUAL: "casual clothing, everyday wear, comfortable",
        CharacterOutfit.FORMAL: "formal attire, elegant, dress clothes",
        CharacterOutfit.COMBAT: "combat gear, tactical vest, weapons",
        CharacterOutfit.ARMOR: "full armor, steel plates, protective gear",
        CharacterOutfit.BATTLE: "battle worn, battle-damaged, fierce",
        CharacterOutfit.ROBE: "robe, flowing fabric, mystical garment",
        CharacterOutfit.WORK: "work clothes, practical, stained",
        CharacterOutfit.SLEEP: "sleepwear, pajamas, night clothes",
        CharacterOutfit.SWIM: "swimwear, beach attire, summer outfit",
        CharacterOutfit.SPECIAL: "ceremonial outfit, ornate, regal"
    }
    
    def __init__(self, base_output_dir: str = "assets/characters"):
        """
        Initialise le générateur de grilles de personnages.
        
        Args:
            base_output_dir: Répertoire de base pour les assets
        """
        self.base_output_dir = Path(base_output_dir)
        self.grid_generator = GridGenerator()
        self.generation_history: List[CharacterGridBundle] = []
        
        # Créer le répertoire de base
        self.base_output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_character_grid(
        self,
        config: CharacterGridConfig
    ) -> CharacterGridBundle:
        """
        Génère une grille complète pour un personnage.
        
        Args:
            config: Configuration de la génération
            
        Returns:
            CharacterGridBundle contenant la grille et les panneaux
        """
        bundle_id = str(uuid.uuid4())
        
        # Créer le répertoire du personnage
        char_dir = self.base_output_dir / config.character_id
        char_dir.mkdir(parents=True, exist_ok=True)
        
        # Calculer les cellules de la grille
        cells = self._calculate_grid_cells(config)
        
        # Générer les prompts pour chaque cellule
        cell_prompts = self._generate_cell_prompts(config, cells)
        
        # Générer les panneaux
        panels = self._generate_panels(
            config=config,
            cells=cells,
            prompts=cell_prompts,
            output_dir=char_dir
        )
        
        # Générer l'image de grille combinée
        grid_image_path = self._generate_grid_image(
            config=config,
            panels=panels,
            output_dir=char_dir
        )
        
        # Créer le bundle
        bundle = CharacterGridBundle(
            bundle_id=bundle_id,
            config=config,
            grid_image_path=str(grid_image_path),
            panels=panels,
            metadata={
                "total_panels": len(panels),
                "grid_dimensions": {
                    "rows": self.GRID_LAYOUTS[config.grid_size]["rows"],
                    "cols": self.GRID_LAYOUTS[config.grid_size]["cols"]
                },
                "generation_time": datetime.now().isoformat()
            }
        )
        
        # Sauvegarder les métadonnées
        self._save_bundle_metadata(bundle, char_dir)
        
        # Ajouter à l'historique
        self.generation_history.append(bundle)
        
        return bundle
    
    def _calculate_grid_cells(
        self,
        config: CharacterGridConfig
    ) -> List[GridCell]:
        """Calcule les cellules de la grille basées sur la config."""
        layout = self.GRID_LAYOUTS[config.grid_size]
        total_cells = layout["total"]
        positions = layout["positions"]
        
        cells = []
        
        # Pool de poses (répéter si nécessaire)
        poses_pool = config.poses.copy()
        while len(poses_pool) < total_cells:
            poses_pool.extend(config.poses)
        
        # Pool d'expressions (répéter si nécessaire)
        expressions_pool = config.expressions.copy()
        while len(expressions_pool) < total_cells:
            expressions_pool.extend(config.expressions)
        
        # Pool de tenues (répéter si nécessaire)
        outfits_pool = config.outfits.copy()
        while len(outfits_pool) < total_cells:
            outfits_pool.extend(config.outfits)
        
        for i in range(total_cells):
            row, col = positions[i]
            
            cell = GridCell(
                cell_id=f"{config.character_id}_cell_{i:02d}",
                row=row,
                col=col,
                pose=poses_pool[i],
                expression=expressions_pool[i],
                outfit=outfits_pool[i],
                camera_angle=config.camera_angles[i % len(config.camera_angles)],
                lighting=config.lighting_types[i % len(config.lighting_types)]
            )
            cells.append(cell)
        
        return cells
    
    def _generate_cell_prompts(
        self,
        config: CharacterGridConfig,
        cells: List[GridCell]
    ) -> Dict[int, Tuple[str, str]]:
        """Génère les prompts (positif et négatif) pour chaque cellule."""
        prompts = {}
        
        base_prompt = self._build_base_prompt(config)
        
        for i, cell in enumerate(cells):
            # Prompt positif
            prompt_parts = [base_prompt]
            
            # Ajouter la description de la pose
            if cell.pose in self.POSE_DESCRIPTIONS:
                prompt_parts.append(self.POSE_DESCRIPTIONS[cell.pose])
            
            # Ajouter la description de l'expression
            if cell.expression in self.EXPRESSION_DESCRIPTIONS:
                prompt_parts.append(self.EXPRESSION_DESCRIPTIONS[cell.expression])
            
            # Ajouter la description de la tenue
            if cell.outfit in self.OUTFIT_DESCRIPTIONS:
                prompt_parts.append(self.OUTFIT_DESCRIPTIONS[cell.outfit])
            
            # Ajouter l'angle de caméra
            prompt_parts.append(f"camera angle: {cell.camera_angle.value}")
            
            # Ajouter l'éclairage
            prompt_parts.append(f"lighting: {cell.lighting.value}")
            
            # Qualité
            prompt_parts.append("high quality, detailed, masterpiece, best quality")
            
            positive_prompt = ", ".join(prompt_parts)
            
            # Prompt négatif
            negative_prompt = (
                "low quality, worst quality, blurry, deformed, "
                "bad anatomy, bad pose, extra limbs, "
                "missing fingers, watermark, signature"
            )
            
            prompts[i] = (positive_prompt, negative_prompt)
        
        return prompts
    
    def _build_base_prompt(self, config: CharacterGridConfig) -> str:
        """Construit le prompt de base pour le personnage."""
        parts = [f"character portrait of {config.character_name}"]
        
        # Ajouter la référence de style si disponible
        if config.style_reference:
            parts.append(f"in the style of {config.style_reference}")
        
        # Ajouter la description si disponible
        if config.description:
            parts.append(config.description)
        
        return " ".join(parts)
    
    def _generate_panels(
        self,
        config: CharacterGridConfig,
        cells: List[GridCell],
        prompts: Dict[int, Tuple[str, str]],
        output_dir: Path
    ) -> List[GridPanel]:
        """Génère les panneaux individuels."""
        panels = []
        
        for i, cell in enumerate(cells):
            positive_prompt, negative_prompt = prompts[i]
            
            # Créer le panneau
            panel = GridPanel(
                panel_id=f"{config.character_id}_panel_{i:02d}",
                grid_cell=cell,
                prompt_used=positive_prompt,
                negative_prompt=negative_prompt,
                image_path=str(output_dir / f"panel_{i:02d}.{config.image_format}"),
                generation_seed=uuid.uuid4().time & 0xFFFFFFFF
            )
            
            # TODO: Implémenter la génération via ComfyUI
            # Cette partie serait connectée au comfy_client.py existant
            # from src.comfy_client import ComfyUIClient
            # client = ComfyUIClient()
            # result = client.generate_image(positive_prompt, negative_prompt)
            
            panels.append(panel)
        
        return panels
    
    def _generate_grid_image(
        self,
        config: CharacterGridConfig,
        panels: List[GridPanel],
        output_dir: Path
    ) -> Path:
        """Génère l'image de grille combinée."""
        grid_filename = f"{config.character_id}_grid_{config.grid_size.value}.{config.image_format}"
        grid_path = output_dir / grid_filename
        
        # TODO: Implémenter la génération de grille
        # Cette partie utiliserait le grid_generator.py existant
        # self.grid_generator.generate_grid(...)
        
        # Pour l'instant, retourner un chemin
        return grid_path
    
    def _save_bundle_metadata(
        self,
        bundle: CharacterGridBundle,
        output_dir: Path
    ):
        """Sauvegarde les métadonnées du bundle."""
        metadata_path = output_dir / f"{bundle.bundle_id}_metadata.json"
        
        with open(metadata_path, 'w', encoding='utf-8') as f:
            f.write(bundle.to_json())
    
    def get_bundle_by_id(
        self,
        bundle_id: str
    ) -> Optional[CharacterGridBundle]:
        """Récupère un bundle par ID."""
        for bundle in self.generation_history:
            if bundle.bundle_id == bundle_id:
                return bundle
        return None
    
    def get_character_bundles(
        self,
        character_id: str
    ) -> List[CharacterGridBundle]:
        """Récupère tous les bundles pour un personnage."""
        return [
            b for b in self.generation_history
            if b.config.character_id == character_id
        ]
    
    def get_latest_bundle(
        self,
        character_id: str
    ) -> Optional[CharacterGridBundle]:
        """Récupère le bundle le plus récent pour un personnage."""
        bundles = self.get_character_bundles(character_id)
        if bundles:
            return bundles[-1]
        return None
    
    def get_grid_layout(
        self,
        grid_size: GridSize
    ) -> Dict[str, Any]:
        """Récupère les informations de layout pour une taille de grille."""
        return {
            "size": grid_size.value,
            **self.GRID_LAYOUTS[grid_size]
        }
    
    def get_available_poses(self) -> List[str]:
        """Récupère la liste des poses disponibles."""
        return [pose.value for pose in CharacterPose]
    
    def get_available_expressions(self) -> List[str]:
        """Récupère la liste des expressions disponibles."""
        return [expr.value for expr in Expression]
    
    def get_available_outfits(self) -> List[str]:
        """Récupère la liste des tenues disponibles."""
        return [outfit.value for outfit in CharacterOutfit]
    
    def export_bundle(
        self,
        bundle_id: str,
        format: str = "json"
    ) -> Optional[str]:
        """Exporte un bundle dans le format spécifié."""
        bundle = self.get_bundle_by_id(bundle_id)
        if not bundle:
            return None
        
        if format == "json":
            return bundle.to_json()
        else:
            return None
    
    def clear_history(self):
        """Efface l'historique des générations."""
        self.generation_history.clear()


# Factory function
def create_character_grid_automation(
    base_output_dir: str = "assets/characters"
) -> CharacterGridAutomation:
    """
    Crée et configure une instance de CharacterGridAutomation.
    
    Args:
        base_output_dir: Répertoire de base pour les assets
        
    Returns:
        Instance configurée de CharacterGridAutomation
    """
    return CharacterGridAutomation(base_output_dir=base_output_dir)

