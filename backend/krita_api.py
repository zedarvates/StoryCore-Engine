from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
from backend.krita_layer_service import KritaLayerService
import os

router = APIRouter(tags=["Krita / Precepts"])

@router.get("/cine/krita/layers")
async def get_layers(path: str = Query(..., description="Absolute path to the .kra file")):
    """
    Returns the list of layers in a Krita file.
    """
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Krita file not found: {path}")
    
    layers = KritaLayerService.get_kra_layers(path)
    return {"layers": layers}

@router.get("/cine/krita/composition")
async def get_composition(
    path: str = Query(..., description="Absolute path to the .kra file"),
    narrative_context: Optional[str] = Query(None, description="Narrative string for auto-tinting")
):
    """
    Returns all layers as base64 images, potentially tinted by narrative context.
    """
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Krita file not found: {path}")

    # Logic for narrative overrides could be enhanced here or in the service
    # For now, we perform a basic extraction
    overrides = {}
    if narrative_context:
        # Example logic: if 'desert' in context, 'Sol' becomes sand color
        low_ctx = narrative_context.lower()
        if any(w in low_ctx for w in ["desert", "désert", "sable", "sand"]):
            overrides["Sol"] = "#EEDDAA"
            overrides["Ground"] = "#EEDDAA"
        if any(w in low_ctx for w in ["nuit", "night", "obscur"]):
            overrides["Ciel"] = "#000033"
            overrides["Sky"] = "#000033"

    comp = KritaLayerService.get_full_composition(path, overrides)
    return {"composition": comp, "applied_overrides": overrides}
