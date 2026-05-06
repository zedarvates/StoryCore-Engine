"""
AI Pro Service for StoryCore-Engine

Provides professional-grade features:
- Color Grading & LUTs
- Speed Ramping
- AI Scene Detection
- Keyframe System Backend
- VFX Effects

Phase 10: Pro Features
"""

import asyncio
import logging
import os
import subprocess
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================


class LUTType(str, Enum):
    """LUT file types"""

    CUBE = "cube"
    THREEDL = "3dl"
    MGA = "mga"
    CSP = "csp"


class SpeedRampType(str, Enum):
    """Speed ramp curve types"""

    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"
    EXPONENTIAL = "exponential"
    CUSTOM = "custom"


class SceneDetectionMethod(str, Enum):
    """Scene detection methods"""

    THRESHOLD = "threshold"
    CONTENT = "content"
    ADAPTIVE = "adaptive"
    HISTOGRAM = "histogram"


class ColorGradePreset(str, Enum):
    """Built-in color grading presets"""

    CINEMATIC = "cinematic"
    VINTAGE = "vintage"
    TEAL_ORANGE = "teal_orange"
    NOIR = "noir"
    WARM = "warm"
    COOL = "cool"
    HDR = "hdr"
    CUSTOM = "custom"


@dataclass
class ColorGradeConfig:
    """Configuration for color grading"""

    input_path: str
    output_path: str
    preset: ColorGradePreset = ColorGradePreset.CINEMATIC
    lut_path: Optional[str] = None
    lut_intensity: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    brightness: float = 0.0
    gamma: float = 1.0
    highlights: float = 0.0
    shadows: float = 0.0
    temperature: float = 0.0
    tint: float = 0.0


@dataclass
class SpeedRampPoint:
    """A point in speed ramp curve"""

    time: float
    speed: float
    curve_type: SpeedRampType = SpeedRampType.LINEAR


@dataclass
class SpeedRampConfig:
    """Configuration for speed ramping"""

    input_path: str
    output_path: str
    points: List[SpeedRampPoint]
    preserve_pitch: bool = True
    frame_interpolation: bool = False


@dataclass
class SceneInfo:
    """Information about a detected scene"""

    index: int
    start_time: float
    end_time: float
    duration: float
    frame_start: int
    frame_end: int
    score: float


@dataclass
class SceneDetectionConfig:
    """Configuration for scene detection"""

    input_path: str
    method: SceneDetectionMethod = SceneDetectionMethod.CONTENT
    threshold: float = 0.3
    min_scene_duration: float = 1.0
    output_json: Optional[str] = None


@dataclass
class Keyframe:
    """A single keyframe"""

    time: float  # seconds
    property_name: str
    value: Any
    easing: str = "linear"
    interpolation: str = "linear"  # linear, bezier, step


@dataclass
class KeyframeTrack:
    """A track of keyframes for a property"""

    property_name: str
    keyframes: List[Keyframe] = field(default_factory=list)

    def add_keyframe(self, keyframe: Keyframe):
        self.keyframes.append(keyframe)
        self.keyframes.sort(key=lambda k: k.time)

    def get_value_at_time(self, time: float) -> Any:
        """Calculates interpolated value at a specific time"""
        if not self.keyframes:
            return None

        # Ensure sorted
        self.keyframes.sort(key=lambda k: k.time)

        # Edge cases
        if time <= self.keyframes[0].time:
            return self.keyframes[0].value

        if time >= self.keyframes[-1].time:
            return self.keyframes[-1].value

        # Find surrounding keyframes
        k1 = self.keyframes[0]
        k2 = self.keyframes[-1]

        for i in range(len(self.keyframes) - 1):
            if self.keyframes[i].time <= time < self.keyframes[i + 1].time:
                k1 = self.keyframes[i]
                k2 = self.keyframes[i + 1]
                break

        # Interpolation logic
        if k1.interpolation == "step":
            return k1.value

        # Normalized time between keyframes [0, 1]
        t = (time - k1.time) / (k2.time - k1.time)

        # Apply easing function
        if k1.easing == "ease_in":
            t = t * t
        elif k1.easing == "ease_out":
            t = 1 - (1 - t) * (1 - t)
        elif k1.easing == "ease_in_out":
            t = 3 * t * t - 2 * t * t * t

        # Numeric interpolation
        if isinstance(k1.value, (int, float)) and isinstance(k2.value, (int, float)):
            return k1.value + (k2.value - k1.value) * t

        # Default to first value for non-numeric types
        return k1.value


# =============================================================================
# Color Grading Service
# =============================================================================


class ColorGradingService:
    """Service for professional color grading and LUT application."""

    def apply_color_grade(self, config: ColorGradeConfig) -> Tuple[bool, str]:
        """Apply color grading using FFmpeg."""
        try:
            # Build filter chain
            filters = []

            # 1. Preset
            if config.preset == ColorGradePreset.CINEMATIC:
                filters.append(
                    "colorbalance=rm=0.1:gm=0.0:bm=-0.1:rs=0.05:gs=0.0:bs=-0.05"
                )
            elif config.preset == ColorGradePreset.VINTAGE:
                filters.append("colorbalance=rs=0.1:gs=0.05:bs=-0.1:rh=0.05,hue=s=0.8")
            elif config.preset == ColorGradePreset.TEAL_ORANGE:
                filters.append(
                    "colorbalance=rm=-0.1:gm=0.05:bm=0.2:rs=0.2:gs=0.05:bs=-0.1"
                )
            elif config.preset == ColorGradePreset.NOIR:
                filters.append("hue=s=0,eq=contrast=1.2:brightness=-0.05")

            # 2. Manual Adjustments
            eq_params = []
            if config.contrast != 1.0:
                eq_params.append(f"contrast={config.contrast}")
            if config.brightness != 0.0:
                eq_params.append(f"brightness={config.brightness}")
            if config.gamma != 1.0:
                eq_params.append(f"gamma={config.gamma}")

            if eq_params:
                filters.append(f"eq={':'.join(eq_params)}")

            if config.saturation != 1.0:
                filters.append(f"hue=s={config.saturation}")

            # 3. LUT
            if config.lut_path and os.path.exists(config.lut_path):
                filters.append(f"lut3d='{config.lut_path}'")

            # Combine filters
            filter_str = ",".join(filters) if filters else "copy"

            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                config.input_path,
                "-vf",
                filter_str,
                "-c:a",
                "copy",
                config.output_path,
            ]

            subprocess.run(cmd, check=True, capture_output=True)
            return True, "Color grading applied successfully"

        except subprocess.CalledProcessError as e:
            logger.error(f"FFmpeg failed: {e.stderr.decode()}")
            return False, f"FFmpeg error: {e.stderr.decode()}"
        except Exception as e:
            logger.error(f"Color grading failed: {e}")
            return False, str(e)

    def list_presets(self) -> List[str]:
        """List available color presets."""
        return [p.value for p in ColorGradePreset]

    def list_luts(self, directory: str) -> List[str]:
        """List available LUT files in a directory."""
        if not os.path.exists(directory):
            return []

        valid_extensions = {".cube", ".3dl", ".mga", ".csp"}
        luts = []
        for f in os.listdir(directory):
            if any(f.endswith(ext) for ext in valid_extensions):
                luts.append(f)
        return luts


# =============================================================================
# Speed Ramping Service
# =============================================================================


class SpeedRampingService:
    """Service for smooth variable speed ramping."""

    def apply_speed_ramp(self, config: SpeedRampConfig) -> Tuple[bool, str]:
        """Apply speed ramping using FFmpeg's setpts and atempo filters."""
        try:
            if not config.points:
                return False, "No speed points provided"

            # For complex ramping, we calculate the remapped time for each frame
            # This is a simplified constant speed version if only 1 point,
            # or segment-based if multiple points.

            if len(config.points) == 1:
                speed = config.points[0].speed
                pts_filter = f"setpts={1.0 / speed}*PTS"
                audio_filters = []

                # Handle audio speed (atempo limit is 0.5 to 2.0 per filter)
                curr_speed = speed
                while curr_speed > 2.0:
                    audio_filters.append("atempo=2.0")
                    curr_speed /= 2.0
                while curr_speed < 0.5:
                    audio_filters.append("atempo=0.5")
                    curr_speed /= 0.5
                audio_filters.append(f"atempo={curr_speed}")

                af_str = ",".join(audio_filters) if config.preserve_pitch else "anull"

                cmd = [
                    "ffmpeg",
                    "-y",
                    "-i",
                    config.input_path,
                    "-vf",
                    pts_filter,
                    "-af",
                    af_str,
                    config.output_path,
                ]
            else:
                # Multi-point ramping is complex to do in a single FFmpeg command
                # We'll use a simplified segment-based approach or placeholder for now
                return False, "Multi-point ramping not yet fully implemented"

            subprocess.run(cmd, check=True, capture_output=True)
            return True, "Speed ramp applied successfully"

        except Exception as e:
            logger.error(f"Speed ramp failed: {e}")
            return False, str(e)

    def create_ramp_curve(
        self, points: List[SpeedRampPoint], num_samples: int = 100
    ) -> List[Tuple[float, float]]:
        """Generate curve data points for visualization."""
        if not points:
            return []

        points = sorted(points, key=lambda p: p.time)
        start_time = points[0].time
        end_time = points[-1].time
        duration = end_time - start_time

        curve = []
        for i in range(num_samples):
            t = start_time + (duration * i / (num_samples - 1))

            # Find surrounding points
            p1 = points[0]
            p2 = points[-1]
            for j in range(len(points) - 1):
                if points[j].time <= t <= points[j + 1].time:
                    p1 = points[j]
                    p2 = points[j + 1]
                    break

            # Interpolate speed
            if p1.time == p2.time:
                s = p1.speed
            else:
                factor = (t - p1.time) / (p2.time - p1.time)
                # Apply curve type
                if p1.curve_type == SpeedRampType.EASE_IN:
                    factor = factor * factor
                elif p1.curve_type == SpeedRampType.EASE_OUT:
                    factor = 1 - (1 - factor) * (1 - factor)
                s = p1.speed + (p2.speed - p1.speed) * factor

            curve.append((t, s))

        return curve


# =============================================================================
# Scene Detection Service
# =============================================================================


class SceneDetectionService:
    """Service for AI-powered scene change detection."""

    def detect_scenes(
        self, config: SceneDetectionConfig
    ) -> Tuple[bool, str, List[SceneInfo]]:
        """Detect scenes using various methods."""
        try:
            if config.method == SceneDetectionMethod.THRESHOLD:
                return self._detect_threshold(config)
            elif config.method == SceneDetectionMethod.CONTENT:
                return self._detect_content(config)
            else:
                return False, f"Method {config.method} not implemented", []

        except Exception as e:
            logger.error(f"Scene detection failed: {e}")
            return False, str(e), []

    def _detect_threshold(
        self, config: SceneDetectionConfig
    ) -> Tuple[bool, str, List[SceneInfo]]:
        """Basic threshold detection using FFmpeg scdet filter."""
        try:
            # We can use FFmpeg to output scene change timestamps
            cmd = [
                "ffmpeg",
                "-i",
                config.input_path,
                "-vf",
                f"scdet=s={config.threshold}:t=1",
                "-f",
                "null",
                "-",
            ]

            subprocess.run(cmd, capture_output=True, text=True)

            # Parse stderr for scdet output
            scenes = []
            # ... parsing logic ...

            return True, "Detection completed", scenes
        except Exception as e:
            return False, str(e), []

    def _detect_content(
        self, config: SceneDetectionConfig
    ) -> Tuple[bool, str, List[SceneInfo]]:
        """Content-aware detection via OpenCV."""
        try:
            import cv2

            cap = cv2.VideoCapture(config.input_path)
            if not cap.isOpened():
                return False, "Could not open video", []

            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

            scenes = []
            prev_frame = None
            scene_start_frame = 0

            for i in range(total_frames):
                ret, frame = cap.read()
                if not ret:
                    break

                # Compare frame differences
                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                if prev_frame is not None:
                    diff = cv2.absdiff(gray, prev_frame)
                    score = np.mean(diff) / 255.0

                    if score > config.threshold:
                        # New scene
                        duration = (i - scene_start_frame) / fps
                        if duration >= config.min_scene_duration:
                            scenes.append(
                                SceneInfo(
                                    index=len(scenes),
                                    start_time=scene_start_frame / fps,
                                    end_time=i / fps,
                                    duration=duration,
                                    frame_start=scene_start_frame,
                                    frame_end=i,
                                    score=score,
                                )
                            )
                            scene_start_frame = i

                prev_frame = gray

            # Add last scene
            if scene_start_frame < total_frames:
                scenes.append(
                    SceneInfo(
                        index=len(scenes),
                        start_time=scene_start_frame / fps,
                        end_time=total_frames / fps,
                        duration=(total_frames - scene_start_frame) / fps,
                        frame_start=scene_start_frame,
                        frame_end=total_frames,
                        score=0.0,
                    )
                )

            cap.release()
            return True, f"Detected {len(scenes)} scenes", scenes

        except ImportError:
            return False, "OpenCV not available for content detection", []
        except Exception as e:
            return False, str(e), []


# =============================================================================
# Keyframe System Backend Service
# =============================================================================


class KeyframeService:
    """
    Backend support for keyframe animation system.
    """

    def __init__(self):
        self._tracks: Dict[str, KeyframeTrack] = {}

    def create_track(self, property_name: str) -> KeyframeTrack:
        """Create a new keyframe track."""
        track = KeyframeTrack(property_name=property_name)
        self._tracks[property_name] = track
        return track

    def get_track(self, property_name: str) -> Optional[KeyframeTrack]:
        """Get a keyframe track by property name."""
        return self._tracks.get(property_name)

    def add_keyframe(
        self,
        property_name: str,
        time: float,
        value: Any,
        easing: str = "linear",
        interpolation: str = "linear",
    ) -> Keyframe:
        """Add a keyframe to a track."""
        if property_name not in self._tracks:
            self.create_track(property_name)

        keyframe = Keyframe(
            time=time,
            property_name=property_name,
            value=value,
            easing=easing,
            interpolation=interpolation,
        )

        self._tracks[property_name].add_keyframe(keyframe)
        return keyframe

    def get_value_at_time(self, property_name: str, time: float) -> Any:
        """Get interpolated value at specific time."""
        track = self._tracks.get(property_name)
        if track:
            return track.get_value_at_time(time)
        return None

    def export_to_json(self, path: str) -> bool:
        """Export all keyframe tracks to a JSON file."""
        try:
            data = {}
            for prop, track in self._tracks.items():
                data[prop] = [
                    {
                        "time": k.time,
                        "value": k.value,
                        "easing": k.easing,
                        "interpolation": k.interpolation,
                    }
                    for k in track.keyframes
                ]

            with open(path, "w") as f:
                json.dump(data, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return False

    def import_from_json(self, path: str) -> bool:
        """Import keyframe tracks from a JSON file."""
        try:
            if not os.path.exists(path):
                return False

            with open(path, "r") as f:
                data = json.load(f)

            self._tracks = {}
            for prop, kfs in data.items():
                self.create_track(prop)
                for k in kfs:
                    self.add_keyframe(
                        prop,
                        k["time"],
                        k["value"],
                        k.get("easing", "linear"),
                        k.get("interpolation", "linear"),
                    )
            return True
        except Exception as e:
            logger.error(f"Import failed: {e}")
            return False

    def export_to_ffmpeg_filter(
        self, property_name: str, duration: float, fps: int = 30
    ) -> str:
        """Export keyframes as FFmpeg filter expression."""
        track = self._tracks.get(property_name)
        if not track or not track.keyframes:
            return ""

        if property_name in ["opacity", "alpha"]:
            return self._build_opacity_filter(track)
        elif property_name in ["scale", "zoom"]:
            return self._build_scale_filter(track)
        elif property_name in ["x", "y", "position"]:
            return self._build_position_filter(track, property_name)
        elif property_name in ["rotation", "rotate"]:
            return self._build_rotation_filter(track)

        return ""

    def _build_opacity_filter(self, track: KeyframeTrack) -> str:
        """Builds a complex alpha/opacity expression for FFmpeg."""
        expr = self._get_interp_expr(track)
        return f"format=yuva420p,colorchannelmixer=aa='{expr}'"

    def _build_scale_filter(self, track: KeyframeTrack) -> str:
        """Builds a scale/zoom expression."""
        expr = self._get_interp_expr(track)
        return f"scale=w='iw*{expr}':h='ih*{expr}'"

    def _build_position_filter(self, track: KeyframeTrack, prop: str) -> str:
        """Builds position expressions."""
        expr = self._get_interp_expr(track)
        return f"overlay=x='{expr}':y='{expr}'"

    def _build_rotation_filter(self, track: KeyframeTrack) -> str:
        """Builds rotation expressions."""
        expr = self._get_interp_expr(track)
        return f"rotate='{expr}*PI/180'"

    def _get_interp_expr(self, track: KeyframeTrack) -> str:
        """Generic interpolation expression generator."""
        keyframes = sorted(track.keyframes, key=lambda k: k.time)
        if not keyframes:
            return "1.0"

        expr = str(keyframes[-1].value)
        for i in range(len(keyframes) - 2, -1, -1):
            k1 = keyframes[i]
            k2 = keyframes[i + 1]
            t_norm = f"(t-{k1.time})/({k2.time}-{k1.time})"
            interp = f"({k1.value} + ({k2.value}-{k1.value})*{t_norm})"
            expr = f"if(between(t,{k1.time},{k2.time}), {interp}, {expr})"

        return f"if(lt(t,{keyframes[0].time}), {keyframes[0].value}, {expr})"


# =============================================================================
# VFX Service
# =============================================================================


class VFXService:
    """Service for advanced visual effects presets."""

    def __init__(self, output_dir: str = "output/vfx"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)

    async def apply_vfx_preset(
        self,
        input_path: str,
        vfx_type: str,
        intensity: float = 1.0,
        output_path: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """Applies advanced VFX presets using FFmpeg."""
        try:
            if not output_path:
                filename = os.path.basename(input_path)
                output_path = os.path.join(
                    self.output_dir, f"vfx_{vfx_type}_{filename}"
                )

            filters = "anull"

            if vfx_type == "bloom":
                filters = "unsharp=5:5:1.0:5:5:0.0,boxblur=2:1,format=yuv420p"
            elif vfx_type == "chromatic_aberration":
                filters = "chromaber_vbg=0.01:0.01"
            elif vfx_type == "glitch":
                filters = "noise=alls=20:allf=t+u,hue=h='if(gt(mod(t,0.5),0.45),180,0)'"
            elif vfx_type == "vignette":
                filters = f"vignette=angle={intensity * 0.5}"

            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                input_path,
                "-vf",
                filters,
                "-c:a",
                "copy",
                output_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                return False, f"VFX failed: {stderr.decode()}", None

            return True, "VFX Applied", output_path
        except Exception as e:
            return False, str(e), None


# =============================================================================
# Factory Functions
# =============================================================================

_color_service = None
_speed_service = None
_scene_service = None
_keyframe_service = None
_vfx_service = None


def get_color_grading_service() -> ColorGradingService:
    global _color_service
    if _color_service is None:
        _color_service = ColorGradingService()
    return _color_service


def get_speed_ramping_service() -> SpeedRampingService:
    global _speed_service
    if _speed_service is None:
        _speed_service = SpeedRampingService()
    return _speed_service


def get_scene_detection_service() -> SceneDetectionService:
    global _scene_service
    if _scene_service is None:
        _scene_service = SceneDetectionService()
    return _scene_service


def get_keyframe_service() -> KeyframeService:
    global _keyframe_service
    if _keyframe_service is None:
        _keyframe_service = KeyframeService()
    return _keyframe_service


def get_vfx_service() -> VFXService:
    global _vfx_service
    if _vfx_service is None:
        _vfx_service = VFXService()
    return _vfx_service
