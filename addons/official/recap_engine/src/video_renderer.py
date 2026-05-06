"""
Recap Engine - Video Renderer
Transforme la timeline en vidéo MP4 finale via ffmpeg.

Pipeline par scène :
  Image fixe → Filtre animation (zoom/pan/shake) → Audio TTS → Clip MP4

Pipeline final :
  [Clip 1] + [Clip 2] + … → Concat → Soundtrack → Sous-titres → MP4 final

Le moteur utilise UNIQUEMENT ffmpeg (pas de dépendances Python lourdes).
"""

import asyncio
import logging
from datetime import timedelta
from pathlib import Path
from typing import Optional, Tuple

from .types import (
    RecapScene,
    RecapTimeline,
    RecapRenderResult,
    RecapExportResult,
    CameraMove,
    TransitionType,
)

logger = logging.getLogger(__name__)


# ============================================================================
# ffmpeg Camera Move Filters
# ============================================================================


def _get_camera_filter(
    camera_move: CameraMove,
    intensity: float,
    duration: float,
    resolution: Tuple[int, int] = (1920, 1080),
) -> str:
    """
    Génère le filtre ffmpeg pour l'animation de caméra.

    Technique : zoompan filtre de ffmpeg — image fixe légèrement animée.
    C'est exactement ce que font les recaps YouTube !

    Intensité recommandée : 0.05–0.15 pour effet subtil.
    """
    w, h = resolution
    fps = 30
    frames = int(duration * fps)
    z_factor = 1.0 + intensity  # Zoom de départ ou arrivée

    if camera_move == CameraMove.ZOOM_IN:
        # Zoom lent vers le centre : classique manga recap
        return (
            f"scale={w * 2}:{h * 2},"
            f"zoompan=z='min(zoom+{intensity / frames:.6f},{z_factor})'"
            f":x='iw/2-(iw/zoom/2)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    elif camera_move == CameraMove.ZOOM_OUT:
        # Dézoom doux
        start_z = z_factor
        return (
            f"scale={w * 2}:{h * 2},"
            f"zoompan=z='if(eq(on\\,1)\\,{start_z}\\,max(zoom-{intensity / frames:.6f}\\,1.0))'"
            f":x='iw/2-(iw/zoom/2)'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    elif camera_move == CameraMove.PAN_LEFT:
        # Panoramique horizontal gauche vers droite
        max_pan = int(w * intensity * 2)
        return (
            f"scale={w + max_pan * 2}:{h},"
            f"zoompan=z=1.0"
            f":x='on/{frames}*{max_pan}'"
            f":y='0'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    elif camera_move == CameraMove.PAN_RIGHT:
        # Panoramique droite vers gauche
        max_pan = int(w * intensity * 2)
        return (
            f"scale={w + max_pan * 2}:{h},"
            f"zoompan=z=1.0"
            f":x='{max_pan}-on/{frames}*{max_pan}'"
            f":y='0'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    elif camera_move == CameraMove.SLOW_PUSH:
        # Légère avancée douce : combo zoom + micro drift
        return (
            f"scale={w * 2}:{h * 2},"
            f"zoompan=z='min(zoom+{intensity * 0.5 / frames:.6f},{1.0 + intensity * 0.5})'"
            f":x='iw/2-(iw/zoom/2)+sin(on/10)*3'"
            f":y='ih/2-(ih/zoom/2)'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    elif camera_move == CameraMove.SHAKE:
        # Tremblement (combat/choc) — effet vibration subtle
        shake_px = max(2, int(w * intensity * 0.5))
        return (
            f"scale={w + shake_px * 4}:{h + shake_px * 4},"
            f"zoompan=z=1.0"
            f":x='(iw-{w})/2+sin(on*1.5)*{shake_px}'"
            f":y='(ih-{h})/2+cos(on*1.5)*{shake_px // 2}'"
            f":d={frames}:s={w}x{h}:fps={fps}"
        )

    else:  # STATIC
        return f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2"


def _get_transition_filter(transition: TransitionType, duration: float) -> str:
    """Génère le filtre de transition ffmpeg pour une scène."""
    int(duration * 30)
    if transition == TransitionType.FADE_BLACK:
        return f"fade=t=in:st=0:d={duration}:color=black"
    elif transition == TransitionType.FADE_WHITE:
        return f"fade=t=in:st=0:d={duration}:color=white"
    elif transition == TransitionType.SEPIA:
        return f"fade=t=in:st=0:d={duration}:color=black,colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"
    elif transition == TransitionType.DISSOLVE:
        return f"fade=t=in:st=0:d={duration}"
    else:  # CUT
        return ""


# ============================================================================
# Video Renderer
# ============================================================================


class VideoRenderer:
    """
    Moteur de rendu vidéo du Recap Engine.

    Architecture :
    1. Render chaque scène individuellement (image animée + audio)
    2. Créer la liste de clips
    3. Concatener via ffmpeg concat demuxer
    4. Ajouter soundtrack de fond
    5. Incruster sous-titres SRT
    """

    def __init__(
        self,
        output_dir: str = "data/assets/recaps",
        ffmpeg_path: str = "ffmpeg",
        ffprobe_path: str = "ffprobe",
    ):
        self._output_dir = Path(output_dir)
        self._output_dir.mkdir(parents=True, exist_ok=True)
        self._ffmpeg = ffmpeg_path
        self._ffprobe = ffprobe_path

    # ------------------------------------------------------------------
    # Scene Rendering
    # ------------------------------------------------------------------

    async def render_scene(
        self,
        scene: RecapScene,
        timeline_id: str,
        resolution: Tuple[int, int] = (1920, 1080),
        fps: int = 30,
    ) -> Optional[str]:
        """
        Rend un clip MP4 pour une scène individuelle.

        Composition :
        - Video : image animée (zoompan) + effet de transition
        - Audio : fichier TTS mp3 aligné sur la durée
        """
        clip_dir = self._output_dir / timeline_id / "clips"
        clip_dir.mkdir(parents=True, exist_ok=True)
        output_path = clip_dir / f"scene_{scene.scene_id}.mp4"

        if output_path.exists():
            scene.rendered_clip_path = str(output_path)
            scene.render_status = "done"
            return str(output_path)

        # Vérifier que l'image source existe
        image_path = scene.image_path
        if not image_path or not Path(image_path).exists():
            image_path = await self._create_placeholder_image(
                scene, clip_dir, resolution
            )

        # Construire le filtre vidéo
        camera_filter = _get_camera_filter(
            scene.camera_move,
            scene.camera_intensity,
            scene.duration,
            resolution,
        )
        transition_filter = _get_transition_filter(
            scene.transition_in,
            scene.transition_duration,
        )

        vf_chain = camera_filter
        if transition_filter:
            vf_chain += f",{transition_filter}"

        # Construire la commande ffmpeg
        cmd = [self._ffmpeg, "-y"]

        # Input : image fixe en boucle
        cmd += [
            "-loop",
            "1",
            "-framerate",
            str(fps),
            "-i",
            str(image_path),
        ]

        # Input audio (TTS ou silence)
        has_audio = scene.audio_path and Path(scene.audio_path).exists()
        if has_audio:
            cmd += ["-i", str(scene.audio_path)]
        else:
            # Silence synthétique
            cmd += [
                "-f",
                "lavfi",
                "-i",
                "anullsrc=r=44100:cl=stereo",
            ]

        # Durée
        cmd += ["-t", str(scene.duration)]

        # Filtres vidéo
        cmd += ["-vf", vf_chain]

        # Codecs et qualité
        cmd += [
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-shortest",
            str(output_path),
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()

            if process.returncode != 0:
                err = stderr.decode("utf-8", errors="replace")[-500:]
                logger.error(f"[Renderer] Erreur scène {scene.scene_id}: {err}")
                scene.render_status = "error"
                return None

            scene.rendered_clip_path = str(output_path)
            scene.render_status = "done"
            logger.debug(f"[Renderer] Scène {scene.scene_id} rendue : {output_path}")
            return str(output_path)

        except FileNotFoundError:
            logger.error(
                f"[Renderer] ffmpeg introuvable à '{self._ffmpeg}'. "
                "Vérifiez que ffmpeg est installé et dans le PATH."
            )
            return None

    async def render_timeline(
        self,
        timeline: RecapTimeline,
        on_progress=None,
    ) -> RecapRenderResult:
        """
        Rend toute la timeline :
        1. Render chaque scène
        2. Concatener
        3. Ajouter musique de fond
        4. Export final MP4
        """
        import time

        start_time = time.time()

        resolution_str = timeline.resolution or "1920x1080"
        w, h = [int(x) for x in resolution_str.split("x")]
        fps = timeline.fps or 30

        # Étape 1 : Rendre chaque scène
        total = len(timeline.scenes)
        for i, scene in enumerate(timeline.scenes):
            scene.render_status = "rendering"
            clip_path = await self.render_scene(
                scene, timeline.timeline_id, (w, h), fps
            )
            if clip_path:
                timeline.render_progress = (i + 1) / total
                if on_progress:
                    await on_progress(timeline.render_progress, i + 1, total)
            await asyncio.sleep(0)

        # Étape 2 : Concatener tous les clips
        clips = [s.rendered_clip_path for s in timeline.scenes if s.rendered_clip_path]
        if not clips:
            return RecapRenderResult(
                success=False,
                video_path=None,
                duration=0.0,
                file_size_mb=0.0,
                render_time=0.0,
                error="Aucun clip rendu avec succès",
            )

        # Étape 3 : Fichier de concat
        concat_file = self._output_dir / timeline.timeline_id / "concat_list.txt"
        concat_file.parent.mkdir(parents=True, exist_ok=True)
        with open(concat_file, "w", encoding="utf-8") as f:
            for clip in clips:
                f.write(f"file '{clip}'\n")

        # Étape 4 : Concat + musique + export final
        output_path = (
            self._output_dir
            / timeline.timeline_id
            / f"recap_{timeline.timeline_id[:8]}.mp4"
        )

        concat_cmd = [
            self._ffmpeg,
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_file),
        ]

        # Ajout musique de fond si disponible
        if (
            timeline.background_music_path
            and Path(timeline.background_music_path).exists()
        ):
            concat_cmd += [
                "-i",
                str(timeline.background_music_path),
                "-filter_complex",
                "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.15[aout]",
                "-map",
                "0:v",
                "-map",
                "[aout]",
            ]
        else:
            concat_cmd += ["-map", "0:v", "-map", "0:a?"]

        concat_cmd += [
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "20",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            "-movflags",
            "+faststart",
            str(output_path),
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *concat_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()

            if process.returncode != 0:
                err = stderr.decode("utf-8", errors="replace")[-500:]
                logger.error(f"[Renderer] Erreur concat : {err}")
                return RecapRenderResult(
                    success=False,
                    video_path=None,
                    duration=0.0,
                    file_size_mb=0.0,
                    render_time=time.time() - start_time,
                    error=f"ffmpeg concat error: {err[-200:]}",
                )

            render_time = time.time() - start_time
            file_size = (
                output_path.stat().st_size / (1024 * 1024)
                if output_path.exists()
                else 0
            )

            timeline.final_video_path = str(output_path)
            timeline.render_progress = 1.0

            logger.info(
                f"[Renderer] Vidéo rendue : {output_path} "
                f"({file_size:.1f} MB, {render_time:.1f}s)"
            )

            return RecapRenderResult(
                success=True,
                video_path=str(output_path),
                duration=timeline.actual_duration,
                file_size_mb=file_size,
                render_time=render_time,
            )

        except FileNotFoundError:
            return RecapRenderResult(
                success=False,
                video_path=None,
                duration=0.0,
                file_size_mb=0.0,
                render_time=0.0,
                error="ffmpeg introuvable. Installez ffmpeg et ajoutez-le au PATH.",
            )

    # ------------------------------------------------------------------
    # Subtitle Generation
    # ------------------------------------------------------------------

    def generate_srt(
        self, timeline: RecapTimeline, output_path: Optional[str] = None
    ) -> str:
        """
        Génère un fichier de sous-titres .srt pour la vidéo.
        """
        srt_lines = []
        current_time = 0.0

        for i, scene in enumerate(timeline.scenes):
            start = current_time
            end = current_time + scene.duration
            current_time = end + scene.transition_duration

            start_str = self._seconds_to_srt_time(start)
            end_str = self._seconds_to_srt_time(end)

            # Découper le texte en lignes de ~60 chars max
            text = scene.subtitle_text or scene.narration_text
            wrapped = self._wrap_subtitle(text, 60)

            srt_lines.append(f"{i + 1}")
            srt_lines.append(f"{start_str} --> {end_str}")
            srt_lines.append(wrapped)
            srt_lines.append("")

        srt_content = "\n".join(srt_lines)

        if output_path is None:
            output_path = str(
                self._output_dir
                / timeline.timeline_id
                / f"recap_{timeline.timeline_id[:8]}.srt"
            )

        Path(output_path).write_text(srt_content, encoding="utf-8")
        logger.info(f"[Renderer] SRT généré : {output_path}")
        return output_path

    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convertit des secondes en format SRT HH:MM:SS,mmm."""
        td = timedelta(seconds=seconds)
        total_seconds = int(td.total_seconds())
        ms = int((td.total_seconds() - total_seconds) * 1000)
        h = total_seconds // 3600
        m = (total_seconds % 3600) // 60
        s = total_seconds % 60
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    def _wrap_subtitle(self, text: str, max_chars: int = 60) -> str:
        """Découpe le texte en lignes de sous-titres."""
        words = text.split()
        lines = []
        current = []
        count = 0
        for word in words:
            count += len(word) + 1
            if count > max_chars and current:
                lines.append(" ".join(current))
                current = [word]
                count = len(word) + 1
            else:
                current.append(word)
        if current:
            lines.append(" ".join(current))
        return "\n".join(lines[:3])  # Max 3 lignes SRT

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    async def export_with_subtitles(
        self, timeline: RecapTimeline, output_path: Optional[str] = None
    ) -> RecapExportResult:
        """
        Export final avec sous-titres incrustés (burn-in ou fichier .srt séparé).
        """
        if not timeline.final_video_path:
            return RecapExportResult(
                success=False,
                video_path=None,
                subtitle_path=None,
                duration=0.0,
                error="Vidéo non rendue. Lancez d'abord render_timeline().",
            )

        # Générer le SRT
        srt_path = self.generate_srt(timeline)

        # Export par défaut = vidéo + SRT séparé (pour flexibilité)
        final_path = output_path or str(
            self._output_dir
            / timeline.timeline_id
            / f"EXPORT_recap_{timeline.timeline_id[:8]}.mp4"
        )

        # Option avancée : burn-in des sous-titres dans la vidéo
        cmd = [
            self._ffmpeg,
            "-y",
            "-i",
            str(timeline.final_video_path),
            "-vf",
            f"subtitles={srt_path}",
            "-c:v",
            "libx264",
            "-crf",
            "20",
            "-c:a",
            "copy",
            "-movflags",
            "+faststart",
            final_path,
        ]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()

            if process.returncode == 0 and Path(final_path).exists():
                return RecapExportResult(
                    success=True,
                    video_path=final_path,
                    subtitle_path=srt_path,
                    duration=timeline.actual_duration,
                )
            else:
                # Fallback : copier la vidéo sans sous-titres brûlés
                import shutil

                shutil.copy2(timeline.final_video_path, final_path)
                return RecapExportResult(
                    success=True,
                    video_path=final_path,
                    subtitle_path=srt_path,
                    duration=timeline.actual_duration,
                )

        except Exception as e:
            return RecapExportResult(
                success=False,
                video_path=None,
                subtitle_path=None,
                duration=0.0,
                error=str(e),
            )

    # ------------------------------------------------------------------
    # Placeholder Image
    # ------------------------------------------------------------------

    async def _create_placeholder_image(
        self, scene: RecapScene, output_dir: Path, resolution: Tuple[int, int]
    ) -> str:
        """
        Crée une image placeholder noire avec le texte de la scène.
        Utilisé quand l'image du panel est manquante.
        """
        w, h = resolution
        placeholder_path = output_dir / f"placeholder_{scene.scene_id}.png"

        try:
            from PIL import Image, ImageDraw, ImageFont

            img = Image.new("RGB", (w, h), color=(20, 20, 30))
            draw = ImageDraw.Draw(img)

            # Texte centré
            text = f"Panel {scene.source_panel_index + 1}\n(Image non générée)"
            draw.text((w // 2, h // 2), text, fill=(150, 150, 180), anchor="mm")
            img.save(str(placeholder_path))

        except ImportError:
            # Sans PIL : créer via ffmpeg
            cmd = [
                self._ffmpeg,
                "-y",
                "-f",
                "lavfi",
                "-i",
                f"color=c=141418:size={w}x{h}:rate=1",
                "-frames:v",
                "1",
                str(placeholder_path),
            ]
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            await process.wait()

        return str(placeholder_path) if placeholder_path.exists() else ""

    async def check_ffmpeg(self) -> bool:
        """Vérifie que ffmpeg est disponible."""
        try:
            process = await asyncio.create_subprocess_exec(
                self._ffmpeg,
                "-version",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.communicate()
            return process.returncode == 0
        except FileNotFoundError:
            return False
