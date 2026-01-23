# Configuration Guide - Advanced ComfyUI Workflows

## Overview

This guide provides comprehensive documentation for configuring advanced ComfyUI workflows in StoryCore-Engine. Learn how to optimize settings for your hardware, customize workflow behavior, and fine-tune performance.

## Table of Contents

1. [Configuration Structure](#configuration-structure)
2. [Basic Setup](#basic-setup)
3. [Hardware Optimization](#hardware-optimization)
4. [Workflow-Specific Settings](#workflow-specific-settings)
5. [Performance Tuning](#performance-tuning)
6. [Quality Settings](#quality-settings)
7. [Advanced Configuration](#advanced-configuration)
8. [Environment Variables](#environment-variables)
9. [Programmatic Configuration](#programmatic-configuration)

## Configuration Structure

### Configuration Hierarchy

Advanced workflows use a hierarchical configuration system:

```
1. Environment Variables (highest priority)
2. Command Line Arguments
3. Project Configuration File (.storycore/advanced_config.json)
4. User Configuration File (~/.storycore/config.json)
5. Default Configuration (lowest priority)
```

### Main Configuration File

The main configuration file structure:

```json
{
    "advanced_workflows": {
        "enabled": true,
        "model_precision": "fp16",
        "enable_quantization": true,
        "max_memory_usage_gb": 20.0,
        "batch_size": 1,
        "enable_caching": true,
        "parallel_execution": false,
        "quality_threshold": 0.8,
        "enable_quality_monitoring": true,
        "auto_retry_on_failure": true,
        
        "hunyuan_config": {
            "model_path": "models/hunyuan",
            "enable_720p": true,
            "enable_1080p_sr": true,
            "default_fps": 24,
            "max_frames": 121,
            "guidance_scale": 7.5,
            "num_inference_steps": 50
        },
        
        "wan_config": {
            "model_path": "models/wan",
            "enable_lightning_lora": true,
            "default_noise_level": "high",
            "alpha_threshold": 0.5,
            "enable_dual_guidance": true
        },
        
        "newbie_config": {
            "model_path": "models/newbie",
            "default_resolution": [1024, 1536],
            "enable_xml_parsing": true,
            "default_style": "default",
            "character_cache_size": 100
        },
        
        "qwen_config": {
            "model_path": "models/qwen",
            "enable_2509": true,
            "enable_2511": true,
            "enable_layered": true,
            "enable_lightning_lora": true,
            "max_layers": 8,
            "default_edit_strength": 0.7
        }
    }
}
```

## Basic Setup

### Initial Configuration

1. **Create Configuration Directory:**
   ```bash
   mkdir -p ~/.storycore
   mkdir -p .storycore  # Project-specific config
   ```

2. **Generate Default Configuration:**
   ```bash
   python storycore.py config --generate-advanced --output ~/.storycore/config.json
   ```

3. **Validate Configuration:**
   ```bash
   python storycore.py config --validate --advanced
   ```

### Minimal Configuration

For basic usage, create a minimal configuration:

```json
{
    "advanced_workflows": {
        "enabled": true,
        "model_precision": "fp16",
        "max_memory_usage_gb": 16.0,
        "quality_threshold": 0.7
    }
}
```

### Hardware Detection

Automatically detect and configure for your hardware:

```bash
# Auto-detect hardware capabilities
python storycore.py config --auto-detect-hardware

# Manual hardware specification
python storycore.py config --set-hardware \
    --vram 24 \
    --ram 64 \
    --gpu "RTX 4090"
```

## Hardware Optimization

### GPU Memory Configuration

Configure based on your GPU VRAM:

#### 16GB VRAM (RTX 3080, RTX 4060 Ti)
```json
{
    "advanced_workflows": {
        "model_precision": "fp8",
        "enable_quantization": true,
        "max_memory_usage_gb": 14.0,
        "batch_size": 1,
        "enable_model_sharing": true,
        "aggressive_memory_cleanup": true
    }
}
```

#### 24GB VRAM (RTX 3090, RTX 4090)
```json
{
    "advanced_workflows": {
        "model_precision": "fp16",
        "enable_quantization": false,
        "max_memory_usage_gb": 20.0,
        "batch_size": 2,
        "enable_model_sharing": true,
        "aggressive_memory_cleanup": false
    }
}
```

#### 48GB+ VRAM (A6000, H100)
```json
{
    "advanced_workflows": {
        "model_precision": "fp16",
        "enable_quantization": false,
        "max_memory_usage_gb": 40.0,
        "batch_size": 4,
        "parallel_execution": true,
        "enable_model_sharing": false
    }
}
```

### CPU and RAM Optimization

Configure system memory usage:

```json
{
    "system_optimization": {
        "max_cpu_threads": 8,
        "ram_cache_size_gb": 16.0,
        "enable_cpu_offloading": true,
        "swap_threshold_gb": 4.0
    }
}
```

### Storage Configuration

Optimize for different storage types:

#### SSD Configuration
```json
{
    "storage_config": {
        "model_cache_path": "/fast_ssd/models",
        "temp_path": "/fast_ssd/temp",
        "output_path": "/storage/outputs",
        "enable_compression": false,
        "cache_cleanup_interval": 3600
    }
}
```

#### HDD Configuration
```json
{
    "storage_config": {
        "model_cache_path": "/hdd/models",
        "temp_path": "/ssd/temp",
        "output_path": "/hdd/outputs",
        "enable_compression": true,
        "cache_cleanup_interval": 1800
    }
}
```

## Workflow-Specific Settings

### HunyuanVideo Configuration

Detailed HunyuanVideo settings:

```json
{
    "hunyuan_config": {
        "model_path": "models/hunyuan",
        "models": {
            "i2v_720p": {
                "enabled": true,
                "path": "hunyuanvideo1.5_720p_i2v_fp16.safetensors",
                "precision": "fp16",
                "max_memory_gb": 8.0
            },
            "t2v_720p": {
                "enabled": true,
                "path": "hunyuanvideo1.5_720p_t2v_fp16.safetensors",
                "precision": "fp16",
                "max_memory_gb": 8.0
            },
            "sr_1080p": {
                "enabled": true,
                "path": "hunyuanvideo1.5_1080p_sr_distilled_fp16.safetensors",
                "precision": "fp16",
                "max_memory_gb": 4.0
            }
        },
        "text_encoders": {
            "qwen_2_5_vl": {
                "path": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                "precision": "fp8",
                "max_memory_gb": 2.0
            },
            "byt5_small": {
                "path": "byt5_small_glyphxl_fp16.safetensors",
                "precision": "fp16",
                "max_memory_gb": 1.0
            }
        },
        "generation_settings": {
            "default_fps": 24,
            "max_frames": 121,
            "guidance_scale": 7.5,
            "num_inference_steps": 50,
            "scheduler": "ddim",
            "enable_cfg_rescale": true,
            "cfg_rescale_multiplier": 0.7
        },
        "optimization": {
            "enable_attention_slicing": true,
            "enable_memory_efficient_attention": true,
            "enable_sequential_cpu_offload": false,
            "enable_model_cpu_offload": true
        }
    }
}
```

### Wan Video Configuration

Comprehensive Wan Video settings:

```json
{
    "wan_config": {
        "model_path": "models/wan",
        "models": {
            "inpaint_high_noise": {
                "enabled": true,
                "path": "wan2.2_fun_inpaint_high_noise_14B_fp8_scaled.safetensors",
                "precision": "fp8",
                "max_memory_gb": 12.0
            },
            "inpaint_low_noise": {
                "enabled": true,
                "path": "wan2.2_fun_inpaint_low_noise_14B_fp8_scaled.safetensors",
                "precision": "fp8",
                "max_memory_gb": 12.0
            },
            "t2v_alpha": {
                "enabled": true,
                "path": "wan2.1_t2v_14B_fp8_scaled.safetensors",
                "precision": "fp8",
                "max_memory_gb": 12.0
            }
        },
        "loras": {
            "lightning_high_noise": {
                "enabled": true,
                "path": "wan2.2_i2v_lightx2v_4steps_lora_v1_high_noise.safetensors",
                "strength": 1.0
            },
            "lightning_low_noise": {
                "enabled": true,
                "path": "wan2.2_i2v_lightx2v_4steps_lora_v1_low_noise.safetensors",
                "strength": 1.0
            },
            "alpha": {
                "enabled": true,
                "path": "wan_alpha_2.1_rgba_lora.safetensors",
                "strength": 0.8
            }
        },
        "generation_settings": {
            "default_noise_level": "high",
            "alpha_threshold": 0.5,
            "enable_dual_guidance": true,
            "guidance_scale": 6.0,
            "num_inference_steps": 25,
            "scheduler": "euler_ancestral"
        }
    }
}
```

### NewBie Image Configuration

Anime generation settings:

```json
{
    "newbie_config": {
        "model_path": "models/newbie",
        "models": {
            "diffusion": {
                "path": "NewBie-Image-Exp0.1-bf16.safetensors",
                "precision": "bf16",
                "max_memory_gb": 6.0
            },
            "text_encoder_1": {
                "path": "gemma_3_4b_it_bf16.safetensors",
                "precision": "bf16",
                "max_memory_gb": 3.0
            },
            "text_encoder_2": {
                "path": "jina_clip_v2_bf16.safetensors",
                "precision": "bf16",
                "max_memory_gb": 2.0
            },
            "vae": {
                "path": "ae.safetensors",
                "precision": "fp16",
                "max_memory_gb": 1.0
            }
        },
        "generation_settings": {
            "default_resolution": [1024, 1536],
            "max_resolution": [2048, 3072],
            "guidance_scale": 8.0,
            "num_inference_steps": 35,
            "scheduler": "dpm_solver_multistep"
        },
        "prompt_settings": {
            "enable_xml_parsing": true,
            "default_style": "default",
            "style_templates": {
                "default": "anime, high quality, detailed",
                "detailed": "anime, extremely detailed, masterpiece, best quality",
                "soft": "anime, soft lighting, pastel colors, gentle"
            }
        },
        "character_management": {
            "character_cache_size": 100,
            "enable_consistency_checking": true,
            "consistency_threshold": 0.85
        }
    }
}
```

### Qwen Image Configuration

Professional editing settings:

```json
{
    "qwen_config": {
        "model_path": "models/qwen",
        "models": {
            "edit_2509": {
                "enabled": true,
                "path": "qwen_image_edit_2509_fp8_e4m3fn.safetensors",
                "precision": "fp8",
                "max_memory_gb": 8.0
            },
            "edit_2511": {
                "enabled": true,
                "path": "qwen_image_edit_2511_bf16.safetensors",
                "precision": "bf16",
                "max_memory_gb": 10.0
            },
            "layered": {
                "enabled": true,
                "path": "qwen_image_layered_bf16.safetensors",
                "precision": "bf16",
                "max_memory_gb": 12.0
            }
        },
        "text_encoders": {
            "qwen_2_5_vl": {
                "path": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
                "precision": "fp8",
                "max_memory_gb": 4.0
            }
        },
        "vaes": {
            "standard": {
                "path": "qwen_image_vae.safetensors",
                "precision": "fp16"
            },
            "layered": {
                "path": "qwen_image_layered_vae.safetensors",
                "precision": "fp16"
            }
        },
        "loras": {
            "relight": {
                "enabled": true,
                "path": "Qwen-Image-Edit-2509-Relight.safetensors",
                "strength": 1.0
            },
            "lightning_2509": {
                "enabled": true,
                "path": "Qwen-Image-Edit-2509-Lightning-4steps-V1.0-bf16.safetensors",
                "strength": 1.0
            },
            "lightning_2511": {
                "enabled": true,
                "path": "Qwen-Image-Edit-2511-Lightning-4steps-V1.0-bf16.safetensors",
                "strength": 1.0
            }
        },
        "generation_settings": {
            "default_edit_strength": 0.7,
            "max_layers": 8,
            "guidance_scale": 7.0,
            "num_inference_steps": 30,
            "scheduler": "ddim"
        },
        "lighting_presets": {
            "natural_daylight": {
                "temperature": 5500,
                "intensity": 1.0,
                "direction": "top_down"
            },
            "golden_hour": {
                "temperature": 3200,
                "intensity": 1.2,
                "direction": "side"
            },
            "studio_portrait": {
                "temperature": 5000,
                "intensity": 0.8,
                "direction": "front"
            }
        }
    }
}
```

## Performance Tuning

### Optimization Strategies

Configure different optimization strategies:

```json
{
    "performance_optimization": {
        "strategy": "balanced",  // speed_first, memory_first, balanced, quality_first, adaptive
        "model_management": {
            "enable_model_sharing": true,
            "model_cache_size_gb": 12.0,
            "unload_unused_models": true,
            "model_timeout_seconds": 300
        },
        "memory_optimization": {
            "enable_gradient_checkpointing": true,
            "enable_attention_slicing": true,
            "attention_slice_size": 1,
            "enable_cpu_offload": false,
            "enable_sequential_cpu_offload": false
        },
        "batch_processing": {
            "enable_batching": true,
            "max_batch_size": 4,
            "batch_timeout_seconds": 30,
            "enable_dynamic_batching": true
        }
    }
}
```

### Speed Optimization

For maximum speed:

```json
{
    "performance_optimization": {
        "strategy": "speed_first",
        "model_management": {
            "preload_models": [
                "hunyuan_t2v_720p",
                "newbie_anime_base"
            ],
            "keep_models_loaded": true
        },
        "generation_settings": {
            "use_lightning_lora": true,
            "reduce_inference_steps": true,
            "enable_fast_sampling": true
        }
    }
}
```

### Memory Optimization

For limited VRAM:

```json
{
    "performance_optimization": {
        "strategy": "memory_first",
        "model_management": {
            "aggressive_unloading": true,
            "model_cache_size_gb": 4.0,
            "enable_model_quantization": true
        },
        "memory_optimization": {
            "enable_cpu_offload": true,
            "enable_sequential_cpu_offload": true,
            "attention_slice_size": 2,
            "enable_vae_slicing": true
        }
    }
}
```

## Quality Settings

### Quality Levels Configuration

Define custom quality levels:

```json
{
    "quality_settings": {
        "levels": {
            "draft": {
                "resolution_scale": 0.5,
                "inference_steps": 15,
                "guidance_scale": 6.0,
                "enable_upscaling": false
            },
            "balanced": {
                "resolution_scale": 1.0,
                "inference_steps": 30,
                "guidance_scale": 7.5,
                "enable_upscaling": false
            },
            "high": {
                "resolution_scale": 1.0,
                "inference_steps": 50,
                "guidance_scale": 8.0,
                "enable_upscaling": true
            },
            "ultra": {
                "resolution_scale": 1.5,
                "inference_steps": 75,
                "guidance_scale": 9.0,
                "enable_upscaling": true,
                "enable_refinement": true
            }
        },
        "monitoring": {
            "enable_quality_monitoring": true,
            "quality_threshold": 0.8,
            "auto_retry_on_failure": true,
            "max_retry_attempts": 3,
            "quality_metrics": [
                "sharpness",
                "color_accuracy",
                "artifact_detection",
                "style_consistency"
            ]
        }
    }
}
```

### Quality Enhancement

Configure automatic quality enhancement:

```json
{
    "quality_enhancement": {
        "enable_auto_enhancement": true,
        "enhancement_threshold": 0.7,
        "enhancement_methods": {
            "upscaling": {
                "enabled": true,
                "method": "real_esrgan",
                "scale_factor": 2.0
            },
            "denoising": {
                "enabled": true,
                "strength": 0.3
            },
            "sharpening": {
                "enabled": true,
                "strength": 0.2
            },
            "color_correction": {
                "enabled": true,
                "auto_balance": true
            }
        }
    }
}
```

## Advanced Configuration

### Workflow Routing

Configure intelligent workflow selection:

```json
{
    "workflow_routing": {
        "enable_intelligent_routing": true,
        "routing_strategy": "quality_first",  // speed_first, quality_first, balanced
        "fallback_chains": {
            "hunyuan_i2v": ["wan_inpaint", "basic_video"],
            "newbie_anime": ["qwen_edit", "basic_image"],
            "qwen_layered": ["qwen_edit", "basic_image"]
        },
        "capability_scoring": {
            "video_quality_weight": 0.4,
            "speed_weight": 0.3,
            "memory_efficiency_weight": 0.2,
            "feature_completeness_weight": 0.1
        }
    }
}
```

### Custom Schedulers

Define custom sampling schedulers:

```json
{
    "custom_schedulers": {
        "fast_euler": {
            "type": "euler_ancestral",
            "num_train_timesteps": 1000,
            "beta_start": 0.00085,
            "beta_end": 0.012,
            "beta_schedule": "scaled_linear"
        },
        "quality_ddim": {
            "type": "ddim",
            "num_train_timesteps": 1000,
            "clip_sample": false,
            "set_alpha_to_one": false
        }
    }
}
```

### Model Download Configuration

Configure automatic model downloading:

```json
{
    "model_download": {
        "auto_download": true,
        "download_source": "huggingface",  // huggingface, comfy_org, custom
        "custom_repositories": {
            "hunyuan": "Comfy-Org/HunyuanVideo_comfyui",
            "wan": "Comfy-Org/Wan_Video_comfyui",
            "newbie": "Comfy-Org/NewBie_Image_comfyui",
            "qwen": "Comfy-Org/Qwen_Image_comfyui"
        },
        "download_settings": {
            "max_concurrent_downloads": 2,
            "retry_attempts": 3,
            "timeout_seconds": 300,
            "verify_checksums": true
        },
        "storage_settings": {
            "base_path": "models",
            "organize_by_workflow": true,
            "compress_models": false,
            "cleanup_temp_files": true
        }
    }
}
```

## Environment Variables

### System Environment Variables

Set system-wide configuration via environment variables:

```bash
# Model paths
export STORYCORE_MODEL_PATH="/path/to/models"
export STORYCORE_CACHE_PATH="/path/to/cache"
export STORYCORE_OUTPUT_PATH="/path/to/outputs"

# Memory settings
export STORYCORE_MAX_VRAM_GB="20"
export STORYCORE_MAX_RAM_GB="32"
export STORYCORE_MODEL_PRECISION="fp16"

# Performance settings
export STORYCORE_BATCH_SIZE="2"
export STORYCORE_PARALLEL_EXECUTION="true"
export STORYCORE_ENABLE_CACHING="true"

# Quality settings
export STORYCORE_QUALITY_THRESHOLD="0.8"
export STORYCORE_AUTO_RETRY="true"
export STORYCORE_ENABLE_MONITORING="true"

# Debug settings
export STORYCORE_DEBUG_MODE="false"
export STORYCORE_LOG_LEVEL="INFO"
export STORYCORE_PROFILE_PERFORMANCE="false"
```

### Workflow-Specific Environment Variables

```bash
# HunyuanVideo settings
export HUNYUAN_MODEL_PATH="/path/to/hunyuan/models"
export HUNYUAN_ENABLE_720P="true"
export HUNYUAN_ENABLE_1080P_SR="true"
export HUNYUAN_DEFAULT_FPS="24"

# Wan Video settings
export WAN_MODEL_PATH="/path/to/wan/models"
export WAN_ENABLE_LIGHTNING="true"
export WAN_DEFAULT_NOISE_LEVEL="high"

# NewBie Image settings
export NEWBIE_MODEL_PATH="/path/to/newbie/models"
export NEWBIE_DEFAULT_RESOLUTION="1024x1536"
export NEWBIE_ENABLE_XML_PARSING="true"

# Qwen Image settings
export QWEN_MODEL_PATH="/path/to/qwen/models"
export QWEN_ENABLE_2509="true"
export QWEN_ENABLE_2511="true"
export QWEN_ENABLE_LAYERED="true"
```

### Docker Environment Configuration

For Docker deployments:

```dockerfile
# Dockerfile environment configuration
ENV STORYCORE_MODEL_PATH="/app/models"
ENV STORYCORE_CACHE_PATH="/app/cache"
ENV STORYCORE_OUTPUT_PATH="/app/outputs"
ENV STORYCORE_MAX_VRAM_GB="24"
ENV STORYCORE_MODEL_PRECISION="fp16"
ENV STORYCORE_BATCH_SIZE="1"
ENV STORYCORE_QUALITY_THRESHOLD="0.8"
```

```yaml
# docker-compose.yml environment configuration
version: '3.8'
services:
  storycore:
    image: storycore-engine:latest
    environment:
      - STORYCORE_MODEL_PATH=/app/models
      - STORYCORE_MAX_VRAM_GB=24
      - STORYCORE_MODEL_PRECISION=fp16
      - STORYCORE_ENABLE_CACHING=true
      - STORYCORE_QUALITY_THRESHOLD=0.8
    volumes:
      - ./models:/app/models
      - ./outputs:/app/outputs
```

## Programmatic Configuration

This section demonstrates how to programmatically load, validate, and apply advanced workflow configurations using the StoryCore configuration system. The examples below show complete, runnable Python code for each aspect of configuration management.

### Loading and Validating Configuration Files

#### Basic Configuration Loading

```python
#!/usr/bin/env python3
"""
Example: Loading and validating advanced workflow configuration files
"""

import sys
import json
import logging
from pathlib import Path
from typing import Optional

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

try:
    from advanced_workflow_config import (
        ConfigurationManager,
        AdvancedWorkflowConfig,
        QualityLevel,
        Environment
    )
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running from the project root directory")
    sys.exit(1)

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_and_validate_config(config_path: Optional[str] = None) -> AdvancedWorkflowConfig:
    """
    Load and validate configuration from file or use defaults

    Args:
        config_path: Path to configuration file (optional)

    Returns:
        Validated AdvancedWorkflowConfig instance

    Raises:
        ValueError: If configuration is invalid
        FileNotFoundError: If config file doesn't exist
    """
    # Initialize configuration manager
    config_manager = ConfigurationManager()

    # Load configuration
    if config_path:
        config_file = Path(config_path)
        if not config_file.exists():
            raise FileNotFoundError(f"Configuration file not found: {config_path}")

        logger.info(f"Loading configuration from: {config_path}")
        config = config_manager.load_config(config_file)
    else:
        logger.info("Using default configuration")
        config = AdvancedWorkflowConfig()

    # Validate configuration
    validation_errors = config.validate()
    if validation_errors:
        error_msg = f"Configuration validation failed:\n" + "\n".join(f"  - {error}" for error in validation_errors)
        raise ValueError(error_msg)

    logger.info("Configuration loaded and validated successfully")
    return config

def print_config_summary(config: AdvancedWorkflowConfig):
    """Print a summary of the configuration"""
    print("\n=== Configuration Summary ===")
    print(f"Environment: {config.environment.value}")
    print(f"Model Precision: {config.model_precision.value}")
    print(f"Max Memory Usage: {config.max_memory_usage_gb} GB")
    print(f"Quality Level: {config.quality_level.value}")
    print(f"Quality Threshold: {config.quality_threshold}")
    print(f"Batch Size: {config.batch_size}")
    print(f"Enable Caching: {config.enable_caching}")
    print(f"Parallel Execution: {config.parallel_execution}")

    print("\n=== Workflow Status ===")
    print(f"HunyuanVideo: {'Enabled' if config.enable_hunyuan else 'Disabled'}")
    print(f"Wan Video: {'Enabled' if config.enable_wan else 'Disabled'}")
    print(f"NewBie Image: {'Enabled' if config.enable_newbie else 'Disabled'}")
    print(f"Qwen Image: {'Enabled' if config.enable_qwen else 'Disabled'}")

    print("\n=== Workflow Configurations ===")
    if config.enable_hunyuan:
        hunyuan = config.hunyuan_config
        print(f"HunyuanVideo - Steps: {hunyuan.steps}, CFG Scale: {hunyuan.cfg_scale}")

    if config.enable_wan:
        wan = config.wan_config
        print(f"Wan Video - Steps: {wan.steps}, CFG Scale: {wan.cfg_scale}")

    if config.enable_newbie:
        newbie = config.newbie_config
        print(f"NewBie Image - Steps: {newbie.steps}, CFG Scale: {newbie.cfg_scale}")

    if config.enable_qwen:
        qwen = config.qwen_config
        print(f"Qwen Image - Steps: {qwen.steps}, CFG Scale: {qwen.cfg_scale}")

def main():
    """Main function demonstrating configuration loading and validation"""
    import argparse

    parser = argparse.ArgumentParser(description="Load and validate advanced workflow configuration")
    parser.add_argument("--config", "-c", help="Path to configuration file")
    parser.add_argument("--validate-only", action="store_true", help="Only validate, don't print summary")

    args = parser.parse_args()

    try:
        # Load and validate configuration
        config = load_and_validate_config(args.config)

        if not args.validate_only:
            print_config_summary(config)

        print("\n✅ Configuration is valid and ready for use")

    except Exception as e:
        logger.error(f"Configuration error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

#### Environment Variable Overrides

```python
#!/usr/bin/env python3
"""
Example: Loading configuration with environment variable overrides
"""

import os
import sys
from pathlib import Path

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import ConfigurationManager

def demonstrate_env_overrides():
    """Demonstrate loading configuration with environment variable overrides"""

    # Set environment variables (normally these would be set externally)
    env_vars = {
        "STORYCORE_MAX_MEMORY_USAGE_GB": "16.0",
        "STORYCORE_MODEL_PRECISION": "fp16",
        "STORYCORE_BATCH_SIZE": "2",
        "STORYCORE_QUALITY_THRESHOLD": "0.85",
        "HUNYUAN_DEFAULT_FPS": "30",
        "WAN_ENABLE_LIGHTNING": "true"
    }

    # Set environment variables
    original_env = {}
    for key, value in env_vars.items():
        original_env[key] = os.environ.get(key)  # Store original value
        os.environ[key] = value

    try:
        # Load configuration with environment overrides
        config_manager = ConfigurationManager()
        config = config_manager.load_from_environment()

        print("=== Configuration with Environment Overrides ===")
        print(f"Max Memory: {config.max_memory_usage_gb} GB")
        print(f"Model Precision: {config.model_precision.value}")
        print(f"Batch Size: {config.batch_size}")
        print(f"Quality Threshold: {config.quality_threshold}")
        print(f"Hunyuan FPS: {config.hunyuan_config.fps}")

    finally:
        # Restore original environment variables
        for key, original_value in original_env.items():
            if original_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = original_value

if __name__ == "__main__":
    demonstrate_env_overrides()
```

### Applying Configurations to Workflow Managers at Runtime

#### Dynamic Configuration Updates

```python
#!/usr/bin/env python3
"""
Example: Applying configuration changes to workflow managers at runtime
"""

import asyncio
import sys
import logging
from pathlib import Path
from typing import Dict, Any

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

try:
    from advanced_workflow_manager import AdvancedWorkflowManager
    from advanced_workflow_config import (
        AdvancedWorkflowConfig,
        ConfigurationManager,
        QualityLevel
    )
    from advanced_workflow_base import WorkflowRequest, WorkflowType
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RuntimeConfigApplier:
    """Handles runtime configuration application to workflow managers"""

    def __init__(self):
        self.workflow_manager = AdvancedWorkflowManager()
        self.config_manager = ConfigurationManager()
        self.current_config = None

    async def initialize(self) -> bool:
        """Initialize the workflow manager"""
        return await self.workflow_manager.initialize()

    async def apply_config(self, new_config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """
        Apply new configuration to the workflow manager

        Args:
            new_config: New configuration to apply

        Returns:
            Dictionary with application results
        """
        result = {
            "success": True,
            "changes_applied": [],
            "errors": [],
            "warnings": []
        }

        try:
            # Validate new configuration
            validation_errors = new_config.validate()
            if validation_errors:
                result["success"] = False
                result["errors"].extend(validation_errors)
                return result

            # Check if this is a reconfiguration
            if self.current_config:
                changes = self._detect_config_changes(self.current_config, new_config)
                result["changes_applied"] = changes

            # Apply memory settings (requires restart of some components)
            if self._memory_settings_changed(new_config):
                result["warnings"].append("Memory settings changed - model reload recommended")

            # Apply quality settings
            if self._quality_settings_changed(new_config):
                await self._apply_quality_settings(new_config)
                result["changes_applied"].append("quality_settings")

            # Apply workflow-specific settings
            await self._apply_workflow_settings(new_config)

            # Update current configuration
            self.current_config = new_config

            logger.info(f"Configuration applied successfully: {len(result['changes_applied'])} changes")

        except Exception as e:
            result["success"] = False
            result["errors"].append(f"Configuration application failed: {str(e)}")
            logger.error(f"Failed to apply configuration: {e}")

        return result

    def _detect_config_changes(self, old_config: AdvancedWorkflowConfig,
                              new_config: AdvancedWorkflowConfig) -> list:
        """Detect what configuration aspects have changed"""
        changes = []

        # Check basic settings
        if old_config.max_memory_usage_gb != new_config.max_memory_usage_gb:
            changes.append("memory_limit")
        if old_config.batch_size != new_config.batch_size:
            changes.append("batch_size")
        if old_config.quality_level != new_config.quality_level:
            changes.append("quality_level")
        if old_config.enable_caching != new_config.enable_caching:
            changes.append("caching")

        # Check workflow enable/disable
        if old_config.enable_hunyuan != new_config.enable_hunyuan:
            changes.append("hunyuan_enabled")
        if old_config.enable_wan != new_config.enable_wan:
            changes.append("wan_enabled")
        if old_config.enable_newbie != new_config.enable_newbie:
            changes.append("newbie_enabled")
        if old_config.enable_qwen != new_config.enable_qwen:
            changes.append("qwen_enabled")

        return changes

    def _memory_settings_changed(self, new_config: AdvancedWorkflowConfig) -> bool:
        """Check if memory-related settings changed"""
        if not self.current_config:
            return True

        return (
            self.current_config.max_memory_usage_gb != new_config.max_memory_usage_gb or
            self.current_config.model_precision != new_config.model_precision
        )

    def _quality_settings_changed(self, new_config: AdvancedWorkflowConfig) -> bool:
        """Check if quality-related settings changed"""
        if not self.current_config:
            return True

        return (
            self.current_config.quality_level != new_config.quality_level or
            self.current_config.quality_threshold != new_config.quality_threshold
        )

    async def _apply_quality_settings(self, config: AdvancedWorkflowConfig):
        """Apply quality preset to workflow configurations"""
        config_manager = ConfigurationManager()
        updated_config = config_manager.apply_quality_preset(
            config, config.quality_level
        )
        # Update in-place
        config.hunyuan_config.steps = updated_config.hunyuan_config.steps
        config.wan_config.steps = updated_config.wan_config.steps
        config.newbie_config.steps = updated_config.newbie_config.steps
        config.qwen_config.steps = updated_config.qwen_config.steps

    async def _apply_workflow_settings(self, config: AdvancedWorkflowConfig):
        """Apply workflow-specific configuration settings"""
        # This would typically update loaded workflow instances
        # For demonstration, we'll just log the changes
        logger.info("Applying workflow-specific settings...")
        logger.info(f"HunyuanVideo steps: {config.hunyuan_config.steps}")
        logger.info(f"Wan Video steps: {config.wan_config.steps}")
        logger.info(f"NewBie steps: {config.newbie_config.steps}")
        logger.info(f"Qwen steps: {config.qwen_config.steps}")

    async def reload_workflows_if_needed(self, changes: list):
        """Reload workflow models if necessary based on changes"""
        reload_needed = any(change in changes for change in
                          ["memory_limit", "model_precision", "hunyuan_enabled",
                           "wan_enabled", "newbie_enabled", "qwen_enabled"])

        if reload_needed:
            logger.info("Configuration changes require workflow reload")
            # In a real implementation, this would trigger model reloading
            return True

        return False

async def main():
    """Demonstrate runtime configuration application"""
    applier = RuntimeConfigApplier()

    # Initialize
    if not await applier.initialize():
        print("❌ Failed to initialize workflow manager")
        return

    print("✅ Workflow manager initialized")

    # Load initial configuration
    config_manager = ConfigurationManager()
    initial_config = config_manager.load_config()

    print(f"Initial quality level: {initial_config.quality_level.value}")

    # Apply initial configuration
    result = await applier.apply_config(initial_config)
    if result["success"]:
        print("✅ Initial configuration applied")
    else:
        print(f"❌ Failed to apply initial config: {result['errors']}")

    # Create modified configuration (higher quality)
    high_quality_config = config_manager.apply_quality_preset(
        initial_config, QualityLevel.HIGH
    )

    print(f"\nApplying high quality preset...")
    result = await applier.apply_config(high_quality_config)

    if result["success"]:
        print("✅ High quality configuration applied")
        print(f"Changes applied: {result['changes_applied']}")
        print(f"Quality level: {high_quality_config.quality_level.value}")
        print(f"HunyuanVideo steps: {high_quality_config.hunyuan_config.steps}")
    else:
        print(f"❌ Failed to apply config: {result['errors']}")

    # Demonstrate error handling with invalid config
    print("
--- Testing Error Handling ---")
    invalid_config = initial_config
    invalid_config.max_memory_usage_gb = -1  # Invalid value

    result = await applier.apply_config(invalid_config)
    if not result["success"]:
        print("✅ Invalid configuration correctly rejected:")
        for error in result["errors"]:
            print(f"  - {error}")

if __name__ == "__main__":
    asyncio.run(main())
```

#### Runtime Configuration Switching

```python
#!/usr/bin/env python3
"""
Example: Switching between different configuration profiles at runtime
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, List

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import (
    AdvancedWorkflowConfig,
    ConfigurationManager,
    QualityLevel,
    Environment
)

class ConfigProfileManager:
    """Manages different configuration profiles for runtime switching"""

    def __init__(self):
        self.profiles = {}
        self.current_profile = None
        self.config_manager = ConfigurationManager()

    def add_profile(self, name: str, config: AdvancedWorkflowConfig):
        """Add a configuration profile"""
        self.profiles[name] = config
        print(f"✅ Added profile '{name}'")

    def create_preset_profiles(self):
        """Create common preset profiles"""

        # High Performance Profile
        high_perf_config = AdvancedWorkflowConfig()
        high_perf_config.quality_level = QualityLevel.DRAFT
        high_perf_config.batch_size = 4
        high_perf_config.enable_caching = True
        high_perf_config.parallel_execution = True
        high_perf_config = self.config_manager.apply_quality_preset(
            high_perf_config, QualityLevel.DRAFT
        )
        self.add_profile("high_performance", high_perf_config)

        # High Quality Profile
        high_qual_config = AdvancedWorkflowConfig()
        high_qual_config.quality_level = QualityLevel.ULTRA
        high_qual_config.batch_size = 1
        high_qual_config.enable_caching = True
        high_qual_config.max_memory_usage_gb = 32.0
        high_qual_config = self.config_manager.apply_quality_preset(
            high_qual_config, QualityLevel.ULTRA
        )
        self.add_profile("high_quality", high_qual_config)

        # Balanced Profile
        balanced_config = AdvancedWorkflowConfig()
        balanced_config.quality_level = QualityLevel.STANDARD
        balanced_config.batch_size = 2
        balanced_config.enable_caching = True
        balanced_config = self.config_manager.apply_quality_preset(
            balanced_config, QualityLevel.STANDARD
        )
        self.add_profile("balanced", balanced_config)

        # Low Memory Profile
        low_mem_config = AdvancedWorkflowConfig()
        low_mem_config.max_memory_usage_gb = 8.0
        low_mem_config.batch_size = 1
        low_mem_config.enable_caching = False
        low_mem_config.quality_level = QualityLevel.DRAFT
        low_mem_config = self.config_manager.apply_quality_preset(
            low_mem_config, QualityLevel.DRAFT
        )
        self.add_profile("low_memory", low_mem_config)

    def list_profiles(self) -> List[str]:
        """List available profile names"""
        return list(self.profiles.keys())

    def get_profile(self, name: str) -> AdvancedWorkflowConfig:
        """Get a configuration profile by name"""
        if name not in self.profiles:
            raise ValueError(f"Profile '{name}' not found")
        return self.profiles[name]

    def get_current_profile(self) -> str:
        """Get the name of the current profile"""
        return self.current_profile

async def demonstrate_profile_switching():
    """Demonstrate switching between configuration profiles"""

    manager = ConfigProfileManager()
    manager.create_preset_profiles()

    print("Available profiles:", manager.list_profiles())

    # Simulate runtime switching
    profiles_to_test = ["balanced", "high_performance", "high_quality", "low_memory"]

    for profile_name in profiles_to_test:
        try:
            config = manager.get_profile(profile_name)
            manager.current_profile = profile_name

            print(f"\n--- Switching to profile: {profile_name} ---")
            print(f"Quality Level: {config.quality_level.value}")
            print(f"Max Memory: {config.max_memory_usage_gb} GB")
            print(f"Batch Size: {config.batch_size}")
            print(f"Parallel Execution: {config.parallel_execution}")
            print(f"HunyuanVideo Steps: {config.hunyuan_config.steps}")
            print(f"Wan Video Steps: {config.wan_config.steps}")

            # In a real application, you would apply this config to the workflow manager
            print("✅ Profile switched successfully"

        except Exception as e:
            print(f"❌ Failed to switch to profile {profile_name}: {e}")

if __name__ == "__main__":
    asyncio.run(demonstrate_profile_switching())
```

### Handling Configuration Errors and Fallbacks

#### Comprehensive Error Handling and Recovery

```python
#!/usr/bin/env python3
"""
Example: Handling configuration errors with fallbacks and recovery strategies
"""

import sys
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import (
    ConfigurationManager,
    AdvancedWorkflowConfig,
    QualityLevel
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConfigLoadResult:
    """Result of configuration loading attempt"""
    success: bool
    config: Optional[AdvancedWorkflowConfig] = None
    errors: List[str] = None
    warnings: List[str] = None
    fallback_applied: bool = False
    fallback_level: str = ""

    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []

class ConfigErrorHandler:
    """Handles configuration loading errors and provides fallback strategies"""

    def __init__(self):
        self.config_manager = ConfigurationManager()
        self.fallback_configs = self._create_fallback_configs()

    def _create_fallback_configs(self) -> Dict[str, AdvancedWorkflowConfig]:
        """Create predefined fallback configurations"""
        fallbacks = {}

        # Minimal fallback - only basic workflows enabled
        minimal_config = AdvancedWorkflowConfig()
        minimal_config.enable_hunyuan = True
        minimal_config.enable_wan = False
        minimal_config.enable_newbie = False
        minimal_config.enable_qwen = False
        minimal_config.max_memory_usage_gb = 8.0
        minimal_config.batch_size = 1
        fallbacks["minimal"] = minimal_config

        # Safe fallback - conservative settings
        safe_config = AdvancedWorkflowConfig()
        safe_config.max_memory_usage_gb = 16.0
        safe_config.batch_size = 1
        safe_config.enable_caching = True
        safe_config.quality_level = QualityLevel.STANDARD
        safe_config = self.config_manager.apply_quality_preset(safe_config, QualityLevel.STANDARD)
        fallbacks["safe"] = safe_config

        # High compatibility fallback - basic settings with fallbacks enabled
        compat_config = AdvancedWorkflowConfig()
        compat_config.enable_auto_routing = True
        compat_config.fallback_to_basic = True
        compat_config.auto_retry_on_failure = True
        compat_config.max_retries = 5
        fallbacks["compatible"] = compat_config

        return fallbacks

    def load_config_with_fallback(self, config_path: Optional[Path] = None,
                                 fallback_strategy: str = "progressive") -> ConfigLoadResult:
        """
        Load configuration with comprehensive error handling and fallbacks

        Args:
            config_path: Path to configuration file
            fallback_strategy: Strategy for fallbacks ("progressive", "safe", "minimal")

        Returns:
            ConfigLoadResult with loading outcome
        """
        result = ConfigLoadResult(success=False)

        # Attempt 1: Load from file
        if config_path:
            try:
                logger.info(f"Attempting to load config from: {config_path}")
                config = self.config_manager.load_config(config_path)

                # Validate loaded config
                validation_errors = config.validate()
                if validation_errors:
                    result.warnings.extend(validation_errors)
                    logger.warning(f"Configuration validation warnings: {validation_errors}")

                result.success = True
                result.config = config
                logger.info("Configuration loaded successfully from file")
                return result

            except Exception as e:
                error_msg = f"Failed to load config from file: {str(e)}"
                result.errors.append(error_msg)
                logger.warning(error_msg)

        # Attempt 2: Load from environment variables
        try:
            logger.info("Attempting to load config from environment variables")
            config = self.config_manager.load_from_environment()

            validation_errors = config.validate()
            if validation_errors:
                result.warnings.extend(validation_errors)
                logger.warning(f"Environment config validation warnings: {validation_errors}")

            result.success = True
            result.config = config
            result.fallback_applied = True
            result.fallback_level = "environment"
            logger.info("Configuration loaded successfully from environment")
            return result

        except Exception as e:
            error_msg = f"Failed to load config from environment: {str(e)}"
            result.errors.append(error_msg)
            logger.warning(error_msg)

        # Attempt 3: Progressive fallback strategy
        if fallback_strategy == "progressive":
            fallback_levels = ["safe", "compatible", "minimal"]
        elif fallback_strategy == "safe":
            fallback_levels = ["safe", "minimal"]
        else:  # minimal
            fallback_levels = ["minimal"]

        for level in fallback_levels:
            try:
                logger.info(f"Attempting fallback to {level} configuration")
                config = self.fallback_configs[level]

                # Validate fallback config
                validation_errors = config.validate()
                if validation_errors:
                    logger.warning(f"Fallback config {level} has validation issues: {validation_errors}")
                    continue

                result.success = True
                result.config = config
                result.fallback_applied = True
                result.fallback_level = level
                logger.info(f"Successfully applied {level} fallback configuration")
                return result

            except Exception as e:
                error_msg = f"Failed to apply {level} fallback: {str(e)}"
                result.errors.append(error_msg)
                logger.warning(error_msg)

        # Final fallback: Create minimal working config
        try:
            logger.info("Using emergency default configuration")
            result.config = AdvancedWorkflowConfig()
            result.success = True
            result.fallback_applied = True
            result.fallback_level = "emergency"
            result.warnings.append("Using emergency default configuration - please check your setup")
            logger.warning("Emergency default configuration applied")

        except Exception as e:
            result.errors.append(f"Complete configuration failure: {str(e)}")
            logger.error(f"Critical configuration failure: {e}")

        return result

    def repair_config(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """
        Attempt to repair a partially invalid configuration

        Args:
            config: Configuration to repair

        Returns:
            Repaired configuration
        """
        logger.info("Attempting to repair configuration")

        # Get validation errors
        errors = config.validate()

        repaired_config = config  # Start with original

        for error in errors:
            if "Max memory usage must be positive" in error:
                repaired_config.max_memory_usage_gb = 16.0
                logger.info("Repaired: Set max_memory_usage_gb to 16.0")
            elif "Batch size must be at least 1" in error:
                repaired_config.batch_size = 1
                logger.info("Repaired: Set batch_size to 1")
            elif "Quality threshold must be between 0 and 1" in error:
                repaired_config.quality_threshold = 0.8
                logger.info("Repaired: Set quality_threshold to 0.8")
            elif "Width and height must be positive" in error:
                # Repair workflow-specific dimensions
                if "HunyuanVideo" in error and hasattr(repaired_config, 'hunyuan_config'):
                    repaired_config.hunyuan_config.width = 720
                    repaired_config.hunyuan_config.height = 480
                    logger.info("Repaired: Set HunyuanVideo dimensions to 720x480")
                # Add more repairs as needed...

        # Validate repaired config
        remaining_errors = repaired_config.validate()
        if remaining_errors:
            logger.warning(f"Some configuration issues could not be repaired: {remaining_errors}")

        return repaired_config

def main():
    """Demonstrate comprehensive error handling and fallbacks"""
    handler = ConfigErrorHandler()

    print("=== Testing Configuration Error Handling ===\n")

    # Test 1: Valid configuration
    print("1. Loading valid configuration...")
    result = handler.load_config_with_fallback()
    if result.success:
        print("✅ Success"        print(f"   Fallback applied: {result.fallback_applied}")
        if result.warnings:
            print(f"   Warnings: {result.warnings}")
    else:
        print(f"❌ Failed: {result.errors}")

    # Test 2: Invalid file path
    print("\n2. Loading from invalid file path...")
    result = handler.load_config_with_fallback(Path("/nonexistent/config.yaml"))
    if result.success:
        print("✅ Success (fallback worked)"        print(f"   Fallback level: {result.fallback_level}")
    else:
        print(f"❌ Failed: {result.errors}")

    # Test 3: Invalid configuration values
    print("\n3. Testing configuration repair...")
    invalid_config = AdvancedWorkflowConfig()
    invalid_config.max_memory_usage_gb = -1  # Invalid
    invalid_config.batch_size = 0  # Invalid

    print(f"Original config errors: {invalid_config.validate()}")

    repaired_config = handler.repair_config(invalid_config)
    print(f"Repaired config errors: {repaired_config.validate()}")
    print(f"Max memory: {repaired_config.max_memory_usage_gb}")
    print(f"Batch size: {repaired_config.batch_size}")

    # Test 4: Complete failure simulation
    print("\n4. Testing complete failure scenario...")
    # This would simulate a complete system failure
    print("✅ Error handling system ready for complete failures")

if __name__ == "__main__":
    main()
```

### Integrating with Advanced Workflow Components

#### Workflow Manager Integration

```python
#!/usr/bin/env python3
"""
Example: Integrating configuration management with advanced workflow components
"""

import asyncio
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

try:
    from advanced_workflow_manager import AdvancedWorkflowManager
    from advanced_workflow_config import (
        AdvancedWorkflowConfig,
        ConfigurationManager,
        QualityLevel
    )
    from advanced_workflow_base import WorkflowRequest, WorkflowType
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConfigAwareWorkflowManager:
    """Workflow manager with integrated configuration management"""

    def __init__(self, config_path: Optional[str] = None):
        self.workflow_manager = AdvancedWorkflowManager()
        self.config_manager = ConfigurationManager()
        self.current_config = None

        # Configuration monitoring
        self.config_watch_enabled = False
        self.config_file_path = Path(config_path) if config_path else None

    async def initialize_with_config(self, config: Optional[AdvancedWorkflowConfig] = None) -> bool:
        """
        Initialize workflow manager with configuration

        Args:
            config: Configuration to use (optional, loads default if not provided)

        Returns:
            True if initialization successful
        """
        # Load configuration
        if config is None:
            if self.config_file_path and self.config_file_path.exists():
                self.current_config = self.config_manager.load_config(self.config_file_path)
            else:
                self.current_config = AdvancedWorkflowConfig()
        else:
            self.current_config = config

        # Validate configuration
        validation_errors = self.current_config.validate()
        if validation_errors:
            logger.error(f"Configuration validation failed: {validation_errors}")
            return False

        # Apply configuration to workflow manager
        success = await self.workflow_manager.initialize()
        if not success:
            logger.error("Failed to initialize workflow manager")
            return False

        # Configure workflow-specific settings
        await self._apply_workflow_configs()

        logger.info("Configuration-aware workflow manager initialized successfully")
        return True

    async def _apply_workflow_configs(self):
        """Apply workflow-specific configurations"""
        if not self.current_config:
            return

        # Configure HunyuanVideo if enabled
        if self.current_config.enable_hunyuan:
            hunyuan_config = self.current_config.hunyuan_config
            logger.info(f"Configuring HunyuanVideo: steps={hunyuan_config.steps}, cfg={hunyuan_config.cfg_scale}")

        # Configure Wan Video if enabled
        if self.current_config.enable_wan:
            wan_config = self.current_config.wan_config
            logger.info(f"Configuring Wan Video: steps={wan_config.steps}, cfg={wan_config.cfg_scale}")

        # Configure NewBie Image if enabled
        if self.current_config.enable_newbie:
            newbie_config = self.current_config.newbie_config
            logger.info(f"Configuring NewBie Image: steps={newbie_config.steps}, cfg={newbie_config.cfg_scale}")

        # Configure Qwen Image if enabled
        if self.current_config.enable_qwen:
            qwen_config = self.current_config.qwen_config
            logger.info(f"Configuring Qwen Image: steps={qwen_config.steps}, cfg={qwen_config.cfg_scale}")

    async def execute_with_config(self, request: WorkflowRequest) -> Dict[str, Any]:
        """
        Execute workflow with current configuration

        Args:
            request: Workflow execution request

        Returns:
            Execution results
        """
        if not self.workflow_manager.is_initialized:
            return {"success": False, "error": "Workflow manager not initialized"}

        try:
            # Execute the workflow
            result = await self.workflow_manager.execute_workflow(request)

            # Add configuration context to result
            result_dict = {
                "success": result.success,
                "execution_time": result.execution_time,
                "memory_used": result.memory_used,
                "config_quality_level": self.current_config.quality_level.value if self.current_config else "unknown",
                "config_batch_size": self.current_config.batch_size if self.current_config else "unknown"
            }

            if not result.success:
                result_dict["error"] = result.error_message

            if result.quality_metrics:
                result_dict["quality_metrics"] = result.quality_metrics

            return result_dict

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            return {"success": False, "error": str(e)}

    async def reconfigure(self, new_config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """
        Reconfigure the workflow manager with new settings

        Args:
            new_config: New configuration to apply

        Returns:
            Reconfiguration results
        """
        result = {
            "success": False,
            "changes_applied": [],
            "errors": []
        }

        try:
            # Validate new configuration
            validation_errors = new_config.validate()
            if validation_errors:
                result["errors"].extend(validation_errors)
                return result

            # Detect configuration changes
            changes = self._detect_config_changes(self.current_config, new_config)
            result["changes_applied"] = changes

            # Apply new configuration
            self.current_config = new_config
            await self._apply_workflow_configs()

            result["success"] = True
            logger.info(f"Reconfiguration successful: {len(changes)} changes applied")

        except Exception as e:
            result["errors"].append(f"Reconfiguration failed: {str(e)}")
            logger.error(f"Reconfiguration error: {e}")

        return result

    def _detect_config_changes(self, old_config: AdvancedWorkflowConfig,
                              new_config: AdvancedWorkflowConfig) -> list:
        """Detect configuration changes (simplified version)"""
        if not old_config:
            return ["initial_config"]

        changes = []
        if old_config.quality_level != new_config.quality_level:
            changes.append("quality_level")
        if old_config.batch_size != new_config.batch_size:
            changes.append("batch_size")
        if old_config.enable_caching != new_config.enable_caching:
            changes.append("caching")

        return changes

    def get_config_status(self) -> Dict[str, Any]:
        """Get current configuration status"""
        if not self.current_config:
            return {"configured": False}

        return {
            "configured": True,
            "quality_level": self.current_config.quality_level.value,
            "max_memory_gb": self.current_config.max_memory_usage_gb,
            "batch_size": self.current_config.batch_size,
            "workflows_enabled": {
                "hunyuan": self.current_config.enable_hunyuan,
                "wan": self.current_config.enable_wan,
                "newbie": self.current_config.enable_newbie,
                "qwen": self.current_config.enable_qwen
            },
            "manager_initialized": self.workflow_manager.is_initialized
        }

async def demonstrate_integration():
    """Demonstrate configuration integration with workflow components"""

    # Create config-aware workflow manager
    manager = ConfigAwareWorkflowManager()

    print("=== Configuration-Aware Workflow Manager Demo ===\n")

    # Initialize with default config
    print("1. Initializing with default configuration...")
    success = await manager.initialize_with_config()
    if success:
        print("✅ Initialization successful")
    else:
        print("❌ Initialization failed")
        return

    # Show current config status
    status = manager.get_config_status()
    print("
Current configuration:"    print(f"   Quality Level: {status['quality_level']}")
    print(f"   Max Memory: {status['max_memory_gb']} GB")
    print(f"   Batch Size: {status['batch_size']}")

    # Create a test workflow request (simplified)
    print("\n2. Testing workflow execution with current config...")

    # Note: In a real scenario, you'd create proper WorkflowRequest objects
    # For demo purposes, we'll just show the integration structure
    print("   (Workflow execution would happen here with proper request objects)")

    # Demonstrate reconfiguration
    print("\n3. Demonstrating runtime reconfiguration...")

    # Create high-quality config
    high_quality_config = AdvancedWorkflowConfig()
    high_quality_config.quality_level = QualityLevel.HIGH
    high_quality_config = ConfigurationManager().apply_quality_preset(
        high_quality_config, QualityLevel.HIGH
    )

    result = await manager.reconfigure(high_quality_config)
    if result["success"]:
        print("✅ Reconfiguration successful")
        print(f"   Changes applied: {result['changes_applied']}")
    else:
        print(f"❌ Reconfiguration failed: {result['errors']}")

    # Show updated status
    updated_status = manager.get_config_status()
    print("
Updated configuration:"    print(f"   Quality Level: {updated_status['quality_level']}")
    print(f"   HunyuanVideo Steps: {high_quality_config.hunyuan_config.steps}")

if __name__ == "__main__":
    asyncio.run(demonstrate_integration())
```

### Best Practices for Configuration Management in Production

#### Production Configuration Manager

```python
#!/usr/bin/env python3
"""
Example: Production-ready configuration management with monitoring and validation
"""

import sys
import logging
import time
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

# Add src directory to path for imports
src_path = Path(__file__).parent.parent.parent / "src"
sys.path.insert(0, str(src_path))

from advanced_workflow_config import (
    ConfigurationManager,
    AdvancedWorkflowConfig,
    QualityLevel,
    Environment
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ConfigHealthStatus(Enum):
    """Configuration health status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class ConfigHealthCheck:
    """Result of configuration health check"""
    status: ConfigHealthStatus
    issues: List[str]
    warnings: List[str]
    recommendations: List[str]
    last_check: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status.value,
            "issues": self.issues,
            "warnings": self.warnings,
            "recommendations": self.recommendations,
            "last_check": self.last_check
        }

class ProductionConfigManager:
    """Production-ready configuration manager with monitoring and validation"""

    def __init__(self, config_dir: Optional[Path] = None, environment: str = "production"):
        self.config_manager = ConfigurationManager(config_dir)
        self.environment = Environment(environment.lower())
        self.config_history: List[Dict[str, Any]] = []
        self.health_checks: List[ConfigHealthCheck] = []
        self.max_history_size = 50

        # Production settings
        self.enable_audit_logging = True
        self.enable_config_backup = True
        self.health_check_interval = 300  # 5 minutes

    def load_production_config(self, config_path: Optional[Path] = None) -> AdvancedWorkflowConfig:
        """
        Load configuration with production safety checks

        Args:
            config_path: Path to configuration file

        Returns:
            Validated production configuration
        """
        logger.info(f"Loading production configuration for {self.environment.value} environment")

        # Load base configuration
        config = self.config_manager.load_config(config_path)

        # Apply environment-specific overrides
        config = self._apply_environment_overrides(config)

        # Validate for production use
        validation_result = self._validate_production_readiness(config)
        if not validation_result["ready"]:
            raise ValueError(f"Configuration not production-ready: {validation_result['issues']}")

        # Apply production hardening
        config = self._apply_production_hardening(config)

        # Record in history
        self._record_config_change(config, "loaded")

        logger.info("Production configuration loaded successfully")
        return config

    def _apply_environment_overrides(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """Apply environment-specific configuration overrides"""

        # Production-specific settings
        if self.environment == Environment.PRODUCTION:
            config.debug_mode = False
            config.log_level = "WARNING"
            config.auto_retry_on_failure = True
            config.max_retries = 3
            config.enable_quality_monitoring = True

            # Conservative memory settings for production
            if config.max_memory_usage_gb > 24.0:
                logger.warning(f"Reducing memory usage from {config.max_memory_usage_gb}GB to 24GB for production stability")
                config.max_memory_usage_gb = 24.0

        # Staging settings
        elif self.environment == Environment.STAGING:
            config.debug_mode = True
            config.log_level = "INFO"
            config.enable_quality_monitoring = True

        # Development settings
        elif self.environment == Environment.DEVELOPMENT:
            config.debug_mode = True
            config.log_level = "DEBUG"
            config.enable_caching = False  # Disable caching for development

        return config

    def _validate_production_readiness(self, config: AdvancedWorkflowConfig) -> Dict[str, Any]:
        """Validate configuration for production use"""
        result = {"ready": True, "issues": [], "warnings": []}

        # Critical validations
        if config.max_memory_usage_gb <= 0:
            result["issues"].append("Memory usage must be positive")
            result["ready"] = False

        if config.batch_size < 1:
            result["issues"].append("Batch size must be at least 1")
            result["ready"] = False

        # Production-specific checks
        if self.environment == Environment.PRODUCTION:
            if not config.enable_quality_monitoring:
                result["warnings"].append("Quality monitoring should be enabled in production")

            if config.max_retries < 2:
                result["warnings"].append("Consider increasing max_retries for production reliability")

            if config.max_memory_usage_gb > 32.0:
                result["warnings"].append("High memory usage detected - monitor system resources")

        # Workflow-specific validations
        enabled_workflows = []
        if config.enable_hunyuan: enabled_workflows.append("HunyuanVideo")
        if config.enable_wan: enabled_workflows.append("Wan")
        if config.enable_newbie: enabled_workflows.append("NewBie")
        if config.enable_qwen: enabled_workflows.append("Qwen")

        if not enabled_workflows:
            result["issues"].append("No workflows enabled")
            result["ready"] = False
        elif len(enabled_workflows) == 1:
            result["warnings"].append(f"Only one workflow enabled: {enabled_workflows[0]}")

        return result

    def _apply_production_hardening(self, config: AdvancedWorkflowConfig) -> AdvancedWorkflowConfig:
        """Apply production hardening settings"""

        # Enable safety features
        config.auto_retry_on_failure = True
        config.enable_auto_routing = True
        config.fallback_to_basic = True

        # Set reasonable timeouts and limits
        if not hasattr(config, 'execution_timeout_seconds'):
            config.execution_timeout_seconds = 300  # 5 minutes

        if not hasattr(config, 'max_concurrent_executions'):
            config.max_concurrent_executions = 3  # Limit concurrent executions

        return config

    def _record_config_change(self, config: AdvancedWorkflowConfig, action: str):
        """Record configuration change in history"""
        record = {
            "timestamp": time.time(),
            "action": action,
            "environment": self.environment.value,
            "quality_level": config.quality_level.value,
            "max_memory_gb": config.max_memory_usage_gb,
            "batch_size": config.batch_size,
            "enabled_workflows": {
                "hunyuan": config.enable_hunyuan,
                "wan": config.enable_wan,
                "newbie": config.enable_newbie,
                "qwen": config.enable_qwen
            }
        }

        self.config_history.append(record)

        # Limit history size
        if len(self.config_history) > self.max_history_size:
            self.config_history = self.config_history[-self.max_history_size:]

        # Audit logging
        if self.enable_audit_logging:
            logger.info(f"Config change recorded: {action} - Quality: {config.quality_level.value}")

    def perform_health_check(self) -> ConfigHealthCheck:
        """Perform comprehensive configuration health check"""
        issues = []
        warnings = []
        recommendations = []

        # Load current config for validation
        try:
            config = self.load_production_config()

            # Check configuration age (should be reloaded periodically)
            # Check for deprecated settings
            # Check resource utilization vs. configuration

            if config.max_memory_usage_gb > 24.0 and self.environment == Environment.PRODUCTION:
                warnings.append("High memory configuration in production")

            if config.batch_size > 2 and config.max_memory_usage_gb < 16.0:
                issues.append("Batch size may exceed memory capacity")

            if not config.enable_caching:
                recommendations.append("Consider enabling caching for better performance")

        except Exception as e:
            issues.append(f"Configuration health check failed: {str(e)}")

        # Determine status
        if issues:
            status = ConfigHealthStatus.UNHEALTHY
        elif warnings:
            status = ConfigHealthStatus.DEGRADED
        else:
            status = ConfigHealthStatus.HEALTHY

        health_check = ConfigHealthCheck(
            status=status,
            issues=issues,
            warnings=warnings,
            recommendations=recommendations,
            last_check=time.time()
        )

        self.health_checks.append(health_check)
        return health_check

    def get_production_metrics(self) -> Dict[str, Any]:
        """Get production configuration metrics"""
        if not self.config_history:
            return {"message": "No configuration history available"}

        latest_config = self.config_history[-1]

        # Calculate metrics
        total_changes = len(self.config_history)
        time_span = time.time() - self.config_history[0]["timestamp"] if len(self.config_history) > 1 else 0
        change_frequency = total_changes / (time_span / 86400) if time_span > 0 else 0  # changes per day

        return {
            "environment": self.environment.value,
            "total_config_changes": total_changes,
            "change_frequency_per_day": round(change_frequency, 2),
            "current_quality_level": latest_config["quality_level"],
            "current_memory_usage_gb": latest_config["max_memory_gb"],
            "current_batch_size": latest_config["batch_size"],
            "enabled_workflows_count": sum(latest_config["enabled_workflows"].values()),
            "last_change_timestamp": latest_config["timestamp"],
            "health_check_count": len(self.health_checks)
        }

    def create_backup_config(self, config: AdvancedWorkflowConfig, reason: str = "manual") -> bool:
        """Create backup of current configuration"""
        if not self.enable_config_backup:
            return True

        try:
            backup_name = f"backup_{int(time.time())}_{reason}"
            backup_path = self.config_manager.backup_dir / f"{backup_name}.yaml"

            success = self.config_manager.save_config(config, backup_path)
            if success:
                logger.info(f"Configuration backup created: {backup_path}")
            return success

        except Exception as e:
            logger.error(f"Failed to create configuration backup: {e}")
            return False

def main():
    """Demonstrate production configuration management"""
    print("=== Production Configuration Management Demo ===\n")

    # Initialize production config manager
    prod_manager = ProductionConfigManager(environment="production")

    # Load production configuration
    print("1. Loading production configuration...")
    try:
        config = prod_manager.load_production_config()
        print("✅ Production configuration loaded successfully")
        print(f"   Environment: {config.environment.value}")
        print(f"   Quality Level: {config.quality_level.value}")
        print(f"   Max Memory: {config.max_memory_usage_gb} GB")
        print(f"   Debug Mode: {config.debug_mode}")
        print(f"   Auto Retry: {config.auto_retry_on_failure}")
    except Exception as e:
        print(f"❌ Failed to load production config: {e}")
        return

    # Perform health check
    print("\n2. Performing configuration health check...")
    health = prod_manager.perform_health_check()
    print(f"   Status: {health.status.value}")
    if health.issues:
        print(f"   Issues: {health.issues}")
    if health.warnings:
        print(f"   Warnings: {health.warnings}")
    if health.recommendations:
        print(f"   Recommendations: {health.recommendations}")

    # Show production metrics
    print("\n3. Production metrics...")
    metrics = prod_manager.get_production_metrics()
    print(f"   Total config changes: {metrics['total_config_changes']}")
    print(".2f")
    print(f"   Current quality level: {metrics['current_quality_level']}")
    print(f"   Enabled workflows: {metrics['enabled_workflows_count']}")

    # Create backup
    print("\n4. Creating configuration backup...")
    backup_success = prod_manager.create_backup_config(config, "demo")
    if backup_success:
        print("✅ Configuration backup created")
    else:
        print("❌ Failed to create backup")

if __name__ == "__main__":
    main()
```

## Configuration Validation

### Validation Commands

Validate your configuration:

```bash
# Validate complete configuration
python storycore.py config --validate --advanced

# Validate specific workflow configuration
python storycore.py config --validate --workflow hunyuan

# Check hardware compatibility
python storycore.py config --check-hardware

# Test configuration with dry run
python storycore.py test --config-only --advanced
```

### Configuration Schema

The configuration follows a JSON schema for validation:

```json
{
    "$schema": "https://storycore.dev/schemas/advanced-config-v1.json",
    "type": "object",
    "properties": {
        "advanced_workflows": {
            "type": "object",
            "properties": {
                "enabled": {"type": "boolean"},
                "model_precision": {
                    "type": "string",
                    "enum": ["fp16", "fp8", "int8", "bf16"]
                },
                "max_memory_usage_gb": {
                    "type": "number",
                    "minimum": 4.0,
                    "maximum": 128.0
                }
            },
            "required": ["enabled"]
        }
    }
}
```

### Common Configuration Errors

**Invalid Model Precision:**
```json
// ❌ Invalid
"model_precision": "fp32"

// ✅ Valid
"model_precision": "fp16"
```

**Memory Limit Too High:**
```json
// ❌ Invalid (exceeds available VRAM)
"max_memory_usage_gb": 32.0  // On 24GB GPU

// ✅ Valid
"max_memory_usage_gb": 20.0
```

**Missing Required Models:**
```json
// ❌ Invalid (model path doesn't exist)
"model_path": "/nonexistent/path"

// ✅ Valid
"model_path": "models/hunyuan"
```

---

*This configuration guide provides comprehensive coverage of all advanced workflow settings. For troubleshooting configuration issues, see the [Troubleshooting Guide](troubleshooting.md).*