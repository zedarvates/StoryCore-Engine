"""
Automation Endpoints - Étend feedback_proxy.py
Endpoints FastAPI pour l'automatisation StoryCore.

Ce module ajoute les routes API pour:
- Génération de dialogues
- Génération de grilles de personnages
- Amélioration de prompts
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

# Import des modules d'automation
import sys
from pathlib import Path

# Ajouter le répertoire src au path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.automation.dialogue_automation import (
    DialogueAutomation,
    DialogueContext,
    DialogueScene,
    DialogueType,
    EmotionIntensity,
    DialogueTemplate,
    create_dialogue_automation
)

from src.automation.character_grid import (
    CharacterGridAutomation,
    CharacterGridConfig,
    CharacterGridBundle,
    GridSize,
    CharacterPose,
    CharacterOutfit,
    Expression,
    CameraAngle,
    LightingType,
    create_character_grid_automation
)


# Création des instances d'automation
dialogue_automation = create_dialogue_automation(storage_dir="data/dialogues")
character_grid_automation = create_character_grid_automation(base_output_dir="assets/characters")


# ==================== MODÈLES DE REQUÊTE/RÉPONSE ====================

# --- Dialogue Models ---

class DialogueCharacterData(BaseModel):
    """Données d'un personnage pour la génération de dialogue."""
    character_id: str
    name: str
    archetype: str  # "hero", "villain", "mentor", etc.
    role: str = "supporting"
    personality_traits: Dict[str, float] = Field(default_factory=dict)


class DialogueContextRequest(BaseModel):
    """Contexte de la scène de dialogue."""
    location: str = "Unknown Location"
    time_of_day: str = "day"
    situation: str = "neutral"
    weather: Optional[str] = None
    mood: str = "neutral"


class DialogueGenerateRequest(BaseModel):
    """Requête de génération de dialogue."""
    characters: List[DialogueCharacterData]
    context: DialogueContextRequest
    dialogue_type: str = "conversation"
    num_lines: int = 10
    template: str = "linear"
    force_emotions: Optional[Dict[str, str]] = None


class DialogueLineResponse(BaseModel):
    """Réponse pour une ligne de dialogue."""
    line_id: str
    character_name: str
    dialogue: str
    emotion: str
    is_thought: bool


class DialogueGenerateResponse(BaseModel):
    """Réponse de génération de dialogue."""
    scene_id: str
    title: str
    context: Dict[str, Any]
    characters: List[str]
    lines: List[DialogueLineResponse]
    created_at: str


class DialogueHistoryItem(BaseModel):
    """Élément de l'historique des dialogues."""
    scene_id: str
    title: str
    context: Dict[str, Any]
    characters: List[str]
    line_count: int
    created_at: str


class DialogueHistoryResponse(BaseModel):
    """Réponse de l'historique des dialogues."""
    total_scenes: int
    scenes: List[DialogueHistoryItem]


# --- Character Grid Models ---

class CharacterGridRequest(BaseModel):
    """Requête de génération de grille personnage."""
    character_id: str
    character_name: str
    grid_size: str = "3x3"
    outfits: List[str] = ["casual"]
    poses: List[str] = ["standing", "walking", "fighting", "casting"]
    expressions: List[str] = ["neutral", "happy", "angry", "determined"]
    camera_angles: List[str] = ["eye_level"]
    lighting_types: List[str] = ["cinematic"]
    resolution: int = 512


class GridPanelResponse(BaseModel):
    """Réponse pour un panneau de grille."""
    panel_id: str
    row: int
    col: int
    pose: str
    expression: str
    outfit: str


class CharacterGridResponse(BaseModel):
    """Réponse de génération de grille personnage."""
    bundle_id: str
    character_id: str
    character_name: str
    grid_size: str
    grid_image_path: str
    panels: List[GridPanelResponse]
    total_panels: int
    metadata: Dict[str, Any]


class CharacterGridsListResponse(BaseModel):
    """Réponse listant toutes les grilles d'un personnage."""
    character_id: str
    total_bundles: int
    bundles: List[CharacterGridResponse]


# --- Prompt Enhancement Models ---

class PromptStyle(str, Enum):
    """Styles de prompt disponibles."""
    REALISTIC = "realistic"
    ANIME = "anime"
    FANTASY = "fantasy"
    SCIENCE_FICTION = "science_fiction"
    OIL_PAINTING = "oil_painting"
    WATERCOLOR = "watercolor"
    PHOTOGRAPHIC = "photographic"
    CYBERPUNK = "cyberpunk"
    GOTHIC = "gothic"
    MINIMALIST = "minimalist"


class LightingStyle(str, Enum):
    """Styles d'éclairage disponibles."""
    CINEMATIC = "cinematic"
    NATURAL = "natural"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    VOLUMETRIC = "volumetric"
    NEON = "neon"
    GOLDEN_HOUR = "golden_hour"
    BLUE_HOUR = "blue_hour"


class MoodStyle(str, Enum):
    """Styles d'ambiance disponibles."""
    NEUTRAL = "neutral"
    TENSE = "tense"
    PEACEFUL = "peaceful"
    MYSTERIOUS = "mysterious"
    EPIC = "epic"
    JOYFUL = "joyful"
    SOMBER = "somber"
    HORROR = "horror"
    ROMANTIC = "romantic"
    DREAMY = "dreamy"


class PromptEnhanceRequest(BaseModel):
    """Requête d'amélioration de prompt."""
    base_prompt: str = Field(..., min_length=5, description="Prompt de base à améliorer")
    style: PromptStyle = PromptStyle.REALISTIC
    lighting: LightingStyle = LightingStyle.CINEMATIC
    mood: MoodStyle = MoodStyle.NEUTRAL
    quality: str = "high"
    add_negative: bool = True
    add_style_tags: bool = True
    add_camera_tags: bool = False


class PromptEnhanceResponse(BaseModel):
    """Réponse d'amélioration de prompt."""
    original_prompt: str
    enhanced_prompt: str
    negative_prompt: str
    style_tags: List[str]
    lighting_tags: List[str]
    mood_tags: List[str]
    quality_tags: List[str]


# ==================== ROUTER CRÉATION ====================

router = APIRouter(prefix="/api/automation", tags=["automation"])


# ==================== DIALOGUE ENDPOINTS ====================

@router.post("/dialogue/generate", response_model=DialogueGenerateResponse)
async def generate_dialogue(request: DialogueGenerateRequest):
    """
    Génère une scène de dialogue complète.
    
    Args:
        request: Configuration du dialogue
    
    Returns:
        Scene de dialogue générée
    """
    try:
        # Créer le contexte
        context = DialogueContext(
            location=request.context.location,
            time_of_day=request.context.time_of_day,
            situation=request.context.situation,
            weather=request.context.weather,
            mood=request.context.mood
        )
        
        # Convertir le type de dialogue
        dialogue_type = DialogueType(request.dialogue_type)
        
        # Convertir le template
        template = DialogueTemplate(request.template)
        
        # Note: Les personnages sont intégrés en mode "mock"
        # Dans une vraie implémentation, on chargerait depuis la DB
        # Pour l'instant, on génère avec des personnages virtuels
        
        # Générer le dialogue
        scene = dialogue_automation.generate_dialogue(
            characters=[],  # TODO: Charger depuis la DB avec les vrais personnages
            context=context,
            dialogue_type=dialogue_type,
            num_lines=request.num_lines,
            template=template,
            force_emotions=request.force_emotions
        )
        
        return DialogueGenerateResponse(
            scene_id=scene.scene_id,
            title=scene.title,
            context=scene.context.to_dict(),
            characters=[c.name for c in scene.characters],
            lines=[
                DialogueLineResponse(
                    line_id=line.line_id,
                    character_name=line.character_name,
                    dialogue=line.dialogue,
                    emotion=line.emotion,
                    is_thought=line.is_thought
                )
                for line in scene.lines
            ],
            created_at=scene.created_at.isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dialogue/history", response_model=DialogueHistoryResponse)
async def get_dialogue_history(limit: int = Query(default=50, le=100)):
    """
    Récupère l'historique des dialogues générés.
    
    Args:
        limit: Nombre maximum de scènes à retourner
    
    Returns:
        Liste des dialogues générés
    """
    try:
        history = dialogue_automation.get_dialogue_history(limit=limit)
        
        return DialogueHistoryResponse(
            total_scenes=len(history),
            scenes=[
                DialogueHistoryItem(
                    scene_id=item["scene_id"],
                    title=item["title"],
                    context=item["context"],
                    characters=item["characters"],
                    line_count=item["line_count"],
                    created_at=item["created_at"]
                )
                for item in history
            ]
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dialogue/{scene_id}")
async def get_dialogue_scene(scene_id: str):
    """
    Récupère une scène de dialogue par son ID.
    
    Args:
        scene_id: ID de la scène
    
    Returns:
        Détails de la scène
    """
    scene = dialogue_automation.get_scene_by_id(scene_id)
    if not scene:
        raise HTTPException(status_code=404, detail="Scene not found")
    
    return scene.to_dict()


@router.delete("/dialogue/history")
async def clear_dialogue_history():
    """Efface l'historique des dialogues."""
    dialogue_automation.clear_history()
    return {"status": "success", "message": "Dialogue history cleared"}


# ==================== CHARACTER GRID ENDPOINTS ====================

@router.post("/character/grid/generate", response_model=CharacterGridResponse)
async def generate_character_grid(request: CharacterGridRequest):
    """
    Génère une grille d'images pour un personnage.
    
    Args:
        request: Configuration de la grille
    
    Returns:
        Bundle de grille généré
    """
    try:
        # Convertir la taille de grille
        grid_size_map = {
            "2x2": GridSize.GRID_2X2,
            "3x3": GridSize.GRID_3X3,
            "4x4": GridSize.GRID_4X4
        }
        grid_size = grid_size_map.get(request.grid_size, GridSize.GRID_3X3)
        
        # Convertir les enums
        outfits = [CharacterOutfit(o) for o in request.outfits]
        poses = [CharacterPose(p) for p in request.poses]
        camera_angles = [CameraAngle(c) for c in request.camera_angles]
        lighting_types = [LightingType(l) for l in request.lighting_types]
        
        # Note: Expression est déjà importé, pas de préfixe nécessaire
        from src.automation.character_grid import Expression as GridExpression
        expressions = [GridExpression(e) for e in request.expressions]
        
        # Créer la configuration
        config = CharacterGridConfig(
            character_id=request.character_id,
            character_name=request.character_name,
            grid_size=grid_size,
            outfits=outfits,
            poses=poses,
            expressions=expressions,
            camera_angles=camera_angles,
            lighting_types=lighting_types,
            resolution=request.resolution
        )
        
        # Générer la grille
        bundle = character_grid_automation.generate_character_grid(config)
        
        return CharacterGridResponse(
            bundle_id=bundle.bundle_id,
            character_id=bundle.config.character_id,
            character_name=bundle.config.character_name,
            grid_size=bundle.config.grid_size.value,
            grid_image_path=bundle.grid_image_path,
            panels=[
                GridPanelResponse(
                    panel_id=p.panel_id,
                    row=p.grid_cell.row,
                    col=p.grid_cell.col,
                    pose=p.grid_cell.pose.value,
                    expression=p.grid_cell.expression.value,
                    outfit=p.grid_cell.outfit.value
                )
                for p in bundle.panels
            ],
            total_panels=len(bundle.panels),
            metadata=bundle.metadata
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/character/grid/{bundle_id}")
async def get_character_grid(bundle_id: str):
    """
    Récupère une grille par son ID de bundle.
    
    Args:
        bundle_id: ID du bundle
    
    Returns:
        Détails de la grille
    """
    bundle = character_grid_automation.get_bundle_by_id(bundle_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")
    
    return bundle.to_dict()


@router.get("/character/{character_id}/grids", response_model=CharacterGridsListResponse)
async def get_character_all_grids(character_id: str):
    """
    Récupère toutes les grilles d'un personnage.
    
    Args:
        character_id: ID du personnage
    
    Returns:
        Liste des grilles du personnage
    """
    bundles = character_grid_automation.get_character_bundles(character_id)
    
    return CharacterGridsListResponse(
        character_id=character_id,
        total_bundles=len(bundles),
        bundles=[
            CharacterGridResponse(
                bundle_id=b.bundle_id,
                character_id=b.config.character_id,
                character_name=b.config.character_name,
                grid_size=b.config.grid_size.value,
                grid_image_path=b.grid_image_path,
                panels=[
                    GridPanelResponse(
                        panel_id=p.panel_id,
                        row=p.grid_cell.row,
                        col=p.grid_cell.col,
                        pose=p.grid_cell.pose.value,
                        expression=p.grid_cell.expression.value,
                        outfit=p.grid_cell.outfit.value
                    )
                    for p in b.panels
                ],
                total_panels=len(b.panels),
                metadata=b.metadata
            )
            for b in bundles
        ]
    )


@router.get("/character/{character_id}/latest-grid")
async def get_character_latest_grid(character_id: str):
    """
    Récupère la grille la plus récente d'un personnage.
    
    Args:
        character_id: ID du personnage
    
    Returns:
        Grille la plus récente
    """
    bundle = character_grid_automation.get_latest_bundle(character_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="No grids found for character")
    
    return bundle.to_dict()


@router.get("/character/grid/layouts")
async def get_available_grid_layouts():
    """Récupère les layouts de grille disponibles."""
    return {
        "layouts": [
            character_grid_automation.get_grid_layout(GridSize.GRID_2X2),
            character_grid_automation.get_grid_layout(GridSize.GRID_3X3),
            character_grid_automation.get_grid_layout(GridSize.GRID_4X4)
        ]
    }


@router.get("/character/grid/options")
async def get_grid_options():
    """Récupère les options disponibles pour les grilles."""
    return {
        "poses": character_grid_automation.get_available_poses(),
        "expressions": character_grid_automation.get_available_expressions(),
        "outfits": character_grid_automation.get_available_outfits(),
        "camera_angles": [c.value for c in CameraAngle],
        "lighting_types": [l.value for l in LightingType],
        "grid_sizes": [g.value for g in GridSize]
    }


# ==================== PROMPT ENHANCEMENT ENDPOINTS ====================

@router.post("/prompt/enhance", response_model=PromptEnhanceResponse)
async def enhance_prompt(request: PromptEnhanceRequest):
    """
    Améliore un prompt avec des modificateurs de style, éclairage, etc.
    
    Args:
        request: Configuration de l'amélioration
    
    Returns:
        Prompt amélioré
    """
    try:
        # Tags de style
        style_tags_map = {
            PromptStyle.REALISTIC: ["realistic", "photorealistic", "detailed"],
            PromptStyle.ANIME: ["anime style", "manga style", "cel shaded"],
            PromptStyle.FANTASY: ["fantasy art", "magical", "ethereal"],
            PromptStyle.SCIENCE_FICTION: ["sci-fi", "futuristic", "cyber"],
            PromptStyle.OIL_PAINTING: ["oil painting", "impressionist", "brushstrokes"],
            PromptStyle.WATERCOLOR: ["watercolor", "soft colors", "flowing"],
            PromptStyle.PHOTOGRAPHIC: ["photograph", "35mm", "depth of field"],
            PromptStyle.CYBERPUNK: ["cyberpunk", "neon lights", "high tech"],
            PromptStyle.GOTHIC: ["gothic", "dark", "dramatic"],
            PromptStyle.MINIMALIST: ["minimalist", "clean", "simple"]
        }
        
        # Tags d'éclairage
        lighting_tags_map = {
            LightingStyle.CINEMATIC: ["cinematic lighting", "volumetric lighting", "rim light"],
            LightingStyle.NATURAL: ["natural lighting", "sunlight", "soft shadows"],
            LightingStyle.DRAMATIC: ["dramatic lighting", "chiaroscuro", "high contrast"],
            LightingStyle.SOFT: ["soft lighting", " diffused light", "gentle"],
            LightingStyle.VOLUMETRIC: ["volumetric fog", "god rays", "atmospheric"],
            LightingStyle.NEON: ["neon lights", "colorful lighting", "glow"],
            LightingStyle.GOLDEN_HOUR: ["golden hour", "warm light", "sunset"],
            LightingStyle.BLUE_HOUR: ["blue hour", "cool tones", "twilight"]
        }
        
        # Tags d'ambiance
        mood_tags_map = {
            MoodStyle.NEUTRAL: ["neutral mood", "balanced"],
            MoodStyle.TENSE: ["tense atmosphere", "dramatic", "urgent"],
            MoodStyle.PEACEFUL: ["peaceful", "calm", "serene"],
            MoodStyle.MYSTERIOUS: ["mysterious", "enigmatic", "shadowy"],
            MoodStyle.EPIC: ["epic", "heroic", "grand"],
            MoodStyle.JOYFUL: ["joyful", "bright", "vibrant"],
            MoodStyle.SOMBER: ["somber", "melancholic", "dark mood"],
            MoodStyle.HORROR: ["horror", "scary", "eerie"],
            MoodStyle.ROMANTIC: ["romantic", "soft", "tender"],
            MoodStyle.DREAMY: ["dreamy", "surreal", "ethereal"]
        }
        
        # Construire le prompt amélioré
        enhanced_parts = [request.base_prompt]
        
        if request.add_style_tags:
            style_tags = style_tags_map.get(request.style, [])
            enhanced_parts.extend(style_tags)
        
        lighting_tags = lighting_tags_map.get(request.lighting, [])
        enhanced_parts.extend(lighting_tags)
        
        mood_tags = mood_tags_map.get(request.mood, [])
        enhanced_parts.extend(mood_tags)
        
        # Qualité
        quality_tags = [request.quality, "detailed", "high resolution"]
        enhanced_parts.extend(quality_tags)
        
        enhanced_prompt = ", ".join(enhanced_parts)
        
        # Prompt négatif
        negative_parts = [
            "blurry", "low quality", "distorted", "deformed",
            "bad anatomy", "extra limbs", "watermark", "signature",
            "text", "logo"
        ]
        
        if request.add_negative:
            if request.style == PromptStyle.ANIME:
                negative_parts.extend(["3d render", "realistic"])
            elif request.style == PromptStyle.REALISTIC:
                negative_parts.extend(["cartoon", "anime", "drawing"])
        
        negative_prompt = ", ".join(negative_parts)
        
        return PromptEnhanceResponse(
            original_prompt=request.base_prompt,
            enhanced_prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            style_tags=style_tags_map.get(request.style, []),
            lighting_tags=lighting_tags_map.get(request.lighting, []),
            mood_tags=mood_tags_map.get(request.mood, []),
            quality_tags=quality_tags
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompt/styles")
async def get_prompt_styles():
    """Récupère les styles de prompt disponibles."""
    return {
        "styles": [s.value for s in PromptStyle],
        "lighting": [l.value for l in LightingStyle],
        "moods": [m.value for m in MoodStyle]
    }


# ==================== HEALTH CHECK ====================

@router.get("/health")
async def automation_health_check():
    """Vérifie l'état du service d'automatisation."""
    return {
        "status": "healthy",
        "service": "StoryCore Automation",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "statistics": {
            "dialogue_scenes": len(dialogue_automation.dialogue_history),
            "character_grids": len(character_grid_automation.generation_history)
        }
    }

