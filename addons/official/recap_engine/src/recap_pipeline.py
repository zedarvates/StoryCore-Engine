"""
Recap Engine - Main Pipeline Orchestrator
Coordonne le pipeline complet : BD → Script → TTS → Rendu → Export MP4.

Workflow :
  1. Lire les données BD (Comic Generator JSON ou dossiers pages)
  2. Construire la timeline narrative (RecapScriptBuilder)
  3. Générer les audios TTS (TTSGenerator)
  4. Rendre chaque scène en clip MP4 (VideoRenderer)
  5. Concatener + soundtrack + sous-titres → Export final
"""

import json
import logging
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Dict, Any, Callable

from .types import (
    RecapTimeline,
    RecapState,
    RecapGenerationResult,
    RecapRenderResult,
    RecapExportResult,
    RecapStyle,
    TTSProvider,
)
from .script_builder import RecapScriptBuilder
from .tts_generator import TTSGenerator
from .video_renderer import VideoRenderer

logger = logging.getLogger(__name__)


# ============================================================================
# Recap Pipeline
# ============================================================================


class RecapPipeline:
    """
    Orchestrateur principal du Recap Engine.

    Usage :
        pipeline = RecapPipeline()

        # Depuis un export BD JSON
        result = await pipeline.generate_from_comic_json(
            project_id="my_project",
            comic_json_path="data/assets/comics/my_project/export/comic_export.json",
            story_context="Dans un Tokyo futuriste…",
            characters=[...],
        )

        if result.success:
            render = await pipeline.render(result.timeline.timeline_id)
            export = await pipeline.export(result.timeline.timeline_id)
            print(f"Vidéo : {export.video_path}")
    """

    def __init__(
        self,
        output_dir: str = "data/assets/recaps",
        comic_output_dir: str = "data/assets/comics",
        ffmpeg_path: str = "ffmpeg",
        tts_provider: TTSProvider = TTSProvider.GTTS,
        language: str = "fr",
    ):
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._comic_dir = Path(comic_output_dir)

        self._builder = RecapScriptBuilder(language=language)
        self._tts = TTSGenerator(
            provider=tts_provider,
            language=language,
            output_dir=output_dir,
        )
        self._renderer = VideoRenderer(
            output_dir=output_dir,
            ffmpeg_path=ffmpeg_path,
        )

    # ------------------------------------------------------------------
    # State Management
    # ------------------------------------------------------------------

    def _state_path(self, project_id: str) -> Path:
        return self._output_dir / project_id / "recap_state.json"

    def _timeline_path(self, project_id: str, timeline_id: str) -> Path:
        return self._output_dir / project_id / f"timeline_{timeline_id}.json"

    def load_state(self, project_id: str) -> Optional[RecapState]:
        path = self._state_path(project_id)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return RecapState(**data)
        except Exception as e:
            logger.error(f"[RecapPipeline] Erreur chargement state : {e}")
            return None

    def save_state(self, state: RecapState) -> bool:
        path = self._state_path(state.project_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            path.write_text(
                json.dumps(asdict(state), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return True
        except Exception as e:
            logger.error(f"[RecapPipeline] Erreur sauvegarde state : {e}")
            return False

    def load_timeline(
        self, project_id: str, timeline_id: str
    ) -> Optional[RecapTimeline]:
        path = self._timeline_path(project_id, timeline_id)
        if not path.exists():
            return None
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            return self._deserialize_timeline(data)
        except Exception as e:
            logger.error(f"[RecapPipeline] Erreur chargement timeline : {e}")
            return None

    def save_timeline(self, project_id: str, timeline: RecapTimeline) -> bool:
        path = self._timeline_path(project_id, timeline.timeline_id)
        path.parent.mkdir(parents=True, exist_ok=True)

        def serialize(obj):
            if hasattr(obj, "__dataclass_fields__"):
                return {k: serialize(v) for k, v in asdict(obj).items()}
            elif isinstance(obj, list):
                return [serialize(i) for i in obj]
            elif isinstance(obj, dict):
                return {k: serialize(v) for k, v in obj.items()}
            elif hasattr(obj, "value"):  # Enum
                return obj.value
            return obj

        try:
            path.write_text(
                json.dumps(serialize(timeline), indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
            return True
        except Exception as e:
            logger.error(f"[RecapPipeline] Erreur sauvegarde timeline : {e}")
            return False

    # ------------------------------------------------------------------
    # Generation
    # ------------------------------------------------------------------

    async def generate_from_comic_json(
        self,
        project_id: str,
        comic_json_path: str,
        story_context: str,
        characters: List[Dict[str, Any]],
        style: RecapStyle = RecapStyle.MANGA_RECAP,
        tts_provider: Optional[TTSProvider] = None,
    ) -> RecapGenerationResult:
        """
        Pipeline complet depuis un fichier JSON de BD exporté.

        Étape 1 : Lecture + construction timeline
        Étape 2 : Génération TTS
        """
        logger.info(f"[RecapPipeline] Génération depuis : {comic_json_path}")

        # 1. Lire le JSON
        comic_path = Path(comic_json_path)
        if not comic_path.exists():
            return RecapGenerationResult(
                success=False,
                timeline=None,
                scenes_count=0,
                estimated_duration=0.0,
                error=f"Fichier BD introuvable : {comic_json_path}",
            )

        try:
            comic_data = json.loads(comic_path.read_text(encoding="utf-8"))
            # Injecter le project_id si manquant
            comic_data.setdefault("project_id", project_id)
        except Exception as e:
            return RecapGenerationResult(
                success=False,
                timeline=None,
                scenes_count=0,
                estimated_duration=0.0,
                error=f"Erreur lecture JSON BD : {e}",
            )

        # 2. Construire le script
        result = self._builder.build_from_comic_json(
            comic_data=comic_data,
            story_context=story_context,
            characters=characters,
            style=style,
        )

        if not result.success or not result.timeline:
            return result

        timeline = result.timeline
        timeline.created_at = datetime.now().isoformat()
        timeline.updated_at = datetime.now().isoformat()

        # 3. Générer les audios TTS
        if tts_provider:
            self._tts.provider = tts_provider
        await self._tts.generate_timeline_audio(timeline.scenes, timeline.timeline_id)

        # 4. Persister la timeline et l'état
        self.save_timeline(project_id, timeline)
        state = self.load_state(project_id) or RecapState(
            project_id=project_id,
            timelines=[],
            active_timeline_id=None,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )
        if timeline.timeline_id not in state.timelines:
            state.timelines.append(timeline.timeline_id)
        state.active_timeline_id = timeline.timeline_id
        state.updated_at = datetime.now().isoformat()
        self.save_state(state)

        logger.info(
            f"[RecapPipeline] Timeline générée : {timeline.timeline_id} "
            f"({result.scenes_count} scènes, ~{result.estimated_duration / 60:.1f} min)"
        )
        return result

    async def generate_from_pages_dir(
        self,
        project_id: str,
        chapter_id: str,
        story_context: str,
        characters: List[Dict[str, Any]],
        style: RecapStyle = RecapStyle.MANGA_RECAP,
    ) -> RecapGenerationResult:
        """
        Pipeline depuis les dossiers page_XXX du Comic Generator.
        Utile quand le JSON global n'est pas encore exporté.
        """
        pages_dir = self._comic_dir / project_id / chapter_id
        if not pages_dir.exists():
            return RecapGenerationResult(
                success=False,
                timeline=None,
                scenes_count=0,
                estimated_duration=0.0,
                error=f"Dossier de planches introuvable : {pages_dir}",
            )

        result = self._builder.build_from_pages_directory(
            pages_dir=pages_dir,
            story_context=story_context,
            characters=characters,
            style=style,
            project_id=project_id,
        )

        if not result.success or not result.timeline:
            return result

        timeline = result.timeline
        timeline.created_at = datetime.now().isoformat()

        # TTS
        await self._tts.generate_timeline_audio(timeline.scenes, timeline.timeline_id)

        # Persister
        self.save_timeline(project_id, timeline)
        state = self.load_state(project_id) or RecapState(
            project_id=project_id,
            timelines=[],
            active_timeline_id=None,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
        )
        if timeline.timeline_id not in state.timelines:
            state.timelines.append(timeline.timeline_id)
        state.active_timeline_id = timeline.timeline_id
        state.updated_at = datetime.now().isoformat()
        self.save_state(state)

        return result

    # ------------------------------------------------------------------
    # Rendering
    # ------------------------------------------------------------------

    async def render(
        self,
        project_id: str,
        timeline_id: str,
        on_progress: Optional[Callable] = None,
    ) -> RecapRenderResult:
        """
        Lance le rendu vidéo d'une timeline générée.
        Chaque scène devient un clip MP4, puis ils sont concatenés.
        """
        timeline = self.load_timeline(project_id, timeline_id)
        if not timeline:
            return RecapRenderResult(
                success=False,
                video_path=None,
                duration=0.0,
                file_size_mb=0.0,
                render_time=0.0,
                error=f"Timeline {timeline_id} introuvable",
            )

        # Vérifier ffmpeg
        has_ffmpeg = await self._renderer.check_ffmpeg()
        if not has_ffmpeg:
            return RecapRenderResult(
                success=False,
                video_path=None,
                duration=0.0,
                file_size_mb=0.0,
                render_time=0.0,
                error="ffmpeg non disponible. Installez ffmpeg pour le rendu vidéo.",
            )

        result = await self._renderer.render_timeline(timeline, on_progress)

        if result.success:
            # Sauvegarder la timeline avec le chemin vidéo final
            timeline.final_video_path = result.video_path
            timeline.updated_at = datetime.now().isoformat()
            self.save_timeline(project_id, timeline)

        return result

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    async def export(
        self,
        project_id: str,
        timeline_id: str,
        include_subtitles: bool = True,
        output_path: Optional[str] = None,
    ) -> RecapExportResult:
        """Export final de la vidéo avec sous-titres SRT."""
        timeline = self.load_timeline(project_id, timeline_id)
        if not timeline:
            return RecapExportResult(
                success=False,
                video_path=None,
                subtitle_path=None,
                duration=0.0,
                error=f"Timeline {timeline_id} introuvable",
            )

        if include_subtitles:
            return await self._renderer.export_with_subtitles(timeline, output_path)
        else:
            # Export direct sans sous-titres
            import shutil

            dest = output_path or str(
                self._output_dir / timeline_id / "recap_FINAL.mp4"
            )
            if timeline.final_video_path and Path(timeline.final_video_path).exists():
                shutil.copy2(timeline.final_video_path, dest)
                srt_path = self._renderer.generate_srt(timeline)
                return RecapExportResult(
                    success=True,
                    video_path=dest,
                    subtitle_path=srt_path,
                    duration=timeline.actual_duration,
                )
            return RecapExportResult(
                success=False,
                video_path=None,
                subtitle_path=None,
                duration=0.0,
                error="Vidéo non encore rendue",
            )

    # ------------------------------------------------------------------
    # Info & Status
    # ------------------------------------------------------------------

    def get_project_timelines(self, project_id: str) -> List[Dict[str, Any]]:
        """Liste toutes les timelines d'un projet."""
        state = self.load_state(project_id)
        if not state:
            return []

        result = []
        for tid in state.timelines:
            timeline = self.load_timeline(project_id, tid)
            if timeline:
                result.append(
                    {
                        "timeline_id": timeline.timeline_id,
                        "title": timeline.title,
                        "scenes_count": len(timeline.scenes),
                        "estimated_duration": timeline.actual_duration,
                        "render_progress": timeline.render_progress,
                        "final_video_path": timeline.final_video_path,
                        "created_at": timeline.created_at,
                        "style": timeline.style.value
                        if hasattr(timeline.style, "value")
                        else timeline.style,
                    }
                )
        return result

    def _deserialize_timeline(self, data: Dict[str, Any]) -> RecapTimeline:
        """Reconstruit une RecapTimeline depuis un dict JSON."""
        from .types import (
            RecapScene,
            RecapCharacterStyle,
            CameraMove,
            TransitionType,
        )

        scenes = []
        for s in data.get("scenes", []):
            scenes.append(
                RecapScene(
                    scene_id=s["scene_id"],
                    panel_id=s["panel_id"],
                    source_page_number=s["source_page_number"],
                    source_panel_index=s["source_panel_index"],
                    narration_text=s["narration_text"],
                    narrator_character_id=s["narrator_character_id"],
                    subtitle_text=s.get("subtitle_text", ""),
                    image_path=s.get("image_path", ""),
                    duration=s["duration"],
                    camera_move=CameraMove(s.get("camera_move", "slow_push")),
                    camera_intensity=s.get("camera_intensity", 0.08),
                    transition_in=TransitionType(s.get("transition_in", "dissolve")),
                    transition_out=TransitionType(s.get("transition_out", "dissolve")),
                    transition_duration=s.get("transition_duration", 0.5),
                    highlight_bubbles=s.get("highlight_bubbles", False),
                    highlight_characters=s.get("highlight_characters", []),
                    audio_path=s.get("audio_path"),
                    background_music_volume=s.get("background_music_volume", 0.15),
                    sfx_tags=s.get("sfx_tags", []),
                    rendered_clip_path=s.get("rendered_clip_path"),
                    render_status=s.get("render_status", "pending"),
                )
            )

        char_styles = {}
        for cid, cs in data.get("character_styles", {}).items():
            char_styles[cid] = RecapCharacterStyle(
                character_id=cs["character_id"],
                character_name=cs["character_name"],
                frame_color=cs["frame_color"],
                frame_glow=cs["frame_glow"],
                bubble_style=cs["bubble_style"],
                highlight_effect=cs["highlight_effect"],
                voice_id=cs["voice_id"],
                voice_pitch=cs.get("voice_pitch", 1.0),
                voice_speed=cs.get("voice_speed", 1.0),
                narrator_role=cs.get("narrator_role", "character"),
            )

        return RecapTimeline(
            timeline_id=data["timeline_id"],
            project_id=data["project_id"],
            title=data["title"],
            subtitle=data.get("subtitle", ""),
            style=RecapStyle(data.get("style", "manga_recap")),
            scenes=scenes,
            character_styles=char_styles,
            target_duration=data.get("target_duration", 0.0),
            actual_duration=data.get("actual_duration", 0.0),
            resolution=data.get("resolution", "1920x1080"),
            fps=data.get("fps", 30),
            background_music_path=data.get("background_music_path"),
            render_progress=data.get("render_progress", 0.0),
            final_video_path=data.get("final_video_path"),
            created_at=data.get("created_at"),
            updated_at=data.get("updated_at"),
        )
