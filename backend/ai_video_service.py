"""
AI Video Service for StoryCore-Engine

Provides AI-powered video processing:
- Smart Pan & Scan with face tracking
- Multi-angle camera AI
- Character consistency sheets
- Smooth cut transitions (frame interpolation)

Phase 4 & 5: Audio Mastering + Multi-Angle & Character Consistency
"""

import asyncio
import logging
import os
import subprocess
import tempfile
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class CameraAngle(str, Enum):
    """Camera angle types for multi-angle generation"""
    EYE_LEVEL = "eye_level"
    LOW_ANGLE = "low_angle"  # Heroic, powerful
    HIGH_ANGLE = "high_angle"  # Vulnerable, weak
    DUTCH_ANGLE = "dutch_angle"  # Tension, unease
    OVER_SHOULDER = "over_shoulder"
    POV = "pov"
    BIRD_EYE = "bird_eye"  # Aerial, god's eye
    WORM_EYE = "worm_eye"  # Extreme low
    DRONE = "drone"
    CLOSE_UP = "close_up"
    MEDIUM_SHOT = "medium_shot"
    WIDE_SHOT = "wide_shot"


class CharacterView(str, Enum):
    """Character view angles for consistency sheets"""
    FRONT = "front"
    THREE_QUARTER_LEFT = "three_quarter_left"
    THREE_QUARTER_RIGHT = "three_quarter_right"
    PROFILE_LEFT = "profile_left"
    PROFILE_RIGHT = "profile_right"
    BACK = "back"
    BACK_THREE_QUARTER = "back_three_quarter"


class TrackingMode(str, Enum):
    """Face tracking modes"""
    SINGLE_FACE = "single_face"
    MULTIPLE_FACES = "multiple_faces"
    MAIN_SUBJECT = "main_subject"


@dataclass
class FaceTrackingResult:
    """Result of face detection/tracking"""
    frame_number: int
    faces: List[Dict[str, Any]]  # List of face bounding boxes
    main_face_index: int = 0
    confidence: float = 0.0


@dataclass
class SmartCropConfig:
    """Configuration for smart pan & scan"""
    target_aspect: Tuple[int, int] = (9, 16)  # 9:16 for vertical
    tracking_mode: TrackingMode = TrackingMode.MAIN_SUBJECT
    smoothing: float = 0.3  # 0-1, higher = smoother
    padding: float = 0.1  # Padding around face as percentage
    min_face_size: int = 50  # Minimum face size in pixels


@dataclass
class CameraAnglePrompt:
    """Generated prompt for a specific camera angle"""
    angle: CameraAngle
    prompt: str
    negative_prompt: str
    description: str
    composition_notes: List[str]


@dataclass
class CharacterSheetConfig:
    """Configuration for character consistency sheet"""
    character_id: str
    character_name: str
    views: List[CharacterView] = field(default_factory=lambda: [
        CharacterView.FRONT,
        CharacterView.THREE_QUARTER_LEFT,
        CharacterView.PROFILE_LEFT,
        CharacterView.BACK,
        CharacterView.THREE_QUARTER_RIGHT,
        CharacterView.PROFILE_RIGHT
    ])
    expressions: List[str] = field(default_factory=lambda: ["neutral", "happy", "angry", "surprised"])
    outfit: str = "default"
    style: str = "realistic"
    resolution: int = 1024


@dataclass
class CharacterSheetResult:
    """Result of character sheet generation"""
    character_id: str
    sheet_path: str
    view_images: Dict[str, str]
    metadata: Dict[str, Any]


# =============================================================================
# Smart Crop Service (Face Tracking for Pan & Scan)
# =============================================================================

class SmartCropService:
    """
    Smart Pan & Scan service with face tracking.
    Automatically recrops video to follow faces for different aspect ratios.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
    
    def detect_faces(
        self,
        frame: np.ndarray,
        min_face_size: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Detect faces in a frame using OpenCV or MediaPipe.
        
        Args:
            frame: Input frame (numpy array)
            min_face_size: Minimum face size in pixels
            
        Returns:
            List of face dictionaries with bbox and confidence
        """
        faces = []
        
        # Try MediaPipe first (more accurate)
        try:
            import mediapipe as mp
            
            mp_face = mp.solutions.face_detection
            with mp_face.FaceDetection(min_detection_confidence=0.5) as detector:
                rgb_frame = frame[:, :, ::-1]  # BGR to RGB
                results = detector.process(rgb_frame)
                
                if results.detections:
                    for detection in results.detections:
                        bboxC = detection.location_data.relative_bounding_box
                        h, w = frame.shape[:2]
                        
                        x = int(bboxC.xmin * w)
                        y = int(bboxC.ymin * h)
                        width = int(bboxC.width * w)
                        height = int(bboxC.height * h)
                        
                        faces.append({
                            "bbox": [x, y, width, height],
                            "confidence": detection.score[0] if detection.score else 0.9,
                            "center": (x + width // 2, y + height // 2)
                        })
            
            return faces
            
        except ImportError:
            pass
        
        # Fallback to OpenCV
        try:
            import cv2
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
            
            detections = cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(min_face_size, min_face_size)
            )
            
            for (x, y, w, h) in detections:
                faces.append({
                    "bbox": [int(x), int(y), int(w), int(h)],
                    "confidence": 0.7,  # Default confidence for OpenCV
                    "center": (int(x + w // 2), int(y + h // 2))
                })
            
            return faces
            
        except ImportError:
            logger.warning("Neither MediaPipe nor OpenCV available for face detection")
            return []
    
    def track_faces_in_video(
        self,
        video_path: str,
        config: SmartCropConfig = None,
        callback: Optional[Callable[[int, int], None]] = None
    ) -> List[FaceTrackingResult]:
        """
        Track faces throughout a video.
        
        Args:
            video_path: Path to input video
            config: Smart crop configuration
            callback: Optional progress callback (frame, total)
            
        Returns:
            List of face tracking results per frame
        """
        config = config or SmartCropConfig()
        
        try:
            import cv2
            
            cap = cv2.VideoCapture(video_path)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            results = []
            frame_number = 0
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                faces = self.detect_faces(frame, config.min_face_size)
                
                # Determine main face
                main_face_index = 0
                if len(faces) > 1:
                    if config.tracking_mode == TrackingMode.MAIN_SUBJECT:
                        # Use largest face or most confident
                        main_face_index = max(
                            range(len(faces)),
                            key=lambda i: faces[i]["bbox"][2] * faces[i]["bbox"][3]
                        )
                
                results.append(FaceTrackingResult(
                    frame_number=frame_number,
                    faces=faces,
                    main_face_index=main_face_index,
                    confidence=faces[main_face_index]["confidence"] if faces else 0.0
                ))
                
                frame_number += 1
                if callback:
                    callback(frame_number, total_frames)
            
            cap.release()
            return results
            
        except ImportError:
            logger.error("OpenCV not available for video processing")
            return []
    
    def calculate_crop_regions(
        self,
        tracking_results: List[FaceTrackingResult],
        source_size: Tuple[int, int],
        target_aspect: Tuple[int, int],
        smoothing: float = 0.3,
        padding: float = 0.1
    ) -> List[Tuple[int, int, int, int]]:
        """
        Calculate crop regions based on face tracking.
        
        Args:
            tracking_results: Face tracking results
            source_size: Source video (width, height)
            target_aspect: Target aspect ratio (width_ratio, height_ratio)
            smoothing: Smoothing factor for crop movement
            padding: Extra padding around face
            
        Returns:
            List of (x, y, width, height) crop regions
        """
        src_w, src_h = source_size
        aspect_ratio = target_aspect[0] / target_aspect[1]
        
        # Calculate target crop size
        if aspect_ratio > src_w / src_h:
            # Target is wider - crop height
            crop_h = src_h
            crop_w = int(src_h * aspect_ratio)
        else:
            # Target is taller - crop width
            crop_w = src_w
            crop_h = int(src_w / aspect_ratio)
        
        crop_regions = []
        prev_center = (src_w // 2, src_h // 2)
        
        for result in tracking_results:
            if result.faces:
                # Get main face center
                main_face = result.faces[result.main_face_index]
                face_center = main_face["center"]
                face_size = main_face["bbox"][2]  # Face width
                
                # Add padding around face
                target_center_x = face_center[0]
                target_center_y = face_center[1]
            else:
                # No face - use previous center
                target_center_x = prev_center[0]
                target_center_y = prev_center[1]
            
            # Apply smoothing
            center_x = int(prev_center[0] + smoothing * (target_center_x - prev_center[0]))
            center_y = int(prev_center[1] + smoothing * (target_center_y - prev_center[1]))
            
            # Calculate crop region
            x = max(0, min(src_w - crop_w, center_x - crop_w // 2))
            y = max(0, min(src_h - crop_h, center_y - crop_h // 2))
            
            crop_regions.append((int(x), int(y), crop_w, crop_h))
            prev_center = (center_x, center_y)
        
        return crop_regions
    
    def apply_smart_crop(
        self,
        input_path: str,
        output_path: str,
        config: SmartCropConfig = None,
        callback: Optional[Callable[[str, float], None]] = None
    ) -> Tuple[bool, str]:
        """
        Apply smart pan & scan to video.
        
        Args:
            input_path: Input video path
            output_path: Output video path
            config: Smart crop configuration
            callback: Progress callback
            
        Returns:
            Tuple of (success, message)
        """
        config = config or SmartCropConfig()
        
        try:
            import cv2
            
            cap = cv2.VideoCapture(input_path)
            src_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            src_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Track faces
            if callback:
                callback("tracking", 0)
            
            tracking_results = self.track_faces_in_video(input_path, config)
            
            if not tracking_results:
                # No tracking data - use center crop
                logger.warning("No face tracking data, using center crop")
                tracking_results = [
                    FaceTrackingResult(frame_number=i, faces=[], confidence=0.0)
                    for i in range(total_frames)
                ]
            
            # Calculate crop regions
            crop_regions = self.calculate_crop_regions(
                tracking_results,
                (src_w, src_h),
                config.target_aspect,
                config.smoothing,
                config.padding
            )
            
            # Setup output writer
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(output_path, fourcc, fps, config.target_aspect)
            
            frame_idx = 0
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_idx < len(crop_regions):
                    x, y, w, h = crop_regions[frame_idx]
                    cropped = frame[y:y+h, x:x+w]
                    
                    # Resize to target resolution
                    target_w = config.target_aspect[0] * 120  # Base resolution
                    target_h = config.target_aspect[1] * 120
                    resized = cv2.resize(cropped, (target_w, target_h))
                    
                    out.write(resized)
                
                frame_idx += 1
                if callback:
                    callback("cropping", frame_idx / total_frames * 100)
            
            cap.release()
            out.release()
            
            return True, f"Smart crop applied: {output_path}"
            
        except ImportError:
            logger.error("OpenCV not available for smart crop")
            return False, "OpenCV not available"
        except Exception as e:
            logger.error(f"Smart crop failed: {e}")
            return False, str(e)
    
    def apply_smart_crop_ffmpeg(
        self,
        input_path: str,
        output_path: str,
        crop_data: List[Tuple[int, int, int, int]],
        fps: float = 30.0
    ) -> Tuple[bool, str]:
        """
        Apply pre-calculated smart crop using FFmpeg.
        
        This is more efficient for production use.
        """
        try:
            # Generate FFmpeg crop filter script
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                for i, (x, y, w, h) in enumerate(crop_data):
                    f.write(f"{i} crop={w}:{h}:{x}:{y}\n")
                script_path = f.name
            
            # Build FFmpeg command with crop filter
            # Note: This is a simplified version
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-vf", f"crop={crop_data[0][2]}:{crop_data[0][3]}:{crop_data[0][0]}:{crop_data[0][1]}",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
            
            os.unlink(script_path)
            
            if result.returncode != 0:
                return False, f"FFmpeg crop failed: {result.stderr}"
            
            return True, f"Smart crop applied: {output_path}"
            
        except Exception as e:
            return False, str(e)


# =============================================================================
# Multi-Angle Camera Service
# =============================================================================

class MultiAngleService:
    """
    Generate prompts for multiple camera angles of the same scene.
    Helps create dynamic montages without manual prompt engineering.
    """
    
    def __init__(self):
        # Camera angle prompt modifiers
        self.angle_modifiers = {
            CameraAngle.EYE_LEVEL: {
                "prompt_suffix": "eye level shot, neutral camera angle, straight on",
                "description": "Neutral perspective, viewer's eye level",
                "notes": ["Natural and documentary feel", "Most common angle"]
            },
            CameraAngle.LOW_ANGLE: {
                "prompt_suffix": "low angle shot, camera looking up, heroic perspective",
                "description": "Subject appears powerful and dominant",
                "notes": ["Makes subject look larger", "Good for heroes and villains"]
            },
            CameraAngle.HIGH_ANGLE: {
                "prompt_suffix": "high angle shot, camera looking down, bird's eye view",
                "description": "Subject appears vulnerable or small",
                "notes": ["Creates sense of vulnerability", "Useful for isolation"]
            },
            CameraAngle.DUTCH_ANGLE: {
                "prompt_suffix": "dutch angle, tilted camera, canted frame, diagonal composition",
                "description": "Creates tension and unease",
                "notes": ["Use sparingly for impact", "Common in horror and thriller"]
            },
            CameraAngle.OVER_SHOULDER: {
                "prompt_suffix": "over the shoulder shot, OTS, looking past someone",
                "description": "Connects two characters in a scene",
                "notes": ["Common in dialogue scenes", "Establishes spatial relationship"]
            },
            CameraAngle.POV: {
                "prompt_suffix": "first person POV shot, point of view, subjective camera",
                "description": "Viewer sees through character's eyes",
                "notes": ["Highly immersive", "Good for action sequences"]
            },
            CameraAngle.BIRD_EYE: {
                "prompt_suffix": "bird's eye view, aerial shot, top down view, overhead",
                "description": "Directly above the scene",
                "notes": ["Shows spatial relationships", "Good for establishing shots"]
            },
            CameraAngle.WORM_EYE: {
                "prompt_suffix": "worm's eye view, extreme low angle, ground level looking up",
                "description": "Extreme low angle, dramatic",
                "notes": ["Very dramatic effect", "Makes subjects appear monumental"]
            },
            CameraAngle.DRONE: {
                "prompt_suffix": "drone shot, aerial footage, sweeping view from above",
                "description": "High-altitude moving shot",
                "notes": ["Good for establishing locations", "Adds production value"]
            },
            CameraAngle.CLOSE_UP: {
                "prompt_suffix": "close-up shot, face filling frame, detailed facial expression",
                "description": "Tight shot focusing on face or object",
                "notes": ["Shows emotion and detail", "Intimate and personal"]
            },
            CameraAngle.MEDIUM_SHOT: {
                "prompt_suffix": "medium shot, waist up, three quarter shot",
                "description": "Shows subject from waist up",
                "notes": ["Good for dialogue", "Shows body language"]
            },
            CameraAngle.WIDE_SHOT: {
                "prompt_suffix": "wide shot, full body visible, environmental context",
                "description": "Shows full subject and environment",
                "notes": ["Establishes location", "Shows context"]
            }
        }
        
        # Lens effects for cinematic look
        self.lens_effects = {
            "wide": "wide angle lens, slight barrel distortion, expanded perspective",
            "normal": "50mm lens, natural perspective",
            "telephoto": "telephoto lens, compressed perspective, shallow depth of field",
            "macro": "macro lens, extreme close-up detail, shallow DOF",
            "anamorphic": "anamorphic lens, cinematic widescreen, horizontal flares"
        }
    
    def generate_multi_angle_prompts(
        self,
        base_prompt: str,
        angles: List[CameraAngle] = None,
        lens: str = "normal",
        style: str = "cinematic"
    ) -> List[CameraAnglePrompt]:
        """
        Generate prompts for multiple camera angles from a base prompt.
        
        Args:
            base_prompt: The original scene description
            angles: List of angles to generate (default: all common angles)
            lens: Lens type for additional effect
            style: Visual style to apply
            
        Returns:
            List of CameraAnglePrompt objects
        """
        if angles is None:
            angles = [
                CameraAngle.WIDE_SHOT,
                CameraAngle.MEDIUM_SHOT,
                CameraAngle.CLOSE_UP,
                CameraAngle.LOW_ANGLE,
                CameraAngle.HIGH_ANGLE,
                CameraAngle.OVER_SHOULDER
            ]
        
        prompts = []
        lens_modifier = self.lens_effects.get(lens, "")
        
        for angle in angles:
            modifier = self.angle_modifiers.get(angle, {})
            prompt_suffix = modifier.get("prompt_suffix", "")
            
            # Build full prompt
            full_prompt = f"{base_prompt}, {prompt_suffix}"
            if lens_modifier:
                full_prompt += f", {lens_modifier}"
            full_prompt += f", {style} style, professional cinematography"
            
            # Build negative prompt
            negative = "blurry, low quality, distorted, deformed, bad composition, amateur"
            
            camera_prompt = CameraAnglePrompt(
                angle=angle,
                prompt=full_prompt,
                negative_prompt=negative,
                description=modifier.get("description", ""),
                composition_notes=modifier.get("notes", [])
            )
            prompts.append(camera_prompt)
        
        return prompts
    
    def get_angle_sequence(
        self,
        scene_type: str = "dialogue"
    ) -> List[CameraAngle]:
        """
        Get recommended angle sequence for a scene type.
        
        Args:
            scene_type: Type of scene (dialogue, action, revelation, etc.)
            
        Returns:
            List of recommended camera angles
        """
        sequences = {
            "dialogue": [
                CameraAngle.WIDE_SHOT,  # Establish
                CameraAngle.OVER_SHOULDER,  # Character A
                CameraAngle.OVER_SHOULDER,  # Character B
                CameraAngle.MEDIUM_SHOT,  # Both
                CameraAngle.CLOSE_UP  # Reaction
            ],
            "action": [
                CameraAngle.WIDE_SHOT,  # Establish
                CameraAngle.MEDIUM_SHOT,  # Action
                CameraAngle.CLOSE_UP,  # Detail
                CameraAngle.LOW_ANGLE,  # Hero
                CameraAngle.POV,  # Immersion
                CameraAngle.WIDE_SHOT  # Resolution
            ],
            "revelation": [
                CameraAngle.MEDIUM_SHOT,  # Setup
                CameraAngle.CLOSE_UP,  # Reaction
                CameraAngle.DUTCH_ANGLE,  # Tension
                CameraAngle.WIDE_SHOT  # Reveal
            ],
            "chase": [
                CameraAngle.WIDE_SHOT,
                CameraAngle.POV,
                CameraAngle.LOW_ANGLE,
                CameraAngle.DRONE,
                CameraAngle.CLOSE_UP,
                CameraAngle.WIDE_SHOT
            ],
            "horror": [
                CameraAngle.WIDE_SHOT,  # Isolation
                CameraAngle.HIGH_ANGLE,  # Vulnerability
                CameraAngle.DUTCH_ANGLE,  # Unease
                CameraAngle.POV,  # Threat
                CameraAngle.CLOSE_UP  # Fear
            ]
        }
        
        return sequences.get(scene_type, sequences["dialogue"])
    
    def generate_shot_list(
        self,
        scene_description: str,
        scene_type: str = "dialogue",
        num_shots: int = 5
    ) -> Dict[str, Any]:
        """
        Generate a complete shot list for a scene.
        
        Args:
            scene_description: Description of the scene
            scene_type: Type of scene
            num_shots: Number of shots to generate
            
        Returns:
            Dictionary with shot list and prompts
        """
        angles = self.get_angle_sequence(scene_type)[:num_shots]
        prompts = self.generate_multi_angle_prompts(scene_description, angles)
        
        shot_list = []
        for i, prompt in enumerate(prompts):
            shot_list.append({
                "shot_number": i + 1,
                "angle": prompt.angle.value,
                "description": prompt.description,
                "prompt": prompt.prompt,
                "negative_prompt": prompt.negative_prompt,
                "notes": prompt.composition_notes,
                "estimated_duration": 3.0 if i == 0 else 2.0  # First shot longer
            })
        
        return {
            "scene_description": scene_description,
            "scene_type": scene_type,
            "total_shots": len(shot_list),
            "estimated_duration": sum(s["estimated_duration"] for s in shot_list),
            "shot_list": shot_list
        }


# =============================================================================
# Character Consistency Service
# =============================================================================

class CharacterConsistencyService:
    """
    Generate character consistency sheets for maintaining visual consistency
    across multiple scenes and prompts.
    """
    
    def __init__(self):
        self.view_prompts = {
            CharacterView.FRONT: "front view, facing camera directly, symmetrical",
            CharacterView.THREE_QUARTER_LEFT: "three-quarter view from left, slight angle",
            CharacterView.THREE_QUARTER_RIGHT: "three-quarter view from right, slight angle",
            CharacterView.PROFILE_LEFT: "left profile, side view, 90 degree angle",
            CharacterView.PROFILE_RIGHT: "right profile, side view, 90 degree angle",
            CharacterView.BACK: "back view, from behind, rear angle",
            CharacterView.BACK_THREE_QUARTER: "back three-quarter view, over shoulder angle"
        }
        
        self.expression_prompts = {
            "neutral": "neutral expression, calm, relaxed face",
            "happy": "happy, smiling, joyful expression",
            "sad": "sad, melancholic, downcast expression",
            "angry": "angry, fierce, intense expression",
            "surprised": "surprised, shocked, wide-eyed expression",
            "fearful": "fearful, worried, anxious expression",
            "disgusted": "disgusted, repulsed expression",
            "confident": "confident, determined, resolute expression"
        }
    
    def generate_character_sheet_prompts(
        self,
        character_description: str,
        config: CharacterSheetConfig = None
    ) -> Dict[str, CameraAnglePrompt]:
        """
        Generate prompts for a character consistency sheet.
        
        Args:
            character_description: Base description of the character
            config: Character sheet configuration
            
        Returns:
            Dictionary mapping view names to prompts
        """
        config = config or CharacterSheetConfig(
            character_id="default",
            character_name="Character"
        )
        
        prompts = {}
        
        for view in config.views:
            view_prompt = self.view_prompts.get(view, "")
            full_prompt = f"{character_description}, {view_prompt}, {config.style} style"
            full_prompt += ", character sheet, reference image, consistent design"
            full_prompt += f", {config.outfit} outfit"
            
            negative = "blurry, low quality, inconsistent, different face, altered features"
            negative += ", distorted, deformed, bad anatomy"
            
            prompts[view.value] = CameraAnglePrompt(
                angle=CameraAngle.EYE_LEVEL,  # Not really an angle, but reuse class
                prompt=full_prompt,
                negative_prompt=negative,
                description=f"{view.value.replace('_', ' ').title()} view of {config.character_name}",
                composition_notes=[
                    f"View: {view.value}",
                    f"Outfit: {config.outfit}",
                    f"Style: {config.style}"
                ]
            )
        
        return prompts
    
    def generate_expression_sheet_prompts(
        self,
        character_description: str,
        expressions: List[str] = None,
        style: str = "realistic"
    ) -> Dict[str, str]:
        """
        Generate prompts for an expression sheet.
        
        Args:
            character_description: Base character description
            expressions: List of expressions to generate
            style: Visual style
            
        Returns:
            Dictionary mapping expression names to prompts
        """
        expressions = expressions or list(self.expression_prompts.keys())
        
        prompts = {}
        for expr in expressions:
            expr_prompt = self.expression_prompts.get(expr, "")
            full_prompt = f"{character_description}, {expr_prompt}, {style} style"
            full_prompt += ", expression sheet, character reference"
            
            prompts[expr] = full_prompt
        
        return prompts
    
    def create_consistency_prompt(
        self,
        base_prompt: str,
        reference_image_path: str,
        strength: float = 0.8
    ) -> Dict[str, Any]:
        """
        Create a prompt configuration for generating consistent images
        using a reference image.
        
        Args:
            base_prompt: The scene/action prompt
            reference_image_path: Path to the reference character sheet
            strength: How strongly to adhere to reference (0-1)
            
        Returns:
            Dictionary with prompt configuration
        """
        return {
            "prompt": base_prompt,
            "negative_prompt": "different face, inconsistent features, altered appearance",
            "reference_image": reference_image_path,
            "reference_strength": strength,
            "controlnet_config": {
                "enabled": True,
                "model": "control_v11p_sd15_openpose" if "pose" in base_prompt.lower() else "control_v11p_sd15_canny",
                "strength": strength * 0.8
            },
            "ip_adapter_config": {
                "enabled": True,
                "image": reference_image_path,
                "strength": strength
            }
        }
    
    def generate_turnaround_prompt(
        self,
        character_description: str,
        num_views: int = 8,
        style: str = "realistic"
    ) -> str:
        """
        Generate a single prompt for a turnaround sheet.
        
        Args:
            character_description: Base character description
            num_views: Number of views in turnaround
            style: Visual style
            
        Returns:
            Combined prompt for turnaround sheet
        """
        views = [
            "front view",
            "front three-quarter",
            "side profile left",
            "back three-quarter",
            "back view",
            "back three-quarter right",
            "side profile right",
            "front three-quarter right"
        ]
        
        selected_views = views[:num_views]
        views_str = ", ".join(selected_views)
        
        prompt = f"character turnaround sheet, {character_description}"
        prompt += f", {views_str}, multiple angles on single image"
        prompt += f", {style} style, character design reference"
        prompt += ", white background, clean layout"
        
        return prompt


# =============================================================================
# Smooth Cut Service (Frame Interpolation)
# =============================================================================

class SmoothCutService:
    """
    Create smooth transitions between cuts using frame interpolation.
    Helps avoid jarring jump cuts.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
    
    def create_smooth_cut(
        self,
        video1_path: str,
        video2_path: str,
        output_path: str,
        transition_frames: int = 12,
        method: str = "blend"
    ) -> Tuple[bool, str]:
        """
        Create a smooth transition between two video clips.
        
        Args:
            video1_path: First video path
            video2_path: Second video path
            output_path: Output video path
            transition_frames: Number of frames for transition
            method: Transition method (blend, morph, crossfade)
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Get video info
            probe_cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height,r_frame_rate,duration",
                "-of", "json", video1_path
            ]
            
            result = subprocess.run(probe_cmd, capture_output=True, text=True)
            import json
            info = json.loads(result.stdout)
            stream = info["streams"][0]
            
            fps = eval(stream["r_frame_rate"])  # e.g., "30/1" -> 30
            transition_duration = transition_frames / fps
            
            # Build filter
            if method == "crossfade":
                filter_complex = (
                    f"[0:v]split[v0][v0fade];"
                    f"[1:v]split[v1][v1fade];"
                    f"[v0fade]trim=0:{transition_duration},setpts=PTS-STARTPTS[v0trim];"
                    f"[v1fade]trim=0:{transition_duration},setpts=PTS-STARTPTS[v1trim];"
                    f"[v0trim][v1trim]xfade=transition=fade:duration={transition_duration}:offset=0[vout]"
                )
            else:
                # Simple blend
                filter_complex = (
                    f"[0:v][1:v]blend=all_expr='A*(1-T/{transition_duration})+B*(T/{transition_duration})'[vout]"
                )
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", video1_path,
                "-i", video2_path,
                "-filter_complex", filter_complex,
                "-map", "[vout]",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, f"Smooth cut failed: {result.stderr}"
            
            return True, f"Smooth cut created: {output_path}"
            
        except Exception as e:
            return False, str(e)
    
    def interpolate_frames(
        self,
        input_path: str,
        output_path: str,
        target_fps: int = 60,
        method: str = "minterpolate"
    ) -> Tuple[bool, str]:
        """
        Interpolate frames for smoother motion.
        
        Args:
            input_path: Input video path
            output_path: Output video path
            target_fps: Target frame rate
            method: Interpolation method
            
        Returns:
            Tuple of (success, message)
        """
        try:
            if method == "minterpolate":
                filter_str = f"minterpolate=fps={target_fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1"
            else:
                filter_str = f"fps={target_fps}"
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-vf", filter_str,
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "20",
                "-c:a", "copy",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=1800)
            
            if result.returncode != 0:
                return False, f"Frame interpolation failed: {result.stderr}"
            
            return True, f"Frame interpolation complete: {output_path}"
            
        except Exception as e:
            return False, str(e)


# =============================================================================
# Factory Functions
# =============================================================================

def create_smart_crop_service(ffmpeg_path: str = "ffmpeg") -> SmartCropService:
    """Create smart crop service instance."""
    return SmartCropService(ffmpeg_path)

def create_multi_angle_service() -> MultiAngleService:
    """Create multi-angle service instance."""
    return MultiAngleService()

def create_character_consistency_service() -> CharacterConsistencyService:
    """Create character consistency service instance."""
    return CharacterConsistencyService()

def create_smooth_cut_service(ffmpeg_path: str = "ffmpeg") -> SmoothCutService:
    """Create smooth cut service instance."""
    return SmoothCutService(ffmpeg_path)


# =============================================================================
# Service Instances
# =============================================================================

_smart_crop_service = None
_multi_angle_service = None
_character_consistency_service = None
_smooth_cut_service = None

def get_smart_crop_service() -> SmartCropService:
    """Get or create smart crop service."""
    global _smart_crop_service
    if _smart_crop_service is None:
        _smart_crop_service = create_smart_crop_service()
    return _smart_crop_service

def get_multi_angle_service() -> MultiAngleService:
    """Get or create multi-angle service."""
    global _multi_angle_service
    if _multi_angle_service is None:
        _multi_angle_service = create_multi_angle_service()
    return _multi_angle_service

def get_character_consistency_service() -> CharacterConsistencyService:
    """Get or create character consistency service."""
    global _character_consistency_service
    if _character_consistency_service is None:
        _character_consistency_service = create_character_consistency_service()
    return _character_consistency_service

def get_smooth_cut_service() -> SmoothCutService:
    """Get or create smooth cut service."""
    global _smooth_cut_service
    if _smooth_cut_service is None:
        _smooth_cut_service = create_smooth_cut_service()
    return _smooth_cut_service