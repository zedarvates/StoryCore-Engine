from enum import Enum
from dataclasses import dataclass
from typing import List, Optional, Dict
import subprocess
import os

class GPUEncoder(Enum):
    NVIDIA_NVENC = "nvenc"
    AMD_AMF = "amf"
    INTEL_QSV = "qsv"
    APPLE_VT = "vt"

class GPUDecode(Enum):
    NVIDIA_CUVID = "cuvid"
    AMD_CUVID = "cuvid_amf"
    INTEL_QSV = "qsv"

@dataclass
class GPUInfo:
    name: str
    memory: int
    cores: int
    encoding: bool
    decoding: bool
    cuda_compute: Optional[int] = None

@dataclass
class GPUConfig:
    encoder: GPUEncoder = GPUEncoder.NVIDIA_NVENC
    decoder: GPUDecode = GPUDecode.NVIDIA_CUVID
    preset: str = "fast"
    crf: int = 23
    hwaccel: str = "cuda"
    extra_args: List[str] = None

@dataclass
class EncodingStats:
    fps: float
    bitrate: int
    gpu_usage: float
    encoding_time: float

class GPUService:
    """Service de gestion GPU pour encodage/décodage vidéo"""
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg_path = ffmpeg_path
        self._gpu_cache = None
    
    def is_gpu_available(self) -> bool:
        """Vérifier si un GPU NVIDIA est disponible"""
        if self._gpu_cache is not None:
            return self._gpu_cache
        
        try:
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                capture_output=True,
                text=True,
                timeout=5
            )
            self._gpu_cache = len(result.stdout.strip()) > 0
            return self._gpu_cache
        except FileNotFoundError:
            self._gpu_cache = False
            return False
        except Exception:
            self._gpu_cache = False
            return False
    
    def get_gpu_info(self) -> Optional[GPUInfo]:
        """Récupérer les informations du GPU"""
        if not self.is_gpu_available():
            return None
        
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=name,memory.total,compute_cap,temperature.gpu,utilization.gpu",
                    "--format=csv,noheader,nounits"
                ],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                return None
            
            parts = [p.strip() for p in result.stdout.strip().split(',')]
            if len(parts) >= 4:
                name = parts[0].strip()
                memory = int(parts[1].strip()) if parts[1].strip().isdigit() else 0
                compute_cap = parts[2].strip() if len(parts) > 2 else None
                
                return GPUInfo(
                    name=name,
                    memory=memory,
                    cores=0,
                    encoding=True,
                    decoding=True,
                    cuda_compute=float(compute_cap) if compute_cap else None
                )
            
            return GPUInfo(
                name=result.stdout.strip(),
                memory=0,
                cores=0,
                encoding=True,
                decoding=True
            )
        except Exception:
            return None
    
    def get_gpu_usage(self) -> Dict:
        """Récupérer l'utilisation actuelle du GPU"""
        if not self.is_gpu_available():
            return {}
        
        try:
            result = subprocess.run(
                [
                    "nvidia-smi",
                    "--query-gpu=utilization.gpu,memory.used,memory.total,temperature.gpu",
                    "--format=csv,noheader,nounits"
                ],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                parts = [p.strip() for p in result.stdout.strip().split(',')]
                return {
                    "gpu_usage": int(parts[0]) if parts[0].isdigit() else 0,
                    "memory_used": int(parts[1]) if parts[1].isdigit() else 0,
                    "memory_total": int(parts[2]) if parts[2].isdigit() else 0,
                    "temperature": int(parts[3]) if len(parts) > 3 and parts[3].isdigit() else 0
                }
        except Exception:
            pass
        
        return {}
    
    def build_gpu_encode_command(
        self,
        input_path: str,
        output_path: str,
        config: GPUConfig = None
    ) -> List[str]:
        """Construire la commande FFmpeg avec encodage GPU"""
        if config is None:
            config = GPUConfig()
        
        if not self.is_gpu_available():
            return self._build_cpu_fallback(input_path, output_path)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-hwaccel", config.hwaccel,
            "-i", input_path
        ]
        
        if config.encoder == GPUEncoder.NVIDIA_NVENC:
            cmd.extend([
                "-c:v", "h264_nvenc",
                "-preset", config.preset,
                "-crf", str(config.crf),
                "-tune", "hq"
            ])
        elif config.encoder == GPUEncoder.AMD_AMF:
            cmd.extend([
                "-c:v", "h264_amf",
                "-quality", "balanced"
            ])
        elif config.encoder == GPUEncoder.INTEL_QSV:
            cmd.extend([
                "-c:v", "h264_qsv",
                "-preset", config.preset
            ])
        
        if config.extra_args:
            cmd.extend(config.extra_args)
        
        cmd.extend([
            "-c:a", "copy",
            output_path
        ])
        
        return cmd
    
    def build_gpu_decode_command(
        self,
        input_path: str,
        output_path: str,
        decoder: GPUDecode = None
    ) -> List[str]:
        """Construire la commande FFmpeg avec décodage GPU"""
        if decoder is None:
            decoder = GPUDecode.NVIDIA_CUVID
        
        decoder_map = {
            GPUDecode.NVIDIA_CUVID: "cuvid",
            GPUDecode.AMD_CUVID: "cuvid_amf",
            GPUDecode.INTEL_QSV: "qsv"
        }
        
        hwaccel = decoder_map.get(decoder, "cuvid")
        
        return [
            self.ffmpeg_path, "-y",
            "-hwaccel", hwaccel,
            "-c:v", hwaccel,
            "-i", input_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-c:a", "copy",
            output_path
        ]
    
    def build_transcode_with_gpu(
        self,
        input_path: str,
        output_path: str,
        gpu_config: GPUConfig = None
    ) -> List[str]:
        """Construire une commande de transcodage complète avec GPU"""
        if gpu_config is None:
            gpu_config = GPUConfig()
        
        if not self.is_gpu_available():
            return self._build_cpu_fallback(input_path, output_path)
        
        cmd = [
            self.ffmpeg_path, "-y",
            "-hwaccel", gpu_config.hwaccel,
            "-i", input_path
        ]
        
        if gpu_config.encoder == GPUEncoder.NVIDIA_NVENC:
            cmd.extend([
                "-c:v", "h264_nvenc",
                "-preset", gpu_config.preset,
                "-crf", str(gpu_config.crf),
                "-rc", "vbr",
                "-cq", str(gpu_config.crf)
            ])
        elif gpu_config.encoder == GPUEncoder.AMD_AMF:
            cmd.extend([
                "-c:v", "h264_amf",
                "-rc", "cbr",
                "-quality", "balanced"
            ])
        elif gpu_config.encoder == GPUEncoder.INTEL_QSV:
            cmd.extend([
                "-c:v", "h264_qsv",
                "-preset", gpu_config.preset,
                "-rc", "vbr"
            ])
        
        cmd.extend([
            "-c:a", "aac",
            "-b:a", "192k",
            output_path
        ])
        
        return cmd
    
    def _build_cpu_fallback(self, input_path: str, output_path: str) -> List[str]:
        """Construire une commande de fallback CPU"""
        return [
            self.ffmpeg_path, "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "copy",
            output_path
        ]
    
    def get_supported_encoders(self) -> List[str]:
        """Récupérer la liste des encodeurs GPU disponibles"""
        if not self.is_gpu_available():
            return []
        
        try:
            result = subprocess.run(
                [self.ffmpeg_path, "-encoders"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            encoders = []
            for line in result.stdout.split('\n'):
                if 'nvenc' in line.lower() or 'amf' in line.lower() or 'qsv' in line.lower():
                    encoders.append(line.strip())
            
            return encoders
        except Exception:
            return []
    
    def get_optimal_preset(self, gpu_name: str = None) -> str:
        """Récupérer le preset optimal pour le GPU"""
        if not self.is_gpu_available():
            return "medium"
        
        gpu_info = self.get_gpu_info()
        if gpu_info:
            name_lower = gpu_info.name.lower()
            if "rtx 40" in name_lower or "rtx 30" in name_lower:
                return "p4"
            elif "gtx 16" in name_lower:
                return "fast"
            elif "rtx 20" in name_lower:
                return "p4"
        
        return "fast"
    
    def estimate_encoding_speedup(self, input_path: str) -> float:
        """Estimer l'accélération d'encodage avec GPU vs CPU"""
        if not self.is_gpu_available():
            return 1.0
        
        gpu_info = self.get_gpu_info()
        if not gpu_info:
            return 1.0
        
        name_lower = gpu_info.name.lower()
        if "rtx 40" in name_lower:
            return 5.0
        elif "rtx 30" in name_lower:
            return 4.0
        elif "rtx 20" in name_lower:
            return 3.0
        elif "gtx 16" in name_lower or "gtx 10" in name_lower:
            return 2.0
        
        return 1.5
    
    def get_encoding_config_suggestions(self) -> Dict:
        """Récupérer des suggestions de configuration d'encodage"""
        if not self.is_gpu_available():
            return {
                "encoder": "libx264",
                "preset": "medium",
                "hwaccel": None,
                "suggested_crf": 23
            }
        
        gpu_info = self.get_gpu_info()
        suggestions = {
            "encoder": "h264_nvenc",
            "preset": self.get_optimal_preset(),
            "hwaccel": "cuda",
            "suggested_crf": 23
        }
        
        if gpu_info:
            if gpu_info.memory >= 8:
                suggestions["suggested_crf"] = 18
            elif gpu_info.memory >= 4:
                suggestions["suggested_crf"] = 23
            else:
                suggestions["suggested_crf"] = 28
        
        return suggestions
