from enum import Enum
from dataclasses import dataclass
from typing import Dict, List, Optional
import subprocess
import os

class TransitionType(Enum):
    CUT = "cut"
    DISSOLVE = "dissolve"
    CROSSFADE = "crossfade"
    FADE_BLACK = "fade_black"
    FADE_WHITE = "fade_white"
    WIPE_LEFT = "wipe_left"
    WIPE_RIGHT = "wipe_right"
    WIPE_UP = "wipe_up"
    WIPE_DOWN = "wipe_down"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    SLIDE_UP = "slide_up"
    SLIDE_DOWN = "slide_down"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    IRIS = "iris"
    PIXELATE = "pixelate"

@dataclass
class TransitionConfig:
    duration: float = 1.0
    easing: str = "linear"
    direction: str = "center"
    color: str = "black"

class TransitionsService:
    """Service de gestion des transitions FFmpeg"""
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg_path = ffmpeg_path
    
    def build_transition_command(
        self,
        clip_a_path: str,
        clip_b_path: str,
        transition_type: TransitionType,
        output_path: str,
        config: TransitionConfig
    ) -> List[str]:
        """Construire la commande FFmpeg pour une transition"""
        if transition_type == TransitionType.CUT:
            return self._build_concat([clip_a_path, clip_b_path], output_path)
        elif transition_type == TransitionType.DISSOLVE:
            return self._build_dissolve(clip_a_path, clip_b_path, output_path, config.duration)
        elif transition_type == TransitionType.FADE_BLACK:
            return self._build_fade(clip_a_path, clip_b_path, output_path, config.duration, "black")
        elif transition_type == TransitionType.FADE_WHITE:
            return self._build_fade(clip_a_path, clip_b_path, output_path, config.duration, "white")
        elif transition_type == TransitionType.WIPE_LEFT:
            return self._build_wipe(clip_a_path, clip_b_path, output_path, config.duration, "wipeleft")
        elif transition_type == TransitionType.WIPE_RIGHT:
            return self._build_wipe(clip_a_path, clip_b_path, output_path, config.duration, "wiperight")
        elif transition_type == TransitionType.WIPE_UP:
            return self._build_wipe(clip_a_path, clip_b_path, output_path, config.duration, "wipeup")
        elif transition_type == TransitionType.WIPE_DOWN:
            return self._build_wipe(clip_a_path, clip_b_path, output_path, config.duration, "wipedown")
        elif transition_type == TransitionType.SLIDE_LEFT:
            return self._build_slide(clip_a_path, clip_b_path, output_path, config.duration, "slideleft")
        elif transition_type == TransitionType.SLIDE_RIGHT:
            return self._build_slide(clip_a_path, clip_b_path, output_path, config.duration, "slideright")
        elif transition_type == TransitionType.SLIDE_UP:
            return self._build_slide(clip_a_path, clip_b_path, output_path, config.duration, "slideup")
        elif transition_type == TransitionType.SLIDE_DOWN:
            return self._build_slide(clip_a_path, clip_b_path, output_path, config.duration, "slidedown")
        elif transition_type == TransitionType.ZOOM_IN:
            return self._build_zoom(clip_a_path, clip_b_path, output_path, config.duration, "zoomin")
        elif transition_type == TransitionType.ZOOM_OUT:
            return self._build_zoom(clip_a_path, clip_b_path, output_path, config.duration, "zoomout")
        elif transition_type == TransitionType.CROSSFADE:
            return self._build_crossfade(clip_a_path, clip_b_path, output_path, config.duration)
        elif transition_type == TransitionType.IRIS:
            return self._build_iris(clip_a_path, clip_b_path, output_path, config.duration)
        elif transition_type == TransitionType.PIXELATE:
            return self._build_pixelate(clip_a_path, clip_b_path, output_path, config.duration)
        else:
            return self._build_dissolve(clip_a_path, clip_b_path, output_path, config.duration)
    
    def _build_concat(self, clips: List[str], output: str) -> List[str]:
        cmd = [self.ffmpeg_path, "-y"]
        for clip in clips:
            cmd.extend(["-i", clip])
        cmd.extend([
            "-filter_complex", f"concat=n={len(clips)}:v=1:a=1",
            "-c:v", "libx264",
            "-preset", "fast",
            "-c:a", "copy",
            output
        ])
        return cmd
    
    def _build_dissolve(self, clip_a: str, clip_b: str, output: str, duration: float) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition=dissolve:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_crossfade(self, clip_a: str, clip_b: str, output: str, duration: float) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition=fade:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_fade(self, clip_a: str, clip_b: str, output: str, duration: float, color: str) -> List[str]:
        fade_color = "000000" if color == "black" else "ffffff"
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v]fade=t=out:st=0:d={duration}[v0];[1:v]fade=t=in:st=0:d={duration}[v1];[v0][v1]concat=n=2:v=1:a=0[v]",
            "-map", "[v]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "copy",
            output
        ]
    
    def _build_wipe(self, clip_a: str, clip_b: str, output: str, duration: float, transition: str) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_slide(self, clip_a: str, clip_b: str, output: str, duration: float, transition: str) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition={transition}:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_zoom(self, clip_a: str, clip_b: str, output: str, duration: float, transition: str) -> List[str]:
        scale = 2.0 if transition == "zoomin" else 0.5
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", (
                f"[0:v]scale=iw*{scale}:-1,trim=0:{duration},setpts=PTS-STARTPTS[img];"
                f"[img][1:v]xfade=transition={transition}:duration={duration}:offset=0[v];"
                f"[0:a][1:a]acrossfade=d={duration}[a]"
            ),
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_iris(self, clip_a: str, clip_b: str, output: str, duration: float) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition=iris:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def _build_pixelate(self, clip_a: str, clip_b: str, output: str, duration: float) -> List[str]:
        return [
            self.ffmpeg_path, "-y", "-i", clip_a, "-i", clip_b,
            "-filter_complex", f"[0:v][1:v]xfade=transition=pixelize:duration={duration}:offset=0[v];[0:a][1:a]acrossfade=d={duration}[a]",
            "-map", "[v]", "-map", "[a]",
            "-c:v", "libx264", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            output
        ]
    
    def execute_transition(self, clip_a_path: str, clip_b_path: str, transition_type: TransitionType, 
                           output_path: str, config: TransitionConfig = None) -> bool:
        """Exécuter une transition et générer le fichier de sortie"""
        if config is None:
            config = TransitionConfig()
        
        cmd = self.build_transition_command(clip_a_path, clip_b_path, transition_type, output_path, config)
        
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=600
            )
            return result.returncode == 0 and os.path.exists(output_path)
        except Exception:
            return False
    
    def get_transition_duration_range(self, transition_type: TransitionType) -> tuple:
        """Récupérer la plage de durée recommandée pour une transition"""
        ranges = {
            TransitionType.CUT: (0, 0),
            TransitionType.DISSOLVE: (0.5, 3.0),
            TransitionType.CROSSFADE: (0.5, 2.0),
            TransitionType.FADE_BLACK: (0.5, 2.0),
            TransitionType.FADE_WHITE: (0.5, 2.0),
            TransitionType.WIPE_LEFT: (0.3, 1.5),
            TransitionType.WIPE_RIGHT: (0.3, 1.5),
            TransitionType.WIPE_UP: (0.3, 1.5),
            TransitionType.WIPE_DOWN: (0.3, 1.5),
            TransitionType.SLIDE_LEFT: (0.3, 1.5),
            TransitionType.SLIDE_RIGHT: (0.3, 1.5),
            TransitionType.SLIDE_UP: (0.3, 1.5),
            TransitionType.SLIDE_DOWN: (0.3, 1.5),
            TransitionType.ZOOM_IN: (0.5, 2.0),
            TransitionType.ZOOM_OUT: (0.5, 2.0),
            TransitionType.IRIS: (0.3, 1.5),
            TransitionType.PIXELATE: (0.3, 1.5),
        }
        return ranges.get(transition_type, (0.3, 2.0))
    
    def get_available_transitions(self) -> List[Dict]:
        """Récupérer la liste des transitions disponibles avec leurs métadonnées"""
        return [
            {"type": t.value, "name": t.name.replace("_", " ").title(), "min_duration": d[0], "max_duration": d[1]}
            for t, d in {
                TransitionType.CUT: (0, 0),
                TransitionType.DISSOLVE: (0.5, 3.0),
                TransitionType.CROSSFADE: (0.5, 2.0),
                TransitionType.FADE_BLACK: (0.5, 2.0),
                TransitionType.FADE_WHITE: (0.5, 2.0),
                TransitionType.WIPE_LEFT: (0.3, 1.5),
                TransitionType.WIPE_RIGHT: (0.3, 1.5),
                TransitionType.ZOOM_IN: (0.5, 2.0),
                TransitionType.ZOOM_OUT: (0.5, 2.0),
            }.items()
        ]
    
    def validate_transition(self, transition_type: TransitionType, duration: float) -> bool:
        """Valider si une transition est valide avec la durée spécifiée"""
        min_d, max_d = self.get_transition_duration_range(transition_type)
        return min_d <= duration <= max_d
