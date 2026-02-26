"""
Comic Generator Main Entry Point
FastAPI router that exposes the comic generation REST API.
Registered under /api/addons/comic_generator/
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

try:
    from fastapi import APIRouter, BackgroundTasks, HTTPException
    from fastapi.responses import FileResponse, JSONResponse
    from pydantic import BaseModel
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False
    logger.warning("[ComicGenerator] FastAPI not available – REST API disabled")

from .types import ComicStyle
from .comic_pipeline import ComicPipeline

# ============================================================================
# Singleton Pipeline
# ============================================================================

_pipeline: Optional[ComicPipeline] = None


def get_pipeline() -> ComicPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = ComicPipeline(
            output_dir="data/assets/comics",
            comfyui_endpoint="http://localhost:8188",
        )
    return _pipeline


# ============================================================================
# Pydantic Models (request/response)
# ============================================================================

if HAS_FASTAPI:
    class GeneratePageRequest(BaseModel):
        project_id: str
        story_context: str
        characters: List[Dict[str, Any]] = []
        locations: List[Dict[str, Any]] = []
        objects: List[Dict[str, Any]] = []
        style: str = "manga"
        generate_images: bool = False
        panels_count: int = 4
        narrative_direction: Optional[str] = None

    class RegeneratePanelRequest(BaseModel):
        project_id: str
        page_id: str
        chapter_id: str
        page_number: int
        panel_index: int
        generate_image: bool = True

    class ExportRequest(BaseModel):
        project_id: str
        format: str = "json"  # "json" | "pdf"
        output_path: Optional[str] = None

    # ============================================================================
    # FastAPI Router
    # ============================================================================

    router = APIRouter(tags=["Comic Generator"])

    @router.get("/status")
    async def get_status():
        """Health check and addon info."""
        return {
            "addon": "comic_generator",
            "version": "1.0.0",
            "status": "active",
            "supported_styles": [s.value for s in ComicStyle],
        }

    @router.get("/state/{project_id}")
    async def get_state(project_id: str):
        """Get the current comic state for a project."""
        pipeline = get_pipeline()
        state = pipeline.load_state(project_id)
        if not state:
            return {"exists": False, "project_id": project_id}
        
        return {
            "exists": True,
            "project_id": state.project_id,
            "progression": state.progression,
            "total_pages": state.total_pages,
            "style": state.style_preset.value,
            "chapters": state.chapters,
            "last_page_generated": state.last_page_generated,
            "narrative_summary": (
                state.narrative_checkpoint.story_summary
                if state.narrative_checkpoint else None
            ),
        }

    @router.post("/generate")
    async def generate_page(req: GeneratePageRequest):
        """Generate the next comic page for a project."""
        pipeline = get_pipeline()
        try:
            style = ComicStyle(req.style)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid style '{req.style}'. Valid: {[s.value for s in ComicStyle]}"
            )

        result = await pipeline.generate_next_page(
            project_id=req.project_id,
            story_context=req.story_context,
            characters=req.characters,
            locations=req.locations,
            objects=req.objects,
            style=style,
            generate_images=req.generate_images,
            panels_count=req.panels_count,
            narrative_direction=req.narrative_direction,
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        # Serialize page
        page = result.page
        page_data = {
            "id": page.id,
            "chapter_id": page.chapter_id,
            "page_number": page.page_number,
            "narrative_summary": page.narrative_summary,
            "emotional_tone": page.emotional_tone,
            "arc_position": page.arc_position,
            "style": page.style.value,
            "layout_template": page.layout_template,
            "panels": [
                {
                    "id": p.id,
                    "panel_index": p.panel_index,
                    "characters": p.character_names,
                    "location": p.location,
                    "visual_cue": p.visual_cue,
                    "image_prompt": p.image_prompt,
                    "narrative_beat": p.narrative_beat.value,
                    "panel_size": p.panel_size,
                    "dialogue": [
                        {
                            "character": d.character_name,
                            "text": d.text,
                            "bubble_shape": d.bubble_shape.value,
                            "bubble_color": d.bubble_color,
                        }
                        for d in p.dialogue
                    ],
                    "generated_image_path": p.generated_image_path,
                }
                for p in page.panels
            ],
        }
        return {"success": True, "page": page_data}

    @router.post("/regenerate_panel")
    async def regenerate_panel(req: RegeneratePanelRequest):
        """Regenerate a single panel with a new seed."""
        pipeline = get_pipeline()
        page = pipeline.load_page(req.project_id, req.chapter_id, req.page_number)
        if not page:
            raise HTTPException(status_code=404, detail="Page not found")

        new_path = await pipeline.regenerate_panel(
            project_id=req.project_id,
            page=page,
            panel_index=req.panel_index,
            generate_image=req.generate_image,
        )
        return {"success": True, "new_image_path": new_path}

    @router.get("/history/{project_id}")
    async def get_history(project_id: str):
        """Get all generated pages history for a project."""
        pipeline = get_pipeline()
        state = pipeline.load_state(project_id)
        if not state:
            return {"project_id": project_id, "chapters": []}

        history = []
        for chapter_id in state.chapters:
            pages = pipeline.get_chapter_pages(project_id, chapter_id)
            history.append({"chapter_id": chapter_id, "pages": pages})

        return {
            "project_id": project_id,
            "total_pages": state.total_pages,
            "chapters": history,
        }

    @router.post("/export")
    async def export_comic(req: ExportRequest):
        """Export comic to JSON or PDF."""
        pipeline = get_pipeline()

        if req.format == "pdf":
            result = await pipeline.export_to_pdf(req.project_id, req.output_path)
        else:
            result = await pipeline.export_to_json(req.project_id, req.output_path)

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        return {
            "success": True,
            "format": result.format,
            "output_path": result.output_path,
            "pages_exported": result.pages_exported,
        }

    @router.get("/panel_image")
    async def get_panel_image(image_path: str):
        """Serve a generated panel image."""
        from pathlib import Path
        # Security: Validate path to prevent path traversal attacks
        base_dir = Path("data/assets/comics").resolve()
        try:
            path = Path(image_path).resolve()
        except (OSError, ValueError) as e:
            raise HTTPException(status_code=400, detail=f"Invalid path: {e}")
        
        # Ensure the resolved path is within the allowed base directory
        if not str(path).startswith(str(base_dir)):
            raise HTTPException(status_code=403, detail="Access denied: path outside allowed directory")
        
        if not path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        return FileResponse(str(path))

    # ============================================================================
    # Narrative Extraction (continuité inter-chapitres)
    # ============================================================================

    class ExtractNarrativeRequest(BaseModel):
        project_id: str
        comic_json_path: Optional[str] = None  # Si None : utilise l'export auto du projet
        chapter_id: Optional[str] = None
        chapter_number: int = 1

    @router.post("/extract")
    async def extract_narrative(req: ExtractNarrativeRequest):
        """
        Extrait la continuité narrative d'un chapitre BD terminé.

        Produit un ChapterContinuityPackage sauvegardé dans
        data/continuity/<project_id>/chapter_<N>.json

        Contient :
          • Personnages avec état émotionnel/physique post-chapitre
          • Lieux visités avec atmosphère et événements clés
          • Objets narratifs (acquis, perdus, symboles)
          • Arcs ouverts / fermés
          • Mémoire à 3 niveaux (local / arc / global)
          • Cliffhanger + suggestion d'accroche pour le chapitre suivant
        """
        import json as _json
        from pathlib import Path
        try:
            from addons.official.recap_engine.src.narrative_extractor import NarrativeExtractor
        except ImportError:
            raise HTTPException(
                status_code=503,
                detail="NarrativeExtractor non disponible. Le Recap Engine doit être installé."
            )

        pipeline = get_pipeline()

        # Trouver le JSON d'export
        if req.comic_json_path:
            comic_path = Path(req.comic_json_path)
        else:
            # Chemin auto-détecté depuis le pipeline
            comic_path = Path(pipeline.output_dir) / req.project_id / "export" / "comic_export.json"

        if not comic_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Export BD introuvable : {comic_path}. Lancez d'abord /export."
            )

        try:
            comic_data = _json.loads(comic_path.read_text(encoding="utf-8"))
            comic_data.setdefault("project_id", req.project_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur lecture JSON BD : {e}")

        extractor = NarrativeExtractor(output_dir="data/continuity")
        previous = extractor.load_package(req.project_id, req.chapter_number - 1)

        result = extractor.extract_from_comic_chapter(
            comic_data=comic_data,
            chapter_id=req.chapter_id,
            chapter_number=req.chapter_number,
            previous_package=previous,
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        pkg = result.package
        return {
            "success": True,
            "package_id": pkg.package_id,
            "chapter_number": pkg.chapter_number,
            "chapter_title": pkg.chapter_title,
            "chapter_summary": pkg.chapter_summary,
            "cliffhanger": pkg.cliffhanger,
            "opening_hook_next": pkg.opening_hook_next,
            "global_story_progression": pkg.global_story_progression,
            "characters": [
                {
                    "id": c.character_id,
                    "name": c.character_name,
                    "role": c.role,
                    "emotional_state": c.emotional_state,
                    "physical_state": c.physical_state,
                    "arc_status": c.arc_status,
                    "last_location": c.last_location,
                    "memorable_quotes": c.memorable_quotes,
                    "chapter_importance": round(c.chapter_importance, 2),
                }
                for c in pkg.characters
            ],
            "locations": [
                {"name": l.location_name, "atmosphere": l.atmosphere, "importance": round(l.importance, 2)}
                for l in pkg.locations
            ],
            "arcs": [
                {"title": a.title, "status": a.status, "tension_level": round(a.tension_level, 2)}
                for a in pkg.arcs
            ],
            "warnings": result.warnings,
        }

    @router.get("/continuity/{project_id}")
    async def list_continuity(project_id: str):
        """Liste tous les packages de continuité (chapitres extractés) d'un projet."""
        try:
            from addons.official.recap_engine.src.narrative_extractor import NarrativeExtractor
        except ImportError:
            return {"project_id": project_id, "packages": [], "error": "NarrativeExtractor non disponible"}

        extractor = NarrativeExtractor(output_dir="data/continuity")
        packages = extractor.list_packages(project_id)
        return {
            "project_id": project_id,
            "packages": packages,
            "total": len(packages),
        }

    @router.get("/continuity/{project_id}/chapter/{chapter_number}/next-input")
    async def get_next_chapter_input(project_id: str, chapter_number: int):
        """
        Retourne les données d'entrée injectées pour le chapitre suivant.

        Ce payload est directement compatible avec GeneratePageRequest —
        il inclut les personnages avec leur état, le checkpoint narratif,
        les arcs ouverts et le story_context construit depuis la mémoire.
        """
        try:
            from addons.official.recap_engine.src.narrative_extractor import NarrativeExtractor
        except ImportError:
            raise HTTPException(status_code=503, detail="NarrativeExtractor non disponible")

        extractor = NarrativeExtractor(output_dir="data/continuity")
        package = extractor.load_package(project_id, chapter_number)
        if not package:
            raise HTTPException(
                status_code=404,
                detail=f"Aucun package de continuité pour le chapitre {chapter_number}."
            )

        next_input = extractor.to_comic_generator_input(package)
        return {
            "success": True,
            "next_chapter_number": chapter_number + 1,
            "ready_to_inject": True,
            "package_summary": {
                "chapter_title": package.chapter_title,
                "cliffhanger": package.cliffhanger,
                "opening_hook": package.opening_hook_next,
                "global_progression": package.global_story_progression,
                "open_arcs": [
                    {"title": a.title, "tension": a.tension_level}
                    for a in package.arcs if a.status in ("open", "escalated")
                ],
            },
            "comic_generator_input": next_input,
        }

else:
    router = None


# ============================================================================
# Module Metadata (for addon discovery)
# ============================================================================

ADDON_INFO = {
    "name": "comic_generator",
    "display_name": "Comic Generator",
    "version": "1.0.0",
    "router": router,
    "supported_styles": [s.value for s in ComicStyle],
}
