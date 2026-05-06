"""
API REST pour la gestion des templates de prompts.

Endpoints disponibles:
- GET /api/prompt-templates - Lister les templates
- GET /api/prompt-templates/{id} - Récupérer un template
- POST /api/prompt-templates - Créer un template
- PUT /api/prompt-templates/{id} - Modifier un template
- DELETE /api/prompt-templates/{id} - Supprimer un template
- POST /api/prompt-templates/{id}/render - Rendre un template
- POST /api/prompt-templates/compose - Composer des templates
- GET /api/prompt-templates/statistics - Statistiques des templates
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import os
import sys

# Ajouter le chemin parent pour les imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.prompt_template_service import (
    PromptTemplateService,
    PromptTemplate,
    PromptVariable,
    PromptCategory,
    PromptLayer,
    get_template_service,
)


# === Modèles Pydantic pour l'API ===


class PromptVariableModel(BaseModel):
    """Modèle pour une variable de template"""

    name: str = Field(..., description="Nom de la variable")
    description: str = Field(..., description="Description de la variable")
    default_value: str = Field(default="", description="Valeur par défaut")
    required: bool = Field(default=True, description="Variable requise")
    type: str = Field(
        default="string", description="Type de variable (string, number, list, json)"
    )


class PromptTemplateCreate(BaseModel):
    """Modèle pour la création d'un template"""

    name: str = Field(..., description="Nom unique du template")
    description: str = Field(default="", description="Description du template")
    category: str = Field(
        default="video",
        description="Catégorie (video, voice, character, scene, seo, identity)",
    )
    layer: str = Field(
        default="master", description="Couche (foundation, execution, master)"
    )
    template: str = Field(
        ..., description="Contenu du template avec variables {variable_name}"
    )
    variables: List[PromptVariableModel] = Field(
        default_factory=list, description="Variables du template"
    )
    tags: List[str] = Field(default_factory=list, description="Tags pour le filtrage")
    author: str = Field(default="user", description="Auteur du template")
    version: str = Field(default="1.0", description="Version du template")
    parent_id: Optional[str] = Field(default=None, description="ID du template parent")


class PromptTemplateUpdate(BaseModel):
    """Modèle pour la mise à jour d'un template"""

    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    layer: Optional[str] = None
    template: Optional[str] = None
    variables: Optional[List[PromptVariableModel]] = None
    tags: Optional[List[str]] = None
    author: Optional[str] = None
    version: Optional[str] = None
    parent_id: Optional[str] = None


class RenderRequest(BaseModel):
    """Modèle pour une requête de rendu"""

    variables: Dict[str, Any] = Field(
        default_factory=dict, description="Variables pour le rendu"
    )


class ComposeRequest(BaseModel):
    """Modèle pour une requête de composition"""

    foundation_id: str = Field(..., description="ID du template foundation")
    execution_id: str = Field(..., description="ID du template execution")
    variables: Dict[str, Any] = Field(
        default_factory=dict, description="Variables pour le rendu"
    )


class RenderByNameRequest(BaseModel):
    """Modèle pour un rendu par nom"""

    name: str = Field(..., description="Nom du template")
    variables: Dict[str, Any] = Field(
        default_factory=dict, description="Variables pour le rendu"
    )


# === Routeur FastAPI ===

router = APIRouter(prefix="/api/prompt-templates", tags=["Prompt Templates"])


def get_service() -> PromptTemplateService:
    """Récupère l'instance du service de templates"""
    return get_template_service()


@router.get("")
async def list_templates(
    category: Optional[str] = Query(None, description="Filtrer par catégorie"),
    layer: Optional[str] = Query(None, description="Filtrer par couche"),
    tags: Optional[str] = Query(
        None, description="Filtrer par tags (séparés par des virgules)"
    ),
    search: Optional[str] = Query(None, description="Recherche textuelle"),
):
    """
    Liste tous les templates avec filtres optionnels.

    Args:
        category: Filtrer par catégorie (video, voice, character, scene, seo, identity)
        layer: Filtrer par couche (foundation, execution, master)
        tags: Tags séparés par des virgules
        search: Recherche dans le nom, description et tags

    Returns:
        Liste des templates correspondants aux filtres
    """
    service = get_service()

    # Convertir les filtres
    cat_enum = PromptCategory(category) if category else None
    layer_enum = PromptLayer(layer) if layer else None
    tag_list = [t.strip() for t in tags.split(",")] if tags else None

    templates = service.list_templates(
        category=cat_enum, layer=layer_enum, tags=tag_list, search=search
    )

    return {
        "success": True,
        "count": len(templates),
        "templates": [t.to_dict() for t in templates],
    }


@router.get("/statistics")
async def get_statistics():
    """
    Retourne des statistiques sur les templates.

    Returns:
        Statistiques par catégorie, couche et auteur
    """
    service = get_service()
    stats = service.get_statistics()
    return {"success": True, "statistics": stats}


@router.get("/categories")
async def list_categories():
    """
    Liste toutes les catégories disponibles.

    Returns:
        Liste des catégories avec leur description
    """
    return {
        "success": True,
        "categories": [{"value": c.value, "name": c.name} for c in PromptCategory],
    }


@router.get("/layers")
async def list_layers():
    """
    Liste toutes les couches disponibles.

    Returns:
        Liste des couches avec leur description
    """
    return {
        "success": True,
        "layers": [
            {
                "value": layer.value,
                "name": layer.name,
                "description": {
                    "foundation": "Prompt de base, définit la logique",
                    "execution": "Ajoute les pipelines et contraintes",
                    "master": "Combine tout, prêt à utiliser",
                }.get(layer.value, ""),
            }
            for layer in PromptLayer
        ],
    }


@router.get("/{template_id}")
async def get_template(template_id: str):
    """
    Récupère un template par son ID.

    Args:
        template_id: ID unique du template

    Returns:
        Le template complet avec toutes ses propriétés
    """
    service = get_service()
    template = service.get_template(template_id)

    if not template:
        raise HTTPException(
            status_code=404, detail=f"Template '{template_id}' non trouvé"
        )

    return {"success": True, "template": template.to_dict()}


@router.get("/by-name/{name}")
async def get_template_by_name(name: str):
    """
    Récupère un template par son nom.

    Args:
        name: Nom du template

    Returns:
        Le template complet avec toutes ses propriétés
    """
    service = get_service()
    template = service.get_template_by_name(name)

    if not template:
        raise HTTPException(status_code=404, detail=f"Template '{name}' non trouvé")

    return {"success": True, "template": template.to_dict()}


@router.get("/{template_id}/schema")
async def get_template_schema(template_id: str):
    """
    Récupère le schéma JSON d'un template pour validation.

    Args:
        template_id: ID unique du template

    Returns:
        Schéma JSON pour valider les variables
    """
    service = get_service()
    schema = service.get_template_schema(template_id)

    if not schema:
        raise HTTPException(
            status_code=404, detail=f"Template '{template_id}' non trouvé"
        )

    return {"success": True, "schema": schema}


@router.post("")
async def create_template(template_data: PromptTemplateCreate):
    """
    Crée un nouveau template.

    Args:
        template_data: Données du template à créer

    Returns:
        Le template créé avec son ID
    """
    service = get_service()

    try:
        # Convertir les variables
        variables = [
            PromptVariable(
                name=v.name,
                description=v.description,
                default_value=v.default_value,
                required=v.required,
                type=v.type,
            )
            for v in template_data.variables
        ]

        # Créer le template
        template = PromptTemplate(
            name=template_data.name,
            description=template_data.description,
            category=PromptCategory(template_data.category),
            layer=PromptLayer(template_data.layer),
            template=template_data.template,
            variables=variables,
            tags=template_data.tags,
            author=template_data.author,
            version=template_data.version,
            parent_id=template_data.parent_id,
        )

        created = service.create_template(template)

        return {
            "success": True,
            "message": "Template créé avec succès",
            "template": created.to_dict(),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de la création: {str(e)}"
        )


@router.put("/{template_id}")
async def update_template(template_id: str, updates: PromptTemplateUpdate):
    """
    Met à jour un template existant.

    Args:
        template_id: ID du template à mettre à jour
        updates: Données à mettre à jour

    Returns:
        Le template mis à jour
    """
    service = get_service()

    # Préparer les mises à jour
    update_dict = updates.dict(exclude_unset=True)

    # Convertir les variables si présentes
    if "variables" in update_dict and update_dict["variables"]:
        update_dict["variables"] = [
            PromptVariable(
                name=v.name,
                description=v.description,
                default_value=v.default_value,
                required=v.required,
                type=v.type,
            )
            for v in update_dict["variables"]
        ]

    try:
        updated = service.update_template(template_id, update_dict)

        if not updated:
            raise HTTPException(
                status_code=404, detail=f"Template '{template_id}' non trouvé"
            )

        return {
            "success": True,
            "message": "Template mis à jour avec succès",
            "template": updated.to_dict(),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}"
        )


@router.delete("/{template_id}")
async def delete_template(template_id: str):
    """
    Supprime un template.

    Args:
        template_id: ID du template à supprimer

    Returns:
        Confirmation de suppression
    """
    service = get_service()

    deleted = service.delete_template(template_id)

    if not deleted:
        raise HTTPException(
            status_code=404, detail=f"Template '{template_id}' non trouvé"
        )

    return {
        "success": True,
        "message": f"Template '{template_id}' supprimé avec succès",
    }


@router.post("/{template_id}/render")
async def render_template(template_id: str, request: RenderRequest):
    """
    Rend un template avec les variables fournies.

    Args:
        template_id: ID du template à rendre
        request: Variables pour le rendu

    Returns:
        Le template rendu avec les variables substituées
    """
    service = get_service()
    result = service.render_template(template_id, request.variables)

    if not result.get("success"):
        if "non trouvé" in result.get("error", ""):
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(
            status_code=400, detail=result.get("error", "Erreur de rendu")
        )

    return result


@router.post("/render-by-name")
async def render_template_by_name(request: RenderByNameRequest):
    """
    Rend un template par son nom.

    Args:
        request: Nom du template et variables pour le rendu

    Returns:
        Le template rendu avec les variables substituées
    """
    service = get_service()
    result = service.render_template_by_name(request.name, request.variables)

    if not result.get("success"):
        if "non trouvé" in result.get("error", ""):
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(
            status_code=400, detail=result.get("error", "Erreur de rendu")
        )

    return result


@router.post("/compose")
async def compose_templates(request: ComposeRequest):
    """
    Compose deux templates (pattern en couches).

    Le template foundation est rendu en premier, puis injecté
    dans le template execution via la variable {foundation_prompt}.

    Args:
        request: IDs des templates et variables communes

    Returns:
        Le résultat de la composition
    """
    service = get_service()
    result = service.compose_templates(
        request.foundation_id, request.execution_id, request.variables
    )

    if not result.get("success"):
        if "non trouvé" in result.get("error", ""):
            raise HTTPException(status_code=404, detail=result["error"])
        raise HTTPException(
            status_code=400, detail=result.get("error", "Erreur de composition")
        )

    return result


@router.post("/duplicate/{template_id}")
async def duplicate_template(
    template_id: str, new_name: str = Query(..., description="Nouveau nom du template")
):
    """
    Duplique un template existant avec un nouveau nom.

    Args:
        template_id: ID du template à dupliquer
        new_name: Nouveau nom pour le template dupliqué

    Returns:
        Le nouveau template créé
    """
    service = get_service()

    # Récupérer le template source
    source = service.get_template(template_id)
    if not source:
        raise HTTPException(
            status_code=404, detail=f"Template '{template_id}' non trouvé"
        )

    try:
        # Créer une copie avec un nouvel ID et nom
        new_template = PromptTemplate(
            name=new_name,
            description=source.description,
            category=source.category,
            layer=source.layer,
            template=source.template,
            variables=source.variables.copy(),
            tags=source.tags.copy(),
            author="user",  # L'auteur devient l'utilisateur qui duplique
            version="1.0",
            parent_id=source.id,  # Référence au template source
        )

        created = service.create_template(new_template)

        return {
            "success": True,
            "message": "Template dupliqué avec succès",
            "source_id": template_id,
            "template": created.to_dict(),
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Erreur lors de la duplication: {str(e)}"
        )


# === Fonction pour intégrer le routeur ===


def include_prompt_template_routes(app):
    """
    Intègre les routes de templates de prompts dans l'application FastAPI.

    Usage:
        from backend.prompt_template_api import include_prompt_template_routes
        include_prompt_template_routes(app)
    """
    app.include_router(router)


# === Point d'entrée pour test ===

if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI

    app = FastAPI(
        title="Prompt Templates API",
        description="API de gestion des templates de prompts optimisés",
        version="1.0.0",
    )

    include_prompt_template_routes(app)

    print("🚀 Démarrage du serveur Prompt Templates API...")
    print("📖 Documentation: http://localhost:8001/docs")

    uvicorn.run(app, host="0.0.0.0", port=8001)
