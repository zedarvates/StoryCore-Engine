from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime
import subprocess
import os
import logging

logger = logging.getLogger(__name__)

class EnhancementType(Enum):
    SUPER_RESOLUTION = "super_resolution"
    FRAME_INTERPOLATION = "frame_interpolation"
    COLOR_GRADING = "color_grading"
    NOISE_REDUCTION = "noise_reduction"
    STABILIZATION = "stabilization"
    DEINTERLACING = "deinterlacing"
    DEBLURRING = "deblurring"
    FACE_ENHANCEMENT = "face_enhancement"
    BACKGROUND_BLUR = "background_blur"
    STYLE_TRANSFER = "style_transfer"

class UpscaleModel(Enum):
    REAL_ESRGAN_4X = "realesrgan_4x"
    REAL_ESRGAN_2X = "realesrgan_2x"
    RIFE_4X = "rife_4x"
    BSRGAN = "bsrgan"
    SWIN_IR = "swin_ir"

class FrameInterpolationModel(Enum):
    RIFE = "rife"
    CAIN = "cain"
    AMF = "amf"
    DVF = "dvf"

class ColorGradingPreset(Enum):
    NATURAL = "natural"
    CINEMATIC = "cinematic"
    VINTAGE = "vintage"
    BLEACH_BYPASS = "bleach_bypass"
    TEAL_ORANGE = "teal_orange"
    FILM_NOIR = "film_noir"
    WARM = "warm"
    COOL = "cool"
    DESATURATED = "desaturated"
    HDR = "hdr"

@dataclass
class EnhancementConfig:
    type: EnhancementType
    strength: float = 0.5  # 0-1
    model: str = "default"  # pour super-resolution
    fps_target: Optional[int] = None  # pour interpolation
    preset: str = "natural"  # pour color grading

@dataclass
class ProcessingTask:
    id: str
    input_path: str
    output_path: str
    enhancements: List[EnhancementConfig]
    status: str = "pending"
    progress: float = 0.0
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    error: Optional[str] = None
    result_files: List[str] = field(default_factory=list)

class VideoEnhancementService:
    """Service d'amélioration vidéo avec IA"""
    
    def __init__(self, ffmpeg_path: str = "ffmpeg", models_path: str = None):
        self.ffmpeg = ffmpeg_path
        self.models_path = models_path or os.path.join(os.path.dirname(__file__), "models")
        self.tasks: Dict[str, ProcessingTask] = {}
        self._ensure_ffmpeg()
    
    def _ensure_ffmpeg(self):
        """Vérifier que FFmpeg est disponible"""
        try:
            result = subprocess.run(
                [self.ffmpeg, "-version"],
                capture_output=True,
                timeout=10
            )
            if result.returncode != 0:
                logger.warning("FFmpeg not found or not working properly")
        except FileNotFoundError:
            logger.warning("FFmpeg not found in PATH")
        except Exception as e:
            logger.warning(f"FFmpeg check failed: {e}")
    
    def enhance_video(
        self,
        input_path: str,
        output_path: str,
        enhancements: List[EnhancementConfig],
        callback: Callable[[str, float], None] = None
    ) -> Dict[str, Any]:
        """Appliquer des améliorations à une vidéo"""
        task_id = str(datetime.now().timestamp())
        task = ProcessingTask(
            id=task_id,
            input_path=input_path,
            output_path=output_path,
            enhancements=enhancements
        )
        self.tasks[task_id] = task
        
        results = {
            "task_id": task_id,
            "input_path": input_path,
            "output_path": output_path,
            "enhancements_applied": [],
            "processing_time": 0.0,
            "success": False,
            "error": None
        }
        
        try:
            task.start_time = datetime.now()
            task.status = "processing"
            
            # Obtenir la durée de la vidéo
            duration = self._get_video_duration(input_path)
            
            # Applpliquer chaque amélioration séquentiellement
            current_input = input_path
            intermediate_outputs = []
            
            for i, enhancement in enumerate(enhancements):
                intermediate_output = output_path.replace(".", f"_{enhancement.type.value}_inter.")
                results["enhancements_applied"].append({
                    "type": enhancement.type.value,
                    "success": False
                })
                
                success = False
                if enhancement.type == EnhancementType.SUPER_RESOLUTION:
                    success = self._apply_super_resolution(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.FRAME_INTERPOLATION:
                    success = self._apply_frame_interpolation(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.COLOR_GRADING:
                    success = self._apply_color_grading(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.NOISE_REDUCTION:
                    success = self._apply_noise_reduction(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.STABILIZATION:
                    success = self._apply_stabilization(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.DEINTERLACING:
                    success = self._apply_deinterlacing(
                        current_input, intermediate_output
                    )
                elif enhancement.type == EnhancementType.DEBLURRING:
                    success = self._apply_deblurring(
                        current_input, intermediate_output, enhancement
                    )
                
                results["enhancements_applied"][-1]["success"] = success
                
                if success:
                    intermediate_outputs.append(current_input)
                    current_input = intermediate_output
                    
                    if callback:
                        callback(enhancement.type.value, (i + 1) / len(enhancements) * 100)
            
            # Copier le résultat final
            if current_input != input_path and os.path.exists(current_input):
                import shutil
                shutil.copy(current_input, output_path)
                results["success"] = True
            elif not intermediate_outputs:
                # Pas d'amélioration appliquée, copier simplement
                import shutil
                shutil.copy(input_path, output_path)
                results["success"] = True
            
            task.end_time = datetime.now()
            task.progress = 100.0
            task.status = "completed" if results["success"] else "failed"
            
            processing_time = (task.end_time - task.start_time).total_seconds()
            results["processing_time"] = processing_time
            
        except Exception as e:
            task.status = "failed"
            task.error = str(e)
            results["error"] = str(e)
            logger.error(f"Video enhancement failed: {e}")
        
        return results
    
    def _get_video_duration(self, input_path: str) -> float:
        """Obtenir la durée de la vidéo en secondes"""
        try:
            cmd = [
                self.ffmpeg, "-i", input_path,
                "-f", "null", "-"
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            
            # Parser la durée de la sortie
            import re
            duration_match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})", result.stderr)
            if duration_match:
                hours = int(duration_match.group(1))
                mins = int(duration_match.group(2))
                secs = int(duration_match.group(3))
                return hours * 3600 + mins * 60 + secs
            
        except Exception:
            pass
        
        return 0.0
    
    def _apply_super_resolution(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer super-resolution"""
        # Scale factor basé sur le modèle
        scale_map = {
            "realesrgan_4x": 4,
            "realesrgan_2x": 2,
            "rife_4x": 4,
            "bsrgan": 4,
            "swin_ir": 4
        }
        scale = scale_map.get(config.model, 2)
        
        # Si Real-ESRGAN est installé, l'utiliser
        realesrgan_cmd = self._find_executable("realesrgan-ncnn-vulkan")
        if realesrgan_cmd:
            cmd = [
                realesrgan_cmd,
                "-i", input_path,
                "-o", output_path,
                "-n", config.model,
                "-s", str(scale)
            ]
            return self._run_command(cmd)
        
        # Sinon utiliser FFmpeg avec scale
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", f"scale=iw*{scale}:ih*{scale}:flags=lanczos",
            "-c:v", "libx264",
            "-preset", "slow",
            "-crf", "18",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_frame_interpolation(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer interpolation de trames"""
        target_fps = config.fps_target or 60
        
        # Si RIFE est installé
        rife_cmd = self._find_executable("rife-ncnn-vulkan")
        if rife_cmd:
            cmd = [
                rife_cmd,
                "-i", input_path,
                "-o", output_path,
                "--model", config.model or "rife-v4",
                "--multiplier", str(target_fps // 30)
            ]
            return self._run_command(cmd)
        
        # Sinon utiliser FFmpeg avec minterpolate
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", f"minterpolate=fps={target_fps}:mi_mode=mci:mc_mode=aobmc:vsbmc=1",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "20",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_color_grading(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer color grading"""
        strength = config.strength
        preset = config.preset
        
        # Construire les filtres selon le preset
        filters = []
        
        if preset == "cinematic":
            filters.extend([
                f"eq=brightness={0.05 * strength}:contrast={1.1 + 0.2 * strength}",
                f"colorbalance=rs={0.1 * strength}:gs={-0.05 * strength}:bs={-0.1 * strength}",
                "tonecurve=0.2,0.4,0.6,0.8,1.0"
            ])
        elif preset == "vintage":
            filters.extend([
                f"curves=vintage",
                f"saturation={0.8 + 0.2 * strength}"
            ])
        elif preset == "bleach_bypass":
            filters.extend([
                f"eq=contrast={1.5 * strength}:saturation={0.7 - 0.3 * strength}"
            ])
        elif preset == "teal_orange":
            filters.extend([
                f"colorbalance=rs=-{0.15 * strength}:gs=-0.05:bs=0.15 * strength",
                f"colorbalance=rs=0.1 * strength:gs=0.05:bs=-{0.1 * strength}"
            ])
        elif preset == "warm":
            filters.extend([
                f"colorbalance=rs=0.1 * strength:gs=0.05 * strength:bs=-{0.15 * strength}"
            ])
        elif preset == "cool":
            filters.extend([
                f"colorbalance=rs=-{0.15 * strength}:gs=-0.05 * strength:bs=0.1 * strength"
            ])
        elif preset == "desaturated":
            filters.extend([
                f"hue=s=70 - {20 * strength}"
            ])
        elif preset == "hdr":
            filters.extend([
                "hdr=tonemap=hable",
                "zscale=transfer=bt2020-10: primaries=bt2020"
            ])
        else:  # natural
            filters.extend([
                f"eq=brightness={0.1 * strength}:contrast={1 + 0.1 * strength}:saturation={1 + 0.2 * strength}"
            ])
        
        # Appliquer les filtres
        filter_complex = ",".join(filters)
        
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", filter_complex,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "18",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_noise_reduction(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer réduction de bruit"""
        strength = int(config.strength * 10)
        
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", f"nlmeans=s={strength}:p={7}:r={7}",
            "-c:v", "libx264",
            "-preset", "fast",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_stabilization(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer stabilisation"""
        smoothness = 1.0 - config.strength
        
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", f"vidstabtransform=smoothing={int(smoothness * 30)}",
            "-c:v", "libx264",
            "-preset", "fast",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_deinterlacing(
        self,
        input_path: str,
        output_path: str
    ) -> bool:
        """Appliquer désentrelacement"""
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", "bwdif=1:-1:0",
            "-c:v", "libx264",
            "-preset", "fast",
            output_path
        ]
        return self._run_command(cmd)
    
    def _apply_deblurring(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer défloutage"""
        strength = config.strength
        
        # Utiliser sharpen comme approximation
        sharpen = 0.5 + strength
        
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-vf", f"unsharp=5:5:{sharpen}:5:5:{sharpen}",
            "-c:v", "libx264",
            "-preset", "fast",
            output_path
        ]
        return self._run_command(cmd)
    
    def _find_executable(self, name: str) -> Optional[str]:
        """Chercher un exécutable dans PATH"""
        import shutil
        return shutil.which(name)
    
    def _run_command(self, cmd: List[str]) -> bool:
        """Exécuter une commande"""
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                timeout=1800  # 30 minutes max
            )
            success = result.returncode == 0
            
            if not success:
                logger.error(f"Command failed: {' '.join(cmd)}")
                logger.error(f"stderr: {result.stderr.decode('utf-8', errors='ignore')}")
            
            return success
            
        except subprocess.TimeoutExpired:
            logger.error(f"Command timed out: {' '.join(cmd)}")
            return False
        except Exception as e:
            logger.error(f"Command error: {e}")
            return False
    
    def estimate_processing_time(
        self,
        input_path: str,
        enhancements: List[EnhancementConfig]
    ) -> Dict[str, Any]:
        """Estimer le temps de traitement"""
        duration = self._get_video_duration(input_path)
        if duration == 0:
            duration = 30.0  # Valeur par défaut
        
        # Facteurs de temps par amélioration
        base_time_per_second = {
            EnhancementType.SUPER_RESOLUTION: 3.0,
            EnhancementType.FRAME_INTERPOLATION: 4.0,
            EnhancementType.COLOR_GRADING: 0.5,
            EnhancementType.NOISE_REDUCTION: 2.0,
            EnhancementType.STABILIZATION: 1.5,
            EnhancementType.DEINTERLACING: 0.5,
            EnhancementType.DEBLURRING: 2.5
        }
        
        total_time = 0.0
        details = []
        
        for enhancement in enhancements:
            base = base_time_per_second.get(enhancement.type, 1.0)
            multiplier = enhancement.strength if enhancement.strength > 0 else 0.5
            enhancement_time = duration * base * multiplier
            
            details.append({
                "type": enhancement.type.value,
                "base_time_per_second": base,
                "estimated_time": round(enhancement_time, 2)
            })
            total_time += enhancement_time
        
        # Ajouter le temps d'encodage
        encoding_time = duration * 0.5
        total_time += encoding_time
        
        return {
            "video_duration_seconds": duration,
            "total_estimated_seconds": round(total_time, 2),
            "total_estimated_minutes": round(total_time / 60, 2),
            "enhancements": details,
            "cpu_intensive": any(
                e.type in [EnhancementType.SUPER_RESOLUTION, EnhancementType.FRAME_INTERPOLATION]
                for e in enhancements
            ),
            "gpu_recommended": any(
                e.type in [EnhancementType.SUPER_RESOLUTION, EnhancementType.FRAME_INTERPOLATION]
                for e in enhancements
            )
        }
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Obtenir le statut d'une tâche"""
        task = self.tasks.get(task_id)
        if not task:
            return None
        
        return {
            "task_id": task.id,
            "status": task.status,
            "progress": task.progress,
            "start_time": task.start_time.isoformat() if task.start_time else None,
            "end_time": task.end_time.isoformat() if task.end_time else None,
            "error": task.error
        }
    
    def list_supported_enhancements(self) -> Dict[str, Any]:
        """Lister les améliorations supportées"""
        return {
            "super_resolution_models": [
                "realesrgan_4x",
                "realesrgan_2x",
                "rife_4x",
                "bsrgan",
                "swin_ir"
            ],
            "frame_interpolation_models": [
                "rife-v4",
                "rife-v3",
                "cain",
                "amf"
            ],
            "color_grading_presets": [p.value for p in ColorGradingPreset],
            "enhancement_types": [e.value for e in EnhancementType],
            "ffmpeg_required": True,
            "gpu_models_support": ["realesrgan-ncnn-vulkan", "rife-ncnn-vulkan"]
        }
    
    def apply_preset(
        self,
        input_path: str,
        output_path: str,
        preset_name: str
    ) -> bool:
        """Appliquer un preset d'amélioration prédéfini"""
        presets = {
            "cinematic": [
                EnhancementConfig(
                    type=EnhancementType.COLOR_GRADING,
                    strength=0.8,
                    preset="cinematic"
                ),
                EnhancementConfig(
                    type=EnhancementType.SUPER_RESOLUTION,
                    strength=0.5,
                    model="realesrgan_2x"
                )
            ],
            "hdr_upscale": [
                EnhancementConfig(
                    type=EnhancementType.COLOR_GRADING,
                    strength=0.5,
                    preset="hdr"
                ),
                EnhancementConfig(
                    type=EnhancementType.SUPER_RESOLUTION,
                    strength=0.7,
                    model="realesrgan_4x"
                ),
                EnhancementConfig(
                    type=EnhancementType.FRAME_INTERPOLATION,
                    strength=0.5,
                    fps_target=60
                )
            ],
            "smooth_motion": [
                EnhancementConfig(
                    type=EnhancementType.FRAME_INTERPOLATION,
                    strength=0.8,
                    fps_target=60
                )
            ],
            "denoise_pro": [
                EnhancementConfig(
                    type=EnhancementType.NOISE_REDUCTION,
                    strength=0.9
                ),
                EnhancementConfig(
                    type=EnhancementType.COLOR_GRADING,
                    strength=0.3,
                    preset="natural"
                )
            ],
            "vintage_look": [
                EnhancementConfig(
                    type=EnhancementType.COLOR_GRADING,
                    strength=1.0,
                    preset="vintage"
                ),
                EnhancementConfig(
                    type=EnhancementType.NOISE_REDUCTION,
                    strength=0.3
                )
            ]
        }
        
        enhancements = presets.get(preset_name, [])
        if not enhancements:
            logger.warning(f"Unknown preset: {preset_name}")
            return False
        
        result = self.enhance_video(input_path, output_path, enhancements)
        return result.get("success", False)
