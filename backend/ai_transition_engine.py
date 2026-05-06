import os
import subprocess
import logging
from enum import Enum
from dataclasses import dataclass
from typing import Optional
from pathlib import Path

from backend.transitions_service import TransitionsService
from src.content_aware_interpolator import ContentAwareInterpolator
from src.comfyui_desktop_integration_config import ComfyUIConfig
from src.comfyui_test_framework.connection_manager import ComfyUIConnectionManager
from src.comfyui_test_framework.workflow_executor import WorkflowExecutor

logger = logging.getLogger(__name__)


class AITransitionType(Enum):
    MORPH = "ai_morph"
    INTERPOLATE = "ai_interpolate"
    SMART_FADE = "ai_smart_fade"


@dataclass
class AITransitionConfig:
    duration: float = 1.0
    fps: int = 30
    quality: str = "high"  # fast, balanced, high
    workflow_id: Optional[str] = None


class AITransitionEngine:
    """
    Moteur de transitions IA pour StoryCore-Engine.
    Orchestre FFmpeg, ComfyUI et ContentAwareInterpolator.
    """

    def __init__(
        self,
        comfy_config: Optional[ComfyUIConfig] = None,
        ffmpeg_path: str = "ffmpeg",
        workflows_dir: str = "assets/workflows/transitions",
    ):
        self.comfy_config = comfy_config or ComfyUIConfig.default()
        self.ffmpeg_path = ffmpeg_path
        self.transitions_service = TransitionsService(ffmpeg_path=ffmpeg_path)
        self.interpolator = ContentAwareInterpolator()

        # ComfyUI Integration
        self.connection = ComfyUIConnectionManager(
            base_url=self.comfy_config.url, timeout=self.comfy_config.timeout
        )
        self.executor = WorkflowExecutor(
            connection_manager=self.connection, workflows_dir=Path(workflows_dir)
        )

    async def generate_transition(
        self,
        clip_a_path: str,
        clip_b_path: str,
        transition_type: AITransitionType,
        output_path: str,
        config: Optional[AITransitionConfig] = None,
    ) -> bool:
        """
        Génère un clip de transition entre deux clips.
        """
        if config is None:
            config = AITransitionConfig()

        logger.info(
            f"Génération de transition {transition_type.value} entre {clip_a_path} et {clip_b_path}"
        )

        try:
            if transition_type == AITransitionType.SMART_FADE:
                return await self._generate_smart_fade(
                    clip_a_path, clip_b_path, output_path, config
                )
            elif transition_type == AITransitionType.INTERPOLATE:
                return await self._generate_interpolation(
                    clip_a_path, clip_b_path, output_path, config
                )
            elif transition_type == AITransitionType.MORPH:
                return await self._generate_morph(
                    clip_a_path, clip_b_path, output_path, config
                )
            else:
                raise ValueError(f"Type de transition non supporté : {transition_type}")
        except Exception as e:
            logger.error(f"Erreur lors de la génération de la transition : {str(e)}")
            return False

    async def _generate_smart_fade(
        self, clip_a: str, clip_b: str, output: str, config: AITransitionConfig
    ) -> bool:
        """Génère un fondu intelligent via ContentAwareInterpolator."""
        # Extraction des frames clés
        frame_a = await self._extract_last_frame(clip_a)
        frame_b = await self._extract_first_frame(clip_b)

        if not frame_a or not frame_b:
            return False

        # Interpolation
        num_frames = int(config.duration * config.fps)
        from PIL import Image

        img_a = Image.open(frame_a)
        img_b = Image.open(frame_b)

        result = self.interpolator.interpolate_frames(img_a, img_b, num_frames)

        # Sauvegarde des frames et assemblage
        temp_dir = Path("temp_transition")
        temp_dir.mkdir(exist_ok=True)

        for i, frame in enumerate(result.interpolated_frames):
            frame_path = temp_dir / f"frame_{i:04d}.png"
            with open(frame_path, "wb") as f:
                f.write(frame.frame_data)

        # Assemblage FFmpeg
        success = self._assemble_clip(str(temp_dir), output, config.fps)

        # Nettoyage
        for f in temp_dir.glob("*.png"):
            f.unlink()
        temp_dir.rmdir()
        os.remove(frame_a)
        os.remove(frame_b)

        return success

    async def _generate_interpolation(
        self, clip_a: str, clip_b: str, output: str, config: AITransitionConfig
    ) -> bool:
        """Génère une interpolation via RIFE (ComfyUI)."""
        return await self._execute_comfy_transition(
            clip_a, clip_b, output, config, "ai_rife_workflow.json"
        )

    async def _generate_morph(
        self, clip_a: str, clip_b: str, output: str, config: AITransitionConfig
    ) -> bool:
        """Génère un morphing via ComfyUI."""
        return await self._execute_comfy_transition(
            clip_a, clip_b, output, config, "ai_morph_workflow.json"
        )

    async def _execute_comfy_transition(
        self,
        clip_a: str,
        clip_b: str,
        output: str,
        config: AITransitionConfig,
        workflow_file: str,
    ) -> bool:
        """Exécute un workflow ComfyUI pour une transition."""
        try:
            # 1. Extraction des frames
            frame_a = await self._extract_last_frame(clip_a)
            frame_b = await self._extract_first_frame(clip_b)

            if not frame_a or not frame_b:
                return False

            # 2. Connexion ComfyUI
            await self.connection.connect()

            # 3. Chargement et injection
            workflow = self.executor.load_workflow(workflow_file)

            # Injection des chemins d'images (ComfyUI nécessite souvent des noms de fichiers dans son dossier input)
            # Pour cet exemple, on suppose que les fichiers sont accessibles ou déjà uploadés
            # Dans une version réelle, il faudrait utiliser self.connection.post("/upload/image", ...)

            # 4. Exécution
            prompt_id = await self.executor.execute_workflow(workflow)
            result = await self.executor.wait_for_completion(
                prompt_id, timeout=config.duration * 300
            )

            # 5. Téléchargement du résultat
            temp_output = Path("temp_comfy_output.png")
            await self.executor.download_output(result, temp_output)

            # 6. Conversion en clip (si ComfyUI sort une image/séquence)
            # Ici on simplifie : si c'est une séquence d'images, on les assemble.
            # Si c'est une seule image (morphing statique), on en fait un clip de la durée voulue.
            success = self._assemble_clip_from_single_image(
                str(temp_output), output, config.duration, config.fps
            )

            # Nettoyage
            if temp_output.exists():
                temp_output.unlink()
            os.remove(frame_a)
            os.remove(frame_b)

            return success

        except Exception as e:
            logger.error(f"Erreur ComfyUI transition ({workflow_file}): {str(e)}")
            return await self._generate_smart_fade(clip_a, clip_b, output, config)
        finally:
            await self.connection.close()

    def _assemble_clip_from_single_image(
        self, image_path: str, output_path: str, duration: float, fps: int
    ) -> bool:
        """Crée un clip vidéo à partir d'une seule image répétée."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-loop",
            "1",
            "-i",
            image_path,
            "-c:v",
            "libx264",
            "-t",
            str(duration),
            "-pix_fmt",
            "yuv420p",
            "-vf",
            f"fps={fps}",
            output_path,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False

    async def _extract_last_frame(self, clip_path: str) -> Optional[str]:
        """Extrait la dernière frame d'un clip."""
        output_frame = "last_frame.png"
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-sseof",
            "-0.1",
            "-i",
            clip_path,
            "-update",
            "1",
            "-q:v",
            "2",
            output_frame,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return output_frame
        except subprocess.CalledProcessError:
            return None

    async def _extract_first_frame(self, clip_path: str) -> Optional[str]:
        """Extrait la première frame d'un clip."""
        output_frame = "first_frame.png"
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-i",
            clip_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            output_frame,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return output_frame
        except subprocess.CalledProcessError:
            return None

    def _assemble_clip(self, frames_dir: str, output_path: str, fps: int) -> bool:
        """Assemble des frames en un clip vidéo."""
        cmd = [
            self.ffmpeg_path,
            "-y",
            "-framerate",
            str(fps),
            "-i",
            os.path.join(frames_dir, "frame_%04d.png"),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            output_path,
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError:
            return False
