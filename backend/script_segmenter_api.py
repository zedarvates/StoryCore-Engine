"""
API REST pour le service de segmentation intelligente de scripts.

Endpoints:
- POST /api/segment - Segmenter un script
- GET /api/segment/{id} - Récupérer une segmentation
- GET /api/segment/{id}/segments - Liste des segments
- PUT /api/segment/{id}/segments/{segment_id} - Modifier un segment
- POST /api/segment/{id}/regenerate - Re-segmenter
- DELETE /api/segment/{id} - Supprimer une segmentation
"""

import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from backend.script_segmenter_service import (
    ScriptSegmenterService,
    get_segmenter_service,
)

# Configuration du logging
logger = logging.getLogger(__name__)

# Créer le routeur FastAPI
router = APIRouter(
    prefix="/segment",
    tags=["Script Segmentation"],
    responses={404: {"description": "Not found"}},
)


# ============== Modèles Pydantic ==============


class SegmentScriptRequest(BaseModel):
    """Requête de segmentation de script"""

    text: str = Field(..., description="Texte du script à segmenter", min_length=10)
    script_id: Optional[str] = Field(None, description="Identifiant du script")
    project_id: Optional[str] = Field(None, description="Identifiant du projet")
    target_duration: float = Field(
        8.0, description="Durée cible par segment en secondes", ge=4.0, le=20.0
    )
    language: str = Field("fr", description="Langue du script")
    words_per_minute: Optional[int] = Field(
        None, description="Vitesse de parole estimée", ge=80, le=250
    )

    class Config:
        json_schema_extra = {
            "example": {
                "text": "MARIE: Bonjour, comment allez-vous?\nJEAN: Très bien, merci! Et vous?\nMARIE: À merveille. J'ai une nouvelle incroyable à vous annoncer.\nJEAN: Racontez-moi tout!\nMARIE: Je viens de finir mon premier roman. Il sera publié le mois prochain.\nJEAN: C'est fantastique! Félicitations!",
                "script_id": "script_001",
                "project_id": "project_123",
                "target_duration": 8.0,
                "language": "fr",
            }
        }


class AdjustSegmentRequest(BaseModel):
    """Requête d'ajustement de segment"""

    action: str = Field(..., description="Action à effectuer: split, merge, edit")
    split_at: Optional[int] = Field(None, description="Position de coupure pour split")
    text: Optional[str] = Field(None, description="Nouveau texte pour edit")

    class Config:
        json_schema_extra = {"example": {"action": "split", "split_at": 50}}


class RegenerateRequest(BaseModel):
    """Requête de re-segmentation"""

    target_duration: Optional[float] = Field(
        None, description="Nouvelle durée cible", ge=4.0, le=20.0
    )
    language: Optional[str] = Field(None, description="Nouvelle langue")

    class Config:
        json_schema_extra = {"example": {"target_duration": 6.0}}


class SegmentResponse(BaseModel):
    """Réponse pour un segment individuel"""

    id: str
    sequence: int
    text: str
    duration_seconds: float
    speaker: str
    scene_type: str
    emotional_tone: str
    break_type: str
    break_confidence: float
    visual_prompt: str
    audio_prompt: str
    start_time: float
    end_time: float


class SegmentationResponse(BaseModel):
    """Réponse pour une segmentation complète"""

    id: str
    script_id: str
    project_id: str
    segments: List[SegmentResponse]
    total_duration: float
    created_at: str
    avg_segment_duration: float
    natural_breaks: int
    forced_breaks: int
    optimization_suggestions: List[str]


class SegmentationListResponse(BaseModel):
    """Réponse pour la liste des segmentations"""

    id: str
    script_id: Optional[str]
    project_id: Optional[str]
    total_duration: float
    segments_count: int
    created_at: str
    avg_segment_duration: float


# ============== Endpoints ==============


@router.post("", response_model=SegmentationResponse, status_code=201)
async def segment_script(request: SegmentScriptRequest):
    """
    Segmente un script en segments de ~8 secondes.

    Ce endpoint analyse le script fourni et le découpe en segments
    optimisés pour la génération vidéo, en détectant les points de
    coupure naturels (changements de locuteur, fins de phrases, etc.).

    Returns:
        SegmentationResponse: Résultat de la segmentation avec tous les segments
    """
    try:
        # Obtenir le service
        service = get_segmenter_service()

        # Configurer la vitesse de parole si spécifiée
        if request.words_per_minute:
            service = ScriptSegmenterService(words_per_minute=request.words_per_minute)

        logger.info(f"Segmenting script, text length: {len(request.text)} chars")

        # Effectuer la segmentation
        result = service.segment_script(
            text=request.text,
            script_id=request.script_id or "",
            project_id=request.project_id or "",
            target_duration=request.target_duration,
            language=request.language,
        )

        # Sauvegarder le résultat
        service.save_segmentation(result)

        logger.info(
            f"Segmentation complete: {len(result.segments)} segments, {result.total_duration:.1f}s"
        )

        return SegmentationResponse(**result.to_dict())

    except Exception as e:
        logger.error(f"Error segmenting script: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Segmentation error: {str(e)}")


@router.get("/{segmentation_id}", response_model=SegmentationResponse)
async def get_segmentation(segmentation_id: str):
    """
    Récupère une segmentation par son ID.

    Args:
        segmentation_id: Identifiant unique de la segmentation

    Returns:
        SegmentationResponse: La segmentation complète avec tous les segments
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    return SegmentationResponse(**result.to_dict())


@router.get("", response_model=List[SegmentationListResponse])
async def list_segmentations(
    project_id: Optional[str] = Query(None, description="Filtrer par projet"),
    limit: int = Query(20, ge=1, le=100, description="Nombre maximum de résultats"),
):
    """
    Liste toutes les segmentations disponibles.

    Args:
        project_id: Filtrer par projet (optionnel)
        limit: Nombre maximum de résultats

    Returns:
        Liste des segmentations avec métadonnées
    """
    service = get_segmenter_service()
    segmentations = service.list_segmentations(project_id=project_id)

    return segmentations[:limit]


@router.get("/{segmentation_id}/segments", response_model=List[SegmentResponse])
async def get_segments(segmentation_id: str):
    """
    Récupère uniquement les segments d'une segmentation.

    Args:
        segmentation_id: Identifiant de la segmentation

    Returns:
        Liste des segments
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    return [SegmentResponse(**s.to_dict()) for s in result.segments]


@router.get("/{segmentation_id}/segments/{segment_id}", response_model=SegmentResponse)
async def get_segment(segmentation_id: str, segment_id: str):
    """
    Récupère un segment spécifique.

    Args:
        segmentation_id: Identifiant de la segmentation
        segment_id: Identifiant du segment

    Returns:
        Le segment demandé
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    for segment in result.segments:
        if segment.id == segment_id:
            return SegmentResponse(**segment.to_dict())

    raise HTTPException(status_code=404, detail=f"Segment not found: {segment_id}")


@router.put(
    "/{segmentation_id}/segments/{segment_id}", response_model=SegmentationResponse
)
async def adjust_segment(
    segmentation_id: str, segment_id: str, request: AdjustSegmentRequest
):
    """
    Ajuste un segment spécifique.

    Actions disponibles:
    - **split**: Diviser le segment à une position donnée
    - **merge**: Fusionner avec le segment suivant
    - **edit**: Modifier le texte du segment

    Args:
        segmentation_id: Identifiant de la segmentation
        segment_id: Identifiant du segment à ajuster
        request: Paramètres de l'ajustement

    Returns:
        SegmentationResponse: La segmentation mise à jour
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    # Valider l'action
    valid_actions = ["split", "merge", "edit"]
    if request.action not in valid_actions:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid action: {request.action}. Must be one of {valid_actions}",
        )

    # Préparer les paramètres
    params = {}
    if request.split_at is not None:
        params["split_at"] = request.split_at
    if request.text is not None:
        params["text"] = request.text

    # Effectuer l'ajustement
    result = service.adjust_segment(result, segment_id, request.action, params)

    # Sauvegarder
    service.save_segmentation(result)

    logger.info(f"Segment {segment_id} adjusted with action: {request.action}")

    return SegmentationResponse(**result.to_dict())


@router.post("/{segmentation_id}/regenerate", response_model=SegmentationResponse)
async def regenerate_segmentation(
    segmentation_id: str, request: Optional[RegenerateRequest] = None
):
    """
    Re-segmente un script avec de nouveaux paramètres.

    Args:
        segmentation_id: Identifiant de la segmentation à regénérer
        request: Nouveaux paramètres (optionnel)

    Returns:
        SegmentationResponse: Nouvelle segmentation
    """
    service = get_segmenter_service()
    existing = service.load_segmentation(segmentation_id)

    if existing is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    # Utiliser les paramètres existants ou les nouveaux
    target_duration = existing.avg_segment_duration
    language = "fr"

    if request:
        if request.target_duration is not None:
            target_duration = request.target_duration
        if request.language is not None:
            language = request.language

    # Re-segmenter
    result = service.segment_script(
        text=existing.original_text,
        script_id=existing.script_id,
        project_id=existing.project_id,
        target_duration=target_duration,
        language=language,
    )

    # Sauvegarder
    service.save_segmentation(result)

    logger.info(f"Segmentation {segmentation_id} regenerated")

    return SegmentationResponse(**result.to_dict())


@router.delete("/{segmentation_id}")
async def delete_segmentation(segmentation_id: str):
    """
    Supprime une segmentation.

    Args:
        segmentation_id: Identifiant de la segmentation à supprimer

    Returns:
        Confirmation de suppression
    """
    service = get_segmenter_service()

    # Vérifier que la segmentation existe
    existing = service.load_segmentation(segmentation_id)
    if existing is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    # Supprimer
    deleted = service.delete_segmentation(segmentation_id)

    if deleted:
        logger.info(f"Segmentation {segmentation_id} deleted")
        return {"message": f"Segmentation {segmentation_id} deleted successfully"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete segmentation")


@router.get("/{segmentation_id}/export/prompts")
async def export_prompts(segmentation_id: str):
    """
    Exporte les prompts visuels et audio de tous les segments.

    Args:
        segmentation_id: Identifiant de la segmentation

    Returns:
        Liste des prompts pour chaque segment
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    prompts = []
    for segment in result.segments:
        prompts.append(
            {
                "sequence": segment.sequence,
                "segment_id": segment.id,
                "visual_prompt": segment.visual_prompt,
                "audio_prompt": segment.audio_prompt,
                "duration": segment.duration_seconds,
            }
        )

    return {
        "segmentation_id": segmentation_id,
        "total_segments": len(prompts),
        "prompts": prompts,
    }


@router.get("/{segmentation_id}/statistics")
async def get_statistics(segmentation_id: str):
    """
    Récupère les statistiques détaillées d'une segmentation.

    Args:
        segmentation_id: Identifiant de la segmentation

    Returns:
        Statistiques de la segmentation
    """
    service = get_segmenter_service()
    result = service.load_segmentation(segmentation_id)

    if result is None:
        raise HTTPException(
            status_code=404, detail=f"Segmentation not found: {segmentation_id}"
        )

    # Calculer les statistiques détaillées
    durations = [s.duration_seconds for s in result.segments]

    stats = {
        "segmentation_id": segmentation_id,
        "total_segments": len(result.segments),
        "total_duration": result.total_duration,
        "avg_segment_duration": result.avg_segment_duration,
        "min_segment_duration": min(durations) if durations else 0,
        "max_segment_duration": max(durations) if durations else 0,
        "natural_breaks": result.natural_breaks,
        "forced_breaks": result.forced_breaks,
        "natural_break_ratio": result.natural_breaks
        / (result.natural_breaks + result.forced_breaks)
        if (result.natural_breaks + result.forced_breaks) > 0
        else 0,
        "speakers_detected": list(set(s.speaker for s in result.segments if s.speaker)),
        "scene_types": {},
        "emotional_tones": {},
        "optimization_suggestions": result.optimization_suggestions,
    }

    # Compter les types de scène
    for segment in result.segments:
        scene_type = segment.scene_type or "unknown"
        stats["scene_types"][scene_type] = stats["scene_types"].get(scene_type, 0) + 1

    # Compter les tons émotionnels
    for segment in result.segments:
        tone = segment.emotional_tone or "neutral"
        stats["emotional_tones"][tone] = stats["emotional_tones"].get(tone, 0) + 1

    return stats


# ============== Endpoint de santé ==============


@router.get("/health/check")
async def health_check():
    """Vérification de santé du service de segmentation"""
    return {
        "status": "healthy",
        "service": "ScriptSegmenterService",
        "timestamp": datetime.utcnow().isoformat(),
    }
