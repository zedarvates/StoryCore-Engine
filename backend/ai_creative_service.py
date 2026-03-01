"""
AI Creative Service for StoryCore-Engine

Provides AI-powered creative tools:
- Animation presets without keyframes
- AI Start-to-End Frame (pose interpolation)
- AI Music Remix (duration adaptation)
- Thumbnail hook animation

Phase 6: Creative Tools & Workflow Enhancement
"""

import asyncio
import logging
import os
import subprocess
import tempfile
import json
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class AnimationPreset(str, Enum):
    """Available animation presets"""
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


class AnimationCategory(str, Enum):
    """Animation categories"""
    TRANSITION = "transition"
    MOTION = "motion"
    EFFECT = "effect"
    ENTRANCE = "entrance"
    EXIT = "exit"


class MusicRemixMode(str, Enum):
    """Music remix modes"""
    STRETCH = "stretch"  # Time stretch with pitch preservation
    CUT = "cut"  # Intelligent cut/repeat sections
    REMIX = "remix"  # AI-powered remix
    LOOP = "loop"  # Smart loop extension


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


@dataclass
class MusicRemixConfig:
    """Configuration for music remix"""
    input_path: str
    output_path: str
    target_duration: float  # seconds
    mode: MusicRemixMode = MusicRemixMode.REMIX
    preserve_ending: bool = True
    fade_in: float = 0.5
    fade_out: float = 1.0
    bpm: Optional[float] = None  # For beat-synced remix


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


# =============================================================================
# Animation Presets Service
# =============================================================================

class AnimationPresetsService:
    """
    Provides pre-configured animations without manual keyframing.
    Users can simply drag and drop presets onto elements.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
        
        # Animation preset definitions
        self.presets = {
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
        }
        
        # Easing functions
        self.easing_functions = {
            "linear": lambda t: t,
            "ease_in": lambda t: t * t,
            "ease_out": lambda t: t * (2 - t),
            "ease_in_out": lambda t: t * t * (3 - 2 * t),
            "bounce": lambda t: 1 - abs(1 - 4 * t) if t < 0.5 else 1 - abs(1 - 4 * t + 4),
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
    
    def list_presets(self, category: Optional[AnimationCategory] = None) -> List[Dict[str, Any]]:
        """List all available presets, optionally filtered by category."""
        presets = []
        for preset in AnimationPreset:
            info = self.get_preset_info(preset)
            if category is None or info["category"] == category.value:
                presets.append(info)
        return presets
    
    def generate_animation_filter(
        self,
        config: AnimationConfig
    ) -> str:
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
            fps=30  # Default FPS
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
        self,
        image_path: str,
        output_path: str,
        config: AnimationConfig,
        fps: int = 30
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
                self.ffmpeg, "-y",
                "-loop", "1",
                "-i", image_path,
                "-vf", filter_str,
                "-t", str(config.duration),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", str(fps),
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Animation failed: {result.stderr}"
            
            return True, f"Animation created: {output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def apply_animation_to_video(
        self,
        video_path: str,
        output_path: str,
        config: AnimationConfig
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
                self.ffmpeg, "-y",
                "-i", video_path,
                "-vf", filter_str,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, f"Animation failed: {result.stderr}"
            
            return True, f"Animation applied: {output_path}"
            
        except Exception as e:
            return False, str(e)


# =============================================================================
# AI Pose Interpolation Service
# =============================================================================

class AIPoseInterpolationService:
    """
    Generate smooth animation between two pose frames.
    Creates fluid motion from start pose to end pose.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
    
    def detect_pose(self, image_path: str) -> Optional[Dict[str, Any]]:
        """
        Detect pose keypoints in an image.
        
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
                        "nose", "left_eye_inner", "left_eye", "left_eye_outer",
                        "right_eye_inner", "right_eye", "right_eye_outer",
                        "left_ear", "right_ear", "mouth_left", "mouth_right",
                        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
                        "left_wrist", "right_wrist", "left_pinky", "right_pinky",
                        "left_index", "right_index", "left_thumb", "right_thumb",
                        "left_hip", "right_hip", "left_knee", "right_knee",
                        "left_ankle", "right_ankle", "left_heel", "right_heel",
                        "left_foot_index", "right_foot_index"
                    ]
                    
                    for i, landmark in enumerate(results.pose_landmarks.landmark):
                        if i < len(landmark_names):
                            keypoints[landmark_names[i]] = {
                                "x": landmark.x,
                                "y": landmark.y,
                                "z": landmark.z,
                                "visibility": landmark.visibility
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
        mode: str = "ease"
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
                        "x": start_keypoints[key]["x"] + t * (end_keypoints[key]["x"] - start_keypoints[key]["x"]),
                        "y": start_keypoints[key]["y"] + t * (end_keypoints[key]["y"] - start_keypoints[key]["y"]),
                        "z": start_keypoints[key]["z"] + t * (end_keypoints[key]["z"] - start_keypoints[key]["z"]),
                        "visibility": 1.0
                    }
            
            frames.append(frame_keypoints)
        
        return frames
    
    def generate_animation_prompts(
        self,
        start_description: str,
        end_description: str,
        num_frames: int = 30,
        style: str = "realistic"
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
        self,
        config: PoseInterpolationConfig,
        output_dir: str
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
                    start_pose, end_pose,
                    config.num_frames,
                    config.interpolation_mode
                )
                
                # Save keypoint data
                keypoints_path = os.path.join(output_dir, "pose_keypoints.json")
                with open(keypoints_path, 'w') as f:
                    json.dump(frames, f, indent=2)
                generated_files.append(keypoints_path)
            
            # Generate prompts
            prompts = self.generate_animation_prompts(
                config.start_pose.description or "starting pose",
                config.end_pose.description or "ending pose",
                config.num_frames,
                config.style
            )
            
            prompts_path = os.path.join(output_dir, "animation_prompts.json")
            with open(prompts_path, 'w') as f:
                json.dump(prompts, f, indent=2)
            generated_files.append(prompts_path)
            
            return True, f"Pose animation created with {len(prompts)} frames", generated_files
            
        except Exception as e:
            return False, str(e), []


# =============================================================================
# AI Music Remix Service
# =============================================================================

class AIMusicRemixService:
    """
    Remix and adapt music to fit specific durations.
    Intelligently extends or shortens music without abrupt cuts.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
    
    def get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration in seconds."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except:
            return 0.0
    
    def get_audio_bpm(self, audio_path: str) -> float:
        """
        Detect BPM of audio file.
        
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
    
    def detect_music_sections(
        self,
        audio_path: str
    ) -> List[Dict[str, Any]]:
        """
        Detect sections in music (intro, verse, chorus, etc.).
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            List of detected sections
        """
        try:
            import librosa
            
            y, sr = librosa.load(audio_path, sr=None)
            duration = len(y) / sr
            
            # Simple energy-based segmentation
            hop_length = 512
            frame_length = 2048
            
            # Calculate RMS energy
            rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
            
            # Normalize RMS
            rms = (rms - rms.min()) / (rms.max() - rms.min() + 1e-10)
            
            # Find section boundaries based on energy changes
            threshold = np.mean(rms)
            sections = []
            
            in_section = rms[0] > threshold
            section_start = 0.0
            
            for i, energy in enumerate(rms):
                current_time = i * hop_length / sr
                
                if (energy > threshold) != in_section:
                    # Section boundary
                    section_end = current_time
                    sections.append({
                        "start": section_start,
                        "end": section_end,
                        "duration": section_end - section_start,
                        "type": "high_energy" if in_section else "low_energy"
                    })
                    section_start = current_time
                    in_section = not in_section
            
            # Add final section
            sections.append({
                "start": section_start,
                "end": duration,
                "duration": duration - section_start,
                "type": "high_energy" if in_section else "low_energy"
            })
            
            return sections
            
        except ImportError:
            # Fallback: return simple halves
            duration = self.get_audio_duration(audio_path)
            return [
                {"start": 0, "end": duration / 2, "duration": duration / 2, "type": "section_a"},
                {"start": duration / 2, "end": duration, "duration": duration / 2, "type": "section_b"}
            ]
        except Exception as e:
            logger.error(f"Section detection failed: {e}")
            duration = self.get_audio_duration(audio_path)
            return [{"start": 0, "end": duration, "duration": duration, "type": "full"}]
    
    def stretch_audio(
        self,
        input_path: str,
        output_path: str,
        target_duration: float,
        preserve_pitch: bool = True
    ) -> Tuple[bool, str]:
        """
        Time-stretch audio to target duration.
        
        Args:
            input_path: Input audio path
            output_path: Output audio path
            target_duration: Target duration in seconds
            preserve_pitch: Whether to preserve pitch
            
        Returns:
            Tuple of (success, message)
        """
        try:
            current_duration = self.get_audio_duration(input_path)
            
            if current_duration == 0:
                return False, "Could not determine audio duration"
            
            tempo = target_duration / current_duration
            
            if preserve_pitch:
                # Use atempo filter (limited to 0.5-2.0 range)
                # Chain multiple atempo for larger changes
                atempo_filters = []
                remaining_tempo = tempo
                
                while remaining_tempo > 2.0:
                    atempo_filters.append("atempo=2.0")
                    remaining_tempo /= 2.0
                while remaining_tempo < 0.5:
                    atempo_filters.append("atempo=0.5")
                    remaining_tempo /= 0.5
                
                if 0.5 <= remaining_tempo <= 2.0:
                    atempo_filters.append(f"atempo={remaining_tempo:.4f}")
                
                filter_str = ",".join(atempo_filters)
            else:
                # Simple time stretch with pitch shift
                filter_str = f"asetrate=44100*{tempo}"
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Stretch failed: {result.stderr}"
            
            return True, f"Audio stretched to {target_duration}s: {output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def remix_music(
        self,
        config: MusicRemixConfig
    ) -> Tuple[bool, str]:
        """
        Remix music to target duration.
        
        Args:
            config: Music remix configuration
            
        Returns:
            Tuple of (success, message)
        """
        try:
            current_duration = self.get_audio_duration(config.input_path)
            
            if current_duration == 0:
                return False, "Could not determine audio duration"
            
            if abs(current_duration - config.target_duration) < 0.5:
                # Already close to target - just copy
                import shutil
                shutil.copy(config.input_path, config.output_path)
                return True, f"Audio already at target duration: {config.output_path}"
            
            if config.mode == MusicRemixMode.STRETCH:
                return self.stretch_audio(
                    config.input_path,
                    config.output_path,
                    config.target_duration,
                    preserve_pitch=True
                )
            
            elif config.mode == MusicRemixMode.LOOP:
                return self._remix_loop(config, current_duration)
            
            elif config.mode == MusicRemixMode.CUT:
                return self._remix_cut(config, current_duration)
            
            elif config.mode == MusicRemixMode.REMIX:
                return self._remix_intelligent(config, current_duration)
            
            else:
                return self.stretch_audio(
                    config.input_path,
                    config.output_path,
                    config.target_duration,
                    preserve_pitch=True
                )
                
        except Exception as e:
            return False, str(e)
    
    def _remix_loop(
        self,
        config: MusicRemixConfig,
        current_duration: float
    ) -> Tuple[bool, str]:
        """Extend music by looping."""
        try:
            loops_needed = int(config.target_duration / current_duration) + 1
            
            # Create concat list
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                for _ in range(loops_needed):
                    f.write(f"file '{os.path.abspath(config.input_path)}'\n")
                concat_file = f.name
            
            # Concatenate and trim
            cmd = [
                self.ffmpeg, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-t", str(config.target_duration),
                "-c:a", "aac",
                "-b:a", "192k",
                config.output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            os.unlink(concat_file)
            
            if result.returncode != 0:
                return False, f"Loop remix failed: {result.stderr}"
            
            return True, f"Loop remix created: {config.output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def _remix_cut(
        self,
        config: MusicRemixConfig,
        current_duration: float
    ) -> Tuple[bool, str]:
        """Shorten music by cutting sections."""
        try:
            if config.target_duration >= current_duration:
                # Need to extend, not cut
                return self._remix_loop(config, current_duration)
            
            # Cut from middle, preserve intro and outro
            intro_duration = 5.0  # Keep first 5 seconds
            outro_duration = 5.0  # Keep last 5 seconds
            
            if current_duration <= intro_duration + outro_duration:
                # Too short for intelligent cut
                return self.stretch_audio(
                    config.input_path,
                    config.output_path,
                    config.target_duration,
                    preserve_pitch=True
                )
            
            # Calculate cut point
            available_for_cut = current_duration - intro_duration - outro_duration
            needed_from_middle = config.target_duration - intro_duration - outro_duration
            
            if needed_from_middle <= 0:
                # Just use intro + part of outro
                cmd = [
                    self.ffmpeg, "-y",
                    "-i", config.input_path,
                    "-t", str(config.target_duration),
                    "-c:a", "aac",
                    "-b:a", "192k",
                    config.output_path
                ]
            else:
                # Cut from middle using select filter
                # This is a simplified version - real implementation would be more sophisticated
                cmd = [
                    self.ffmpeg, "-y",
                    "-i", config.input_path,
                    "-af", f"atrim=0:{intro_duration},atrim=0:{needed_from_middle},atrim=-{outro_duration}",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    config.output_path
                ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                # Fallback to simple trim
                cmd = [
                    self.ffmpeg, "-y",
                    "-i", config.input_path,
                    "-t", str(config.target_duration),
                    "-c:a", "aac",
                    "-b:a", "192k",
                    config.output_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Cut remix failed: {result.stderr}"
            
            return True, f"Cut remix created: {config.output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def _remix_intelligent(
        self,
        config: MusicRemixConfig,
        current_duration: float
    ) -> Tuple[bool, str]:
        """
        Intelligently remix music using beat detection.
        Extends or shortens by repeating/cutting at beat boundaries.
        """
        try:
            bpm = config.bpm or self.get_audio_bpm(config.input_path)
            beat_duration = 60.0 / bpm
            bar_duration = beat_duration * 4  # Assuming 4/4 time
            
            target = config.target_duration
            
            if target > current_duration:
                # Need to extend - repeat bars
                bars_needed = int((target - current_duration) / bar_duration) + 1
                
                # Find a good loop point (end of a bar)
                loop_start = current_duration - bar_duration
                
                with tempfile.TemporaryDirectory() as tmpdir:
                    # Extract loop section
                    loop_file = os.path.join(tmpdir, "loop.aac")
                    cmd = [
                        self.ffmpeg, "-y",
                        "-i", config.input_path,
                        "-ss", str(loop_start),
                        "-t", str(bar_duration),
                        "-c:a", "aac",
                        loop_file
                    ]
                    subprocess.run(cmd, capture_output=True)
                    
                    # Create concat list
                    concat_file = os.path.join(tmpdir, "concat.txt")
                    with open(concat_file, 'w') as f:
                        f.write(f"file '{os.path.abspath(config.input_path)}'\n")
                        for _ in range(bars_needed):
                            f.write(f"file '{os.path.abspath(loop_file)}'\n")
                    
                    # Concatenate
                    cmd = [
                        self.ffmpeg, "-y",
                        "-f", "concat",
                        "-safe", "0",
                        "-i", concat_file,
                        "-t", str(target),
                        "-c:a", "aac",
                        "-b:a", "192k",
                        config.output_path
                    ]
                    
                    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                    
                    if result.returncode != 0:
                        # Fallback to simple stretch
                        return self.stretch_audio(
                            config.input_path,
                            config.output_path,
                            target,
                            preserve_pitch=True
                        )
                    
                    return True, f"Intelligent remix created: {config.output_path}"
                    
            else:
                # Need to shorten - cut at bar boundary
                bars_to_keep = int(target / bar_duration)
                new_duration = bars_to_keep * bar_duration
                
                cmd = [
                    self.ffmpeg, "-y",
                    "-i", config.input_path,
                    "-t", str(new_duration),
                    "-af", "afade=t=out:st={}:d=2".format(new_duration - 2),
                    "-c:a", "aac",
                    "-b:a", "192k",
                    config.output_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                if result.returncode != 0:
                    return False, f"Intelligent remix failed: {result.stderr}"
                
                return True, f"Intelligent remix created: {config.output_path}"
                
        except Exception as e:
            return False, str(e)


# =============================================================================
# Thumbnail Hook Service
# =============================================================================

class ThumbnailHookService:
    """
    Create animated thumbnails for video hooks.
    Generates attention-grabbing first seconds of video.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
        
        self.animation_types = {
            "zoom_breath": {
                "description": "Subtle zoom in/out breathing effect",
                "filter": "zoompan=z='1+0.02*sin(2*PI*t/3)':d={duration}*30:x='iw/2':y='ih/2'"
            },
            "parallax": {
                "description": "Horizontal parallax shift",
                "filter": "crop='iw*0.9:ih:iw*0.05+on*2:0'"
            },
            "pulse": {
                "description": "Pulsing glow effect",
                "filter": "eq=brightness='0.02*sin(2*PI*t*2)':contrast='1+0.1*sin(2*PI*t*2)'"
            },
            "glitch": {
                "description": "Digital glitch effect",
                "filter": "format=yuv420p,geq=lum='p(X,Y)+random(1)*0.05*{intensity}':cb='p(X,Y)':cr='p(X,Y)'"
            },
            "ken_burns": {
                "description": "Classic Ken Burns slow zoom",
                "filter": "zoompan=z='min(zoom+0.001,1.1)':x='iw/2-(iw/zoom/2)+on':y='ih/2-(ih/zoom/2)':d={duration}*30"
            }
        }
    
    def create_thumbnail_hook(
        self,
        config: ThumbnailHookConfig
    ) -> Tuple[bool, str]:
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
                duration=config.duration,
                intensity=config.intensity
            )
            
            # Add text if specified
            if config.add_text:
                position_map = {
                    "center": "(w-text_w)/2:(h-text_h)/2",
                    "top": "(w-text_w)/2:50",
                    "bottom": "(w-text_w)/2:h-100",
                    "left": "50:(h-text_h)/2",
                    "right": "w-text_w-50:(h-text_h)/2"
                }
                text_pos = position_map.get(config.text_position, position_map["center"])
                
                filter_str += f",drawtext=text='{config.add_text}':fontsize=48:fontcolor=white:{text_pos}:shadowcolor=black:shadowx=2:shadowy=2"
            
            cmd = [
                self.ffmpeg, "-y",
                "-loop", "1",
                "-i", config.image_path,
                "-vf", filter_str,
                "-t", str(config.duration),
                "-c:v", "libx264",
                "-pix_fmt", "yuv420p",
                "-r", "30",
                config.output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Thumbnail hook failed: {result.stderr}"
            
            return True, f"Thumbnail hook created: {config.output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def list_animation_types(self) -> List[Dict[str, str]]:
        """List available animation types for thumbnail hooks."""
        return [
            {
                "id": k,
                "description": v["description"]
            }
            for k, v in self.animation_types.items()
        ]


# =============================================================================
# Factory Functions
# =============================================================================

def create_animation_presets_service(ffmpeg_path: str = "ffmpeg") -> AnimationPresetsService:
    return AnimationPresetsService(ffmpeg_path)

def create_pose_interpolation_service(ffmpeg_path: str = "ffmpeg") -> AIPoseInterpolationService:
    return AIPoseInterpolationService(ffmpeg_path)

def create_music_remix_service(ffmpeg_path: str = "ffmpeg") -> AIMusicRemixService:
    return AIMusicRemixService(ffmpeg_path)

def create_thumbnail_hook_service(ffmpeg_path: str = "ffmpeg") -> ThumbnailHookService:
    return ThumbnailHookService(ffmpeg_path)


# =============================================================================
# Service Instances
# =============================================================================

_animation_service = None
_pose_service = None
_remix_service = None
_thumbnail_service = None

def get_animation_service() -> AnimationPresetsService:
    global _animation_service
    if _animation_service is None:
        _animation_service = create_animation_presets_service()
    return _animation_service

def get_pose_service() -> AIPoseInterpolationService:
    global _pose_service
    if _pose_service is None:
        _pose_service = create_pose_interpolation_service()
    return _pose_service

def get_remix_service() -> AIMusicRemixService:
    global _remix_service
    if _remix_service is None:
        _remix_service = create_music_remix_service()
    return _remix_service

def get_thumbnail_service() -> ThumbnailHookService:
    global _thumbnail_service
    if _thumbnail_service is None:
        _thumbnail_service = create_thumbnail_hook_service()
    return _thumbnail_service