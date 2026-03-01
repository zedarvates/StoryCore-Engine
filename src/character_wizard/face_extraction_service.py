"""
Face Extraction Service for Character Creation from Images.

This module provides:
- Face detection and extraction from uploaded images
- Face embedding generation for face swapping
- Face angle and expression analysis
- Integration with ComfyUI workflows for face swapping

Requirements: Character Creation Enhancement from User Images
"""

import base64
import io
import logging
import os
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import numpy as np

# Try to import image processing libraries
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logging.warning("PIL not available - image processing limited")

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logging.warning("OpenCV not available - face detection limited")

# Configure logging
logger = logging.getLogger(__name__)


class FaceAngle(Enum):
    """Detected face angle/orientation"""
    FRONT = "front"
    THREE_QUARTER_LEFT = "three_quarter_left"
    THREE_QUARTER_RIGHT = "three_quarter_right"
    PROFILE_LEFT = "profile_left"
    PROFILE_RIGHT = "profile_right"
    LOOKING_UP = "looking_up"
    LOOKING_DOWN = "looking_down"
    UNKNOWN = "unknown"


class FaceExpression(Enum):
    """Detected facial expression"""
    NEUTRAL = "neutral"
    SMILING = "smiling"
    SERIOUS = "serious"
    SURPRISED = "surprised"
    ANGRY = "angry"
    SAD = "sad"
    UNKNOWN = "unknown"


@dataclass
class FacialLandmarks:
    """Facial landmark points"""
    # Basic 5-point landmarks (for face recognition)
    left_eye: Tuple[float, float] = (0.0, 0.0)
    right_eye: Tuple[float, float] = (0.0, 0.0)
    nose_tip: Tuple[float, float] = (0.0, 0.0)
    left_mouth_corner: Tuple[float, float] = (0.0, 0.0)
    right_mouth_corner: Tuple[float, float] = (0.0, 0.0)
    
    # Extended 68-point landmarks (if available)
    jaw_line: List[Tuple[float, float]] = field(default_factory=list)
    left_eyebrow: List[Tuple[float, float]] = field(default_factory=list)
    right_eyebrow: List[Tuple[float, float]] = field(default_factory=list)
    nose_bridge: List[Tuple[float, float]] = field(default_factory=list)
    nose_bottom: List[Tuple[float, float]] = field(default_factory=list)
    left_eye_outline: List[Tuple[float, float]] = field(default_factory=list)
    right_eye_outline: List[Tuple[float, float]] = field(default_factory=list)
    outer_lip: List[Tuple[float, float]] = field(default_factory=list)
    inner_lip: List[Tuple[float, float]] = field(default_factory=list)


@dataclass
class ExtractedFace:
    """Result of face extraction"""
    success: bool
    face_image: Optional[np.ndarray] = None  # Cropped face image
    face_embedding: Optional[np.ndarray] = None  # Face embedding vector
    bounding_box: Optional[Tuple[int, int, int, int]] = None  # x, y, width, height
    landmarks: Optional[FacialLandmarks] = None
    angle: FaceAngle = FaceAngle.UNKNOWN
    expression: FaceExpression = FaceExpression.UNKNOWN
    confidence: float = 0.0
    error_message: Optional[str] = None
    
    # Face attributes
    detected_gender: Optional[str] = None
    detected_age_range: Optional[str] = None
    has_glasses: bool = False
    has_beard: bool = False
    has_mustache: bool = False


@dataclass
class FaceExtractionConfig:
    """Configuration for face extraction"""
    min_face_size: int = 64  # Minimum face size in pixels
    max_faces: int = 1  # Maximum number of faces to extract
    padding_ratio: float = 0.2  # Padding around detected face
    output_size: Tuple[int, int] = (512, 512)  # Output face image size
    align_face: bool = True  # Align face to vertical
    enhance_face: bool = True  # Apply enhancement to extracted face
    detect_landmarks: bool = True  # Detect facial landmarks
    compute_embedding: bool = True  # Compute face embedding


class FaceExtractionService:
    """
    Service for extracting and analyzing faces from images.
    
    Uses OpenCV for face detection and provides face embeddings
    for use in face swapping workflows.
    """
    
    def __init__(self, config: Optional[FaceExtractionConfig] = None):
        """Initialize the face extraction service"""
        self.config = config or FaceExtractionConfig()
        self._face_detector = None
        self._landmark_detector = None
        self._face_recognizer = None
        self._initialized = False
        
        # Initialize models lazily
        self._init_detectors()
    
    def _init_detectors(self):
        """Initialize face detection models"""
        if not CV2_AVAILABLE:
            logger.warning("OpenCV not available, face detection disabled")
            return
        
        try:
            # Try to load OpenCV's DNN face detector
            models_dir = Path(__file__).parent.parent.parent / "models" / "face"
            
            # Try YuNet (OpenCV's face detector)
            try:
                face_detector_path = models_dir / "face_detection_yunet_2023mar.onnx"
                if face_detector_path.exists():
                    self._face_detector = cv2.FaceDetectorYN.create(
                        str(face_detector_path),
                        "",
                        (320, 320),
                        score_threshold=0.9,
                        nms_threshold=0.3,
                        top_k=self.config.max_faces
                    )
                    logger.info("Loaded YuNet face detector")
            except Exception as e:
                logger.debug(f"YuNet not available: {e}")
            
            # Fallback to Haar Cascade
            if self._face_detector is None:
                try:
                    cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml'
                    if Path(cascade_path).exists():
                        self._face_detector = cv2.CascadeClassifier(cascade_path)
                        logger.info("Loaded Haar Cascade face detector")
                except Exception as e:
                    logger.debug(f"Haar Cascade not available: {e}")
            
            # Try to load landmark detector
            try:
                landmark_path = models_dir / "lbfmodel.yaml"
                if landmark_path.exists():
                    self._landmark_detector = cv2.face.createFacemarkLBF()
                    self._landmark_detector.loadModel(str(landmark_path))
                    logger.info("Loaded LBF landmark detector")
            except Exception as e:
                logger.debug(f"Landmark detector not available: {e}")
            
            self._initialized = True
            logger.info("Face extraction service initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize face detectors: {e}")
            self._initialized = False
    
    def extract_face(
        self, 
        image: Union[np.ndarray, str, Path, Image.Image]
    ) -> ExtractedFace:
        """
        Extract face from image.
        
        Args:
            image: Input image (numpy array, file path, or PIL Image)
            
        Returns:
            ExtractedFace with extraction results
        """
        if not self._initialized:
            return ExtractedFace(
                success=False,
                error_message="Face extraction service not initialized"
            )
        
        try:
            # Convert input to numpy array
            img_array = self._to_numpy_array(image)
            if img_array is None:
                return ExtractedFace(
                    success=False,
                    error_message="Failed to convert image to numpy array"
                )
            
            # Detect faces
            faces = self._detect_faces(img_array)
            if not faces:
                return ExtractedFace(
                    success=False,
                    error_message="No face detected in image"
                )
            
            # Take the largest/most confident face
            face_data = faces[0]
            
            # Extract bounding box
            x, y, w, h = face_data[:4]
            
            # Add padding
            padding = int(max(w, h) * self.config.padding_ratio)
            x = max(0, x - padding)
            y = max(0, y - padding)
            w = min(img_array.shape[1] - x, w + 2 * padding)
            h = min(img_array.shape[0] - y, h + 2 * padding)
            
            # Crop face
            face_crop = img_array[y:y+h, x:x+w]
            
            # Detect landmarks if enabled
            landmarks = None
            if self.config.detect_landmarks and self._landmark_detector:
                landmarks = self._detect_landmarks(img_array, face_data)
            
            # Estimate face angle
            angle = self._estimate_face_angle(landmarks) if landmarks else FaceAngle.UNKNOWN
            
            # Estimate expression
            expression = self._estimate_expression(landmarks) if landmarks else FaceExpression.UNKNOWN
            
            # Align face if enabled
            if self.config.align_face and landmarks:
                face_crop = self._align_face(face_crop, landmarks)
            
            # Resize to output size
            if PIL_AVAILABLE:
                face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB))
                face_pil = face_pil.resize(self.config.output_size, Image.Resampling.LANCZOS)
                face_crop = cv2.cvtColor(np.array(face_pil), cv2.COLOR_RGB2BGR)
            else:
                face_crop = cv2.resize(face_crop, self.config.output_size)
            
            # Enhance face if enabled
            if self.config.enhance_face:
                face_crop = self._enhance_face(face_crop)
            
            # Compute embedding if enabled
            embedding = None
            if self.config.compute_embedding:
                embedding = self._compute_embedding(face_crop)
            
            return ExtractedFace(
                success=True,
                face_image=face_crop,
                face_embedding=embedding,
                bounding_box=(x, y, w, h),
                landmarks=landmarks,
                angle=angle,
                expression=expression,
                confidence=face_data[4] if len(face_data) > 4 else 1.0,
                detected_gender=self._detect_gender(face_crop),
                detected_age_range=self._detect_age(face_crop)
            )
            
        except Exception as e:
            logger.error(f"Face extraction failed: {e}")
            return ExtractedFace(
                success=False,
                error_message=str(e)
            )
    
    def _to_numpy_array(
        self, 
        image: Union[np.ndarray, str, Path, Image.Image]
    ) -> Optional[np.ndarray]:
        """Convert input to numpy array"""
        if isinstance(image, np.ndarray):
            return image
        elif isinstance(image, (str, Path)):
            if not PIL_AVAILABLE:
                return cv2.imread(str(image))
            img = Image.open(image)
            return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        elif PIL_AVAILABLE and isinstance(image, Image.Image):
            return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        return None
    
    def _detect_faces(self, image: np.ndarray) -> List[np.ndarray]:
        """Detect faces in image"""
        if self._face_detector is None:
            return []
        
        h, w = image.shape[:2]
        
        # YuNet detector
        if isinstance(self._face_detector, cv2.FaceDetectorYN):
            self._face_detector.setInputSize((w, h))
            _, faces = self._face_detector.detect(image)
            if faces is not None:
                return [face for face in faces[:self.config.max_faces]]
        
        # Haar Cascade detector
        elif isinstance(self._face_detector, cv2.CascadeClassifier):
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self._face_detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(self.config.min_face_size, self.config.min_face_size)
            )
            if len(faces) > 0:
                # Add confidence score (1.0 for Haar Cascade)
                result = []
                for face in faces[:self.config.max_faces]:
                    result.append(np.array([*face, 1.0]))
                return result
        
        return []
    
    def _detect_landmarks(
        self, 
        image: np.ndarray, 
        face_data: np.ndarray
    ) -> Optional[FacialLandmarks]:
        """Detect facial landmarks"""
        if self._landmark_detector is None:
            return None
        
        try:
            x, y, w, h = face_data[:4].astype(int)
            face_rect = np.array([[x, y, w, h]], dtype=np.int32)
            
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            _, landmarks = self._landmark_detector.fit(gray, face_rect)
            
            if landmarks is not None and len(landmarks) > 0:
                points = landmarks[0][0]
                
                return FacialLandmarks(
                    left_eye=tuple(points[36]) if len(points) > 36 else (0, 0),
                    right_eye=tuple(points[45]) if len(points) > 45 else (0, 0),
                    nose_tip=tuple(points[30]) if len(points) > 30 else (0, 0),
                    left_mouth_corner=tuple(points[48]) if len(points) > 48 else (0, 0),
                    right_mouth_corner=tuple(points[54]) if len(points) > 54 else (0, 0),
                    # Extended landmarks
                    jaw_line=[tuple(p) for p in points[0:17]],
                    left_eyebrow=[tuple(p) for p in points[17:22]],
                    right_eyebrow=[tuple(p) for p in points[22:27]],
                    nose_bridge=[tuple(p) for p in points[27:31]],
                    nose_bottom=[tuple(p) for p in points[31:36]],
                    left_eye_outline=[tuple(p) for p in points[36:42]],
                    right_eye_outline=[tuple(p) for p in points[42:48]],
                    outer_lip=[tuple(p) for p in points[48:60]],
                    inner_lip=[tuple(p) for p in points[60:68]]
                )
        except Exception as e:
            logger.debug(f"Landmark detection failed: {e}")
        
        return None
    
    def _estimate_face_angle(self, landmarks: Optional[FacialLandmarks]) -> FaceAngle:
        """Estimate face angle from landmarks"""
        if landmarks is None:
            return FaceAngle.UNKNOWN
        
        try:
            # Calculate eye centers
            left_eye = np.array(landmarks.left_eye)
            right_eye = np.array(landmarks.right_eye)
            nose_tip = np.array(landmarks.nose_tip)
            
            # Calculate eye center
            eye_center = (left_eye + right_eye) / 2
            
            # Calculate horizontal offset of nose from eye center
            eye_width = np.linalg.norm(right_eye - left_eye)
            if eye_width == 0:
                return FaceAngle.UNKNOWN
            
            nose_offset = (nose_tip[0] - eye_center[0]) / eye_width
            
            # Determine angle based on offset
            if abs(nose_offset) < 0.1:
                return FaceAngle.FRONT
            elif 0.1 <= nose_offset < 0.3:
                return FaceAngle.THREE_QUARTER_RIGHT
            elif -0.3 < nose_offset <= -0.1:
                return FaceAngle.THREE_QUARTER_LEFT
            elif nose_offset >= 0.3:
                return FaceAngle.PROFILE_RIGHT
            elif nose_offset <= -0.3:
                return FaceAngle.PROFILE_LEFT
            
        except Exception as e:
            logger.debug(f"Face angle estimation failed: {e}")
        
        return FaceAngle.UNKNOWN
    
    def _estimate_expression(self, landmarks: Optional[FacialLandmarks]) -> FaceExpression:
        """Estimate facial expression from landmarks"""
        if landmarks is None:
            return FaceExpression.UNKNOWN
        
        try:
            # Simple expression estimation based on mouth shape
            left_mouth = np.array(landmarks.left_mouth_corner)
            right_mouth = np.array(landmarks.right_mouth_corner)
            nose_tip = np.array(landmarks.nose_tip)
            
            # Mouth width and position relative to nose
            mouth_width = np.linalg.norm(right_mouth - left_mouth)
            mouth_center = (left_mouth + right_mouth) / 2
            mouth_height = nose_tip[1] - mouth_center[1]  # Negative if mouth is above nose
            
            # Simple heuristics
            if mouth_width > 50:  # Wide mouth = smiling
                return FaceExpression.SMILING
            elif mouth_height > 30:  # Mouth far from nose = open mouth
                return FaceExpression.SURPRISED
            
            return FaceExpression.NEUTRAL
            
        except Exception as e:
            logger.debug(f"Expression estimation failed: {e}")
        
        return FaceExpression.UNKNOWN
    
    def _align_face(
        self, 
        face_image: np.ndarray, 
        landmarks: FacialLandmarks
    ) -> np.ndarray:
        """Align face to vertical orientation"""
        try:
            left_eye = np.array(landmarks.left_eye)
            right_eye = np.array(landmarks.right_eye)
            
            # Calculate rotation angle
            dY = right_eye[1] - left_eye[1]
            dX = right_eye[0] - left_eye[0]
            angle = np.degrees(np.arctan2(dY, dX))
            
            # Get center of image
            h, w = face_image.shape[:2]
            center = (w // 2, h // 2)
            
            # Rotate image
            M = cv2.getRotationMatrix2D(center, angle, 1.0)
            aligned = cv2.warpAffine(
                face_image, M, (w, h),
                flags=cv2.INTER_CUBIC,
                borderMode=cv2.BORDER_REPLICATE
            )
            
            return aligned
            
        except Exception as e:
            logger.debug(f"Face alignment failed: {e}")
            return face_image
    
    def _enhance_face(self, face_image: np.ndarray) -> np.ndarray:
        """Apply enhancement to face image"""
        try:
            # Apply slight Gaussian blur for smoothing
            smoothed = cv2.GaussianBlur(face_image, (3, 3), 0)
            
            # Sharpen
            kernel = np.array([
                [0, -1, 0],
                [-1, 5, -1],
                [0, -1, 0]
            ])
            sharpened = cv2.filter2D(face_image, -1, kernel)
            
            # Blend
            enhanced = cv2.addWeighted(face_image, 0.7, sharpened, 0.3, 0)
            
            # Slight brightness/contrast adjustment
            enhanced = cv2.convertScaleAbs(enhanced, alpha=1.05, beta=5)
            
            return enhanced
            
        except Exception as e:
            logger.debug(f"Face enhancement failed: {e}")
            return face_image
    
    def _compute_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        """Compute face embedding vector"""
        # This would typically use a face recognition model
        # For now, return a placeholder
        # In production, integrate with models like FaceNet, ArcFace, etc.
        try:
            # Placeholder: use simple histogram as "embedding"
            # In production, use proper face recognition model
            gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY)
            hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
            cv2.normalize(hist, hist)
            return hist.flatten()
        except Exception as e:
            logger.debug(f"Embedding computation failed: {e}")
            return None
    
    def _detect_gender(self, face_image: np.ndarray) -> Optional[str]:
        """Detect gender from face image"""
        # Placeholder - in production, use gender classification model
        return None
    
    def _detect_age(self, face_image: np.ndarray) -> Optional[str]:
        """Detect age range from face image"""
        # Placeholder - in production, use age estimation model
        return None
    
    def save_face_image(
        self, 
        extracted_face: ExtractedFace, 
        output_path: Union[str, Path]
    ) -> bool:
        """Save extracted face to file"""
        if not extracted_face.success or extracted_face.face_image is None:
            return False
        
        try:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            cv2.imwrite(str(output_path), extracted_face.face_image)
            return True
        except Exception as e:
            logger.error(f"Failed to save face image: {e}")
            return False
    
    def face_to_base64(
        self, 
        extracted_face: ExtractedFace, 
        format: str = "PNG"
    ) -> Optional[str]:
        """Convert extracted face to base64 string"""
        if not extracted_face.success or extracted_face.face_image is None:
            return None
        
        try:
            if PIL_AVAILABLE:
                img = Image.fromarray(
                    cv2.cvtColor(extracted_face.face_image, cv2.COLOR_BGR2RGB)
                )
                buffer = io.BytesIO()
                img.save(buffer, format=format)
                return base64.b64encode(buffer.getvalue()).decode('utf-8')
            else:
                _, buffer = cv2.imencode(f'.{format.lower()}', extracted_face.face_image)
                return base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            logger.error(f"Failed to convert face to base64: {e}")
            return None


# Singleton instance
_face_extraction_service: Optional[FaceExtractionService] = None


def get_face_extraction_service(
    config: Optional[FaceExtractionConfig] = None
) -> FaceExtractionService:
    """Get singleton instance of face extraction service"""
    global _face_extraction_service
    if _face_extraction_service is None:
        _face_extraction_service = FaceExtractionService(config)
    return _face_extraction_service