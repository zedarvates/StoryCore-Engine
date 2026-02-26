"""
Recap Engine Main Entry Point
FastAPI router exposant l'API REST du Recap Engine.
Enregistré sous /api/addons/recap_engine/
"""

import asyncio
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
    logger.warning("[RecapEngine] FastAPI non disponible – API REST désactivée")

from .types import RecapStyle, TTSProvider
from .recap_pipeline import RecapPipeline
from .narrative_extractor import NarrativeExtractor

_extractor: Optional[NarrativeExtractor] = None


def get_extractor() -> NarrativeExtractor:
    global _extractor
    if _extractor is None:
        _extractor = NarrativeExtractor(output_dir="data/continuity")
    return _extractor

# ============================================================================
# Singleton Pipeline
# ============================================================================

_pipeline: Optional[RecapPipeline] = None


def get_pipeline() -> RecapPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = RecapPipeline(
            output_dir="data/assets/recaps",
            comic_output_dir="data/assets/comics",
            ffmpeg_path="ffmpeg",
            tts_provider=TTSProvider.GTTS,
            language="fr",
        )
    return _pipeline


# ============================================================================
# Pydantic Models
# ============================================================================

if HAS_FASTAPI:
    class GenerateFromComicRequest(BaseModel):
        project_id: str
        comic_json_path: str
        story_context: str
        characters: List[Dict[str, Any]] = []
        style: str = "manga_recap"
        tts_provider: str = "gtts"

    class GenerateFromPagesRequest(BaseModel):
        project_id: str
        chapter_id: str
        story_context: str
        characters: List[Dict[str, Any]] = []
        style: str = "manga_recap"

    class RenderRequest(BaseModel):
        project_id: str
        timeline_id: str

    class ExportRequest(BaseModel):
        project_id: str
        timeline_id: str
        include_subtitles: bool = True
        output_path: Optional[str] = None

    class TTSVoicesRequest(BaseModel):
        provider: str = "edge_tts"
        language: str = "fr"

    class ExtractFromComicRequest(BaseModel):
        project_id: str
        comic_json_path: str
        chapter_id: Optional[str] = None
        chapter_number: int = 1

    class ExtractFromTimelineRequest(BaseModel):
        project_id: str
        chapter_number: int = 1

    # ============================================================================
    # FastAPI Router
    # ============================================================================

    router = APIRouter(tags=["Recap Engine"])

    @router.get("/status")
    async def get_status():
        """Health check et info addon."""
        pipeline = get_pipeline()
        has_ffmpeg = await pipeline._renderer.check_ffmpeg()
        return {
            "addon": "recap_engine",
            "version": "1.0.0",
            "status": "active",
            "ffmpeg_available": has_ffmpeg,
            "supported_styles": [s.value for s in RecapStyle],
            "supported_tts": [t.value for t in TTSProvider],
        }

    @router.get("/state/{project_id}")
    async def get_state(project_id: str):
        """État de toutes les timelines d'un projet."""
        pipeline = get_pipeline()
        state = pipeline.load_state(project_id)
        if not state:
            return {"exists": False, "project_id": project_id, "timelines": []}

        timelines = pipeline.get_project_timelines(project_id)
        return {
            "exists": True,
            "project_id": project_id,
            "active_timeline_id": state.active_timeline_id,
            "timelines": timelines,
        }

    @router.post("/generate/comic")
    async def generate_from_comic(
        req: GenerateFromComicRequest,
        background_tasks: BackgroundTasks,
    ):
        """
        Génère un recap depuis un fichier JSON de BD exporté.
        
        Pipeline :
        1. Lecture JSON → Construction timeline
        2. Génération TTS (asyncrone en arrière-plan si long)
        """
        pipeline = get_pipeline()

        try:
            style = RecapStyle(req.style)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Style invalide '{req.style}'. Valides : {[s.value for s in RecapStyle]}"
            )

        try:
            tts = TTSProvider(req.tts_provider)
        except ValueError:
            tts = TTSProvider.GTTS

        result = await pipeline.generate_from_comic_json(
            project_id=req.project_id,
            comic_json_path=req.comic_json_path,
            story_context=req.story_context,
            characters=req.characters,
            style=style,
            tts_provider=tts,
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        timeline = result.timeline
        return {
            "success": True,
            "timeline_id": timeline.timeline_id,
            "title": timeline.title,
            "scenes_count": result.scenes_count,
            "estimated_duration": result.estimated_duration,
            "estimated_duration_min": round(result.estimated_duration / 60, 1),
            "style": timeline.style.value if hasattr(timeline.style, "value") else timeline.style,
        }

    @router.post("/generate/pages")
    async def generate_from_pages(req: GenerateFromPagesRequest):
        """
        Génère un recap depuis les dossiers page_XXX d'un chapitre BD.
        Utile quand le JSON global n'est pas exporté.
        """
        pipeline = get_pipeline()

        try:
            style = RecapStyle(req.style)
        except ValueError:
            style = RecapStyle.MANGA_RECAP

        result = await pipeline.generate_from_pages_dir(
            project_id=req.project_id,
            chapter_id=req.chapter_id,
            story_context=req.story_context,
            characters=req.characters,
            style=style,
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        timeline = result.timeline
        return {
            "success": True,
            "timeline_id": timeline.timeline_id,
            "scenes_count": result.scenes_count,
            "estimated_duration": result.estimated_duration,
            "estimated_duration_min": round(result.estimated_duration / 60, 1),
        }

    @router.post("/render")
    async def render_video(req: RenderRequest, background_tasks: BackgroundTasks):
        """
        Lance le rendu vidéo d'une timeline.
        Le rendu peut prendre plusieurs minutes selon la durée.
        """
        pipeline = get_pipeline()

        # Lancer le rendu en tâche de fond pour les longues vidéos
        result_container = {"result": None}

        async def do_render():
            result_container["result"] = await pipeline.render(
                project_id=req.project_id,
                timeline_id=req.timeline_id,
            )

        # Pour les recaps courts (< 5 min estimés), rendre en direct
        timeline = pipeline.load_timeline(req.project_id, req.timeline_id)
        if timeline and timeline.actual_duration < 300:
            result = await pipeline.render(
                project_id=req.project_id,
                timeline_id=req.timeline_id,
            )
            if not result.success:
                raise HTTPException(status_code=500, detail=result.error)
            return {
                "success": True,
                "video_path": result.video_path,
                "duration": result.duration,
                "file_size_mb": result.file_size_mb,
                "render_time": result.render_time,
            }
        else:
            # Lancer en arrière-plan
            background_tasks.add_task(do_render)
            return {
                "success": True,
                "message": "Rendu lancé en arrière-plan. Suivez la progression via /state/",
                "timeline_id": req.timeline_id,
            }

    @router.post("/export")
    async def export_video(req: ExportRequest):
        """Export final avec sous-titres SRT."""
        pipeline = get_pipeline()

        result = await pipeline.export(
            project_id=req.project_id,
            timeline_id=req.timeline_id,
            include_subtitles=req.include_subtitles,
            output_path=req.output_path,
        )

        if not result.success:
            raise HTTPException(status_code=500, detail=result.error)

        return {
            "success": True,
            "video_path": result.video_path,
            "subtitle_path": result.subtitle_path,
            "duration": result.duration,
        }

    @router.get("/timeline/{project_id}/{timeline_id}")
    async def get_timeline(project_id: str, timeline_id: str):
        """Détails complets d'une timeline (scènes, styles, progression)."""
        pipeline = get_pipeline()
        timeline = pipeline.load_timeline(project_id, timeline_id)
        if not timeline:
            raise HTTPException(status_code=404, detail="Timeline introuvable")

        return {
            "timeline_id": timeline.timeline_id,
            "title": timeline.title,
            "subtitle": timeline.subtitle,
            "style": timeline.style.value if hasattr(timeline.style, "value") else timeline.style,
            "scenes_count": len(timeline.scenes),
            "actual_duration": timeline.actual_duration,
            "actual_duration_min": round(timeline.actual_duration / 60, 1),
            "render_progress": timeline.render_progress,
            "final_video_path": timeline.final_video_path,
            "created_at": timeline.created_at,
            "scenes": [
                {
                    "scene_id": s.scene_id,
                    "page": s.source_page_number,
                    "panel": s.source_panel_index,
                    "narration": s.narration_text[:100] + "…" if len(s.narration_text) > 100 else s.narration_text,
                    "duration": s.duration,
                    "camera_move": s.camera_move.value if hasattr(s.camera_move, "value") else s.camera_move,
                    "render_status": s.render_status,
                }
                for s in timeline.scenes
            ],
            "character_styles": {
                cid: {
                    "name": cs.character_name,
                    "frame_color": cs.frame_color,
                    "narrator_role": cs.narrator_role,
                    "voice_id": cs.voice_id,
                }
                for cid, cs in timeline.character_styles.items()
            },
        }

    @router.get("/voices")
    async def list_voices(provider: str = "edge_tts", language: str = "fr"):
        """Liste les voix TTS disponibles pour un provider."""
        tts = TTSGenerator_lazy(provider, language)
        voices = await tts.list_available_voices()
        return {"provider": provider, "language": language, "voices": voices}

    @router.get("/video/{project_id}/{timeline_id}")
    async def get_video(project_id: str, timeline_id: str):
        """Serve la vidéo finale MP4."""
        pipeline = get_pipeline()
        timeline = pipeline.load_timeline(project_id, timeline_id)
        if not timeline or not timeline.final_video_path:
            raise HTTPException(status_code=404, detail="Vidéo non disponible")
        from pathlib import Path
        path = Path(timeline.final_video_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Fichier vidéo introuvable")
        return FileResponse(str(path), media_type="video/mp4")

    # ============================================================================
    # Narrative Extraction Routes
    # ============================================================================

    @router.post("/extract/comic")
    async def extract_from_comic(req: ExtractFromComicRequest):
        """
        Extrait la continuité narrative d'un chapitre BD JSON.

        Analyse les pages/panels et produit un ChapterContinuityPackage :
        personnages avec état, lieux visités, objets, arcs ouverts,
        mémoire narrative à 3 niveaux, suggestion pour le chapitre suivant.
        """
        import json
        from pathlib import Path

        comic_path = Path(req.comic_json_path)
        if not comic_path.exists():
            raise HTTPException(status_code=404, detail=f"Fichier BD introuvable : {req.comic_json_path}")

        try:
            comic_data = json.loads(comic_path.read_text(encoding="utf-8"))
            comic_data.setdefault("project_id", req.project_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erreur lecture JSON : {e}")

        # Charger le package du chapitre précédent si disponible
        extractor = get_extractor()
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
            "characters_count": len(pkg.characters),
            "locations_count": len(pkg.locations),
            "objects_count": len(pkg.objects),
            "arcs_count": len(pkg.arcs),
            "global_story_progression": pkg.global_story_progression,
            "chapter_summary": pkg.chapter_summary,
            "cliffhanger": pkg.cliffhanger,
            "opening_hook_next": pkg.opening_hook_next,
            "characters": [
                {
                    "id": c.character_id,
                    "name": c.character_name,
                    "role": c.role,
                    "emotional_state": c.emotional_state,
                    "physical_state": c.physical_state,
                    "arc_status": c.arc_status,
                    "last_location": c.last_location,
                    "transformations": c.transformations,
                    "chapter_importance": round(c.chapter_importance, 2),
                    "memorable_quotes": c.memorable_quotes,
                }
                for c in pkg.characters
            ],
            "locations": [
                {
                    "name": l.location_name,
                    "atmosphere": l.atmosphere,
                    "importance": round(l.importance, 2),
                    "key_events": l.key_events,
                }
                for l in pkg.locations
            ],
            "arcs": [
                {
                    "title": a.title,
                    "status": a.status,
                    "description": a.description,
                    "tension_level": round(a.tension_level, 2),
                }
                for a in pkg.arcs
            ],
            "warnings": result.warnings,
        }

    @router.post("/extract/timeline/{timeline_id}")
    async def extract_from_timeline(timeline_id: str, req: ExtractFromTimelineRequest):
        """
        Extrait la continuité narrative d'une timeline Recap Engine terminée.

        Idéal pour bridger un recap vers un nouveau chapitre BD.
        """
        pipeline = get_pipeline()
        timeline = pipeline.load_timeline(req.project_id, timeline_id)
        if not timeline:
            raise HTTPException(status_code=404, detail="Timeline introuvable")

        from dataclasses import asdict
        timeline_dict = {}
        try:
            # Sérialiser la timeline pour l'extracteur
            def ser(obj):
                if hasattr(obj, "__dataclass_fields__"):
                    return {k: ser(v) for k, v in asdict(obj).items()}
                elif isinstance(obj, list):
                    return [ser(i) for i in obj]
                elif isinstance(obj, dict):
                    return {k: ser(v) for k, v in obj.items()}
                elif hasattr(obj, "value"):
                    return obj.value
                return obj
            timeline_dict = ser(timeline)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erreur sérialisation timeline : {e}")

        extractor = get_extractor()
        previous = extractor.load_package(req.project_id, req.chapter_number - 1)

        result = extractor.extract_from_recap_timeline(
            timeline_data=timeline_dict,
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
            "characters_count": len(pkg.characters),
            "arcs_count": len(pkg.arcs),
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
                    "arc_status": c.arc_status,
                }
                for c in pkg.characters
            ],
            "arcs": [
                {"title": a.title, "status": a.status, "tension_level": a.tension_level}
                for a in pkg.arcs
            ],
            "warnings": result.warnings,
        }

    @router.get("/continuity/{project_id}")
    async def list_continuity_packages(project_id: str):
        """
        Liste tous les packages de continuité d'un projet.
        Chaque package = un chapitre terminé avec son état narratif extrait.
        """
        extractor = get_extractor()
        packages = extractor.list_packages(project_id)
        return {
            "project_id": project_id,
            "packages": packages,
            "total": len(packages),
        }

    @router.get("/continuity/{project_id}/chapter/{chapter_number}/next-input")
    async def get_next_chapter_input(project_id: str, chapter_number: int):
        """
        Retourne les données d'entrée prêtes pour le chapitre suivant.

        Ce payload peut être directement envoyé au Comic Generator ou
        utilisé comme story_context pour le Recap Engine du chapitre suivant.
        """
        extractor = get_extractor()
        package = extractor.load_package(project_id, chapter_number)
        if not package:
            raise HTTPException(
                status_code=404,
                detail=f"Aucun package de continuité pour le chapitre {chapter_number} du projet {project_id}."
            )

        next_input = extractor.to_comic_generator_input(package)
        return {
            "success": True,
            "next_chapter_number": chapter_number + 1,
            "package_summary": {
                "chapter_title": package.chapter_title,
                "cliffhanger": package.cliffhanger,
                "opening_hook": package.opening_hook_next,
                "progression": package.global_story_progression,
                "open_arcs": [
                    a.title for a in package.arcs if a.status in ("open", "escalated")
                ],
            },
            "comic_generator_input": next_input,
        }

else:
    router = None


# Lazy import pour éviter l'import circulaire dans la route /voices
def TTSGenerator_lazy(provider_str: str, language: str):
    from .tts_generator import TTSGenerator
    try:
        provider = TTSProvider(provider_str)
    except ValueError:
        provider = TTSProvider.GTTS
    return TTSGenerator(provider=provider, language=language)


# ============================================================================
# Module Metadata
# ============================================================================

ADDON_INFO = {
    "name": "recap_engine",
    "display_name": "Recap Engine",
    "version": "1.0.0",
    "router": router,
    "supported_styles": [s.value for s in RecapStyle],
    "supported_tts": [t.value for t in TTSProvider],
}
