from enum import Enum
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Callable
from datetime import datetime
import subprocess
import os
import logging
from backend.gpu_service import GPUService
from backend.cache_service import AICacheService

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
    HELLATION = "halation"
    MAGIC_MASK = "magic_mask" # Background removal/Segmentation
    COLOR_ISOLATION = "color_isolation" # HSL Qualifier style
    VIGNETTE_GRAIN = "vignette_grain" # Cinematic textures

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
    
    def __init__(self, ffmpeg_path: str = "ffmpeg", models_path: str = None, gpu=None, cache=None):
        self.ffmpeg = ffmpeg_path
        self.models_path = models_path or os.path.join(os.path.dirname(__file__), "models")
        self.gpu = gpu or GPUService()
        self.cache = cache or AICacheService()
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
        """Améliore une vidéo avec mise en cache et accélération GPU."""
        # Vérification du cache pour l'ensemble des opérations
        params = {"input": input_path, "enhancements": [str(e) for e in enhancements]}
        cached = self.cache.get_cached_file("enhance_video", params)
        if cached:
            if os.path.exists(cached):
                import shutil
                shutil.copy2(cached, output_path)
                return {"success": True, "output_path": output_path, "cached": True}

        # Initialisation de la tâche
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
                elif enhancement.type == EnhancementType.HELLATION:
                    success = self._apply_halation(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.MAGIC_MASK:
                    success = self._apply_magic_mask(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.COLOR_ISOLATION:
                    success = self._apply_color_isolation(
                        current_input, intermediate_output, enhancement
                    )
                elif enhancement.type == EnhancementType.VIGNETTE_GRAIN:
                    success = self._apply_vignette_grain(
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
        info = self._get_video_info(input_path)
        return info.get("duration", 0.0)

    def _get_video_info(self, input_path: str) -> Dict[str, Any]:
        """Obtenir les informations vidéo (résolution, fps, duration, etc.)"""
        try:
            import json
            # Essayer avec ffprobe si disponible
            ffprobe = self._find_executable("ffprobe")
            if ffprobe:
                cmd = [
                    ffprobe, "-v", "error", "-select_streams", "v:0",
                    "-show_entries", "stream=width,height,avg_frame_rate,duration,codec_name,bit_rate",
                    "-of", "json", input_path
                ]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    data = json.loads(result.stdout)
                    if 'streams' in data and len(data['streams']) > 0:
                        stream = data['streams'][0]
                        
                        # Parser FPS (ex: "30000/1001" -> 29.97)
                        fps_str = stream.get('avg_frame_rate', '0/1')
                        if '/' in fps_str:
                            num, den = fps_str.split('/')
                            fps = float(num) / float(den) if float(den) != 0 else 0
                        else:
                            try:
                                fps = float(fps_str)
                            except:
                                fps = 0
                            
                        return {
                            "width": int(stream.get('width', 0)),
                            "height": int(stream.get('height', 0)),
                            "fps": fps,
                            "duration": float(stream.get('duration', 0) or 0),
                            "codec": stream.get('codec_name', 'unknown'),
                            "bit_rate": int(stream.get('bit_rate', 0) or 0)
                        }
            
            # Fallback simple avec ffmpeg si ffprobe échoue
            cmd = [self.ffmpeg, "-i", input_path, "-f", "null", "-"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            
            import re
            duration_match = re.search(r"Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})", result.stderr)
            res_match = re.search(r", (\d{2,5})x(\d{2,5})", result.stderr)
            
            info = {"width": 0, "height": 0, "fps": 0, "duration": 0, "codec": "unknown"}
            if duration_match:
                hours = int(duration_match.group(1))
                minutes = int(duration_match.group(2))
                seconds = int(duration_match.group(3))
                centiseconds = int(duration_match.group(4))
                info["duration"] = hours * 3600 + minutes * 60 + seconds + centiseconds / 100.0
            
            if res_match:
                info["width"] = int(res_match.group(1))
                info["height"] = int(res_match.group(2))
                
            return info
        except Exception as e:
            logger.error(f"Error getting video info: {e}")
            return {"width": 0, "height": 0, "fps": 0, "duration": 0, "codec": "unknown"}

    def _build_ffmpeg_command(self, input_path: str, output_path: str, filters: List[str] = None) -> List[str]:
        """Construit une commande FFmpeg optimisée (GPU si dispo)."""
        if self.gpu.is_gpu_available():
            cmd = [self.ffmpeg, "-y", "-hwaccel", "cuda", "-i", input_path]
            if filters:
                cmd.extend(["-vf", ",".join(filters)])
            cmd.extend(["-c:v", "h264_nvenc", "-preset", "p4", "-tune", "hq"])
        else:
            cmd = [self.ffmpeg, "-y", "-i", input_path]
            if filters:
                cmd.extend(["-vf", ",".join(filters)])
            cmd.extend(["-c:v", "libx264", "-preset", "fast", "-crf", "18"])
            
        cmd.append(output_path)
        return cmd
    
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
        cmd = self._build_ffmpeg_command(input_path, output_path, filters)
        return self._run_command(cmd)
    
    def _apply_noise_reduction(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer réduction de bruit"""
        strength = int(config.strength * 10)
        
        # Appliquer la réduction de bruit
        filters = [f"nlmeans=s={strength}:p={7}:r={7}"]
        cmd = self._build_ffmpeg_command(input_path, output_path, filters)
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
        filters = ["yadif"]
        cmd = self._build_ffmpeg_command(input_path, output_path, filters)
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

    def _apply_halation(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Appliquer l'effet Hellation (Bloom/Glow cinématographique rouge sur les hautes lumières)"""
        logger.info(f"Appliquer Hellation à {input_path}")
        
        strength = config.strength
        sigma = 5 + (strength * 15)  # Rayon du flou
        threshold = 220 - (strength * 60)  # Seuil de luminosité
        
        # Filtre FFmpeg complexe pour la hellation :
        # 1. Isoler les hautes lumières
        # 2. Flou gaussien
        # 3. Teinter en rouge (augmentation canal rouge, diminution légère vert/bleu)
        # 4. Superposer à l'image d'origine
        filter_str = (
            f"[0:v]split=2[orig][mask];"
            f"[mask]lutyuv='y=if(gt(val,{threshold}),val,0):u=128:v=128',gblur=sigma={sigma},"
            f"colorchannelmixer=rr=2:rg=0:rb=0:gr=0:gg=0.8:gb=0:br=0:bg=0:bb=0.8[glow];"
            f"[orig][glow]blend=all_mode=lighten:all_opacity={strength}[out]"
        )
        
        cmd = [
            self.ffmpeg, "-y",
            "-i", input_path,
            "-filter_complex", filter_str,
            "-map", "[out]",
            "-map", "0:a?", # Garder l'audio si présent
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "23",
            "-c:a", "copy",
            output_path
        ]
        
        return self._run_command(cmd)

    def _apply_magic_mask(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """
        Appliquer Magic Mask (Détourage/Segmentation) réel avec MediaPipe.
        Génère une vidéo avec canal alpha (WebM Transparent).
        """
        logger.info(f"Appliquer Magic Mask (Réel) à {input_path}")
        
        try:
            import cv2
            import numpy as np
            import mediapipe as mp
            import asyncio
            
            cap = cv2.VideoCapture(input_path)
            fps = cap.get(cv2.CAP_PROP_FPS) or 30
            w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            # Utiliser FFmpeg en pipe pour encoder le flux Transparent WebM
            ffmpeg_cmd = [
                self.ffmpeg, "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
                "-s", f"{w}x{h}", "-pix_fmt", "bgra", "-r", str(fps),
                "-i", "-", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p",
                "-lossless", "1", output_path
            ]
            
            process = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
            
            mp_selfie = mp.solutions.selfie_segmentation
            with mp_selfie.SelfieSegmentation(model_selection=1) as segmentation:
                while cap.isOpened():
                    ret, frame = cap.read()
                    if not ret: break
                    
                    # Segmentation
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    results = segmentation.process(rgb)
                    
                    if results.segmentation_mask is not None:
                         # Seuil de segmentation
                         mask = results.segmentation_mask > 0.5
                         # Créer canal Alpha
                         alpha = (mask * 255).astype(np.uint8)
                         # Fusion BGRA
                         bgra = cv2.merge([frame[:,:,0], frame[:,:,1], frame[:,:,2], alpha])
                         process.stdin.write(bgra.tobytes())
                    else:
                         # Fallback if no mask
                         bgra = cv2.merge([frame[:,:,0], frame[:,:,1], frame[:,:,2], np.full((h, w), 255, dtype=np.uint8)])
                         process.stdin.write(bgra.tobytes())
                         
            process.stdin.close()
            process.wait()
            cap.release()
            
            return process.returncode == 0
            
        except ImportError:
            logger.error("MediaPipe or OpenCV not installed for Magic Mask")
            return False
        except Exception as e:
            logger.error(f"Magic Mask precision failed: {e}")
            return False

    def _apply_color_isolation(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """
        Isole une couleur spécifique (par défaut le rouge) et désature le reste.
        Simule un HSL Qualifier de DaVinci.
        """
        logger.info(f"Appliquer Color Isolation à {input_path}")
        strength = config.strength
        
        # Filtre FFmpeg : hsvhold
        # Par défaut on garde le rouge (hue=0)
        filter_str = f"hsvhold=h=0:s=0.5:v=0.5:similarity={0.1 + strength * 0.2}"
        
        # Appliquer Color Isolation
        filters = [filter_str]
        cmd = self._build_ffmpeg_command(input_path, output_path, filters)
        return self._run_command(cmd)

    def _apply_vignette_grain(
        self,
        input_path: str,
        output_path: str,
        config: EnhancementConfig
    ) -> bool:
        """Ajoute un effet de vignette et de grain de pellicule."""
        logger.info(f"Appliquer Vignette & Grain à {input_path}")
        strength = config.strength
        
        # Vignette + Noise (Grain)
        vignette_str = f"vignette=angle={0.1 + strength * 0.4}"
        noise_str = f"noise=alls={strength * 10}:allf=t+u"
        
        # Appliquer Vignette & Grain
        filters = [vignette_str, noise_str]
        cmd = self._build_ffmpeg_command(input_path, output_path, filters)
        return self._run_command(cmd)

    def export_8k(
        self,
        input_path: str,
        output_path: str,
        custom_codec: Optional[str] = None,
        callback: Optional[Callable[[str, float], None]] = None
    ) -> Dict[str, Any]:
        """
        Export 8K (7680x4320) avec upscale progressif et filtre de cohérence temporelle.
        
        Algorithme d'upscale :
        - Si source <= 2K : upscale 2K -> 4K -> 8K.
        - Si source = 4K : upscale 4K -> 8K.
        - Si source = 8K : aucune action (simple copie ou conversion de codec).
        """
        logger.info(f"Démarrage de l'export 8K pour {input_path}")
        
        info = self._get_video_info(input_path)
        src_width = info.get("width", 0)
        src_height = info.get("height", 0)
        
        results = {
            "success": False,
            "status": "Starting 8K Export",
            "metadata": {
                "source_resolution": f"{src_width}x{src_height}",
                "final_resolution": "7680x4320",
                "duration": info.get("duration", 0),
                "fps": info.get("fps", 0)
            },
            "steps": []
        }
        
        if src_width >= 7680:
            logger.info("Source est déjà 8K ou plus. Aucune action d'upscale.")
            import shutil
            shutil.copy2(input_path, output_path)
            results["success"] = True
            results["status"] = "Export 8K terminé (Source déjà 8K)"
            return results

        # Déterminer les étapes progressives
        passes = []
        if src_width <= 2560:  # <= 2K (Approx)
            passes = ["4K", "8K"]
        else:  # Assume 4K (Approx 3840)
            passes = ["8K"]
            
        current_input = input_path
        temp_files = []
        
        try:
            for i, p in enumerate(passes):
                step_name = f"Upscale Pass {p}"
                target_w = 3840 if p == "4K" else 7680
                target_h = 2160 if p == "4K" else 4320
                
                pass_output = output_path.replace(".", f"_pass_{p}.")
                if os.path.exists(pass_output):
                    os.remove(pass_output)
                
                temp_files.append(pass_output)
                
                logger.info(f"Exécution de la passe {p} : {target_w}x{target_h}")
                
                # Filtres : Upscale + Cohérence Temporelle (hqdn3d pour réduction de bruit/flicker)
                # hqdn3d(luma_spatial, chroma_spatial, luma_tmp, chroma_tmp)
                filters = [
                    f"scale={target_w}:{target_h}:flags=lanczos",
                    "hqdn3d=1.5:1.5:6:6" # Filtre de cohérence temporelle entre les passes
                ]
                
                # Encoder avec le codec cible pour la dernière passe ou garder le codec original
                if p == "8K":
                    # Codec final : ProRes 422 ou H.265
                    final_codec = custom_codec or "libx265" # H.265 par défaut
                    if final_codec == "prores":
                        cmd = [
                            self.ffmpeg, "-y", "-i", current_input,
                            "-vf", ",".join(filters),
                            "-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0", "-bits_per_mb", "8000",
                            "-pix_fmt", "yuv422p10le",
                            pass_output
                        ]
                    else:
                        # Utiliser le encodeur matériel si dispo, sinon libx265
                        if self.gpu.is_gpu_available():
                            cmd = [
                                self.ffmpeg, "-y", "-hwaccel", "cuda", "-i", current_input,
                                "-vf", ",".join(filters),
                                "-c:v", "hevc_nvenc", "-preset", "slow", "-tier", "high", "-tag:v", "hvc1",
                                pass_output
                            ]
                        else:
                            cmd = [
                                self.ffmpeg, "-y", "-i", current_input,
                                "-vf", ",".join(filters),
                                "-c:v", "libx265", "-crf", "20", "-preset", "slow", "-tag:v", "hvc1",
                                pass_output
                            ]
                else:
                    # Passe intermédiaire (4K) : On garde une haute qualité
                    cmd = self._build_ffmpeg_command(current_input, pass_output, filters)
                
                success = self._run_command(cmd)
                if not success:
                    raise Exception(f"Échec de l'upscale à la passe {p}")
                
                current_input = pass_output
                results["steps"].append({"pass": p, "success": True})
                
                if callback:
                    callback(f"Upscale {p}", (i + 1) / len(passes) * 100)
            
            # Finalisation
            import shutil
            if os.path.exists(output_path):
                os.remove(output_path)
            shutil.move(current_input, output_path)
            
            # Nettoyage
            for tf in temp_files:
                if os.path.exists(tf):
                    os.remove(tf)
            
            results["success"] = True
            results["status"] = "Export 8K terminé"
            
            # Ajouter le poids estimé
            if os.path.exists(output_path):
                results["metadata"]["estimated_weight_mb"] = os.path.getsize(output_path) / (1024 * 1024)
                
            return results
            
        except Exception as e:
            logger.error(f"Export 8K échoué : {e}")
            results["success"] = False
            results["status"] = f"Erreur Export 8K : {str(e)}"
            return results

_enhancement_service_instance = None

def get_enhancement_service() -> VideoEnhancementService:
    """Récupère l'instance unique du service d'amélioration."""
    global _enhancement_service_instance
    if _enhancement_service_instance is None:
        _enhancement_service_instance = VideoEnhancementService()
    return _enhancement_service_instance
