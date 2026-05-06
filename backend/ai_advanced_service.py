"""
AI Advanced Service for StoryCore-Engine

Provides advanced AI-powered tools:
- Magic Mask / Rotoscopie (automatic subject isolation)
- 3D-to-AI Layout Rendering (depth map guide)
- Bloom/Anamorphic Effect (film-style halo)
- AI Subtitle Generator (automatic subtitles with styles)
- AI Background Replacement

Phase 7: Advanced AI Tools
"""

import logging
import os
import subprocess
import tempfile
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================


class MaskType(str, Enum):
    """Types of mask generation"""

    PERSON = "person"
    FACE = "face"
    HAIR = "hair"
    BODY = "body"
    HANDS = "hands"
    BACKGROUND = "background"
    OBJECT = "object"
    CUSTOM = "custom"


class SubtitleStyle(str, Enum):
    """Subtitle styling options"""

    DEFAULT = "default"
    NETFLIX = "netflix"
    YOUTUBE = "youtube"
    CINEMATIC = "cinematic"
    MINIMAL = "minimal"
    BOLD = "bold"
    OUTLINE = "outline"
    GLOW = "glow"


class BloomIntensity(str, Enum):
    """Bloom effect intensity presets"""

    SUBTLE = "subtle"
    MODERATE = "moderate"
    STRONG = "strong"
    ANAMORPHIC = "anamorphic"


class DepthMapMethod(str, Enum):
    """Depth map estimation methods"""

    MIDAS = "midas"
    DPT = "dpt"
    ADADEPTH = "adadepth"
    SIMPLE = "simple"


@dataclass
class MaskConfig:
    """Configuration for mask generation"""

    input_path: str
    output_path: str
    mask_type: MaskType = MaskType.PERSON
    refine_edges: bool = True
    feather: int = 5  # pixels
    invert: bool = False
    tracking: bool = False  # Track across frames
    output_alpha: bool = True


@dataclass
class DepthMapConfig:
    """Configuration for depth map generation"""

    input_path: str
    output_path: str
    method: DepthMapMethod = DepthMapMethod.SIMPLE
    normalize: bool = True
    invert: bool = False
    blur: int = 0  # Gaussian blur radius


@dataclass
class BloomConfig:
    """Configuration for bloom effect"""

    input_path: str
    output_path: str
    intensity: BloomIntensity = BloomIntensity.MODERATE
    threshold: float = 0.7  # Brightness threshold
    radius: int = 20
    strength: float = 0.5
    anamorphic_ratio: float = 1.0  # 2.35 for cinematic


@dataclass
class SubtitleConfig:
    """Configuration for subtitle generation"""

    video_path: str
    output_path: str
    style: SubtitleStyle = SubtitleStyle.DEFAULT
    font_size: int = 24
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 2
    position: str = "bottom"  # top, center, bottom
    margin: int = 50
    language: str = "auto"
    translate_to: Optional[str] = None


@dataclass
class BackgroundReplacementConfig:
    """Configuration for AI background replacement"""

    input_path: str
    output_path: str
    new_background: str  # Image path or color
    mask_path: Optional[str] = None
    blend_edges: int = 10
    color_match: bool = True
    lighting_match: bool = True


# =============================================================================
# Magic Mask / Rotoscopie Service
# =============================================================================


class MagicMaskService:
    """
    Automatic subject isolation using AI segmentation.
    Creates precise masks for characters, faces, or objects.
    """

    def __init__(self):
        self.supported_types = [
            MaskType.PERSON,
            MaskType.FACE,
            MaskType.HAIR,
            MaskType.BODY,
            MaskType.HANDS,
            MaskType.BACKGROUND,
        ]

    def generate_mask_frame(
        self,
        frame_path: str,
        output_path: str,
        mask_type: MaskType = MaskType.PERSON,
        refine_edges: bool = True,
    ) -> Tuple[bool, str]:
        """
        Generate mask for a single frame/image.

        Args:
            frame_path: Path to input frame
            output_path: Path for output mask
            mask_type: Type of segmentation
            refine_edges: Apply edge refinement

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(frame_path):
                return False, f"Frame not found: {frame_path}"

            # Try MediaPipe for person/face detection
            if mask_type in [MaskType.PERSON, MaskType.FACE, MaskType.BODY]:
                return self._mediapipe_segmentation(
                    frame_path, output_path, mask_type, refine_edges
                )

            # Try OpenCV for basic segmentation
            return self._opencv_segmentation(frame_path, output_path, mask_type)

        except Exception as e:
            return False, str(e)

    def _mediapipe_segmentation(
        self, frame_path: str, output_path: str, mask_type: MaskType, refine_edges: bool
    ) -> Tuple[bool, str]:
        """Use MediaPipe for segmentation."""
        try:
            import mediapipe as mp
            import cv2

            image = cv2.imread(frame_path)
            h, w = image.shape[:2]

            if mask_type == MaskType.PERSON:
                # Selfie segmentation
                mp_selfie = mp.solutions.selfie_segmentation
                with mp_selfie.SelfieSegmentation(model_selection=1) as segmenter:
                    results = segmenter.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
                    mask = (results.segmentation_mask > 0.5).astype(np.uint8) * 255

            elif mask_type == MaskType.FACE:
                # Face mesh for face mask
                mp_face_mesh = mp.solutions.face_mesh
                with mp_face_mesh.FaceMesh(static_image_mode=True) as face_mesh:
                    results = face_mesh.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

                    mask = np.zeros((h, w), dtype=np.uint8)
                    if results.multi_face_landmarks:
                        for face_landmarks in results.multi_face_landmarks:
                            # Get face contour points
                            points = []
                            for landmark in face_landmarks.landmark:
                                x = int(landmark.x * w)
                                y = int(landmark.y * h)
                                points.append([x, y])

                            # Convex hull for face mask
                            points = np.array(points, dtype=np.int32)
                            hull = cv2.convexHull(points)
                            cv2.fillConvexPoly(mask, hull, 255)

            else:
                # Body pose estimation
                mp_pose = mp.solutions.pose
                with mp_pose.Pose(static_image_mode=True) as pose:
                    results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

                    mask = np.zeros((h, w), dtype=np.uint8)
                    if results.pose_landmarks:
                        # Draw body mask
                        landmarks = results.pose_landmarks.landmark
                        # Create body silhouette from key points
                        body_points = []
                        for i in [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]:
                            lm = landmarks[i]
                            x = int(lm.x * w)
                            y = int(lm.y * h)
                            body_points.append([x, y])

                        body_points = np.array(body_points, dtype=np.int32)
                        cv2.fillConvexPoly(mask, body_points, 255)

            # Edge refinement
            if refine_edges:
                mask = cv2.GaussianBlur(mask, (5, 5), 0)

            cv2.imwrite(output_path, mask)
            return True, f"Mask generated: {output_path}"

        except ImportError:
            logger.warning("MediaPipe not available")
            return self._opencv_segmentation(frame_path, output_path, mask_type)
        except Exception as e:
            return False, str(e)

    def _opencv_segmentation(
        self, frame_path: str, output_path: str, mask_type: MaskType
    ) -> Tuple[bool, str]:
        """Fallback OpenCV-based segmentation."""
        try:
            import cv2

            image = cv2.imread(frame_path)
            h, w = image.shape[:2]

            # GrabCut for foreground extraction
            mask = np.zeros((h, w), np.uint8)
            bgd_model = np.zeros((1, 65), np.float64)
            fgd_model = np.zeros((1, 65), np.float64)

            rect = (w // 10, h // 10, w * 8 // 10, h * 8 // 10)
            cv2.grabCut(
                image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT
            )

            mask = np.where((mask == 2) | (mask == 0), 0, 1).astype("uint8") * 255

            cv2.imwrite(output_path, mask)
            return True, f"OpenCV mask generated: {output_path}"

        except Exception as e:
            return False, str(e)

    def generate_mask_video(
        self, video_path: str, output_dir: str, config: MaskConfig
    ) -> Tuple[bool, str, List[str]]:
        """
        Generate masks for entire video (rotoscoping).

        Args:
            video_path: Path to input video
            output_dir: Directory for mask frames
            config: Mask configuration

        Returns:
            Tuple of (success, message, list of mask paths)
        """
        try:
            import cv2

            os.makedirs(output_dir, exist_ok=True)

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return False, "Could not open video", []

            int(cap.get(cv2.CAP_PROP_FPS))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            mask_paths = []
            frame_idx = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Save frame temporarily
                temp_frame = os.path.join(output_dir, f"temp_frame_{frame_idx}.png")
                cv2.imwrite(temp_frame, frame)

                # Generate mask
                mask_path = os.path.join(output_dir, f"mask_{frame_idx:05d}.png")
                success, msg = self.generate_mask_frame(
                    temp_frame, mask_path, config.mask_type, config.refine_edges
                )

                # Clean up temp frame
                os.unlink(temp_frame)

                if success:
                    mask_paths.append(mask_path)

                frame_idx += 1
                if frame_idx % 30 == 0:
                    logger.info(f"Processed {frame_idx}/{total_frames} frames")

            cap.release()

            return True, f"Generated {len(mask_paths)} masks", mask_paths

        except Exception as e:
            return False, str(e), []

    def apply_mask_to_video(
        self, video_path: str, mask_dir: str, output_path: str, feather: int = 5
    ) -> Tuple[bool, str]:
        """
        Apply masks to video for transparent background.

        Args:
            video_path: Path to input video
            mask_dir: Directory containing mask frames
            output_path: Path for output video (WebM with alpha)
            feather: Edge feathering in pixels

        Returns:
            Tuple of (success, message)
        """
        try:
            import cv2

            # Get mask files
            mask_files = sorted(
                [
                    f
                    for f in os.listdir(mask_dir)
                    if f.startswith("mask_") and f.endswith(".png")
                ]
            )

            if not mask_files:
                return False, "No mask files found"

            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                return False, "Could not open video"

            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))

            # Output as WebM with alpha
            fourcc = cv2.VideoWriter_fourcc(*"VP09")
            out = cv2.VideoWriter(output_path, fourcc, fps, (w, h))

            frame_idx = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                if frame_idx < len(mask_files):
                    mask = cv2.imread(
                        os.path.join(mask_dir, mask_files[frame_idx]),
                        cv2.IMREAD_GRAYSCALE,
                    )

                    if mask is not None:
                        # Feather mask
                        if feather > 0:
                            mask = cv2.GaussianBlur(
                                mask, (feather * 2 + 1, feather * 2 + 1), 0
                            )

                        # Apply mask
                        alpha = mask.astype(float) / 255.0
                        for c in range(3):
                            frame[:, :, c] = (frame[:, :, c] * alpha).astype(np.uint8)

                out.write(frame)
                frame_idx += 1

            cap.release()
            out.release()

            return True, f"Masked video created: {output_path}"

        except Exception as e:
            return False, str(e)


# =============================================================================
# Depth Map Service
# =============================================================================


class DepthMapService:
    """
    Generate depth maps from images/video for AI-guided generation.
    """

    def __init__(self):
        self.methods = {
            DepthMapMethod.SIMPLE: self._simple_depth,
            DepthMapMethod.MIDAS: self._midas_depth,
        }

    def generate_depth_map(self, config: DepthMapConfig) -> Tuple[bool, str]:
        """
        Generate depth map from image.

        Args:
            config: Depth map configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(config.input_path):
                return False, f"Input not found: {config.input_path}"

            method_func = self.methods.get(config.method, self._simple_depth)
            return method_func(config)

        except Exception as e:
            return False, str(e)

    def _simple_depth(self, config: DepthMapConfig) -> Tuple[bool, str]:
        """Simple depth estimation using image gradients."""
        try:
            import cv2

            image = cv2.imread(config.input_path)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Simple depth from defocus/blurriness
            # Use Laplacian variance as depth proxy
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            depth = np.abs(laplacian)

            # Invert (sharp = close, blurry = far)
            depth = 255 - (depth / depth.max() * 255).astype(np.uint8)

            # Apply blur if specified
            if config.blur > 0:
                depth = cv2.GaussianBlur(
                    depth, (config.blur * 2 + 1, config.blur * 2 + 1), 0
                )

            # Invert if needed
            if config.invert:
                depth = 255 - depth

            cv2.imwrite(config.output_path, depth)
            return True, f"Depth map generated: {config.output_path}"

        except Exception as e:
            return False, str(e)

    def _midas_depth(self, config: DepthMapConfig) -> Tuple[bool, str]:
        """MiDaS-based depth estimation."""
        try:
            import torch
            from torchvision import transforms

            # Load MiDaS model
            model_type = "MiDaS_small"
            midas = torch.hub.load("intel-isl/MiDaS", model_type)
            midas.eval()

            # Load transforms
            transform = transforms.Compose(
                [
                    transforms.ToTensor(),
                    transforms.Normalize(
                        mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
                    ),
                ]
            )

            import cv2

            image = cv2.imread(config.input_path)
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

            # Transform
            input_tensor = transform(image_rgb).unsqueeze(0)

            # Predict depth
            with torch.no_grad():
                prediction = midas(input_tensor)
                prediction = torch.nn.functional.interpolate(
                    prediction.unsqueeze(1),
                    size=image_rgb.shape[:2],
                    mode="bicubic",
                    align_corners=False,
                ).squeeze()

            depth = prediction.cpu().numpy()

            # Normalize
            if config.normalize:
                depth = (depth - depth.min()) / (depth.max() - depth.min()) * 255
                depth = depth.astype(np.uint8)

            if config.invert:
                depth = 255 - depth

            cv2.imwrite(config.output_path, depth)
            return True, f"MiDaS depth map generated: {config.output_path}"

        except ImportError:
            logger.warning("PyTorch/MiDaS not available, falling back to simple method")
            return self._simple_depth(config)
        except Exception as e:
            return False, str(e)

    def generate_depth_layout_prompt(
        self, image_path: str, depth_path: str, style: str = "cinematic"
    ) -> str:
        """
        Generate AI prompt from image + depth map.

        Use depth map to guide AI generation.
        """
        return (
            f"cinematic shot, depth of field guided by depth map, "
            f"foreground in focus, background blurred, "
            f"professional lighting, {style} style, "
            f"high detail, 8k quality"
        )


# =============================================================================
# Bloom/Anamorphic Effect Service
# =============================================================================


class BloomEffectService:
    """
    Create bloom and anamorphic lens effects.
    Adds cinematic look with light halos.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

        self.presets = {
            BloomIntensity.SUBTLE: {"threshold": 0.8, "radius": 10, "strength": 0.3},
            BloomIntensity.MODERATE: {"threshold": 0.7, "radius": 20, "strength": 0.5},
            BloomIntensity.STRONG: {"threshold": 0.6, "radius": 30, "strength": 0.7},
            BloomIntensity.ANAMORPHIC: {
                "threshold": 0.7,
                "radius": 40,
                "strength": 0.6,
                "ratio": 2.35,
            },
        }

    def apply_bloom(self, config: BloomConfig) -> Tuple[bool, str]:
        """
        Apply bloom effect to image/video.

        Args:
            config: Bloom configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(config.input_path):
                return False, f"Input not found: {config.input_path}"

            # Get preset values
            preset = self.presets.get(
                config.intensity, self.presets[BloomIntensity.MODERATE]
            )
            threshold = config.threshold or preset["threshold"]
            radius = config.radius or preset["radius"]
            strength = config.strength or preset["strength"]

            # Build FFmpeg filter
            bloom_filter = (
                f"[0:v]split[base][bloom];"
                f"[bloom]eq=brightness={threshold},boxblur={radius}:{radius}[blurred];"
                f"[base][blurred]blend=screen:all_mode=normal:all_opacity={strength}"
            )

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                config.input_path,
                "-filter_complex",
                bloom_filter,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "18",
                "-c:a",
                "copy",
                config.output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                return False, f"Bloom failed: {result.stderr}"

            return True, f"Bloom applied: {config.output_path}"

        except Exception as e:
            return False, str(e)

    def apply_anamorphic_flare(
        self,
        input_path: str,
        output_path: str,
        intensity: float = 0.5,
        horizontal_stretch: float = 2.35,
    ) -> Tuple[bool, str]:
        """
        Apply anamorphic lens flare effect.

        Args:
            input_path: Input video/image path
            output_path: Output path
            intensity: Flare intensity (0-1)
            horizontal_stretch: Horizontal stretch ratio

        Returns:
            Tuple of (success, message)
        """
        try:
            # Anamorphic flare filter using FFmpeg
            flare_filter = (
                f"colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3:0,"
                f"eq=contrast=1.1:saturation=1.1,"
                f"unsharp=5:5:{intensity}:5:5:0"
            )

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                input_path,
                "-vf",
                flare_filter,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-c:a",
                "copy",
                output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                return False, f"Anamorphic flare failed: {result.stderr}"

            return True, f"Anamorphic flare applied: {output_path}"

        except Exception as e:
            return False, str(e)


# =============================================================================
# AI Subtitle Generator Service
# =============================================================================


class AISubtitleService:
    """
    Generate automatic subtitles with styling.
    Uses Whisper for transcription.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

        self.style_templates = {
            SubtitleStyle.DEFAULT: {
                "fontsize": 24,
                "fontcolor": "white",
                "outline": 2,
                "outlinecolor": "black",
            },
            SubtitleStyle.NETFLIX: {
                "fontsize": 28,
                "fontcolor": "white",
                "outline": 3,
                "outlinecolor": "black",
                "bold": 1,
            },
            SubtitleStyle.YOUTUBE: {
                "fontsize": 22,
                "fontcolor": "white",
                "outline": 2,
                "outlinecolor": "black",
                "shadow": 1,
            },
            SubtitleStyle.CINEMATIC: {
                "fontsize": 32,
                "fontcolor": "white",
                "outline": 0,
                "box": 1,
                "boxcolor": "black@0.5",
            },
            SubtitleStyle.MINIMAL: {
                "fontsize": 20,
                "fontcolor": "white",
                "outline": 1,
                "outlinecolor": "gray",
            },
            SubtitleStyle.BOLD: {
                "fontsize": 26,
                "fontcolor": "yellow",
                "outline": 2,
                "outlinecolor": "black",
                "bold": 1,
            },
            SubtitleStyle.OUTLINE: {
                "fontsize": 24,
                "fontcolor": "white",
                "outline": 4,
                "outlinecolor": "blue",
            },
            SubtitleStyle.GLOW: {
                "fontsize": 28,
                "fontcolor": "white",
                "shadow": 3,
                "shadowcolor": "cyan",
            },
        }

    def transcribe_video(
        self, video_path: str, output_srt: str, language: str = "auto"
    ) -> Tuple[bool, str]:
        """
        Transcribe video to SRT subtitles.

        Args:
            video_path: Path to video file
            output_srt: Path for output SRT file
            language: Language code or 'auto'

        Returns:
            Tuple of (success, message)
        """
        try:
            import whisper

            # Load model
            model = whisper.load_model("base")

            # Transcribe
            result = model.transcribe(
                video_path, language=None if language == "auto" else language
            )

            # Generate SRT
            self._generate_srt(result["segments"], output_srt)

            return True, f"Subtitles generated: {output_srt}"

        except ImportError:
            logger.warning("Whisper not available")
            return self._fallback_transcribe(video_path, output_srt)
        except Exception as e:
            return False, str(e)

    def _fallback_transcribe(
        self, video_path: str, output_srt: str
    ) -> Tuple[bool, str]:
        """Fallback using existing transcription service."""
        try:
            from backend.ai_audio_service import TranscriptionService

            # Extract audio first
            temp_audio = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            temp_audio.close()

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                video_path,
                "-vn",
                "-acodec",
                "pcm_s16le",
                temp_audio.name,
            ]
            subprocess.run(cmd, capture_output=True)

            # Transcribe
            service = TranscriptionService()
            result = service.transcribe(temp_audio.name)

            os.unlink(temp_audio.name)

            if result.get("segments"):
                self._generate_srt(result["segments"], output_srt)
                return True, f"Subtitles generated: {output_srt}"

            return False, "Transcription failed"

        except Exception as e:
            return False, str(e)

    def _generate_srt(self, segments: List[Dict], output_path: str):
        """Generate SRT file from segments."""
        with open(output_path, "w", encoding="utf-8") as f:
            for i, seg in enumerate(segments, 1):
                start = self._seconds_to_srt_time(seg.get("start", 0))
                end = self._seconds_to_srt_time(seg.get("end", 0))
                text = seg.get("text", "").strip()

                f.write(f"{i}\n")
                f.write(f"{start} --> {end}\n")
                f.write(f"{text}\n\n")

    def _seconds_to_srt_time(self, seconds: float) -> str:
        """Convert seconds to SRT timestamp format."""
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        millis = int((seconds % 1) * 1000)
        return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

    def apply_subtitles_to_video(self, config: SubtitleConfig) -> Tuple[bool, str]:
        """
        Burn subtitles into video.

        Args:
            config: Subtitle configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            # First transcribe
            temp_srt = tempfile.NamedTemporaryFile(
                suffix=".srt", delete=False, mode="w"
            )
            temp_srt.close()

            success, msg = self.transcribe_video(
                config.video_path, temp_srt.name, config.language
            )

            if not success:
                os.unlink(temp_srt.name)
                return False, f"Transcription failed: {msg}"

            # Get style
            style = self.style_templates.get(
                config.style, self.style_templates[SubtitleStyle.DEFAULT]
            )

            # Build subtitles filter
            subtitles_filter = (
                f"subtitles={temp_srt.name}:force_style='"
                f"FontSize={config.font_size or style['fontsize']},"
                f"PrimaryColour=&H{self._color_to_ass(config.font_color)},"
                f"OutlineColour=&H{self._color_to_ass(config.outline_color)},"
                f"Outline={config.outline_width or style.get('outline', 2)},"
                f"MarginV={config.margin}'"
            )

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                config.video_path,
                "-vf",
                subtitles_filter,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "18",
                "-c:a",
                "copy",
                config.output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

            os.unlink(temp_srt.name)

            if result.returncode != 0:
                return False, f"Subtitle burn failed: {result.stderr}"

            return True, f"Subtitles burned: {config.output_path}"

        except Exception as e:
            return False, str(e)

    def _color_to_ass(self, color: str) -> str:
        """Convert color name/hex to ASS format."""
        color_map = {
            "white": "FFFFFF",
            "black": "000000",
            "red": "0000FF",
            "green": "00FF00",
            "blue": "FF0000",
            "yellow": "00FFFF",
            "cyan": "FFFF00",
            "gray": "808080",
        }

        if color.lower() in color_map:
            return color_map[color.lower()]
        elif color.startswith("#"):
            return color[1:]
        return "FFFFFF"

    def translate_subtitles(
        self, srt_path: str, output_path: str, target_language: str
    ) -> Tuple[bool, str]:
        """
        Translate existing subtitles.

        Args:
            srt_path: Path to SRT file
            output_path: Path for translated SRT
            target_language: Target language code

        Returns:
            Tuple of (success, message)
        """
        try:
            # Read original subtitles
            with open(srt_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Simple translation using LLM service
            try:
                from backend.llm_service import get_llm_service

                llm = get_llm_service()

                prompt = f"Translate the following subtitles to {target_language}. Keep the timing format exactly as is:\n\n{content}"
                translated = llm.generate(prompt)

                with open(output_path, "w", encoding="utf-8") as f:
                    f.write(translated)

                return True, f"Translated to {target_language}: {output_path}"

            except ImportError:
                return False, "LLM service not available for translation"

        except Exception as e:
            return False, str(e)


# =============================================================================
# Background Replacement Service
# =============================================================================


class BackgroundReplacementService:
    """
    AI-powered background replacement.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

    def replace_background(
        self, config: BackgroundReplacementConfig
    ) -> Tuple[bool, str]:
        """
        Replace background in image/video.

        Args:
            config: Background replacement configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(config.input_path):
                return False, f"Input not found: {config.input_path}"

            # Generate mask if not provided
            if not config.mask_path:
                mask_service = MagicMaskService()
                temp_mask = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
                temp_mask.close()

                success, msg = mask_service.generate_mask_frame(
                    config.input_path, temp_mask.name, MaskType.PERSON
                )

                if not success:
                    os.unlink(temp_mask.name)
                    return False, f"Mask generation failed: {msg}"

                mask_path = temp_mask.name
            else:
                mask_path = config.mask_path

            # Determine if background is color or image
            if os.path.exists(config.new_background):
                # Image background
                success, msg = self._composite_with_background_image(
                    config.input_path,
                    mask_path,
                    config.new_background,
                    config.output_path,
                    config.blend_edges,
                    config.color_match,
                )
            else:
                # Color background
                success, msg = self._composite_with_color(
                    config.input_path,
                    mask_path,
                    config.new_background,
                    config.output_path,
                    config.blend_edges,
                )

            # Cleanup temp mask
            if not config.mask_path and os.path.exists(mask_path):
                os.unlink(mask_path)

            return success, msg

        except Exception as e:
            return False, str(e)

    def _composite_with_background_image(
        self,
        foreground: str,
        mask: str,
        background: str,
        output: str,
        blend: int,
        color_match: bool,
    ) -> Tuple[bool, str]:
        """Composite foreground onto new background image."""
        try:
            import cv2

            fg = cv2.imread(foreground)
            bg = cv2.imread(background)
            mask_img = cv2.imread(mask, cv2.IMREAD_GRAYSCALE)

            # Resize background to match foreground
            bg = cv2.resize(bg, (fg.shape[1], fg.shape[0]))

            # Color matching
            if color_match:
                # Simple histogram matching
                fg_hsv = cv2.cvtColor(fg, cv2.COLOR_BGR2HSV)
                bg_hsv = cv2.cvtColor(bg, cv2.COLOR_BGR2HSV)

                # Match brightness
                fg_mean = fg_hsv[:, :, 2].mean()
                bg_hsv[:, :, 2] = np.clip(
                    bg_hsv[:, :, 2] * (fg_mean / bg_hsv[:, :, 2].mean()), 0, 255
                )
                bg = cv2.cvtColor(bg_hsv, cv2.COLOR_HSV2BGR)

            # Blend mask edges
            if blend > 0:
                mask_img = cv2.GaussianBlur(mask_img, (blend * 2 + 1, blend * 2 + 1), 0)

            # Composite
            alpha = mask_img.astype(float) / 255.0
            alpha = alpha[:, :, np.newaxis]

            result = (fg * alpha + bg * (1 - alpha)).astype(np.uint8)

            cv2.imwrite(output, result)
            return True, f"Background replaced: {output}"

        except Exception as e:
            return False, str(e)

    def _composite_with_color(
        self, foreground: str, mask: str, color: str, output: str, blend: int
    ) -> Tuple[bool, str]:
        """Composite foreground onto solid color."""
        try:
            import cv2

            fg = cv2.imread(foreground)
            mask_img = cv2.imread(mask, cv2.IMREAD_GRAYSCALE)

            # Parse color
            if color.startswith("#"):
                # Hex color
                hex_color = color[1:]
                b = int(hex_color[4:6], 16)
                g = int(hex_color[2:4], 16)
                r = int(hex_color[0:2], 16)
            else:
                # Named color or RGB
                color_map = {
                    "green": (0, 255, 0),
                    "blue": (255, 0, 0),
                    "red": (0, 0, 255),
                    "white": (255, 255, 255),
                    "black": (0, 0, 0),
                }
                b, g, r = color_map.get(color.lower(), (0, 255, 0))

            # Create color background
            bg = np.full(fg.shape, (b, g, r), dtype=np.uint8)

            # Blend mask
            if blend > 0:
                mask_img = cv2.GaussianBlur(mask_img, (blend * 2 + 1, blend * 2 + 1), 0)

            # Composite
            alpha = mask_img.astype(float) / 255.0
            alpha = alpha[:, :, np.newaxis]

            result = (fg * alpha + bg * (1 - alpha)).astype(np.uint8)

            cv2.imwrite(output, result)
            return True, f"Background replaced with color: {output}"

        except Exception as e:
            return False, str(e)


# =============================================================================
# Factory Functions
# =============================================================================


def create_magic_mask_service() -> MagicMaskService:
    return MagicMaskService()


def create_depth_map_service() -> DepthMapService:
    return DepthMapService()


def create_bloom_service(ffmpeg_path: str = "ffmpeg") -> BloomEffectService:
    return BloomEffectService(ffmpeg_path)


def create_subtitle_service(ffmpeg_path: str = "ffmpeg") -> AISubtitleService:
    return AISubtitleService(ffmpeg_path)


def create_background_service(
    ffmpeg_path: str = "ffmpeg",
) -> BackgroundReplacementService:
    return BackgroundReplacementService(ffmpeg_path)


# =============================================================================
# Service Instances
# =============================================================================

_mask_service = None
_depth_service = None
_bloom_service = None
_subtitle_service = None
_background_service = None


def get_mask_service() -> MagicMaskService:
    global _mask_service
    if _mask_service is None:
        _mask_service = create_magic_mask_service()
    return _mask_service


def get_depth_service() -> DepthMapService:
    global _depth_service
    if _depth_service is None:
        _depth_service = create_depth_map_service()
    return _depth_service


def get_bloom_service() -> BloomEffectService:
    global _bloom_service
    if _bloom_service is None:
        _bloom_service = create_bloom_service()
    return _bloom_service


def get_subtitle_service() -> AISubtitleService:
    global _subtitle_service
    if _subtitle_service is None:
        _subtitle_service = create_subtitle_service()
    return _subtitle_service


def get_background_service() -> BackgroundReplacementService:
    global _background_service
    if _background_service is None:
        _background_service = create_background_service()
    return _background_service
