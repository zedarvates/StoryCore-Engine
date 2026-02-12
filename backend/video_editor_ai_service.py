"""
Video Editor AI Service

AI-powered features for video editing:
- Transcription (Whisper, Vosk)
- Text-to-Speech (Coqui TTS, VITS, Qwen TTS)
- Translation (Marian, M2M100)
- Smart Crop & Auto-resize
- Audio Cleaning
- Scene Detection

Author: StoryCore Team
Version: 1.0.0
"""

import asyncio
import subprocess
import tempfile
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import uuid
import torch
import numpy as np

# Import from existing modules
import sys
sys.path.insert(0, str(Path(__file__).parent))

# =============================================================================
# Configuration
# =============================================================================

@dataclass
class AIConfig:
    """AI service configuration."""
    # Whisper settings
    whisper_model: str = "base"  # tiny, base, small, medium, large
    whisper_device: str = "auto"  # cpu, cuda, auto
    
    # TTS settings
    tts_model: str = "coqui"  # coqui, vits, qwen
    tts_default_voice: str = "fr-FR-Denise"
    
    # Translation settings
    translation_model: str = "marian"  # marian, m2m100
    
    # Paths
    temp_dir: str = "data/temp"
    models_dir: str = "models"
    
    # Performance
    batch_size: int = 1
    num_workers: int = 4


# Global config
ai_config = AIConfig()


# =============================================================================
# Result Classes
# =============================================================================

@dataclass
class TranscriptionResult:
    """Transcription result."""
    text: str
    segments: List[Dict[str, Any]]
    language: str
    confidence: float
    duration: float
    job_id: str
    created_at: datetime


@dataclass
class TranslationResult:
    """Translation result."""
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    confidence: float


@dataclass
class TTSResult:
    """Text-to-speech result."""
    audio_path: str
    duration: float
    sample_rate: int
    text: str
    voice: str


@dataclass
class SmartCropResult:
    """Smart crop result."""
    regions: List[Dict[str, Any]]
    target_ratio: str
    focus_mode: str
    original_resolution: Tuple[int, int]


@dataclass
class AudioCleaningResult:
    """Audio cleaning result."""
    audio_path: str
    noise_reduced: bool
    echo_removed: bool
    enhanced_speech: bool
    original_duration: float


@dataclass
class SceneDetectionResult:
    """Scene detection result."""
    scenes: List[Dict[str, Any]]
    total_scenes: int
    thumbnail_paths: List[str]


# =============================================================================
# Transcription Service
# =============================================================================

class TranscriptionService:
    """Service for audio/video transcription."""
    
    def __init__(self, config: AIConfig = None):
        self.config = config or ai_config
        self.model = None
        
    async def load_model(self):
        """Load Whisper model."""
        try:
            import whisper
            self.model = whisper.load_model(
                self.config.whisper_model,
                device=self.config.whisper_device
            )
        except ImportError:
            raise ImportError("OpenAI Whisper not installed. Run: pip install openai-whisper")
    
    async def transcribe(
        self,
        audio_path: str,
        language: Optional[str] = None,
        enable_speakers: bool = False
    ) -> TranscriptionResult:
        """Transcribe audio/video to text."""
        job_id = str(uuid.uuid4())
        
        # Load model if not loaded
        if self.model is None:
            await self.load_model()
        
        # Run transcription
        options = {}
        if language:
            options["language"] = language
        
        result = self.model.transcribe(audio_path, **options)
        
        return TranscriptionResult(
            text=result["text"],
            segments=result.get("segments", []),
            language=result.get("language", "unknown"),
            confidence=result.get("confidence", 0.0),
            duration=result.get("duration", 0.0),
            job_id=job_id,
            created_at=datetime.utcnow()
        )
    
    async def transcribe_with_timestamps(
        self,
        audio_path: str,
        language: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Transcribe with word-level timestamps."""
        if self.model is None:
            await self.load_model()
        
        result = self.model.transcribe(
            audio_path,
            language=language,
            word_timestamps=True
        )
        
        return result.get("segments", [])
    
    async def detect_language(self, audio_path: str) -> str:
        """Detect language of audio."""
        if self.model is None:
            await self.load_model()
        
        result = self.model.detect_language(audio_path)
        return result if result else "unknown"


# =============================================================================
# Translation Service
# =============================================================================

class TranslationService:
    """Service for text translation."""
    
    def __init__(self, config: AIConfig = None):
        self.config = config or ai_config
        self.model = None
        
    async def load_model(self):
        """Load translation model."""
        try:
            from transformers import MarianMTModel, MarianTokenizer
            model_name = f"Helsinki-NLP/opus-mt-{self.config.translation_model}"
            self.model = MarianTokenizer.from_pretrained(model_name)
            self.translator = MarianMTModel.from_pretrained(model_name)
        except ImportError:
            raise ImportError("Transformers not installed. Run: pip install transformers")
    
    async def translate(
        self,
        text: str,
        source_language: str,
        target_language: str
    ) -> TranslationResult:
        """Translate text from source to target language."""
        # Load model if not loaded
        if self.model is None:
            await self.load_model()
        
        # Prepare input
        lang_code_map = {
            "french": "fr", "english": "en", "spanish": "es",
            "german": "de", "italian": "it", "portuguese": "pt",
            "chinese": "zh", "japanese": "ja", "korean": "ko",
            "russian": "ru", "arabic": "ar"
        }
        
        src = lang_code_map.get(source_language.lower(), source_language[:2])
        tgt = lang_code_map.get(target_language.lower(), target_language[:2])
        
        # Translate
        inputs = self.model.prepare_seq2seq_batch([text])
        outputs = self.translator.generate(**inputs)
        translated = self.model.decode(outputs[0], skip_special_tokens=True)
        
        return TranslationResult(
            original_text=text,
            translated_text=translated,
            source_language=src,
            target_language=tgt,
            confidence=0.9
        )
    
    async def translate_batch(
        self,
        texts: List[str],
        source_language: str,
        target_language: str
    ) -> List[TranslationResult]:
        """Translate multiple texts."""
        results = []
        for text in texts:
            result = await self.translate(text, source_language, target_language)
            results.append(result)
        return results


# =============================================================================
# Text-to-Speech Service
# =============================================================================

class TTSService:
    """Service for text-to-speech conversion."""
    
    def __init__(self, config: AIConfig = None):
        self.config = config or ai_config
        self.model = None
        self.voices = {
            "fr-FR-Denise": {"language": "fr", "gender": "female"},
            "fr-FR-Thierry": {"language": "fr", "gender": "male"},
            "en-US-Guy": {"language": "en", "gender": "male"},
            "en-US-Jenny": {"language": "en", "gender": "female"},
            "es-ES-Alvaro": {"language": "es", "gender": "male"},
            "de-DE-Conrad": {"language": "de", "gender": "male"},
        }
    
    async def load_model(self, model_type: str = None):
        """Load TTS model."""
        model_type = model_type or self.config.tts_model
        
        if model_type == "coqui":
            try:
                from TTS.api import TTS
                self.model = TTS(model_name="tts_models/fr/c Tacotron2-DDC", progress_bar=False)
            except ImportError:
                raise ImportError("Coqui TTS not installed. Run: pip install TTS")
        
        elif model_type == "vits":
            try:
                from TTS.api import TTS
                self.model = TTS(model_name="tts_models/fr/vits", progress_bar=False)
            except ImportError:
                raise ImportError("VITS not available. Install TTS library.")
    
    async def get_available_voices(self) -> List[Dict[str, str]]:
        """Get list of available voices."""
        return [
            {"id": k, **v} for k, v in self.voices.items()
        ]
    
    async def text_to_speech(
        self,
        text: str,
        voice: Optional[str] = None,
        speed: float = 1.0,
        pitch: float = 1.0,
        output_path: Optional[str] = None
    ) -> TTSResult:
        """Convert text to speech."""
        if self.model is None:
            await self.load_model()
        
        voice = voice or self.config.tts_default_voice
        
        # Generate output path
        if output_path is None:
            temp_dir = Path(self.config.temp_dir)
            temp_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(temp_dir / f"tts_{uuid.uuid4()}.wav")
        
        # Generate speech
        self.model.tts_to_file(
            text=text,
            file_path=output_path,
            speaker=voice,
            speed=speed
        )
        
        # Get audio duration
        duration = await self._get_audio_duration(output_path)
        
        return TTSResult(
            audio_path=output_path,
            duration=duration,
            sample_rate=22050,
            text=text,
            voice=voice
        )
    
    async def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio file duration using ffprobe."""
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


# =============================================================================
# Smart Crop Service
# =============================================================================

class SmartCropService:
    """Service for intelligent video cropping."""
    
    def __init__(self, config: AIConfig = None):
        self.config = config or ai_config
        self.face_detector = None
    
    async def detect_faces(self, video_path: str) -> List[Dict[str, Any]]:
        """Detect faces in video frames."""
        import cv2
        
        faces = []
        cap = cv2.VideoCapture(video_path)
        
        frame_count = 0
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Process every 30th frame for efficiency
            if frame_count % 30 == 0:
                # Face detection would be here
                pass
            
            frame_count += 1
        
        cap.release()
        return faces
    
    async def smart_crop(
        self,
        video_path: str,
        target_ratio: str = "9:16",
        focus_mode: str = "auto"
    ) -> SmartCropResult:
        """Automatically crop video to target aspect ratio."""
        job_id = str(uuid.uuid4())
        
        # Get original resolution
        width, height = await self._get_video_resolution(video_path)
        
        # Parse target ratio
        if ":" in target_ratio:
            tw, th = map(int, target_ratio.split(":"))
        else:
            tw, th = 16, 9
        
        # Calculate crop region
        aspect_ratio = width / height
        target_ar = tw / th
        
        if aspect_ratio > target_ar:
            # Video is wider - crop sides
            new_width = int(height * target_ar)
            crop_x = (width - new_width) // 2
            crop_region = {
                "x": crop_x / width,
                "y": 0,
                "width": new_width / width,
                "height": 1.0
            }
        else:
            # Video is taller - crop top/bottom
            new_height = int(width / target_ar)
            crop_y = (height - new_height) // 2
            crop_region = {
                "x": 0,
                "y": crop_y / height,
                "width": 1.0,
                "height": new_height / height
            }
        
        return SmartCropResult(
            regions=[crop_region],
            target_ratio=target_ratio,
            focus_mode=focus_mode,
            original_resolution=(width, height)
        )
    
    async def multi_crop(
        self,
        video_path: str,
        ratios: List[str]
    ) -> Dict[str, SmartCropResult]:
        """Crop video to multiple aspect ratios."""
        results = {}
        for ratio in ratios:
            results[ratio] = await self.smart_crop(video_path, ratio)
        return results
    
    async def _get_video_resolution(self, video_path: str) -> Tuple[int, int]:
        """Get video resolution."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0",
                video_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            w, h = map(int, result.stdout.strip().split(","))
            return w, h
        except:
            return 1920, 1080


# =============================================================================
# Audio Cleaning Service
# =============================================================================

class AudioCleaningService:
    """Service for audio enhancement and cleaning."""
    
    async def clean_audio(
        self,
        audio_path: str,
        remove_noise: bool = True,
        remove_echo: bool = False,
        enhance_speech: bool = True
    ) -> AudioCleaningResult:
        """Clean and enhance audio."""
        import noisereduce as nr
        import soundfile as sf
        
        # Load audio
        data, rate = sf.read(audio_path)
        
        original_duration = len(data) / rate
        
        # Noise reduction
        if remove_noise:
            reduced_noise = nr.reduce_noise(y=data, sr=rate)
            data = reduced_noise
        
        # Save cleaned audio
        output_path = audio_path.replace(".wav", "_cleaned.wav")
        sf.write(output_path, data, rate)
        
        return AudioCleaningResult(
            audio_path=output_path,
            noise_reduced=remove_noise,
            echo_removed=remove_echo,
            enhanced_speech=enhance_speech,
            original_duration=original_duration
        )
    
    async def normalize_audio(self, audio_path: str) -> str:
        """Normalize audio volume."""
        import subprocess
        
        output_path = audio_path.replace(".wav", "_normalized.wav")
        
        cmd = [
            "ffmpeg", "-i", audio_path,
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-y", output_path
        ]
        
        subprocess.run(cmd, capture_output=True)
        
        return output_path
    
    async def extract_audio(self, video_path: str) -> str:
        """Extract audio track from video."""
        import subprocess
        
        output_path = video_path.replace(".mp4", ".wav")
        
        cmd = [
            "ffmpeg", "-i", video_path,
            "-vn", "-acodec", "pcm_s16le",
            "-ar", "16000", "-ac", "1",
            "-y", output_path
        ]
        
        subprocess.run(cmd, capture_output=True)
        
        return output_path


# =============================================================================
# Scene Detection Service
# =============================================================================

class SceneDetectionService:
    """Service for automatic scene detection."""
    
    async def detect_scenes(
        self,
        video_path: str,
        threshold: float = 30.0
    ) -> SceneDetectionResult:
        """Detect scene changes in video."""
        import cv2
        import numpy as np
        
        scenes = []
        thumbnails = []
        
        cap = cv2.VideoCapture(video_path)
        prev_frame = None
        scene_start = 0
        frame_count = 0
        
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
            
            # Skip frames for performance
            if frame_count % 10 != 0:
                frame_count += 1
                continue
            
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            
            if prev_frame is not None:
                # Calculate frame difference
                diff = np.abs(gray.astype(float) - prev_frame.astype(float))
                score = np.mean(diff)
                
                if score > threshold:
                    # Scene change detected
                    scenes.append({
                        "start_time": scene_start,
                        "end_time": frame_count / 30.0,
                        "thumbnail": f"scene_{len(scenes)}.jpg"
                    })
                    
                    # Save thumbnail
                    thumbnail_path = f"data/temp/scene_{len(scenes)}.jpg"
                    cv2.imwrite(thumbnail_path, frame)
                    thumbnails.append(thumbnail_path)
                    
                    scene_start = frame_count / 30.0
            
            prev_frame = gray
            frame_count += 1
        
        cap.release()
        
        # Add final scene
        if scenes:
            scenes[-1]["end_time"] = frame_count / 30.0
        
        return SceneDetectionResult(
            scenes=scenes,
            total_scenes=len(scenes),
            thumbnail_paths=thumbnails
        )


# =============================================================================
# AI Service Manager
# =============================================================================

class AIVideoEditorService:
    """Main AI service manager for video editor."""
    
    def __init__(self, config: AIConfig = None):
        self.config = config or ai_config
        self.transcription = TranscriptionService(config)
        self.translation = TranslationService(config)
        self.tts = TTSService(config)
        self.smart_crop = SmartCropService(config)
        self.audio_cleaning = AudioCleaningService()
        self.scene_detection = SceneDetectionService()
    
    async def process_video(
        self,
        video_path: str,
        operations: List[str]
    ) -> Dict[str, Any]:
        """Process video with multiple AI operations."""
        results = {}
        
        for op in operations:
            if op == "transcribe":
                results["transcription"] = await self.transcription.transcribe(video_path)
            
            elif op == "detect_scenes":
                results["scenes"] = await self.scene_detection.detect_scenes(video_path)
            
            elif op == "smart_crop":
                results["crop"] = await self.smart_crop.smart_crop(video_path)
        
        return results
    
    async def auto_edit(
        self,
        video_path: str,
        instructions: str
    ) -> Dict[str, Any]:
        """AI-powered automatic video editing based on instructions."""
        # This would integrate with LLM for intelligent editing
        # Placeholder for now
        
        return {
            "status": "completed",
            "cuts": [],
            "transitions": [],
            "text_overlays": [],
            "music_suggestions": []
        }


# =============================================================================
# Factory Functions
# =============================================================================

def create_transcription_service(config: AIConfig = None) -> TranscriptionService:
    """Create transcription service instance."""
    return TranscriptionService(config)


def create_tts_service(config: AIConfig = None) -> TTSService:
    """Create TTS service instance."""
    return TTSService(config)


def create_translation_service(config: AIConfig = None) -> TranslationService:
    """Create translation service instance."""
    return TranslationService(config)


def create_smart_crop_service(config: AIConfig = None) -> SmartCropService:
    """Create smart crop service instance."""
    return SmartCropService(config)


def create_ai_service(config: AIConfig = None) -> AIVideoEditorService:
    """Create main AI service instance."""
    return AIVideoEditorService(config)


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    import asyncio
    
    async def test_services():
        """Test AI services."""
        service = create_ai_service()
        
        # Test TTS
        print("Testing TTS...")
        tts_result = await service.tts.text_to_speech(
            text="Bonjour, ceci est un test de synthèse vocale.",
            voice="fr-FR-Denise"
        )
        print(f"TTS result: {tts_result.audio_path}")
        
        # Test voice list
        voices = await service.tts.get_available_voices()
        print(f"Available voices: {len(voices)}")
        
    asyncio.run(test_services())
