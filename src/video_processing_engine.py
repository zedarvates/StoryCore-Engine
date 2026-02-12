#!/usr/bin/env python3
"""
Video Processing Engine for StoryCore
Wraps FFmpeg commands for assembly, scaling, and final rendering.
"""

import os
import subprocess
import logging
import json
import tempfile
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class VideoProcessingEngine:
    """
    Handles video manipulation using FFmpeg.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg_path = ffmpeg_path
        self._validate_ffmpeg()

    def _validate_ffmpeg(self):
        """Check if ffmpeg is available."""
        try:
            subprocess.run([self.ffmpeg_path, "-version"], capture_output=True, check=True)
            logger.info("FFmpeg engine initialized successfully.")
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("FFmpeg not found at %s. Render operations will fail.", self.ffmpeg_path)

    def assemble(self, shots_config: List[Dict[str, Any]], output_path: str) -> bool:
        """
        Concatenates multiple video files into one with optional trimming.
        Each shot_config should be: {"path": str, "in_point": float, "out_point": float}
        """
        if not shots_config:
            logger.error("No shots provided for assembly.")
            return False

        logger.info("Assembling %d shots into %s", len(shot_paths), output_path)
        
        # Create a temporary file for the concat demuxer
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            for cfg in shots_config:
                path = cfg.get("path")
                if not path:
                    continue
                    
                in_point = cfg.get("in_point")
                out_point = cfg.get("out_point")
                
                # FFmpeg concat demuxer requires escaped paths
                abs_path = os.path.abspath(path).replace('\\', '/')
                f.write(f"file '{abs_path}'\n")
                if in_point is not None:
                    f.write(f"inpoint {in_point}\n")
                if out_point is not None:
                    f.write(f"outpoint {out_point}\n")
            concat_file = f.name

        try:
            cmd = [
                self.ffmpeg_path, "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", concat_file,
                "-c", "copy", # Try to copy without re-encoding first
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode != 0:
                logger.warning("Concat copy failed, trying with re-encoding...")
                # If copy fails (mismatched codecs/params), re-encode
                cmd = [
                    self.ffmpeg_path, "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", concat_file,
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "medium",
                    "-crf", "23",
                    "-c:a", "aac",
                    output_path
                ]
                subprocess.run(cmd, check=True, capture_output=True)
            
            return True
        except subprocess.CalledProcessError as e:
            logger.error("FFmpeg assembly error: %s", e.stderr)
            return False
        finally:
            if os.path.exists(concat_file):
                os.remove(concat_file)

    def apply_effects(self, input_path: str, output_path: str, effects: Dict[str, Any]) -> bool:
        """
        Applies visual effects like brightness, contrast, etc.
        """
        # Example filters: eq=brightness=0.1:contrast=1.1
        filters = []
        
        brightness = effects.get("brightness", 0) # -1.0 to 1.0
        contrast = effects.get("contrast", 1.0)    # 0.0 to 10.0
        saturation = effects.get("saturation", 1.0) # 0.0 to 3.0
        
        if brightness != 0 or contrast != 1.0 or saturation != 1.0:
            filters.append(f"eq=brightness={brightness}:contrast={contrast}:saturation={saturation}")
            
        if not filters:
            # Just copy if no filters
            import shutil
            shutil.copy2(input_path, output_path)
            return True

        filter_str = ",".join(filters)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", filter_str,
            "-c:a", "copy",
            output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error("FFmpeg effects error: %s", e.stderr)
            return False

    def render(self, input_path: str, output_path: str, width: int = 1920, height: int = 1080) -> bool:
        """
        Final render/transcode. Ensures target resolution and web-friendly format.
        """
        cmd = [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "main",
            "-level", "4.0",
            "-crf", "21",
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ]
        
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            logger.error("FFmpeg render error: %s", e.stderr)
            return False
