"""
High-Impact Features Service
===========================
Bridge between FastAPI endpoints and the specialized AI engines in src/.
Handles Skin Enhancement, SFX Generation, Clothes Swap, etc.
"""

import logging
import time
from typing import Any, Dict, Optional
from pathlib import Path
from PIL import Image
import io
import base64

# Import Engines
from src.image_enhancement.skin_enhancer import SkinEnhancerEngine
from src.audio_processing.sfx_generator import SFXGeneratorEngine, SFXConfig
from src.image_enhancement.clothes_swapper import ClothesSwapperEngine
from src.image_enhancement.outfit_changer import OutfitChangerEngine
from src.image_enhancement.style_snap import StyleSnapEngine
from src.image_enhancement.face_recognizer import FaceRecognizer
from src.image_enhancement.infographics_generator import InfographicsGeneratorEngine
from src.image_enhancement.background_replacer import BackgroundReplacerEngine
from src.audio_processing.music_remixer import MusicRemixerEngine
from src.transcription_engine import TranscriptionEngine

logger = logging.getLogger(__name__)


class HighImpactService:
    def __init__(self):
        self.skin_engine = SkinEnhancerEngine()
        self.sfx_engine = SFXGeneratorEngine()
        self.clothes_swapper = ClothesSwapperEngine()
        self.outfit_changer = OutfitChangerEngine()
        self.style_snap = StyleSnapEngine()
        self.face_recognizer = FaceRecognizer()
        self.infographics_engine = InfographicsGeneratorEngine()
        self.background_replacer = BackgroundReplacerEngine()
        self.music_remixer = MusicRemixerEngine()
        self.transcription_engine = TranscriptionEngine()

    async def enhance_skin(
        self, image_bytes: bytes, config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process skin enhancement on the provided image bytes."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            result = await self.skin_engine.enhance(image, config_override=config)

            if not result.success:
                return {"success": False, "error": result.error_message}

            # Convert result image to base64 for API response
            buffered = io.BytesIO()
            save_img = result.image
            if save_img.mode != "RGB":
                save_img = save_img.convert("RGB")
            save_img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "quality_score": result.quality_score,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service enhance_skin failed: {e}")
            return {"success": False, "error": str(e)}

    async def generate_sfx(self, prompt: str, duration: float = 3.0) -> Dict[str, Any]:
        """Generate SFX from text prompt."""
        try:
            cfg = SFXConfig(duration=duration)
            result = await self.sfx_engine.generate(prompt, config=cfg)

            if not result.success:
                return {"success": False, "error": result.error_message}

            return {
                "success": True,
                "audio_path": result.audio_path,
                "duration": result.duration,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service generate_sfx failed: {e}")
            return {"success": False, "error": str(e)}

    async def swap_clothes(
        self, person_image_bytes: bytes, garment_image_bytes: bytes
    ) -> Dict[str, Any]:
        """Perform Virtual Try-On (Clothes Swap)."""
        try:
            person_img = Image.open(io.BytesIO(person_image_bytes))
            garment_img = Image.open(io.BytesIO(garment_image_bytes))

            result = await self.clothes_swapper.swap_clothes(person_img, garment_img)

            if not result.success:
                return {"success": False, "error": result.error_message}

            buffered = io.BytesIO()
            save_img = result.result_image
            if save_img.mode != "RGB":
                save_img = save_img.convert("RGB")
            save_img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "quality_score": result.quality_score,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service swap_clothes failed: {e}")
            return {"success": False, "error": str(e)}

    async def change_outfit(
        self, image_bytes: bytes, outfit_prompt: str
    ) -> Dict[str, Any]:
        """Perform Virtual Try-On via OOTDiffusion."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Create a mock List[ClothingItem] for the engine
            from src.image_enhancement.outfit_changer import ClothingItem

            items = [ClothingItem(category="top", description=outfit_prompt)]

            result = await self.outfit_changer.change_outfit(image, items)

            if not result.success:
                return {"success": False, "error": result.error_message}

            buffered = io.BytesIO()
            save_img = result.image
            if getattr(save_img, "mode", None) != "RGB":
                save_img = save_img.convert("RGB")
            save_img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "quality_score": result.quality_score,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service change_outfit failed: {e}")
            return {"success": False, "error": str(e)}

    async def transfer_style(
        self, source_bytes: bytes, reference_bytes: bytes
    ) -> Dict[str, Any]:
        """Transfer style from reference image to source image via IP-Adapter."""
        try:
            src_img = Image.open(io.BytesIO(source_bytes))
            ref_img = Image.open(io.BytesIO(reference_bytes))

            result = await self.style_snap.transfer_style(src_img, ref_img)

            if not result.success:
                return {"success": False, "error": result.error_message}

            buffered = io.BytesIO()
            save_img = result.image
            if getattr(save_img, "mode", None) != "RGB":
                save_img = save_img.convert("RGB")
            save_img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "extracted_style": result.extracted_style.__dict__
                if result.extracted_style
                else {},
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service transfer_style failed: {e}")
            return {"success": False, "error": str(e)}

    async def recognize_face(self, image_bytes: bytes) -> Dict[str, Any]:
        """Extract facial embedding for identity preservation."""
        try:
            # We skip heavy PIL load if engine handles it otherwise,
            # but for now we pass a mock image obj as requested by engine sig
            image = Image.open(io.BytesIO(image_bytes))
            embedding = await self.face_recognizer.get_embedding(image)

            return {
                "success": True,
                "embedding": embedding.tolist()
                if hasattr(embedding, "tolist")
                else list(embedding),
                "model": self.face_recognizer.model_name,
            }
        except Exception as e:
            logger.error(f"Service recognize_face failed: {e}")
            return {"success": False, "error": str(e)}

    async def generate_infographics(
        self, text_data: str, style: str = "modern"
    ) -> Dict[str, Any]:
        """Generate stylistic infographics from text data."""
        try:
            from src.image_enhancement.infographics_generator import InfographicsConfig

            cfg = InfographicsConfig(style=style)
            result = await self.infographics_engine.generate(text_data, config=cfg)

            if not result.success:
                return {"success": False, "error": result.error_message}

            buffered = io.BytesIO()
            result.image.save(buffered, format="PNG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "layers": result.layers,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service generate_infographics failed: {e}")
            return {"success": False, "error": str(e)}

    async def replace_background(
        self, image_bytes: bytes, prompt: str, config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Replace image background using SAM and Diffusion."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            result = await self.background_replacer.replace_background(
                image, prompt, config_override=config
            )

            if not result.success:
                return {"success": False, "error": result.error_message}

            buffered = io.BytesIO()
            save_img = result.image
            if getattr(save_img, "mode", None) != "RGB":
                save_img = save_img.convert("RGB")
            save_img.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()

            return {
                "success": True,
                "image_base64": img_str,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service replace_background failed: {e}")
            return {"success": False, "error": str(e)}

    async def remix_music(
        self,
        audio_bytes: bytes,
        target_vibe: str,
        config: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Remix existing audio using stem separation and style transfer."""
        try:
            result = await self.music_remixer.remix(
                audio_bytes, target_vibe, config_override=config
            )

            if not result.success:
                return {"success": False, "error": result.error_message}

            return {
                "success": True,
                "audio_path": result.audio_path,
                "processing_time": result.processing_time,
            }
        except Exception as e:
            logger.error(f"Service remix_music failed: {e}")
            return {"success": False, "error": str(e)}

    async def generate_subtitles(
        self, audio_bytes: bytes, target_language: str = "en"
    ) -> Dict[str, Any]:
        """Generate translated subtitles from audio."""
        try:
            # 1. Transcribe (Mock/Local for now)
            # Create a temporary file for the transcription engine
            temp_path = Path(f"data/audio/transcription/temp_{int(time.time())}.wav")
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_path, "wb") as f:
                f.write(audio_bytes)

            transcript = await self.transcription_engine.transcribe(
                audio_id=f"audio_{int(time.time())}",
                audio_url=str(temp_path),
                language=None,  # Auto-detect
            )

            # 2. Translate if needed
            if target_language and transcript.language != target_language:
                transcript = await self.transcription_engine.translate_transcript(
                    transcript, target_language
                )

            # 3. Export to SRT
            srt_content = self.transcription_engine.export_srt(transcript)

            return {
                "success": True,
                "srt": srt_content,
                "language": transcript.language,
                "segments": [s.to_dict() for s in transcript.segments]
                if hasattr(transcript.segments[0], "to_dict")
                else [],
            }
        except Exception as e:
            logger.error(f"Service generate_subtitles failed: {e}")
            return {"success": False, "error": str(e)}


# Global instance
high_impact_service = HighImpactService()
