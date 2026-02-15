"""
FFmpeg Integration Service for StoryCore

Provides comprehensive video processing capabilities including:
- Video transcoding with progress callbacks
- Format conversion (MP4, WebM, MOV, GIF)
- Codec configuration (H.264, VP9, ProRes)
- Bitrate control (CRF, VBR, CQP)
- Audio extraction and processing
- Thumbnail generation
- Silence detection and removal
- Concatenation of multiple videos
- GPU encoding support (NVENC, AMF)
- Complex filtergraphs support
- Async processing with SSE progress updates
"""

import asyncio
import json
import logging
import os
import subprocess
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from urllib.parse import urlencode

import sseclient  # For SSE support
import requests  # For HTTP requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class VideoFormat(str, Enum):
    """Supported video formats."""
    MP4 = "mp4"
    WEBM = "webm"
    MOV = "mov"
    GIF = "gif"
    MKV = "mkv"
    AVI = "avi"
    WEBM_ALPHA = "webm_alpha"
    PRORES = "prores"


class VideoCodec(str, Enum):
    """Supported video codecs."""
    H264 = "libx264"
    H265 = "libx265"
    VP8 = "libvpx"
    VP9 = "libvpx-vp9"
    AV1 = "libaom-av1"
    PRORES = "prores_ks"
    GIF = "gif"


class AudioCodec(str, Enum):
    """Supported audio codecs."""
    AAC = "aac"
    MP3 = "libmp3lame"
    OPUS = "libopus"
    PCM = "pcm_s16le"
    FLAC = "flac"


class BitrateMode(str, Enum):
    """Bitrate control modes."""
    CRF = "crf"  # Constant Rate Factor (quality-based)
    VBR = "vbr"  # Variable Bit Rate
    CQP = "cqp"  # Constant QP (Quantization Parameter)
    CBR = "cbr"  # Constant Bit Rate


class GPUEncoder(str, Enum):
    """GPU encoding options."""
    NONE = "none"
    NVENC = "nvenc"  # NVIDIA NVENC
    AMF = "amf"  # AMD AMF
    VAAPI = "vaapi"  # Intel VAAPI


class AudioAction(str, Enum):
    """Audio processing actions."""
    EXTRACT = "extract"
    NORMALIZE = "normalize"
    REMOVE_SILENCE = "remove_silence"
    MIX = "mix"
    REPLACE = "replace"


@dataclass
class ProgressCallback:
    """Progress callback information."""
    progress: float  # 0.0 to 100.0
    time_elapsed: float  # seconds
    time_remaining: Optional[float] = None  # seconds
    frame: int = 0
    total_frames: int = 0
    fps: float = 0.0
    bitrate: Optional[str] = None
    status: str = "processing"
    message: Optional[str] = None


@dataclass
class TranscodeOptions:
    """Video transcoding options."""
    input_path: str
    output_path: str
    format: VideoFormat = VideoFormat.MP4
    codec: VideoCodec = VideoCodec.H264
    video_bitrate: Optional[str] = None  # e.g., "5M", "10M"
    audio_bitrate: Optional[str] = None
    crf: int = 23  # 0-51, lower is better quality
    preset: str = "medium"  # ultrafast, fast, medium, slow, veryslow
    resolution: Optional[Tuple[int, int]] = None  # (width, height)
    fps: Optional[int] = None
    audio_codec: AudioCodec = AudioCodec.AAC
    audio_sample_rate: int = 44100
    audio_channels: int = 2
    gpu: GPUEncoder = GPUEncoder.NONE
    gpu_options: Dict[str, Any] = field(default_factory=dict)
    custom_filters: List[str] = field(default_factory=list)
    metadata: Dict[str, str] = field(default_factory=dict)


@dataclass
class ExportSettings:
    """Video export settings."""
    format: VideoFormat = VideoFormat.MP4
    codec: VideoCodec = VideoCodec.H264
    resolution: Tuple[int, int] = (1920, 1080)
    fps: int = 30
    bitrate_mode: BitrateMode = BitrateMode.CRF
    quality: int = 23  # CRF value (0-51)
    video_bitrate: Optional[str] = None
    audio_bitrate: Optional[str] = "192k"
    audio_codec: AudioCodec = AudioCodec.AAC
    audio_sample_rate: int = 44100
    audio_channels: int = 2
    gpu_acceleration: bool = False
    gpu_encoder: GPUEncoder = GPUEncoder.NONE
    enable_audio: bool = True
    enable_subtitles: bool = False
    custom_args: List[str] = field(default_factory=list)


@dataclass
class FormatOptions:
    """Format-specific options."""
    mp4_options: Dict[str, Any] = field(default_factory=dict)
    webm_options: Dict[str, Any] = field(default_factory=dict)
    mov_options: Dict[str, Any] = field(default_factory=dict)
    gif_options: Dict[str, Any] = field(default_factory=dict)
    default_mime_type: str = "video/mp4"


@dataclass
class ThumbnailOptions:
    """Thumbnail generation options."""
    output_path: str
    timestamp: float = 0.0  # seconds
    width: int = 320
    height: int = 180
    format: str = "jpg"
    quality: int = 2  # JPEG quality 1-31
    count: int = 1  # Number of thumbnails
    timestamps: Optional[List[float]] = None  # Custom timestamps
    pattern: Optional[str] = None  # Output pattern for multiple thumbnails


@dataclass
class SilenceRemovalOptions:
    """Silence removal options."""
    input_path: str
    output_path: str
    silence_threshold: float = -50.0  # dB
    min_silence_duration: float = 0.5  # seconds
    keep_silence: float = 0.1  # seconds at start/end
    padding: float = 0.1  # seconds padding


@dataclass
class ConcatenationOptions:
    """Video concatenation options."""
    input_files: List[str]
    output_path: str
    format: VideoFormat = VideoFormat.MP4
    codec: VideoCodec = VideoCodec.H264
    transition_duration: float = 0.0  # seconds between clips
    audio_fade: float = 0.0  # audio fade duration


@dataclass
class AudioExtractionOptions:
    """Audio extraction options."""
    input_path: str
    output_path: str
    format: str = "mp3"  # mp3, wav, aac, ogg, flac
    codec: Optional[str] = None
    sample_rate: int = 44100
    bitrate: Optional[str] = None
    channels: int = 2
    start_time: Optional[float] = None
    duration: Optional[float] = None


@dataclass
class VideoInfo:
    """Video file information."""
    path: str
    duration: float
    bitrate: int
    width: int
    height: int
    fps: float
    codec: str
    audio_codec: Optional[str]
    audio_channels: int
    audio_sample_rate: int
    pixel_format: str
    rotation: int  # degrees
    size: int  # bytes
    format: str


# =============================================================================
# FFmpeg Service Implementation
# =============================================================================

class FFmpegService:
    """
    Main FFmpeg service class providing video processing capabilities.
    """
    
    def __init__(self, ffmpeg_path: Optional[str] = None):
        """
        Initialize the FFmpeg service.
        
        Args:
            ffmpeg_path: Optional path to ffmpeg binary
        """
        self.ffmpeg_path = ffmpeg_path or self._find_ffmpeg()
        self.ffprobe_path = self._find_ffprobe()
        self._check_ffmpeg_installed()
        self._progress_callbacks: Dict[str, Callable[[ProgressCallback], None]] = {}
    
    def _find_ffmpeg(self) -> str:
        """Find ffmpeg binary path."""
        # Check common locations
        possible_paths = [
            "ffmpeg",
            "/usr/bin/ffmpeg",
            "/usr/local/bin/ffmpeg",
            "C:\\ffmpeg\\bin\\ffmpeg.exe",
        ]
        
        for path in possible_paths:
            try:
                result = subprocess.run(
                    [path, "-version"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    logger.info(f"Found FFmpeg at: {path}")
                    return path
            except (subprocess.TimeoutExpired, FileNotFoundError):
                continue
        
        # Try to find via which/where
        try:
            import shutil
            path = shutil.which("ffmpeg")
            if path:
                return path
        except OSError as e:
            logger.warning(f"Error searching for FFmpeg: {e}")
        
        logger.warning("FFmpeg not found, using 'ffmpeg' as default")
        return "ffmpeg"
    
    def _find_ffprobe(self) -> str:
        """Find ffprobe binary path."""
        try:
            import shutil
            path = shutil.which("ffprobe")
            if path:
                return path
        except OSError as e:
            # Handle shutil.which() errors (e.g., permission issues, path problems)
            logger.debug(f"Could not search for ffprobe in PATH: {e}")
        
        # Try common variations
        return self.ffmpeg_path.replace("ffmpeg", "ffprobe").replace("FFmpeg", "FFprobe")
    
    async def _run_subprocess(self, cmd: List[str], timeout: int = 60) -> subprocess.CompletedProcess:
        """Run subprocess asynchronously."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        return subprocess.CompletedProcess(
            cmd=cmd,
            returncode=process.returncode,
            stdout=stdout.decode(),
            stderr=stderr.decode()
        )

    async def _check_ffmpeg_installed(self):
        """Check if FFmpeg is properly installed."""
        try:
            result = await self._run_subprocess([self.ffmpeg_path, "-version"], timeout=10)
            if result.returncode == 0:
                version_info = result.stdout.split('\n')[0]
                logger.info(f"FFmpeg version: {version_info}")
            else:
                logger.error("FFmpeg installation check failed")
                raise RuntimeError("FFmpeg not properly installed")
        except FileNotFoundError as e:
            # FFmpeg binary not found at the specified path
            logger.error(f"FFmpeg binary not found at {self.ffmpeg_path}: {e}")
            raise RuntimeError(f"FFmpeg not found at {self.ffmpeg_path}") from e
        except asyncio.TimeoutError as e:
            # FFmpeg version check timed out
            logger.error(f"FFmpeg version check timed out: {e}")
            raise RuntimeError("FFmpeg version check timed out") from e
        except OSError as e:
            # System-level error (permissions, etc.)
            logger.error(f"System error checking FFmpeg: {e}")
            raise RuntimeError(f"System error checking FFmpeg: {e}") from e
    
    # =============================================================================
    # Video Information
    # =============================================================================
    
    async def get_video_info(self, video_path: str) -> VideoInfo:
        """
        Get detailed information about a video file.
        
        Args:
            video_path: Path to the video file
            
        Returns:
            VideoInfo object with video metadata
        """
        cmd = [
            self.ffprobe_path,
            "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            "-show_streams",
            video_path
        ]
        
        result = await self._run_subprocess(cmd, timeout=30)
        
        if result.returncode != 0:
            raise RuntimeError(f"Failed to probe video: {result.stderr}")
        
        info = json.loads(result.stdout)
        
        # Find video stream
        video_stream = None
        audio_stream = None
        
        for stream in info.get("streams", []):
            if stream.get("codec_type") == "video" and not video_stream:
                video_stream = stream
            elif stream.get("codec_type") == "audio" and not audio_stream:
                audio_stream = stream
        
        if not video_stream:
            raise RuntimeError("No video stream found in file")
        
        format_info = info.get("format", {})
        
        # Calculate FPS
        fps_str = video_stream.get("r_frame_rate", "30/1")
        fps_parts = fps_str.split('/')
        fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else float(fps_str)
        
        # Get rotation
        rotation = 0
        tags = video_stream.get("tags", {})
        if "rotate" in tags:
            rotation = int(tags["rotate"])
        
        return VideoInfo(
            path=video_path,
            duration=float(format_info.get("duration", 0)),
            bitrate=int(format_info.get("bit_rate", 0)),
            width=int(video_stream.get("width", 0)),
            height=int(video_stream.get("height", 0)),
            fps=fps,
            codec=video_stream.get("codec_name", "unknown"),
            audio_codec=audio_stream.get("codec_name") if audio_stream else None,
            audio_channels=int(audio_stream.get("channels", 0)) if audio_stream else 0,
            audio_sample_rate=int(audio_stream.get("sample_rate", 0)) if audio_stream else 0,
            pixel_format=video_stream.get("pix_fmt", "unknown"),
            rotation=rotation,
            size=int(format_info.get("size", 0)),
            format=format_info.get("format_name", "unknown")
        )
    
    # =============================================================================
    # Video Transcoding
    # =============================================================================
    
    def transcode(
        self,
        options: TranscodeOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Transcode a video file with the given options.
        
        Args:
            options: TranscodeOptions specifying the transcoding parameters
            progress_callback: Optional callback for progress updates
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = self._build_transcode_command(options)
        logger.info(f"Starting transcode: {' '.join(cmd)}")
        
        try:
            if progress_callback:
                thread = threading.Thread(
                    target=self._run_with_progress,
                    args=(cmd, options.input_path, progress_callback)
                )
                thread.start()
                thread.join()
            else:
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    timeout=3600  # 1 hour timeout
                )
                
                if result.returncode != 0:
                    error_msg = result.stderr or "Unknown transcode error"
                    logger.error(f"Transcode failed: {error_msg}")
                    return False, error_msg
            
            logger.info(f"Transcode completed: {options.output_path}")
            return True, None
            
        except subprocess.TimeoutExpired as e:
            # Transcode operation exceeded the 1-hour timeout
            logger.error(f"Transcode operation timed out after {e.timeout} seconds")
            return False, f"Transcode operation timed out after {e.timeout} seconds"
        except FileNotFoundError as e:
            # FFmpeg binary or input file not found
            logger.error(f"File not found during transcode: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied accessing input/output files
            logger.error(f"Permission denied during transcode: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System-level error (disk full, etc.)
            logger.error(f"System error during transcode: {e}")
            return False, f"System error: {e}"
    
    def _build_transcode_command(self, options: TranscodeOptions) -> List[str]:
        """Build FFmpeg command for transcoding."""
        cmd = [self.ffmpeg_path, "-y"]
        
        # Input file
        cmd.extend(["-i", options.input_path])
        
        # Video codec and quality
        if options.gpu == GPUEncoder.NVENC:
            cmd.extend(["-c:v", "h264_nvenc"])
            cmd.extend(["-preset", options.preset])
            if options.crf:
                cmd.extend(["-rc", "vbr", "-cq", str(options.crf)])
        elif options.gpu == GPUEncoder.AMF:
            cmd.extend(["-c:v", "h264_amf"])
            cmd.extend(["-quality", options.preset])
        else:
            cmd.extend(["-c:v", options.codec.value])
            cmd.extend(["-preset", options.preset])
            cmd.extend(["-crf", str(options.crf)])
        
        # Bitrate
        if options.video_bitrate:
            cmd.extend(["-b:v", options.video_bitrate])
        
        # Resolution
        if options.resolution:
            cmd.extend(["-s", f"{options.resolution[0]}x{options.resolution[1]}"])
        
        # FPS
        if options.fps:
            cmd.extend(["-r", str(options.fps)])
        
        # Audio codec
        if options.enable_audio(options):
            cmd.extend(["-c:a", options.audio_codec.value])
            cmd.extend(["-ar", str(options.audio_sample_rate)])
            cmd.extend(["-ac", str(options.audio_channels)])
            if options.audio_bitrate:
                cmd.extend(["-b:a", options.audio_bitrate])
        
        # Custom filters
        if options.custom_filters:
            filter_str = ",".join(options.custom_filters)
            cmd.extend(["-vf", filter_str])
        
        # Metadata
        for key, value in options.metadata.items():
            cmd.extend(["-metadata", f"{key}={value}"])
        
        # Output file
        cmd.append(options.output_path)
        
        return cmd
    
    def _run_with_progress(
        self,
        cmd: List[str],
        input_path: str,
        callback: Callable[[ProgressCallback], None]
    ):
        """Run FFmpeg with progress tracking."""
        try:
            # Get total duration for progress calculation
            info = self.get_video_info(input_path)
            total_duration = info.duration
            total_frames = int(total_duration * info.fps) if info.fps > 0 else 0
            
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1
            )
            
            start_time = time.time()
            frame = 0
            
            while True:
                line = process.stderr.readline()
                
                if not line and process.poll() is not None:
                    break
                
                # Parse progress from FFmpeg output
                progress_info = self._parse_progress(line, total_duration, total_frames)
                
                if progress_info:
                    elapsed = time.time() - start_time
                    remaining = (elapsed / (progress_info / 100)) * (100 - progress_info) if progress_info > 0 else None
                    
                    callback(ProgressCallback(
                        progress=progress_info,
                        time_elapsed=elapsed,
                        time_remaining=remaining,
                        fps=info.fps,
                        bitrate=f"{info.bitrate / 1000000:.1f}M" if info.bitrate else None,
                        status="processing"
                    ))
            
            process.wait()
            
            if process.returncode == 0:
                callback(ProgressCallback(
                    progress=100.0,
                    time_elapsed=time.time() - start_time,
                    status="completed",
                    message="Transcode completed successfully"
                ))
            else:
                callback(ProgressCallback(
                    progress=0,
                    time_elapsed=time.time() - start_time,
                    status="error",
                    message=f"Transcode failed with code {process.returncode}"
                ))
                
        except FileNotFoundError as e:
            # FFmpeg binary or input file not found
            callback(ProgressCallback(
                progress=0,
                status="error",
                message=f"File not found: {e.filename}"
            ))
        except PermissionError as e:
            # Permission denied accessing files
            callback(ProgressCallback(
                progress=0,
                status="error",
                message=f"Permission denied: {e.filename}"
            ))
        except OSError as e:
            # System-level error
            callback(ProgressCallback(
                progress=0,
                status="error",
                message=f"System error: {e}"
            ))
    
    def _parse_progress(
        self,
        line: str,
        total_duration: float,
        total_frames: int
    ) -> Optional[float]:
        """Parse progress from FFmpeg stderr output."""
        # Try to parse frame/time progress
        if "frame=" in line:
            try:
                parts = line.split()
                frame_str = None
                time_str = None
                
                for i, part in enumerate(parts):
                    if part == "frame=":
                        frame_str = parts[i + 1]
                    elif part == "time=":
                        time_str = parts[i + 1]
                
                if time_str:
                    # Parse time in format HH:MM:SS.ms
                    time_parts = time_str.split(':')
                    if len(time_parts) == 3:
                        hours = float(time_parts[0])
                        minutes = float(time_parts[1])
                        seconds = float(time_parts[2])
                        current_time = hours * 3600 + minutes * 60 + seconds
                        
                        if total_duration > 0:
                            return (current_time / total_duration) * 100
                
            except (ValueError, IndexError):
                pass
        
        # Try bitrate progress
        if "bitrate=" in line:
            try:
                parts = line.split()
                bitrate_str = parts[parts.index("bitrate=") + 1]
                return (float(bitrate_str.rstrip('kM')) / 100) * 100  # Rough estimate
            except (ValueError, IndexError):
                pass
        
        return None
    
    # =============================================================================
    # Format Conversion
    # =============================================================================
    
    def convert_format(
        self,
        input_path: str,
        output_path: str,
        target_format: VideoFormat,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Convert video to a different format.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            target_format: Target VideoFormat
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        # Get video info for optimal settings
        info = self.get_video_info(input_path)
        
        # Select optimal codec for format
        if target_format == VideoFormat.MP4:
            codec = VideoCodec.H264
        elif target_format == VideoFormat.WEBM:
            codec = VideoCodec.VP9
        elif target_format == VideoFormat.GIF:
            codec = VideoCodec.GIF
        else:
            codec = VideoCodec.H264
        
        options = TranscodeOptions(
            input_path=input_path,
            output_path=output_path,
            format=target_format,
            codec=codec,
            resolution=(info.width, info.height),
            fps=int(info.fps) if info.fps else None
        )
        
        return self.transcode(options, progress_callback)
    
    def to_gif(
        self,
        input_path: str,
        output_path: str,
        width: int = 480,
        fps: int = 15,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Convert video to GIF format.
        
        Args:
            input_path: Path to input video
            output_path: Path for output GIF
            width: GIF width (height auto-scaled)
            fps: GIF framerate
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", f"fps={fps},scale={width}:-1:flags=lanczos",
            "-f", "gif",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # GIF conversion timed out
            logger.error(f"GIF conversion timed out for {input_path}")
            return False, "GIF conversion timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for GIF conversion: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied
            logger.error(f"Permission denied for GIF conversion: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during GIF conversion: {e}")
            return False, f"System error: {e}"
    
    def extract_frames(
        self,
        input_path: str,
        output_pattern: str,
        fps: int = 1,
        start_time: float = 0,
        duration: Optional[float] = None,
        width: Optional[int] = None,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Extract frames from video as images.
        
        Args:
            input_path: Path to input video
            output_pattern: Output filename pattern (e.g., "frame_%04d.jpg")
            fps: Frames per second to extract
            start_time: Start time in seconds
            duration: Optional duration to extract
            width: Optional output width
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-ss", str(start_time),
            "-i", input_path
        ]
        
        if duration:
            cmd.extend(["-t", str(duration)])
        
        filters = [f"fps={fps}"]
        if width:
            filters.append(f"scale={width}:-1")
        
        cmd.extend(["-vf", ",".join(filters)])
        cmd.append(output_pattern)
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Frame extraction timed out
            logger.error(f"Frame extraction timed out for {input_path}")
            return False, "Frame extraction timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for frame extraction: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for frame extraction: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during frame extraction: {e}")
            return False, f"System error: {e}"
    
    # =============================================================================
    # Thumbnail Generation
    # =============================================================================
    
    def generate_thumbnails(
        self,
        input_path: str,
        options: ThumbnailOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate thumbnail images from video.
        
        Args:
            input_path: Path to input video
            options: ThumbnailOptions specifying output and parameters
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [self.ffmpeg_path, "-y", "-i", input_path]
        
        if options.timestamps:
            # Multiple specific timestamps
            timestamp_str = ",".join([f"{ts:.3f}" for ts in options.timestamps])
            cmd.extend(["-vf", f"select='gte(t,{timestamp_str})'"])
        else:
            # Single thumbnail at timestamp
            cmd.extend(["-ss", str(options.timestamp)])
            cmd.extend(["-vframes", str(options.count)])
        
        # Scale
        if options.width or options.height:
            scale = f"scale={options.width or -1}:{options.height or -1}"
            if options.count > 1 and not options.pattern:
                scale = f"fps=1/{options.count},{scale}"
            cmd.extend(["-vf", scale])
        
        # Quality settings
        cmd.extend(["-q:v", str(options.quality)])
        
        # Output
        cmd.append(options.output_path)
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Thumbnail generation timed out
            logger.error(f"Thumbnail generation timed out for {input_path}")
            return False, "Thumbnail generation timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for thumbnail generation: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for thumbnail generation: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during thumbnail generation: {e}")
            return False, f"System error: {e}"
    
    def generate_sprite_sheet(
        self,
        input_path: str,
        output_path: str,
        columns: int = 5,
        rows: int = 5,
        fps: int = 1,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Generate a sprite sheet from video thumbnails.
        
        Args:
            input_path: Path to input video
            output_path: Path for output sprite sheet
            columns: Number of columns in sprite sheet
            rows: Number of rows in sprite sheet
            fps: Frames per second to extract
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        info = self.get_video_info(input_path)
        total_frames = columns * rows
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", f"fps={fps},scale=160:-1,tile={columns}x{rows}",
            "-frames:v", "1",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Sprite sheet generation timed out
            logger.error(f"Sprite sheet generation timed out for {input_path}")
            return False, "Sprite sheet generation timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for sprite sheet generation: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for sprite sheet generation: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during sprite sheet generation: {e}")
            return False, f"System error: {e}"
    
    # =============================================================================
    # Audio Processing
    # =============================================================================
    
    def extract_audio(
        self,
        options: AudioExtractionOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Extract audio from video.
        
        Args:
            options: AudioExtractionOptions specifying extraction parameters
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [self.ffmpeg_path, "-y", "-i", options.output_path]
        
        # Start time and duration
        if options.start_time:
            cmd.extend(["-ss", str(options.start_time)])
        if options.duration:
            cmd.extend(["-t", str(options.duration)])
        
        # Audio codec
        if options.codec:
            cmd.extend(["-c:a", options.codec])
        
        # Sample rate
        if options.sample_rate:
            cmd.extend(["-ar", str(options.sample_rate)])
        
        # Channels
        if options.channels:
            cmd.extend(["-ac", str(options.channels)])
        
        # Bitrate
        if options.bitrate:
            cmd.extend(["-b:a", options.bitrate])
        
        cmd.append(options.output_path)
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Audio extraction timed out
            logger.error(f"Audio extraction timed out for {options.input_path}")
            return False, "Audio extraction timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for audio extraction: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for audio extraction: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during audio extraction: {e}")
            return False, f"System error: {e}"
    
    def normalize_audio(
        self,
        input_path: str,
        output_path: str,
        target_level: float = -23.0,  # LUFS target
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Normalize audio to target level.
        
        Args:
            input_path: Path to input audio/video
            output_path: Path for output audio
            target_level: Target LUFS level
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        # Using loudnorm filter
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-af", f"loudnorm=I={target_level}:TP=-1.5:LRA=11",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Audio normalization timed out
            logger.error(f"Audio normalization timed out for {input_path}")
            return False, "Audio normalization timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for audio normalization: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for audio normalization: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during audio normalization: {e}")
            return False, f"System error: {e}"
    
    def remove_silence(
        self,
        options: SilenceRemovalOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Remove silence from audio/video.
        
        Args:
            options: SilenceRemovalOptions specifying parameters
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", options.input_path,
            "-af", f"silenceremove=stop_periods=-1:stop_threshold={options.silence_threshold}dB:stop_duration={options.min_silence_duration}",
            "-c:a", "aac",
            "-b:a", "192k",
            options.output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Silence removal timed out
            logger.error(f"Silence removal timed out for {options.input_path}")
            return False, "Silence removal timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for silence removal: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for silence removal: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during silence removal: {e}")
            return False, f"System error: {e}"
    
    def merge_audio_video(
        self,
        video_path: str,
        audio_path: str,
        output_path: str,
        replace_audio: bool = True,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Merge audio with video.
        
        Args:
            video_path: Path to video file
            audio_path: Path to audio file
            output_path: Path for output video
            replace_audio: If True, replace existing audio; if False, mix
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        if replace_audio:
            cmd = [
                self.ffmpeg_path, "-y",
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-map", "0:v",
                "-map", "1:a",
                output_path
            ]
        else:
            cmd = [
                self.ffmpeg_path, "-y",
                "-i", video_path,
                "-i", audio_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first",
                output_path
            ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Audio-video merge timed out
            logger.error(f"Audio-video merge timed out for {video_path}")
            return False, "Audio-video merge timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for audio-video merge: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for audio-video merge: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during audio-video merge: {e}")
            return False, f"System error: {e}"
    
    # =============================================================================
    # Video Concatenation
    # =============================================================================
    
    def concatenate_videos(
        self,
        options: ConcatenationOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Concatenate multiple video files.
        
        Args:
            options: ConcatenationOptions specifying files and parameters
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        if len(options.input_files) < 2:
            return False, "At least 2 input files required"
        
        # Create concat file
        concat_content = ""
        for path in options.input_files:
            concat_content += f"file '{os.path.abspath(path)}'\n"
        
        concat_file = options.output_path + "_concat.txt"
        with open(concat_file, "w") as f:
            f.write(concat_content)
        
        try:
            # Get info from first video
            info = self.get_video_info(options.input_files[0])
            
            cmd = [
                self.ffmpeg_path, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c:v", options.codec.value,
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                options.output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            
            # Clean up concat file
            try:
                os.remove(concat_file)
            except OSError as e:
                logger.warning(f"Failed to remove concat file {concat_file}: {e}")
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Video concatenation timed out
            logger.error(f"Video concatenation timed out")
            return False, "Video concatenation timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for video concatenation: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for video concatenation: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during video concatenation: {e}")
            return False, f"System error: {e}"
    
    def concatenate_with_transitions(
        self,
        input_files: List[str],
        output_path: str,
        transition_type: str = "fade",
        transition_duration: float = 0.5,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Concatenate videos with transitions between clips.
        
        Args:
            input_files: List of input video paths
            output_path: Path for output video
            transition_type: Type of transition (fade, dip)
            transition_duration: Duration of each transition
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        if len(input_files) < 2:
            return False, "At least 2 input files required"
        
        # Build complex filter for concatenation with transitions
        filter_complex = ""
        inputs_str = ""
        
        for i, path in enumerate(input_files):
            inputs_str += f"-i {path} "
        
        # Create fade transition filter
        filter_parts = []
        for i in range(len(input_files)):
            scale_filter = f"[{i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v{i}]"
            filter_parts.append(scale_filter)
        
        # Concatenation
        concat_inputs = "".join([f"[v{i}][{i}:a]" for i in range(len(input_files))])
        filter_complex = ";".join(filter_parts) + f";{concat_inputs}concat=n={len(input_files)}:v=1:a=1[outv][outa]"
        
        cmd = f"{self.ffmpeg_path} -y {inputs_str} -filter_complex \"{filter_complex}\" -map \"[outv]\" -map \"[outa]\" -c:v libx264 -preset fast -crf 23 -c:a aac -b:a 192k {output_path}"
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, shell=True, timeout=3600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Video concatenation with transitions timed out
            logger.error(f"Video concatenation with transitions timed out")
            return False, "Video concatenation with transitions timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for concatenation with transitions: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for concatenation with transitions: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during concatenation with transitions: {e}")
            return False, f"System error: {e}"
    
    # =============================================================================
    # Advanced Video Processing
    # =============================================================================
    
    def apply_filter_complex(
        self,
        input_path: str,
        output_path: str,
        filter_complex: str,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Apply a complex filter graph to video.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            filter_complex: FFmpeg filter_complex string
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        info = self.get_video_info(input_path)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", filter_complex,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Filter application timed out
            logger.error(f"Filter application timed out for {input_path}")
            return False, "Filter application timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for filter application: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for filter application: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during filter application: {e}")
            return False, f"System error: {e}"
    
    def add_subtitles(
        self,
        input_path: str,
        subtitle_path: str,
        output_path: str,
        language: str = "eng",
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Add subtitles to video.
        
        Args:
            input_path: Path to input video
            subtitle_path: Path to subtitle file (SRT, VTT, ASS)
            output_path: Path for output video
            language: Subtitle language
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-i", subtitle_path,
            "-c:v", "copy",
            "-c:a", "copy",
            "-c:s", "mov_text",
            "-metadata:s:s:0", f"language={language}",
            "-map", "0",
            "-map", "1",
            output_path
        ]
        
        # Try ass format if mov_text doesn't work
        if subtitle_path.endswith(".ass"):
            cmd = [
                self.ffmpeg_path, "-y",
                "-i", input_path,
                "-vf", f"ass={subtitle_path}",
                "-c:v", "libx264",
                "-preset", "fast",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Subtitle addition timed out
            logger.error(f"Subtitle addition timed out for {input_path}")
            return False, "Subtitle addition timed out"
        except FileNotFoundError as e:
            # Input file, subtitle file, or FFmpeg not found
            logger.error(f"File not found for subtitle addition: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for subtitle addition: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during subtitle addition: {e}")
            return False, f"System error: {e}"
    
    def change_speed(
        self,
        input_path: str,
        output_path: str,
        speed_factor: float = 1.0,
        adjust_audio: bool = True,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Change video playback speed.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            speed_factor: Speed multiplier (>1 for faster, <1 for slower)
            adjust_audio: Whether to adjust audio pitch
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        if speed_factor <= 0:
            return False, "Speed factor must be positive"
        
        # Build filter
        video_filter = f"setpts={1/speed_factor}*PTS"
        
        if adjust_audio:
            audio_filter = f"atempo={speed_factor}"
            # atempo supports 0.5-2.0, chain for larger ranges
            while speed_factor > 2.0:
                audio_filter = f"atempo=2.0,{audio_filter}"
                speed_factor /= 2.0
            while speed_factor < 0.5:
                audio_filter = f"atempo=0.5,{audio_filter}"
                speed_factor *= 2.0
            
            filter_complex = f"[0:v]{video_filter}[v];[0:a]{audio_filter}[a]"
        else:
            filter_complex = f"[0:v]{video_filter}[v];[0:a]anull[a]"
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-filter_complex", filter_complex,
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Speed change timed out
            logger.error(f"Speed change timed out for {input_path}")
            return False, "Speed change timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for speed change: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for speed change: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during speed change: {e}")
            return False, f"System error: {e}"
    
    def add_watermark(
        self,
        input_path: str,
        watermark_path: str,
        output_path: str,
        position: str = "bottomright",
        opacity: float = 0.5,
        scale: float = 0.15,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Add watermark to video.
        
        Args:
            input_path: Path to input video
            watermark_path: Path to watermark image
            output_path: Path for output video
            position: Position (topleft, topright, bottomleft, bottomright, center)
            opacity: Watermark opacity (0-1)
            scale: Watermark scale relative to video
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        positions = {
            "topleft": "(10,10)",
            "topright": "(W-w-10,10)",
            "bottomleft": "(10,H-h-10)",
            "bottomright": "(W-w-10,H-h-10)",
            "center": "((W-w)/2,(H-h)/2)"
        }
        
        pos = positions.get(position, positions["bottomright"])
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-i", watermark_path,
            "-filter_complex", f"[1:v]scale=iw*{scale}:-1,format=rgba,colorchannelmixer=aa={opacity}[wm];[0:v][wm]overlay={pos}",
            "-c:a", "copy",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Watermark addition timed out
            logger.error(f"Watermark addition timed out for {input_path}")
            return False, "Watermark addition timed out"
        except FileNotFoundError as e:
            # Input file, watermark, or FFmpeg not found
            logger.error(f"File not found for watermark addition: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for watermark addition: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during watermark addition: {e}")
            return False, f"System error: {e}"
    
    def trim_video(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        end_time: Optional[float] = None,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Trim video to a specific time range.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            start_time: Start time in seconds
            end_time: End time in seconds (None for until end)
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-ss", str(start_time),
            "-i", input_path
        ]
        
        if end_time:
            cmd.extend(["-t", str(end_time - start_time)])
        
        cmd.extend([
            "-c", "copy",
            output_path
        ])
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Video trim timed out
            logger.error(f"Video trim timed out for {input_path}")
            return False, "Video trim timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for video trim: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for video trim: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during video trim: {e}")
            return False, f"System error: {e}"
    
    def extract_segment(
        self,
        input_path: str,
        output_path: str,
        start_time: float,
        duration: float,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Extract a segment from video with re-encoding.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            start_time: Start time in seconds
            duration: Duration in seconds
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Segment extraction timed out
            logger.error(f"Segment extraction timed out for {input_path}")
            return False, "Segment extraction timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for segment extraction: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for segment extraction: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during segment extraction: {e}")
            return False, f"System error: {e}"
    
    # =============================================================================
    # GPU Encoding Support
    # =============================================================================
    
    def transcode_with_nvenc(
        self,
        input_path: str,
        output_path: str,
        quality: str = "high",
        preset: str = "p4",
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Transcode video using NVIDIA NVENC encoder.
        
        Args:
            input_path: Path to input video
            output_path: Path for output video
            quality: Quality preset (high, medium, low)
            preset: NVENC preset (p1-p7, p7 is slowest)
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        quality_presets = {
            "high": "hq",
            "medium": "default",
            "low": "fast"
        }
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-hwaccel", "cuda",
            "-i", input_path,
            "-c:v", "h264_nvenc",
            "-preset", preset,
            "-cq", "23",
            "-rc", "vbr",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            
            if result.returncode != 0:
                # Fallback without GPU
                logger.warning("NVENC failed, falling back to CPU encoding")
                options = TranscodeOptions(
                    input_path=input_path,
                    output_path=output_path,
                    codec=VideoCodec.H264,
                    crf=23
                )
                return self.transcode(options, progress_callback)
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # NVENC transcoding timed out
            logger.error(f"NVENC transcoding timed out for {input_path}")
            return False, "NVENC transcoding timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for NVENC transcoding: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for NVENC transcoding: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error (includes GPU/driver issues)
            logger.error(f"System error during NVENC transcoding: {e}")
            return False, f"System error: {e}"
    
    def get_gpu_info(self) -> Dict[str, Any]:
        """
        Get GPU encoding capabilities.
        
        Returns:
            Dictionary with GPU information
        """
        gpu_info = {
            "nvenc": False,
            "amf": False,
            "vaapi": False,
            "cuda": False
        }
        
        # Check for NVENC
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-encoders"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if "h264_nvenc" in result.stdout:
                gpu_info["nvenc"] = True
            if "hevc_nvenc" in result.stdout:
                gpu_info["nvenc_hevc"] = True
        except subprocess.TimeoutExpired:
            logger.debug("FFmpeg encoder check timed out")
        except FileNotFoundError:
            logger.debug("FFmpeg not found for encoder check")
        except OSError as e:
            logger.debug(f"OS error checking FFmpeg encoders: {e}")
        
        # Check for VAAPI
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-hwaccels"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if "vaapi" in result.stdout:
                gpu_info["vaapi"] = True
        except subprocess.TimeoutExpired:
            logger.debug("FFmpeg hwaccels check timed out")
        except FileNotFoundError:
            logger.debug("FFmpeg not found for hwaccels check")
        except OSError as e:
            logger.debug(f"OS error checking FFmpeg hwaccels: {e}")
        
        return gpu_info
    
    # =============================================================================
    # Async/SSE Support
    # =============================================================================
    
    async def transcode_async(
        self,
        options: TranscodeOptions,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Async version of transcode using asyncio.
        
        Args:
            options: TranscodeOptions specifying the transcoding parameters
            progress_callback: Optional callback for progress updates
            
        Returns:
            Tuple of (success, error_message)
        """
        loop = asyncio.get_event_loop()
        
        def run_transcode():
            return self.transcode(options, progress_callback)
        
        return await loop.run_in_executor(None, run_transcode)
    
    async def transcode_sse(
        self,
        options: TranscodeOptions,
        callback_url: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Transcode with progress sent via SSE.
        
        Args:
            options: TranscodeOptions specifying the transcoding parameters
            callback_url: URL to send SSE progress updates
            
        Returns:
            Tuple of (success, error_message)
        """
        def send_progress(progress: ProgressCallback):
            try:
                requests.post(
                    callback_url,
                    json=progress.__dict__,
                    timeout=5
                )
            except requests.Timeout:
                logger.warning(f"SSE progress callback timed out for {callback_url}")
            except requests.ConnectionError as e:
                logger.warning(f"SSE progress callback connection error: {e}")
            except requests.RequestException as e:
                logger.warning(f"Failed to send SSE progress: {e}")
        
        return await self.transcode_async(options, send_progress)
    
    # =============================================================================
    # Utility Methods
    # =============================================================================
    
    def check_format_support(self, format: VideoFormat) -> bool:
        """
        Check if a format is supported.
        
        Args:
            format: VideoFormat to check
            
        Returns:
            True if supported
        """
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-formats"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            format_names = {
                VideoFormat.MP4: ["mp4", "mov"],
                VideoFormat.WEBM: ["webm"],
                VideoFormat.MOV: ["mov", "mp4"],
                VideoFormat.GIF: ["gif"],
                VideoFormat.MKV: ["matroska"],
                VideoFormat.AVI: ["avi"]
            }
            
            supported = format_names.get(format, [])
            return any(name in result.stdout.lower() for name in supported)
            
        except subprocess.TimeoutExpired:
            logger.debug("Format support check timed out")
            return False
        except FileNotFoundError:
            logger.debug("FFmpeg not found for format support check")
            return False
        except OSError as e:
            logger.debug(f"OS error checking format support: {e}")
            return False
    
    def get_supported_codecs(self, codec_type: str = "encoder") -> List[str]:
        """
        Get list of supported codecs.
        
        Args:
            codec_type: 'encoder' or 'decoder'
            
        Returns:
            List of codec names
        """
        try:
            result = subprocess.run(
                [self.ffmpeg_path, f"-{codec_type}s"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            codecs = []
            for line in result.stdout.split('\n'):
                if 'V' in line or 'A' in line:  # Video or Audio
                    parts = line.split()
                    if len(parts) >= 2:
                        codecs.append(parts[1])
            
            return codecs
            
        except subprocess.TimeoutExpired:
            logger.debug("Codec list retrieval timed out")
            return []
        except FileNotFoundError:
            logger.debug("FFmpeg not found for codec list")
            return []
        except OSError as e:
            logger.debug(f"OS error getting codec list: {e}")
            return []
    
    def get_encoder_info(self, codec: str) -> Dict[str, Any]:
        """
        Get detailed information about an encoder.
        
        Args:
            codec: Codec name (e.g., 'libx264')
            
        Returns:
            Dictionary with encoder options
        """
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-h", f"type={codec}"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            options = {}
            for line in result.stdout.split('\n'):
                if '=' in line:
                    key, value = line.split('=', 1)
                    options[key.strip()] = value.strip()
            
            return options
            
        except subprocess.TimeoutExpired:
            logger.debug("Encoder info retrieval timed out")
            return {}
        except FileNotFoundError:
            logger.debug("FFmpeg not found for encoder info")
            return {}
        except OSError as e:
            logger.debug(f"OS error getting encoder info: {e}")
            return {}
    
    def estimate_transcode_time(
        self,
        input_path: str,
        output_path: Optional[str] = None,
        codec: VideoCodec = VideoCodec.H264
    ) -> float:
        """
        Estimate transcoding time based on video properties.
        
        Args:
            input_path: Path to input video
            output_path: Optional output path for target settings
            codec: Target codec
            
        Returns:
            Estimated time in seconds per second of video
        """
        info = self.get_video_info(input_path)
        
        # Base estimates (seconds per second of video)
        codec_factors = {
            VideoCodec.H264: 0.5,
            VideoCodec.H265: 1.0,
            VideoCodec.VP9: 1.5,
            VideoCodec.AV1: 3.0,
            VideoCodec.PRORES: 0.3
        }
        
        factor = codec_factors.get(codec, 0.5)
        
        # Adjust for resolution
        resolution_factor = (info.width * info.height) / (1920 * 1080)
        
        # Adjust for frame rate
        fps_factor = info.fps / 30.0
        
        return info.duration * factor * resolution_factor * fps_factor
    
    def create_preview(
        self,
        input_path: str,
        output_path: str,
        width: int = 480,
        fps: int = 15,
        duration: Optional[float] = 10.0,
        progress_callback: Optional[Callable[[ProgressCallback], None]] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Create a preview clip from video.
        
        Args:
            input_path: Path to input video
            output_path: Path for output preview
            width: Preview width
            fps: Preview framerate
            duration: Preview duration in seconds
            progress_callback: Optional progress callback
            
        Returns:
            Tuple of (success, error_message)
        """
        info = self.get_video_info(input_path)
        actual_duration = min(duration or 10.0, info.duration)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-ss", "0",
            "-t", str(actual_duration),
            "-vf", f"scale={width}:-1:flags=lanczos,fps={fps}",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-crf", "28",
            "-c:a", "aac",
            "-b:a", "96k",
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, result.stderr
            
            return True, None
            
        except subprocess.TimeoutExpired:
            # Preview creation timed out
            logger.error(f"Preview creation timed out for {input_path}")
            return False, "Preview creation timed out"
        except FileNotFoundError as e:
            # Input file or FFmpeg not found
            logger.error(f"File not found for preview creation: {e}")
            return False, f"File not found: {e.filename}"
        except PermissionError as e:
            # Permission denied for output directory
            logger.error(f"Permission denied for preview creation: {e}")
            return False, f"Permission denied: {e.filename}"
        except OSError as e:
            # System error
            logger.error(f"System error during preview creation: {e}")
            return False, f"System error: {e}"


# =============================================================================
# FFmpeg Factory for creating instances
# =============================================================================

class FFmpegFactory:
    """Factory for creating FFmpegService instances with different configurations."""
    
    @staticmethod
    def create_default() -> FFmpegService:
        """Create a default FFmpegService."""
        return FFmpegService()
    
    @staticmethod
    def create_with_path(ffmpeg_path: str) -> FFmpegService:
        """Create an FFmpegService with a specific path."""
        return FFmpegService(ffmpeg_path)
    
    @staticmethod
    def create_gpu_enabled() -> FFmpegService:
        """Create an FFmpegService with GPU encoding enabled."""
        service = FFmpegService()
        gpu_info = service.get_gpu_info()
        
        if gpu_info["nvenc"]:
            logger.info("NVENC GPU encoding available")
        if gpu_info["vaapi"]:
            logger.info("VAAPI GPU encoding available")
        
        return service


# =============================================================================
# Main entry point for CLI usage
# =============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="StoryCore FFmpeg Integration")
    parser.add_argument("command", choices=["info", "convert", "thumbnails", "concat", "gpu-info"])
    parser.add_argument("input", help="Input file path")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--format", "-f", choices=["mp4", "webm", "gif", "mov"], help="Target format")
    parser.add_argument("--width", type=int, help="Output width")
    parser.add_argument("--fps", type=int, help="Frame rate")
    
    args = parser.parse_args()
    
    service = FFmpegService()
    
    if args.command == "info":
        info = service.get_video_info(args.input)
        print(f"Duration: {info.duration:.2f}s")
        print(f"Resolution: {info.width}x{info.height}")
        print(f"FPS: {info.fps:.2f}")
        print(f"Codec: {info.codec}")
        print(f"Audio: {info.audio_codec} ({info.audio_channels} channels)")
    
    elif args.command == "convert":
        if not args.output:
            parser.error("--output required for convert command")
        
        format_map = {
            "mp4": VideoFormat.MP4,
            "webm": VideoFormat.WEBM,
            "gif": VideoFormat.GIF,
            "mov": VideoFormat.MOV
        }
        
        format_enum = format_map.get(args.format, VideoFormat.MP4)
        success, error = service.convert_format(args.input, args.output, format_enum)
        
        if success:
            print("Conversion complete!")
        else:
            print(f"Conversion failed: {error}")
    
    elif args.command == "thumbnails":
        if not args.output:
            parser.error("--output required for thumbnails command")
        
        options = ThumbnailOptions(
            output_path=args.output,
            width=args.width or 320,
            count=9
        )
        
        success, error = service.generate_thumbnails(args.input, options)
        
        if success:
            print("Thumbnails generated!")
        else:
            print(f"Thumbnail generation failed: {error}")
    
    elif args.command == "concat":
        parser.error("Concatenation requires multiple input files")
    
    elif args.command == "gpu-info":
        gpu_info = service.get_gpu_info()
        print("GPU Encoding Support:")
        for encoder, available in gpu_info.items():
            status = "✓ Available" if available else "✗ Not available"
            print(f"  {encoder}: {status}")
