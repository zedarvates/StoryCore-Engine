"""
Animation Enhancement Service for StoryCore-Engine

Enhanced animation presets with AI-powered features:
- 20+ new animation presets
- Pose interpolation with MediaPipe
- BPM detection and synchronization
- Thumbnail hook animation generator
"""

import logging
import os
import subprocess
import json
from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

# =============================================================================
# Enums and Data Classes
# =============================================================================


class AnimationPreset(str, Enum):
    """Available animation presets"""

    # Existing presets
    WHIP_PAN = "whip_pan"
    SPIN = "spin"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    PARALLAX = "parallax"
    KEN_BURNS = "ken_burns"
    SHAKE = "shake"
    GLITCH = "glitch"
    FLASH = "flash"
    PULSE = "pulse"
    BOUNCE = "bounce"
    ELASTIC = "elastic"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    SLIDE_UP = "slide_up"
    SLIDE_DOWN = "slide_down"
    FADE = "fade"
    DISSOLVE = "dissolve"

    # New enhanced presets
    ZOOM_BREATH = "zoom_breath"
    ROTATION_3D = "rotation_3d"
    SCALE_PULSE = "scale_pulse"
    COLOR_SHIFT = "color_shift"
    MOTION_BLUR = "motion_blur"
    PIXELATE = "pixelate"
    VIGNETTE = "vignette"
    CHROMATIC_ABERRATION = "chromatic_aberration"
    BOKEH = "bokeh"
    LIGHT_LEAK = "light_leak"
    FILM_GRAIN = "film_grain"
    VHS_DISTORTION = "vhs_distortion"
    CRT_SCANLINES = "crt_scanlines"
    NEON_GLOW = "neon_glow"
    WATERCOLOR = "watercolor"
    OIL_PAINT = "oil_paint"
    SKETCH = "sketch"
    COMIC_BOOK = "comic_book"
    ANIME = "anime"
    CYBERPUNK = "cyberpunk"


class AnimationCategory(str, Enum):
    """Animation categories"""

    TRANSITION = "transition"
    MOTION = "motion"
    EFFECT = "effect"
    ENTRANCE = "entrance"
    EXIT = "exit"
    ENHANCEMENT = "enhancement"


class BPMMode(str, Enum):
    """Music remix modes"""

    STRETCH = "stretch"  # Time stretch with pitch preservation
    CUT = "cut"  # Intelligent cut/repeat sections
    REMIX = "remix"  # AI-powered remix
    LOOP = "loop"  # Smart loop extension
    SYNC = "sync"  # Beat-synced animation


@dataclass
class AnimationConfig:
    """Configuration for animation preset"""

    preset: AnimationPreset
    duration: float = 1.0  # seconds
    intensity: float = 1.0  # 0-1
    easing: str = "ease_in_out"  # linear, ease_in, ease_out, ease_in_out, bounce
    direction: str = "auto"  # left, right, up, down, auto
    start_time: float = 0.0
    reverse: bool = False
    audio_sync: Optional[str] = None  # Path to audio file for synchronization


@dataclass
class PoseFrame:
    """A pose frame for interpolation"""

    image_path: str
    keypoints: Optional[Dict[str, Any]] = None  # Pose keypoints
    description: Optional[str] = None


@dataclass
class PoseInterpolationConfig:
    """Configuration for pose interpolation"""

    start_pose: PoseFrame
    end_pose: PoseFrame
    num_frames: int = 30
    fps: int = 30
    interpolation_mode: str = "linear"  # linear, ease, smooth
    style: str = "realistic"
    audio_sync: Optional[str] = None  # Path to audio file


@dataclass
class MusicSyncConfig:
    """Configuration for music synchronization"""

    audio_path: str
    animation_path: str
    output_path: str
    mode: BPMMode = BPMMode.SYNC
    bpm: Optional[float] = None  # Detected BPM
    intensity: float = 1.0  # Synchronization intensity


@dataclass
class ThumbnailHookConfig:
    """Configuration for thumbnail hook animation"""

    image_path: str
    output_path: str
    duration: float = 3.0  # seconds
    animation_type: str = "zoom_breath"  # zoom_breath, parallax, pulse, glitch
    intensity: float = 0.5
    add_text: Optional[str] = None
    text_position: str = "center"
    audio_sync: Optional[str] = None  # Path to audio file


# =============================================================================
# Enhanced Animation Presets Service
# =============================================================================


class EnhancedAnimationPresetsService:
    """
    Enhanced animation presets service with 20+ new presets and AI-powered features.
    Provides pre-configured animations without manual keyframing.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

        # Enhanced animation preset definitions
        self.presets = {
            # Existing presets
            AnimationPreset.WHIP_PAN: {
                "category": AnimationCategory.TRANSITION,
                "description": "Fast horizontal pan transition",
                "default_duration": 0.3,
                "ffmpeg_filter": "zoompan=z='if(eq(on,1),1.2,1)':x='if(eq(on,1),iw/2,if(lt(on,5),iw/2-on*20,iw/2+on*20))':d=5:s=1920x1080",
            },
            AnimationPreset.SPIN: {
                "category": AnimationCategory.MOTION,
                "description": "360 degree rotation",
                "default_duration": 1.0,
                "ffmpeg_filter": "rotate=angle='2*PI*t/T':fillcolor=black",
            },
            AnimationPreset.ZOOM_IN: {
                "category": AnimationCategory.MOTION,
                "description": "Gradual zoom in",
                "default_duration": 2.0,
                "ffmpeg_filter": "zoompan=z='min(zoom+0.0015,1.5)':d={duration}*fps:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            },
            AnimationPreset.ZOOM_OUT: {
                "category": AnimationCategory.MOTION,
                "description": "Gradual zoom out",
                "default_duration": 2.0,
                "ffmpeg_filter": "zoompan=z='max(zoom-0.0015,1)':d={duration}*fps:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'",
            },
            AnimationPreset.KEN_BURNS: {
                "category": AnimationCategory.MOTION,
                "description": "Classic Ken Burns effect (slow zoom + pan)",
                "default_duration": 5.0,
                "ffmpeg_filter": "zoompan=z='min(zoom+0.0005,1.2)':x='iw/2-(iw/zoom/2)+on*2':y='ih/2-(ih/zoom/2)':d={duration}*fps",
            },
            AnimationPreset.PARALLAX: {
                "category": AnimationCategory.EFFECT,
                "description": "Parallax depth effect",
                "default_duration": 3.0,
                "ffmpeg_filter": None,  # Requires multiple layers
            },
            AnimationPreset.SHAKE: {
                "category": AnimationCategory.EFFECT,
                "description": "Camera shake effect",
                "default_duration": 0.5,
                "ffmpeg_filter": "transpose=1,transpose=2,shake=intensity={intensity}",
            },
            AnimationPreset.GLITCH: {
                "category": AnimationCategory.EFFECT,
                "description": "Digital glitch effect",
                "default_duration": 0.3,
                "ffmpeg_filter": "format=yuv420p,geq=lum='p(X,Y)+random(1)*{intensity}*10':cb='p(X,Y)':cr='p(X,Y)'",
            },
            AnimationPreset.FLASH: {
                "category": AnimationCategory.EFFECT,
                "description": "Flash/strobe effect",
                "default_duration": 0.2,
                "ffmpeg_filter": "fade=t=in:st=0:d=0.1,fade=t=out:st=0.1:d=0.1,colorlevels=rimax=1.5:gimax=1.5:bimax=1.5",
            },
            AnimationPreset.PULSE: {
                "category": AnimationCategory.EFFECT,
                "description": "Pulsing scale effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "zoompan=z='1+0.1*sin(2*PI*t*2/T)':d={duration}*fps",
            },
            AnimationPreset.BOUNCE: {
                "category": AnimationCategory.ENTRANCE,
                "description": "Bouncy entrance",
                "default_duration": 0.8,
                "ffmpeg_filter": "scale='iw*min(1,1.2-0.2*abs(sin(PI*t*3/T)))':'ih*min(1,1.2-0.2*abs(sin(PI*t*3/T)))'",
            },
            AnimationPreset.ELASTIC: {
                "category": AnimationCategory.ENTRANCE,
                "description": "Elastic stretch effect",
                "default_duration": 1.0,
                "ffmpeg_filter": None,  # Complex elastic animation
            },
            AnimationPreset.SLIDE_LEFT: {
                "category": AnimationCategory.TRANSITION,
                "description": "Slide from right to left",
                "default_duration": 0.5,
                "ffmpeg_filter": "crop='iw*t/T:ih:0:0'",
            },
            AnimationPreset.SLIDE_RIGHT: {
                "category": AnimationCategory.TRANSITION,
                "description": "Slide from left to right",
                "default_duration": 0.5,
                "ffmpeg_filter": "crop='iw*t/T:ih:iw-iw*t/T:0'",
            },
            AnimationPreset.FADE: {
                "category": AnimationCategory.TRANSITION,
                "description": "Simple fade",
                "default_duration": 1.0,
                "ffmpeg_filter": "fade=t=in:st=0:d={duration}",
            },
            AnimationPreset.DISSOLVE: {
                "category": AnimationCategory.TRANSITION,
                "description": "Dissolve transition",
                "default_duration": 1.0,
                "ffmpeg_filter": "fade=t=in:st=0:d={duration}:c=white",
            },
            # New enhanced presets
            AnimationPreset.ZOOM_BREATH: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Subtle zoom in/out breathing effect",
                "default_duration": 3.0,
                "ffmpeg_filter": "zoompan=z='1+0.02*sin(2*PI*t/3)':d={duration}*fps:x='iw/2':y='ih/2'",
            },
            AnimationPreset.ROTATION_3D: {
                "category": AnimationCategory.MOTION,
                "description": "3D rotation effect",
                "default_duration": 2.0,
                "ffmpeg_filter": "rotate=angle='2*PI*t/T':zoom='1+0.1*sin(2*PI*t/T)':fillcolor=black",
            },
            AnimationPreset.SCALE_PULSE: {
                "category": AnimationCategory.EFFECT,
                "description": "Pulsing scale effect with color shift",
                "default_duration": 1.5,
                "ffmpeg_filter": "zoompan=z='1+0.05*sin(2*PI*t*2/T)':eq=brightness='1+0.1*sin(2*PI*t*2/T)':d={duration}*fps",
            },
            AnimationPreset.COLOR_SHIFT: {
                "category": AnimationCategory.EFFECT,
                "description": "Color hue shifting effect",
                "default_duration": 2.0,
                "ffmpeg_filter": "hue=h='2*PI*t/T':saturation=1.2:brightness=1.1",
            },
            AnimationPreset.MOTION_BLUR: {
                "category": AnimationCategory.EFFECT,
                "description": "Motion blur effect",
                "default_duration": 0.5,
                "ffmpeg_filter": "tblend=all_mode='average'",
            },
            AnimationPreset.PIXELATE: {
                "category": AnimationCategory.EFFECT,
                "description": "Pixelation effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "format=rgb24,scale=iw/10:ih/10,scale=iw*10:ih*10:flags=neighbor",
            },
            AnimationPreset.VIGNETTE: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Vignette effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "crop=iw-20:ih-20:10:10,vignette=PI/4:1:0,format=yuv420p",
            },
            AnimationPreset.CHROMATIC_ABERRATION: {
                "category": AnimationCategory.EFFECT,
                "description": "Chromatic aberration effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "split=2[v1][v2];[v1]geq=r='p(X,Y)':g='p(X,Y)':b='p(X,Y)';[v2]geq=r='p(X+2,Y)':g='p(X,Y)':b='p(X-2,Y)';[v1][v2]blend=all_mode='add'",
            },
            AnimationPreset.BOKEH: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Bokeh background blur",
                "default_duration": 1.0,
                "ffmpeg_filter": "boxblur=lr=5:cr=5",
            },
            AnimationPreset.LIGHT_LEAK: {
                "category": AnimationCategory.EFFECT,
                "description": "Light leak effect",
                "default_duration": 2.0,
                "ffmpeg_filter": "colorchannelmixer=rr=0.5:gg=0.5:bb=0.5,lumakey=threshold=0.1",
            },
            AnimationPreset.FILM_GRAIN: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Film grain effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "noise=alls=20:allf=t+u",
            },
            AnimationPreset.VHS_DISTORTION: {
                "category": AnimationCategory.EFFECT,
                "description": "VHS tape distortion",
                "default_duration": 1.0,
                "ffmpeg_filter": "curves=vintage,noise=alls=10:allf=t+u",
            },
            AnimationPreset.CRT_SCANLINES: {
                "category": AnimationCategory.EFFECT,
                "description": "CRT monitor scanlines",
                "default_duration": 1.0,
                "ffmpeg_filter": "geq=lum='p(X,Y)*(1+0.1*sin(2*PI*Y/10))'",
            },
            AnimationPreset.NEON_GLOW: {
                "category": AnimationCategory.EFFECT,
                "description": "Neon glow effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "convolution=0 0 0 0 2 0 0 0 0",
            },
            AnimationPreset.WATERCOLOR: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Watercolor painting effect",
                "default_duration": 2.0,
                "ffmpeg_filter": "convolution=0 -1 0 -1 5 -1 0 -1 0,curves=vintage",
            },
            AnimationPreset.OIL_PAINT: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Oil painting effect",
                "default_duration": 2.0,
                "ffmpeg_filter": "convolution=0 0 0 0 1 0 0 0 0,curves=vintage",
            },
            AnimationPreset.SKETCH: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Pencil sketch effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "geq=lum='p(X,Y)':cb='p(X,Y)':cr='p(X,Y)',curves=vintage",
            },
            AnimationPreset.COMIC_BOOK: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Comic book effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "curves=comic,format=rgb24",
            },
            AnimationPreset.ANIME: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Anime-style effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "curves=anime,format=rgb24",
            },
            AnimationPreset.CYBERPUNK: {
                "category": AnimationCategory.ENHANCEMENT,
                "description": "Cyberpunk neon effect",
                "default_duration": 1.0,
                "ffmpeg_filter": "curves=cyberpunk,convolution=0 0 0 0 2 0 0 0 0",
            },
        }

        # Easing functions
        self.easing_functions = {
            "linear": lambda t: t,
            "ease_in": lambda t: t * t,
            "ease_out": lambda t: t * (2 - t),
            "ease_in_out": lambda t: t * t * (3 - 2 * t),
            "bounce": lambda t: (
                1 - abs(1 - 4 * t) if t < 0.5 else 1 - abs(1 - 4 * t + 4)
            ),
        }

    def get_preset_info(self, preset: AnimationPreset) -> Dict[str, Any]:
        """Get information about a preset."""
        info = self.presets.get(preset, {})
        return {
            "id": preset.value,
            "name": preset.value.replace("_", " ").title(),
            "category": info.get("category", AnimationCategory.EFFECT).value,
            "description": info.get("description", ""),
            "default_duration": info.get("default_duration", 1.0),
        }

    def list_presets(
        self, category: Optional[AnimationCategory] = None
    ) -> List[Dict[str, Any]]:
        """List all available presets, optionally filtered by category."""
        presets = []
        for preset in AnimationPreset:
            info = self.get_preset_info(preset)
            if category is None or info["category"] == category.value:
                presets.append(info)
        return presets

    def generate_animation_filter(self, config: AnimationConfig) -> str:
        """
        Generate FFmpeg filter for an animation preset.

        Args:
            config: Animation configuration

        Returns:
            FFmpeg filter string
        """
        preset_info = self.presets.get(config.preset, {})
        filter_template = preset_info.get("ffmpeg_filter")

        if not filter_template:
            # Generate basic filter
            return self._generate_basic_filter(config)

        # Apply parameters
        filter_str = filter_template.format(
            duration=config.duration,
            intensity=config.intensity,
            fps=30,  # Default FPS
        )

        return filter_str

    def _generate_basic_filter(self, config: AnimationConfig) -> str:
        """Generate a basic animation filter based on preset type."""
        preset = config.preset
        duration = config.duration
        intensity = config.intensity

        if preset == AnimationPreset.ZOOM_IN:
            return f"zoompan=z='min(zoom+0.002*{intensity},2)':d={duration}*30"
        elif preset == AnimationPreset.ZOOM_OUT:
            return f"zoompan=z='max(zoom-0.002*{intensity},1)':d={duration}*30"
        elif preset == AnimationPreset.PULSE:
            return f"zoompan=z='1+0.1*{intensity}*sin(2*PI*t*2/{duration})':d={duration}*30"
        elif preset == AnimationPreset.FADE:
            return f"fade=t=in:st=0:d={duration}*{intensity}"
        else:
            return "null"  # No effect

    def apply_animation_to_image(
        self, image_path: str, output_path: str, config: AnimationConfig, fps: int = 30
    ) -> Tuple[bool, str]:
        """
        Apply animation preset to a static image.

        Creates a video from the image with the animation applied.

        Args:
            image_path: Path to input image
            output_path: Path for output video
            config: Animation configuration
            fps: Output frame rate

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(image_path):
                return False, f"Image not found: {image_path}"

            filter_str = self.generate_animation_filter(config)

            cmd = [
                self.ffmpeg,
                "-y",
                "-loop",
                "1",
                "-i",
                image_path,
                "-vf",
                filter_str,
                "-t",
                str(config.duration),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-r",
                str(fps),
                output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                return False, f"Animation failed: {result.stderr}"

            return True, f"Animation created: {output_path}"

        except Exception as e:
            return False, str(e)

    def apply_animation_to_video(
        self, video_path: str, output_path: str, config: AnimationConfig
    ) -> Tuple[bool, str]:
        """
        Apply animation preset to an existing video.

        Args:
            video_path: Path to input video
            output_path: Path for output video
            config: Animation configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(video_path):
                return False, f"Video not found: {video_path}"

            filter_str = self.generate_animation_filter(config)

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                video_path,
                "-vf",
                filter_str,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "copy",
                output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

            if result.returncode != 0:
                return False, f"Animation failed: {result.stderr}"

            return True, f"Animation applied: {output_path}"

        except Exception as e:
            return False, str(e)


# =============================================================================
# Enhanced Pose Interpolation Service
# =============================================================================


class EnhancedPoseInterpolationService:
    """
    Enhanced pose interpolation service with MediaPipe integration.
    Creates smooth animations between two pose frames.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

    def detect_pose(self, image_path: str) -> Optional[Dict[str, Any]]:
        """
        Detect pose keypoints in an image using MediaPipe.

        Args:
            image_path: Path to image

        Returns:
            Dictionary of keypoints or None
        """
        try:
            import mediapipe as mp

            mp_pose = mp.solutions.pose

            with mp_pose.Pose(static_image_mode=True) as pose:
                import cv2

                image = cv2.imread(image_path)
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

                results = pose.process(rgb_image)

                if results.pose_landmarks:
                    keypoints = {}
                    landmark_names = [
                        "nose",
                        "left_eye_inner",
                        "left_eye",
                        "left_eye_outer",
                        "right_eye_inner",
                        "right_eye",
                        "right_eye_outer",
                        "left_ear",
                        "right_ear",
                        "mouth_left",
                        "mouth_right",
                        "left_shoulder",
                        "right_shoulder",
                        "left_elbow",
                        "right_elbow",
                        "left_wrist",
                        "right_wrist",
                        "left_pinky",
                        "right_pinky",
                        "left_index",
                        "right_index",
                        "left_thumb",
                        "right_thumb",
                        "left_hip",
                        "right_hip",
                        "left_knee",
                        "right_knee",
                        "left_ankle",
                        "right_ankle",
                        "left_heel",
                        "right_heel",
                        "left_foot_index",
                        "right_foot_index",
                    ]

                    for i, landmark in enumerate(results.pose_landmarks.landmark):
                        if i < len(landmark_names):
                            keypoints[landmark_names[i]] = {
                                "x": landmark.x,
                                "y": landmark.y,
                                "z": landmark.z,
                                "visibility": landmark.visibility,
                            }

                    return keypoints

            return None

        except ImportError:
            logger.warning("MediaPipe not available for pose detection")
            return None
        except Exception as e:
            logger.error(f"Pose detection failed: {e}")
            return None

    def interpolate_poses(
        self,
        start_keypoints: Dict[str, Any],
        end_keypoints: Dict[str, Any],
        num_frames: int,
        mode: str = "ease",
    ) -> List[Dict[str, Any]]:
        """
        Interpolate between two sets of keypoints.

        Args:
            start_keypoints: Starting pose keypoints
            end_keypoints: Ending pose keypoints
            num_frames: Number of frames to generate
            mode: Interpolation mode (linear, ease, smooth)

        Returns:
            List of interpolated keypoints for each frame
        """
        frames = []

        for i in range(num_frames):
            t = i / (num_frames - 1) if num_frames > 1 else 0

            # Apply easing
            if mode == "ease":
                t = t * (2 - t)  # Ease out
            elif mode == "smooth":
                t = t * t * (3 - 2 * t)  # Smoothstep

            frame_keypoints = {}
            for key in start_keypoints:
                if key in end_keypoints:
                    frame_keypoints[key] = {
                        "x": start_keypoints[key]["x"]
                        + t * (end_keypoints[key]["x"] - start_keypoints[key]["x"]),
                        "y": start_keypoints[key]["y"]
                        + t * (end_keypoints[key]["y"] - start_keypoints[key]["y"]),
                        "z": start_keypoints[key]["z"]
                        + t * (end_keypoints[key]["z"] - start_keypoints[key]["z"]),
                        "visibility": 1.0,
                    }

            frames.append(frame_keypoints)

        return frames

    def generate_animation_prompts(
        self,
        start_description: str,
        end_description: str,
        num_frames: int = 30,
        style: str = "realistic",
    ) -> List[str]:
        """
        Generate prompts for frame-by-frame pose animation.

        For use with image generation AI.

        Args:
            start_description: Description of start pose
            end_description: Description of end pose
            num_frames: Number of frames
            style: Visual style

        Returns:
            List of prompts for each frame
        """
        prompts = []

        # Generate morphing prompts
        for i in range(num_frames):
            t = i / (num_frames - 1) if num_frames > 1 else 0

            # Blend descriptions
            if t < 0.3:
                # Early frames - mostly start pose
                blend = int(t / 0.3 * 30)
                prompt = f"{start_description}, transitioning to {end_description}, {blend}% transition, {style} style"
            elif t > 0.7:
                # Late frames - mostly end pose
                blend = int((t - 0.7) / 0.3 * 70 + 70)
                prompt = f"{end_description}, transitioning from {start_description}, {blend}% complete, {style} style"
            else:
                # Middle frames - blend
                prompt = f"pose between {start_description} and {end_description}, action in progress, {style} style"

            prompts.append(prompt)

        return prompts

    def create_pose_animation(
        self, config: PoseInterpolationConfig, output_dir: str
    ) -> Tuple[bool, str, List[str]]:
        """
        Create pose animation between two frames.

        Generates prompts and/or creates video using AI.

        Args:
            config: Pose interpolation configuration
            output_dir: Directory for output files

        Returns:
            Tuple of (success, message, list of generated files)
        """
        try:
            os.makedirs(output_dir, exist_ok=True)

            # Detect poses
            start_pose = self.detect_pose(config.start_pose.image_path)
            end_pose = self.detect_pose(config.end_pose.image_path)

            generated_files = []

            if start_pose and end_pose:
                # Interpolate keypoints
                frames = self.interpolate_poses(
                    start_pose, end_pose, config.num_frames, config.interpolation_mode
                )

                # Save keypoint data
                keypoints_path = os.path.join(output_dir, "pose_keypoints.json")
                with open(keypoints_path, "w") as f:
                    json.dump(frames, f, indent=2)
                generated_files.append(keypoints_path)

            # Generate prompts
            prompts = self.generate_animation_prompts(
                config.start_pose.description or "starting pose",
                config.end_pose.description or "ending pose",
                config.num_frames,
                config.style,
            )

            prompts_path = os.path.join(output_dir, "animation_prompts.json")
            with open(prompts_path, "w") as f:
                json.dump(prompts, f, indent=2)
            generated_files.append(prompts_path)

            return (
                True,
                f"Pose animation created with {len(prompts)} frames",
                generated_files,
            )

        except Exception as e:
            return False, str(e), []


# =============================================================================
# Enhanced Music Synchronization Service
# =============================================================================


class EnhancedMusicSyncService:
    """
    Enhanced music synchronization service with BPM detection.
    Synchronizes animations with music beats.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

    def get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds."""
        try:
            cmd = [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                audio_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except Exception:
            return 0.0

    def get_audio_bpm(self, audio_path: str) -> float:
        """
        Detect BPM of audio file using librosa.

        Args:
            audio_path: Path to audio file

        Returns:
            Detected BPM or 120.0 as default
        """
        try:
            import librosa

            y, sr = librosa.load(audio_path, sr=None)
            tempo, _ = librosa.beat.beat_track(y=y, sr=sr)

            if isinstance(tempo, np.ndarray):
                tempo = float(tempo[0]) if len(tempo) > 0 else 120.0

            return tempo

        except ImportError:
            logger.warning("librosa not available for BPM detection")
            return 120.0
        except Exception as e:
            logger.error(f"BPM detection failed: {e}")
            return 120.0

    def sync_animation_with_music(self, config: MusicSyncConfig) -> Tuple[bool, str]:
        """
        Synchronize animation with music beats.

        Args:
            config: Music synchronization configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            # Get BPM if not provided
            if config.bpm is None:
                config.bpm = self.get_audio_bpm(config.audio_path)

            # Get audio duration
            audio_duration = self.get_audio_duration(config.audio_path)

            if audio_duration == 0:
                return False, "Could not determine audio duration"

            # Calculate beat duration
            beat_duration = 60.0 / config.bpm

            # Create beat-synced animation
            success, message = self._create_beat_synced_animation(
                config.animation_path,
                config.audio_path,
                config.output_path,
                beat_duration,
                audio_duration,
                config.intensity,
            )

            return success, message

        except Exception as e:
            return False, str(e)

    def _create_beat_synced_animation(
        self,
        animation_path: str,
        audio_path: str,
        output_path: str,
        beat_duration: float,
        audio_duration: float,
        intensity: float,
    ) -> Tuple[bool, str]:
        """Create beat-synced animation."""
        try:
            # Create beat-synced filter
            beat_filters = []

            # Add zoom pulse on beats
            beat_filters.append(
                f"zoompan=z='1+0.1*{intensity}*sin(2*PI*t/{beat_duration})'"
            )

            # Add color shift on beats
            beat_filters.append(f"hue=h='2*PI*t/{beat_duration * 4}'")

            # Combine filters
            filter_str = ",".join(beat_filters)

            cmd = [
                self.ffmpeg,
                "-y",
                "-i",
                animation_path,
                "-i",
                audio_path,
                "-filter_complex",
                f"[0:v] {filter_str} [v];[1:a] [v]",
                "-map",
                "[v]",
                "-map",
                "1:a",
                "-c:v",
                "libx264",
                "-c:a",
                "aac",
                "-t",
                str(audio_duration),
                output_path,
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

            if result.returncode != 0:
                return False, f"Beat sync failed: {result.stderr}"

            return True, f"Beat-synced animation created: {output_path}"

        except Exception as e:
            return False, str(e)


# =============================================================================
# Enhanced Thumbnail Hook Service
# =============================================================================


class EnhancedThumbnailHookService:
    """
    Enhanced thumbnail hook service with audio synchronization.
    Creates animated thumbnails for video hooks.
    """

    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path

        self.animation_types = {
            "zoom_breath": {
                "description": "Subtle zoom in/out breathing effect",
                "filter": "zoompan=z='1+0.02*sin(2*PI*t/3)':d={duration}*30:x='iw/2':y='ih/2'",
            },
            "parallax": {
                "description": "Horizontal parallax shift",
                "filter": "crop='iw*0.9:ih:iw*0.05+on*2:0'",
            },
            "pulse": {
                "description": "Pulsing glow effect",
                "filter": "eq=brightness='0.02*sin(2*PI*t*2)':contrast='1+0.1*sin(2*PI*t*2)'",
            },
            "glitch": {
                "description": "Digital glitch effect",
                "filter": "format=yuv420p,geq=lum='p(X,Y)+random(1)*0.05*{intensity}':cb='p(X,Y)':cr='p(X,Y)'",
            },
            "ken_burns": {
                "description": "Classic Ken Burns slow zoom",
                "filter": "zoompan=z='min(zoom+0.001,1.1)':x='iw/2-(iw/zoom/2)+on':y='ih/2-(ih/zoom/2)':d={duration}*30",
            },
            "neon_glow": {
                "description": "Neon glow effect",
                "filter": "convolution=0 0 0 0 2 0 0 0 0,curves=neon",
            },
            "vignette": {
                "description": "Vignette effect",
                "filter": "crop=iw-20:ih-20:10:10,vignette=PI/4:1:0,format=yuv420p",
            },
            "color_shift": {
                "description": "Color hue shifting",
                "filter": "hue=h='2*PI*t/5':saturation=1.2",
            },
        }

    def create_thumbnail_hook(self, config: ThumbnailHookConfig) -> Tuple[bool, str]:
        """
        Create animated thumbnail hook.

        Args:
            config: Thumbnail hook configuration

        Returns:
            Tuple of (success, message)
        """
        try:
            if not os.path.exists(config.image_path):
                return False, f"Image not found: {config.image_path}"

            animation_info = self.animation_types.get(config.animation_type, {})
            filter_template = animation_info.get("filter", "")

            if not filter_template:
                filter_template = "zoompan=z='1+0.02*sin(2*PI*t/3)':d={duration}*30"

            filter_str = filter_template.format(
                duration=config.duration, intensity=config.intensity
            )

            # Add text if specified
            if config.add_text:
                position_map = {
                    "center": "(w-text_w)/2:(h-text_h)/2",
                    "top": "(w-text_w)/2:50",
                    "bottom": "(w-text_w)/2:h-100",
                    "left": "50:(h-text_h)/2",
                    "right": "w-text_w-50:(h-text_h)/2",
                }
                text_pos = position_map.get(
                    config.text_position, position_map["center"]
                )

                filter_str += f",drawtext=text='{config.add_text}':fontsize=48:fontcolor=white:{text_pos}:shadowcolor=black:shadowx=2:shadowy=2"

            # Add audio sync if specified
            if config.audio_sync and os.path.exists(config.audio_sync):
                filter_str += ",afade=t=in:st=0:d=1,afade=t=out:st={}:d=1".format(
                    config.duration - 1
                )

            cmd = [
                self.ffmpeg,
                "-y",
                "-loop",
                "1",
                "-i",
                config.image_path,
                "-i",
                config.audio_sync if config.audio_sync else None,
                "-filter_complex",
                filter_str,
                "-t",
                str(config.duration),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-r",
                "30",
                "-c:a",
                "aac" if config.audio_sync else "copy",
                config.output_path,
            ]

            # Remove None values from command
            cmd = [arg for arg in cmd if arg is not None]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)

            if result.returncode != 0:
                return False, f"Thumbnail hook failed: {result.stderr}"

            return True, f"Thumbnail hook created: {config.output_path}"

        except Exception as e:
            return False, str(e)

    def list_animation_types(self) -> List[Dict[str, str]]:
        """List available animation types for thumbnail hooks."""
        return [
            {"id": k, "description": v["description"]}
            for k, v in self.animation_types.items()
        ]


# =============================================================================
# Service Factory Functions
# =============================================================================


def create_enhanced_animation_service(
    ffmpeg_path: str = "ffmpeg",
) -> EnhancedAnimationPresetsService:
    return EnhancedAnimationPresetsService(ffmpeg_path)


def create_enhanced_pose_service(
    ffmpeg_path: str = "ffmpeg",
) -> EnhancedPoseInterpolationService:
    return EnhancedPoseInterpolationService(ffmpeg_path)


def create_enhanced_music_sync_service(
    ffmpeg_path: str = "ffmpeg",
) -> EnhancedMusicSyncService:
    return EnhancedMusicSyncService(ffmpeg_path)


def create_enhanced_thumbnail_service(
    ffmpeg_path: str = "ffmpeg",
) -> EnhancedThumbnailHookService:
    return EnhancedThumbnailHookService(ffmpeg_path)


# =============================================================================
# Service Instances
# =============================================================================

_enhanced_animation_service = None
_enhanced_pose_service = None
_enhanced_music_sync_service = None
_enhanced_thumbnail_service = None


def get_enhanced_animation_service() -> EnhancedAnimationPresetsService:
    global _enhanced_animation_service
    if _enhanced_animation_service is None:
        _enhanced_animation_service = create_enhanced_animation_service()
    return _enhanced_animation_service


def get_enhanced_pose_service() -> EnhancedPoseInterpolationService:
    global _enhanced_pose_service
    if _enhanced_pose_service is None:
        _enhanced_pose_service = create_enhanced_pose_service()
    return _enhanced_pose_service


def get_enhanced_music_sync_service() -> EnhancedMusicSyncService:
    global _enhanced_music_sync_service
    if _enhanced_music_sync_service is None:
        _enhanced_music_sync_service = create_enhanced_music_sync_service()
    return _enhanced_music_sync_service


def get_enhanced_thumbnail_service() -> EnhancedThumbnailHookService:
    global _enhanced_thumbnail_service
    if _enhanced_thumbnail_service is None:
        _enhanced_thumbnail_service = create_enhanced_thumbnail_service()
    return _enhanced_thumbnail_service
