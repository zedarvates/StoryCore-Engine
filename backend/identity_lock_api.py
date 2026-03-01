"""
API REST pour le système Identity Lock.

Endpoints pour la gestion des identités de personnages:
- Création, lecture, mise à jour, suppression
- Extraction et verrouillage des attributs visuels
- Application aux prompts de génération

StoryCore-Engine - Identity Lock API
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel, Field

from backend.auth import verify_jwt_token
from backend.identity_lock_service import (
    get_identity_lock_service,
    IdentityProfile,
    VisualAttributes
)
from backend.identity_extraction import (
    get_extraction_service,
    IdentityExtractionService,
    ExtractionResult,
    validate_image_path
)

logger = logging.getLogger(__name__)

# Créer le routeur
router = APIRouter(
    prefix="/identity",
    tags=["identity-lock"],
    responses={404: {"description": "Identity not found"}}
)


# ============ Modèles Pydantic pour l'API ============

class VisualAttributesModel(BaseModel):
    """Modèle pour les attributs visuels"""
    face_shape: str = Field(default="", description="Forme du visage: oval, round, square, heart")
    skin_tone: str = Field(default="", description="Tone de peau")
    eye_color: str = Field(default="", description="Couleur des yeux")
    hair_color: str = Field(default="", description="Couleur des cheveux")
    hair_style: str = Field(default="", description="Style de coiffure")
    hair_length: str = Field(default="", description="Longueur des cheveux")
    body_type: str = Field(default="", description="Type de corps")
    height: str = Field(default="", description="Taille: tall, average, short")
    age_appearance: str = Field(default="", description="Apparence d'âge")
    clothing_style: str = Field(default="", description="Style vestimentaire")
    accessories: List[str] = Field(default_factory=list, description="Accessoires")
    distinctive_features: List[str] = Field(default_factory=list, description="Traits distinctifs")
    scars_marks: List[str] = Field(default_factory=list, description="Cicatrices et marques")
    extraction_confidence: float = Field(default=0.0, description="Score de confiance de l'extraction")
    source_image_path: str = Field(default="", description="Chemin de l'image source")


class CreateIdentityRequest(BaseModel):
    """Requête de création d'identité"""
    name: str = Field(..., description="Nom du personnage", min_length=1, max_length=100)
    description: str = Field(default="", description="Description du personnage", max_length=1000)
    project_id: str = Field(..., description="ID du projet associé")
    source_image_path: Optional[str] = Field(default=None, description="Chemin vers l'image source optionnelle")


class UpdateIdentityRequest(BaseModel):
    """Requête de mise à jour d'identité"""
    name: Optional[str] = Field(default=None, description="Nouveau nom")
    description: Optional[str] = Field(default=None, description="Nouvelle description")
    visual_attributes: Optional[Dict[str, Any]] = Field(default=None, description="Attributs visuels à mettre à jour")
    is_locked: Optional[bool] = Field(default=None, description="État de verrouillage")


class ExtractAttributesRequest(BaseModel):
    """Requête d'extraction des attributs visuels"""
    image_path: str = Field(..., description="Chemin vers l'image à analyser")
    use_llm: bool = Field(default=True, description="Utiliser LLM Vision pour l'extraction")


class ApplyIdentityRequest(BaseModel):
    """Requête d'application d'identité à un prompt"""
    scene_description: str = Field(..., description="Description de la scène")
    scene_type: str = Field(default="default", description="Type de scène: default, close_up, medium_shot, full_body, action, emotional, outdoor, indoor, night")


class IdentityResponse(BaseModel):
    """Réponse pour un profil d'identité"""
    id: str
    name: str
    description: str
    visual_attributes: VisualAttributesModel
    base_prompt: str
    variation_prompts: Dict[str, str]
    created_at: str
    updated_at: str
    project_id: str
    is_locked: bool


class IdentityListResponse(BaseModel):
    """Réponse pour la liste des identités"""
    identities: List[IdentityResponse]
    total: int


class ApplyIdentityResponse(BaseModel):
    """Réponse pour l'application d'identité"""
    prompt: str
    identity_id: str
    identity_name: str


class ImportIdentityRequest(BaseModel):
    """Requête d'import d'identité"""
    json_data: str = Field(..., description="Données JSON de l'identité à importer")


# ============ Endpoints ============

@router.post("", response_model=IdentityResponse, status_code=201)
async def create_identity(request: CreateIdentityRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Crée un nouveau profil d'identité.
    
    Le profil est créé non verrouillé. Utilisez /identity/{id}/extract
    pour extraire et verrouiller les attributs visuels.
    """
    try:
        service = get_identity_lock_service()
        identity = await service.create_identity(
            name=request.name,
            description=request.description,
            project_id=request.project_id,
            source_image_path=request.source_image_path,
            owner_id=user_id
        )
        return _identity_to_response(identity)
    except Exception as e:
        logger.error(f"Error creating identity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=IdentityListResponse)
async def list_identities(
    project_id: Optional[str] = Query(default=None, description="Filtrer par ID de projet"),
    user_id: str = Depends(verify_jwt_token)
):
    """
    Liste toutes les identités.
    
    Optionnellement filtrées par projet.
    """
    try:
        service = get_identity_lock_service()
        identities = await service.list_identities(project_id=project_id, owner_id=user_id)
        return IdentityListResponse(
            identities=[_identity_to_response(i) for i in identities],
            total=len(identities)
        )
    except Exception as e:
        logger.error(f"Error listing identities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=IdentityListResponse)
async def search_identities(
    name: str = Query(..., description="Nom à rechercher (recherche partielle)"),
    user_id: str = Depends(verify_jwt_token)
):
    """
    Recherche des identités par nom.
    
    La recherche est insensible à la casse et partielle.
    """
    try:
        service = get_identity_lock_service()
        identities = await service.get_identities_by_name(name, owner_id=user_id)
        return IdentityListResponse(
            identities=[_identity_to_response(i) for i in identities],
            total=len(identities)
        )
    except Exception as e:
        logger.error(f"Error searching identities: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{identity_id}", response_model=IdentityResponse)
async def get_identity(identity_id: str, user_id: str = Depends(verify_jwt_token)):
    """
    Récupère un profil d'identité par son ID.
    """
    try:
        service = get_identity_lock_service()
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        # Vérifier que l'utilisateur est propriétaire de l'identité
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        return _identity_to_response(identity)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{identity_id}", response_model=IdentityResponse)
async def update_identity(identity_id: str, request: UpdateIdentityRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Met à jour un profil d'identité.
    
    Seules les identités non verrouillées peuvent être modifiées.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        # Construire le dictionnaire des mises à jour
        updates = {}
        if request.name is not None:
            updates["name"] = request.name
        if request.description is not None:
            updates["description"] = request.description
        if request.visual_attributes is not None:
            updates["visual_attributes"] = request.visual_attributes
        if request.is_locked is not None:
            updates["is_locked"] = request.is_locked
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        updated_identity = await service.update_identity(identity_id, updates)
        return _identity_to_response(updated_identity)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        elif "locked" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{identity_id}", status_code=204)
async def delete_identity(identity_id: str, user_id: str = Depends(verify_jwt_token)):
    """
    Supprime un profil d'identité.
    
    Note: Les identités verrouillées peuvent aussi être supprimées.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        deleted = await service.delete_identity(identity_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{identity_id}/extract", response_model=IdentityResponse)
async def extract_and_lock_attributes(identity_id: str, request: ExtractAttributesRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Extrait les attributs visuels depuis une image et verrouille l'identité.
    
    Une fois verrouillée, l'identité ne peut plus être modifiée (sauf déverrouillage).
    L'extraction utilise LLM Vision si use_llm=true.
    """
    try:
        # Valider le chemin de l'image pour prévenir le path traversal
        try:
            validated_image_path = validate_image_path(request.image_path)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        updated_identity = await service.extract_and_lock_attributes(
            identity_id=identity_id,
            image_path=validated_image_path,
            use_llm=request.use_llm
        )
        return _identity_to_response(updated_identity)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        elif "already locked" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting attributes for {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{identity_id}/apply", response_model=ApplyIdentityResponse)
async def apply_identity_to_prompt(identity_id: str, request: ApplyIdentityRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Applique l'identité verrouillée à un prompt de scène.
    
    Génère un prompt complet combinant les attributs verrouillés
    avec la description de scène fournie.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        prompt = await service.apply_identity_to_prompt(
            identity_id=identity_id,
            scene_description=request.scene_description,
            scene_type=request.scene_type
        )
        
        return ApplyIdentityResponse(
            prompt=prompt,
            identity_id=identity_id,
            identity_name=identity.name if identity else ""
        )
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        elif "not locked" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error applying identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{identity_id}/unlock", response_model=IdentityResponse)
async def unlock_identity(identity_id: str, user_id: str = Depends(verify_jwt_token)):
    """
    Déverrouille une identité pour permettre les modifications.
    
    Attention: Cette opération doit être utilisée avec précaution
    car elle peut compromettre la cohérence visuelle.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        updated_identity = await service.unlock_identity(identity_id)
        return _identity_to_response(updated_identity)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlocking identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{identity_id}/export")
async def export_identity(identity_id: str, user_id: str = Depends(verify_jwt_token)):
    """
    Exporte une identité en format JSON.
    
    Utile pour sauvegarder ou transférer des identités entre projets.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        json_data = await service.export_identity(identity_id)
        return {"identity_id": identity_id, "json_data": json_data}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting identity {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import", response_model=IdentityResponse, status_code=201)
async def import_identity(request: ImportIdentityRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Importe une identité depuis un JSON.
    
    L'identité importée reçoit un nouvel ID et n'est pas verrouillée.
    """
    try:
        service = get_identity_lock_service()
        identity = await service.import_identity(request.json_data, owner_id=user_id)
        return _identity_to_response(identity)
    except Exception as e:
        logger.error(f"Error importing identity: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON data: {str(e)}")


@router.put("/{identity_id}/attributes", response_model=IdentityResponse)
async def update_visual_attributes(
    identity_id: str,
    attributes: Dict[str, Any] = Body(..., description="Attributs visuels à mettre à jour"),
    confidence: Optional[float] = Query(default=None, description="Score de confiance"),
    user_id: str = Depends(verify_jwt_token)
):
    """
    Met à jour les attributs visuels d'une identité.
    
    Seules les identités non verrouillées peuvent être modifiées.
    """
    try:
        service = get_identity_lock_service()
        
        # Vérifier que l'utilisateur est propriétaire de l'identité
        identity = await service.get_identity(identity_id)
        if not identity:
            raise HTTPException(status_code=404, detail=f"Identity {identity_id} not found")
        if hasattr(identity, 'owner_id') and identity.owner_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied to this identity")
        
        updated_identity = await service.update_visual_attributes(
            identity_id=identity_id,
            attributes=attributes,
            confidence=confidence
        )
        return _identity_to_response(updated_identity)
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(status_code=404, detail=str(e))
        elif "locked" in str(e):
            raise HTTPException(status_code=403, detail=str(e))
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating attributes for {identity_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============ Fonctions utilitaires ============

def _identity_to_response(identity: IdentityProfile) -> IdentityResponse:
    """Convertit un IdentityProfile en réponse API"""
    return IdentityResponse(
        id=identity.id,
        name=identity.name,
        description=identity.description,
        visual_attributes=VisualAttributesModel(
            face_shape=identity.visual_attributes.face_shape,
            skin_tone=identity.visual_attributes.skin_tone,
            eye_color=identity.visual_attributes.eye_color,
            hair_color=identity.visual_attributes.hair_color,
            hair_style=identity.visual_attributes.hair_style,
            hair_length=identity.visual_attributes.hair_length,
            body_type=identity.visual_attributes.body_type,
            height=identity.visual_attributes.height,
            age_appearance=identity.visual_attributes.age_appearance,
            clothing_style=identity.visual_attributes.clothing_style,
            accessories=identity.visual_attributes.accessories,
            distinctive_features=identity.visual_attributes.distinctive_features,
            scars_marks=identity.visual_attributes.scars_marks,
            extraction_confidence=identity.visual_attributes.extraction_confidence,
            source_image_path=identity.visual_attributes.source_image_path
        ),
        base_prompt=identity.base_prompt,
        variation_prompts=identity.variation_prompts,
        created_at=identity.created_at.isoformat(),
        updated_at=identity.updated_at.isoformat(),
        project_id=identity.project_id,
        is_locked=identity.is_locked
    )


# ============ Endpoints pour l'extraction Vision ============

class ExtractionResponse(BaseModel):
    """Réponse pour l'extraction d'attributs"""
    success: bool
    attributes: VisualAttributesModel
    confidence: float
    provider: str
    model: str
    extraction_time_ms: int
    error_message: Optional[str] = None


class VisionAvailabilityResponse(BaseModel):
    """Réponse pour la vérification de disponibilité Vision"""
    provider: str
    model: str
    available: bool
    message: str


class BatchExtractRequest(BaseModel):
    """Requête pour l'extraction batch depuis plusieurs images"""
    image_paths: List[str] = Field(..., description="Liste des chemins d'images")
    merge_results: bool = Field(default=True, description="Fusionner les résultats")


class CreateAndExtractRequest(BaseModel):
    """Requête pour créer une identité et extraire les attributs en une seule opération"""
    name: str = Field(..., description="Nom du personnage", min_length=1, max_length=100)
    description: str = Field(default="", description="Description du personnage")
    project_id: str = Field(..., description="ID du projet associé")
    image_path: str = Field(..., description="Chemin vers l'image à analyser")


@router.get("/vision/availability", response_model=VisionAvailabilityResponse)
async def check_vision_availability(user_id: str = Depends(verify_jwt_token)):
    """
    Vérifie la disponibilité du service LLM Vision.
    
    Retourne des informations sur le fournisseur et le modèle configurés,
    ainsi que leur disponibilité.
    """
    try:
        extraction_service = get_extraction_service()
        result = await extraction_service.check_availability()
        return VisionAvailabilityResponse(**result)
    except Exception as e:
        logger.error(f"Error checking vision availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract", response_model=ExtractionResponse)
async def extract_attributes_from_image(request: ExtractAttributesRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Extrait les attributs visuels depuis une image sans créer d'identité.
    
    Utile pour prévisualiser les résultats de l'extraction avant de
    créer une identité formelle.
    """
    try:
        # Valider le chemin de l'image pour prévenir le path traversal
        try:
            validated_image_path = validate_image_path(request.image_path)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        extraction_service = get_extraction_service()
        result = await extraction_service.extract_attributes(validated_image_path)
        
        return ExtractionResponse(
            success=result.success,
            attributes=VisualAttributesModel(
                face_shape=result.attributes.face_shape,
                skin_tone=result.attributes.skin_tone,
                eye_color=result.attributes.eye_color,
                hair_color=result.attributes.hair_color,
                hair_style=result.attributes.hair_style,
                hair_length=result.attributes.hair_length,
                body_type=result.attributes.body_type,
                height=result.attributes.height,
                age_appearance=result.attributes.age_appearance,
                clothing_style=result.attributes.clothing_style,
                accessories=result.attributes.accessories,
                distinctive_features=result.attributes.distinctive_features,
                scars_marks=result.attributes.scars_marks,
                extraction_confidence=result.attributes.extraction_confidence,
                source_image_path=result.attributes.source_image_path
            ),
            confidence=result.confidence,
            provider=result.provider,
            model=result.model,
            extraction_time_ms=result.extraction_time_ms,
            error_message=result.error_message
        )
    except Exception as e:
        logger.error(f"Error extracting attributes: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract/batch", response_model=List[ExtractionResponse])
async def batch_extract_attributes(request: BatchExtractRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Extrait les attributs visuels depuis plusieurs images.
    
    Si merge_results=true, les résultats sont fusionnés pour une meilleure
    précision. Sinon, retourne un résultat par image.
    """
    try:
        # Valider tous les chemins d'images pour prévenir le path traversal
        validated_paths = []
        for image_path in request.image_paths:
            try:
                validated_paths.append(validate_image_path(image_path))
            except ValueError as e:
                raise HTTPException(status_code=400, detail=f"Invalid path '{image_path}': {str(e)}")
        
        extraction_service = get_extraction_service()
        results = await extraction_service.batch_extract(
            image_paths=validated_paths,
            merge_results=request.merge_results
        )
        
        return [
            ExtractionResponse(
                success=r.success,
                attributes=VisualAttributesModel(
                    face_shape=r.attributes.face_shape,
                    skin_tone=r.attributes.skin_tone,
                    eye_color=r.attributes.eye_color,
                    hair_color=r.attributes.hair_color,
                    hair_style=r.attributes.hair_style,
                    hair_length=r.attributes.hair_length,
                    body_type=r.attributes.body_type,
                    height=r.attributes.height,
                    age_appearance=r.attributes.age_appearance,
                    clothing_style=r.attributes.clothing_style,
                    accessories=r.attributes.accessories,
                    distinctive_features=r.attributes.distinctive_features,
                    scars_marks=r.attributes.scars_marks,
                    extraction_confidence=r.attributes.extraction_confidence,
                    source_image_path=r.attributes.source_image_path
                ),
                confidence=r.confidence,
                provider=r.provider,
                model=r.model,
                extraction_time_ms=r.extraction_time_ms,
                error_message=r.error_message
            )
            for r in results
        ]
    except Exception as e:
        logger.error(f"Error in batch extraction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-and-extract", response_model=IdentityResponse, status_code=201)
async def create_and_extract_identity(request: CreateAndExtractRequest, user_id: str = Depends(verify_jwt_token)):
    """
    Crée une identité et extrait les attributs visuels en une seule opération.
    
    Cette opération:
    1. Crée un nouveau profil d'identité
    2. Extrait les attributs visuels via LLM Vision
    3. Verrouille l'identité automatiquement
    
    Utile pour créer rapidement un personnage cohérent depuis une image de référence.
    """
    try:
        # Valider le chemin de l'image pour prévenir le path traversal
        try:
            validated_image_path = validate_image_path(request.image_path)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Créer l'identité
        identity_service = get_identity_lock_service()
        identity = await identity_service.create_identity(
            name=request.name,
            description=request.description,
            project_id=request.project_id,
            source_image_path=validated_image_path,
            owner_id=user_id
        )
        
        # Extraire les attributs
        extraction_service = get_extraction_service()
        extraction_result = await extraction_service.extract_attributes(validated_image_path)
        
        if extraction_result.success:
            # Mettre à jour les attributs
            identity.visual_attributes = extraction_result.attributes
            identity.visual_attributes.source_image_path = validated_image_path
        
        # Extraire et verrouiller les attributs via le service
        identity = await identity_service.extract_and_lock_attributes(
            identity_id=identity.id,
            image_path=validated_image_path,
            use_llm=True
        )
        
        return _identity_to_response(identity)
        
    except Exception as e:
        logger.error(f"Error in create-and-extract: {e}")
        raise HTTPException(status_code=500, detail=str(e))
